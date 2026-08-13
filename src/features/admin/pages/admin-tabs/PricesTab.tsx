import React, { useEffect, useState } from 'react';
import { DollarSign, Edit3, RotateCcw, Save, Search } from 'lucide-react';
import { trpc } from '@/providers/trpc';

interface RoutePriceOverride {
  from: string;
  to: string;
  economy?: number;
  business?: number;
  vip?: number;
}

interface PricingSettings {
  globalMin: number;
  globalMax: number;
  vipMultiplier: number;
  businessMultiplier: number;
  overrides: RoutePriceOverride[];
}

function getDefaultPricing(): PricingSettings {
  return { globalMin: 40, globalMax: 160, businessMultiplier: 1.2, vipMultiplier: 2, overrides: [] };
}

export default function PricesTab() {
  const utils = trpc.useUtils();
  const { data: priceCatalog = [] } = trpc.prices.catalog.useQuery();
  const { data: dbSettings } = trpc.settings.list.useQuery();
  const upsertSetting = trpc.settings.upsert.useMutation({ onSuccess: () => utils.settings.list.invalidate() });
  const invalidatePrices = async () => Promise.all([utils.prices.list.invalidate(), utils.prices.catalog.invalidate()]);
  const upsertPriceMutation = trpc.prices.upsert.useMutation({ onSuccess: invalidatePrices });
  const deletePriceMutation = trpc.prices.delete.useMutation({ onSuccess: invalidatePrices });
  const resetPricesMutation = trpc.prices.reset.useMutation({ onSuccess: invalidatePrices });

  const [settings, setSettings] = useState<PricingSettings>(getDefaultPricing);
  const [search, setSearch] = useState('');
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ economy: string; business: string; vip: string }>({ economy: '', business: '', vip: '' });

  useEffect(() => {
    if (!dbSettings?.pricingSettings) return;
    try {
      const stored = { ...getDefaultPricing(), ...JSON.parse(dbSettings.pricingSettings) };
      setSettings(stored);
    } catch { /* keep safe defaults */ }
  }, [dbSettings?.pricingSettings]);

  const computedPrices = priceCatalog.map(p => ({ ...p, isOverridden: !p.generated }));
  const filtered = computedPrices.filter(p => (p.fromCity + p.toCity).toLowerCase().includes(search.toLowerCase()));

  const handleSaveSettings = async () => {
    try {
      await upsertSetting.mutateAsync({ key: 'pricingSettings', value: JSON.stringify(settings) });
      await utils.prices.catalog.invalidate();
      alert('تم حفظ إعدادات التسعير بنجاح');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'تعذر حفظ إعدادات التسعير');
    }
  };

  const handleEditRow = (p: typeof computedPrices[0]) => {
    setEditingRow(p.id);
    setEditForm({ economy: String(p.economyPrice), business: String(p.businessPrice), vip: String(p.vipPrice) });
  };

  const handleSaveRow = (route: typeof computedPrices[0]) => {
    const eco = parseInt(editForm.economy, 10);
    const bus = parseInt(editForm.business, 10);
    const vip = parseInt(editForm.vip, 10);
    if (isNaN(eco) || isNaN(bus) || isNaN(vip)) return;
    upsertPriceMutation.mutate({ fromCity: route.fromCity, toCity: route.toCity, distance: route.distance, duration: route.duration, economyPrice: eco, businessPrice: bus, vipPrice: vip, borderCrossings: route.borderCrossings }, { onSuccess: () => setEditingRow(null), onError: error => alert(error.message || 'تعذر حفظ سعر المسار') });
  };

  const handleResetRow = (from: string, to: string) => {
    deletePriceMutation.mutate({ fromCity: from, toCity: to }, { onSuccess: () => setEditingRow(null), onError: error => alert(error.message || 'تعذر إعادة السعر التلقائي') });
  };

  const handleResetAll = async () => {
    if (confirm('هل أنت متأكد من إعادة جميع الأسعار للقيم الافتراضية؟')) {
      const defaults = getDefaultPricing();
      try {
        await upsertSetting.mutateAsync({ key: 'pricingSettings', value: JSON.stringify(defaults) });
        await resetPricesMutation.mutateAsync();
        setSettings(defaults);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'تعذر إعادة الأسعار الافتراضية');
      }
    }
  };

  const allEco = computedPrices.map(p => p.economyPrice);
  const minEco = Math.min(...allEco);
  const maxEco = Math.max(...allEco);
  const avgEco = Math.round(allEco.reduce((a, b) => a + b, 0) / allEco.length);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] p-5">
        <div className="flex items-center gap-3 mb-5"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C4A94D] to-[#B8983E] flex items-center justify-center"><DollarSign className="w-5 h-5 text-white" /></div><div className="flex-1"><h3 className="font-bold text-charcoal text-lg">إعدادات التسعير العامة</h3><p className="text-xs text-[#8A7E6B]">تحديد الحد الأدنى والأقصى للأسعار حسب المسافة</p></div><button onClick={handleResetAll} className="h-9 px-4 border border-red-200 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 transition-all">إعادة افتراضي</button></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div><label className="block text-xs font-bold text-charcoal mb-1.5">الحد الأدنى (اقتصادي)</label><div className="relative"><input type="number" min={20} max={200} value={settings.globalMin} onChange={e => setSettings(p => ({ ...p, globalMin: parseInt(e.target.value) || 40 }))} className="w-full h-11 px-4 pl-12 border border-[#E5E0D5] rounded-xl text-sm font-bold focus:outline-none focus:border-brand-gold bg-[#FCFBF9] text-charcoal" /><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B5AFA3] text-xs font-bold">ر.س</span></div></div>
          <div><label className="block text-xs font-bold text-charcoal mb-1.5">الحد الأقصى (اقتصادي)</label><div className="relative"><input type="number" min={100} max={500} value={settings.globalMax} onChange={e => setSettings(p => ({ ...p, globalMax: parseInt(e.target.value) || 160 }))} className="w-full h-11 px-4 pl-12 border border-[#E5E0D5] rounded-xl text-sm font-bold focus:outline-none focus:border-brand-gold bg-[#FCFBF9] text-charcoal" /><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B5AFA3] text-xs font-bold">ر.س</span></div></div>
          <div><label className="block text-xs font-bold text-charcoal mb-1.5">مضاعف الأعمال</label><div className="relative"><input type="number" min={0.1} max={3} step={0.05} value={settings.businessMultiplier} onChange={e => setSettings(p => ({ ...p, businessMultiplier: parseFloat(e.target.value) || 1.2 }))} className="w-full h-11 px-4 pl-8 border border-[#E5E0D5] rounded-xl text-sm font-bold focus:outline-none focus:border-brand-gold bg-[#FCFBF9] text-charcoal" /><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B5AFA3] text-xs font-bold">x</span></div></div>
          <div><label className="block text-xs font-bold text-charcoal mb-1.5">مضاعف VIP</label><div className="relative"><input type="number" min={0.1} max={5} step={0.05} value={settings.vipMultiplier} onChange={e => setSettings(p => ({ ...p, vipMultiplier: parseFloat(e.target.value) || 2 }))} className="w-full h-11 px-4 pl-8 border border-[#E5E0D5] rounded-xl text-sm font-bold focus:outline-none focus:border-brand-gold bg-[#FCFBF9] text-charcoal" /><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B5AFA3] text-xs font-bold">x</span></div></div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4"><div className="bg-green-50 rounded-xl p-3 text-center border border-green-100"><p className="text-xs text-green-600 font-bold">أقل سعر اقتصادي</p><p className="text-xl font-extrabold text-green-700">{minEco} <span className="text-xs">ر.س</span></p></div><div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100"><p className="text-xs text-blue-600 font-bold">متوسط السعر</p><p className="text-xl font-extrabold text-blue-700">{avgEco} <span className="text-xs">ر.س</span></p></div><div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-100"><p className="text-xs text-purple-600 font-bold">أعلى سعر اقتصادي</p><p className="text-xl font-extrabold text-purple-700">{maxEco} <span className="text-xs">ر.س</span></p></div></div>
        <div className="mt-4 flex justify-end"><button onClick={handleSaveSettings} className="h-11 px-8 bg-gradient-to-r from-[#C4A94D] to-[#B8983E] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"><Save className="w-4 h-4" /> حفظ إعدادات التسعير</button></div>
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] p-4"><div className="relative"><Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B5AFA3]" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في الوجهات..." className="w-full h-10 pr-9 pl-4 border border-[#E5E0D5] rounded-xl text-right text-sm bg-[#FCFBF9] focus:outline-none focus:border-brand-gold" /></div></div>

      <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] overflow-hidden">
        <div className="p-4 border-b border-[#E5E0D5] flex items-center justify-between"><h3 className="font-bold text-charcoal">أسعار الوجهات ({filtered.length})</h3><div className="flex items-center gap-3 text-xs text-[#8A7E6B]"><span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#C4A94D]/20 border border-[#C4A94D]" /> معدّل يدوياً</span><span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#E5E0D5]" /> تلقائي حسب المسافة</span></div></div>
        <div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead className="bg-[#F5F3EF] text-[#8A7E6B]"><tr><th className="px-4 py-3 font-bold">من</th><th className="px-4 py-3 font-bold">إلى</th><th className="px-4 py-3 font-bold">المسافة</th><th className="px-4 py-3 font-bold">اقتصادي</th><th className="px-4 py-3 font-bold">أعمال</th><th className="px-4 py-3 font-bold">VIP</th><th className="px-4 py-3 font-bold">إجراء</th></tr></thead><tbody>
          {filtered.map(p => (<tr key={p.id} className={`border-t border-[#E5E0D5] transition-colors ${p.isOverridden ? 'bg-[#C4A94D]/5' : 'hover:bg-[#F5F3EF]/50'}`}><td className="px-4 py-3 font-bold text-charcoal">{p.fromCity}</td><td className="px-4 py-3 font-bold text-charcoal">{p.toCity}</td><td className="px-4 py-3 text-[#8A7E6B] text-xs font-mono">{p.distance} كم</td>{editingRow === p.id ? <><td className="px-4 py-2"><input type="number" value={editForm.economy} onChange={e => setEditForm(f => ({ ...f, economy: e.target.value }))} className="w-20 h-8 px-2 border border-[#E5E0D5] rounded-lg text-center text-sm font-bold focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" /></td><td className="px-4 py-2"><input type="number" value={editForm.business} onChange={e => setEditForm(f => ({ ...f, business: e.target.value }))} className="w-20 h-8 px-2 border border-[#E5E0D5] rounded-lg text-center text-sm font-bold focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" /></td><td className="px-4 py-2"><input type="number" value={editForm.vip} onChange={e => setEditForm(f => ({ ...f, vip: e.target.value }))} className="w-20 h-8 px-2 border border-[#E5E0D5] rounded-lg text-center text-sm font-bold focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" /></td><td className="px-4 py-2"><div className="flex items-center gap-1"><button onClick={() => handleSaveRow(p)} className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"><Save className="w-3.5 h-3.5" /></button><button onClick={() => handleResetRow(p.fromCity, p.toCity)} className="p-1.5 bg-red-100 text-red-500 rounded-lg hover:bg-red-200 transition-colors" title="إلغاء التعديل وإعادة التلقائي"><RotateCcw className="w-3.5 h-3.5" /></button></div></td></> : <><td className="px-4 py-3"><div className="flex items-center gap-2">{p.isOverridden && <div className="w-2 h-2 rounded-full bg-[#C4A94D]" title="معدّل يدوياً" />}<span className="text-brand-gold font-bold">{p.economyPrice} ر.س</span></div></td><td className="px-4 py-3 text-blue-600 font-bold">{p.businessPrice} ر.س</td><td className="px-4 py-3 text-purple-600 font-bold">{p.vipPrice} ر.س</td><td className="px-4 py-3"><button onClick={() => handleEditRow(p)} className="p-2 text-[#8A7E6B] hover:bg-brand-gold/10 hover:text-brand-gold rounded-lg transition-colors"><Edit3 className="w-4 h-4" /></button></td></>}</tr>))}
        </tbody></table></div>
      </div>
    </div>
  );
}
