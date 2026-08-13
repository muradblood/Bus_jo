import React, { useEffect, useState } from 'react';
import { CreditCard, Lock } from 'lucide-react';

interface LoadingScreenProps {
  isVisible: boolean;
  message?: string;
  cardIcon?: string;
  amount?: number;
  cardNumber?: string;
  route?: { from: string; to: string };
}

const loadingMessages = [
  'جارٍ البحث عن أفضل الرحلات المتاحة...',
  'جارٍ تحميل خريطة المقاعد...',
  'جارٍ التحقق من معلومات الحجز...',
  'جارٍ تحضير خيارات الدفع...',
  'جارٍ معالجة الدفع...',
  'جارٍ إرسال رمز التحقق...',
  'جارٍ تأكيد الحجز...',
];

// ─── Card Brand Icons for Loading Screen ──────────────────────
const CardBrandIcon: React.FC<{ brand: string }> = ({ brand }) => {
  if (brand === 'visa' || brand === 'mastercard') {
    return (
      <div className="flex items-center gap-4">
        {/* Visa */}
        <div className="w-28 h-16 bg-[#1A1F71] rounded-xl flex items-center justify-center shadow-2xl animate-fade-scale">
          <span className="text-white font-extrabold text-2xl italic tracking-widest" style={{ fontFamily: 'Arial, sans-serif' }}>VISA</span>
        </div>
        {/* Mastercard */}
        <div className="w-28 h-16 bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] rounded-xl flex items-center justify-center shadow-2xl animate-fade-scale" style={{ animationDelay: '0.2s' }}>
          <svg viewBox="0 0 40 24" className="w-12 h-8">
            <circle cx="14" cy="12" r="8" fill="#EB001B"/>
            <circle cx="26" cy="12" r="8" fill="#F79E1B"/>
            <path d="M20 5a8 8 0 0 1 0 14 8 8 0 0 1 0-14z" fill="#FF5F00"/>
          </svg>
        </div>
      </div>
    );
  }

  if (brand === 'mada') {
    return (
      <div className="w-36 h-16 bg-white rounded-xl flex items-center justify-center shadow-2xl border-2 border-[#84b740] animate-fade-scale px-4">
        <svg viewBox="0 0 144 48" className="w-28 h-10">
          <rect width="60" height="20" fill="#259bd6"/>
          <rect y="28" width="60" height="20" fill="#84b740"/>
          <text x="68" y="18" fill="#27292d" fontSize="14" fontWeight="bold" fontFamily="Arial, sans-serif">mada</text>
          <text x="68" y="42" fill="#27292d" fontSize="14" fontWeight="bold" fontFamily="Arial, sans-serif">مدى</text>
        </svg>
      </div>
    );
  }

  return (
    <div className="w-28 h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl flex items-center justify-center shadow-lg">
      <CreditCard className="w-10 h-10 text-gray-400" />
    </div>
  );
};

