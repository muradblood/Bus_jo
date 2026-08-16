import type { Request, Response } from 'express';
import { dbExec, dbQuery, ensureArchiveDatabase, neonConfigured } from './neonDb.js';
import { getManagedSaudiCities } from './services/locationCatalog.js';
import { calculateSaudiRoute } from './services/routeCalculator.js';

type Row = Record<string, any>;

type PublicCity = {
  cityId: number;
  cityKey: string;
  nameAr: string;
  nameEn: string;
  countryCode: 'SA';
  active: boolean;
  region: string;
  regionId?: number;
  latitude: number;
  longitude: number;
  source: 'base' | 'admin';
};

const json = (res: Response, body: unknown, status = 200) => res.status(status).setHeader('Cache-Control', 'no-store').json(body);
const text = (value: unknown, max = 160) => String(value ?? '').trim().slice(0, max);
const num = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const bool = (value: unknown) => value === true || value === 1 || value === '1' || value === 'true' || value === 'on';
const dateOnly = (value: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(text(value, 10)) ? text(value, 10) : null;
const ip = (req: Request) => (String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || req.socket.remoteAddress || '0.0.0.0').slice(0, 45);
const sessionId = (req: Request) => {
  const value = text(req.headers['x-session-id'], 80);
  return /^SES-[A-Za-z0-9-]{12,70}$/.test(value) ? value : '';
};

function syntheticCityId(cityKey: string): number {
  let hash = 2166136261;
  for (let i = 0; i < cityKey.length; i += 1) {
    hash ^= cityKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return 900000 + ((hash >>> 0) % 90000000);
}

function numericCityId(city: { id: string; nationalAddressCityId?: number }): number {
  return city.nationalAddressCityId ?? syntheticCityId(city.id);
}

async function publicCities(): Promise<PublicCity[]> {
  const managed = await getManagedSaudiCities();
  return managed.map(city => ({
    cityId: numericCityId(city),
    cityKey: city.id,
    nameAr: city.nameAr,
    nameEn: city.nameEn || city.nameAr,
    countryCode: 'SA',
    active: city.active,
    region: city.regionAr,
    regionId: city.regionId,
    latitude: city.lat,
    longitude: city.lng,
    source: city.source,
  }));
}

async function resolveCity(value: unknown) {
  const items = await getManagedSaudiCities();
  const raw = text(value, 100).toLowerCase();
  return items.find(city => city.active && (
    city.id === raw ||
    city.code.toLowerCase() === raw ||
    String(numericCityId(city)) === raw ||
    city.nameAr.toLowerCase() === raw ||
    String(city.nameEn || '').toLowerCase() === raw
  ));
}

async function fareOptions(distanceKm: number) {
  const rows = await dbQuery<Row>("SELECT fare_code,display_name,price_per_km,minimum_price,maximum_price,active FROM fare_pricing_rules ORDER BY CASE fare_code WHEN 'SAVER' THEN 1 WHEN 'STANDARD' THEN 2 WHEN 'FLEX' THEN 3 WHEN 'VIP' THEN 4 ELSE 5 END");
  return rows.map(row => {
    const price = Math.round(Math.min(num(row.maximum_price), Math.max(num(row.minimum_price), distanceKm * num(row.price_per_km))) * 100) / 100;
    return {
      code: String(row.fare_code),
      name: String(row.display_name),
      available: Number(row.active) === 1,
      one_way_min: price,
      one_way_max: price,
      baggage: String(row.fare_code) === 'VIP' ? 'أمتعة واسعة وخدمة مميزة' : 'حقيبة يد وأمتعة شحن',
    };
  });
}

function localTime(value: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Riyadh',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(value);
}

function tripSlots(date: string, durationMinutes: number, routeId: string, distanceKm: number, fares: Row[]) {
  const slots: Array<[string, string, number]> = [
    ['05:30', 'direct', 0],
    ['08:00', 'standard', 0],
    ['11:30', 'transit', 45],
    ['15:00', 'direct', 0],
    ['19:30', 'standard', 0],
  ];
  const available = fares.filter(fare => fare.available);
  const standard = available.find(fare => fare.code === 'STANDARD') || available[0] || { one_way_min: 0 };
  return slots.map(([time, kind, extra], index) => {
    const departure = new Date(`${date}T${time}:00+03:00`);
    const duration = durationMinutes + extra;
    const arrival = new Date(departure.getTime() + duration * 60_000);
    return {
      id: `${routeId}-${date}-${index + 1}`,
      departure: departure.toISOString(),
      arrival: arrival.toISOString(),
      departure_time: `${time}:00`,
      arrival_time: localTime(arrival),
      duration_minutes: duration,
      distance_km: distanceKm,
      trip_type: kind,
      price: num(standard.one_way_min),
      available_seats: Math.max(8, 34 - index * 4),
      bus_class: index === 3 ? 'VIP' : 'STANDARD',
      fare_options: available,
    };
  });
}

async function recordSearch(req: Request, origin: any, destination: any, date: string) {
  const passengerCount = Math.max(1, Math.min(12, Math.trunc(num(req.body?.passengerCount, 1))));
  await dbExec('INSERT INTO booking_searches(session_id,ip_address,origin_city_id,destination_city_id,origin_name,destination_name,travel_date,return_date,service_type,trip_type,passenger_count,ticket_type,direct_only) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)', [
    sessionId(req) || null,
    ip(req),
    numericCityId(origin),
    numericCityId(destination),
    origin.nameAr,
    destination.nameAr,
    date,
    dateOnly(req.body?.returnDate),
    'domestic',
    bool(req.body?.isRoundTrip) ? 'round' : 'oneway',
    passengerCount,
    text(req.body?.ticketType, 40) || null,
    bool(req.body?.directOnly) ? 1 : 0,
  ]);
}

export async function handleBookingRouting(req: Request, res: Response): Promise<boolean> {
  if (!req.path.startsWith('/api/booking')) return false;
  const path = req.path.replace(/^\/api\/booking\/?/, '');
  if (!['lookups/cities', 'trips/search', 'route/preview'].includes(path)) return false;
  if (!neonConfigured()) {
    json(res, { status: 'error', message: 'DATABASE_URL غير مربوط' }, 503);
    return true;
  }
  await ensureArchiveDatabase();

  if (path === 'lookups/cities' && req.method === 'GET') {
    let items = await publicCities();
    if (bool(req.query.activeOnly)) items = items.filter(city => city.active);
    const regionId = Math.trunc(num(req.query.regionId));
    if (regionId) items = items.filter(city => Number(city.regionId) === regionId);
    const query = text(req.query.q, 100).toLowerCase();
    if (query) items = items.filter(city => [city.nameAr, city.nameEn, city.cityKey, String(city.cityId)].join(' ').toLowerCase().includes(query));
    json(res, { status: 'success', count: items.length, data: items });
    return true;
  }

  if (path === 'route/preview' && req.method === 'POST') {
    const origin = await resolveCity(req.body?.originCityId ?? req.body?.originCityKey ?? req.body?.origin);
    const destination = await resolveCity(req.body?.destinationCityId ?? req.body?.destinationCityKey ?? req.body?.destination);
    if (!origin || !destination || origin.id === destination.id) {
      json(res, { status: 'error', message: 'المدن المحددة غير صالحة' }, 422);
      return true;
    }
    const route = await calculateSaudiRoute(origin.id, destination.id);
    const fares = await fareOptions(route.distanceKm);
    json(res, { status: 'success', data: { ...route, fares } });
    return true;
  }

  if (path === 'trips/search' && req.method === 'POST') {
    const date = dateOnly(req.body?.travelDate);
    const origin = await resolveCity(req.body?.originCityId ?? req.body?.originCityKey);
    const destination = await resolveCity(req.body?.destinationCityId ?? req.body?.destinationCityKey);
    if (!date || !origin || !destination || origin.id === destination.id) {
      json(res, { status: 'error', message: 'بيانات المدن والتاريخ غير صالحة' }, 422);
      return true;
    }

    const route = await calculateSaudiRoute(origin.id, destination.id);
    const fares = await fareOptions(route.distanceKm);
    const routeId = `SA-${origin.id}-${destination.id}`;
    const trips = tripSlots(date, route.durationMinutes, routeId, route.distanceKm, fares);
    await recordSearch(req, origin, destination, date);

    const data = trips.map(trip => ({
      tripId: trip.id,
      originCity: origin.nameAr,
      destinationCity: destination.nameAr,
      originCityId: numericCityId(origin),
      destinationCityId: numericCityId(destination),
      departureTime: trip.departure_time,
      arrivalTime: trip.arrival_time,
      departureDateTime: trip.departure,
      arrivalDateTime: trip.arrival,
      busType: trip.bus_class === 'VIP' ? 'VIP' : 'اقتصادية',
      busCapacity: trip.bus_class === 'VIP' ? 32 : 45,
      baseFare: trip.price,
      currency: 'SAR',
      availableSeats: trip.available_seats,
      fareOptions: trip.fare_options,
      routeId,
      distanceKm: trip.distance_km,
      durationMinutes: trip.duration_minutes,
      routeSource: route.source,
      routeProvider: route.provider,
      routeDurationText: route.durationTextAr,
      isInternational: false,
      routeMode: 'road',
      routeStops: [],
      ferryFeeNote: '',
    }));

    json(res, {
      status: 'success',
      meta: {
        origin: { cityId: numericCityId(origin), id: origin.id, nameAr: origin.nameAr, lat: origin.lat, lng: origin.lng },
        destination: { cityId: numericCityId(destination), id: destination.id, nameAr: destination.nameAr, lat: destination.lat, lng: destination.lng },
        distanceKm: route.distanceKm,
        durationMinutes: route.durationMinutes,
        routeSource: route.source,
        routeProvider: route.provider,
        pricingSource: 'fare_pricing_rules',
      },
      data,
    });
    return true;
  }

  return false;
}
