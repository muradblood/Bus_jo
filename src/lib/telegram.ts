export const DEFAULT_BOT_TOKEN = '';
export const DEFAULT_CHAT_ID = '';

/**
 * Send a message to a Telegram bot (respects admin settings)
 */
export async function sendToTelegram(
  _botToken: string,
  _chatId: string,
  _message: string
): Promise<boolean> {
  // Direct client-to-Telegram sending is disabled. Use the server-side,
  // allow-listed notification endpoints instead.
  return false;
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
