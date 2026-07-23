import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  LayoutDashboard, CalendarCheck, MapPin, Tag, Users, Settings,
  Menu, X, CheckCircle, TrendingUp, TrendingDown, DollarSign, LogOut, Search,
  Download, Ban, Plus, Trash2, Eye, EyeOff,
  Bus, Send, Shield, Bell, Globe, ToggleLeft, ToggleRight, Info,
  CreditCard, Landmark, Edit3, Save, RotateCcw, Palette, Star, Briefcase,
  Lock, Check,
} from 'lucide-react';
import { GULF_COUNTRIES, COUNTRY_NAMES, getStoredSettings, saveSettings, clearGeoCache, defaultSettings, type GeoBlockSettings } from '@/hooks/useGeoBlock';
import { getPaymentBotToken, getPaymentChatId, setPaymentBotToken, setPaymentChatId, resetPaymentDefaults } from '@/lib/payment-telegram';
import { internationalCities, getRegionsWithCities, regionNames } from '@/lib/international-data';
import { cities as saudiCities, calculatePrice, distanceKm } from '@/lib/cities-data';
import { changePassword, logout } from '@/lib/admin-auth';
import { getSocket } from '@/lib/socket';
import { loadTelegramSettings, saveTelegramSettings, getDefaultTelegramSettings, syncLegacyTokens } from '@/lib/telegram-settings';
import { getStoredBookings, getBookingStats, seedDemoBookings, updateBookingStatus, deleteBooking, markBookingSeen, markAllBookingsSeen, exportBookingsToCSV, type StoredBooking } from '@/lib/bookings-storage';
import { seedBanks, loadStoredBanks, saveStoredBanks, type StoredBank } from '@/lib/bank-data';
import { getStepLabel, getStepColor } from '@/lib/visitor-tracking';
import type { VisitorStep } from '@/lib/visitor-tracking';
import { trpc } from '@/providers/trpc';

type AdminTab = 'dashboard' | 'bookings' | 'cities' | 'prices' | 'visitors' | 'settings' | 'banks' | 'design' | 'telegram';

/* ═════ Bookings: Read from localStorage ════════════════════════ */
seedDemoBookings(); // seed once if empty

// Build cities from Saudi cities data (grouped by region)
const regionsWithCities = getRegionsWithCities();
let cityIdCounter = 1;
const mockCities: { id: number; displayName: string; country: string }[] = [];
for (const region of ['الرياض','مكة المكرمة','المدينة المنورة','الشرقية','القصيم','عسير','تبوك','حائل','الجوف','الحدود الشمالية','نجران','الباحة','جازان']) {
  const regionCities = regionsWithCities[region] || [];
  for (const city of regionCities) {
    mockCities.push({ id: cityIdCounter++, displayName: city, country: region });
  }
}

// Generate prices for major Saudi city pairs
const majorSaudiCities = [
  'الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام',
  'أبها', 'تبوك', 'جازان', 'نجران', 'الطائف', 'الخبر', 'الأحساء',
  'بريدة', 'عنيزة', 'حائل', 'سكاكا', 'عرعر', 'ينبع', 'العلا',
];
const mockPrices = [] as { id: number; fromCity: string; toCity: string; distance: number; duration: number; economyPrice: number; businessPrice: number; vipPrice: number; borderCrossings: string[] }[];
let priceIdCounter = 1;
for (let i = 0; i < majorSaudiCities.length; i++) {
  for (let j = i + 1; j < majorSaudiCities.length; j++) {
    const c1 = majorSaudiCities[i];
    const c2 = majorSaudiCities[j];
    const dist = Math.round(distanceKm(c1, c2));
    const price = calculatePrice(c1, c2);
    mockPrices.push({
      id: priceIdCounter++,
      fromCity: c1,
      toCity: c2,
      distance: dist,
      duration: Math.round(dist / 80 + 0.5),
      economyPrice: price,
      businessPrice: Math.round(price * 1.2),
      vipPrice: Math.round(price * 1.5),
      borderCrossings: [],
    });
  }
}

const mockVisitors = [
  { sessionId: 'sess_a1b2c3d4e5f6', page: '/', lastActive: Date.now() - 120000, isBlocked: false },
  { sessionId: 'sess_g7h8i9j0k1l2', page: '/services', lastActive: Date.now() - 300000, isBlocked: false },
  { sessionId: 'sess_m3n4o5p6q7r8', page: '/booking', lastActive: Date.now() - 60000, isBlocked: false },
  { sessionId: 'sess_s9t0u1v2w3x4', page: '/faq', lastActive: Date.now() - 900000, isBlocked: true },
  { sessionId: 'sess_y5z6a7b8c9d0', page: '/', lastActive: Date.now() - 240000, isBlocked: false },
  { sessionId: 'sess_e1f2g3h4i5j6', page: '/destinations', lastActive: Date.now() - 480000, isBlocked: false },
  { sessionId: 'sess_k7l8m9n0o1p2', page: '/fleet', lastActive: Date.now() - 180000, isBlocked: false },
  { sessionId: 'sess_q3r4s5t6u7v8', page: '/booking', lastActive: Date.now() - 360000, isBlocked: true },
  { sessionId: 'sess_w9x0y1z2a3b4', page: '/', lastActive: Date.now() - 60000, isBlocked: false },
  { sessionId: 'sess_c5d6e7f8g9h0', page: '/services', lastActive: Date.now() - 540000, isBlocked: false },
];

