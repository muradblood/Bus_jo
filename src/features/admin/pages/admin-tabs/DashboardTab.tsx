import React, { useEffect } from 'react';
import { CalendarCheck, CheckCircle, TrendingUp, TrendingDown, DollarSign, Bell } from 'lucide-react';
import { trpc } from '@/providers/trpc';
import { socket } from '@/lib/socket';
import StatusBadge from './StatusBadge';

export default function DashboardTab() {
  const utils = trpc.useUtils();
  const { data: dbStats } = trpc.admin.stats.useQuery(undefined, { refetchInterval: 10000 });
  const { data: dbBookings = [] } = trpc.admin.bookings.useQuery(undefined, { refetchInterval: 10000 });

  useEffect(() => {
    const onNewBooking = () => {
      utils.admin.stats.invalidate();
      utils.admin.bookings.invalidate();
    };
    socket.on('new_booking', onNewBooking);
    socket.on('booking_updated', onNewBooking);
    socket.on('booking_status_changed', onNewBooking);
    return () => {
      socket.off('new_booking', onNewBooking);
      socket.off('booking_updated', onNewBooking);
      socket.off('booking_status_changed', onNewBooking);
    };
  }, [utils]);

  const bookingsList = dbBookings;
  const stats_ = dbStats ?? { total: 0, new: 0, pending: 0, confirmed: 0, cancelled: 0, unseen: 0, revenue: 0 };
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-card border border-[#E5E0D5] hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-md`}><Icon className="w-6 h-6 text-white" /></div>
                <div className={`flex items-center gap-1 text-xs font-bold ${s.up ? 'text-green-600' : 'text-red-500'}`}>{s.up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}{s.change}</div>
              </div>
              <p className="text-2xl font-extrabold text-charcoal mb-1">{s.value}</p>
              <p className="text-sm text-[#8A7E6B]">{s.label}</p>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-card border border-[#E5E0D5]">
          <div className="flex items-center justify-between mb-6"><h3 className="font-bold text-charcoal text-lg">إحصائيات الحجوزات</h3><div className="flex items-center gap-2 text-xs text-[#8A7E6B]"><span className="w-3 h-3 rounded-full bg-brand-gold" /> مؤكد<span className="w-3 h-3 rounded-full bg-[#E5E0D5] ml-2" /> معلق</div></div>
          <div className="flex items-end gap-3 h-48">{[65, 45, 80, 55, 90, 70, 85].map((h, i) => (<div key={i} className="flex-1 flex flex-col items-center gap-1.5"><div className="w-full flex flex-col gap-1"><div className="w-full bg-brand-gold rounded-lg transition-all" style={{ height: `${h * 0.6}px` }} /><div className="w-full bg-[#E5E0D5] rounded-lg" style={{ height: `${(100 - h) * 0.25}px` }} /></div><span className="text-[10px] text-[#8A7E6B] font-bold">{['سبت', 'أحد', 'اثن', 'ثلاث', 'أربع', 'خميس', 'جمعة'][i]}</span></div>))}</div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-card border border-[#E5E0D5]">
          <h3 className="font-bold text-charcoal text-lg mb-5">حالة الحجوزات</h3>
          <div className="space-y-4">{[
            { label: 'مؤكد', count: confirmedCount, total: stats_.total || 1, color: 'bg-green-500', text: 'text-green-600' },
            { label: 'معلق', count: pendingCount, total: stats_.total || 1, color: 'bg-yellow-500', text: 'text-yellow-600' },
            { label: 'جديد', count: dbStats?.new ?? bookingsList.filter(b => b.status === 'new').length, total: stats_.total || 1, color: 'bg-blue-500', text: 'text-blue-600' },
          ].map((item, i) => { const pct = item.total > 0 ? Math.round((item.count / item.total) * 100) : 0; return (<div key={i}><div className="flex items-center justify-between mb-1.5"><span className="text-sm font-bold text-charcoal">{item.label}</span><span className={`text-sm font-bold ${item.text}`}>{item.count} ({pct}%)</span></div><div className="w-full h-2.5 bg-[#F0EDE4] rounded-full overflow-hidden"><div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${pct}%` }} /></div></div>); })}</div>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] overflow-hidden">
        <div className="p-5 border-b border-[#E5E0D5] flex items-center justify-between"><h3 className="font-bold text-charcoal text-lg">آخر الحجوزات</h3><div className="flex items-center gap-2">{stats_.unseen > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">{stats_.unseen} جديد</span>}<span className="text-xs bg-brand-gold/10 text-brand-gold px-3 py-1 rounded-full font-bold">{stats_.total} حجز</span></div></div>
        <div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead className="bg-[#F5F3EF] text-[#8A7E6B]"><tr><th className="px-4 py-3 font-bold">الرحلة</th><th className="px-4 py-3 font-bold">المسافر</th><th className="px-4 py-3 font-bold">المبلغ</th><th className="px-4 py-3 font-bold">الحالة</th></tr></thead><tbody>{bookingsList.slice(0, 5).map((b) => (<tr key={b.id} className="border-t border-[#E5E0D5] hover:bg-[#F5F3EF]/50 transition-colors"><td className="px-4 py-3"><span className="text-charcoal font-bold">{b.fromLocation}</span><span className="text-[#B5AFA3] mx-1">&larr;</span><span className="text-charcoal font-bold">{b.toLocation}</span><br /><span className="text-xs text-[#8A7E6B]">{b.pickupDate}</span></td><td className="px-4 py-3 text-[#8A7E6B]">{b.passengerName}</td><td className="px-4 py-3 font-extrabold text-brand-gold">{b.totalAmount} ر.س</td><td className="px-4 py-3"><StatusBadge status={b.status} /></td></tr>))}</tbody></table></div>
      </div>
    </div>
  );
}
