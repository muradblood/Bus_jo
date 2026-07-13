import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowLeft } from 'lucide-react';
import SectionHeader from '@/components/SectionHeader';

gsap.registerPlugin(ScrollTrigger);

const services = [
  {
    title: 'نقل المطار',
    description:
      'وصول ومغادرة بلا توتر. نرحب بك في المطار ونوصلك إلى وجهتك براحة تامة. تتبع الرحلات متاح لضمان الالتزام بالمواعيد.',
    image: '/service-airport.jpg',
    cta: 'اكتشف المزيد',
  },
  {
    title: 'رحلات المدينة',
    description:
      'تنقل بأناقة داخل المدينة. سائقون محليون يعرفون أفضل الطرق ليوصلك بسرعة وأمان إلى أي وجهة في المدينة.',
    image: '/service-city.jpg',
    cta: 'اكتشف المزيد',
    reversed: true,
  },
  {
    title: 'الإيجار بالساعة',
    description:
      'مركبة وسائق على مدار الساعة لاجتماعاتك المتتالية أو جولاتك السياحية. مرونة كاملة في التنقل دون قيود.',
    image: '/service-hourly.jpg',
    cta: 'اكتشف المزيد',
  },
  {
    title: 'خدمات الشركات',
    description:
      'حلول موثوقة للنقل المؤسسي. عقود شهرية مرنة، فوترة مركزية، وتقارير مفصلة لتتبع مصاريف النقل.',
    image: '/service-corporate.jpg',
    cta: 'اكتشف المزيد',
    reversed: true,
  },
  {
    title: 'المناسبات الخاصة',
    description:
      'أضف لمسة من الفخامة إلى مناسبتك. أسطول من المركبات الفاخرة لحفلات الزفاف والمؤتمرات والفعاليات الخاصة.',
    image: '/service-events.jpg',
    cta: 'اكتشف المزيد',
  },
];

const ServicesSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = sectionRef.current?.querySelectorAll('.service-card');
      cards?.forEach((card, index) => {
        const image = card.querySelector('.service-image');
        const content = card.querySelector('.service-content');
        const isReversed = services[index]?.reversed;

        gsap.from(image, {
          x: isReversed ? 40 : -40,
          opacity: 0,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        });

        gsap.from(content, {
          x: isReversed ? -40 : 40,
          opacity: 0,
          duration: 0.6,
          delay: 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="services"
      ref={sectionRef}
      className="py-16 md:py-20 bg-white"
    >
      <div className="max-w-content mx-auto container-padding">
        <SectionHeader
          eyebrow="خدماتنا"
          title="حلول نقل شاملة"
        />

        <div className="space-y-8">
          {services.map((service, index) => (
            <div
              key={index}
              className={`service-card bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-350 overflow-hidden border border-border-light/50 ${
                service.reversed ? 'lg:flex-row-reverse' : ''
              } flex flex-col lg:flex-row`}
            >
              {/* Image */}
              <div className="service-image lg:w-1/2 relative overflow-hidden">
                <div
                  className={`absolute top-0 ${service.reversed ? 'left-0' : 'right-0'} w-1 h-full bg-brand-gold`}
                />
                <img
                  src={service.image}
                  alt={service.title}
                  className="w-full h-56 lg:h-72 object-cover hover:scale-[1.03] transition-transform duration-500"
                />
              </div>

              {/* Content */}
              <div className="service-content lg:w-1/2 p-6 md:p-8 flex flex-col justify-center relative">
                {/* Watermark icon */}
                <div className="absolute top-4 right-4 opacity-5">
                  <svg
                    viewBox="0 0 48 48"
                    className="w-12 h-12 text-brand-gold"
                    fill="currentColor"
                  >
                    <path d="M24 4L6 14v20l18 10 18-10V14L24 4zm0 6l12 6.7v13.3L24 36.7 12 30V16.7L24 10z" />
                  </svg>
                </div>

                <h3 className="text-xl md:text-2xl font-semibold text-text-primary mb-3">
                  {service.title}
                </h3>
                <p className="text-text-secondary text-sm md:text-base leading-relaxed mb-4">
                  {service.description}
                </p>
                <a
                  href="/#search"
                  className="inline-flex items-center gap-1 text-brand-gold font-medium hover:gap-2 transition-all duration-200 text-sm"
                >
                  {service.cta}
                  <ArrowLeft className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
