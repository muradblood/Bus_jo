import React from 'react';
import { Ticket, CalendarCheck, Globe } from 'lucide-react';
import SectionHeader from '@/components/SectionHeader';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const steps = [
  {
    icon: Ticket,
    title: 'احجز رحلتك',
    description:
      'اختر وجهتك ونوع المركبة المفضلة واحجز في أقل من دقيقتين',
  },
  {
    icon: CalendarCheck,
    title: 'اختر التاريخ والوقت',
    description:
      'حدد موعد الاستلام والعودة بما يناسب جدولك الزمني',
  },
  {
    icon: Globe,
    title: 'انطلق إلى وجهتك',
    description:
      'استرخِ واستمتع برحلة فاخرة مع سائق محترف ومركبة مريحة',
  },
];

const BookingStepsSection: React.FC = () => {
  const sectionRef = useScrollAnimation<HTMLElement>({
    childSelector: '.step-card',
    stagger: 0.15,
    y: 30,
  });

  return (
    <section
      id="about"
      ref={sectionRef}
      className="py-16 md:py-20 bg-white"
    >
      <div className="max-w-content mx-auto container-padding">
        <SectionHeader
          eyebrow="كيف يعمل"
          title="ثلاث خطوات بسيطة"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <div
              key={index}
              className="step-card bg-white rounded-2xl p-8 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-350 text-center border border-border-light/50"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-surface-alt flex items-center justify-center mb-5 group-hover:bg-brand-gold-light/30 transition-colors">
                <step.icon className="w-8 h-8 text-brand-gold" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BookingStepsSection;
