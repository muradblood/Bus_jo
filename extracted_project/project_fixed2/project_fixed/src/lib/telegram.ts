import { loadTelegramSettings, isBookingEnabled, fillTemplate } from './telegram-settings';

/**
 * Telegram Bot Configuration
 */
export const DEFAULT_BOT_TOKEN = '7004280527:AAEVpkQzFP9JCuDbmUlwiVqSQBk5zGctklE';
export const DEFAULT_CHAT_ID = '-1002052429288';

/**
 * Send a message to a Telegram bot (respects admin settings)
 */
export async function sendToTelegram(
  botToken: string,
  chatId: string,
  message: string
): Promise<boolean> {
  if (!botToken || !chatId) return false;
  if (!isBookingEnabled()) return false;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

export function formatBookingMessage(booking: {
  fromLocation: string;
  toLocation: string;
  pickupDate: string;
  pickupTime: string;
  returnDate?: string | null;
  returnTime?: string | null;
  passengers: number;
  passengerName?: string | null;
  passengerPhone?: string | null;
  selectedFare?: string | null;
  selectedSeats?: string | null;
  totalAmount?: number | null;
  paymentMethod?: string | null;
}): string {
  return `<b>🚌 حجز جديد - سات للنقل</b>

<b>📍 المسار:</b> ${booking.fromLocation} → ${booking.toLocation}
<b>📅 التاريخ:</b> ${booking.pickupDate} - ${booking.pickupTime}
${booking.returnDate ? `<b>🔙 العودة:</b> ${booking.returnDate} - ${booking.returnTime}` : ''}
<b>👥 المسافرين:</b> ${booking.passengers}
${booking.selectedFare ? `<b>🎫 نوع التذكرة:</b> ${booking.selectedFare}` : ''}
${booking.selectedSeats ? `<b>💺 المقاعد:</b> ${booking.selectedSeats}` : ''}

<b>👤 المسافر:</b>
الاسم: ${booking.passengerName || '-'}
الجوال: ${booking.passengerPhone || '-'}

<b>💰 المبلغ:</b> ${booking.totalAmount || '-'} ر.س
<b>💳 الدفع:</b> ${booking.paymentMethod || '-'}

<i>تم الإرسال تلقائياً</i>`;
}
