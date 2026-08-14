import React, { useEffect, useState } from 'react';
import { CheckCircle2, Database, Eye, EyeOff, Lock, Settings2, ShieldCheck, User, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { trpc } from '@/providers/trpc';

const InstallPage: React.FC = () => {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const statusQuery = trpc.setup.status.useQuery(undefined, {
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const installMutation = trpc.setup.install.useMutation();

  useEffect(() => {
    if (statusQuery.data?.adminExists && !success) {
      setError('تم تثبيت حساب الإدارة مسبقاً. استخدم صفحة تسجيل الدخول.');
    }
  }, [statusQuery.data?.adminExists, success]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (username.trim().length < 3) {
      setError('اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل.');
      return;
    }
    if (password.length < 8) {
      setError('كلمة المرور يجب أن تتكون من 8 أحرف على الأقل.');
      return;
    }
    if (password !== confirmPassword) {
      setError('تأكيد كلمة المرور غير مطابق.');
      return;
    }

    try {
      const result = await installMutation.mutateAsync({
        username: username.trim(),
        password,
      });
      setSuccess(true);
      utils.auth.me.setData(undefined, result.admin);
      await utils.setup.status.invalidate();
      setTimeout(() => navigate('/admin'), 700);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'تعذر إكمال التثبيت.';
      setError(message);
    }
  };

  const status = statusQuery.data;
  const loading = statusQuery.isLoading;
  const canInstall = Boolean(status?.canInstall && !success);

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center bg-cover bg-center relative py-8"
      style={{ backgroundImage: 'url(/hero-bus-new.jpg)' }}
      dir="rtl"
    >
      <div className="absolute inset-0 bg-charcoal/75 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-[520px] mx-4">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6 md:p-8 border border-white/20">
          <div className="text-center mb-6">
            <img src="/sat-logo.png" alt="سات" className="h-16 w-auto mx-auto mb-4 object-contain" />
            <h1 className="text-2xl font-bold text-charcoal mb-1">تثبيت النظام</h1>
            <p className="text-sm text-[#8A7E6B]">فحص النظام وإنشاء حساب المسؤول لأول مرة</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
            <StatusCard
              icon={Database}
              label="التخزين"
              ready={Boolean(status?.persistentStorage)}
              text={loading ? 'جارٍ الفحص' : status?.persistentStorage ? 'دائم' : 'مؤقت'}
            />
            <StatusCard
              icon={ShieldCheck}
              label="الجلسة"
              ready={Boolean(status?.sessionSecretReady)}
              text={loading ? 'جارٍ الفحص' : status?.sessionSecretReady ? 'جاهزة' : 'غير مهيأة'}
            />
            <StatusCard
              icon={Settings2}
              label="الأدمن"
              ready={Boolean(status?.adminExists)}
              text={loading ? 'جارٍ الفحص' : status?.adminExists ? 'مثبت' : 'غير مثبت'}
            />
          </div>

          {status?.runtime === 'vercel' && !status.persistentStorage && (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 leading-6">
              تم اكتشاف Vercel. قاعدة SQLite الحالية تستخدم تخزيناً مؤقتاً، لذلك تم تعطيل زر التثبيت حتى يتم ربط قاعدة بيانات دائمة. لن ننشئ إعداداً يختفي بعد إعادة تشغيل Serverless Function.
            </div>
          )}

          {success ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-2" />
              <p className="font-bold text-green-800">تم التثبيت بنجاح</p>
              <p className="text-sm text-green-700 mt-1">جارٍ فتح لوحة التحكم...</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">اسم مستخدم الأدمن</label>
                <div className="relative">
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gold" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError(''); }}
                    className="w-full h-[54px] px-5 pr-12 border border-[#E5E0D5] rounded-2xl focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 bg-[#FCFBF9]"
                    placeholder="admin"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">كلمة المرور الجديدة</label>
                <div className="relative">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gold" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    className="w-full h-[54px] px-5 pr-12 pl-12 border border-[#E5E0D5] rounded-2xl focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 bg-[#FCFBF9]"
                    placeholder="8 أحرف على الأقل"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B5AFA3] hover:text-charcoal"
                    aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">تأكيد كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gold" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                    className="w-full h-[54px] px-5 pr-12 border border-[#E5E0D5] rounded-2xl focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 bg-[#FCFBF9]"
                    placeholder="أعد كتابة كلمة المرور"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                  <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-red-600 text-sm font-medium leading-6">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!canInstall || installMutation.isPending}
                className={`w-full h-[54px] text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                  canInstall && !installMutation.isPending
                    ? 'gold-gradient hover:shadow-xl hover:scale-[1.01] active:scale-[0.98]'
                    : 'bg-[#D5CFC5] cursor-not-allowed'
                }`}
              >
                {installMutation.isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جارٍ التثبيت...
                  </>
                ) : (
                  <>
                    <Settings2 className="w-5 h-5" />
                    تثبيت وإنشاء حساب الأدمن
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-5 flex items-center justify-center gap-3 text-sm">
            <button onClick={() => navigate('/admin-login')} className="text-[#8A7E6B] hover:text-brand-gold">
              تسجيل الدخول
            </button>
            <span className="text-[#D5CFC5]">•</span>
            <button onClick={() => navigate('/')} className="text-[#8A7E6B] hover:text-brand-gold">
              العودة للموقع
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function StatusCard({
  icon: Icon,
  label,
  ready,
  text,
}: {
  icon: React.ElementType;
  label: string;
  ready: boolean;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E5E0D5] bg-[#FCFBF9] p-3 text-center">
      <Icon className={`w-5 h-5 mx-auto mb-1 ${ready ? 'text-green-600' : 'text-[#B5AFA3]'}`} />
      <div className="text-xs font-bold text-charcoal">{label}</div>
      <div className={`text-[11px] mt-0.5 ${ready ? 'text-green-600' : 'text-[#8A7E6B]'}`}>{text}</div>
    </div>
  );
}

export default InstallPage;
