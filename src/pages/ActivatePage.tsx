import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, Key, ArrowRight, User, Mail, Phone, Lock, Eye, EyeOff, ArrowLeft, Check, Instagram, GraduationCap, RefreshCw, WifiOff } from 'lucide-react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import type { ActivationCode } from '../types';

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Süperadmin',
  admin: 'Okul Admini',
  tech_teacher: 'Teknoloji Öğrt.',
  branch_teacher: 'Branş Öğrt.',
  student: 'Öğrenci',
  demo: 'Demo',
  graduate: 'Mezun',
};

type Step = 1 | 2;

const formatPhone = (raw: string) => {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  if (d.length <= 8) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
};

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => String(currentYear - i));

export default function ActivatePage() {
  const [step, setStep] = useState<Step>(1);
  const [code, setCode] = useState('');
  const [codeData, setCodeData] = useState<ActivationCode | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Wait for Zustand persist to finish loading from Supabase before allowing
  // code verification — otherwise codes[] is still the empty defaultState.
  const [hydrated, setHydrated] = useState(() => useStore.persist.hasHydrated());
  const [noServer, setNoServer] = useState(false);  // true when Supabase not configured
  const [retrying, setRetrying] = useState(false);
  const navigate = useNavigate();
  const { activateCode, createAccount, theme, codes } = useStore();

  useEffect(() => {
    // If Supabase is not configured, the store uses localStorage which is
    // device-local — codes generated on another device won't be visible.
    if (!supabase) {
      setNoServer(true);
      setHydrated(true);
      return;
    }
    if (useStore.persist.hasHydrated()) { setHydrated(true); return; }
    const unsub = useStore.persist.onFinishHydration(() => setHydrated(true));
    // Hydration may have finished between the check above and registering the
    // listener — re-check now so we don't wait out the full timeout for nothing.
    if (useStore.persist.hasHydrated()) { unsub(); setHydrated(true); return; }
    const timer = setTimeout(() => setHydrated(true), 10000);
    return () => { unsub(); clearTimeout(timer); };
  }, []);

  // Force a fresh load from Supabase (e.g. if user taps "Yenile")
  const handleRetry = async () => {
    setRetrying(true);
    setError('');
    setHydrated(false);
    await useStore.persist.rehydrate();
    setHydrated(true);
    setRetrying(false);
  };
  const isLight = theme === 'light';

  useEffect(() => {
    document.documentElement.classList.toggle('light', isLight);
    return () => document.documentElement.classList.remove('light');
  }, [isLight]);

  // Common fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [instagram, setInstagram] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  // Graduate-specific fields
  const [graduationYear, setGraduationYear] = useState(String(currentYear));
  const [university, setUniversity] = useState('');
  const [department, setDepartment] = useState('');

  const isGraduate = codeData?.role === 'graduate';
  const isStudentRole = !codeData?.role || codeData.role === 'student';
  const requiresPhone = isStudentRole || codeData?.role === 'branch_teacher' || codeData?.role === 'tech_teacher';

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    // Wait for hydration if not done yet
    if (!useStore.persist.hasHydrated() && supabase) {
      await new Promise<void>(resolve => {
        if (useStore.persist.hasHydrated()) { resolve(); return; }
        let timer: ReturnType<typeof setTimeout>;
        const unsub = useStore.persist.onFinishHydration(() => { unsub(); clearTimeout(timer); resolve(); });
        // Hydration may have completed between the check above and registering
        // the listener — re-check so we don't block on the timeout for nothing.
        if (useStore.persist.hasHydrated()) { unsub(); resolve(); return; }
        timer = setTimeout(() => { unsub(); resolve(); }, 8000);
      });
    }
    const storeState = useStore.getState();
    // If Supabase is configured but no codes loaded → server/RLS issue
    if (supabase && storeState.codes.length === 0) {
      setLoading(false);
      setError('Sunucu verileri yüklenemedi. "Yenile" butonuna basıp tekrar deneyin.');
      return;
    }
    const result = activateCode(code.trim());
    setLoading(false);
    if (result.success && result.data) { setCodeData(result.data); setStep(2); }
    else setError(result.error || 'Geçersiz veya kullanılmış aktivasyon kodu.');
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Şifreler eşleşmiyor.'); return; }
    if (password.length < 8) { setError('Şifre en az 8 karakter olmalı.'); return; }
    if (isStudentRole && !instagram.trim()) { setError('Instagram kullanıcı adı zorunludur.'); return; }
    if (requiresPhone) {
      const rawPhone = phone.replace(/\D/g, '');
      if (!/^[0-9]{10}$/.test(rawPhone)) { setError('Geçerli bir telefon numarası girin (10 rakam).'); return; }
    }
    if (isGraduate) {
      if (!university.trim()) { setError('Üniversite bilgisi zorunludur.'); return; }
      if (!department.trim()) { setError('Bölüm bilgisi zorunludur.'); return; }
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const rawPhone = phone.replace(/\D/g, '');
    const cleanInsta = instagram.replace('@', '').trim();
    const result = createAccount(
      codeData!.code,
      username.trim(),
      email.trim(),
      rawPhone,
      cleanInsta,
      password,
      isGraduate ? { graduationYear, university: university.trim(), department: department.trim() } : undefined,
    );
    setLoading(false);
    if (result.success) navigate('/dashboard');
    else setError(result.error || 'Hesap oluşturulamadı.');
  };

  const progress = step === 1 ? 10 : 90;
  const roleName = ROLE_LABELS[codeData?.role || 'student'];

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 ${isLight ? 'lm-content light' : ''}`}>
      <div className="w-full max-w-md animate-slide-up">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center glow-cyan">
            <Rocket size={20} className="text-white" />
          </div>
          <span className={`text-xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>OPAYS</span>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className={`h-1 rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
            <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between mt-2">
            <span className={`text-xs font-medium ${step >= 1 ? 'text-cyan-400' : 'text-slate-600'}`}>Kod Doğrulama</span>
            <span className={`text-xs font-medium ${step >= 2 ? 'text-cyan-400' : 'text-slate-600'}`}>Profil Kurulumu</span>
          </div>
        </div>

        {step === 1 ? (
          <div>
            <h1 className={`text-2xl font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>Hesabını Etkinleştir</h1>
            <p className="text-slate-400 text-sm mb-6">Okulun sağladığı kayıt kodunu gir.</p>

            {/* Supabase not configured: codes are device-local, won't work cross-device */}
            {noServer && (
              <div className="flex items-start gap-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs px-3 py-2.5 rounded-lg mb-4">
                <WifiOff size={14} className="flex-shrink-0 mt-0.5" />
                <span>Sunucu bağlantısı yapılandırılmamış. Kodlar yalnızca üretildiği cihazda çalışabilir.</span>
              </div>
            )}

            {/* Show while store is loading from Supabase */}
            {!hydrated && !noServer && (
              <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/60 text-slate-400 text-sm px-3 py-2.5 rounded-lg mb-4">
                <div className="w-4 h-4 border-2 border-slate-600 border-t-cyan-400 rounded-full animate-spin flex-shrink-0" />
                Veriler yükleniyor, lütfen bekleyin…
              </div>
            )}

            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="label">Kayıt Kodu</label>
                <div className="relative">
                  <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="2026-opys-98765"
                    className="input pl-9 font-mono tracking-wider"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    inputMode="text"
                    required
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1.5">Bu kod okul idaresi tarafından sağlandı.</p>
              </div>
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2.5 rounded-lg">
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                {supabase && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    disabled={retrying || loading}
                    title="Sunucudan yeniden yükle"
                    className="flex items-center gap-1.5 px-3 py-3 bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={16} className={retrying ? 'animate-spin' : ''} />
                  </button>
                )}
                <button type="submit" disabled={loading || !hydrated || retrying} className="btn-primary flex-1 justify-center py-3 disabled:opacity-60">
                  {loading ? <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" /> : <>Kodu Doğrula <ArrowRight size={18} /></>}
                </button>
              </div>
            </form>
            <div className="mt-6 text-center">
              <button onClick={() => navigate('/')} className="text-slate-500 hover:text-slate-400 text-sm">
                Zaten hesabın var mı? Giriş Yap
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h1 className={`text-2xl font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>Profilini Kur</h1>
            <p className="text-slate-400 text-sm mb-4">
              Hoşgeldin, <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{codeData?.studentName}</span>!
            </p>

            <div className="card px-4 py-3 mb-5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                {isGraduate ? <GraduationCap size={16} className="text-cyan-400" /> : <User size={16} className="text-cyan-400" />}
              </div>
              <div>
                <p className="text-xs text-slate-500">Kayıt olunuyor — {roleName}</p>
                <p className="text-sm font-semibold text-white">
                  {codeData?.studentName}
                  {codeData?.class ? ` — ${codeData.class}/${codeData.section}` : ''}
                </p>
              </div>
              <Check size={16} className="text-green-400 ml-auto" />
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-3">
              <div>
                <label className="label">Kullanıcı Adı</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="kullanici_adi" className="input pl-9" required minLength={3} />
                </div>
                <p className="text-xs text-slate-500 mt-1">Giriş için kullanılır.</p>
              </div>

              <div>
                <label className="label">E-posta Adresi</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="sen@email.com" className="input pl-9" required />
                </div>
              </div>

              {/* Phone — required for students, optional for others */}
              <div>
                <label className="label">
                  Telefon Numarası {requiresPhone ? <span className="text-red-400">*</span> : <span className="text-slate-600 font-normal">(opsiyonel)</span>}
                </label>
                <div className="flex gap-2">
                  <div className="bg-slate-800/40 border border-slate-700/60 rounded-lg px-3 flex items-center text-slate-400 text-sm font-mono flex-shrink-0">
                    <Phone size={14} className="mr-1.5" /> +90
                  </div>
                  <input
                    type="tel"
                    value={formatPhone(phone)}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="5XX XXX XX XX"
                    className="input font-mono flex-1"
                    required={requiresPhone}
                  />
                </div>
              </div>

              {/* Instagram — required for students */}
              <div>
                <label className="label">
                  Instagram Kullanıcı Adı {isStudentRole ? <span className="text-red-400">*</span> : <span className="text-slate-600 font-normal">(opsiyonel)</span>}
                </label>
                <div className="relative">
                  <Instagram size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={instagram}
                    onChange={e => setInstagram(e.target.value.replace('@', ''))}
                    placeholder="kullanici_adi"
                    className="input pl-9"
                    required={isStudentRole}
                  />
                </div>
              </div>

              {/* Graduate-specific fields */}
              {isGraduate && (
                <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-green-400 flex items-center gap-1.5">
                    <GraduationCap size={13} /> Mezun Bilgileri
                  </p>
                  <div>
                    <label className="label">Mezuniyet Yılı</label>
                    <select value={graduationYear} onChange={e => setGraduationYear(e.target.value)} className="input">
                      {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Üniversite <span className="text-red-400">*</span></label>
                    <input type="text" value={university} onChange={e => setUniversity(e.target.value)} className="input" placeholder="İTÜ, ODTÜ, Boğaziçi…" required={isGraduate} />
                  </div>
                  <div>
                    <label className="label">Bölüm <span className="text-red-400">*</span></label>
                    <input type="text" value={department} onChange={e => setDepartment(e.target.value)} className="input" placeholder="Bilgisayar Müh., Makine…" required={isGraduate} />
                  </div>
                </div>
              )}

              {/* Password */}
              <div>
                <label className="label">Şifre</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 karakter" className="input pl-9 pr-10" required minLength={8} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Şifreyi Onayla</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type={showPwd ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Şifreni tekrar gir" className="input pl-9" required />
                </div>
              </div>

              {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2.5 rounded-lg">{error}</div>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setStep(1); setError(''); }} className="btn-secondary px-3">
                  <ArrowLeft size={16} />
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center py-3">
                  {loading ? <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" /> : <>Hesabı Oluştur <ArrowRight size={18} /></>}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