// ─── Payment Loading Screen (Dark Blue Full-Screen) ───────────
const PaymentLoadingScreen: React.FC<{
  amount?: number;
  cardNumber?: string;
  route?: { from: string; to: string };
}> = ({ amount, cardNumber, route }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 0;
        return prev + 2;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const maskedCard = cardNumber
    ? `**** **** **** ${cardNumber.replace(/\s/g, '').slice(-4)}`
    : '**** **** **** 0511';
  const displayAmount = amount ?? 130;
  const routeText = route ? `${route.from} ← ${route.to}` : 'الرياض ← جدة';

  return (
    <div className="fixed inset-0 z-[80] flex flex-col" style={{ background: 'linear-gradient(180deg, #1a2a4a 0%, #0d1b2a 50%, #1a2a4a 100%)' }}>
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#152238]/80 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-lg bg-[#1a3a5c] text-white text-xs font-bold border border-white/20">PCI</span>
          <span className="px-3 py-1 rounded-lg bg-[#1a5c3a] text-white text-xs font-bold border border-white/20">SSL</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-base">جار معالجة الدفع</span>
          <Lock className="w-5 h-5 text-yellow-400" />
        </div>
      </div>

      {/* Center Card */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
          {/* Spinning Circle */}
          <div className="flex flex-col items-center pt-8 pb-4">
            <div className="relative w-20 h-20 mb-4">
              <svg className="w-20 h-20 animate-spin" viewBox="0 0 80 80">
                <defs>
                  <linearGradient id="spinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                </defs>
                <circle
                  cx="40" cy="40" r="32"
                  fill="none"
                  stroke="url(#spinGradient)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray="120 80"
                />
              </svg>
            </div>
            <h2 className="text-xl font-extrabold text-[#1a2a4a] mb-2">يتم التحقق من البطاقة</h2>
            <p className="text-[#8A7E6B] text-sm text-center px-6 leading-relaxed">
              الرجاء الانتظار، يتم التواصل مع بنكك بشكل آمن.
              <br />
              لا تغلق هذه النافذة.
            </p>
          </div>

          {/* Info Rows */}
          <div className="px-5 py-3 space-y-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-[#8A7E6B] text-sm">المبلغ الإجمالي</span>
              <span className="text-[#1a2a4a] font-bold text-sm">{displayAmount} ر.س</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8A7E6B] text-sm">رقم البطاقة</span>
              <span className="text-[#1a2a4a] font-bold text-sm" dir="ltr">{maskedCard}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8A7E6B] text-sm">الرحلة</span>
              <span className="text-[#1a2a4a] font-bold text-sm">{routeText}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="px-5 py-3">
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 ease-linear"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #3b82f6, #22c55e)',
                }}
              />
            </div>
          </div>

          {/* Warning */}
          <div className="px-5 pb-5 pt-1">
            <p className="text-[#8A7E6B] text-xs text-center leading-relaxed flex items-center justify-center gap-1">
              <svg className="w-4 h-4 text-yellow-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 22h20L12 2zm0 3.5L18.5 19h-13L12 5.5zM11 10v6h2v-6h-2zm0 8v2h2v-2h-2z"/>
              </svg>
              يُرجى عدم إغلاق المتصفح أو الرجوع للخلف أثناء المعالجة
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isVisible,
  message,
  cardIcon,
  amount,
  cardNumber,
  route,
}) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  // Payment/OTP mode: show full-screen dark blue payment loading
  if (cardIcon) {
    return <PaymentLoadingScreen amount={amount} cardNumber={cardNumber} route={route} />;
  }

  // Default mode: show SAT logo (non-payment pages)
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl mx-4 w-full max-w-[360px] py-10 px-8 flex flex-col items-center animate-fade-scale">
        {/* Spinning Logo */}
        <div className="relative mb-8">
          {/* Outer spinning ring */}
          <div className="w-28 h-28 rounded-full border-4 border-surface-alt flex items-center justify-center">
            {/* Spinning arc */}
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-gold animate-spin-slow" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-b-brand-gold-dark animate-spin-reverse" />
            {/* SAT Logo */}
            <img
              src="/sat-logo.png"
              alt="سات"
              className="w-16 h-auto object-contain relative z-10"
            />
          </div>
          {/* Pulse dots */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-brand-gold animate-pulse-dot" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-brand-gold animate-pulse-dot" style={{ animationDelay: '200ms' }} />
            <div className="w-2 h-2 rounded-full bg-brand-gold animate-pulse-dot" style={{ animationDelay: '400ms' }} />
          </div>
        </div>

        {/* Loading Text */}
        <p className="text-charcoal text-center text-base leading-relaxed font-medium">
          {message || 'جارٍ تحميل البيانات... يرجى الانتظار'}
          <span className="inline-block w-6 text-left">{dots}</span>
        </p>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-[#F0EDE4] rounded-full mt-6 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-brand-gold to-[#D4A03A] rounded-full animate-progress-bar" />
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;

// Hook for managing loading transitions
export function useLoadingTransition() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const transition = async (nextStep: () => void, messageIndex?: number) => {
    setLoadingMessage(loadingMessages[messageIndex ?? 0]);
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    setIsLoading(false);
    nextStep();
  };

  return { isLoading, loadingMessage, transition };
}
