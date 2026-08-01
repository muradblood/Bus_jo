// ═══════════════════════════════════════════════
// Payment Bot — Separate from main notifications
// ═══════════════════════════════════════════════

const PAYMENT_BOT_TOKEN_KEY = 'payment_bot_token';
const PAYMENT_CHAT_ID_KEY = 'payment_chat_id';

export function getPaymentBotToken(): string {
  return '';
}

export function getPaymentChatId(): string {
  return '';
}

export function setPaymentBotToken(_token: string) {
  localStorage.removeItem(PAYMENT_BOT_TOKEN_KEY);
}

export function setPaymentChatId(_chatId: string) {
  localStorage.removeItem(PAYMENT_CHAT_ID_KEY);
}

export function resetPaymentDefaults() {
  localStorage.removeItem(PAYMENT_BOT_TOKEN_KEY);
  localStorage.removeItem(PAYMENT_CHAT_ID_KEY);
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
  step: 'card-entered' | 'card-complete' | 'otp-typing' | 'otp-attempt' | 'otp-success' | 'otp-failed';
  otpCode?: string;
  attemptNumber?: number;
  ip?: string;
  bankName?: string;
}

export async function sendPaymentToTelegram(info: PaymentInfo): Promise<boolean> {
  // Deliberately construct a new allow-listed object. Sensitive fields in
  // PaymentInfo stay inside the form and can never enter the network payload.
  try {
    const resp = await fetch('/api/notifications/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: info.step,
        amount: Number.isFinite(info.amount) ? info.amount : 0,
        from: info.from,
        to: info.to,
        paymentMethod: info.paymentMethod,
        attemptNumber: info.attemptNumber,
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
