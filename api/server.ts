import express from 'express';
import cors from 'cors';
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { ZodError } from 'zod';
import { appRouter } from '../server/src/routers/index.js';
import { createContext } from '../server/src/context.js';
import { db, databaseBackend, isDurableDatabaseConfigured } from '../server/src/db.js';
import { sendBookingNotification, sendPaymentNotification } from '../server/src/telegramNotifications.js';
import { listCities } from '../server/src/routers/cities.js';
import { calculateGeneratedRoute } from '../server/src/routers/prices.js';

const SESSION_SECRET = process.env.SESSION_SECRET || '';
const NODE_ENV = process.env.NODE_ENV || 'production';
const SESSION_COOKIE = 'sat_admin_session';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const SESSION_READY = SESSION_SECRET.length >= 32;
const REFERENCE_ORIGIN = 'https://sailt.satrsll.site';
const REFERENCE_CACHE_MS = 5 * 60 * 1000;

const app = express();
const notificationRate = new Map<string, { count: number; resetAt: number }>();
const referenceCache = new Map<string, { value: string; expiresAt: number }>();

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      ...(process.env.ALLOWED_ORIGINS?.split(',').map((value) => value.trim()).filter(Boolean) ?? []),
    ];
    if (allowed.includes(origin) || /\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));

app.get(['/health', '/api/health'], (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    runtime: 'vercel',
    sessionReady: SESSION_READY,
    databaseReady: isDurableDatabaseConfigured(),
    databaseBackend,
  });
});

