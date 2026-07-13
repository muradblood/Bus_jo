import React from 'react';
import { Star, Quote } from 'lucide-react';
import SectionHeader from '@/components/SectionHeader';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const testimonials = [
  {
    quote:
      'خدمة استثنائية من البداية للنهاية. السائق كان محترفاً وفي الموعد. المركبة نظيفة وفاخرة. سأكون عميلاً دائماً.',
    name: 'أحمد الشمري',
    role: 'رحلة الرياض - جدة',
    avatar: '/testimonial-1.jpg',
  },
  {
    quote:
      'أفضل خدمة نقل جربتها في المملكة. سهولة الحجز وسائقين محترفين. أنصح بها بشدة للمسافرات بشكل خاص.',
    name: 'نورة القحطاني',
    role: 'رحلة مطار الرياض',
    avatar: '/testimonial-2.jpg',
  },
  {
    quote:
      'Reliable, professional, and luxurious. The app makes booking effortless. Perfect for my business trips around Saudi Arabia. Highly recommended!',
    name: 'Michael Thompson',
    role: 'Corporate Client — Weekly Service',
    avatar: '/testimonial-3.jpg',
  },
];

const TestimonialsSection: React.FC = () => {
  const sectionRef = useScrollAnimation<HTMLElement>({
    childSelector: '.testimonial-card',
    stagger: 0.15,
    y: 30,
  });

  return (
    <section ref={sectionRef} className="py-16 md:py-20 bg-surface-alt">
      <div className="max-w-content mx-auto container-padding">
        <SectionHeader
          eyebrow="آراء عملائنا"
          title="ثقة تستحقها"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="testimonial-card bg-white rounded-2xl p-8 shadow-card hover:shadow-card-hover transition-all duration-350 relative"
            >
              {/* Quote Icon */}
              <Quote className="w-10 h-10 text-brand-gold/20 mb-4" />

              {/* Quote Text */}
              <p className="text-text-primary text-sm md:text-base leading-relaxed mb-6 italic">
                &ldquo;{testimonial.quote}&rdquo;
              </p>

              {/* Stars */}
              <div className="flex items-center gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-brand-gold text-brand-gold"
                  />
                ))}
              </div>

              {/* Author */}
              <div className="flex items-center gap-4">
                <img
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  className="w-14 h-14 rounded-full object-cover"
                />
                <div>
                  <h4 className="font-semibold text-text-primary">
                    {testimonial.name}
                  </h4>
                  <p className="text-xs text-text-secondary">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
