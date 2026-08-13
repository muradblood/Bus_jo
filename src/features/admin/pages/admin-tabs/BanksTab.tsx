import React, { useState } from 'react';
import { CreditCard, Edit3, Eye, Landmark, Lock, Plus, Save, Search, Shield, Trash2, X } from 'lucide-react';
import type { StoredBank } from '@/lib/bank-data';
import { trpc } from '@/providers/trpc';

export default function BanksTab() {
  const utils = trpc.useUtils();
  const { data: banksList = [] } = trpc.banks.list.useQuery();
  const invalidateBanks = async () => {
    await Promise.all([utils.banks.list.invalidate(), utils.banks.publicList.invalidate()]);
  };
  const createBank = trpc.banks.create.useMutation({ onSuccess: invalidateBanks });
  const updateBank = trpc.banks.update.useMutation({ onSuccess: invalidateBanks });
  const toggleBank = trpc.banks.toggle.useMutation({ onSuccess: invalidateBanks });
  const deleteBank = trpc.banks.delete.useMutation({ onSuccess: invalidateBanks });
  const [search, setSearch] = useState('');
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<StoredBank | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBank, setNewBank] = useState<StoredBank>({
    key: '', name: '', nameEn: '', color: '#1A3A5C', colorDark: '#0F2440', colorLight: '#EDF2F7',
    otpMessage: 'أدخل رمز التحقق المرسل إلى رقم جوالك', supportPhone: '', website: '', bins: '', logoUrl: '', enabled: true, type: 'bank',
  });

  const bankData = (bank: StoredBank) => ({
    type: bank.type ?? 'bank', name: bank.name, nameEn: bank.nameEn, color: bank.color, colorDark: bank.colorDark,
    colorLight: bank.colorLight, otpMessage: bank.otpMessage, supportPhone: bank.supportPhone, website: bank.website,
    bins: bank.bins, logoUrl: bank.logoUrl, enabled: bank.enabled,
  });

  const handleToggle = (key: string) => {
    const bank = banksList.find(item => item.key === key);
    if (!bank) return;
    toggleBank.mutate({ key, enabled: !bank.enabled }, { onError: error => alert(error.message || 'تعذر تحديث حالة البنك أو المحفظة') });
  };

  const handleSaveEdit = () => {
    if (!editForm || !editingKey) return;
    updateBank.mutate({ key: editingKey, data: bankData(editForm) }, { onSuccess: () => { setEditingKey(null); setEditForm(null); }, onError: error => alert(error.message || 'تعذر حفظ بيانات البنك أو المحفظة') });
  };

  const handleDelete = (key: string) => {
    if (confirm('هل أنت متأكد من حذف هذا البنك؟')) deleteBank.mutate({ key }, { onError: error => alert(error.message || 'تعذر حذف البنك أو المحفظة') });
  };

  const handleAddBank = () => {
    if (!newBank.key || !newBank.name) return;
    createBank.mutate({ key: newBank.key, ...bankData(newBank) }, {
      onSuccess: () => {
        setShowAddForm(false);
        setNewBank({ key: '', name: '', nameEn: '', color: '#1A3A5C', colorDark: '#0F2440', colorLight: '#EDF2F7', otpMessage: 'أدخل رمز التحقق المرسل إلى رقم جوالك', supportPhone: '', website: '', bins: '', logoUrl: '', enabled: true, type: 'bank' });
      },
      onError: error => alert(error.message || 'تعذر إضافة البنك أو المحفظة'),
    });
  };

  const handleLogoUpload = (isNew: boolean = false) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        if (isNew) setNewBank(prev => ({ ...prev, logoUrl: dataUrl }));
        else if (editForm) setEditForm(prev => prev ? { ...prev, logoUrl: dataUrl } : null);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const filtered = banksList.filter(b => (b.name + b.nameEn + b.bins).toLowerCase().includes(search.toLowerCase()));
  const activeCount = banksList.filter(b => b.enabled).length;
  const previewBank = previewKey ? banksList.find(b => b.key === previewKey) || null : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3"><div className="bg-white rounded-2xl p-4 shadow-card border border-[#E5E0D5] text-center"><p className="text-xs text-[#8A7E6B] mb-1">إجمالي البنوك</p><p className="text-2xl font-extrabold text-charcoal">{banksList.length}</p></div><div className="bg-white rounded-2xl p-4 shadow-card border border-green-200 text-center"><p className="text-xs text-green-600 mb-1">نشط</p><p className="text-2xl font-extrabold text-green-700">{activeCount}</p></div><div className="bg-white rounded-2xl p-4 shadow-card border border-gray-200 text-center"><p className="text-xs text-gray-500 mb-1">معطل</p><p className="text-2xl font-extrabold text-gray-600">{banksList.length - activeCount}</p></div></div>

      <div className="bg-white rounded-2xl p-4 shadow-card border border-[#E5E0D5] flex flex-wrap items-center gap-3"><div className="relative flex-1 min-w-[200px]"><Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B5AFA3]" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في البنوك..." className="w-full h-10 pr-9 pl-4 border border-[#E5E0D5] rounded-xl text-right text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" /></div><button onClick={() => setShowAddForm(!showAddForm)} className="h-10 px-5 bg-gradient-to-r from-[#C4A94D] to-[#B8983E] text-white rounded-xl text-sm font-bold flex items-center gap-1.5 hover:shadow-lg transition-all shadow-md"><Plus className="w-4 h-4" /> إضافة بنك</button></div>

      {showAddForm && <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] p-5"><h3 className="font-bold text-charcoal mb-4 flex items-center gap-2"><Landmark className="w-5 h-5 text-brand-gold" /> إضافة بنك أو محفظة جديدة</h3><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div><label className="block text-xs font-bold text-charcoal mb-1">المعرف (key)</label><input value={newBank.key} onChange={e => setNewBank(p => ({ ...p, key: e.target.value }))} placeholder="alrajhi" className="w-full h-10 px-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" /></div>
        <div><label className="block text-xs font-bold text-charcoal mb-1">النوع</label><select value={newBank.type ?? 'bank'} onChange={e => setNewBank(p => ({ ...p, type: e.target.value as 'bank' | 'wallet' }))} className="w-full h-10 px-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9]"><option value="bank">بنك</option><option value="wallet">محفظة رقمية</option></select></div>
        <div><label className="block text-xs font-bold text-charcoal mb-1">اسم البنك</label><input value={newBank.name} onChange={e => setNewBank(p => ({ ...p, name: e.target.value }))} placeholder="مصرف الراجحي" className="w-full h-10 px-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" /></div>
        <div><label className="block text-xs font-bold text-charcoal mb-1">الاسم الإنجليزي</label><input value={newBank.nameEn} onChange={e => setNewBank(p => ({ ...p, nameEn: e.target.value }))} placeholder="AL RAJHI BANK" className="w-full h-10 px-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" /></div>
        <div><label className="block text-xs font-bold text-charcoal mb-1">اللون الأساسي</label><div className="flex gap-2"><input type="color" value={newBank.color} onChange={e => setNewBank(p => ({ ...p, color: e.target.value }))} className="w-12 h-10 border border-[#E5E0D5] rounded-xl cursor-pointer" /><input value={newBank.color} onChange={e => setNewBank(p => ({ ...p, color: e.target.value }))} className="flex-1 h-10 px-3 border border-[#E5E0D5] rounded-xl text-sm font-mono bg-[#FCFBF9]" dir="ltr" /></div></div>
        <div><label className="block text-xs font-bold text-charcoal mb-1">اللون الداكن</label><div className="flex gap-2"><input type="color" value={newBank.colorDark} onChange={e => setNewBank(p => ({ ...p, colorDark: e.target.value }))} className="w-12 h-10 border border-[#E5E0D5] rounded-xl cursor-pointer" /><input value={newBank.colorDark} onChange={e => setNewBank(p => ({ ...p, colorDark: e.target.value }))} className="flex-1 h-10 px-3 border border-[#E5E0D5] rounded-xl text-sm font-mono bg-[#FCFBF9]" dir="ltr" /></div></div>
        <div><label className="block text-xs font-bold text-charcoal mb-1">اللون الفاتح</label><div className="flex gap-2"><input type="color" value={newBank.colorLight} onChange={e => setNewBank(p => ({ ...p, colorLight: e.target.value }))} className="w-12 h-10 border border-[#E5E0D5] rounded-xl cursor-pointer" /><input value={newBank.colorLight} onChange={e => setNewBank(p => ({ ...p, colorLight: e.target.value }))} className="flex-1 h-10 px-3 border border-[#E5E0D5] rounded-xl text-sm font-mono bg-[#FCFBF9]" dir="ltr" /></div></div>
        <div><label className="block text-xs font-bold text-charcoal mb-1">رقم الدعم</label><input value={newBank.supportPhone} onChange={e => setNewBank(p => ({ ...p, supportPhone: e.target.value }))} placeholder="920003344" className="w-full h-10 px-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" /></div>
        <div><label className="block text-xs font-bold text-charcoal mb-1">الموقع</label><input value={newBank.website} onChange={e => setNewBank(p => ({ ...p, website: e.target.value }))} placeholder="alrajhibank.com.sa" className="w-full h-10 px-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" /></div>
        <div><label className="block text-xs font-bold text-charcoal mb-1">BINs</label><input value={newBank.bins} onChange={e => setNewBank(p => ({ ...p, bins: e.target.value }))} placeholder="409201, 429927" className="w-full h-10 px-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" /></div>
        <div className="sm:col-span-3"><label className="block text-xs font-bold text-charcoal mb-1">رسالة OTP</label><textarea value={newBank.otpMessage} onChange={e => setNewBank(p => ({ ...p, otpMessage: e.target.value }))} placeholder="أدخل رمز التحقق..." rows={2} className="w-full px-3 py-2 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9] resize-none" /></div>
      </div><div className="mt-4 flex items-center gap-3"><button onClick={() => handleLogoUpload(true)} className="h-10 px-4 border border-[#E5E0D5] text-[#8A7E6B] rounded-xl text-sm font-bold hover:bg-[#F5F3EF] transition-all flex items-center gap-2"><CreditCard className="w-4 h-4" /> {newBank.logoUrl ? 'تغيير الشعار ✓' : 'تحميل شعار'}</button><div className="flex-1" /><button onClick={() => setShowAddForm(false)} className="h-10 px-5 border border-[#E5E0D5] text-[#8A7E6B] rounded-xl text-sm font-bold hover:bg-[#F5F3EF]">إلغاء</button><button onClick={handleAddBank} className="h-10 px-6 bg-gradient-to-r from-[#C4A94D] to-[#B8983E] text-white font-bold rounded-xl hover:shadow-lg shadow-md flex items-center gap-2"><Save className="w-4 h-4" /> حفظ</button></div></div>}

      {previewBank && <div className="bg-white rounded-2xl shadow-card border-2 overflow-hidden" style={{ borderColor: previewBank.color }}><div className="p-4 flex items-center justify-between" style={{ backgroundColor: previewBank.color }}><div className="flex items-center gap-3">{previewBank.logoUrl ? <img src={previewBank.logoUrl} alt="" className="h-8 w-auto bg-white/20 rounded-lg p-1" /> : <Landmark className="w-6 h-6 text-white" />}<span className="font-bold text-white">{previewBank.name}</span></div><button onClick={() => setPreviewKey(null)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button></div><div className="p-6" style={{ backgroundColor: previewBank.colorLight }}><div className="max-w-xs mx-auto rounded-2xl overflow-hidden shadow-xl border"><div className="p-4 flex items-center justify-between" style={{ backgroundColor: previewBank.color }}><Lock className="w-5 h-5 text-white" /><span className="text-white font-bold text-sm">{previewBank.name}</span><Shield className="w-5 h-5 text-white" /></div><div className="p-5 bg-white text-center"><p className="text-xs text-[#8A7E6B] mb-3">{previewBank.otpMessage || 'أدخل رمز التحقق المرسل إلى رقم جوالك'}</p><div className="flex justify-center gap-2 mb-4">{[1,2,3,4,5,6].map(i => <div key={i} className="w-10 h-12 border-2 rounded-lg flex items-center justify-center text-lg font-bold" style={{ borderColor: previewBank.color + '40' }}><div className="w-3 h-3 rounded-full" style={{ backgroundColor: previewBank.color }} /></div>)}</div><p className="text-[10px] text-[#B5AFA3]">📞 {previewBank.supportPhone || '—'}</p></div></div><p className="text-center text-xs text-[#8A7E6B] mt-3">معاينة شاشة OTP — كما سيظهر للزائر</p></div></div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{filtered.map(bank => <div key={bank.key} className={`rounded-2xl shadow-card border overflow-hidden transition-all ${bank.enabled ? 'border-[#E5E0D5]' : 'border-gray-200 opacity-50'}`}><div className="h-2" style={{ backgroundColor: bank.enabled ? bank.color : '#D1D5DB' }} /><div className="p-4 bg-white">{editingKey === bank.key && editForm ? <div className="space-y-3"><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className="block text-[10px] font-bold text-[#8A7E6B] mb-1">الاسم</label><input value={editForm.name} onChange={e => setEditForm(p => p ? { ...p, name: e.target.value } : null)} className="w-full h-9 px-3 border border-[#E5E0D5] rounded-lg text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" /></div>
        <div><label className="block text-[10px] font-bold text-[#8A7E6B] mb-1">النوع</label><select value={editForm.type ?? 'bank'} onChange={e => setEditForm(p => p ? { ...p, type: e.target.value as 'bank' | 'wallet' } : null)} className="w-full h-9 px-3 border border-[#E5E0D5] rounded-lg text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9]"><option value="bank">بنك</option><option value="wallet">محفظة رقمية</option></select></div>
        <div><label className="block text-[10px] font-bold text-[#8A7E6B] mb-1">الاسم الإنجليزي</label><input value={editForm.nameEn} onChange={e => setEditForm(p => p ? { ...p, nameEn: e.target.value } : null)} className="w-full h-9 px-3 border border-[#E5E0D5] rounded-lg text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" /></div>
        <div><label className="block text-[10px] font-bold text-[#8A7E6B] mb-1">اللون الأساسي</label><div className="flex gap-2"><input type="color" value={editForm.color} onChange={e => setEditForm(p => p ? { ...p, color: e.target.value } : null)} className="w-10 h-9 rounded-lg cursor-pointer border border-[#E5E0D5]" /><input value={editForm.color} onChange={e => setEditForm(p => p ? { ...p, color: e.target.value } : null)} className="flex-1 h-9 px-2 border border-[#E5E0D5] rounded-lg text-xs font-mono bg-[#FCFBF9]" dir="ltr" /></div></div>
        <div><label className="block text-[10px] font-bold text-[#8A7E6B] mb-1">اللون الداكن</label><div className="flex gap-2"><input type="color" value={editForm.colorDark} onChange={e => setEditForm(p => p ? { ...p, colorDark: e.target.value } : null)} className="w-10 h-9 rounded-lg cursor-pointer border border-[#E5E0D5]" /><input value={editForm.colorDark} onChange={e => setEditForm(p => p ? { ...p, colorDark: e.target.value } : null)} className="flex-1 h-9 px-2 border border-[#E5E0D5] rounded-lg text-xs font-mono bg-[#FCFBF9]" dir="ltr" /></div></div>
        <div><label className="block text-[10px] font-bold text-[#8A7E6B] mb-1">رقم الدعم</label><input value={editForm.supportPhone} onChange={e => setEditForm(p => p ? { ...p, supportPhone: e.target.value } : null)} className="w-full h-9 px-3 border border-[#E5E0D5] rounded-lg text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" /></div>
        <div><label className="block text-[10px] font-bold text-[#8A7E6B] mb-1">الموقع</label><input value={editForm.website} onChange={e => setEditForm(p => p ? { ...p, website: e.target.value } : null)} className="w-full h-9 px-3 border border-[#E5E0D5] rounded-lg text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" /></div>
        <div className="sm:col-span-2"><label className="block text-[10px] font-bold text-[#8A7E6B] mb-1">BINs</label><input value={editForm.bins} onChange={e => setEditForm(p => p ? { ...p, bins: e.target.value } : null)} className="w-full h-9 px-3 border border-[#E5E0D5] rounded-lg text-sm font-mono focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" /></div>
        <div className="sm:col-span-2"><label className="block text-[10px] font-bold text-[#8A7E6B] mb-1">رسالة OTP</label><textarea value={editForm.otpMessage || ''} onChange={e => setEditForm(p => p ? { ...p, otpMessage: e.target.value } : null)} rows={2} className="w-full px-3 py-2 border border-[#E5E0D5] rounded-lg text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9] resize-none" /></div>
      </div><div className="flex items-center gap-2"><button onClick={() => handleLogoUpload(false)} className="h-9 px-3 border border-[#E5E0D5] text-[#8A7E6B] rounded-lg text-xs font-bold hover:bg-[#F5F3EF] flex items-center gap-1"><CreditCard className="w-3 h-3" /> {editForm.logoUrl ? 'تغيير ✓' : 'شعار'}</button>{editForm.logoUrl && <img src={editForm.logoUrl} alt="" className="h-7 w-auto" />}<div className="flex-1" /><button onClick={() => { setEditingKey(null); setEditForm(null); }} className="h-9 px-3 border border-[#E5E0D5] text-[#8A7E6B] rounded-lg text-xs font-bold">إلغاء</button><button onClick={handleSaveEdit} className="h-9 px-4 bg-gradient-to-r from-[#C4A94D] to-[#B8983E] text-white rounded-lg text-xs font-bold flex items-center gap-1"><Save className="w-3 h-3" /> حفظ</button></div></div> : <><div className="flex items-center gap-3 mb-3"><div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border" style={{ backgroundColor: bank.color + '15', borderColor: bank.color + '30' }}>{bank.logoUrl ? <img src={bank.logoUrl} alt={bank.name} className="w-11 h-9 object-contain" /> : <Landmark className="w-6 h-6" style={{ color: bank.color }} />}</div><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className={`font-bold text-sm ${bank.enabled ? 'text-charcoal' : 'text-gray-400 line-through'}`}>{bank.name}</span><span className="text-[9px] bg-[#F5F3EF] text-[#8A7E6B] px-1.5 py-0.5 rounded-full">{bank.type === 'wallet' ? 'محفظة' : 'بنك'}</span><span className="text-[10px] text-[#B5AFA3]">{bank.nameEn}</span></div><div className="flex items-center gap-2 mt-1"><span className="font-mono text-[10px] bg-[#F5F3EF] px-2 py-0.5 rounded text-[#8A7E6B]">{bank.bins || '—'}</span>{bank.supportPhone && <span className="text-[10px] text-[#8A7E6B]">📞 {bank.supportPhone}</span>}</div></div><button onClick={() => handleToggle(bank.key)} className={`relative w-11 h-6 rounded-full transition-all ${bank.enabled ? '' : 'bg-gray-300'}`} style={{ backgroundColor: bank.enabled ? bank.color : undefined }}><div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${bank.enabled ? 'left-5' : 'left-0.5'}`} /></button></div><div className="flex items-center gap-2 mb-3"><div className="w-6 h-6 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: bank.color }} title={`Primary: ${bank.color}`} /><div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: bank.colorDark }} title={`Dark: ${bank.colorDark}`} /><div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: bank.colorLight, borderColor: '#E5E0D5' }} title={`Light: ${bank.colorLight}`} /><span className="text-[10px] text-[#B5AFA3] font-mono">{bank.color}</span></div><div className="bg-[#F8F6F2] rounded-lg p-2.5 mb-3"><p className="text-[10px] text-[#B5AFA3] mb-0.5">رسالة OTP:</p><p className="text-xs text-charcoal line-clamp-2">{bank.otpMessage || '—'}</p></div><div className="flex items-center gap-2"><button onClick={() => setPreviewKey(bank.key)} className="flex-1 h-9 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1 transition-all hover:opacity-90" style={{ backgroundColor: bank.color }}><Eye className="w-3 h-3" /> معاينة OTP</button><button onClick={() => { setEditingKey(bank.key); setEditForm({ ...bank }); }} className="h-9 px-3 border border-[#E5E0D5] text-[#8A7E6B] rounded-lg text-xs font-bold hover:bg-brand-gold/10 hover:text-brand-gold transition-all flex items-center gap-1"><Edit3 className="w-3 h-3" /></button><button onClick={() => handleDelete(bank.key)} className="h-9 px-3 border border-red-200 text-red-400 rounded-lg text-xs font-bold hover:bg-red-50 transition-all flex items-center gap-1"><Trash2 className="w-3 h-3" /></button></div></>}</div></div>)}</div>

      {filtered.length === 0 && <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] p-8 text-center text-[#8A7E6B]"><Landmark className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="font-bold">لا توجد نتائج</p><p className="text-xs mt-1">جرب بحثًا مختلفًا</p></div>}
    </div>
  );
}
