import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle, Lock, Phone, Tag, Save, Eye, EyeOff, Bell, Instagram, School, GraduationCap, Archive, ChevronRight, Mail, CheckSquare, Square, Camera } from 'lucide-react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { avatarGradient } from '../utils/avatar';

/** Format raw 10-digit phone digits as "5xx xxx xx xx" */
const formatPhone = (raw: string) => {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  if (d.length <= 8) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const {
    currentUser, updateUser, notifications, markNotificationRead,
    schools, selectedSchoolId, runtimePasswords, changePassword, graduates, saveGraduate,
    fixedAssets, fixedAssetAssignments,
  } = useStore();
  if (!currentUser) return null;

  const isSuperAdmin = currentUser.role === 'superadmin';
  const isGraduate = currentUser.role === 'graduate';
  const school = schools.find(s => s.id === selectedSchoolId);

  // Compute myGraduate BEFORE using it in useState initializers
  const myGraduate = graduates.find(g => g.userId === currentUser.id);
  // My fixed asset assignments
  const myAssignments = fixedAssetAssignments.filter(a => a.userId === currentUser.id);

  const [bio, setBio] = useState(currentUser.bio || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone?.replace('+90', '') || '');
  const [instagram, setInstagram] = useState(currentUser.instagram || '');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>(currentUser.skills || []);
  const [saved, setSaved] = useState(false);

  // Superadmin-editable identity fields
  const [firstName, setFirstName] = useState(currentUser.firstName);
  const [lastName, setLastName] = useState(currentUser.lastName);
  const [editUsername, setEditUsername] = useState(currentUser.username);

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);

  // Graduate-specific state — initialized from myGraduate (computed above)
  const [gradUniversity, setGradUniversity] = useState(myGraduate?.university || '');
  const [gradDepartment, setGradDepartment] = useState(myGraduate?.department || '');
  const [gradYear, setGradYear] = useState(myGraduate?.graduationYear || String(new Date().getFullYear()));
  const [gradShare, setGradShare] = useState(myGraduate?.shareProfile ?? true);
  const [gradShareInstagram, setGradShareInstagram] = useState(myGraduate?.shareInstagram ?? false);
  const [gradShareEmail, setGradShareEmail] = useState(myGraduate?.shareEmail ?? false);
  const [gradSharePhone, setGradSharePhone] = useState(myGraduate?.sharePhone ?? false);
  const [gradSaved, setGradSaved] = useState(false);

  // Superadmin sees system warnings (no userId); other users see their own notifications
  const myNotifications = notifications.filter(n =>
    n.userId === currentUser.id || (!n.userId && isSuperAdmin)
  );
  const unread = myNotifications.filter(n => !n.read);

  const handleSave = () => {
    const updates: Parameters<typeof updateUser>[1] = {
      bio,
      email: email.trim() || currentUser.email,
      phone: phone ? `+90${phone.replace(/\D/g, '')}` : undefined,
      instagram: instagram.replace('@', ''),
      skills,
    };
    if (isSuperAdmin) {
      updates.firstName = firstName.trim() || currentUser.firstName;
      updates.lastName = lastName.trim() || currentUser.lastName;
    }
    if (editUsername.trim() && editUsername.trim() !== currentUser.username) {
      updates.username = editUsername.trim();
    }
    updateUser(currentUser.id, updates);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleAddSkill = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      const s = skillInput.trim();
      if (!skills.includes(s)) setSkills(prev => [...prev, s]);
      setSkillInput('');
    }
  };

  const handlePasswordChange = () => {
    setPwdError(''); setPwdSuccess(false);
    const storedPwd = runtimePasswords[currentUser.username];
    if (!currentPwd || currentPwd !== storedPwd) {
      setPwdError('Mevcut şifre hatalı.'); return;
    }
    if (newPwd.length < 8) { setPwdError('Yeni şifre en az 8 karakter olmalı.'); return; }
    if (newPwd !== confirmPwd) { setPwdError('Şifreler eşleşmiyor.'); return; }
    changePassword(currentUser.username, newPwd);
    setPwdSuccess(true);
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    setTimeout(() => setPwdSuccess(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center">
          <UserCircle size={16} className="text-cyan-400" />
        </div>
        <h1 className="text-xl font-bold text-white">Profilim</h1>
      </div>

      {/* Profile summary */}
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0 group">
            {currentUser.photoUrl ? (
              <img src={currentUser.photoUrl} alt="Profil" className="w-16 h-16 rounded-2xl object-cover glow-cyan" />
            ) : (
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl glow-cyan ${avatarGradient(currentUser.id)}`}>
                {currentUser.firstName[0]}{currentUser.lastName[0]}
              </div>
            )}
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onloadend = () => updateUser(currentUser.id, { photoUrl: reader.result as string });
                reader.readAsDataURL(file);
              }}
            />
            <button
              onClick={() => photoInputRef.current?.click()}
              className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              title="Fotoğraf değiştir"
            >
              <Camera size={18} className="text-white" />
            </button>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{currentUser.firstName} {currentUser.lastName}</h2>
            <p className="text-slate-400 text-sm">@{currentUser.username}</p>
            {currentUser.class && <p className="text-slate-500 text-xs mt-0.5">{currentUser.class}/{currentUser.section} · {school?.name}</p>}
            <div className="flex items-center gap-3 mt-2">
              {currentUser.points !== undefined && (
                <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  🏆 {currentUser.points} puan
                </span>
              )}
              {school && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <School size={11} /> {school.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications — always show section, empty state if no notifications */}
      <div id="notifications-section" className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Bell size={15} className="text-amber-400" /> Bildirimler
            {unread.length > 0 && <span className="badge bg-red-500/15 text-red-400 border border-red-500/20">{unread.length} yeni</span>}
          </h2>
          {myNotifications.length > 0 && (
            <button
              onClick={() => navigate('/notifications')}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Tümünü Gör <ChevronRight size={13} />
            </button>
          )}
        </div>
        {myNotifications.length === 0 ? (
          <p className="text-slate-500 text-sm">Henüz bildirim yok.</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {[...myNotifications].reverse().map(n => (
              <div key={n.id} onClick={() => markNotificationRead(n.id)}
                className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${!n.read ? 'bg-amber-500/10 border-amber-500/20' : 'bg-slate-900/40 border-slate-800/60'}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.type === 'warning' ? 'bg-red-400' : n.type === 'success' ? 'bg-green-400' : 'bg-blue-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200">{n.message}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{format(new Date(n.createdAt), 'd MMM yyyy HH:mm', { locale: tr })}</p>
                </div>
                {!n.read && <span className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-1.5" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fixed assets assigned to this user */}
      {myAssignments.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Archive size={15} className="text-orange-400" /> Zimmetli Demirbaşlar
          </h2>
          <div className="space-y-2">
            {myAssignments.map(asgn => {
              const asset = fixedAssets.find(a => a.id === asgn.assetId);
              if (!asset) return null;
              return (
                <div key={asgn.id} className="flex items-start gap-3 bg-slate-900/40 rounded-xl p-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                    <Archive size={14} className="text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{asset.name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">{asset.category}</span>
                      {asgn.quantity > 1 && <span className="text-xs text-orange-400">×{asgn.quantity}</span>}
                      {asset.serialNo && <span className="text-xs text-slate-500 font-mono">SN: {asset.serialNo}</span>}
                    </div>
                    {asgn.note && <p className="text-xs text-slate-400 mt-0.5">{asgn.note}</p>}
                    <p className="text-xs text-slate-600 mt-0.5">{format(new Date(asgn.assignedAt), 'd MMM yyyy', { locale: tr })}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Editable profile */}
      <div className="card p-6">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
          <UserCircle size={16} className="text-cyan-400" /> Bilgilerimi Düzenle
        </h2>

        {/* Identity section */}
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 mb-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label text-slate-500">Ad Soyad</label>
              {isSuperAdmin ? (
                <div className="flex gap-2">
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="input flex-1" placeholder="Ad" />
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="input flex-1" placeholder="Soyad" />
                </div>
              ) : (
                <div className="input bg-slate-900/30 text-slate-500 cursor-not-allowed">{currentUser.firstName} {currentUser.lastName}</div>
              )}
            </div>
            <div>
              <label className="label">Kullanıcı Adı</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">@</span>
                <input
                  type="text"
                  value={editUsername}
                  onChange={e => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                  className="input pl-7"
                  placeholder="kullanici_adi"
                />
              </div>
              <p className="text-xs text-slate-600 mt-1">Değiştirirseniz yeni kullanıcı adıyla giriş yapın.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label flex items-center gap-1.5"><Mail size={13} /> E-posta</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="email@okul.edu" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label flex items-center gap-1.5"><Phone size={13} /> Telefon</label>
              <div className="flex gap-2">
                <span className="border rounded-lg px-3 flex items-center text-xs font-mono" style={{ backgroundColor: 'var(--c-input-bg)', borderColor: 'var(--c-border-md)', color: 'var(--c-text-muted)' }}>+90</span>
                <input
                  type="tel"
                  value={formatPhone(phone)}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="input flex-1 font-mono"
                  style={{ color: 'var(--c-text)' }}
                  placeholder="5XX XXX XX XX"
                />
              </div>
            </div>
            <div>
              <label className="label flex items-center gap-1.5"><Instagram size={13} /> Instagram</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">@</span>
                <input type="text" value={instagram} onChange={e => setInstagram(e.target.value.replace('@', ''))} className="input pl-7" placeholder="kullanici_adi" />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Biyografi</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} className="input h-20 resize-none" placeholder="Kendiniz hakkında kısa bir not..." maxLength={200} />
            <p className="text-xs text-slate-600 mt-1">{bio.length}/200</p>
          </div>

          <div>
            <label className="label flex items-center gap-1.5"><Tag size={13} /> Uzmanlık Alanları</label>
            <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={handleAddSkill} className="input" placeholder="Yazıp Enter'a bas (örn: Python, Robotik)" />
            <div className="flex flex-wrap gap-2 mt-2">
              {skills.map(s => (
                <span key={s} className="flex items-center gap-1.5 text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-1 rounded-lg">
                  {s}
                  <button onClick={() => setSkills(prev => prev.filter(x => x !== s))} className="hover:text-red-400 transition-colors">×</button>
                </span>
              ))}
            </div>
          </div>

          <button onClick={handleSave} className={`btn-primary w-full justify-center transition-all ${saved ? 'bg-green-500 hover:bg-green-400' : ''}`}>
            <Save size={16} /> {saved ? 'Kaydedildi!' : 'Değişiklikleri Kaydet'}
          </button>
        </div>
      </div>

      {/* Password change — requires current password */}
      <div className="card p-6">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Lock size={16} className="text-orange-400" /> Şifre Değiştir
        </h2>
        <div className="space-y-3">
          <div>
            <label className="label">Mevcut Şifre</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} className="input pr-10" placeholder="Mevcut şifrenizi girin" />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Yeni Şifre</label>
              <input type={showPwd ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)} className="input" placeholder="Min. 8 karakter" />
            </div>
            <div>
              <label className="label">Tekrar</label>
              <input type={showPwd ? 'text' : 'password'} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} className="input" placeholder="Yeni şifreyi tekrar gir" />
            </div>
          </div>
          {pwdError && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-lg">{pwdError}</div>}
          {pwdSuccess && <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-3 py-2 rounded-lg">Şifre güncellendi.</div>}
          <button onClick={handlePasswordChange} className="btn-secondary w-full justify-center">
            <Lock size={16} /> Güncelle
          </button>
        </div>
      </div>

      {/* Graduate info section */}
      {isGraduate && (
        <div className="card p-6">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <GraduationCap size={16} className="text-green-400" /> Mezun Bilgileri
          </h2>
          <div className="space-y-4">
            <div>
              <label className="label">Mezuniyet Yılı</label>
              <select value={gradYear} onChange={e => setGradYear(e.target.value)} className="input">
                {Array.from({ length: 15 }, (_, i) => String(new Date().getFullYear() - i)).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Üniversite</label>
                <input type="text" value={gradUniversity} onChange={e => setGradUniversity(e.target.value)} className="input" placeholder="İTÜ, ODTÜ, Boğaziçi…" />
              </div>
              <div>
                <label className="label">Bölüm</label>
                <input type="text" value={gradDepartment} onChange={e => setGradDepartment(e.target.value)} className="input" placeholder="Bilgisayar Müh., Makine…" />
              </div>
            </div>
            {/* Share profile toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setGradShare(v => !v)}
                className={`relative w-10 h-5 rounded-full transition-colors ${gradShare ? 'bg-cyan-500' : 'bg-slate-700'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${gradShare ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm text-slate-300">Profili mezunlar sayfasında göster</span>
            </label>

            {/* Contact visibility toggles — values come from own profile */}
            <div className="border border-slate-800/60 rounded-xl p-4 space-y-2">
              <p className="text-xs font-medium text-slate-400 mb-2">Mezunlar sayfasında hangi iletişim bilgileri görünsün?</p>
              {currentUser.instagram ? (
                <button type="button" onClick={() => setGradShareInstagram(v => !v)}
                  className="flex items-center gap-2 w-full text-sm text-slate-300 hover:text-white transition-colors">
                  {gradShareInstagram ? <CheckSquare size={15} className="text-cyan-400" /> : <Square size={15} className="text-slate-500" />}
                  <Instagram size={13} className="text-pink-400" /> @{currentUser.instagram}
                </button>
              ) : (
                <p className="text-xs text-slate-600">Instagram: profilden ekleyebilirsiniz.</p>
              )}
              {currentUser.email ? (
                <button type="button" onClick={() => setGradShareEmail(v => !v)}
                  className="flex items-center gap-2 w-full text-sm text-slate-300 hover:text-white transition-colors">
                  {gradShareEmail ? <CheckSquare size={15} className="text-cyan-400" /> : <Square size={15} className="text-slate-500" />}
                  <Mail size={13} className="text-cyan-400" /> {currentUser.email}
                </button>
              ) : (
                <p className="text-xs text-slate-600">E-posta: yukarıdan ekleyebilirsiniz.</p>
              )}
              {currentUser.phone ? (
                <button type="button" onClick={() => setGradSharePhone(v => !v)}
                  className="flex items-center gap-2 w-full text-sm text-slate-300 hover:text-white transition-colors">
                  {gradSharePhone ? <CheckSquare size={15} className="text-cyan-400" /> : <Square size={15} className="text-slate-500" />}
                  <Phone size={13} className="text-slate-400" /> {currentUser.phone}
                </button>
              ) : (
                <p className="text-xs text-slate-600">Telefon: yukarıdan ekleyebilirsiniz.</p>
              )}
            </div>

            <button
              onClick={() => {
                saveGraduate({
                  userId: currentUser.id,
                  schoolId: selectedSchoolId,
                  graduationYear: gradYear,
                  university: gradUniversity,
                  department: gradDepartment,
                  shareProfile: gradShare,
                  shareInstagram: gradShareInstagram,
                  shareEmail: gradShareEmail,
                  sharePhone: gradSharePhone,
                });
                setGradSaved(true);
                setTimeout(() => setGradSaved(false), 2500);
              }}
              className={`btn-primary w-full justify-center transition-all ${gradSaved ? 'bg-green-500 hover:bg-green-400' : ''}`}
            >
              <Save size={16} /> {gradSaved ? 'Kaydedildi!' : 'Mezun Bilgilerini Kaydet'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
