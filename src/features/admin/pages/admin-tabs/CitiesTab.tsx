import React, { useState } from 'react';
import { MapPin, Plus, Search, Trash2 } from 'lucide-react';
import { trpc } from '@/providers/trpc';

export default function CitiesTab() {
  const utils = trpc.useUtils();
  const { data: cities = [] } = trpc.cities.list.useQuery();
  const createCity = trpc.cities.create.useMutation({ onSuccess: () => utils.cities.list.invalidate() });
  const deleteCity = trpc.cities.delete.useMutation({ onSuccess: () => utils.cities.list.invalidate() });
  const [newCity, setNewCity] = useState({ name: '', region: '', country: 'السعودية', lat: '', lng: '' });
  const [search, setSearch] = useState('');

  const handleAdd = async () => {
    const lat = Number(newCity.lat);
    const lng = Number(newCity.lng);
    if (!newCity.name.trim() || newCity.lat.trim() === '' || newCity.lng.trim() === '' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      alert('يرجى إدخال اسم المدينة وخط العرض وخط الطول بصورة صحيحة');
      return;
    }
    try {
      await createCity.mutateAsync({ name: newCity.name.trim(), region: newCity.region.trim(), country: newCity.country.trim() || 'السعودية', lat, lng });
      setNewCity({ name: '', region: '', country: 'السعودية', lat: '', lng: '' });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'تعذر إضافة المدينة');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذه المدينة؟')) {
      try {
        await deleteCity.mutateAsync({ id });
      } catch (error) {
        alert(error instanceof Error ? error.message : 'تعذر حذف المدينة');
      }
    }
  };

  const filtered = cities.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] p-5">
        <h3 className="font-bold text-charcoal mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-brand-gold" /> إضافة مدينة جديدة</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input value={newCity.name} onChange={e => setNewCity(p => ({ ...p, name: e.target.value }))} placeholder="اسم المدينة" className="h-12 px-4 border border-[#E5E0D5] rounded-xl text-right focus:outline-none focus:border-brand-gold text-sm bg-[#FCFBF9]" />
          <input value={newCity.region} onChange={e => setNewCity(p => ({ ...p, region: e.target.value }))} placeholder="المنطقة" className="h-12 px-4 border border-[#E5E0D5] rounded-xl text-right focus:outline-none focus:border-brand-gold text-sm bg-[#FCFBF9]" />
          <input value={newCity.country} onChange={e => setNewCity(p => ({ ...p, country: e.target.value }))} placeholder="الدولة" className="h-12 px-4 border border-[#E5E0D5] rounded-xl text-right focus:outline-none focus:border-brand-gold text-sm bg-[#FCFBF9]" />
          <input value={newCity.lat} onChange={e => setNewCity(p => ({ ...p, lat: e.target.value }))} placeholder="خط العرض 24.7136" inputMode="decimal" dir="ltr" className="h-12 px-4 border border-[#E5E0D5] rounded-xl text-left focus:outline-none focus:border-brand-gold text-sm bg-[#FCFBF9]" />
          <input value={newCity.lng} onChange={e => setNewCity(p => ({ ...p, lng: e.target.value }))} placeholder="خط الطول 46.6753" inputMode="decimal" dir="ltr" className="h-12 px-4 border border-[#E5E0D5] rounded-xl text-left focus:outline-none focus:border-brand-gold text-sm bg-[#FCFBF9]" onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          <div className="sm:col-span-2 lg:col-span-5 flex justify-end"><button onClick={handleAdd} className="h-12 px-6 gold-gradient text-white font-bold rounded-xl hover:shadow-lg transition-all flex items-center gap-2 shadow-md"><Plus className="w-4 h-4" /> إضافة</button></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] overflow-hidden">
        <div className="p-4 border-b border-[#E5E0D5] flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-bold text-charcoal">المدن ({filtered.length})</h3>
          <div className="relative flex-1 max-w-xs"><Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B5AFA3]" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="w-full h-9 pr-9 pl-4 border border-[#E5E0D5] rounded-xl text-right text-sm bg-[#FCFBF9]" /></div>
        </div>
        <div className="divide-y divide-[#E5E0D5]">
          {filtered.map(city => (
            <div key={city.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-[#F5F3EF]/50 transition-colors">
              <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-brand-gold/10 flex items-center justify-center"><MapPin className="w-4 h-4 text-brand-gold" /></div><div><span className="text-charcoal font-bold text-sm">{city.name}</span><span className="block text-[10px] text-[#8A7E6B]">{[city.region, city.country].filter(Boolean).join(' — ')} · {city.lat.toFixed(4)}, {city.lng.toFixed(4)}</span></div></div>
              <button onClick={() => handleDelete(city.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
