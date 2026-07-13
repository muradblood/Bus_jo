import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import BookingPanel from '@/components/BookingPanel';
import type { BookingData } from '@/components/BookingPanel';

interface HeroSectionProps {
  onSearch: (data: BookingData) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onSearch }) => {
  const heroRef = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero image parallax entrance
      gsap.from(imgRef.current, {
        scale: 1.15,
        opacity: 0,
        duration: 1.2,
        ease: 'power2.out',
      });

      // Text animation
      gsap.from(textRef.current, {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        delay: 0.4,
      });

      // Panel animation
      gsap.from(panelRef.current, {
        y: 60,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        delay: 0.6,
      });

      // Floating particles
      const particles = document.querySelectorAll('.hero-particle');
      particles.forEach((p, i) => {
        gsap.to(p, {
          y: -30,
          x: Math.sin(i) * 20,
          duration: 3 + i * 0.5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.3,
        });
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="hero"
      ref={heroRef}
      className="relative overflow-hidden bg-surface-alt"
    >
      {/* ═══ HERO IMAGE BANNER (Standalone - separated from booking panel) ═══ */}
      <div ref={imgRef} className="relative w-full h-[50vh] md:h-[55vh] lg:h-[60vh] overflow-hidden">
        <img
          src="/hero-bus-new.jpg"
          alt="سابتكو السا للنقل - SAT"
          className="w-full h-full object-cover object-center"
        />
        {/* Gradient overlay — light tint since image has its own text */}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/40 via-transparent to-transparent" />

        {/* Floating particles */}
        <div className="hero-particle absolute top-[20%] left-[10%] w-2 h-2 rounded-full bg-brand-gold/40" />
        <div className="hero-particle absolute top-[30%] right-[15%] w-1.5 h-1.5 rounded-full bg-white/30" />
        <div className="hero-particle absolute top-[60%] left-[20%] w-1 h-1 rounded-full bg-brand-gold/30" />
        <div className="hero-particle absolute top-[40%] right-[25%] w-2 h-2 rounded-full bg-white/20" />

        {/* Hero text overlay — HIDDEN since image already has SAT logo */}
        <div ref={textRef} className="hidden" />
      </div>

      {/* ═══ STATS + BOOKING PANEL (Separated from hero image) ═══ */}
      <div className="relative z-20 py-8 md:py-12">
        <div className="max-w-content mx-auto container-padding">
          <div ref={panelRef} className="flex justify-center">
            <div className="w-full max-w-[600px]">
              {/* Quick stats bar */}
              <div className="flex justify-center gap-4 md:gap-8 mb-6">
                {[
                  { value: '50+', label: 'وجهة' },
                  { value: '100K+', label: 'رحلة شهرياً' },
                  { value: '4.8', label: 'تقييم الركاب' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-brand-gold font-bold text-lg md:text-xl">{stat.value}</div>
                    <div className="text-text-secondary text-[10px] md:text-xs">{stat.label}</div>
                  </div>
                ))}
              </div>

              <BookingPanel onSearch={onSearch} />

              {/* Trust badges */}
              <div className="flex justify-center items-center gap-4 md:gap-6 mt-4 text-[10px] md:text-xs text-text-secondary">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  دفع آمن
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-brand-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  حجز فوري
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-sat-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  تتبع الرحلة
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
