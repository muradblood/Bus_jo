import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Lock, Eye, EyeOff, Bus } from 'lucide-react';
import { login } from '@/lib/admin-auth';

export default function Login() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    if (!password.trim()) {
      setError('أدخل كلمة المرور');
      return;
    }
    setIsLoading(true);
    setError('');

    // Small delay for UX
    setTimeout(() => {
      if (login(password)) {
        navigate('/admin');
      } else {
        setError('كلمة المرور غير صحيحة');
        setIsLoading(false);
      }
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F6F2]" dir="rtl">
      <div className="w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-[#C4A94D] to-[#B8983E] rounded-2xl flex items-center justify-center shadow-lg">
            <Bus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-extrabold text-charcoal">سات للنقل</h1>
          <p className="text-xs text-[#8A7E6B] mt-1">لوحة تحكم الإدارة</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-card border border-[#E5E0D5] p-6">
          <h2 className="text-lg font-bold text-charcoal text-center mb-4">تسجيل الدخول</h2>

          {/* Password Field */}
          <div className="space-y-3">
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B5AFA3]" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                onKeyDown={handleKeyDown}
                placeholder="أدخل كلمة المرور"
                className="w-full h-12 pr-10 pl-10 border border-[#E5E0D5] rounded-xl text-sm text-charcoal bg-[#FCFBF9] focus:outline-none focus:border-brand-gold text-right"
                autoFocus
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B5AFA3] hover:text-charcoal transition-colors"
                type="button"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-center">
                <p className="text-xs font-bold text-red-600">{error}</p>
              </div>
            )}

            {/* Login Button */}
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-[#C4A94D] to-[#B8983E] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  دخول
                </>
              )}
            </button>
          </div>

          {/* Hint */}
          <p className="text-[10px] text-[#B5AFA3] text-center mt-4">
            كلمة المرور الافتراضية: sat123
          </p>
        </div>
      </div>
    </div>
  );
}
