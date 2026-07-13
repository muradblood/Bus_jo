import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const MobileAppSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const phonesRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(phonesRef.current, {
        x: -40,
        opacity: 0,
        duration: 0.7,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%',
          toggleActions: 'play none none none',
        },
      });

      gsap.from(contentRef.current, {
        x: 20,
        opacity: 0,
        duration: 0.6,
        delay: 0.2,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%',
          toggleActions: 'play none none none',
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-16 md:py-20 bg-white">
      <div className="max-w-content mx-auto container-padding">
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
          {/* Phone Mockups */}
          <div ref={phonesRef} className="w-full lg:w-[45%] relative flex justify-center">
            <div className="relative flex items-center justify-center">
              {/* Back Phone (smaller, offset) */}
              <div className="hidden md:block absolute -top-4 left-4 scale-[0.85] opacity-80">
                <div className="w-[220px] h-[440px] bg-charcoal rounded-[32px] p-2 shadow-2xl">
                  <div className="w-full h-full bg-white rounded-[28px] overflow-hidden">
                    <img
                      src="/service-city.jpg"
                      alt="App screen 2"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Front Phone */}
              <div className="relative z-10">
                <div className="w-[240px] h-[480px] bg-charcoal rounded-[36px] p-2.5 shadow-[0_20px_60px_rgba(26,26,46,0.15)]">
                  <div className="w-full h-full bg-white rounded-[30px] overflow-hidden">
                    <img
                      src="/dest-riyadh.jpg"
                      alt="App screen 1"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div
            ref={contentRef}
            className="w-full lg:w-[55%] text-center lg:text-right"
          >
            <h2 className="text-2xl md:text-4xl font-bold text-text-primary mb-4">
              حمل تطبيقنا
            </h2>
            <p className="text-text-secondary leading-relaxed max-w-[440px] mx-auto lg:mr-0 mb-8">
              يساعدك على الحجز بسهولة وتتبع رحلتك لحظة بلحظة. احصل على إشعارات
              فورية وتجربة سفر سلسة في متناول يدك.
            </p>

            {/* App Store Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
              {/* App Store */}
              <a
                href="https://apps.apple.com/sa/app/sat-bus-booking/id1234567890"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-charcoal text-white px-5 py-3 rounded-xl hover:-translate-y-0.5 hover:shadow-card transition-all duration-300"
              >
                <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div className="text-right">
                  <div className="text-[10px] text-white/70 leading-none">
                    Download on the
                  </div>
                  <div className="text-base font-semibold leading-tight">
                    App Store
                  </div>
                </div>
              </a>

              {/* Google Play */}
              <a
                href="https://play.google.com/store/apps/details?id=com.sat.busbooking"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-charcoal text-white px-5 py-3 rounded-xl hover:-translate-y-0.5 hover:shadow-card transition-all duration-300"
              >
                <svg viewBox="0 0 24 24" className="w-7 h-7">
                  <path
                    d="M3 20.5v-17c0-.83.67-1.5 1.5-1.5h.37L20.7 11.52c.37.21.5.68.29 1.05-.08.14-.19.25-.33.33L4.87 22h-.37c-.83 0-1.5-.67-1.5-1.5z"
                    fill="#EA4335"
                  />
                  <path
                    d="M16.5 14.8L5.2 22H4.87c-.46 0-.88-.21-1.15-.55l12.78-7.65z"
                    fill="#FBBC04"
                  />
                  <path
                    d="M16.5 9.2L4.72 2.55C4.99 2.21 5.41 2 5.87 2h.33l11.3 7.2-1 1z"
                    fill="#4285F4"
                  />
                  <path d="M21.7 11.5L18 13.7l-1.5-1L18 10l3.7 1.5z" fill="#34A853" />
                </svg>
                <div className="text-right">
                  <div className="text-[10px] text-white/70 leading-none">
                    GET IT ON
                  </div>
                  <div className="text-base font-semibold leading-tight">
                    Google Play
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MobileAppSection;
