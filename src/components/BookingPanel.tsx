import React, { useState, useRef, useEffect } from 'react';
import { internationalCities, getRegionsWithCities } from '@/lib/international-data';
import DatePicker from './DatePicker';
import { MapPin, Users, ChevronDown, Ticket, Search, Info, Minus, Plus } from 'lucide-react';

type TripType = 'one-way' | 'round-trip';

export interface BookingData {
  tripType: TripType;
  from: string;
  to: string;
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;
  passengers: number;
  adults: number;
  children: number;
  infants: number;
  ticketType: string;
}

interface BookingPanelProps {
  onSearch?: (data: BookingData) => void;
}

const BookingPanel: React.FC<BookingPanelProps> = ({ onSearch }) => {
  const [tripType, setTripType] = useState<TripType>('one-way');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [showPassengerModal, setShowPassengerModal] = useState(false);
  const [ticketType, setTicketType] = useState('');

  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [showTicketDropdown, setShowTicketDropdown] = useState(false);
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');

  const fromRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);
  const ticketRef = useRef<HTMLDivElement>(null);
  const passengerModalRef = useRef<HTMLDivElement>(null);

  const allCities = internationalCities.map(c => c.name);
  const citiesByRegion = getRegionsWithCities();

  const regionOrder = [
    'الرياض', 'مكة المكرمة', 'المدينة المنورة', 'الشرقية',
    'القصيم', 'عسير', 'تبوك', 'حائل', 'الجوف',
    'الحدود الشمالية', 'نجران', 'الباحة', 'جازان',
  ];

  const ticketTypes = ['اقتصادية', 'مريحة', 'عملية', 'VIP'];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (fromRef.current && !fromRef.current.contains(e.target as Node)) setShowFromDropdown(false);
      if (toRef.current && !toRef.current.contains(e.target as Node)) setShowToDropdown(false);
      if (ticketRef.current && !ticketRef.current.contains(e.target as Node)) setShowTicketDropdown(false);
      if (passengerModalRef.current && !passengerModalRef.current.contains(e.target as Node)) setShowPassengerModal(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const totalPassengers = adults + children + infants;
  const handleAdultChange = (delta: number) => setAdults(prev => Math.max(1, Math.min(8, prev + delta)));
  const handleChildChange = (delta: number) => setChildren(prev => Math.max(0, Math.min(6, prev + delta)));
  const handleInfantChange = (delta: number) => setInfants(prev => Math.max(0, Math.min(4, prev + delta)));
  const getPassengerLabel = () => {
    const parts = [];
    if (adults > 0) parts.push(`${adults} بالغ`);
    if (children > 0) parts.push(`${children} طفل`);
    if (infants > 0) parts.push(`${infants} رضيع`);
    return parts.join('، ');
  };

  const cityList = allCities;
  const filteredFrom = cityList.filter(c => c.toLowerCase().includes(fromFilter.toLowerCase()) && c !== to);
  const filteredTo = cityList.filter(c => c.toLowerCase().includes(toFilter.toLowerCase()) && c !== from);

  const handleSwap = () => { const t = from; setFrom(to); setTo(t); };

  const handleSearch = () => {
    if (!from || !to || !pickupDate) return;
    onSearch?.({
      tripType, from, to, pickupDate, pickupTime: '',
      returnDate: tripType === 'round-trip' ? returnDate : '',
      returnTime: '', passengers: totalPassengers, adults, children, infants, ticketType,
    });
  };

  const isFormValid = from && to && pickupDate;

  return (
    <div className="bg-white rounded-3xl p-5 md:p-7 w-full">
      {/* ═══ Trip Type Toggle ═══ */}
      <div className="rounded-full border border-[#E5E0D5] p-1 flex mb-6 bg-white overflow-hidden">
        <button
          onClick={() => setTripType('round-trip')}
          className={`flex-1 py-3 px-2 rounded-full text-sm font-bold transition-all duration-300 flex flex-col items-center justify-center gap-0.5 ${
            tripType === 'round-trip' ? 'bg-[#C4A94D] text-white shadow-md' : 'text-[#8A7E6B] hover:text-charcoal bg-transparent'
          }`}
        >
          <span>ذهاب وعودة</span>
          {tripType === 'round-trip' && (
            <span className="bg-white/30 text-white text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1">
              خصم 15%
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </span>
          )}
        </button>
        <button
          onClick={() => setTripType('one-way')}
          className={`flex-1 py-3 px-4 rounded-full text-sm font-bold transition-all duration-300 ${
            tripType === 'one-way' ? 'bg-[#C4A94D] text-white shadow-md' : 'text-[#8A7E6B] hover:text-charcoal bg-transparent'
          }`}
        >
          ذهاب فقط
        </button>
      </div>

      {/* Heading */}
      <h2 className="text-xl md:text-2xl font-bold text-charcoal mb-5 text-right">
        اين تفضل الذهاب اليوم؟
      </h2>

      {/* ═══ Route Selector: dotted line + swap (left) | input fields (right) ═══ */}
      <div className="flex gap-2 mb-4">
        {/* ── Left: vertical dotted connector + swap button ── */}
        <div className="flex flex-col items-center pt-[34px] pb-[34px] shrink-0" style={{ width: '44px' }}>
          {/* Top dot */}
          <div className="w-[13px] h-[13px] rounded-full bg-[#2b2b2b] shrink-0" />
          {/* Dashed line - upper */}
          <div className="w-0 flex-1 border-l-2 border-dashed border-[#2b2b2b]" style={{ borderSpacing: '7px 4px' }} />
          {/* Swap button */}
          <button
            onClick={handleSwap}
            className="w-[44px] h-[44px] rounded-full bg-[#5BC0DE] text-white flex items-center justify-center hover:bg-[#4BA8C4] hover:rotate-180 transition-all duration-500 shadow-lg hover:shadow-xl shrink-0 my-1"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0-12l4 4m-4-4l-4 4" />
            </svg>
          </button>
          {/* Dashed line - lower */}
          <div className="w-0 flex-1 border-l-2 border-dashed border-[#2b2b2b]" />
          {/* Bottom dot */}
          <div className="w-[13px] h-[13px] rounded-full bg-[#2b2b2b] shrink-0" />
        </div>

        {/* ── Right: From / To input fields ── */}
        <div className="flex-1 min-w-0">
          {/* Departure Station */}
          <div className="mb-1">
            <label className="block text-sm font-bold text-charcoal mb-1.5 text-right">
              <span className="text-red-500 ml-1">*</span>محطة المغادرة
            </label>
            <div className="relative" ref={fromRef}>
              <div className="relative cursor-pointer" onClick={() => { setShowFromDropdown(true); setFromFilter(''); }}>
                <input
                  type="text"
                  value={from}
                  onChange={(e) => { setFrom(e.target.value); setFromFilter(e.target.value); setShowFromDropdown(true); }}
                  placeholder="محطة المغادرة"
                  className="w-full h-[48px] border border-[#E5E0D5] rounded-full text-right focus:outline-none focus:border-[#C4A94D] focus:ring-2 focus:ring-[#C4A94D]/15 transition-all text-charcoal placeholder:text-[#B5AFA3] text-sm bg-white pr-11 pl-4"
                />
                <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#C4A94D]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  <circle cx="12" cy="9" r="2.5" fill="white"/>
                </svg>
              </div>
              {showFromDropdown && (
                <div className="absolute z-30 top-full left-0 right-0 mt-2 bg-white border border-[#E5E0D5] rounded-2xl shadow-xl max-h-72 overflow-y-auto">
                  {fromFilter ? (
                    filteredFrom.length > 0 ? filteredFrom.map((city) => {
                      const cityInfo = internationalCities.find(c => c.name === city);
                      return (
                        <button key={city} className="w-full text-right px-5 py-3 hover:bg-[#F8F6F2] transition-colors text-sm text-charcoal flex items-center gap-3 border-b border-[#F0EDE4] last:border-0"
                          onClick={() => { setFrom(city); setShowFromDropdown(false); }}>
                          <MapPin className="w-4 h-4 text-[#C4A94D] flex-shrink-0" />
                          <span className="flex-1">{city}</span>
                          {cityInfo && <span className="text-[10px] text-[#B5AFA3] bg-[#F5F3EF] px-2 py-0.5 rounded-full">{cityInfo.region}</span>}
                        </button>
                      );
                    }) : <div className="px-5 py-4 text-sm text-[#B5AFA3] text-center">لا توجد نتائج</div>
                  ) : (
                    regionOrder.map(region => {
                      const groupCities = (citiesByRegion[region] || []).filter(c => c !== to);
                      if (groupCities.length === 0) return null;
                      return (
                        <div key={region}>
                          <div className="px-4 py-2 bg-[#F5F3EF] text-[10px] font-bold text-[#8A7E6B] uppercase tracking-wider">{region}</div>
                          {groupCities.map(city => {
                            const cityInfo = internationalCities.find(c => c.name === city);
                            return (
                              <button key={city} className="w-full text-right px-5 py-2.5 hover:bg-[#F8F6F2] transition-colors text-sm text-charcoal flex items-center gap-3 border-b border-[#F0EDE4] last:border-0"
                                onClick={() => { setFrom(city); setShowFromDropdown(false); }}>
                                <MapPin className="w-4 h-4 text-[#C4A94D] flex-shrink-0" />
                                <span className="flex-1">{city}</span>
                                {cityInfo && <span className="text-[10px] text-[#B5AFA3] bg-[#F5F3EF] px-2 py-0.5 rounded-full">{cityInfo.region}</span>}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Spacer for swap button */}
          <div className="h-[46px]" />

          {/* Arrival Station */}
          <div>
            <label className="block text-sm font-bold text-charcoal mb-1.5 text-right">
              <span className="text-red-500 ml-1">*</span>محطة الوصول
            </label>
            <div className="relative" ref={toRef}>
              <div className="relative cursor-pointer" onClick={() => { setShowToDropdown(true); setToFilter(''); }}>
                <input
                  type="text"
                  value={to}
                  onChange={(e) => { setTo(e.target.value); setToFilter(e.target.value); setShowToDropdown(true); }}
                  placeholder="محطة الوصول"
                  className="w-full h-[48px] border border-[#E5E0D5] rounded-full text-right focus:outline-none focus:border-[#C4A94D] focus:ring-2 focus:ring-[#C4A94D]/15 transition-all text-charcoal placeholder:text-[#B5AFA3] text-sm bg-white pr-11 pl-4"
                />
                <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#C4A94D]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  <circle cx="12" cy="9" r="2.5" fill="white"/>
                </svg>
              </div>
              {showToDropdown && (
                <div className="absolute z-30 top-full left-0 right-0 mt-2 bg-white border border-[#E5E0D5] rounded-2xl shadow-xl max-h-72 overflow-y-auto">
                  {toFilter ? (
                    filteredTo.length > 0 ? filteredTo.map((city) => {
                      const cityInfo = internationalCities.find(c => c.name === city);
                      return (
                        <button key={city} className="w-full text-right px-5 py-3 hover:bg-[#F8F6F2] transition-colors text-sm text-charcoal flex items-center gap-3 border-b border-[#F0EDE4] last:border-0"
                          onClick={() => { setTo(city); setShowToDropdown(false); }}>
                          <MapPin className="w-4 h-4 text-[#C4A94D] flex-shrink-0" />
                          <span className="flex-1">{city}</span>
                          {cityInfo && <span className="text-[10px] text-[#B5AFA3] bg-[#F5F3EF] px-2 py-0.5 rounded-full">{cityInfo.region}</span>}
                        </button>
                      );
                    }) : <div className="px-5 py-4 text-sm text-[#B5AFA3] text-center">لا توجد نتائج</div>
                  ) : (
                    regionOrder.map(region => {
                      const groupCities = (citiesByRegion[region] || []).filter(c => c !== from);
                      if (groupCities.length === 0) return null;
                      return (
                        <div key={region}>
                          <div className="px-4 py-2 bg-[#F5F3EF] text-[10px] font-bold text-[#8A7E6B] uppercase tracking-wider">{region}</div>
                          {groupCities.map(city => {
                            const cityInfo = internationalCities.find(c => c.name === city);
                            return (
                              <button key={city} className="w-full text-right px-5 py-2.5 hover:bg-[#F8F6F2] transition-colors text-sm text-charcoal flex items-center gap-3 border-b border-[#F0EDE4] last:border-0"
                                onClick={() => { setTo(city); setShowToDropdown(false); }}>
                                <MapPin className="w-4 h-4 text-[#C4A94D] flex-shrink-0" />
                                <span className="flex-1">{city}</span>
                                {cityInfo && <span className="text-[10px] text-[#B5AFA3] bg-[#F5F3EF] px-2 py-0.5 rounded-full">{cityInfo.region}</span>}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Departure Date ═══ */}
      <div className="mb-4">
        <DatePicker value={pickupDate} onChange={setPickupDate} label="موعد المغادرة" placeholder="اختر تاريخ المغادرة" required />
      </div>

      {/* ═══ Return Date ═══ */}
      {tripType === 'round-trip' && (
        <div className="mb-4 animate-fade-in">
          <DatePicker value={returnDate} onChange={setReturnDate} label="موعد العودة" placeholder="اختر تاريخ العودة" required />
        </div>
      )}

      {/* ═══ Passengers ═══ */}
      <div className="mb-4 relative" ref={passengerModalRef}>
        <label className="block text-sm font-bold text-charcoal mb-2 text-right">
          <span className="text-red-500 ml-1">*</span>المسافرين
        </label>
        <button
          onClick={() => setShowPassengerModal(!showPassengerModal)}
          className="w-full h-[56px] px-5 pr-14 border border-[#E5E0D5] rounded-2xl text-right focus:outline-none focus:border-[#C4A94D] focus:ring-2 focus:ring-[#C4A94D]/15 transition-all text-charcoal bg-[#FCFBF9] hover:bg-white text-base flex items-center justify-between relative"
        >
          <Users className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C4A94D]" />
          <span className="flex-1 text-right mr-8">{totalPassengers} مسافر ({getPassengerLabel()})</span>
          <ChevronDown className={`w-4 h-4 text-[#B5AFA3] transition-transform ${showPassengerModal ? 'rotate-180' : ''}`} />
        </button>
        {showPassengerModal && (
          <div className="absolute z-40 top-full left-0 right-0 mt-2 bg-white border border-[#E5E0D5] rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#C4A94D]/10 flex items-center justify-center">
                    <Info className="w-4 h-4 text-[#C4A94D]" />
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-charcoal text-sm">البالغين</p>
                    <p className="text-[10px] text-[#8A7E6B]">12+ سنة</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => handleAdultChange(-1)} disabled={adults <= 1}
                    className="w-9 h-9 rounded-full bg-[#C4A94D] text-white flex items-center justify-center disabled:bg-[#D5CFC5] disabled:cursor-not-allowed hover:bg-[#B8983E] transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-6 text-center font-bold text-lg text-charcoal">{adults}</span>
                  <button onClick={() => handleAdultChange(1)} disabled={adults >= 8}
                    className="w-9 h-9 rounded-full bg-[#C4A94D] text-white flex items-center justify-center disabled:bg-[#D5CFC5] disabled:cursor-not-allowed hover:bg-[#B8983E] transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-[#F0EDE4]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Info className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-charcoal text-sm">الأطفال</p>
                    <p className="text-[10px] text-green-600 font-bold">خصم 50%</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => handleChildChange(-1)} disabled={children <= 0}
                    className="w-9 h-9 rounded-full bg-[#C4A94D] text-white flex items-center justify-center disabled:bg-[#D5CFC5] disabled:cursor-not-allowed hover:bg-[#B8983E] transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-6 text-center font-bold text-lg text-charcoal">{children}</span>
                  <button onClick={() => handleChildChange(1)} disabled={children >= 6}
                    className="w-9 h-9 rounded-full bg-[#C4A94D] text-white flex items-center justify-center disabled:bg-[#D5CFC5] disabled:cursor-not-allowed hover:bg-[#B8983E] transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-[#F0EDE4]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                    <Info className="w-4 h-4 text-pink-500" />
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-charcoal text-sm">الرضع</p>
                    <p className="text-[10px] text-green-600 font-bold">خصم 75%</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => handleInfantChange(-1)} disabled={infants <= 0}
                    className="w-9 h-9 rounded-full bg-[#C4A94D] text-white flex items-center justify-center disabled:bg-[#D5CFC5] disabled:cursor-not-allowed hover:bg-[#B8983E] transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-6 text-center font-bold text-lg text-charcoal">{infants}</span>
                  <button onClick={() => handleInfantChange(1)} disabled={infants >= 4}
                    className="w-9 h-9 rounded-full bg-[#C4A94D] text-white flex items-center justify-center disabled:bg-[#D5CFC5] disabled:cursor-not-allowed hover:bg-[#B8983E] transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-3 border-t border-[#F0EDE4] bg-[#FAFAF8]">
              <button onClick={() => setShowPassengerModal(false)}
                className="w-full h-11 bg-gradient-to-r from-[#C4A94D] to-[#B8983E] text-white font-bold rounded-xl shadow-md transition-all hover:shadow-lg">
                تأكيد ({totalPassengers} مسافر)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Ticket Type ═══ */}
      <div className="mb-4">
        <label className="block text-sm font-bold text-charcoal mb-2 text-right">نوع التذكرة</label>
        <div className="relative" ref={ticketRef}>
          <div className="relative cursor-pointer" onClick={() => setShowTicketDropdown(!showTicketDropdown)}>
            <input type="text" value={ticketType} readOnly placeholder="اختر نوع التذكرة"
              className="w-full h-[56px] px-5 pr-14 border border-[#E5E0D5] rounded-2xl text-right focus:outline-none focus:border-[#C4A94D] focus:ring-2 focus:ring-[#C4A94D]/15 transition-all text-charcoal placeholder:text-[#B5AFA3] text-base bg-[#FCFBF9] hover:bg-white cursor-pointer" />
            <Ticket className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C4A94D]" />
            <ChevronDown className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B5AFA3]" />
          </div>
          {showTicketDropdown && (
            <div className="absolute z-30 top-full left-0 right-0 mt-2 bg-white border border-[#E5E0D5] rounded-2xl shadow-xl max-h-44 overflow-y-auto">
              {ticketTypes.map((type) => (
                <button key={type} className="w-full text-right px-5 py-3.5 hover:bg-[#F8F6F2] transition-colors text-sm text-charcoal border-b border-[#F0EDE4] last:border-0"
                  onClick={() => { setTicketType(type); setShowTicketDropdown(false); }}>
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Search Button ═══ */}
      <button onClick={handleSearch} disabled={!isFormValid}
        className={`w-full h-[56px] text-white font-bold rounded-2xl shadow-lg transition-all duration-300 flex items-center justify-center gap-3 text-lg ${
          isFormValid ? 'bg-gradient-to-r from-[#C4A94D] to-[#B8983E] hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]' : 'bg-[#D5CFC5] cursor-not-allowed shadow-none'
        }`}>
        <Search className="w-5 h-5" />
        بحث
      </button>

      {/* ═══ Feature Icons ═══ */}
      <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-[#E5E0D5]">
        <div className="flex flex-col items-center gap-2">
          <img src="/icon-bus.svg" alt="حجز التذاكر" className="w-14 h-14" />
          <span className="text-xs font-bold text-[#8A7E6B]">حجز التذاكر</span>
        </div>
        <div className="w-px h-12 bg-[#E5E0D5]" />
        <div className="flex flex-col items-center gap-2">
          <img src="/icon-calendar.svg" alt="إختار التاريخ والوقت" className="w-14 h-14" />
          <span className="text-xs font-bold text-[#8A7E6B]">إختار التاريخ والوقت</span>
        </div>
        <div className="w-px h-12 bg-[#E5E0D5]" />
        <div className="flex flex-col items-center gap-2">
          <img src="/icon-globe.svg" alt="الوجهة" className="w-14 h-14" />
          <span className="text-xs font-bold text-[#8A7E6B]">الوجهة</span>
        </div>
      </div>
    </div>
  );
};

export default BookingPanel;
