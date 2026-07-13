import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Lock, User, Eye, EyeOff } from 'lucide-react';

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token === 'sat_admin_2024') {
      navigate('/admin');
    }
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setIsSubmitting(true);

    // Simulate network delay
    setTimeout(() => {
      if (username === 'admin' && password === 'sat123') {
        localStorage.setItem('admin_token', 'sat_admin_2024');
        navigate('/admin');
      } else {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة');
        setIsSubmitting(false);
      }
    }, 800);
  };

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center bg-cover bg-center relative"
      style={{ backgroundImage: 'url(/hero-bus-new.jpg)' }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-charcoal/70 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-[420px] mx-4">
        {/* Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* Logo */}
          <div className="text-center mb-8">
            <img
              src="/sat-logo.png"
              alt="سات"
              className="h-16 w-auto mx-auto mb-4 object-contain"
            />
            <h1 className="text-2xl font-bold text-charcoal mb-1">
              لوحة التحكم
            </h1>
            <p className="text-sm text-[#8A7E6B]">
              تسجيل دخول المسؤول
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-bold text-charcoal mb-2 text-right">
                اسم المستخدم
              </label>
              <div className="relative">
                <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gold" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(''); }}
                  placeholder="أدخل اسم المستخدم"
                  className="w-full h-[54px] px-5 pr-12 border border-[#E5E0D5] rounded-2xl text-right focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 transition-all text-charcoal text-base bg-[#FCFBF9]"
                  dir="rtl"
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-bold text-charcoal mb-2 text-right">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gold" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="أدخل كلمة المرور"
                  className="w-full h-[54px] px-5 pr-12 pl-12 border border-[#E5E0D5] rounded-2xl text-right focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/15 transition-all text-charcoal text-base bg-[#FCFBF9]"
                  dir="rtl"
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B5AFA3] hover:text-charcoal transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-right">
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full h-[54px] text-white font-bold rounded-2xl shadow-lg transition-all text-base flex items-center justify-center gap-2 ${
                isSubmitting
                  ? 'bg-[#D5CFC5] cursor-not-allowed'
                  : 'gold-gradient hover:shadow-xl hover:scale-[1.01] active:scale-[0.98]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جارٍ التحقق...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  تسجيل الدخول
                </>
              )}
            </button>
          </form>

          {/* Default credentials hint */}
          <div className="mt-6 p-3 bg-[#F8F6F2] rounded-xl text-center">
            <p className="text-xs text-[#8A7E6B] mb-1">بيانات الدخول الافتراضية:</p>
            <p className="text-xs text-charcoal font-mono">
              اسم المستخدم: <span className="font-bold">admin</span>
              {' / '}
              كلمة المرور: <span className="font-bold">sat123</span>
            </p>
          </div>

          {/* Back to home */}
          <button
            onClick={() => navigate('/')}
            className="w-full mt-4 py-2 text-sm text-[#8A7E6B] hover:text-brand-gold transition-colors text-center"
          >
            العودة للموقع
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
