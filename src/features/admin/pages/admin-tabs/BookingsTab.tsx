import React, { useEffect, useState } from 'react';
import { CalendarCheck, Check, Download, RotateCcw, Search, Trash2 } from 'lucide-react';
import { trpc } from '@/providers/trpc';
import { socket } from '@/lib/socket';
import StatusBadge from './StatusBadge';

export default function BookingsTab() {
  const utils = trpc.useUtils();
  const { data: dbBookings = [], isLoading: bookingsLoading } = trpc.admin.bookings.useQuery(undefined, { refetchInterval: 5000 });
  const updateStatusMutation = trpc.admin.updateBookingStatus.useMutation({ onSuccess: () => utils.admin.bookings.invalidate() });
  const deleteBookingMutation = trpc.bookings.delete.useMutation({ onSuccess: () => utils.admin.bookings.invalidate() });
  const markAllSeenMutation = trpc.admin.markAllBookingsSeen.useMutation({ onSuccess: () => utils.admin.bookings.invalidate() });

  useEffect(() => {
    const refresh = () => utils.admin.bookings.invalidate();
    socket.on('new_booking', refresh);
    socket.on('booking_updated', refresh);
    socket.on('booking_status_changed', refresh);
    return () => {
      socket.off('new_booking', refresh);
      socket.off('booking_updated', refresh);
      socket.off('booking_status_changed', refresh);
    };
  }, [utils]);

  const bookingsList = dbBookings;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const refresh = () => utils.admin.bookings.invalidate();

  const filtered = bookingsList.filter((b) => {
    if (search) {
      const q = search.toLowerCase();
      const phone = b.passengerPhone ?? '';
      const document = b.passengerDocument ?? '';
      if (!(b.fromLocation + b.toLocation + (b.passengerName || '') + phone + document).toLowerCase().includes(q)) return false;
    }
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    return true;
  });

  const handleStatusChange = (id: number, status: 'new' | 'pending' | 'confirmed' | 'cancelled') => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleDelete = (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذا الحجز؟')) deleteBookingMutation.mutate({ id });
  };

  const handleMarkAllSeen = () => markAllSeenMutation.mutate(undefined);

  const exportCSV = () => {
    const escapeCsv = (value: unknown) => {
      let text = String(value ?? '');
      if (/^[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replaceAll('"', '""')}"`;
    };
    const headers = [['ID', 'الرحلة', 'التاريخ', 'المسافر', 'الهاتف', 'رقم الوثيقة', 'المبلغ', 'الحالة', 'تاريخ الإنشاء'].map(escapeCsv).join(',')];
    const rows = bookingsList.map(b => {
      const phone = b.passengerPhone ?? '';
      return [b.id, `${b.fromLocation}→${b.toLocation}`, b.pickupDate, b.passengerName || '', phone, b.passengerDocument || '', b.totalAmount, b.status, typeof b.createdAt === 'string' ? b.createdAt : (b.createdAt as Date).toISOString()].map(escapeCsv).join(',');
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

      <div className="bg-white rounded-2xl p-4 shadow-card border border-[#E5E0D5] flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B5AFA3]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في الحجوزات..." className="w-full h-10 pr-9 pl-4 border border-[#E5E0D5] rounded-xl text-right text-sm focus:outline-none focus:border-brand-gold bg-[#FCFBF9]" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 px-4 border border-[#E5E0D5] rounded-xl text-sm bg-[#FCFBF9]">
          <option value="all">جميع الحالات</option><option value="confirmed">مؤكد</option><option value="pending">معلق</option><option value="new">جديد</option><option value="cancelled">ملغي</option>
        </select>
        {stats.unseen > 0 && <button onClick={handleMarkAllSeen} className="h-10 px-4 bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 hover:bg-blue-600 transition-all"><Check className="w-4 h-4" /> تحديد الكل كمقروء</button>}
        <button onClick={exportCSV} className="h-10 px-4 bg-charcoal text-white rounded-xl text-sm font-bold flex items-center gap-1.5 hover:bg-charcoal-light transition-all"><Download className="w-4 h-4" /> تصدير</button>
        <button onClick={refresh} className="h-10 px-4 border border-[#E5E0D5] text-charcoal rounded-xl text-sm font-bold flex items-center gap-1.5 hover:bg-[#F5F3EF] transition-all"><RotateCcw className="w-4 h-4" /> تحديث</button>
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] overflow-hidden">
        <div className="p-4 border-b border-[#E5E0D5] flex items-center justify-between"><h3 className="font-bold text-charcoal">الحجوزات ({filtered.length})</h3>{bookingsLoading && <span className="text-xs text-[#8A7E6B]">جاري التحميل...</span>}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-[#F5F3EF] text-[#8A7E6B]"><tr><th className="px-4 py-3 font-bold">#</th><th className="px-4 py-3 font-bold">الرحلة</th><th className="px-4 py-3 font-bold">التاريخ</th><th className="px-4 py-3 font-bold">المسافر</th><th className="px-4 py-3 font-bold">الهاتف</th><th className="px-4 py-3 font-bold">رقم الوثيقة</th><th className="px-4 py-3 font-bold">المبلغ</th><th className="px-4 py-3 font-bold">الحالة</th><th className="px-4 py-3 font-bold">إجراء</th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-[#8A7E6B]"><CalendarCheck className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="font-bold text-sm">لا توجد حجوزات</p><p className="text-xs mt-1">ستظهر هنا الحجوزات الجديدة من الواجهة الأمامية</p></td></tr>}
              {filtered.map((b) => {
                const phone = b.passengerPhone ?? '';
                return (
                  <tr key={b.id} className={`border-t border-[#E5E0D5] transition-colors ${b.isNew ? 'bg-blue-50/50' : 'hover:bg-[#F5F3EF]/50'}`}>
                    <td className="px-4 py-3 font-mono text-xs text-[#B5AFA3]"><div className="flex items-center gap-1.5">{b.isNew && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}{b.id}</div></td>
                    <td className="px-4 py-3 font-bold text-charcoal">{b.fromLocation} &larr; {b.toLocation}</td><td className="px-4 py-3 text-[#8A7E6B] text-xs">{b.pickupDate}</td><td className="px-4 py-3 text-[#8A7E6B]">{b.passengerName}</td><td className="px-4 py-3 text-[#8A7E6B] font-mono text-xs" dir="ltr">{phone}</td><td className="px-4 py-3 text-[#8A7E6B] font-mono text-xs" dir="ltr">{b.passengerDocument || '—'}</td><td className="px-4 py-3 font-extrabold text-brand-gold">{b.totalAmount} ر.س</td><td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-1"><select value={b.status} onChange={e => handleStatusChange(b.id, e.target.value as 'new' | 'pending' | 'confirmed' | 'cancelled')} className="h-8 px-2 border border-[#E5E0D5] rounded-lg text-xs bg-[#FCFBF9] focus:outline-none focus:border-brand-gold"><option value="new">جديد</option><option value="pending">معلق</option><option value="confirmed">مؤكد</option><option value="cancelled">ملغي</option></select><button onClick={() => handleDelete(b.id)} className="h-8 px-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
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
