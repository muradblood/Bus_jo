import React, { useState } from 'react';
import SectionHeader from '@/components/SectionHeader';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { findRoute, countryFlags, countryNames } from '@/lib/international-data';
import { useNavigate } from 'react-router';

type Region = 'all' | 'gcc' | 'levant' | 'egypt' | 'north-africa' | 'africa';

const destinations = [
  // ─── السعودية ───
  { city: 'الرياض', country: 'SA', price: '250', image: '/dest-riyadh.jpg', region: 'gcc' },
  { city: 'جدة', country: 'SA', price: '280', image: '/dest-jeddah.jpg', region: 'gcc' },
  { city: 'الدمام', country: 'SA', price: '300', image: '/dest-dammam.jpg', region: 'gcc' },
  { city: 'أبها', country: 'SA', price: '350', image: '/dest-abha.jpg', region: 'gcc' },
  // ─── الإمارات ───
  { city: 'دبي', country: 'AE', price: '380', image: '/dest-dammam.jpg', region: 'gcc' },
  { city: 'أبوظبي', country: 'AE', price: '350', image: '/dest-jeddah.jpg', region: 'gcc' },
  // ─── الكويت ───
  { city: 'الكويت العاصمة', country: 'KW', price: '250', image: '/dest-riyadh.jpg', region: 'gcc' },
  // ─── قطر ───
  { city: 'الدوحة', country: 'QA', price: '300', image: '/dest-dammam.jpg', region: 'gcc' },
  // ─── البحرين ───
  { city: 'المنامة', country: 'BH', price: '210', image: '/dest-abha.jpg', region: 'gcc' },
  // ─── عمان ───
  { city: 'مسقط', country: 'OM', price: '440', image: '/dest-jeddah.jpg', region: 'gcc' },
  // ─── مصر ───
  { city: 'القاهرة', country: 'EG', price: '280', image: '/dest-riyadh.jpg', region: 'egypt' },
  { city: 'الإسكندرية', country: 'EG', price: '190', image: '/dest-abha.jpg', region: 'egypt' },
  { city: 'شرم الشيخ', country: 'EG', price: '200', image: '/dest-dammam.jpg', region: 'egypt' },
  // ─── الأردن ───
  { city: 'عمان', country: 'JO', price: '400', image: '/dest-jeddah.jpg', region: 'levant' },
  { city: 'البتراء', country: 'JO', price: '420', image: '/dest-abha.jpg', region: 'levant' },
  // ─── سوريا ───
  { city: 'دمشق', country: 'SY', price: '460', image: '/dest-riyadh.jpg', region: 'levant' },
  // ─── لبنان ───
  { city: 'بيروت', country: 'LB', price: '520', image: '/dest-dammam.jpg', region: 'levant' },
  // ─── العراق ───
  { city: 'بغداد', country: 'IQ', price: '340', image: '/dest-jeddah.jpg', region: 'levant' },
  // ─── ليبيا ───
  { city: 'طرابلس', country: 'LY', price: '580', image: '/dest-riyadh.jpg', region: 'north-africa' },
  // ─── تونس ───
  { city: 'تونس', country: 'TN', price: '300', image: '/dest-abha.jpg', region: 'north-africa' },
  // ─── الجزائر ───
  { city: 'الجزائر العاصمة', country: 'DZ', price: '240', image: '/dest-dammam.jpg', region: 'north-africa' },
  // ─── المغرب ───
  { city: 'الرباط', country: 'MA', price: '440', image: '/dest-jeddah.jpg', region: 'north-africa' },
  { city: 'الدار البيضاء', country: 'MA', price: '440', image: '/dest-riyadh.jpg', region: 'north-africa' },
  { city: 'مراكش', country: 'MA', price: '460', image: '/dest-abha.jpg', region: 'north-africa' },
  // ─── السودان ───
  { city: 'الخرطوم', country: 'SD', price: '200', image: '/dest-dammam.jpg', region: 'africa' },
];

const regionTabs: { id: Region; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'gcc', label: 'الخليج' },
  { id: 'levant', label: 'بلاد الشام' },
  { id: 'egypt', label: 'مصر' },
  { id: 'north-africa', label: 'شمال إفريقيا' },
  { id: 'africa', label: 'إفريقيا' },
];

const DestinationsSection: React.FC = () => {
  const navigate = useNavigate();
  const [activeRegion, setActiveRegion] = useState<Region>('all');

  const filtered = activeRegion === 'all' ? destinations : destinations.filter(d => d.region === activeRegion);

  const sectionRef = useScrollAnimation<HTMLElement>({
    childSelector: '.destination-card',
    stagger: 0.08,
    y: 30,
  });

  return (
    <section ref={sectionRef} className="py-16 md:py-20 bg-white">
      <div className="max-w-content mx-auto container-padding">
        <SectionHeader
          eyebrow="وجهاتنا الدولية"
          title="نقل بري يربط جميع الدول العربية"
        />

        {/* Region Filters */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {regionTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveRegion(tab.id)}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                activeRegion === tab.id
                  ? 'bg-brand-gold text-white shadow-lg'
                  : 'bg-[#F0EDE4] text-[#8A7E6B] hover:bg-[#E5E0D5]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filtered.map((dest, index) => (
            <div
              key={index}
              className="destination-card group relative rounded-2xl overflow-hidden aspect-[3/4] cursor-pointer"
              onClick={() => navigate(`/?from=الرياض&to=${encodeURIComponent(dest.city)}`)}
            >
              {/* Image */}
              <img
                src={dest.image}
                alt={dest.city}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/20 to-transparent group-hover:from-charcoal/75 transition-all duration-300" />

              {/* Flag Badge */}
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 text-sm font-bold shadow-md">
                {countryFlags[dest.country] || '🌍'} {countryNames[dest.country] || dest.country}
              </div>

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="text-2xl font-bold text-white mb-1">
                  {dest.city}
                </h3>
                <p className="text-brand-gold-light text-sm mb-4">
                  ابتداء من {dest.price} ر.س
                </p>
                <button className="px-5 py-2 border border-white text-white rounded-full text-sm font-medium hover:bg-white hover:text-charcoal transition-all duration-200">
                  احجز الآن
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DestinationsSection;
