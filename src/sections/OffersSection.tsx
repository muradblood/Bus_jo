import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SectionHeader from '@/components/SectionHeader';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const offers = [
  {
    title: 'STUDENT 20% OFF',
    description:
      'خصم 20% لجميع الطلاب على جميع الرحلات الداخلية. أظهر بطاقتك الجامعية عند الحجز.',
    cta: 'احصل على العرض',
  },
  {
    title: 'SPECIAL NEEDS 20% OFF',
    description:
      'خصم 20% لذوي الاحتياجات الخاصة. مركبات مجهزة بكامل الخدمات لضمان راحتك.',
    cta: 'احصل على العرض',
  },
  {
    title: 'CORPORATE 25% OFF',
    description:
      'خصم 25% للشركات على العقود الشهرية. تشمل خدمة مميزة ومركبات فاخرة.',
    cta: 'احصل على العرض',
  },
];

const OffersSection: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % offers.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + offers.length) % offers.length);
  };

  const sectionRef = useScrollAnimation<HTMLElement>();

  return (
    <section
      id="offers"
      ref={sectionRef}
      className="py-16 md:py-20 bg-surface-alt"
    >
      <div className="max-w-content mx-auto container-padding">
        <SectionHeader
          eyebrow="العروض والصفقات"
          title="أفضل العروض لك"
        />

        <div className="relative">
          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full border border-border-light bg-white flex items-center justify-center text-brand-gold hover:bg-brand-gold hover:text-white transition-all duration-200 shadow-sm -mr-5 hidden md:flex"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full border border-border-light bg-white flex items-center justify-center text-brand-gold hover:bg-brand-gold hover:text-white transition-all duration-200 shadow-sm -ml-5 hidden md:flex"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Cards Container */}
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-400 ease-out gap-6"
              style={{
                transform: `translateX(${currentSlide * (100 / (typeof window !== 'undefined' && window.innerWidth >= 768 ? 2 : 1))}%)`,
              }}
            >
              {offers.map((offer, index) => (
                <div
                  key={index}
                  className="min-w-full md:min-w-[calc(50%-12px)] flex-shrink-0"
                >
                  <div className="bg-white rounded-[20px] border border-border-light overflow-hidden flex flex-col md:flex-row">
                    {/* Left - Offer Title */}
                    <div className="md:w-1/2 p-8 bg-surface-alt relative overflow-hidden flex items-center justify-center">
                      {/* Decorative circles */}
                      <div className="absolute top-4 right-4 w-16 h-16 rounded-full border-2 border-brand-gold/10" />
                      <div className="absolute bottom-6 left-6 w-10 h-10 rounded-full border-2 border-brand-gold/10" />
                      <div className="absolute top-1/2 left-1/4 w-6 h-6 rounded-full bg-brand-gold/5" />

                      <h3 className="text-2xl md:text-3xl font-extrabold text-brand-gold relative z-10 text-center">
                        {offer.title}
                      </h3>
                    </div>

                    {/* Right - Description & CTA */}
                    <div className="md:w-1/2 p-8 flex flex-col justify-center">
                      <p className="text-text-secondary text-sm leading-relaxed mb-5">
                        {offer.description}
                      </p>
                      <button className="self-start gold-gradient text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-button hover:shadow-button-hover transition-all duration-250">
                        {offer.cta}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dot Indicators */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {offers.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? 'bg-brand-gold scale-125 w-6'
                    : 'bg-border-light hover:bg-brand-gold/50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default OffersSection;
