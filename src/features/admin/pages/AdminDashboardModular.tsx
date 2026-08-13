import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  LayoutDashboard, CalendarCheck, MapPin, Tag, Users, Settings,
  Menu, X, LogOut, Bus, Send, Bell, Landmark, Palette, Wifi, WifiOff,
} from 'lucide-react';
import { trpc } from '@/providers/trpc';
import { socket } from '@/lib/socket';
import BanksTab from './admin-tabs/BanksTab';
import BookingsTab from './admin-tabs/BookingsTab';
import CitiesTab from './admin-tabs/CitiesTab';
import DashboardTab from './admin-tabs/DashboardTab';
import PricesTab from './admin-tabs/PricesTab';
import VisitorsTab from './admin-tabs/VisitorsTab';
import type { AdminTab } from './admin-tabs/types';
import { DesignTab, SettingsTab, TelegramTab } from './AdminExtras';

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

const AdminDashboardModular: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [socketConnected, setSocketConnected] = useState(socket.connected);

  const { data: meData, isLoading: authLoading } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const logoutMutation = trpc.auth.logout.useMutation({ onSuccess: () => { navigate('/admin-login'); } });
  const isAuthenticated = Boolean(meData && (meData as { id?: number }).id);

  useEffect(() => {
    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) setSocketConnected(true);
    else socket.connect();
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate('/admin-login');
  }, [authLoading, isAuthenticated, navigate]);

  const handleLogout = () => logoutMutation.mutate(undefined);
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
      <aside className={`fixed lg:sticky top-0 right-0 h-[100dvh] w-[260px] bg-charcoal z-50 transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
        <button onClick={() => setSidebarOpen(false)} className="absolute top-4 left-4 lg:hidden text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
        <div className="p-6 border-b border-white/10"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-brand-gold flex items-center justify-center"><Bus className="w-5 h-5 text-white" /></div><div><h1 className="text-white font-bold text-lg">لوحة التحكم</h1><p className="text-white/40 text-xs">سات الدولي | SAT Intl</p></div></div></div>
        <nav className="p-4 space-y-1">{navItems.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === item.id ? 'bg-brand-gold text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`}><Icon className="w-5 h-5" />{item.label}</button>; })}</nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10"><div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-gold to-amber-600 flex items-center justify-center"><span className="text-white font-bold text-sm">م</span></div><div className="flex-1 text-right overflow-hidden"><p className="text-white text-sm font-bold truncate">مدير النظام</p><p className="text-white/40 text-xs truncate">admin@sat.com</p></div></div><button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-red-400 bg-red-400/10 hover:bg-red-400/20 transition-all"><LogOut className="w-4 h-4" />تسجيل الخروج</button></div>
      </aside>
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-lg border-b border-[#E5E0D5] px-4 py-3 flex items-center justify-between"><button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-charcoal"><Menu className="w-6 h-6" /></button><h2 className="text-lg font-bold text-charcoal">{navItems.find(n => n.id === activeTab)?.label}</h2><div className="flex items-center gap-2"><div title={socketConnected ? 'متصل — تحديث فوري نشط' : 'غير متصل — وضع الاستطلاع'} className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${socketConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{socketConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}<span className="hidden sm:inline">{socketConnected ? 'مباشر' : 'استطلاع'}</span></div><button className="relative w-9 h-9 rounded-full bg-[#F5F3EF] flex items-center justify-center text-[#8A7E6B]"><Bell className="w-4 h-4" /><span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" /></button></div></header>
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

export default AdminDashboardModular;