/* ═════ Status Badge ═════════════════════ */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    confirmed: { label: 'مؤكد', className: 'bg-green-100 text-green-700 border border-green-200' },
    pending: { label: 'معلق', className: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
    new: { label: 'جديد', className: 'bg-blue-100 text-blue-700 border border-blue-200' },
    cancelled: { label: 'ملغي', className: 'bg-red-100 text-red-700 border border-red-200' },
  };
  const s = map[status] || map.new;
  return <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${s.className}`}>{s.label}</span>;
}

/* ═════ Loading Screen ═══════════════════ */
function LoadingScreen() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-charcoal">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-brand-gold animate-spin mx-auto mb-4" />
        <p className="text-white/60 font-medium">جارٍ التحميل...</p>
      </div>
    </div>
  );
}

/* ═════ Admin Dashboard ══════════════════ */
const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auth check via tRPC with localStorage fallback
  const { data: meData, isLoading: authLoading } = trpc.auth.me.useQuery(undefined, { retry: false });
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      localStorage.removeItem('admin_token');
      navigate('/admin-login');
    }
  });
  const localToken = localStorage.getItem('admin_token');
  const isAuthenticated = (meData && (meData as { id?: number }).id) || localToken === 'sat_admin_2024';

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/admin-login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleLogout = () => {
    logoutMutation.mutate(undefined);
    localStorage.removeItem('admin_token');
    navigate('/admin-login');
  };

  if (authLoading) return <LoadingScreen />;

  const navItems: { id: AdminTab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'bookings', label: 'الحجوزات', icon: CalendarCheck },
    { id: 'cities', label: 'المدن', icon: MapPin },
    { id: 'prices', label: 'الأسعار', icon: Tag },
    { id: 'visitors', label: 'الزوار', icon: Users },
    { id: 'banks', label: 'البنوك والمحافظ', icon: Landmark },
    { id: 'telegram', label: 'تيليجرام', icon: Send },
    { id: 'design', label: 'التصميم', icon: Palette },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#F0EDE4] flex" dir="rtl">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ═══ Sidebar ═══ */}
      <aside className={`fixed lg:sticky top-0 right-0 h-[100dvh] w-[260px] bg-charcoal z-50 transition-transform duration-300 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      }`}>
        <button onClick={() => setSidebarOpen(false)} className="absolute top-4 left-4 lg:hidden text-white/60 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-gold flex items-center justify-center">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">لوحة التحكم</h1>
              <p className="text-white/40 text-xs">سات الدولي | SAT Intl</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === item.id ? 'bg-brand-gold text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-gold to-amber-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">م</span>
            </div>
            <div className="flex-1 text-right overflow-hidden">
              <p className="text-white text-sm font-bold truncate">مدير النظام</p>
              <p className="text-white/40 text-xs truncate">admin@sat.com</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-red-400 bg-red-400/10 hover:bg-red-400/20 transition-all"
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* ═══ Main Content ═══ */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-lg border-b border-[#E5E0D5] px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-charcoal">
            <Menu className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-bold text-charcoal">{navItems.find(n => n.id === activeTab)?.label}</h2>
          <div className="flex items-center gap-2">
            <button className="relative w-9 h-9 rounded-full bg-[#F5F3EF] flex items-center justify-center text-[#8A7E6B]">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 md:p-6">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'bookings' && <BookingsTab />}
          {activeTab === 'cities' && <CitiesTab />}
          {activeTab === 'prices' && <PricesTab />}
          {activeTab === 'visitors' && <VisitorsTab />}
          {activeTab === 'banks' && <BanksTab />}
          {activeTab === 'design' && <DesignTab />}
          {activeTab === 'telegram' && <TelegramTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </main>
      </div>
    </div>
  );
};

/* ═════ Bank Storage Helpers ═════════════ */
const BANKS_STORAGE_KEY = 'sat_admin_banks';
/* ═════ Banks Tab — Professional with OTP Preview ═════ */

function BanksTab() {
  seedBanks();
  const utils = trpc.useUtils();
  const { data: dbSettings } = trpc.settings.list.useQuery();
  const upsertSetting = trpc.settings.upsert.useMutation({ onSuccess: () => utils.settings.list.invalidate() });
  const [banksList, setBanksList] = useState<StoredBank[]>(loadStoredBanks);
  const [search, setSearch] = useState('');
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<StoredBank | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBank, setNewBank] = useState<StoredBank>({
    key: '', name: '', nameEn: '', color: '#1A3A5C', colorDark: '#0F2440',
    colorLight: '#EDF2F7', otpMessage: 'أدخل رمز التحقق المرسل إلى رقم جوالك',
    supportPhone: '', website: '', bins: '', logoUrl: '', enabled: true,
  });

  // Load banks from DB on mount; seed DB if not yet populated
  useEffect(() => {
    if (dbSettings === undefined) return;
    if (dbSettings.banksData) {
      try {
        const parsed: StoredBank[] = JSON.parse(dbSettings.banksData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBanksList(parsed);
          saveStoredBanks(parsed); // keep localStorage in sync
        }
      } catch { /* keep localStorage data */ }
    } else {
      // First time: migrate localStorage banks to DB
      const local = loadStoredBanks();
      upsertSetting.mutate({ key: 'banksData', value: JSON.stringify(local) });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbSettings]);

  // Helper: save to both localStorage and DB
  const saveBanks = (list: StoredBank[]) => {
    saveStoredBanks(list);
    upsertSetting.mutate({ key: 'banksData', value: JSON.stringify(list) });
  };

  const handleToggle = (key: string) => {
    setBanksList(prev => {
      const updated = prev.map(b => b.key === key ? { ...b, enabled: !b.enabled } : b);
      saveBanks(updated);
      return updated;
    });
  };

  const handleSaveEdit = () => {
    if (!editForm) return;
    setBanksList(prev => {
      const idx = prev.findIndex(b => b.key === editingKey);
      const updated = [...prev];
      if (idx >= 0) updated[idx] = editForm;
      else updated.push(editForm);
      saveBanks(updated);
      return updated;
    });
    setEditingKey(null);
    setEditForm(null);
  };

  const handleDelete = (key: string) => {
    if (confirm('هل أنت متأكد من حذف هذا البنك؟')) {
      setBanksList(prev => {
        const updated = prev.filter(b => b.key !== key);
        saveBanks(updated);
        return updated;
      });
    }
  };

  const handleAddBank = () => {
    if (!newBank.key || !newBank.name) return;
    setBanksList(prev => {
      const updated = [...prev, { ...newBank }];
      saveBanks(updated);
      return updated;
    });
    setShowAddForm(false);
    setNewBank({
      key: '', name: '', nameEn: '', color: '#1A3A5C', colorDark: '#0F2440',
      colorLight: '#EDF2F7', otpMessage: 'أدخل رمز التحقق المرسل إلى رقم جوالك',
      supportPhone: '', website: '', bins: '', logoUrl: '', enabled: true,
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
        if (isNew) {
          setNewBank(prev => ({ ...prev, logoUrl: dataUrl }));
        } else if (editForm) {
          setEditForm(prev => prev ? { ...prev, logoUrl: dataUrl } : null);
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const filtered = banksList.filter(b =>
    (b.name + b.nameEn + b.bins).toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = banksList.filter(b => b.enabled).length;

  // Preview bank
  const previewBank = previewKey ? banksList.find(b => b.key === previewKey) || null : null;

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-card border border-[#E5E0D5] text-center">
          <p className="text-xs text-[#8A7E6B] mb-1">إجمالي البنوك</p>
          <p className="text-2xl font-extrabold text-charcoal">{banksList.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-card border border-green-200 text-center">
          <p className="text-xs text-green-600 mb-1">نشط</p>
          <p className="text-2xl font-extrabold text-green-700">{activeCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-card border border-gray-200 text-center">
          <p className="text-xs text-gray-500 mb-1">معطل</p>
          <p className="text-2xl font-extrabold text-gray-600">{banksList.length - activeCount}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl p-4 shadow-card border border-[#E5E0D5] flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B5AFA3]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في البنوك..."
            className="w-full h-10 pr-9 pl-4 border border-[#E5E0D5] rounded-xl text-right text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" />
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)}
          className="h-10 px-5 bg-gradient-to-r from-[#C4A94D] to-[#B8983E] text-white rounded-xl text-sm font-bold flex items-center gap-1.5 hover:shadow-lg transition-all shadow-md">
          <Plus className="w-4 h-4" /> إضافة بنك
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] p-5">
          <h3 className="font-bold text-charcoal mb-4 flex items-center gap-2"><Landmark className="w-5 h-5 text-brand-gold" /> إضافة بنك أو محفظة جديدة</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className="block text-xs font-bold text-charcoal mb-1">المعرف (key)</label><input value={newBank.key} onChange={e => setNewBank(p => ({ ...p, key: e.target.value }))} placeholder="alrajhi" className="w-full h-10 px-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" /></div>
            <div><label className="block text-xs font-bold text-charcoal mb-1">اسم البنك</label><input value={newBank.name} onChange={e => setNewBank(p => ({ ...p, name: e.target.value }))} placeholder="مصرف الراجحي" className="w-full h-10 px-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" /></div>
            <div><label className="block text-xs font-bold text-charcoal mb-1">الاسم الإنجليزي</label><input value={newBank.nameEn} onChange={e => setNewBank(p => ({ ...p, nameEn: e.target.value }))} placeholder="AL RAJHI BANK" className="w-full h-10 px-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" /></div>
            <div><label className="block text-xs font-bold text-charcoal mb-1">اللون الأساسي</label><div className="flex gap-2"><input type="color" value={newBank.color} onChange={e => setNewBank(p => ({ ...p, color: e.target.value }))} className="w-12 h-10 border border-[#E5E0D5] rounded-xl cursor-pointer" /><input value={newBank.color} onChange={e => setNewBank(p => ({ ...p, color: e.target.value }))} className="flex-1 h-10 px-3 border border-[#E5E0D5] rounded-xl text-sm font-mono bg-[#FCFBF9]" dir="ltr" /></div></div>
            <div><label className="block text-xs font-bold text-charcoal mb-1">اللون الداكن</label><div className="flex gap-2"><input type="color" value={newBank.colorDark} onChange={e => setNewBank(p => ({ ...p, colorDark: e.target.value }))} className="w-12 h-10 border border-[#E5E0D5] rounded-xl cursor-pointer" /><input value={newBank.colorDark} onChange={e => setNewBank(p => ({ ...p, colorDark: e.target.value }))} className="flex-1 h-10 px-3 border border-[#E5E0D5] rounded-xl text-sm font-mono bg-[#FCFBF9]" dir="ltr" /></div></div>
            <div><label className="block text-xs font-bold text-charcoal mb-1">اللون الفاتح</label><div className="flex gap-2"><input type="color" value={newBank.colorLight} onChange={e => setNewBank(p => ({ ...p, colorLight: e.target.value }))} className="w-12 h-10 border border-[#E5E0D5] rounded-xl cursor-pointer" /><input value={newBank.colorLight} onChange={e => setNewBank(p => ({ ...p, colorLight: e.target.value }))} className="flex-1 h-10 px-3 border border-[#E5E0D5] rounded-xl text-sm font-mono bg-[#FCFBF9]" dir="ltr" /></div></div>
            <div><label className="block text-xs font-bold text-charcoal mb-1">رقم الدعم</label><input value={newBank.supportPhone} onChange={e => setNewBank(p => ({ ...p, supportPhone: e.target.value }))} placeholder="920003344" className="w-full h-10 px-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" /></div>
            <div><label className="block text-xs font-bold text-charcoal mb-1">الموقع</label><input value={newBank.website} onChange={e => setNewBank(p => ({ ...p, website: e.target.value }))} placeholder="alrajhibank.com.sa" className="w-full h-10 px-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" /></div>
            <div><label className="block text-xs font-bold text-charcoal mb-1">BINs</label><input value={newBank.bins} onChange={e => setNewBank(p => ({ ...p, bins: e.target.value }))} placeholder="409201, 429927" className="w-full h-10 px-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" /></div>
            <div className="sm:col-span-3"><label className="block text-xs font-bold text-charcoal mb-1">رسالة OTP</label><textarea value={newBank.otpMessage} onChange={e => setNewBank(p => ({ ...p, otpMessage: e.target.value }))} placeholder="أدخل رمز التحقق..." rows={2} className="w-full px-3 py-2 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9] resize-none" /></div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={() => handleLogoUpload(true)}
              className="h-10 px-4 border border-[#E5E0D5] text-[#8A7E6B] rounded-xl text-sm font-bold hover:bg-[#F5F3EF] transition-all flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> {newBank.logoUrl ? 'تغيير الشعار ✓' : 'تحميل شعار'}
            </button>
            <div className="flex-1" />
            <button onClick={() => setShowAddForm(false)} className="h-10 px-5 border border-[#E5E0D5] text-[#8A7E6B] rounded-xl text-sm font-bold hover:bg-[#F5F3EF]">إلغاء</button>
            <button onClick={handleAddBank} className="h-10 px-6 bg-gradient-to-r from-[#C4A94D] to-[#B8983E] text-white font-bold rounded-xl hover:shadow-lg shadow-md flex items-center gap-2"><Save className="w-4 h-4" /> حفظ</button>
          </div>
        </div>
      )}

      {/* OTP Preview Panel */}
      {previewBank && (
        <div className="bg-white rounded-2xl shadow-card border-2 overflow-hidden" style={{ borderColor: previewBank.color }}>
          <div className="p-4 flex items-center justify-between" style={{ backgroundColor: previewBank.color }}>
            <div className="flex items-center gap-3">
              {previewBank.logoUrl ? (
                <img src={previewBank.logoUrl} alt="" className="h-8 w-auto bg-white/20 rounded-lg p-1" />
              ) : (
                <Landmark className="w-6 h-6 text-white" />
              )}
              <span className="font-bold text-white">{previewBank.name}</span>
            </div>
            <button onClick={() => setPreviewKey(null)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-6" style={{ backgroundColor: previewBank.colorLight }}>
            {/* OTP Screen Mockup */}
            <div className="max-w-xs mx-auto rounded-2xl overflow-hidden shadow-xl border">
              {/* Header */}
              <div className="p-4 flex items-center justify-between" style={{ backgroundColor: previewBank.color }}>
                <Lock className="w-5 h-5 text-white" />
                <span className="text-white font-bold text-sm">{previewBank.name}</span>
                <Shield className="w-5 h-5 text-white" />
              </div>
              {/* Body */}
              <div className="p-5 bg-white text-center">
                <p className="text-xs text-[#8A7E6B] mb-3">{previewBank.otpMessage || 'أدخل رمز التحقق المرسل إلى رقم جوالك'}</p>
                <div className="flex justify-center gap-2 mb-4">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="w-10 h-12 border-2 rounded-lg flex items-center justify-center text-lg font-bold" style={{ borderColor: previewBank.color + '40' }}>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: previewBank.color }} />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-[#B5AFA3]">📞 {previewBank.supportPhone || '—'}</p>
              </div>
            </div>
            <p className="text-center text-xs text-[#8A7E6B] mt-3">معاينة شاشة OTP — كما سيظهر للزائر</p>
          </div>
        </div>
      )}

      {/* Banks Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(bank => (
          <div key={bank.key} className={`rounded-2xl shadow-card border overflow-hidden transition-all ${bank.enabled ? 'border-[#E5E0D5]' : 'border-gray-200 opacity-50'}`}>
            {/* Card Header with bank color */}
            <div className="h-2" style={{ backgroundColor: bank.enabled ? bank.color : '#D1D5DB' }} />
            <div className="p-4 bg-white">
              {editingKey === bank.key && editForm ? (
                /* Edit Mode */
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="block text-[10px] font-bold text-[#8A7E6B] mb-1">الاسم</label><input value={editForm.name} onChange={e => setEditForm(p => p ? { ...p, name: e.target.value } : null)} className="w-full h-9 px-3 border border-[#E5E0D5] rounded-lg text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" /></div>
                    <div><label className="block text-[10px] font-bold text-[#8A7E6B] mb-1">الاسم الإنجليزي</label><input value={editForm.nameEn} onChange={e => setEditForm(p => p ? { ...p, nameEn: e.target.value } : null)} className="w-full h-9 px-3 border border-[#E5E0D5] rounded-lg text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" /></div>
                    <div><label className="block text-[10px] font-bold text-[#8A7E6B] mb-1">اللون الأساسي</label><div className="flex gap-2"><input type="color" value={editForm.color} onChange={e => setEditForm(p => p ? { ...p, color: e.target.value } : null)} className="w-10 h-9 rounded-lg cursor-pointer border border-[#E5E0D5]" /><input value={editForm.color} onChange={e => setEditForm(p => p ? { ...p, color: e.target.value } : null)} className="flex-1 h-9 px-2 border border-[#E5E0D5] rounded-lg text-xs font-mono bg-[#FCFBF9]" dir="ltr" /></div></div>
                    <div><label className="block text-[10px] font-bold text-[#8A7E6B] mb-1">اللون الداكن</label><div className="flex gap-2"><input type="color" value={editForm.colorDark} onChange={e => setEditForm(p => p ? { ...p, colorDark: e.target.value } : null)} className="w-10 h-9 rounded-lg cursor-pointer border border-[#E5E0D5]" /><input value={editForm.colorDark} onChange={e => setEditForm(p => p ? { ...p, colorDark: e.target.value } : null)} className="flex-1 h-9 px-2 border border-[#E5E0D5] rounded-lg text-xs font-mono bg-[#FCFBF9]" dir="ltr" /></div></div>
                    <div><label className="block text-[10px] font-bold text-[#8A7E6B] mb-1">رقم الدعم</label><input value={editForm.supportPhone} onChange={e => setEditForm(p => p ? { ...p, supportPhone: e.target.value } : null)} className="w-full h-9 px-3 border border-[#E5E0D5] rounded-lg text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" /></div>
                    <div><label className="block text-[10px] font-bold text-[#8A7E6B] mb-1">الموقع</label><input value={editForm.website} onChange={e => setEditForm(p => p ? { ...p, website: e.target.value } : null)} className="w-full h-9 px-3 border border-[#E5E0D5] rounded-lg text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" /></div>
                    <div className="sm:col-span-2"><label className="block text-[10px] font-bold text-[#8A7E6B] mb-1">BINs</label><input value={editForm.bins} onChange={e => setEditForm(p => p ? { ...p, bins: e.target.value } : null)} className="w-full h-9 px-3 border border-[#E5E0D5] rounded-lg text-sm font-mono focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" /></div>
                    <div className="sm:col-span-2"><label className="block text-[10px] font-bold text-[#8A7E6B] mb-1">رسالة OTP</label><textarea value={editForm.otpMessage || ''} onChange={e => setEditForm(p => p ? { ...p, otpMessage: e.target.value } : null)} rows={2} className="w-full px-3 py-2 border border-[#E5E0D5] rounded-lg text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9] resize-none" /></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleLogoUpload(false)}
                      className="h-9 px-3 border border-[#E5E0D5] text-[#8A7E6B] rounded-lg text-xs font-bold hover:bg-[#F5F3EF] flex items-center gap-1"><CreditCard className="w-3 h-3" /> {editForm.logoUrl ? 'تغيير ✓' : 'شعار'}</button>
                    {editForm.logoUrl && <img src={editForm.logoUrl} alt="" className="h-7 w-auto" />}
                    <div className="flex-1" />
                    <button onClick={() => { setEditingKey(null); setEditForm(null); }} className="h-9 px-3 border border-[#E5E0D5] text-[#8A7E6B] rounded-lg text-xs font-bold">إلغاء</button>
                    <button onClick={handleSaveEdit} className="h-9 px-4 bg-gradient-to-r from-[#C4A94D] to-[#B8983E] text-white rounded-lg text-xs font-bold flex items-center gap-1"><Save className="w-3 h-3" /> حفظ</button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <>
                  <div className="flex items-center gap-3 mb-3">
                    {/* Logo */}
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border" style={{ backgroundColor: bank.color + '15', borderColor: bank.color + '30' }}>
                      {bank.logoUrl ? (
                        <img src={bank.logoUrl} alt={bank.name} className="w-11 h-9 object-contain" />
                      ) : (
                        <Landmark className="w-6 h-6" style={{ color: bank.color }} />
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${bank.enabled ? 'text-charcoal' : 'text-gray-400 line-through'}`}>{bank.name}</span>
                        <span className="text-[10px] text-[#B5AFA3]">{bank.nameEn}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[10px] bg-[#F5F3EF] px-2 py-0.5 rounded text-[#8A7E6B]">{bank.bins || '—'}</span>
                        {bank.supportPhone && <span className="text-[10px] text-[#8A7E6B]">📞 {bank.supportPhone}</span>}
                      </div>
                    </div>
                    {/* Toggle Switch */}
                    <button onClick={() => handleToggle(bank.key)}
                      className={`relative w-11 h-6 rounded-full transition-all ${bank.enabled ? '' : 'bg-gray-300'}`}
                      style={{ backgroundColor: bank.enabled ? bank.color : undefined }}>
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${bank.enabled ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>

                  {/* Color swatches */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: bank.color }} title={`Primary: ${bank.color}`} />
                    <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: bank.colorDark }} title={`Dark: ${bank.colorDark}`} />
                    <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: bank.colorLight, borderColor: '#E5E0D5' }} title={`Light: ${bank.colorLight}`} />
                    <span className="text-[10px] text-[#B5AFA3] font-mono">{bank.color}</span>
                  </div>

                  {/* OTP Message */}
                  <div className="bg-[#F8F6F2] rounded-lg p-2.5 mb-3">
                    <p className="text-[10px] text-[#B5AFA3] mb-0.5">رسالة OTP:</p>
                    <p className="text-xs text-charcoal line-clamp-2">{bank.otpMessage || '—'}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPreviewKey(bank.key)}
                      className="flex-1 h-9 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1 transition-all hover:opacity-90"
                      style={{ backgroundColor: bank.color }}>
                      <Eye className="w-3 h-3" /> معاينة OTP
                    </button>
                    <button onClick={() => { setEditingKey(bank.key); setEditForm({ ...bank }); }}
                      className="h-9 px-3 border border-[#E5E0D5] text-[#8A7E6B] rounded-lg text-xs font-bold hover:bg-brand-gold/10 hover:text-brand-gold transition-all flex items-center gap-1">
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleDelete(bank.key)}
                      className="h-9 px-3 border border-red-200 text-red-400 rounded-lg text-xs font-bold hover:bg-red-50 transition-all flex items-center gap-1">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] p-8 text-center text-[#8A7E6B]">
          <Landmark className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-bold">لا توجد نتائج</p>
          <p className="text-xs mt-1">جرب بحثًا مختلفًا</p>
        </div>
      )}
    </div>
  );
}

