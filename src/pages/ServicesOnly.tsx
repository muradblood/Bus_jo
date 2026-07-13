import React from 'react';
import { useNavigate } from 'react-router';
import {
  Shield, Bus, Wifi, Coffee, Armchair, MonitorSmartphone,
  ArrowLeft, Clock, Phone, Headphones,
  CreditCard, Baby, Accessibility, Luggage,
  Globe, Ban,
} from 'lucide-react';
import NavigationHeader from '@/components/NavigationHeader';
import Footer from '@/components/Footer';
import CookieConsentBanner from '@/components/CookieConsentBanner';
import { getStoredSettings } from '@/hooks/useGeoBlock';

const ServicesOnly: React.FC = () => {
  const navigate = useNavigate();
  const geoSettings = getStoredSettings();

  const services = [
    {
      icon: Bus,
      title: 'نقل داخلي مريح',
      description: 'أكثر من 50 وجهة داخل المملكة العربية السعودية ودول الخليج العربي',
      color: 'bg-blue-500',
    },
    {
      icon: Armchair,
      title: 'مقاعد مريحة وواسعة',
      description: 'مقاعد VIP وأعمال مع مساحة واسعة للرجلين وإمكانية الإستلقاء',
      color: 'bg-purple-500',
    },
    {
      icon: Wifi,
      title: 'واي فاي مجاني',
      description: 'اتصال إنترنت مجاني عالي السرعة على متن جميع الحافلات',
      color: 'bg-sky-500',
    },
    {
      icon: Coffee,
      title: 'مشروبات ومأكولات',
      description: 'خدمة ضيافة متميزة مع مشروبات باردة وساخنة ووجبات خفيفة',
      color: 'bg-amber-500',
    },
    {
      icon: MonitorSmartphone,
      title: 'شاشات ترفيه',
      description: 'شاشات فردية مع أفلام ومسلسلات وقنوات تلفزيونية متنوعة',
      color: 'bg-emerald-500',
    },
    {
      icon: Shield,
      title: 'أمان وسلامة',
      description: 'أعلى معايير السلامة مع سائقين محترفين ورحلات آمنة ومؤمنة',
      color: 'bg-red-500',
    },
    {
      icon: Baby,
      title: 'خدمة الأطفال',
      description: 'مقاعد مخصصة للأطفال وخصومات تصل إلى 50% على تذاكر الأطفال',
      color: 'bg-pink-500',
    },
    {
      icon: Accessibility,
      title: 'ذوي الاحتياجات الخاصة',
      description: 'مركبات مجهزة بالكامل وخصومات 20% لذوي الاحتياجات الخاصة',
      color: 'bg-teal-500',
    },
    {
      icon: Luggage,
      title: 'أمتعة مجانية',
      description: 'حقيبتين وزن 25 كجم لكل مسافر بالإضافة إلى حقيبة يد صغيرة',
      color: 'bg-orange-500',
    },
  ];

  const routes = [
    { from: 'الرياض', to: 'جدة', time: '10-12 ساعة', price: 'من 130 ر.س' },
    { from: 'الرياض', to: 'مكة المكرمة', time: '9-11 ساعة', price: 'من 120 ر.س' },
    { from: 'الرياض', to: 'الدمام', time: '4-5 ساعات', price: 'من 95 ر.س' },
    { from: 'جدة', to: 'مكة المكرمة', time: '1-2 ساعة', price: 'من 65 ر.س' },
    { from: 'جدة', to: 'أبها', time: '12-14 ساعة', price: 'من 155 ر.س' },
    { from: 'الدمام', to: 'الرياض', time: '4-5 ساعات', price: 'من 100 ر.س' },
  ];

  return (
    <div className="min-h-screen bg-surface-alt" dir="rtl" lang="ar">
      <NavigationHeader />

      {/* Hero */}
      <div className="relative bg-charcoal py-16 md:py-24 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: 'url(/hero-bus-new.jpg)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/80 to-transparent" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5 mb-4">
            <Shield className="w-4 h-4 text-brand-gold" />
            <span className="text-white/90 text-xs font-medium">خدمة متميزة من سات</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight mb-4">
            خدمات <span className="text-brand-gold-light">سات</span> للنقل
          </h1>
          <p className="text-white/70 text-sm md:text-lg max-w-2xl mx-auto leading-relaxed mb-6">
            نقدم خدمات نقل راقية ومريحة بين مدن المملكة ودول الخليج العربي، مع أعلى معايير الجودة والأمان
          </p>
        </div>
      </div>

      {/* Geo Block Message (from admin settings) */}
      {geoSettings.enabled && geoSettings.showMessage && (
        <div className="max-w-7xl mx-auto px-4 pt-6">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <Ban className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800 mb-0.5">الحجز غير متاح في منطقتك</p>
              <p className="text-xs text-amber-700 leading-relaxed">{geoSettings.showMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Services Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-charcoal mb-3">
            خدماتنا المتميزة
          </h2>
          <p className="text-text-secondary text-sm max-w-lg mx-auto">
            نقدم مجموعة واسعة من الخدمات لجعل رحلتك مريحة وآمنة
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {services.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.title}
                className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] p-6 hover:shadow-lg transition-all group"
              >
                <div className={`w-14 h-14 ${s.color} rounded-2xl flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-extrabold text-charcoal text-lg mb-2">{s.title}</h3>
                <p className="text-[#8A7E6B] text-sm leading-relaxed">{s.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Popular Routes */}
      <div className="bg-white py-12 md:py-16 border-y border-[#E5E0D5]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-charcoal mb-3">
              أشهر الرحلات
            </h2>
            <p className="text-text-secondary text-sm max-w-lg mx-auto">
              اكتشف أشهر الوجهات والمسارات التي نخدمها
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {routes.map((route, i) => (
              <div
                key={i}
                className="bg-surface-alt rounded-2xl p-5 border border-[#E5E0D5] flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-gold/10 flex items-center justify-center shrink-0">
                  <Bus className="w-6 h-6 text-brand-gold" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-charcoal">{route.from}</span>
                    <span className="text-[#B5AFA3]">←</span>
                    <span className="font-bold text-charcoal">{route.to}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#8A7E6B]">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{route.time}</span>
                    <span className="font-bold text-brand-gold">{route.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="bg-charcoal rounded-3xl p-8 md:p-12 text-center">
          <Headphones className="w-16 h-16 text-brand-gold mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">
            هل تحتاج إلى مساعدة؟
          </h2>
          <p className="text-white/60 text-sm md:text-base max-w-lg mx-auto mb-8">
            فريق خدمة العملاء متاح على مدار الساعة لمساعدتك والإجابة على استفساراتك
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-5 py-3">
              <Phone className="w-5 h-5 text-brand-gold" />
              <span className="text-white font-bold" dir="ltr">920018221</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-5 py-3">
              <CreditCard className="w-5 h-5 text-brand-gold" />
              <span className="text-white font-bold">واتساب: +966920018221</span>
            </div>
          </div>
        </div>
      </div>

      {/* Back to Home */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <button
          onClick={() => navigate('/')}
          className="w-full h-14 bg-white border border-[#E5E0D5] text-charcoal font-bold rounded-2xl hover:bg-[#F8F6F2] transition-all flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          العودة للصفحة الرئيسية
        </button>
      </div>

      <Footer />
      <CookieConsentBanner />
    </div>
  );
};

export default ServicesOnly;
