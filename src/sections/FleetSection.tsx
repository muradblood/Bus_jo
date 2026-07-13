import React, { useState } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Star, Users, Tv, Wifi, Coffee, Armchair, Snowflake, Plug, Luggage } from 'lucide-react';

type FilterType = 'all' | 'vip' | 'standard';

interface FleetImage {
  id: number;
  src: string;
  alt: string;
  category: FilterType;
  title: string;
}

const fleetImages: FleetImage[] = [
  { id: 1, src: '/fleet/vip-1.jpg', alt: 'VIP Bus Exterior', category: 'vip', title: 'باص VIP - الخارج' },
  { id: 2, src: '/fleet/vip-2.jpg', alt: 'VIP Bus Interior - Entertainment', category: 'vip', title: 'VIP - مقاعد مع شاشات ترفيه' },
  { id: 3, src: '/fleet/vip-3.jpg', alt: 'VIP Bus Interior - Luxury Seats', category: 'vip', title: 'VIP - مقاعد جلدية فاخرة' },
  { id: 4, src: '/fleet/standard-1.jpg', alt: 'Standard Bus Exterior', category: 'standard', title: 'باص عادي - الخارج' },
  { id: 5, src: '/fleet/standard-2.jpg', alt: 'Standard Bus Interior', category: 'standard', title: 'عادي - مقاعد مريحة' },
  { id: 6, src: '/fleet/standard-3.jpg', alt: 'Standard Bus Seats', category: 'standard', title: 'عادي - مقاعد بمساند رأس' },
];

const vipFeatures = [
  { icon: Armchair, label: 'مقاعد جلدية فاخرة قابلة للإمالة' },
  { icon: Tv, label: 'شاشة ترفيهية فردية لكل مقعد' },
  { icon: Wifi, label: 'Wi-Fi مجاني عالي السرعة' },
  { icon: Coffee, label: 'مشروبات ووجبات خفيفة مجانية' },
  { icon: Snowflake, label: 'تكييف هواء ممتاز' },
  { icon: Plug, label: 'منفذ USB لشحن الأجهزة' },
  { icon: Luggage, label: 'مساحة واسعة للأمتعة' },
  { icon: Star, label: 'خدمة مضيف على متن الرحلة' },
];

const standardFeatures = [
  { icon: Armchair, label: 'مقاعد مريحة قابلة للإمالة' },
  { icon: Snowflake, label: 'تكييف هواء' },
  { icon: Wifi, label: 'Wi-Fi مجاني' },
  { icon: Plug, label: 'منفذ USB للشحن' },
  { icon: Luggage, label: 'مساحة للأمتعة' },
  { icon: Users, label: '49 مقعد (2+2)' },
];

const FleetSection: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filteredImages = activeFilter === 'all'
    ? fleetImages
    : fleetImages.filter(img => img.category === activeFilter);

  const sectionRef = useScrollAnimation<HTMLElement>({
    childSelector: '.fleet-card',
    stagger: 0.1,
    y: 20,
  });

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'الكل' },
    { key: 'vip', label: 'VIP' },
    { key: 'standard', label: 'عادي' },
  ];

  return (
    <section id="fleet" ref={sectionRef} className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-charcoal mb-3">أسطولنا</h2>
          <p className="text-[#8A7E6B] text-base max-w-xl mx-auto">
            نقدم لكم أسطولاً حديثاً ومتنوعاً من الباصات يلبي جميع احتياجات سفركم
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex justify-center gap-3 mb-10">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                activeFilter === f.key
                  ? 'bg-brand-gold text-white shadow-lg shadow-brand-gold/25'
                  : 'bg-[#F0EDE4] text-[#8A7E6B] hover:bg-[#E5E0D5]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Photo Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
          {filteredImages.map((img) => (
            <div
              key={img.id}
              className="fleet-card group relative rounded-2xl overflow-hidden aspect-[4/3] cursor-pointer"
            >
              <img
                src={img.src}
                alt={img.alt}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full text-white mb-2 inline-block ${
                  img.category === 'vip' ? 'bg-purple-500' : 'bg-blue-500'
                }`}>
                  {img.category === 'vip' ? 'VIP' : 'عادي'}
                </span>
                <h4 className="text-white font-bold text-sm">{img.title}</h4>
              </div>
            </div>
          ))}
        </div>

        {/* VIP Features Section */}
        {(activeFilter === 'all' || activeFilter === 'vip') && (
          <div className="mb-12 bg-gradient-to-br from-[#1a2a6c] to-[#2d5a87] rounded-3xl p-8 md:p-10 text-white">
            <div className="flex items-center gap-3 mb-6">
              <Star className="w-6 h-6 text-brand-gold" />
              <h3 className="text-xl md:text-2xl font-bold">باص VIP - تجربة سفر فاخرة</h3>
            </div>
            <p className="text-white/70 mb-8 text-sm leading-relaxed max-w-3xl">
              باصات VIP مخصصة للمسافرين الباحثين عن الراحة والفخامة. مقاعد جلدية فاخرة قابلة للإمالة بالكامل، 
              شاشات ترفيهية فردية، وخدمة مضيف على متن الرحلة. 21 مقعد فقط (تكوين 1+2) لضمان أقصى قدر من الراحة والخصوصية.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {vipFeatures.map((f, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
                  <f.icon className="w-5 h-5 text-brand-gold flex-shrink-0" />
                  <span className="text-sm font-medium">{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Standard Features Section */}
        {(activeFilter === 'all' || activeFilter === 'standard') && (
          <div className="bg-[#F8F6F2] rounded-3xl p-8 md:p-10">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-6 h-6 text-brand-gold" />
              <h3 className="text-xl md:text-2xl font-bold text-charcoal">باص عادي - رحلة مريحة بأسعار اقتصادية</h3>
            </div>
            <p className="text-[#8A7E6B] mb-8 text-sm leading-relaxed max-w-3xl">
              باصات عالية الجودة توفر رحلة مريحة وآمنة بأسعار مناسبة. 49 مقعد بتكوين (2+2) مع جميع وسائل الراحة الأساسية 
              مثل تكييف الهواء وشبكة Wi-Fi المجانية ومنافذ USB للشحن.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {standardFeatures.map((f, i) => (
                <div key={i} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm">
                  <f.icon className="w-5 h-5 text-brand-gold flex-shrink-0" />
                  <span className="text-sm font-medium text-charcoal">{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default FleetSection;