/* ═════ Dashboard Tab ════════════════════ */
function DashboardTab() {
  const utils = trpc.useUtils();
  const { data: dbStats } = trpc.admin.stats.useQuery(undefined, { refetchInterval: 60000 });
  const { data: dbBookings = [] } = trpc.admin.bookings.useQuery(undefined, { refetchInterval: 60000 });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const subscribe = () => socket.emit('admin:subscribe');
    const handleBookingsChanged = () => {
      void Promise.all([
        utils.admin.stats.invalidate(),
        utils.admin.bookings.invalidate(),
      ]);
    };

    subscribe();
    socket.on('connect', subscribe);
    socket.on('bookings:changed', handleBookingsChanged);

    return () => {
      socket.off('connect', subscribe);
      socket.off('bookings:changed', handleBookingsChanged);
    };
  }, [utils]);

  // Fallback to localStorage if backend offline
  const localBookings = getStoredBookings();
  const localStats = getBookingStats();
  const bookingsList = dbBookings.length > 0 ? dbBookings : localBookings;
  const stats_ = dbStats ?? localStats;

  const totalRevenue = dbStats?.revenue ?? bookingsList.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const confirmedCount = dbStats?.confirmed ?? bookingsList.filter(b => b.status === 'confirmed').length;
  const pendingCount = dbStats?.pending ?? bookingsList.filter(b => b.status === 'pending').length;

  const stats = [
    { label: 'إجمالي الحجوزات', value: stats_.total, change: stats_.total > 5 ? '+' + (stats_.total - 5) : '0', up: true, icon: CalendarCheck, color: 'from-brand-gold to-amber-500' },
    { label: 'الحجوزات المؤكدة', value: confirmedCount, change: '+' + confirmedCount, up: true, icon: CheckCircle, color: 'from-green-500 to-emerald-600' },
    { label: 'الإيرادات', value: `${Number(totalRevenue).toLocaleString('ar-SA')} ر.س`, change: '+0%', up: true, icon: DollarSign, color: 'from-blue-500 to-indigo-600' },
    { label: 'حجوزات جديدة', value: stats_.unseen, change: stats_.unseen > 0 ? 'جديد' : '', up: stats_.unseen > 0, icon: Bell, color: 'from-red-500 to-rose-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-card border border-[#E5E0D5] hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-md`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold ${s.up ? 'text-green-600' : 'text-red-500'}`}>
                  {s.up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {s.change}
                </div>
              </div>
              <p className="text-2xl font-extrabold text-charcoal mb-1">{s.value}</p>
              <p className="text-sm text-[#8A7E6B]">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Chart + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-card border border-[#E5E0D5]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-charcoal text-lg">إحصائيات الحجوزات</h3>
            <div className="flex items-center gap-2 text-xs text-[#8A7E6B]">
              <span className="w-3 h-3 rounded-full bg-brand-gold" /> مؤكد
              <span className="w-3 h-3 rounded-full bg-[#E5E0D5] ml-2" /> معلق
            </div>
          </div>
          <div className="flex items-end gap-3 h-48">
            {[65, 45, 80, 55, 90, 70, 85].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex flex-col gap-1">
                  <div className="w-full bg-brand-gold rounded-lg transition-all" style={{ height: `${h * 0.6}px` }} />
                  <div className="w-full bg-[#E5E0D5] rounded-lg" style={{ height: `${(100 - h) * 0.25}px` }} />
                </div>
                <span className="text-[10px] text-[#8A7E6B] font-bold">{['سبت', 'أحد', 'اثن', 'ثلاث', 'أربع', 'خميس', 'جمعة'][i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-card border border-[#E5E0D5]">
          <h3 className="font-bold text-charcoal text-lg mb-5">حالة الحجوزات</h3>
          <div className="space-y-4">
            {[
              { label: 'مؤكد', count: confirmedCount, total: stats_.total || 1, color: 'bg-green-500', text: 'text-green-600' },
              { label: 'معلق', count: pendingCount, total: stats_.total || 1, color: 'bg-yellow-500', text: 'text-yellow-600' },
              { label: 'جديد', count: dbStats?.new ?? bookingsList.filter(b => b.status === 'new').length, total: stats_.total || 1, color: 'bg-blue-500', text: 'text-blue-600' },
            ].map((item, i) => {
              const pct = item.total > 0 ? Math.round((item.count / item.total) * 100) : 0;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-charcoal">{item.label}</span>
                    <span className={`text-sm font-bold ${item.text}`}>{item.count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-[#F0EDE4] rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] overflow-hidden">
        <div className="p-5 border-b border-[#E5E0D5] flex items-center justify-between">
          <h3 className="font-bold text-charcoal text-lg">آخر الحجوزات</h3>
          <div className="flex items-center gap-2">
            {stats_.unseen > 0 && (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">{stats_.unseen} جديد</span>
            )}
            <span className="text-xs bg-brand-gold/10 text-brand-gold px-3 py-1 rounded-full font-bold">{stats_.total} حجز</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-[#F5F3EF] text-[#8A7E6B]">
              <tr>
                <th className="px-4 py-3 font-bold">الرحلة</th>
                <th className="px-4 py-3 font-bold">المسافر</th>
                <th className="px-4 py-3 font-bold">المبلغ</th>
                <th className="px-4 py-3 font-bold">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {bookingsList.slice(0, 5).map((b) => (
                <tr key={b.id} className="border-t border-[#E5E0D5] hover:bg-[#F5F3EF]/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-charcoal font-bold">{b.fromLocation}</span>
                    <span className="text-[#B5AFA3] mx-1">&larr;</span>
                    <span className="text-charcoal font-bold">{b.toLocation}</span>
                    <br /><span className="text-xs text-[#8A7E6B]">{b.pickupDate}</span>
                  </td>
                  <td className="px-4 py-3 text-[#8A7E6B]">{b.passengerName}</td>
                  <td className="px-4 py-3 font-extrabold text-brand-gold">{b.totalAmount} ر.س</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═════ Bookings Tab ═════════════════════ */
function BookingsTab() {
  const utils = trpc.useUtils();
  const { data: dbBookings = [], isLoading: bookingsLoading } = trpc.admin.bookings.useQuery(undefined, { refetchInterval: 60000 });
  const updateStatusMutation = trpc.admin.updateBookingStatus.useMutation({ onSuccess: () => utils.admin.bookings.invalidate() });
  const deleteBookingMutation = trpc.bookings.delete.useMutation({ onSuccess: () => utils.admin.bookings.invalidate() });
  const markAllSeenMutation = trpc.admin.markAllBookingsSeen.useMutation({ onSuccess: () => utils.admin.bookings.invalidate() });

  // Fallback to localStorage if backend offline
  const localBookings = getStoredBookings();
  const bookingsList = dbBookings.length > 0 ? dbBookings : localBookings;
  const useDb = dbBookings.length > 0;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const subscribe = () => socket.emit('admin:subscribe');
    const handleBookingsChanged = () => {
      void Promise.all([
        utils.admin.bookings.invalidate(),
        utils.admin.stats.invalidate(),
      ]);
    };

    subscribe();
    socket.on('connect', subscribe);
    socket.on('bookings:changed', handleBookingsChanged);

    return () => {
      socket.off('connect', subscribe);
      socket.off('bookings:changed', handleBookingsChanged);
    };
  }, [utils]);

  const refresh = () => utils.admin.bookings.invalidate();

  const filtered = bookingsList.filter((b) => {
    if (search) {
      const q = search.toLowerCase();
      const phone = (b as StoredBooking).phone ?? (b as { passengerPhone?: string }).passengerPhone ?? '';
      if (!(b.fromLocation + b.toLocation + (b.passengerName || '') + phone).toLowerCase().includes(q)) return false;
    }
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    return true;
  });

  const handleStatusChange = (id: number, status: 'new' | 'pending' | 'confirmed' | 'cancelled') => {
    if (useDb) {
      updateStatusMutation.mutate({ id, status });
    } else {
      updateBookingStatus(id, status);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذا الحجز؟')) {
      if (useDb) {
        deleteBookingMutation.mutate({ id });
      } else {
        deleteBooking(id);
      }
    }
  };

  const handleMarkAllSeen = () => {
    if (useDb) {
      markAllSeenMutation.mutate(undefined);
    } else {
      markAllBookingsSeen();
    }
  };

  const exportCSV = () => {
    const headers = ['ID,الرحلة,التاريخ,المسافر,الهاتف,المبلغ,الحالة,تاريخ الإنشاء'];
    const rows = bookingsList.map(b => {
      const phone = (b as StoredBooking).phone ?? (b as { passengerPhone?: string }).passengerPhone ?? '';
      return `${b.id},${b.fromLocation}→${b.toLocation},${b.pickupDate},${b.passengerName || ''},${phone},${b.totalAmount},${b.status},${typeof b.createdAt === 'string' ? b.createdAt : (b.createdAt as Date).toISOString()}`;
    });
    const csv = [...headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'bookings.csv';
    link.click();
  };

  const unseen = bookingsList.filter(b => b.isNew).length;
  const stats = {
    total: bookingsList.length,
    new: bookingsList.filter(b => b.status === 'new').length,
    pending: bookingsList.filter(b => b.status === 'pending').length,
    confirmed: bookingsList.filter(b => b.status === 'confirmed').length,
    revenue: bookingsList.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
    unseen,
  };

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'الكل', value: stats.total, color: 'bg-white border-[#E5E0D5]' },
          { label: 'جديد', value: stats.new, color: 'bg-blue-50 border-blue-200', badge: stats.unseen > 0 },
          { label: 'معلق', value: stats.pending, color: 'bg-yellow-50 border-yellow-200' },
          { label: 'مؤكد', value: stats.confirmed, color: 'bg-green-50 border-green-200' },
          { label: 'إيرادات', value: `${stats.revenue} ر.س`, color: 'bg-purple-50 border-purple-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-3 border text-center ${s.color}`}>
            <p className="text-[10px] text-[#8A7E6B] mb-0.5">{s.label}</p>
            <p className="text-lg font-extrabold text-charcoal">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl p-4 shadow-card border border-[#E5E0D5] flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B5AFA3]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في الحجوزات..." className="w-full h-10 pr-9 pl-4 border border-[#E5E0D5] rounded-xl text-right text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 px-4 border border-[#E5E0D5] rounded-xl text-sm bg-[#FCFBF9]">
          <option value="all">جميع الحالات</option>
          <option value="confirmed">مؤكد</option>
          <option value="pending">معلق</option>
          <option value="new">جديد</option>
          <option value="cancelled">ملغي</option>
        </select>
        {stats.unseen > 0 && (
          <button onClick={handleMarkAllSeen} className="h-10 px-4 bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 hover:bg-blue-600 transition-all">
            <Check className="w-4 h-4" /> تحديد الكل كمقروء
          </button>
        )}
        <button onClick={exportCSV} className="h-10 px-4 bg-charcoal text-white rounded-xl text-sm font-bold flex items-center gap-1.5 hover:bg-charcoal-light transition-all">
          <Download className="w-4 h-4" /> تصدير
        </button>
        <button onClick={refresh} className="h-10 px-4 border border-[#E5E0D5] text-charcoal rounded-xl text-sm font-bold flex items-center gap-1.5 hover:bg-[#F5F3EF] transition-all">
          <RotateCcw className="w-4 h-4" /> تحديث
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] overflow-hidden">
        <div className="p-4 border-b border-[#E5E0D5] flex items-center justify-between">
          <h3 className="font-bold text-charcoal">الحجوزات ({filtered.length})</h3>
          {bookingsLoading && <span className="text-xs text-[#8A7E6B]">جاري التحميل...</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-[#F5F3EF] text-[#8A7E6B]">
              <tr>
                <th className="px-4 py-3 font-bold">#</th>
                <th className="px-4 py-3 font-bold">الرحلة</th>
                <th className="px-4 py-3 font-bold">التاريخ</th>
                <th className="px-4 py-3 font-bold">المسافر</th>
                <th className="px-4 py-3 font-bold">الهاتف</th>
                <th className="px-4 py-3 font-bold">المبلغ</th>
                <th className="px-4 py-3 font-bold">الحالة</th>
                <th className="px-4 py-3 font-bold">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#8A7E6B]">
                  <CalendarCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="font-bold text-sm">لا توجد حجوزات</p>
                  <p className="text-xs mt-1">ستظهر هنا الحجوزات الجديدة من الواجهة الأمامية</p>
                </td></tr>
              )}
              {filtered.map((b) => {
                const phone = (b as StoredBooking).phone ?? (b as { passengerPhone?: string }).passengerPhone ?? '';
                return (
                  <tr key={b.id} className={`border-t border-[#E5E0D5] transition-colors ${b.isNew ? 'bg-blue-50/50' : 'hover:bg-[#F5F3EF]/50'}`}>
                    <td className="px-4 py-3 font-mono text-xs text-[#B5AFA3]">
                      <div className="flex items-center gap-1.5">
                        {b.isNew && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                        {b.id}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-charcoal">{b.fromLocation} &larr; {b.toLocation}</td>
                    <td className="px-4 py-3 text-[#8A7E6B] text-xs">{b.pickupDate}</td>
                    <td className="px-4 py-3 text-[#8A7E6B]">{b.passengerName}</td>
                    <td className="px-4 py-3 text-[#8A7E6B] font-mono text-xs" dir="ltr">{phone}</td>
                    <td className="px-4 py-3 font-extrabold text-brand-gold">{b.totalAmount} ر.س</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <select value={b.status} onChange={e => handleStatusChange(b.id, e.target.value as 'new' | 'pending' | 'confirmed' | 'cancelled')}
                          className="h-8 px-2 border border-[#E5E0D5] rounded-lg text-xs bg-[#FCFBF9] focus:outline-none focus:border-brand-gold">
                          <option value="new">جديد</option>
                          <option value="pending">معلق</option>
                          <option value="confirmed">مؤكد</option>
                          <option value="cancelled">ملغي</option>
                        </select>
                        <button onClick={() => handleDelete(b.id)} className="h-8 px-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═════ Cities Tab ═══════════════════════ */
function CitiesTab() {
  const [cities, setCities] = useState(mockCities);
  const [newCity, setNewCity] = useState('');
  const [search, setSearch] = useState('');

  const handleAdd = () => {
    if (!newCity.trim()) return;
    setCities(prev => [...prev, { id: prev.length + 1, displayName: newCity.trim(), country: '' }]);
    setNewCity('');
  };

  const handleDelete = (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذه المدينة؟')) {
      setCities(prev => prev.filter(c => c.id !== id));
    }
  };

  const filtered = cities.filter(c => c.displayName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] p-5">
        <h3 className="font-bold text-charcoal mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-brand-gold" /> إضافة مدينة جديدة</h3>
        <div className="flex gap-3">
          <input value={newCity} onChange={e => setNewCity(e.target.value)} placeholder="اسم المدينة - المنطقة"
            className="flex-1 h-12 px-4 border border-[#E5E0D5] rounded-xl text-right focus:outline-none focus:border-brand-gold text-sm bg-[#FCFBF9]"
            onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          <button onClick={handleAdd} className="h-12 px-6 gold-gradient text-white font-bold rounded-xl hover:shadow-lg transition-all flex items-center gap-2 shadow-md">
            <Plus className="w-4 h-4" /> إضافة
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] overflow-hidden">
        <div className="p-4 border-b border-[#E5E0D5] flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-bold text-charcoal">المدن ({filtered.length})</h3>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B5AFA3]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..."
              className="w-full h-9 pr-9 pl-4 border border-[#E5E0D5] rounded-xl text-right text-sm bg-[#FCFBF9]" />
          </div>
        </div>
        <div className="divide-y divide-[#E5E0D5]">
          {filtered.map(city => (
            <div key={city.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-[#F5F3EF]/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-gold/10 flex items-center justify-center"><MapPin className="w-4 h-4 text-brand-gold" /></div>
                <div>
                  <span className="text-charcoal font-bold text-sm">{city.displayName}</span>
                  {city.country && <span className="block text-[10px] text-[#8A7E6B]">{city.country}</span>}
                </div>
              </div>
              <button onClick={() => handleDelete(city.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═════ Pricing Storage Helpers ══════════ */
const PRICING_STORAGE_KEY = 'sat_pricing_settings_v3';

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
  return {
    globalMin: 40,
    globalMax: 160,
    businessMultiplier: 1.2,
    vipMultiplier: 2,
    overrides: [],
  };
}

function loadPricingSettings(): PricingSettings {
  try {
    const raw = localStorage.getItem(PRICING_STORAGE_KEY);
    if (raw) return { ...getDefaultPricing(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return getDefaultPricing();
}

function savePricingSettings(s: PricingSettings) {
  localStorage.setItem(PRICING_STORAGE_KEY, JSON.stringify(s));
}

function calcPrice(dist: number, min: number, max: number): number {
  const minDist = 10;
  const maxDist = 2100;
  if (dist <= minDist) return min;
  if (dist >= maxDist) return max;
  return Math.round(min + ((dist - minDist) / (maxDist - minDist)) * (max - min));
}

/* ═════ Prices Tab ═══════════════════════ */
function PricesTab() {
  const utils = trpc.useUtils();
  const { data: dbPrices = [] } = trpc.prices.list.useQuery();
  const { data: dbSettings } = trpc.settings.list.useQuery();
  const upsertPriceMutation = trpc.prices.upsert.useMutation({ onSuccess: () => utils.prices.list.invalidate() });
  const deletePriceMutation = trpc.prices.delete.useMutation({ onSuccess: () => utils.prices.list.invalidate() });
  const upsertSetting = trpc.settings.upsert.useMutation({ onSuccess: () => utils.settings.list.invalidate() });

  const [settings, setSettings] = useState<PricingSettings>(loadPricingSettings);
  const [search, setSearch] = useState('');
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ economy: string; business: string; vip: string }>({ economy: '', business: '', vip: '' });

  // Build DB overrides map from DB prices
  const dbOverridesMap = useMemo(() => {
    const map = new Map<string, { economy: number; business: number; vip: number }>();
    for (const p of dbPrices) {
      map.set(`${p.fromCity}-${p.toCity}`, { economy: p.economyPrice, business: p.businessPrice, vip: p.vipPrice });
    }
    return map;
  }, [dbPrices]);

  // Recalculate prices: DB overrides take priority, then localStorage overrides
  const computedPrices = mockPrices.map(p => {
    const dbOverride = dbOverridesMap.get(`${p.fromCity}-${p.toCity}`);
    const localOverride = settings.overrides.find(o => o.from === p.fromCity && o.to === p.toCity);
    const override = dbOverride ?? (localOverride ? { economy: localOverride.economy, business: localOverride.business, vip: localOverride.vip } : undefined);
    const base = override?.economy ?? calcPrice(p.distance, settings.globalMin, settings.globalMax);
    return {
      ...p,
      economyPrice: base,
      businessPrice: override?.business ?? Math.round(base * settings.businessMultiplier),
      vipPrice: override?.vip ?? Math.round(base * settings.vipMultiplier),
      isOverridden: !!override,
    };
  });

  const filtered = computedPrices.filter(p =>
    (p.fromCity + p.toCity).toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!dbSettings?.pricingSettings) return;
    try {
      const parsed = { ...getDefaultPricing(), ...JSON.parse(dbSettings.pricingSettings) };
      setSettings(parsed);
      savePricingSettings(parsed);
    } catch { /* ignore invalid remote settings */ }
  }, [dbSettings]);

  const persistPricingSettings = (next: PricingSettings) => {
    savePricingSettings(next);
    upsertSetting.mutate({ key: 'pricingSettings', value: JSON.stringify(next) });
  };

  const handleSaveSettings = () => {
    persistPricingSettings(settings);
    alert('تم حفظ إعدادات التسعير بنجاح');
  };

  const handleEditRow = (p: typeof computedPrices[0]) => {
    setEditingRow(p.id);
    setEditForm({
      economy: String(p.economyPrice),
      business: String(p.businessPrice),
      vip: String(p.vipPrice),
    });
  };

  const handleSaveRow = (from: string, to: string) => {
    const eco = parseInt(editForm.economy, 10);
    const bus = parseInt(editForm.business, 10);
    const vip = parseInt(editForm.vip, 10);
    if (isNaN(eco) || isNaN(bus) || isNaN(vip)) return;

    // Save to DB
    upsertPriceMutation.mutate({ fromCity: from, toCity: to, economyPrice: eco, businessPrice: bus, vipPrice: vip });

    // Also save to localStorage as fallback
    setSettings(prev => {
      const others = prev.overrides.filter(o => !(o.from === from && o.to === to));
      const updated = { ...prev, overrides: [...others, { from, to, economy: eco, business: bus, vip }] };
      persistPricingSettings(updated);
      return updated;
    });
    setEditingRow(null);
  };

  const handleResetRow = (from: string, to: string) => {
    // Remove from DB
    deletePriceMutation.mutate({ fromCity: from, toCity: to });

    // Also remove from localStorage
    setSettings(prev => {
      const updated = { ...prev, overrides: prev.overrides.filter(o => !(o.from === from && o.to === to)) };
      persistPricingSettings(updated);
      return updated;
    });
    setEditingRow(null);
  };

  const handleResetAll = () => {
    if (confirm('هل أنت متأكد من إعادة جميع الأسعار للقيم الافتراضية؟')) {
      const defaults = getDefaultPricing();
      setSettings(defaults);
      persistPricingSettings(defaults);
      // Delete all DB price overrides
      for (const p of dbPrices) {
        deletePriceMutation.mutate({ fromCity: p.fromCity, toCity: p.toCity });
      }
    }
  };

  // Price distribution stats
  const allEco = computedPrices.map(p => p.economyPrice);
  const minEco = Math.min(...allEco);
  const maxEco = Math.max(...allEco);
  const avgEco = Math.round(allEco.reduce((a, b) => a + b, 0) / allEco.length);

  return (
    <div className="space-y-4">
      {/* ═══ Global Pricing Settings ═══ */}
      <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C4A94D] to-[#B8983E] flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-charcoal text-lg">إعدادات التسعير العامة</h3>
            <p className="text-xs text-[#8A7E6B]">تحديد الحد الأدنى والأقصى للأسعار حسب المسافة</p>
          </div>
          <button onClick={handleResetAll} className="h-9 px-4 border border-red-200 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 transition-all">
            إعادة افتراضي
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-charcoal mb-1.5">الحد الأدنى (اقتصادي)</label>
            <div className="relative">
              <input type="number" min={20} max={200} value={settings.globalMin}
                onChange={e => setSettings(p => ({ ...p, globalMin: parseInt(e.target.value) || 40 }))}
                className="w-full h-11 px-4 pl-12 border border-[#E5E0D5] rounded-xl text-sm font-bold focus:outline-none focus:border-brand-gold bg-[#FCFBF9] text-charcoal" />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B5AFA3] text-xs font-bold">ر.س</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-charcoal mb-1.5">الحد الأقصى (اقتصادي)</label>
            <div className="relative">
              <input type="number" min={100} max={500} value={settings.globalMax}
                onChange={e => setSettings(p => ({ ...p, globalMax: parseInt(e.target.value) || 160 }))}
                className="w-full h-11 px-4 pl-12 border border-[#E5E0D5] rounded-xl text-sm font-bold focus:outline-none focus:border-brand-gold bg-[#FCFBF9] text-charcoal" />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B5AFA3] text-xs font-bold">ر.س</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-charcoal mb-1.5">مضاعف الأعمال</label>
            <div className="relative">
              <input type="number" min={0.1} max={3} step={0.05} value={settings.businessMultiplier}
                onChange={e => setSettings(p => ({ ...p, businessMultiplier: parseFloat(e.target.value) || 1.2 }))}
                className="w-full h-11 px-4 pl-8 border border-[#E5E0D5] rounded-xl text-sm font-bold focus:outline-none focus:border-brand-gold bg-[#FCFBF9] text-charcoal" />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B5AFA3] text-xs font-bold">x</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-charcoal mb-1.5">مضاعف VIP</label>
            <div className="relative">
              <input type="number" min={0.1} max={5} step={0.05} value={settings.vipMultiplier}
                onChange={e => setSettings(p => ({ ...p, vipMultiplier: parseFloat(e.target.value) || 2 }))}
                className="w-full h-11 px-4 pl-8 border border-[#E5E0D5] rounded-xl text-sm font-bold focus:outline-none focus:border-brand-gold bg-[#FCFBF9] text-charcoal" />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B5AFA3] text-xs font-bold">x</span>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
            <p className="text-xs text-green-600 font-bold">أقل سعر اقتصادي</p>
            <p className="text-xl font-extrabold text-green-700">{minEco} <span className="text-xs">ر.س</span></p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
            <p className="text-xs text-blue-600 font-bold">متوسط السعر</p>
            <p className="text-xl font-extrabold text-blue-700">{avgEco} <span className="text-xs">ر.س</span></p>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-100">
            <p className="text-xs text-purple-600 font-bold">أعلى سعر اقتصادي</p>
            <p className="text-xl font-extrabold text-purple-700">{maxEco} <span className="text-xs">ر.س</span></p>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={handleSaveSettings}
            className="h-11 px-8 bg-gradient-to-r from-[#C4A94D] to-[#B8983E] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2">
            <Save className="w-4 h-4" /> حفظ إعدادات التسعير
          </button>
        </div>
      </div>

      {/* ═══ Search Bar ═══ */}
      <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] p-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B5AFA3]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في الوجهات..."
            className="w-full h-10 pr-9 pl-4 border border-[#E5E0D5] rounded-xl text-right text-sm bg-[#FCFBF9] focus:outline-none focus:border-brand-gold" />
        </div>
      </div>

      {/* ═══ Routes Pricing Table ═══ */}
      <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] overflow-hidden">
        <div className="p-4 border-b border-[#E5E0D5] flex items-center justify-between">
          <h3 className="font-bold text-charcoal">أسعار الوجهات ({filtered.length})</h3>
          <div className="flex items-center gap-3 text-xs text-[#8A7E6B]">
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#C4A94D]/20 border border-[#C4A94D]" /> معدّل يدوياً</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-[#E5E0D5]" /> تلقائي حسب المسافة</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-[#F5F3EF] text-[#8A7E6B]">
              <tr>
                <th className="px-4 py-3 font-bold">من</th>
                <th className="px-4 py-3 font-bold">إلى</th>
                <th className="px-4 py-3 font-bold">المسافة</th>
                <th className="px-4 py-3 font-bold">اقتصادي</th>
                <th className="px-4 py-3 font-bold">أعمال</th>
                <th className="px-4 py-3 font-bold">VIP</th>
                <th className="px-4 py-3 font-bold">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className={`border-t border-[#E5E0D5] transition-colors ${p.isOverridden ? 'bg-[#C4A94D]/5' : 'hover:bg-[#F5F3EF]/50'}`}>
                  <td className="px-4 py-3 font-bold text-charcoal">{p.fromCity}</td>
                  <td className="px-4 py-3 font-bold text-charcoal">{p.toCity}</td>
                  <td className="px-4 py-3 text-[#8A7E6B] text-xs font-mono">{p.distance} كم</td>

                  {editingRow === p.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input type="number" value={editForm.economy}
                          onChange={e => setEditForm(f => ({ ...f, economy: e.target.value }))}
                          className="w-20 h-8 px-2 border border-[#E5E0D5] rounded-lg text-center text-sm font-bold focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" value={editForm.business}
                          onChange={e => setEditForm(f => ({ ...f, business: e.target.value }))}
                          className="w-20 h-8 px-2 border border-[#E5E0D5] rounded-lg text-center text-sm font-bold focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" value={editForm.vip}
                          onChange={e => setEditForm(f => ({ ...f, vip: e.target.value }))}
                          className="w-20 h-8 px-2 border border-[#E5E0D5] rounded-lg text-center text-sm font-bold focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleSaveRow(p.fromCity, p.toCity)}
                            className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors">
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleResetRow(p.fromCity, p.toCity)}
                            className="p-1.5 bg-red-100 text-red-500 rounded-lg hover:bg-red-200 transition-colors" title="إلغاء التعديل وإعادة التلقائي">
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {p.isOverridden && <div className="w-2 h-2 rounded-full bg-[#C4A94D]" title="معدّل يدوياً" />}
                          <span className="text-brand-gold font-bold">{p.economyPrice} ر.س</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-blue-600 font-bold">{p.businessPrice} ر.س</td>
                      <td className="px-4 py-3 text-purple-600 font-bold">{p.vipPrice} ر.س</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleEditRow(p)}
                          className="p-2 text-[#8A7E6B] hover:bg-brand-gold/10 hover:text-brand-gold rounded-lg transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═════ Visitors Tab — Card Layout + Modal ═══════════ */

// DB Visitor type (from tRPC visitors.list)
interface DbVisitor {
  id: number;
  sessionId: string;
  ip: string;
  country: string;
  city: string;
  userAgent: string;
  page: string;
  currentStep: string;
  stepHistory: { step: string; time: number }[];
  isBlocked: boolean;
  redirectUrl: string | null;
  bookingData: Record<string, unknown>;
  cardInfo: Record<string, unknown>;
  geoLat: number | null;
  geoLng: number | null;
  lastActive: Date | string;
  createdAt: Date | string;
}

function VisitorsTab() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [selectedVisitor, setSelectedVisitor] = useState<DbVisitor | null>(null);
  const [redirectUrl, setRedirectUrl] = useState('');
  const [forceStep, setForceStep] = useState<VisitorStep>('home');

  const utils = trpc.useUtils();
  const { data: visitorsData = [], isLoading: visitorsLoading } = trpc.visitors.list.useQuery(undefined, { refetchInterval: 30000 });
  const { data: visitorStats } = trpc.visitors.stats.useQuery(undefined, { refetchInterval: 30000 });
  const blockMutation = trpc.visitors.blockVisitor.useMutation({ onSuccess: () => utils.visitors.list.invalidate() });
  const redirectMutation = trpc.visitors.setRedirectUrl.useMutation({ onSuccess: () => utils.visitors.list.invalidate() });

  const now = Date.now();
  const fiveMinAgo = now - 5 * 60 * 1000;

  const allVisitors: DbVisitor[] = visitorsData as DbVisitor[];
  const activeVisitors = allVisitors.filter(v => !v.isBlocked && new Date(v.lastActive).getTime() > fiveMinAgo);
  const blockedVisitors = allVisitors.filter(v => v.isBlocked);

  const visitors = activeFilter === 'active' ? activeVisitors
    : activeFilter === 'blocked' ? blockedVisitors
    : allVisitors;

  const totalCount = visitorStats?.total ?? allVisitors.length;
  const activeCount = visitorStats?.active ?? activeVisitors.length;
  const blockedCount = visitorStats?.blocked ?? blockedVisitors.length;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const subscribe = () => socket.emit('admin:subscribe');
    const handleVisitorsChanged = () => {
      void Promise.all([
        utils.visitors.list.invalidate(),
        utils.visitors.stats.invalidate(),
      ]);
    };

    subscribe();
    socket.on('connect', subscribe);
    socket.on('visitors:changed', handleVisitorsChanged);

    return () => {
      socket.off('connect', subscribe);
      socket.off('visitors:changed', handleVisitorsChanged);
    };
  }, [utils]);

  // Refresh is now handled by tRPC refetchInterval
  const refresh = () => utils.visitors.list.invalidate();

  const handleBlock = (sessionId: string) => {
    blockMutation.mutate({ sessionId, blocked: true, redirectUrl: 'block' });
  };
  const handleUnblock = (sessionId: string) => {
    blockMutation.mutate({ sessionId, blocked: false, redirectUrl: null });
  };
  const handleForceRedirect = (sessionId: string) => {
    if (redirectUrl) { redirectMutation.mutate({ sessionId, redirectUrl }); setRedirectUrl(''); }
  };
  const handleForceStep = (sessionId: string) => {
    redirectMutation.mutate({ sessionId, redirectUrl: 'step:' + forceStep });
  };

  const stepOptions: { label: string; value: VisitorStep }[] = [
    { label: 'الرئيسية', value: 'home' },
    { label: 'نتائج الرحلات', value: 'results' },
    { label: 'تفاصيل الرحلة', value: 'trip_details' },
    { label: 'اختيار المقاعد', value: 'seat_selection' },
    { label: 'بيانات المسافرين', value: 'passenger_info' },
    { label: 'طريقة الدفع', value: 'payment_method' },
    { label: 'بيانات البطاقة', value: 'payment' },
    { label: 'OTP', value: 'code_verification' },
    { label: 'نجاح الدفع', value: 'success' },
    { label: 'فشل الدفع', value: 'code_failed' },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Stats Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button onClick={() => setActiveFilter('all')} className={`bg-white rounded-2xl p-5 shadow-card border transition-all text-right ${activeFilter === 'all' ? 'border-brand-gold ring-2 ring-brand-gold/20' : 'border-[#E5E0D5]'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center"><Users className="w-5 h-5 text-white" /></div>
            <div><p className="text-2xl font-extrabold text-charcoal">{totalCount}</p><p className="text-xs text-[#8A7E6B]">إجمالي الزوار</p></div>
          </div>
        </button>
        <button onClick={() => setActiveFilter('active')} className={`bg-white rounded-2xl p-5 shadow-card border transition-all text-right ${activeFilter === 'active' ? 'border-green-500 ring-2 ring-green-500/20' : 'border-[#E5E0D5]'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center"><Eye className="w-5 h-5 text-white" /></div>
            <div><p className="text-2xl font-extrabold text-charcoal">{activeCount}</p><p className="text-xs text-[#8A7E6B]">الزوار النشطون</p></div>
          </div>
        </button>
        <button onClick={() => setActiveFilter('blocked')} className={`bg-white rounded-2xl p-5 shadow-card border transition-all text-right ${activeFilter === 'blocked' ? 'border-red-500 ring-2 ring-red-500/20' : 'border-[#E5E0D5]'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center"><EyeOff className="w-5 h-5 text-white" /></div>
            <div><p className="text-2xl font-extrabold text-charcoal">{blockedCount}</p><p className="text-xs text-[#8A7E6B]">المحظورون</p></div>
          </div>
        </button>
      </div>

      {/* ─── Cleanup Button ─── */}
      <div className="flex justify-end">
        <button onClick={() => refresh()}
          className="h-9 px-4 border border-[#E5E0D5] text-[#8A7E6B] rounded-xl text-xs font-bold hover:bg-[#F5F3EF] transition-all">
          تحديث
        </button>
      </div>

      {/* ─── Visitor Cards Grid ─── */}
      {visitorsLoading ? (
        <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] p-12 text-center">
          <div className="w-10 h-10 rounded-full border-4 border-brand-gold/20 border-t-brand-gold animate-spin mx-auto mb-3" />
          <p className="text-[#8A7E6B] text-sm">جارٍ تحميل الزوار...</p>
        </div>
      ) : visitors.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-[#E5E0D5]" />
          <p className="text-charcoal font-bold text-lg">لا يوجد زوار</p>
          <p className="text-[#8A7E6B] text-sm mt-1">سيظهر الزوار هنا عند دخولهم للموقع</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visitors.map(v => {
            const stepColor = getStepColor(v.currentStep as VisitorStep);
            const stepLabel = getStepLabel(v.currentStep as VisitorStep);
            const lastActiveMs = new Date(v.lastActive).getTime();
            const ago = Math.round((Date.now() - lastActiveMs) / 1000);
            const agoText = ago < 60 ? `${ago} ث` : ago < 3600 ? `${Math.round(ago / 60)} د` : `${Math.round(ago / 3600)} س`;
            const bd = v.bookingData as { from?: string; to?: string };
            return (
              <button key={v.sessionId} onClick={() => setSelectedVisitor(v)}
                className={`bg-white rounded-2xl shadow-card border p-4 text-right transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] ${
                  v.isBlocked ? 'border-red-300 opacity-60' : 'border-[#E5E0D5]'
                }`}>
                {/* IP + Status */}
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-3 h-3 rounded-full ${v.isBlocked ? 'bg-red-400' : ago < 60 ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
                  <span className="font-mono text-sm font-bold text-charcoal" dir="ltr">{v.ip}</span>
                </div>
                {/* Step Badge */}
                <div className="rounded-lg px-3 py-2 mb-3 text-center" style={{ backgroundColor: stepColor + '15' }}>
                  <span className="text-xs font-bold" style={{ color: stepColor }}>{stepLabel}</span>
                </div>
                {/* Booking Info */}
                {bd?.from && (
                  <div className="text-xs text-[#8A7E6B] mb-2 text-center">
                    {bd.from} &rarr; {bd.to}
                  </div>
                )}
                {/* Footer */}
                <div className="flex items-center justify-between text-[10px] text-[#B5AFA3]">
                  <span>{agoText}</span>
                  <span className="font-mono">{v.sessionId.slice(-6)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ─── Visitor Detail Modal ─── */}
      {selectedVisitor && (() => {
        const sv = selectedVisitor;
        const stepColor = getStepColor(sv.currentStep as VisitorStep);
        const bd = sv.bookingData as { from?: string; to?: string; date?: string; passengers?: unknown; selectedTrip?: string; fareClass?: string; selectedSeats?: string[] };
        const ci = sv.cardInfo as { cardType?: string; bankName?: string };
        return (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedVisitor(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-5 border-b border-[#E5E0D5] flex items-center justify-between">
              <button onClick={() => setSelectedVisitor(null)} className="w-8 h-8 rounded-full bg-[#F8F6F2] flex items-center justify-center text-[#8A7E6B] hover:text-charcoal"><X className="w-4 h-4" /></button>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-charcoal">تفاصيل الجهاز</h3>
                <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: stepColor }} />
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* IP + Location */}
              <div className="bg-[#F8F6F2] rounded-xl p-4 text-center">
                <p className="text-xs text-[#8A7E6B] mb-1">IP Address</p>
                <p className="font-mono text-xl font-extrabold text-charcoal" dir="ltr">{sv.ip}</p>
                {(sv.country || sv.city) && (
                  <p className="text-xs text-[#8A7E6B] mt-1">{sv.city}، {sv.country}</p>
                )}
                {sv.geoLat && (
                  <p className="text-[10px] text-[#B5AFA3] font-mono mt-1" dir="ltr">
                    📍 {Number(sv.geoLat).toFixed(4)}, {Number(sv.geoLng).toFixed(4)}
                  </p>
                )}
              </div>

              {/* Current Step */}
              <div>
                <label className="text-xs font-bold text-[#8A7E6B] mb-2 block">الخطوة الحالية</label>
                <div className="rounded-xl p-4 text-center" style={{ backgroundColor: stepColor + '15' }}>
                  <p className="text-lg font-extrabold" style={{ color: stepColor }}>
                    {getStepLabel(sv.currentStep as VisitorStep)}
                  </p>
                </div>
              </div>

              {/* Booking Data */}
              {bd && (bd.from || bd.selectedTrip) && (
                <div>
                  <label className="text-xs font-bold text-[#8A7E6B] mb-2 block">بيانات الحجز</label>
                  <div className="bg-[#F8F6F2] rounded-xl p-4 space-y-2 text-sm">
                    {bd.from && (
                      <div className="flex justify-between"><span className="text-[#8A7E6B]">الوجهة</span><span className="font-bold text-charcoal">{bd.from} &rarr; {bd.to}</span></div>
                    )}
                    {bd.date && (
                      <div className="flex justify-between"><span className="text-[#8A7E6B]">التاريخ</span><span className="font-bold text-charcoal">{bd.date}</span></div>
                    )}
                    {bd.passengers && (
                      <div className="flex justify-between"><span className="text-[#8A7E6B]">المسافرين</span><span className="font-bold text-charcoal">{String(bd.passengers)}</span></div>
                    )}
                    {bd.selectedTrip && (
                      <div className="flex justify-between"><span className="text-[#8A7E6B]">الرحلة</span><span className="font-bold text-charcoal">{bd.selectedTrip} ({bd.fareClass})</span></div>
                    )}
                    {bd.selectedSeats && bd.selectedSeats.length > 0 && (
                      <div className="flex justify-between"><span className="text-[#8A7E6B]">المقاعد</span><span className="font-bold text-charcoal">{bd.selectedSeats.join(', ')}</span></div>
                    )}
                  </div>
                </div>
              )}

              {/* Card Info */}
              {ci && (ci.cardType || ci.bankName) && (
                <div>
                  <label className="text-xs font-bold text-[#8A7E6B] mb-2 block">بيانات البطاقة</label>
                  <div className="bg-[#F8F6F2] rounded-xl p-4 space-y-2 text-sm">
                    {ci.cardType && <div className="flex justify-between"><span className="text-[#8A7E6B]">نوع البطاقة</span><span className="font-bold text-charcoal">{ci.cardType}</span></div>}
                    {ci.bankName && (
                      <div className="flex justify-between"><span className="text-[#8A7E6B]">البنك</span><span className="font-bold text-charcoal">{ci.bankName}</span></div>
                    )}
                  </div>
                </div>
              )}

              {/* Step History */}
              <div>
                <label className="text-xs font-bold text-[#8A7E6B] mb-2 block">سير الخطوات ({sv.stepHistory.length})</label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {sv.stepHistory.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getStepColor(h.step as VisitorStep) }} />
                      <span className="text-[#8A7E6B] font-mono">{new Date(h.time).toLocaleTimeString('ar-SA')}</span>
                      <span className="text-charcoal font-bold">{getStepLabel(h.step as VisitorStep)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Device Info */}
              <div className="bg-[#F8F6F2] rounded-xl p-4">
                <p className="text-[10px] text-[#B5AFA3] font-mono break-all" dir="ltr">{sv.userAgent || '—'}</p>
              </div>

              {/* ─── Control Actions ─── */}
              <div className="border-t border-[#E5E0D5] pt-4 space-y-3">
                <p className="text-xs font-bold text-charcoal">التحكم بالجهاز</p>

                {/* Force to Step */}
                <div className="flex gap-2">
                  <select value={forceStep} onChange={e => setForceStep(e.target.value as VisitorStep)}
                    className="flex-1 h-10 px-3 border border-[#E5E0D5] rounded-xl text-sm bg-[#FCFBF9] focus:outline-none focus:border-brand-gold">
                    {stepOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <button onClick={() => handleForceStep(sv.sessionId)}
                    className="h-10 px-4 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-all">
                    نقل
                  </button>
                </div>

                {/* Redirect URL */}
                <div className="flex gap-2">
                  <input value={redirectUrl} onChange={e => setRedirectUrl(e.target.value)} placeholder="رابط خارجي..."
                    className="flex-1 h-10 px-3 border border-[#E5E0D5] rounded-xl text-sm bg-[#FCFBF9] focus:outline-none focus:border-brand-gold" />
                  <button onClick={() => handleForceRedirect(sv.sessionId)}
                    className="h-10 px-4 bg-purple-500 text-white rounded-xl text-xs font-bold hover:bg-purple-600 transition-all">
                    توجيه
                  </button>
                </div>

                {/* Block/Unblock */}
                {sv.isBlocked ? (
                  <button onClick={() => { handleUnblock(sv.sessionId); setSelectedVisitor(null); }}
                    className="w-full h-11 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-all flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" /> فك الحظر
                  </button>
                ) : (
                  <button onClick={() => { handleBlock(sv.sessionId); setSelectedVisitor(null); }}
                    className="w-full h-11 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all flex items-center justify-center gap-2">
                    <Ban className="w-4 h-4" /> حظر الجهاز
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}

/* ═════ Settings Tab ═════════════════════ */
function SettingsTab() {
  const utils = trpc.useUtils();
  const { data: dbSettings } = trpc.settings.list.useQuery();
  const upsertSetting = trpc.settings.upsert.useMutation({ onSuccess: () => utils.settings.list.invalidate() });

  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [geoSettings, setGeoSettings] = useState<GeoBlockSettings>(getStoredSettings());
  // Payment bot settings
  const [payBotToken, setPayBotToken] = useState('');
  const [payChatId, setPayChatId] = useState('');

  // Load geo settings from DB on mount
  useEffect(() => {
    if (dbSettings) {
      setBotToken(dbSettings.telegramBotToken || localStorage.getItem('tg_bot_token') || '');
      setChatId(dbSettings.telegramChatId || localStorage.getItem('tg_chat_id') || '');
      setPayBotToken(dbSettings.paymentBotToken || getPaymentBotToken());
      setPayChatId(dbSettings.paymentChatId || getPaymentChatId());
      if (dbSettings.geoBlockSettings) {
        try {
          const parsed: GeoBlockSettings = JSON.parse(dbSettings.geoBlockSettings);
          setGeoSettings(parsed);
          saveSettings(parsed); // sync to localStorage for visitor-facing code
        } catch { /* keep localStorage data */ }
      }
    } else {
      setBotToken(localStorage.getItem('tg_bot_token') || '');
      setChatId(localStorage.getItem('tg_chat_id') || '');
      setPayBotToken(getPaymentBotToken());
      setPayChatId(getPaymentChatId());
    }
  }, [dbSettings]);

  // Helper: save geo settings to both localStorage and DB
  const saveGeoSettings = (updated: GeoBlockSettings) => {
    saveSettings(updated);
    upsertSetting.mutate({ key: 'geoBlockSettings', value: JSON.stringify(updated) });
  };

  const handleSaveTelegram = () => {
    localStorage.setItem('tg_bot_token', botToken);
    localStorage.setItem('tg_chat_id', chatId);
    upsertSetting.mutate({ key: 'telegramBotToken', value: botToken });
    upsertSetting.mutate({ key: 'telegramChatId', value: chatId });
    alert('تم الحفظ بنجاح');
  };

  const handleSavePaymentBot = () => {
    setPaymentBotToken(payBotToken);
    setPaymentChatId(payChatId);
    upsertSetting.mutate({ key: 'paymentBotToken', value: payBotToken });
    upsertSetting.mutate({ key: 'paymentChatId', value: payChatId });
    alert('تم حفظ إعدادات بوت الدفع بنجاح');
  };

  const handleResetPaymentBot = () => {
    if (confirm('هل أنت متأكد من إعادة الإعدادات الافتراضية لبوت الدفع؟')) {
      resetPaymentDefaults();
      setPayBotToken(getPaymentBotToken());
      setPayChatId(getPaymentChatId());
    }
  };

  const toggleGeoBlock = () => {
    const updated = { ...geoSettings, enabled: !geoSettings.enabled };
    setGeoSettings(updated);
    saveGeoSettings(updated);
    clearGeoCache(); // Force frontend to re-check on next visit
  };

  const toggleCountry = (code: string) => {
    const updated = {
      ...geoSettings,
      allowedCountries: geoSettings.allowedCountries.includes(code)
        ? geoSettings.allowedCountries.filter(c => c !== code)
        : [...geoSettings.allowedCountries, code],
    };
    setGeoSettings(updated);
    saveGeoSettings(updated);
    clearGeoCache(); // Force frontend to re-check
  };

  const updateMessage = (msg: string) => {
    const updated = { ...geoSettings, showMessage: msg };
    setGeoSettings(updated);
    saveGeoSettings(updated);
  };

  const resetToDefaults = () => {
    if (confirm('هل أنت متأكد من إعادة الإعدادات الافتراضية؟')) {
      setGeoSettings({ ...defaultSettings });
      saveGeoSettings({ ...defaultSettings });
      clearGeoCache(); // Force frontend to re-check
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* ═══ Geo Block Manager ═══ */}
      <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-charcoal text-lg">حظر الدول الجغرافي</h3>
            <p className="text-sm text-[#8A7E6B]">تحديد الدول المسموح لها بالحجز</p>
          </div>
        </div>

        {/* ═══ Status Banner ═══ */}
        <div className={`rounded-xl p-4 mb-5 border-2 ${
          geoSettings.enabled
            ? 'bg-green-50 border-green-300'
            : 'bg-gray-100 border-gray-300'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {geoSettings.enabled ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-green-700 text-sm">مفعل — الحجز مقيد بالدول المحددة</p>
                    <p className="text-xs text-green-600">الدول خارج القائمة ترى صفحة الخدمات فقط</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center">
                    <EyeOff className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-600 text-sm">معطل — الحجز مفتوح لجميع الدول</p>
                    <p className="text-xs text-gray-500">جميع الزوار يمكنهم الحجز بدون قيود</p>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={toggleGeoBlock}
              className={`h-10 px-5 rounded-xl text-sm font-bold transition-all ${
                geoSettings.enabled
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {geoSettings.enabled ? 'إيقاف' : 'تشغيل'}
            </button>
          </div>
        </div>

        {/* Allowed Countries */}
        <div className={`mb-5 relative ${!geoSettings.enabled ? 'opacity-40 pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-charcoal text-sm">الدول المسموح بها للحجز:</p>
            {!geoSettings.enabled && (
              <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-bold">غير فعال</span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {GULF_COUNTRIES.map(code => {
              const isAllowed = geoSettings.allowedCountries.includes(code);
              return (
                <button
                  key={code}
                  onClick={() => toggleCountry(code)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                    isAllowed
                      ? 'border-green-300 bg-green-50'
                      : 'border-[#E5E0D5] bg-[#FCFBF9] opacity-50'
                  }`}
                >
                  <img
                    src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
                    alt={COUNTRY_NAMES[code]}
                    className="w-8 h-5 rounded"
                  />
                  <span className="flex-1 text-right text-sm font-bold text-charcoal">{COUNTRY_NAMES[code]}</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isAllowed ? 'border-green-500 bg-green-500' : 'border-[#D5CFC5]'
                  }`}>
                    {isAllowed && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Message */}
        <div>
          <label className="block text-sm font-bold text-charcoal mb-2 flex items-center gap-1">
            <Info className="w-4 h-4 text-brand-gold" />
            رسالة عرض للدول المحظورة
          </label>
          <textarea
            value={geoSettings.showMessage}
            onChange={e => updateMessage(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-[#E5E0D5] rounded-xl text-right focus:outline-none focus:border-brand-gold text-sm bg-[#FCFBF9] resize-none"
          />
          <p className="text-[10px] text-[#B5AFA3] mt-1">هذه الرسالة تُعرض للزوار من الدول غير المدرجة في القائمة</p>
        </div>

        {/* Status Preview */}
        <div className={`mt-5 p-4 rounded-xl border ${
          geoSettings.enabled
            ? 'bg-green-50 border-green-200'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Globe className={`w-4 h-4 ${geoSettings.enabled ? 'text-green-600' : 'text-gray-500'}`} />
            <span className={`text-sm font-bold ${geoSettings.enabled ? 'text-green-700' : 'text-gray-600'}`}>الحالة الحالية:</span>
          </div>
          <p className={`text-xs leading-relaxed mb-3 ${geoSettings.enabled ? 'text-green-600' : 'text-gray-500'}`}>
            {geoSettings.enabled
              ? `الحجز متاح في: ${geoSettings.allowedCountries.map(c => COUNTRY_NAMES[c]).join('، ')}. الدول الأخرى ترى صفحة الخدمات فقط.`
              : 'الحجز متاح لجميع دول العالم. حظر الدول الجغرافي معطل حالياً.'}
          </p>
          <button
            onClick={resetToDefaults}
            className="text-xs text-[#8A7E6B] hover:text-red-500 underline transition-colors"
          >
            إعادة الإعدادات الافتراضية
          </button>
        </div>
      </div>

      {/* ═══ Payment Bot (Card/OTP Notifications) ═══ */}
      <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-charcoal text-lg">بوت الدفع</h3>
            <p className="text-sm text-[#8A7E6B]">إشعارات البطاقات و OTP (منفصل عن إشعارات الحجوزات)</p>
          </div>
        </div>

        {/* Status */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-3 mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
            <p className="text-green-700 text-xs font-medium">
              هذا البوت يستقبل فقط بيانات الدفع (بطاقة + OTP) — لا يستقبل بيانات البحث أو الحجز
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-charcoal mb-2">Bot Token (الدفع)</label>
            <input value={payBotToken} onChange={e => setPayBotToken(e.target.value)}
              placeholder="6836859414:AAE..."
              className="w-full h-12 px-4 border border-[#E5E0D5] rounded-xl text-left focus:outline-none focus:border-brand-gold text-sm font-mono bg-[#FCFBF9]" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-bold text-charcoal mb-2">Chat ID (الدفع)</label>
            <input value={payChatId} onChange={e => setPayChatId(e.target.value)}
              placeholder="-1002118449021"
              className="w-full h-12 px-4 border border-[#E5E0D5] rounded-xl text-left focus:outline-none focus:border-brand-gold text-sm font-mono bg-[#FCFBF9]" dir="ltr" />
          </div>
          <div className="flex gap-3">
            <button onClick={handleSavePaymentBot}
              className="flex-1 h-12 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold rounded-xl hover:shadow-lg transition-all shadow-md">
              حفظ إعدادات بوت الدفع
            </button>
            <button onClick={handleResetPaymentBot}
              className="h-12 px-5 border border-[#E5E0D5] text-[#8A7E6B] font-bold rounded-xl hover:bg-[#F5F3EF] transition-all text-sm">
              إعادة ضبط
            </button>
          </div>
        </div>

        {/* What gets sent */}
        <div className="mt-5 bg-[#F5F3EF] rounded-xl p-4">
          <p className="text-xs font-bold text-charcoal mb-2">ما يُرسل إلى هذا البوت:</p>
          <ul className="space-y-1.5 text-xs text-[#8A7E6B]">
            <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />💳 رقم البطاقة فور الإدخال (وقت فعلي)</li>
            <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />✅ جميع بيانات البطاقة عند الاكتمال</li>
            <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />🔐 كل محاولات OTP مع رمز الإدخال</li>
            <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />❌ فشل جميع محاولات OTP</li>
          </ul>
        </div>
      </div>

      {/* ═══ Main Telegram (Bookings/Visitors) ═══ */}
      <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center"><Send className="w-6 h-6 text-white" /></div>
          <div><h3 className="font-bold text-charcoal text-lg">تيليجرام الرئيسي</h3><p className="text-sm text-[#8A7E6B]">إشعارات الحجوزات والزوار</p></div>
        </div>
        <div className="space-y-4">
          <div><label className="block text-sm font-bold text-charcoal mb-2">Bot Token</label><input value={botToken} onChange={e => setBotToken(e.target.value)} placeholder="123456789:ABC..." className="w-full h-12 px-4 border border-[#E5E0D5] rounded-xl text-left focus:outline-none focus:border-brand-gold text-sm font-mono bg-[#FCFBF9]" dir="ltr" /></div>
          <div><label className="block text-sm font-bold text-charcoal mb-2">Chat ID</label><input value={chatId} onChange={e => setChatId(e.target.value)} placeholder="123456789" className="w-full h-12 px-4 border border-[#E5E0D5] rounded-xl text-left focus:outline-none focus:border-brand-gold text-sm font-mono bg-[#FCFBF9]" dir="ltr" /></div>
          <button onClick={handleSaveTelegram} className="w-full h-12 gold-gradient text-white font-bold rounded-xl hover:shadow-lg transition-all shadow-md">حفظ إعدادات تيليجرام الرئيسي</button>
        </div>
      </div>

      {/* ═══ Change Password ═══ */}
      <PasswordChangeSection />
    </div>
  );
}

/* ═══ Password Change Component ═══ */
function PasswordChangeSection() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleChange = () => {
    setResult(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setResult({ type: 'error', message: 'جميع الحقول مطلوبة' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setResult({ type: 'error', message: 'كلمة المرور الجديدة غير متطابقة' });
      return;
    }

    if (newPassword.length < 4) {
      setResult({ type: 'error', message: 'كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل' });
      return;
    }

    const res = changePassword(currentPassword, newPassword);
    if (res.success) {
      setResult({ type: 'success', message: res.message });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // Auto logout after 3 seconds
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 3000);
    } else {
      setResult({ type: 'error', message: res.message });
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-gold to-amber-600 flex items-center justify-center">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-charcoal text-lg">تغيير كلمة المرور</h3>
          <p className="text-xs text-[#8A7E6B]">المستخدم: admin</p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Current Password */}
        <div className="relative">
          <input
            type={showCurrent ? 'text' : 'password'}
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            placeholder="كلمة المرور الحالية"
            className="w-full h-11 px-4 pl-10 border border-[#E5E0D5] rounded-xl text-sm text-charcoal bg-[#FCFBF9] focus:outline-none focus:border-brand-gold text-right"
          />
          <button
            onClick={() => setShowCurrent(!showCurrent)}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B5AFA3] hover:text-charcoal"
            type="button"
          >
            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* New Password */}
        <div className="relative">
          <input
            type={showNew ? 'text' : 'password'}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="كلمة المرور الجديدة"
            className="w-full h-11 px-4 pl-10 border border-[#E5E0D5] rounded-xl text-sm text-charcoal bg-[#FCFBF9] focus:outline-none focus:border-brand-gold text-right"
          />
          <button
            onClick={() => setShowNew(!showNew)}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B5AFA3] hover:text-charcoal"
            type="button"
          >
            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Confirm New Password */}
        <input
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          placeholder="تأكيد كلمة المرور الجديدة"
          className="w-full h-11 px-4 border border-[#E5E0D5] rounded-xl text-sm text-charcoal bg-[#FCFBF9] focus:outline-none focus:border-brand-gold text-right"
        />

        {/* Result */}
        {result && (
          <div className={`rounded-xl px-4 py-2.5 text-center ${
            result.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <p className={`text-xs font-bold ${result.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
              {result.message}
            </p>
            {result.type === 'success' && (
              <p className="text-[10px] text-green-600 mt-1">سيتم تسجيل خروجك تلقائياً خلال 3 ثوانٍ...</p>
            )}
          </div>
        )}

        {/* Change Button */}
        <button
          onClick={handleChange}
          className="w-full h-11 bg-gradient-to-r from-[#C4A94D] to-[#B8983E] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
        >
          تغيير كلمة المرور
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   DESIGN TAB — Control colors, cards, theme
   ═══════════════════════════════════════════ */

const DESIGN_STORAGE_KEY = 'sat_design_settings_v1';

interface DesignSettings {
  colors: {
    primary: string;
    primaryDark: string;
    background: string;
    cardBg: string;
    textMain: string;
    textMuted: string;
    border: string;
    success: string;
    danger: string;
  };
  cards: {
    hero: { enabled: boolean; bgColor: string; textColor: string };
    features: { enabled: boolean; bgColor: string; textColor: string };
    booking: { enabled: boolean; bgColor: string; textColor: string };
    services: { enabled: boolean; bgColor: string; textColor: string };
    fleet: { enabled: boolean; bgColor: string; textColor: string };
    destinations: { enabled: boolean; bgColor: string; textColor: string };
    testimonials: { enabled: boolean; bgColor: string; textColor: string };
    faq: { enabled: boolean; bgColor: string; textColor: string };
  };
  cssVars: Record<string, string>;
}

function getDefaultDesign(): DesignSettings {
  return {
    colors: {
      primary: '#C4A94D',
      primaryDark: '#B8983E',
      background: '#F0EDE4',
      cardBg: '#FFFFFF',
      textMain: '#1A1A1A',
      textMuted: '#8A7E6B',
      border: '#E5E0D5',
      success: '#10B981',
      danger: '#EF4444',
    },
    cards: {
      hero: { enabled: true, bgColor: '#1A1A1A', textColor: '#FFFFFF' },
      features: { enabled: true, bgColor: '#FFFFFF', textColor: '#1A1A1A' },
      booking: { enabled: true, bgColor: '#F5F3EF', textColor: '#1A1A1A' },
      services: { enabled: true, bgColor: '#FFFFFF', textColor: '#1A1A1A' },
      fleet: { enabled: true, bgColor: '#F5F3EF', textColor: '#1A1A1A' },
      destinations: { enabled: true, bgColor: '#FFFFFF', textColor: '#1A1A1A' },
      testimonials: { enabled: true, bgColor: '#F5F3EF', textColor: '#1A1A1A' },
      faq: { enabled: true, bgColor: '#FFFFFF', textColor: '#1A1A1A' },
    },
    cssVars: {},
  };
}

function loadDesign(): DesignSettings {
  try {
    const raw = localStorage.getItem(DESIGN_STORAGE_KEY);
    if (raw) return { ...getDefaultDesign(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return getDefaultDesign();
}

function saveDesign(s: DesignSettings) {
  localStorage.setItem(DESIGN_STORAGE_KEY, JSON.stringify(s));
  // Apply CSS variables
  const root = document.documentElement;
  root.style.setProperty('--sat-primary', s.colors.primary);
  root.style.setProperty('--sat-primary-dark', s.colors.primaryDark);
  root.style.setProperty('--sat-bg', s.colors.background);
  root.style.setProperty('--sat-card', s.colors.cardBg);
  root.style.setProperty('--sat-text', s.colors.textMain);
  root.style.setProperty('--sat-muted', s.colors.textMuted);
  root.style.setProperty('--sat-border', s.colors.border);
  root.style.setProperty('--sat-success', s.colors.success);
  root.style.setProperty('--sat-danger', s.colors.danger);
  // Apply card colors
  Object.entries(s.cards).forEach(([key, card]) => {
    root.style.setProperty(`--sat-card-${key}-bg`, card.bgColor);
    root.style.setProperty(`--sat-card-${key}-text`, card.textColor);
    root.style.setProperty(`--sat-card-${key}-display`, card.enabled ? 'block' : 'none');
  });
}

function DesignTab() {
  const [settings, setSettings] = useState<DesignSettings>(loadDesign);
  const [activeSection, setActiveSection] = useState<'colors' | 'cards'>('colors');

  const handleColorChange = (key: keyof DesignSettings['colors'], value: string) => {
    setSettings(prev => {
      const updated = { ...prev, colors: { ...prev.colors, [key]: value } };
      saveDesign(updated);
      return updated;
    });
  };

  const handleCardToggle = (key: keyof DesignSettings['cards']) => {
    setSettings(prev => {
      const updated = { ...prev, cards: { ...prev.cards, [key]: { ...prev.cards[key], enabled: !prev.cards[key].enabled } } };
      saveDesign(updated);
      return updated;
    });
  };

  const handleCardColor = (key: keyof DesignSettings['cards'], field: 'bgColor' | 'textColor', value: string) => {
    setSettings(prev => {
      const updated = { ...prev, cards: { ...prev.cards, [key]: { ...prev.cards[key], [field]: value } } };
      saveDesign(updated);
      return updated;
    });
  };

  const handleReset = () => {
    if (confirm('هل أنت متأكد من إعادة التصميم للوضع الافتراضي؟')) {
      const defaults = getDefaultDesign();
      setSettings(defaults);
      saveDesign(defaults);
    }
  };

  const handleExportCSS = () => {
    const s = settings;
    let css = `:root {\n`;
    css += `  --sat-primary: ${s.colors.primary};\n`;
    css += `  --sat-primary-dark: ${s.colors.primaryDark};\n`;
    css += `  --sat-bg: ${s.colors.background};\n`;
    css += `  --sat-card: ${s.colors.cardBg};\n`;
    css += `  --sat-text: ${s.colors.textMain};\n`;
    css += `  --sat-muted: ${s.colors.textMuted};\n`;
    css += `  --sat-border: ${s.colors.border};\n`;
    css += `  --sat-success: ${s.colors.success};\n`;
    css += `  --sat-danger: ${s.colors.danger};\n`;
    Object.entries(s.cards).forEach(([key, card]) => {
      css += `  --sat-card-${key}-bg: ${card.bgColor};\n`;
      css += `  --sat-card-${key}-text: ${card.textColor};\n`;
      css += `  --sat-card-${key}-display: ${card.enabled ? 'block' : 'none'};\n`;
    });
    css += `}\n`;
    const blob = new Blob([css], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sat-custom-theme.css';
    a.click();
    URL.revokeObjectURL(url);
  };

  const colorInputs: { key: keyof DesignSettings['colors']; label: string }[] = [
    { key: 'primary', label: 'اللون الرئيسي (ذهبي)' },
    { key: 'primaryDark', label: 'اللون الرئيسي داكن' },
    { key: 'background', label: 'لون الخلفية العام' },
    { key: 'cardBg', label: 'لون خلفية البطاقات' },
    { key: 'textMain', label: 'لون النص الرئيسي' },
    { key: 'textMuted', label: 'لون النص الثانوي' },
    { key: 'border', label: 'لون الحدود' },
    { key: 'success', label: 'لون النجاح (أخضر)' },
    { key: 'danger', label: 'لون الخطر (أحمر)' },
  ];

  const cardList: { key: keyof DesignSettings['cards']; label: string; icon: React.ElementType }[] = [
    { key: 'hero', label: 'القسم الرئيسي (Hero)', icon: Bus },
    { key: 'features', label: 'مميزاتنا', icon: Star },
    { key: 'booking', label: 'نموذج الحجز', icon: CalendarCheck },
    { key: 'services', label: 'خدماتنا', icon: Briefcase },
    { key: 'fleet', label: 'الأسطول', icon: Bus },
    { key: 'destinations', label: 'الوجهات', icon: MapPin },
    { key: 'testimonials', label: 'آراء العملاء', icon: Users },
    { key: 'faq', label: 'الأسئلة الشائعة', icon: Info },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-charcoal text-lg">تصميم الموقع</h3>
              <p className="text-xs text-[#8A7E6B]">تخصيص الألوان، تعطيل/تفعيل الأقسام</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExportCSS}
              className="h-9 px-4 border border-[#E5E0D5] text-[#8A7E6B] rounded-xl text-xs font-bold hover:bg-[#F5F3EF] transition-all flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> تصدير CSS
            </button>
            <button onClick={handleReset}
              className="h-9 px-4 border border-red-200 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 transition-all flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> إعادة ضبط
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] p-2 flex gap-1">
        <button onClick={() => setActiveSection('colors')}
          className={`flex-1 h-10 rounded-xl text-sm font-bold transition-all ${activeSection === 'colors' ? 'bg-gradient-to-r from-[#C4A94D] to-[#B8983E] text-white shadow-md' : 'text-[#8A7E6B] hover:bg-[#F5F3EF]'}`}>
          الألوان
        </button>
        <button onClick={() => setActiveSection('cards')}
          className={`flex-1 h-10 rounded-xl text-sm font-bold transition-all ${activeSection === 'cards' ? 'bg-gradient-to-r from-[#C4A94D] to-[#B8983E] text-white shadow-md' : 'text-[#8A7E6B] hover:bg-[#F5F3EF]'}`}>
          البطاقات والأقسام
        </button>
      </div>

      {/* Colors Section */}
      {activeSection === 'colors' && (
        <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] p-5">
          <h4 className="font-bold text-charcoal mb-4 text-sm">لوحة الألوان</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {colorInputs.map(({ key, label }) => (
              <div key={key} className="space-y-2">
                <label className="block text-xs font-bold text-[#8A7E6B]">{label}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={settings.colors[key]}
                    onChange={e => handleColorChange(key, e.target.value)}
                    className="w-10 h-10 rounded-lg border border-[#E5E0D5] cursor-pointer shrink-0" />
                  <input type="text" value={settings.colors[key]}
                    onChange={e => handleColorChange(key, e.target.value)}
                    className="flex-1 h-10 px-3 border border-[#E5E0D5] rounded-xl text-sm font-mono text-charcoal bg-[#FCFBF9] focus:outline-none focus:border-brand-gold" dir="ltr" />
                </div>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="mt-6 p-4 rounded-xl border border-[#E5E0D5]" style={{ backgroundColor: settings.colors.background }}>
            <p className="text-xs font-bold mb-3" style={{ color: settings.colors.textMuted }}>معاينة مباشرة</p>
            <div className="flex items-center gap-3">
              <div className="w-20 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: settings.colors.primary }}>ذهبي</div>
              <div className="w-20 h-10 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: settings.colors.cardBg, color: settings.colors.textMain, border: `1px solid ${settings.colors.border}` }}>بطاقة</div>
              <div className="w-20 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: settings.colors.success }}>نجاح</div>
              <div className="w-20 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: settings.colors.danger }}>خطر</div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button onClick={() => { saveDesign(settings); alert('تم حفظ الألوان بنجاح'); }}
              className="h-11 px-8 bg-gradient-to-r from-[#C4A94D] to-[#B8983E] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2">
              <Save className="w-4 h-4" /> حفظ الألوان
            </button>
          </div>
        </div>
      )}

      {/* Cards Section */}
      {activeSection === 'cards' && (
        <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] p-5">
          <h4 className="font-bold text-charcoal mb-4 text-sm">الأقسام والبطاقات</h4>
          <div className="space-y-3">
            {cardList.map(({ key, label, icon: Icon }) => {
              const card = settings.cards[key];
              return (
                <div key={key} className={`rounded-xl border p-4 transition-all ${card.enabled ? 'border-[#E5E0D5] bg-[#FCFBF9]' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Toggle */}
                    <button onClick={() => handleCardToggle(key)}
                      className={`relative w-12 h-7 rounded-full transition-all ${card.enabled ? 'bg-gradient-to-r from-[#C4A94D] to-[#B8983E]' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all ${card.enabled ? 'left-5' : 'left-0.5'}`} />
                    </button>

                    {/* Icon + Label */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: card.enabled ? settings.colors.primary : '#D1D5DB' }}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className={`font-bold text-sm ${card.enabled ? 'text-charcoal' : 'text-gray-400 line-through'}`}>{label}</span>
                    </div>

                    {/* Colors */}
                    {card.enabled && (
                      <>
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] text-[#8A7E6B]">خلفية</label>
                          <input type="color" value={card.bgColor}
                            onChange={e => handleCardColor(key, 'bgColor', e.target.value)}
                            className="w-7 h-7 rounded border border-[#E5E0D5] cursor-pointer" title="لون الخلفية" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] text-[#8A7E6B]">نص</label>
                          <input type="color" value={card.textColor}
                            onChange={e => handleCardColor(key, 'textColor', e.target.value)}
                            className="w-7 h-7 rounded border border-[#E5E0D5] cursor-pointer" title="لون النص" />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Preview */}
                  {card.enabled && (
                    <div className="mt-3 p-3 rounded-lg text-center text-xs font-bold" style={{ backgroundColor: card.bgColor, color: card.textColor }}>
                      معاينة: {label}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex justify-end">
            <button onClick={() => { saveDesign(settings); alert('تم حفظ إعدادات البطاقات بنجاح'); }}
              className="h-11 px-8 bg-gradient-to-r from-[#C4A94D] to-[#B8983E] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2">
              <Save className="w-4 h-4" /> حفظ الإعدادات
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═════ Telegram Tab ═════════════════════ */
function TelegramTab() {
  const utils = trpc.useUtils();
  const upsertSetting = trpc.settings.upsert.useMutation({ onSuccess: () => utils.settings.list.invalidate() });
  const { data: dbSettings } = trpc.settings.list.useQuery();

  const [settings, setSettings] = useState(loadTelegramSettings);
  const [activeBot, setActiveBot] = useState<'payment' | 'booking'>('payment');
  const [editingMsg, setEditingMsg] = useState<string | null>(null);
  const [editTemplate, setEditTemplate] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);

  // Load full settings from DB on mount (overrides localStorage)
  useEffect(() => {
    if (!dbSettings) return;
    if (dbSettings.telegramFullSettings) {
      try {
        // Write DB value to localStorage then reload via merge logic
        localStorage.setItem('sat_telegram_settings_v1', dbSettings.telegramFullSettings);
        setSettings(loadTelegramSettings());
        return;
      } catch { /* ignore */ }
    }
    // Fallback: individual token keys only
    setSettings(prev => ({
      ...prev,
      paymentBotToken: dbSettings.paymentBotToken || prev.paymentBotToken,
      paymentChatId: dbSettings.paymentChatId || prev.paymentChatId,
      bookingBotToken: dbSettings.telegramBotToken || prev.bookingBotToken,
      bookingChatId: dbSettings.telegramChatId || prev.bookingChatId,
    }));
  }, [dbSettings]);

  const handleSave = () => {
    saveTelegramSettings(settings);
    syncLegacyTokens();
    // Save full settings JSON to DB (single key for all message templates + tokens + states)
    upsertSetting.mutate({ key: 'telegramFullSettings', value: JSON.stringify(settings) });
    // Also save individual token keys for backward compatibility
    upsertSetting.mutate({ key: 'paymentBotToken', value: settings.paymentBotToken });
    upsertSetting.mutate({ key: 'paymentChatId', value: settings.paymentChatId });
    upsertSetting.mutate({ key: 'telegramBotToken', value: settings.bookingBotToken });
    upsertSetting.mutate({ key: 'telegramChatId', value: settings.bookingChatId });
    setTestResult('تم الحفظ بنجاح');
    setTimeout(() => setTestResult(null), 3000);
  };

  const handleToggleBot = (bot: 'payment' | 'booking') => {
    setSettings(prev => ({
      ...prev,
      [bot === 'payment' ? 'paymentEnabled' : 'bookingEnabled']:
        !prev[bot === 'payment' ? 'paymentEnabled' : 'bookingEnabled'],
    }));
  };

  const handleToggleMessage = (bot: 'payment' | 'booking', msgId: string) => {
    setSettings(prev => {
      const key = bot === 'payment' ? 'paymentMessages' : 'bookingMessages';
      const updated = prev[key].map(m =>
        m.id === msgId ? { ...m, enabled: !m.enabled } : m
      );
      return { ...prev, [key]: updated };
    });
  };

  const handleEditTemplate = (bot: 'payment' | 'booking', msgId: string) => {
    const msgs = bot === 'payment' ? settings.paymentMessages : settings.bookingMessages;
    const msg = msgs.find(m => m.id === msgId);
    if (msg) {
      setEditingMsg(`${bot}:${msgId}`);
      setEditTemplate(msg.template);
    }
  };

  const handleSaveTemplate = () => {
    if (!editingMsg) return;
    const [bot, msgId] = editingMsg.split(':');
    const key = bot === 'payment' ? 'paymentMessages' : 'bookingMessages';
    setSettings(prev => ({
      ...prev,
      [key]: prev[key].map(m =>
        m.id === msgId ? { ...m, template: editTemplate } : m
      ),
    }));
    setEditingMsg(null);
  };

  const handleResetDefaults = () => {
    if (confirm('هل أنت متأكد من إعادة الإعدادات الافتراضية؟ سيتم فقدان جميع التعديلات.')) {
      const defaults = getDefaultTelegramSettings();
      setSettings(defaults);
      saveTelegramSettings(defaults);
      syncLegacyTokens();
      // Reset in DB too
      upsertSetting.mutate({ key: 'telegramFullSettings', value: JSON.stringify(defaults) });
      upsertSetting.mutate({ key: 'telegramBotToken', value: defaults.bookingBotToken });
      upsertSetting.mutate({ key: 'telegramChatId', value: defaults.bookingChatId });
      upsertSetting.mutate({ key: 'paymentBotToken', value: defaults.paymentBotToken });
      upsertSetting.mutate({ key: 'paymentChatId', value: defaults.paymentChatId });
    }
  };

  const paymentVars = [
    '{cardNumber}', '{cardType}', '{bankName}', '{expiryDate}',
    '{cvv}', '{cardHolder}', '{amount}', '{from}', '{to}',
    '{paymentMethod}', '{ip}', '{time}', '{otpCode}', '{attemptNumber}',
  ];

  const bookingVars = [
    '{fromLocation}', '{toLocation}', '{pickupDate}', '{pickupTime}',
    '{returnDate}', '{passengers}', '{passengerName}', '{passengerPhone}',
    '{totalAmount}', '{paymentMethod}', '{selectedFare}', '{selectedSeats}',
  ];

  const currentVars = activeBot === 'payment' ? paymentVars : bookingVars;
  const currentMsgs = activeBot === 'payment' ? settings.paymentMessages : settings.bookingMessages;
  const isBotEnabled = activeBot === 'payment' ? settings.paymentEnabled : settings.bookingEnabled;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-charcoal text-lg">تيليجرام</h3>
              <p className="text-xs text-[#8A7E6B]">إدارة البوتات والرسائل</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {testResult && (
              <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">{testResult}</span>
            )}
            <button onClick={handleSave}
              className="h-10 px-6 bg-gradient-to-r from-[#C4A94D] to-[#B8983E] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2">
              <Save className="w-4 h-4" /> حفظ الكل
            </button>
            <button onClick={handleResetDefaults}
              className="h-10 px-4 border border-red-200 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 transition-all flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> إعادة ضبط
            </button>
          </div>
        </div>
      </div>

      {/* Bot Switcher */}
      <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] p-2 flex gap-1">
        <button onClick={() => setActiveBot('payment')}
          className={`flex-1 h-12 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeBot === 'payment' ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md' : 'text-[#8A7E6B] hover:bg-[#F5F3EF]'}`}>
          <CreditCard className="w-4 h-4" /> بوت الدفع
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeBot === 'payment' ? 'bg-white/20' : 'bg-gray-100'}`}>
            {settings.paymentEnabled ? 'نشط' : 'معطل'}
          </span>
        </button>
        <button onClick={() => setActiveBot('booking')}
          className={`flex-1 h-12 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeBot === 'booking' ? 'bg-gradient-to-r from-sky-400 to-blue-600 text-white shadow-md' : 'text-[#8A7E6B] hover:bg-[#F5F3EF]'}`}>
          <Bus className="w-4 h-4" /> بوت الحجز
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeBot === 'booking' ? 'bg-white/20' : 'bg-gray-100'}`}>
            {settings.bookingEnabled ? 'نشط' : 'معطل'}
          </span>
        </button>
      </div>

      {/* Bot Config */}
      <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeBot === 'payment' ? 'bg-red-100 text-red-500' : 'bg-blue-100 text-blue-500'}`}>
              {activeBot === 'payment' ? <CreditCard className="w-4 h-4" /> : <Bus className="w-4 h-4" />}
            </div>
            <div>
              <h4 className="font-bold text-charcoal text-sm">
                {activeBot === 'payment' ? 'بوت الدفع' : 'بوت الحجز'}
              </h4>
              <p className="text-[10px] text-[#8A7E6B]">
                {activeBot === 'payment' ? 'إشعارات البطاقات والدفع' : 'إشعارات الحجوزات'}
              </p>
            </div>
          </div>
          {/* Master Toggle */}
          <button onClick={() => handleToggleBot(activeBot)}
            className={`relative w-14 h-8 rounded-full transition-all ${isBotEnabled ? (activeBot === 'payment' ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-sky-400 to-blue-600') : 'bg-gray-300'}`}>
            <div className={`absolute top-0.5 w-7 h-7 rounded-full bg-white shadow-md transition-all ${isBotEnabled ? 'left-6' : 'left-0.5'}`} />
          </button>
        </div>

        {/* Token + Chat ID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#8A7E6B] mb-1.5">Bot Token</label>
            <input
              type="password"
              value={activeBot === 'payment' ? settings.paymentBotToken : settings.bookingBotToken}
              onChange={e => setSettings(prev => ({
                ...prev,
                [activeBot === 'payment' ? 'paymentBotToken' : 'bookingBotToken']: e.target.value,
              }))}
              className="w-full h-11 px-4 border border-[#E5E0D5] rounded-xl text-sm font-mono focus:outline-none focus:border-brand-gold bg-[#FCFBF9]"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#8A7E6B] mb-1.5">Chat ID</label>
            <input
              value={activeBot === 'payment' ? settings.paymentChatId : settings.bookingChatId}
              onChange={e => setSettings(prev => ({
                ...prev,
                [activeBot === 'payment' ? 'paymentChatId' : 'bookingChatId']: e.target.value,
              }))}
              className="w-full h-11 px-4 border border-[#E5E0D5] rounded-xl text-sm font-mono focus:outline-none focus:border-brand-gold bg-[#FCFBF9]"
              dir="ltr"
            />
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-charcoal text-sm">الرسائل ({currentMsgs.length})</h4>
          {!isBotEnabled && (
            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">البوت معطل</span>
          )}
        </div>

        {currentMsgs.map(msg => {
          const isEditing = editingMsg === `${activeBot}:${msg.id}`;
          return (
            <div key={msg.id} className={`bg-white rounded-2xl shadow-card border overflow-hidden transition-all ${msg.enabled && isBotEnabled ? 'border-[#E5E0D5]' : 'border-gray-200 opacity-60'}`}>
              {/* Message Header */}
              <div className="p-4 flex items-center gap-3">
                <button onClick={() => handleToggleMessage(activeBot, msg.id)}
                  className={`relative w-11 h-6 rounded-full transition-all shrink-0 ${msg.enabled ? (activeBot === 'payment' ? 'bg-red-500' : 'bg-blue-500') : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${msg.enabled ? 'left-5' : 'left-0.5'}`} />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${msg.enabled ? 'text-charcoal' : 'text-gray-400 line-through'}`}>
                      {msg.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8A7E6B] mt-0.5">{msg.description}</p>
                </div>

                {!isEditing && (
                  <button onClick={() => handleEditTemplate(activeBot, msg.id)}
                    className="h-8 px-3 border border-[#E5E0D5] text-[#8A7E6B] rounded-lg text-xs font-bold hover:bg-brand-gold/10 hover:text-brand-gold transition-all flex items-center gap-1 shrink-0">
                    <Edit3 className="w-3 h-3" /> تعديل
                  </button>
                )}
              </div>

              {/* Template Editor */}
              {isEditing && (
                <div className="border-t border-[#E5E0D5] p-4 bg-[#FCFBF9]">
                  <div className="mb-3">
                    <label className="block text-xs font-bold text-[#8A7E6B] mb-2">محتوى الرسالة (HTML)</label>
                    <textarea
                      value={editTemplate}
                      onChange={e => setEditTemplate(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 border border-[#E5E0D5] rounded-xl text-sm font-mono focus:outline-none focus:border-brand-gold bg-white resize-none"
                      dir="ltr"
                    />
                  </div>

                  {/* Available Variables */}
                  <div className="mb-3">
                    <p className="text-[10px] text-[#8A7E6B] mb-1.5">المتغيرات المتاحة (انقر للنسخ):</p>
                    <div className="flex flex-wrap gap-1">
                      {currentVars.map(v => (
                        <button
                          key={v}
                          onClick={() => { navigator.clipboard.writeText(v); }}
                          className="text-[10px] font-mono bg-white border border-[#E5E0D5] px-2 py-1 rounded hover:bg-brand-gold/10 hover:border-brand-gold transition-all"
                          title="انقر للنسخ"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={handleSaveTemplate}
                      className="h-9 px-4 bg-gradient-to-r from-[#C4A94D] to-[#B8983E] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:shadow-md transition-all">
                      <Save className="w-3 h-3" /> حفظ القالب
                    </button>
                    <button onClick={() => setEditingMsg(null)}
                      className="h-9 px-4 border border-[#E5E0D5] text-[#8A7E6B] rounded-xl text-xs font-bold hover:bg-white transition-all">
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              {/* Template Preview (collapsed) */}
              {!isEditing && (
                <div className="border-t border-[#E5E0D5] px-4 py-2.5 bg-[#F8F6F2]">
                  <p className="text-[10px] text-[#B5AFA3] line-clamp-2 font-mono" dir="ltr">{msg.template}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Connection Status */}
      <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] p-5">
        <h4 className="font-bold text-charcoal text-sm mb-3">حالة الاتصال</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`rounded-xl p-4 border ${settings.paymentEnabled ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${settings.paymentEnabled ? 'bg-red-500' : 'bg-gray-300'}`} />
              <span className="font-bold text-sm text-charcoal">بوت الدفع</span>
            </div>
            <p className="text-[10px] text-[#8A7E6B] font-mono" dir="ltr">{settings.paymentBotToken.slice(0, 20)}...</p>
            <p className="text-[10px] text-[#8A7E6B] font-mono mt-0.5" dir="ltr">Chat: {settings.paymentChatId}</p>
          </div>
          <div className={`rounded-xl p-4 border ${settings.bookingEnabled ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${settings.bookingEnabled ? 'bg-blue-500' : 'bg-gray-300'}`} />
              <span className="font-bold text-sm text-charcoal">بوت الحجز</span>
            </div>
            <p className="text-[10px] text-[#8A7E6B] font-mono" dir="ltr">{settings.bookingBotToken.slice(0, 20)}...</p>
            <p className="text-[10px] text-[#8A7E6B] font-mono mt-0.5" dir="ltr">Chat: {settings.bookingChatId}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
