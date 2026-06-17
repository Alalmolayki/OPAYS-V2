import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, User, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useStore } from '../store/useStore';

const STATS = [
  { label: 'Aktif Takım', value: '12+', color: 'text-cyan-400' },
  { label: 'Yarışma', value: '48+', color: 'text-orange-400' },
  { label: 'Öğrenci', value: '240+', color: 'text-green-400' },
  { label: 'Proje', value: '35+', color: 'text-purple-400' },
];

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const login = useStore(s => s.login);
  const theme = useStore(s => s.theme);
  const isLight = theme === 'light';

  // Apply .light class to <html> so CSS variable overrides activate on LoginPage too
  useEffect(() => {
    document.documentElement.classList.toggle('light', isLight);
    return () => document.documentElement.classList.remove('light');
  }, [isLight]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const result = login(identifier.trim(), password);
    setLoading(false);
    if (result.success) navigate('/dashboard');
    else setError(result.error || 'Giriş başarısız.');
  };

  return (
    <div className={`min-h-screen grid lg:grid-cols-2 ${isLight ? 'lm-content light bg-slate-50' : 'bg-[#080e1c]'}`}>
      {/* Left — Hero */}
      <div className={`hidden lg:flex flex-col justify-between p-12 relative overflow-hidden ${isLight ? 'bg-white border-r border-slate-200' : ''}`}>
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center glow-cyan">
            <Rocket size={22} className="text-white" />
          </div>
          <div>
            <span className={`text-2xl font-bold tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>OPAYS</span>
            <p className="text-xs text-slate-500">Öğrenci Aktivite Platformu</p>
          </div>
        </div>

        {/* Hero Text */}
        <div className="relative">
          <h1 className={`text-5xl font-extrabold leading-tight mb-4 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Yolculuğunu takip et,<br />
            <span className="text-cyan-500">hikayene sahip çık.</span>
          </h1>
          <p className={`text-lg leading-relaxed mb-10 max-w-md ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Robotik yarışmaları, Teknofest aşamaları, okul organizasyonları — tüm başarılarınız tek dinamik platformda.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {STATS.map(stat => (
              <div key={stat.label} className={`p-5 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800/80'}`}>
                <p className={`text-3xl font-extrabold ${stat.color}`}>{stat.value}</p>
                <p className={`text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative space-y-1">
          <p className="text-slate-500 text-xs leading-relaxed">
            Bu sistem Bahçelievler 15 Temmuz Şehitleri Teknoloji Proje AİHL öğrencileri tarafından geliştirilmiştir.
          </p>
          <p className={`text-xs ${isLight ? 'text-slate-400' : 'text-slate-700'}`}>© 2026 OPAYS — Tüm hakları saklıdır.</p>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className={`flex items-center justify-center p-8 ${isLight ? 'bg-slate-50' : 'lg:bg-[#080e1c] lg:border-l lg:border-slate-800/60'}`}>
        <div className="w-full max-w-sm animate-slide-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
              <Rocket size={18} className="text-white" />
            </div>
            <span className={`text-xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>OPAYS</span>
          </div>

          <div className="mb-8">
            <h2 className={`text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Hoşgeldiniz</h2>
            <p className={`mt-1 text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Kullanıcı adı veya e-posta ile giriş yapın</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Kullanıcı Adı veya E-posta</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="kullanici_adi veya email@okul.edu"
                  className="input pl-9"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="label">Şifre</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pl-9 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-400"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-sm px-3 py-2.5 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base"
            >
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <>Giriş Yap <ArrowRight size={18} /></>}
            </button>

            <p className={`text-center text-xs leading-relaxed ${isLight ? 'text-slate-400' : 'text-slate-600'}`}>
              Şifrenizi mi unuttunuz? Okul müdürü veya teknoloji öğretmeninden yeni kayıt kodu isteyin.
            </p>
          </form>

          <div className="mt-6 text-center">
            <span className={`text-sm ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Yeni öğrenci misiniz? </span>
            <button
              onClick={() => navigate('/activate')}
              className="text-cyan-500 hover:text-cyan-400 text-sm font-semibold transition-colors"
            >
              Hesabını etkinleştir
            </button>
          </div>

          {/* Branding */}
          <div className={`mt-10 pt-6 border-t text-center space-y-1 ${isLight ? 'border-slate-200' : 'border-slate-800/40'}`}>
            <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-600'}`}>
              Bu sistem Bahçelievler 15 Temmuz Şehitleri Teknoloji Proje AİHL<br />öğrencileri tarafından geliştirilmiştir.
            </p>
            <p className={`text-xs ${isLight ? 'text-slate-400' : 'text-slate-700'}`}>© 2026 OPAYS</p>
          </div>
        </div>
      </div>

    </div>
  );
}
