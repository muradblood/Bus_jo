import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const CtaBookNowSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(imageRef.current, {
        scale: 0.9,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%',
          toggleActions: 'play none none none',
        },
      });

      gsap.from(contentRef.current, {
        x: 30,
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
    <section
      ref={sectionRef}
      className="py-16 md:py-20 bg-brand-gold relative overflow-hidden"
    >
      {/* Decorative Elements */}
      <div className="absolute top-8 right-12 w-20 h-20 rounded-full border border-white/10" />
      <div className="absolute bottom-12 left-16 w-12 h-12 rounded-full border border-white/10" />
      <div className="absolute top-1/3 left-8 w-2 h-2 rounded-full bg-white/10" />
      <div className="absolute top-1/4 right-1/4 w-1.5 h-1.5 rounded-full bg-white/10" />
      <div className="absolute bottom-1/3 right-12 w-2 h-2 rounded-full bg-white/10" />

      <div className="max-w-content mx-auto container-padding">
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
          {/* Image with blob mask */}
          <div ref={imageRef} className="w-full lg:w-[45%] relative">
            <div className="relative">
              {/* Decorative dots */}
              <div className="absolute -top-4 -right-2 z-20 flex gap-1.5 flex-wrap w-16">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-cyan-400/70"
                  />
                ))}
              </div>

              {/* Blob masked image */}
              <div
                className="relative overflow-hidden shadow-2xl"
                style={{
                  clipPath:
                    'polygon(5% 0%, 95% 5%, 100% 60%, 85% 100%, 15% 95%, 0% 40%)',
                  filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.2))',
                }}
              >
                <img
                  src="/service-city.jpg"
                  alt="Riyadh city at golden hour"
                  className="w-full h-[300px] md:h-[400px] object-cover"
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div
            ref={contentRef}
            className="w-full lg:w-[55%] text-center lg:text-right"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              احجز رحلتك الفاخرة الآن!
            </h2>
            <p className="text-white/90 text-base md:text-lg mb-8 max-w-md lg:mr-0 mx-auto">
              احجز رحلتك ببطاقتك الائتمانية في أقل من دقيقتين.
            </p>
            <button className="inline-flex items-center gap-2 px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-brand-gold transition-all duration-300">
              المزيد من التفاصيل
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CtaBookNowSection;