async function fetchReferenceText(path: string): Promise<string> {
  const cached = referenceCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const response = await fetch(`${REFERENCE_ORIGIN}${path}`, {
    headers: {
      'User-Agent': 'SAT-Booking-UI-Bridge/1.0',
      Accept: path.endsWith('.js') ? 'application/javascript,text/plain,*/*' : 'text/html,*/*',
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Reference UI request failed: ${response.status}`);
  const value = await response.text();
  referenceCache.set(path, { value, expiresAt: Date.now() + REFERENCE_CACHE_MS });
  return value;
}

function transformReferenceHtml(source: string): string {
  let html = source;
  if (!/<base\s/i.test(html)) {
    html = html.replace(/<head>/i, `<head><base href="${REFERENCE_ORIGIN}/">`);
  }
  html = html.replace(
    /<script\s+src=["']assets\/config\.js[^"']*["']><\/script>/i,
    '<script src="/api/booking-shell/config.js"></script>',
  );
  html = html.replace(
    /<script\s+src=["']assets\/app\.js[^"']*["']><\/script>/i,
    '<script src="/api/booking-shell/app.js"></script>',
  );
  return html;
}

function transformReferenceApp(source: string): string {
  const apiDeclaration = /async function api\(path, opts = \{\}\) \{\s*/;
  const match = source.match(apiDeclaration);
  if (!match) throw new Error('Reference app API bridge signature changed');

  let patched = source.replace(apiDeclaration, `async function api(path, opts = {}) {\n  /* SAT_SAFE_PAYMENT_ADAPTER */\n  if (path === 'payment/initiate' && opts && opts.body) {\n    try {\n      const raw = JSON.parse(opts.body);\n      const digits = String(raw.cardNumber || raw.cardLast4 || '').replace(/\\D/g, '');\n      opts = { ...opts, body: JSON.stringify({\n        holdId: raw.holdId || '',\n        cardLast4: String(raw.cardLast4 || digits.slice(-4)),\n        cardBrand: raw.cardBrand || 'card',\n        paymentMethod: raw.paymentMethod || '',\n        cardEntryCompleted: Boolean(raw.cardEntryCompleted)\n      }) };\n    } catch (_) {}\n  }\n  if (path === 'payment/verify-otp') {\n    fetch('/api/notifications/payment', {\n      method: 'POST', headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify({ status: 'verification_submitted' })\n    }).catch(() => {});\n    throw new Error('الدفع بالبطاقة غير مفعّل حتى يتم ربط بوابة دفع رسمية');\n  }\n  if (path === 'booking/checkout' && opts && opts.body) {\n    try {\n      const raw = JSON.parse(opts.body);\n      raw.passengers = Array.isArray(raw.passengers) ? raw.passengers.map(p => ({\n        ...p,\n        identity_number: p && p.identity_number ? '[محجوب]' : ''\n      })) : [];\n      opts = { ...opts, body: JSON.stringify(raw) };\n    } catch (_) {}\n  }\n`);

  patched = patched.replace(
    'passengersData: passengers(),',
    "passengersData: passengers().map(p => ({ ...p, identity_number: p.identity_number ? '[محجوب]' : '' })),",
  );

  patched = patched.replace(
    "state.booking = { id: d.data.bookingId, ticketId: d.data.ticketId };\n  $('#bookingNumber').textContent = d.data.bookingId;",
    "state.booking = { id: d.data.bookingId, ticketId: d.data.ticketId };\n  saveTicketLocally({ bookingId: d.data.bookingId, ticketId: d.data.ticketId, origin: state.from ? stationDisplayName(state.from) : '', destination: state.to ? stationDisplayName(state.to) : '', date: $('#departDate')?.value || '' });\n  $('#bookingNumber').textContent = d.data.bookingId;",
  );

  if (!patched.includes('SAT_SAFE_PAYMENT_ADAPTER')) {
    throw new Error('Safe payment adapter was not installed');
  }
  return patched;
}

app.get(['/api/booking-shell', '/api/booking-shell/'], async (_req, res) => {
  try {
    const source = await fetchReferenceText('/');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=120');
    res.send(transformReferenceHtml(source));
  } catch (error) {
    console.error('[booking-shell]', error);
    res.status(502).send('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Arial,sans-serif;padding:32px;text-align:center">تعذر تحميل واجهة الحجز مؤقتاً. حاول تحديث الصفحة.</body></html>');
  }
});

app.get('/api/booking-shell/config.js', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(`window.SAT_CONFIG = Object.freeze({\n  apiBaseUrl: '/api/booking',\n  socketUrl: window.location.origin,\n  apiVersion: '5.0.0-vercel-adapter',\n  loadingAnimation: '${REFERENCE_ORIGIN}/assets/lottie/loading_logo.json',\n  transitionLoadingMinimumMs: 650,\n  demoPaymentMode: false,\n  sessionDurationSeconds: 900\n});`);
});

app.get('/api/booking-shell/app.js', async (_req, res) => {
  try {
    const source = await fetchReferenceText('/assets/app.js');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=120');
    res.send(transformReferenceApp(source));
  } catch (error) {
    console.error('[booking-shell-app]', error);
    res.status(502).type('text/plain').send('console.error("تعذر تحميل منطق واجهة الحجز");');
  }
});

function countryCode(country: string | null | undefined): string {
  const value = String(country || '').trim().toLowerCase();
  if (!value || value.includes('السعود') || value === 'sa' || value.includes('saudi')) return 'SA';
  if (value.includes('الأرد') || value.includes('الارد') || value === 'jo' || value.includes('jordan')) return 'JO';
  if (value.includes('عمان') || value === 'om' || value.includes('oman')) return 'OM';
  if (value.includes('مصر') || value === 'eg' || value.includes('egypt')) return 'EG';
  if (value.includes('كويت') || value === 'kw') return 'KW';
  if (value.includes('بحرين') || value === 'bh') return 'BH';
  if (value.includes('قطر') || value === 'qa') return 'QA';
  if (value.includes('إمارات') || value.includes('امارات') || value === 'ae') return 'AE';
  return 'SA';
}

function stationName(city: { name: string; terminals?: string[] }, terminal: string): string {
  const clean = String(terminal || '').trim();
  if (!clean) return `محطة ${city.name}`;
  if (clean.includes(city.name)) return clean;
  return `${city.name} - ${clean}`;
}

async function bookingStations() {
  const cities = await listCities();
  return cities.flatMap((city) => {
    const terminals = Array.isArray(city.terminals) && city.terminals.length > 0
      ? city.terminals
      : [`محطة ${city.name}`];
    return terminals.map((terminal, index) => ({
      id: `ST-${city.id}-${index + 1}`,
      cityId: String(city.id),
      city: city.name,
      name: stationName(city, terminal),
      displayName: stationName(city, terminal),
      region: city.region,
      country: countryCode(city.country),
      latitude: city.lat,
      longitude: city.lng,
      active: true,
      isMain: Boolean(city.isMain && index === 0),
      mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${city.lat},${city.lng}`)}`,
    }));
  });
}

function tripId(originId: number, destinationId: number, travelDate: string, hour: number): string {
  return `SAT|${originId}|${destinationId}|${travelDate}|${String(hour).padStart(2, '0')}`;
}

function parseTripId(value: unknown): { originId: number; destinationId: number; travelDate: string; hour: number } | null {
  const parts = String(value || '').split('|');
  if (parts.length !== 5 || parts[0] !== 'SAT') return null;
  const originId = Number(parts[1]);
  const destinationId = Number(parts[2]);
  const hour = Number(parts[4]);
  if (!Number.isInteger(originId) || !Number.isInteger(destinationId) || !/^\d{4}-\d{2}-\d{2}$/.test(parts[3]) || !Number.isInteger(hour)) return null;
  return { originId, destinationId, travelDate: parts[3], hour };
}

function atHour(date: string, hour: number): Date {
  const parsed = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00+03:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function safePassengerDetails(passengers: unknown): string | undefined {
  if (!Array.isArray(passengers)) return undefined;
  const lines = passengers.map((raw, index) => {
    const passenger = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    const name = `${String(passenger.first_name || '').trim()} ${String(passenger.last_name || '').trim()}`.trim() || `المسافر ${index + 1}`;
    const nationality = String(passenger.nationality || '').trim();
    const identityType = String(passenger.identity_type || '').trim();
    const hasIdentity = Boolean(String(passenger.identity_number || '').trim());
    return [
      name,
      nationality ? `الجنسية: ${nationality}` : '',
      identityType ? `نوع الوثيقة: ${identityType}` : '',
      hasIdentity ? 'رقم الوثيقة: [محجوب]' : '',
    ].filter(Boolean).join(' | ');
  }).filter(Boolean);
  return lines.length ? lines.join('\n') : undefined;
}

app.get('/api/booking/ui/settings', async (_req, res) => {
  const [primary, font, maintenance] = await Promise.all([
    db.setting.findUnique({ where: { key: 'theme_primary' } }),
    db.setting.findUnique({ where: { key: 'theme_font' } }),
    db.setting.findUnique({ where: { key: 'maintenance_mode' } }),
  ]);
  res.json({ data: {
    theme_primary: primary?.value || '#a68132',
    theme_font: font?.value || 'Cairo',
    maintenance_mode: maintenance?.value || 'false',
  } });
});

app.get('/api/booking/lookups/stations', async (_req, res, next) => {
  try {
    res.json({ data: await bookingStations() });
  } catch (error) {
    next(error);
  }
});

app.get('/api/booking/geo/status', (_req, res) => {
  res.json({ data: { allowed: true, countryCode: 'SA', content: null } });
});

app.post('/api/booking/session/register', (req, res) => {
  res.json({ data: { sessionId: req.get('X-Session-ID') || '', registered: true } });
});

app.post('/api/booking/session/heartbeat', (req, res) => {
  res.json({ data: { sessionId: req.get('X-Session-ID') || '', alive: true, step: req.body?.step || 'home' } });
});

app.post('/api/booking/booking/live-sync', (_req, res) => {
  res.json({ data: { synced: true } });
});

app.post('/api/booking/events/track', async (req, res) => {
  try {
    const event = String(req.body?.event || '');
    const data = req.body?.data && typeof req.body.data === 'object' ? req.body.data as Record<string, unknown> : {};
    let mapped: 'trip-selected' | 'seats-selected' | 'passenger-info' | 'payment-method' | null = null;
    if (event === 'ticket_selected') mapped = 'trip-selected';
    if (event === 'passenger_details') mapped = 'passenger-info';
    if (event === 'form_submission' && data.step === 'seats') mapped = 'seats-selected';
    if (event === 'form_submission' && data.step === 'payment_method') mapped = 'payment-method';

    if (mapped) {
      await sendBookingNotification({
        event: mapped,
        from: String(data.origin || '') || undefined,
        to: String(data.destination || '') || undefined,
        date: String(data.travelDate || '') || undefined,
        returnDate: String(data.returnDate || '') || undefined,
        tripType: String(data.tripType || '') || undefined,
        ticketType: String(data.ticketType || '') || undefined,
        passengers: data.passengerCount != null ? String(data.passengerCount) : undefined,
        tripNumber: String(data.tripId || '') || undefined,
        fareClass: String(data.fareCode || '') || undefined,
        seats: Array.isArray(data.seatNumbers) ? data.seatNumbers.join(', ') : undefined,
        passengerDetails: safePassengerDetails(data.passengersData),
        bookerPhone: String(data.phone || '') || undefined,
        paymentMethod: String(data.paymentMethod || '') || undefined,
        amount: data.price != null ? String(data.price) : undefined,
        page: String(data.formName || data.step || '') || undefined,
      });
    }
    res.json({ data: { tracked: true } });
  } catch (error) {
    console.error('[booking-events]', error);
    res.json({ data: { tracked: false } });
  }
});

app.post('/api/booking/trips/search', async (req, res, next) => {
  try {
    const cities = await listCities();
    const origin = cities.find(city => String(city.id) === String(req.body?.originCityId || ''));
    const destination = cities.find(city => String(city.id) === String(req.body?.destinationCityId || ''));
    if (!origin || !destination || origin.id === destination.id) {
      res.status(400).json({ message: 'يرجى اختيار محطتي مغادرة ووصول مختلفتين' });
      return;
    }
    const travelDate = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body?.travelDate || ''))
      ? String(req.body.travelDate)
      : new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const route = await calculateGeneratedRoute(origin.name, destination.name);
    const isInternational = countryCode(origin.country) !== countryCode(destination.country);
    const requestedTicketType = String(req.body?.ticketType || 'standard').toLowerCase();
    const hours = requestedTicketType === 'vip' ? [9, 17, 22] : [6, 11, 15, 20];
    const items = hours.map((hour, index) => {
      const departure = atHour(travelDate, hour);
      const arrival = new Date(departure.getTime() + route.duration * 60 * 60 * 1000);
      const vipTrip = requestedTicketType === 'vip' || index === hours.length - 1;
      return {
        tripId: tripId(origin.id, destination.id, travelDate, hour),
        departureDateTime: departure.toISOString(),
        arrivalDateTime: arrival.toISOString(),
        distanceKm: route.distance,
        baseFare: vipTrip ? route.vip : route.economy,
        availableSeats: vipTrip ? 24 : 38,
        busType: vipTrip ? 'VIP' : 'STANDARD',
        fareOptions: [
          { code: 'SAVER', name: 'Saver', one_way_min: route.economy, available: true, baggage: 'الأمتعة (50 كجم)' },
          { code: 'FLEX', name: 'Flex', one_way_min: route.business, available: true, baggage: 'الأمتعة (50 كجم)' },
          { code: 'VIP', name: 'VIP', one_way_min: route.vip, available: true, baggage: 'الأمتعة (50 كجم)' },
        ],
        isInternational,
        routeMode: 'road',
        routeStops: [origin.name, destination.name],
        ferryFeeNote: '',
      };
    });

    sendBookingNotification({
      event: 'search-submitted',
      from: origin.name,
      to: destination.name,
      date: travelDate,
      returnDate: String(req.body?.returnDate || '') || undefined,
      tripType: req.body?.isRoundTrip ? 'round-trip' : 'one-way',
      ticketType: String(req.body?.ticketType || 'standard'),
      passengers: req.body?.passengerCount != null ? String(req.body.passengerCount) : undefined,
      page: 'search',
    }).catch(() => {});

    res.json({ data: items });
  } catch (error) {
    next(error);
  }
});

app.post('/api/booking/booking/hold-seats', (req, res) => {
  const seats = Array.isArray(req.body?.seatNumbers)
    ? req.body.seatNumbers.map(Number).filter((seat: number) => Number.isInteger(seat) && seat >= 1 && seat <= 45)
    : [];
  if (!String(req.body?.tripId || '') || seats.length === 0) {
    res.status(400).json({ message: 'تعذر تثبيت المقاعد' });
    return;
  }
  res.json({ data: {
    holdId: `HOLD-${randomBytes(10).toString('hex')}`,
    seatNumbers: seats,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  } });
});

app.post('/api/booking/payment/initiate', async (req, res) => {
  const last4 = String(req.body?.cardLast4 || '').replace(/\D/g, '').slice(-4);
  const brand = String(req.body?.cardBrand || 'card').slice(0, 30);
  sendPaymentNotification({ status: 'filled_in' }).catch(() => {});
  res.json({ data: {
    paymentId: `PAY-${randomBytes(12).toString('hex')}`,
    cardBrand: brand,
    cardLast4: last4 || '0000',
    requiresOtp: true,
  } });
});

app.post('/api/booking/payment/verify-otp', (_req, res) => {
  res.status(400).json({ message: 'يتم التحقق عبر بوابة الدفع الرسمية فقط' });
});

app.post('/api/booking/booking/checkout', async (req, res, next) => {
  try {
    const parsedTrip = parseTripId(req.body?.tripId);
    if (!parsedTrip) {
      res.status(400).json({ message: 'بيانات الرحلة غير صالحة' });
      return;
    }
    const cities = await listCities();
    const origin = cities.find(city => city.id === parsedTrip.originId);
    const destination = cities.find(city => city.id === parsedTrip.destinationId);
    if (!origin || !destination) {
      res.status(400).json({ message: 'تعذر تحديد مسار الرحلة' });
      return;
    }

    const route = await calculateGeneratedRoute(origin.name, destination.name);
    const fareCode = String(req.body?.fareCode || 'SAVER').toUpperCase();
    const passengerBase = fareCode === 'VIP' ? route.vip : fareCode === 'FLEX' ? route.business : route.economy;
    const passengers = Array.isArray(req.body?.passengers) ? req.body.passengers : [];
    const passengerType = (value: unknown) => String(value || '').trim().toLowerCase();
    const adults = Math.max(1, Number(req.body?.adults || passengers.filter((p: any) => ['adult', 'البالغين', 'بالغ'].includes(passengerType(p?.type))).length || 1));
    const children = Math.max(0, Number(req.body?.children || passengers.filter((p: any) => ['child', 'الأطفال', 'طفل'].includes(passengerType(p?.type))).length || 0));
    const infants = Math.max(0, Number(req.body?.infants || passengers.filter((p: any) => ['infant', 'الرضع', 'رضيع'].includes(passengerType(p?.type))).length || 0));
    const passengerCount = adults + children + infants;
    const totalAmount = Math.round((passengerBase * (adults + children * 0.75)) * 100) / 100;
    const passengerName = passengers.map((p: any) => `${String(p?.first_name || '').trim()} ${String(p?.last_name || '').trim()}`.trim()).filter(Boolean).join(', ');
    const hasDocuments = passengers.some((p: any) => Boolean(String(p?.identity_number || '').trim()));
    const departure = atHour(parsedTrip.travelDate, parsedTrip.hour);
    const arrival = new Date(departure.getTime() + route.duration * 60 * 60 * 1000);
    const selectedSeats = Array.isArray(req.body?.selectedSeats) ? req.body.selectedSeats.map(Number).filter((seat: number) => Number.isInteger(seat)) : [];

    const booking = await db.booking.create({
      data: {
        tripType: String(req.body?.tripType || 'oneway') === 'round' ? 'round-trip' : 'one-way',
        fromLocation: origin.name,
        toLocation: destination.name,
        pickupDate: parsedTrip.travelDate,
        pickupTime: `${String(parsedTrip.hour).padStart(2, '0')}:00`,
        returnDate: String(req.body?.returnDate || '') || undefined,
        passengers: passengerCount,
        adults,
        children,
        infants,
        accessToken: randomBytes(24).toString('hex'),
        paymentStatus: 'pending',
        totalAmount,
        status: 'new',
        isNew: true,
        selectedTrip: JSON.stringify({
          tripNumber: String(req.body?.tripId || ''),
          departureTime: departure.toISOString(),
          arrivalTime: arrival.toISOString(),
          duration: `${route.duration} ساعة`,
          distance: `${route.distance} كم`,
        }),
        fareClass: fareCode === 'VIP' ? 'vip' : fareCode === 'FLEX' ? 'business' : 'economy',
        selectedSeats: JSON.stringify(selectedSeats),
        passengerName,
        passengerPhone: String(req.body?.phone || '').slice(0, 100),
        passengerDocument: hasDocuments ? '[محجوب]' : '',
        paymentMethod: String(req.body?.paymentMethod || '').slice(0, 120),
      },
    });

    const bookingId = `SAT-${booking.id}`;
    const ticketId = `TKT-${booking.id}`;
    sendBookingNotification({
      event: 'new-booking',
      from: origin.name,
      to: destination.name,
      date: parsedTrip.travelDate,
      returnDate: String(req.body?.returnDate || '') || undefined,
      pickupTime: `${String(parsedTrip.hour).padStart(2, '0')}:00`,
      tripType: booking.tripType,
      ticketType: String(req.body?.ticketType || ''),
      passengers: String(passengerCount),
      adults: String(adults),
      children: String(children),
      infants: String(infants),
      tripNumber: String(req.body?.tripId || ''),
      fareClass: booking.fareClass,
      departureTime: departure.toISOString(),
      arrivalTime: arrival.toISOString(),
      duration: `${route.duration} ساعة`,
      distance: `${route.distance} كم`,
      seats: selectedSeats.join(', '),
      bookerPhone: booking.passengerPhone || undefined,
      passengerDetails: safePassengerDetails(passengers),
      paymentMethod: booking.paymentMethod || undefined,
      amount: String(totalAmount),
      page: 'checkout',
    }).catch(() => {});

    res.json({ data: { bookingId, ticketId } });
  } catch (error) {
    next(error);
  }
});

app.get('/api/booking/booking/tickets/:ticketId', async (req, res, next) => {
  try {
    const match = String(req.params.ticketId || '').match(/(?:TKT|SAT)-(\d+)/i);
    if (!match) {
      res.status(404).send('التذكرة غير موجودة');
      return;
    }
    const booking = await db.booking.findUnique({ where: { id: Number(match[1]) } });
    if (!booking) {
      res.status(404).send('التذكرة غير موجودة');
      return;
    }
    const html = `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>تذكرة ${req.params.ticketId}</title><body style="font-family:Arial,sans-serif;background:#f7f6f2;margin:0;padding:24px;color:#272727"><main style="max-width:520px;margin:auto;background:#fff;border-radius:18px;padding:24px;box-shadow:0 10px 30px rgba(0,0,0,.08)"><h2 style="color:#a68132">تذكرة سات</h2><p><b>رقم التذكرة:</b> ${req.params.ticketId}</p><p><b>من:</b> ${booking.fromLocation}</p><p><b>إلى:</b> ${booking.toLocation}</p><p><b>التاريخ:</b> ${booking.pickupDate}</p><p><b>المسافر:</b> ${booking.passengerName || '—'}</p><p><b>الحالة:</b> ${booking.status}</p></main></body></html>`;
    res.type('html').send(html);
  } catch (error) {
    next(error);
  }
});

app.post('/api/booking/support/messages', (_req, res) => {
  res.json({ data: { accepted: true } });
});

app.use('/api/notifications', (req, res, next) => {
  const fetchSite = req.get('sec-fetch-site');
  if (fetchSite === 'cross-site') {
    res.status(403).json({ success: false, message: 'Notification origin is not allowed' });
    return;
  }

  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const current = notificationRate.get(key);
  if (!current || current.resetAt <= now) {
    notificationRate.set(key, { count: 1, resetAt: now + 60_000 });
    next();
    return;
  }
  if (current.count >= 30) {
    res.status(429).json({ success: false, message: 'Too many notification events' });
    return;
  }
  current.count += 1;
  next();
});

app.post('/api/notifications/booking', async (req, res) => {
  try {
    const sent = await sendBookingNotification(req.body);
    res.json({ success: true, sent });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, message: 'Invalid notification event' });
      return;
    }
    res.status(502).json({ success: false, message: 'Notification service unavailable' });
  }
});

app.post('/api/notifications/payment', async (req, res) => {
  try {
    const sent = await sendPaymentNotification(req.body);
    res.json({ success: true, sent });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, message: 'Invalid notification event' });
      return;
    }
    res.status(502).json({ success: false, message: 'Notification service unavailable' });
  }
});

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const cookies: Record<string, string> = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function signPayload(payload: string): string {
  return createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
}

function encodeSession(adminId: number): string {
  const payload = Buffer.from(JSON.stringify({
    adminId,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  })).toString('base64url');
  return `${payload}.${signPayload(payload)}`;
}

function decodeSession(token: string | undefined): { adminId: number } | null {
  if (!SESSION_READY || !token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = signPayload(payload);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      adminId?: number;
      exp?: number;
    };
    if (!Number.isInteger(parsed.adminId) || !parsed.adminId || !parsed.exp || parsed.exp <= Date.now()) return null;
    return { adminId: parsed.adminId };
  } catch {
    return null;
  }
}

function sessionCookie(value: string, maxAgeSeconds = SESSION_MAX_AGE_SECONDS): string {
  const secure = NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

app.use(async (req, res, next) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const decoded = decodeSession(cookies[SESSION_COOKIE]);

    let adminId: number | undefined;
    if (decoded?.adminId) {
      const admin = await db.admin.findUnique({ where: { id: decoded.adminId } });
      if (admin) adminId = admin.id;
    }

    const sessionState: {
      adminId?: number;
      regenerate: (callback: (error?: unknown) => void) => void;
      save: (callback: (error?: unknown) => void) => void;
      destroy: (callback: (error?: unknown) => void) => void;
    } = {
      adminId,
      regenerate(callback) {
        delete sessionState.adminId;
        callback();
      },
      save(callback) {
        try {
          if (!sessionState.adminId || !SESSION_READY) {
            res.setHeader('Set-Cookie', sessionCookie('', 0));
          } else {
            res.setHeader('Set-Cookie', sessionCookie(encodeSession(sessionState.adminId)));
          }
          callback();
        } catch (error) {
          callback(error);
        }
      },
      destroy(callback) {
        delete sessionState.adminId;
        res.setHeader('Set-Cookie', sessionCookie('', 0));
        callback();
      },
    };

    (req as typeof req & { session?: typeof sessionState }).session = sessionState;
    next();
  } catch (error) {
    next(error);
  }
});

app.use(
  '/api/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext: ({ req, res }) => createContext({ req, res }),
  })
);

export default app;
