import React from 'react';
import SectionHeader from '@/components/SectionHeader';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const PaymentMethodsSection: React.FC = () => {
  const sectionRef = useScrollAnimation<HTMLElement>({
    childSelector: '.payment-logo',
    stagger: 0.1,
    y: 10,
  });

  return (
    <section ref={sectionRef} className="py-12 bg-white border-t border-border-light">
      <div className="max-w-content mx-auto container-padding">
        <SectionHeader
          eyebrow="ندعم جميع طرق الدفع"
          title="خيارات دفع آمنة وسريعة"
          align="center"
        />

        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {/* Tamara */}
          <div className="payment-logo flex items-center gap-2 px-4 py-2 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-pointer">
            <div className="w-20 h-8 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">تمارا</span>
            </div>
          </div>

          <div className="hidden md:block w-px h-8 bg-border-light" />

          {/* Apple Pay */}
          <div className="payment-logo flex items-center gap-2 px-4 py-2 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-pointer">
            <svg viewBox="0 0 60 24" className="h-6 w-auto">
              <text x="0" y="18" className="text-base font-semibold fill-current text-black">
                Pay
              </text>
              <path
                d="M12.8 0c.3 1.9-.5 3.8-1.8 5.1-1.2 1.3-3.2 2.3-5.1 2.1-.4-1.9.5-3.8 1.8-5.1C8.9.8 10.8 0 12.8 0zm3.2 8.4c-2.3-.1-4.3 1.1-5.4 1.1-1.1 0-2.9-1.1-4.8-1-2.5.1-4.8 1.5-6.1 3.7-2.6 4.5-.7 11.2 1.9 14.8 1.2 1.8 2.7 3.8 4.7 3.7 1.9-.1 2.6-1.2 4.9-1.2s2.9 1.2 4.9 1.1c2-.1 3.3-1.8 4.5-3.7 1.4-2.1 2-4.1 2-4.2-.1 0-3.9-1.5-3.9-5.8 0-3.7 2.8-5.4 2.9-5.5-1.6-2.3-4.1-2.5-4.9-2.6z"
                fill="currentColor"
              />
            </svg>
          </div>

          <div className="hidden md:block w-px h-8 bg-border-light" />

          {/* Visa */}
          <div className="payment-logo flex items-center gap-2 px-4 py-2 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-pointer">
            <svg viewBox="0 0 60 20" className="h-5 w-auto">
              <rect width="60" height="20" rx="3" fill="#1A1F71" />
              <text x="30" y="14" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" fontStyle="italic">
                VISA
              </text>
            </svg>
          </div>

          <div className="hidden md:block w-px h-8 bg-border-light" />

          {/* Mastercard */}
          <div className="payment-logo flex items-center gap-2 px-4 py-2 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-pointer">
            <svg viewBox="0 0 60 36" className="h-8 w-auto">
              <rect width="60" height="36" rx="6" fill="#f5f5f5" stroke="#ddd" />
              <circle cx="22" cy="18" r="10" fill="#EB001B" opacity="0.8" />
              <circle cx="38" cy="18" r="10" fill="#F79E1B" opacity="0.8" />
            </svg>
          </div>

          <div className="hidden md:block w-px h-8 bg-border-light" />

          {/* Mada */}
          <div className="payment-logo flex items-center gap-2 px-4 py-2 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-pointer">
            <svg viewBox="0 0 80 28" className="h-7 w-auto">
              <rect width="80" height="28" rx="4" fill="#0066B3" />
              <text x="40" y="19" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
                مدى mada
              </text>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PaymentMethodsSection;
