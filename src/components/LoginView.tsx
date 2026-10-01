import { useState } from 'react';
import { Lock, User, ShieldCheck, AlertCircle, Building2, Key, Loader2 } from 'lucide-react';
import { CompanySettings } from '../types';
import { dbService } from '../services/apiService';

interface LoginViewProps {
  settings: CompanySettings;
  onLoginSuccess: (user: { id: number; username: string; fullName: string; role: string }) => void;
  onOpenGuide: () => void;
}

export function LoginView({ settings, onLoginSuccess, onOpenGuide }: LoginViewProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@2026!');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (attempts >= 5) {
      setError('تم قفل الحساب مؤقتاً لتجاوز 5 محاولات خاطئة (Rate Limiting).');
      return;
    }

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await dbService.login(trimmedUser, password);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setAttempts((prev) => prev + 1);
        setError(res.error || `اسم المستخدم أو كلمة المرور غير صحيحة. المحاولة ${attempts + 1} من 5.`);
      }
    } catch {
      setAttempts((prev) => prev + 1);
      setError(`تعذر التحقق من بيانات الدخول. المحاولة ${attempts + 1} من 5.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-700/40 animate-in fade-in">
        
        {/* Brand Banner */}
        <div className="bg-gradient-to-l from-blue-700 to-indigo-900 p-6 text-white text-center space-y-2">
          <div className="w-14 h-14 bg-white/10 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg border border-white/20">
            💼
          </div>
          <h2 className="text-lg font-black">{settings.companyName}</h2>
          <p className="text-xs text-blue-200">
            نظام إدارة الرواتب والفروع &bull; دولة الكويت (د.ك KWD)
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-bold mb-1.5">اسم المستخدم:</label>
            <div className="relative">
              <User className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="admin"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1.5">كلمة المرور:</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white font-black rounded-xl text-xs shadow-lg shadow-blue-500/30 transition active:scale-95 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري التحقق من كلمة المرور...</span>
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>تسجيل الدخول للنظام</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Demo Credentials Box */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-600 space-y-1 text-[11px]">
            <div className="font-bold text-slate-800 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>بيانات الحساب الافتراضية للدخول:</span>
            </div>
            <div className="flex justify-between font-mono pt-0.5">
              <span>اسم المستخدم: <strong>admin</strong></span>
              <span>كلمة المرور: <strong>Admin@2026!</strong></span>
            </div>
          </div>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onOpenGuide}
              className="text-xs text-blue-600 hover:underline font-bold"
            >
              📖 استعراض دليل الرفع والتنصيب على Hostinger
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
