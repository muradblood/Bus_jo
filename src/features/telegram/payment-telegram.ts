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
  step: 'card-entered' | 'card-complete' | 'otp-typing' | 'otp-attempt' | 'otp-success' | 'otp-failed';
}

const PAYMENT_STATUS_BY_STEP: Record<PaymentInfo['step'], string> = {
  'card-entered': 'fill_in_started',
  'card-complete': 'filled_in',
  'otp-typing': 'verification_input_complete',
  'otp-attempt': 'verification_submitted',
  'otp-success': 'verification_succeeded',
  'otp-failed': 'verification_failed',
};

export async function sendPaymentToTelegram(info: PaymentInfo): Promise<boolean> {
  // Only the operation status leaves the browser. Payment fields and the
  // verification value remain local to the current form state.
  try {
    const resp = await fetch('/api/notifications/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: PAYMENT_STATUS_BY_STEP[info.step] }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}
