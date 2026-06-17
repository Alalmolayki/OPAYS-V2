import { useState } from 'react';
import { Shield, Search, Edit3, X, Check, Trash2, RefreshCw, Eye, Instagram, ChevronDown, UserPlus, Copy, CheckCircle, ShieldOff, ShieldX, Key, AtSign } from 'lucide-react';
import { useStore } from '../store/useStore';
import { avatarGradient } from '../utils/avatar';
import type { UserRole } from '../types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Süperadmin',
  admin: 'Okul Admini',
  tech_teacher: 'Teknoloji Öğrt.',
  branch_teacher: 'Branş Öğrt.',
  student: 'Öğrenci',
  demo: 'Demo',
  graduate: 'Mezun',
};
const ROLE_COLORS: Record<UserRole, string> = {
  superadmin: 'bg-red-500/15 text-red-400 border-red-500/20',
  admin: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  tech_teacher: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  branch_teacher: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  student: 'bg-slate-700/60 text-slate-400 border-slate-700',
  demo: 'bg-green-500/15 text-green-400 border-green-500/20',
  graduate: 'bg-teal-500/15 text-teal-400 border-teal-500/20',
};

/** Normalize Turkish characters for auto username generation */
const normalizeTr = (s: string) =>
  s.replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
   .replace(/ü/g, 'u').replace(/Ü/g, 'u')
   .replace(/ş/g, 's').replace(/Ş/g, 's')
   .replace(/ı/g, 'i').replace(/İ/g, 'i')
   .replace(/ö/g, 'o').replace(/Ö/g, 'o')
   .replace(/ç/g, 'c').replace(/Ç/g, 'c');

const genPassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export default function UsersPage() {
  const { currentUser, users, teams, selectedSchoolId, updateUser, deleteUser, resetUserProfile, watchList, addToWatchList, createRegistrationCode, graduates, changePassword } = useStore();

  const isSuper = currentUser?.role === 'superadmin';
  const canManage = currentUser && ['superadmin', 'admin', 'tech_teacher', 'branch_teacher'].includes(currentUser.role);
  // Branch/tech teachers can only act on students, not on other staff
  const isTeacherActor = currentUser && ['branch_teacher', 'tech_teacher'].includes(currentUser.role);
  const canActOn = (targetRole: UserRole) => !isTeacherActor || targetRole === 'student';
  const isStaffRole = (role: UserRole) => ['superadmin', 'admin', 'branch_teacher', 'tech_teacher'].includes(role);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('student');
  const [detailUser, setDetailUser] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [watchReason, setWatchReason] = useState('');
  const [showWatchInput, setShowWatchInput] = useState<string | null>(null);

  // Registration code generation modal
  const [showAddUser, setShowAddUser] = useState(false);
  const [addForm, setAddForm] = useState({ firstName: '', lastName: '', role: 'student' as UserRole, schoolId: selectedSchoolId, graduationYear: String(new Date().getFullYear()) });
  const [addResult, setAddResult] = useState<{ code: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Ban modal
  const [banModal, setBanModal] = useState<string | null>(null); // userId
  const [banType, setBanType] = useState<'indefinite' | 'date'>('indefinite');
  const [banUntil, setBanUntil] = useState('');

  // Username edit modal
  const [editUsernameId, setEditUsernameId] = useState<string | null>(null);
  const [editUsernameValue, setEditUsernameValue] = useState('');
  const [editUsernameError, setEditUsernameError] = useState('');

  // Password reset modal
  const [resetPwdUserId, setResetPwdUserId] = useState<string | null>(null);
  const [resetPwdValue, setResetPwdValue] = useState('');
  const [resetPwdDone, setResetPwdDone] = useState(false);
  const [resetPwdCopied, setResetPwdCopied] = useState(false);

  const currentYear = new Date().getFullYear();
  const existingYears = graduates
    .filter(g => g.schoolId === selectedSchoolId)
    .map(g => g.graduationYear);
  const yearOptions = Array.from(new Set([
    ...Array.from({ length: 10 }, (_, i) => String(currentYear - i)),
    ...existingYears,
  ])).sort((a, b) => Number(b) - Number(a));

  const ADDABLE_ROLES: UserRole[] = isSuper
    ? ['student', 'branch_teacher', 'tech_teacher', 'admin', 'demo', 'graduate', 'superadmin']
    : ['student', 'branch_teacher', 'graduate'];

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const schoolId = addForm.role === 'admin' ? (addForm.schoolId || selectedSchoolId) : selectedSchoolId;
    const code = createRegistrationCode({
      firstName: addForm.firstName.trim(),
      lastName: addForm.lastName.trim(),
      role: addForm.role,
      schoolId,
      graduationYear: addForm.role === 'graduate' ? addForm.graduationYear : undefined,
    });
    setAddResult({ code });
  };

  const handleBan = () => {
    if (!banModal) return;
    updateUser(banModal, {
      isBlacklisted: true,
      bannedUntil: banType === 'date' && banUntil ? new Date(banUntil).toISOString() : undefined,
    });
    setBanModal(null);
    setBanUntil('');
    setBanType('indefinite');
  };

  const closeAdd = () => {
    setShowAddUser(false);
    setAddResult(null);
    setAddForm({ firstName: '', lastName: '', role: 'student', schoolId: selectedSchoolId, graduationYear: String(currentYear) });
    setCopied(false);
  };

  const copyCode = () => {
    if (!addResult) return;
    navigator.clipboard.writeText(addResult.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const schoolUsers = users.filter(u => {
    if (u.schoolId !== selectedSchoolId) return false;
    if (u.id === currentUser?.id) return false;
    if (u.role === 'superadmin' && !isSuper) return false;
    return true;
  });
  const schoolTeams = teams.filter(t => t.schoolId === selectedSchoolId);
  const schoolCaptainIds = new Set(schoolTeams.map(t => t.captainId));
  const captainTeamMap = new Map(schoolTeams.map(t => [t.captainId, t.name]));
  const filtered = schoolUsers.filter(u => {
    if (roleFilter === 'banned') return u.isBlacklisted;
    if (roleFilter === 'captain') return schoolCaptainIds.has(u.id) && !u.isBlacklisted;
    if (u.isBlacklisted) return false;
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    const q = search.toLowerCase();
    return !q || `${u.firstName} ${u.lastName} ${u.username} ${u.email}`.toLowerCase().includes(q);
  });

  const isOnWatchList = (userId: string) => watchList.some(w => w.userId === userId && w.isActive);
  const getWatchEntries = (userId: string) => watchList.filter(w => w.userId === userId && w.isActive);
  const selectedDetail = detailUser ? users.find(u => u.id === detailUser) : null;

  const handleRoleSave = (userId: string) => { updateUser(userId, { role: editRole }); setEditingId(null); };

  const handleAddWatch = (userId: string) => {
    if (!currentUser || !watchReason.trim()) return;
    addToWatchList(userId, watchReason.trim(), currentUser.id);
    setShowWatchInput(null);
    setWatchReason('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
            <Shield size={16} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Kullanıcı Yönetimi</h1>
          <span className="badge bg-slate-800 text-slate-400 border border-slate-700">{schoolUsers.length}</span>
        </div>
        {canManage && (
          <button onClick={() => setShowAddUser(true)} className="btn-primary">
            <UserPlus size={16} /> Kullanıcı Ekle
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Kullanıcı ara..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input sm:w-48">
          <option value="all">Tüm Roller</option>
          {(Object.keys(ROLE_LABELS) as UserRole[]).map(k => <option key={k} value={k}>{ROLE_LABELS[k]}</option>)}
          <option value="captain">Takım Kaptanı</option>
          {isSuper && <option value="banned">🚫 Banlı Hesaplar</option>}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {(Object.keys(ROLE_LABELS) as UserRole[]).filter(r => r !== 'superadmin' && r !== 'demo' && r !== 'graduate').map(role => {
          const count = schoolUsers.filter(u => u.role === role).length;
          return (
            <button key={role} onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}
              className={`card p-3 text-center transition-colors ${roleFilter === role ? 'border-cyan-500/40 bg-cyan-500/5' : 'hover:border-slate-700/80'}`}>
              <p className="text-xl font-bold text-white">{count}</p>
              <p className="text-xs text-slate-500 mt-0.5">{ROLE_LABELS[role]}</p>
            </button>
          );
        })}
        {/* Team captains — derived, not a role */}
        <button onClick={() => setRoleFilter(roleFilter === 'captain' ? 'all' : 'captain')}
          className={`card p-3 text-center transition-colors ${roleFilter === 'captain' ? 'border-cyan-500/40 bg-cyan-500/5' : 'hover:border-slate-700/80'}`}>
          <p className="text-xl font-bold text-white">{schoolCaptainIds.size}</p>
          <p className="text-xs text-slate-500 mt-0.5">Takım Kaptanı</p>
        </button>
        {/* Graduate */}
        {(() => {
          const count = schoolUsers.filter(u => u.role === 'graduate').length;
          return (
            <button onClick={() => setRoleFilter(roleFilter === 'graduate' ? 'all' : 'graduate')}
              className={`card p-3 text-center transition-colors ${roleFilter === 'graduate' ? 'border-cyan-500/40 bg-cyan-500/5' : 'hover:border-slate-700/80'}`}>
              <p className="text-xl font-bold text-white">{count}</p>
              <p className="text-xs text-slate-500 mt-0.5">Mezun</p>
            </button>
          );
        })()}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kullanıcı</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sınıf</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rol</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Puan</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filtered.map(user => {
                const onWatch = isOnWatchList(user.id);
                const isBanned = user.isBlacklisted;
                return (
                  <tr key={user.id} className={`transition-colors ${isBanned ? 'bg-red-500/3 hover:bg-red-500/5' : onWatch ? 'bg-amber-500/3 hover:bg-amber-500/5' : 'hover:bg-slate-800/20'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {user.photoUrl ? (
                          <img src={user.photoUrl} alt="Profil" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${onWatch ? 'bg-gradient-to-br from-amber-700/60 to-orange-800/40 border border-amber-500/20' : avatarGradient(user.id)}`}>
                            {user.firstName[0]}{user.lastName[0]}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium ${isBanned ? 'text-red-400 line-through opacity-60' : 'text-white'}`}>{user.firstName} {user.lastName}</p>
                            {isBanned && <span className="badge bg-red-500/15 text-red-400 border border-red-500/20"><ShieldOff size={9} /> Banlı</span>}
                            {onWatch && !isBanned && <span className="badge bg-amber-500/15 text-amber-400 border border-amber-500/20"><Eye size={9} /></span>}
                            {roleFilter === 'captain' && captainTeamMap.has(user.id) && (
                              <span className="badge bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px]">{captainTeamMap.get(user.id)}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {canManage && user.class ? (
                        <div className="flex items-center gap-1">
                          <input type="text" defaultValue={user.class} onBlur={e => updateUser(user.id, { class: e.target.value })}
                            className="w-8 bg-transparent text-slate-300 text-sm border-b border-transparent hover:border-slate-600 focus:border-cyan-500 focus:outline-none transition-colors" />
                          <span className="text-slate-500">/</span>
                          <input type="text" defaultValue={user.section} onBlur={e => updateUser(user.id, { section: e.target.value })}
                            className="w-6 bg-transparent text-slate-300 text-sm border-b border-transparent hover:border-slate-600 focus:border-cyan-500 focus:outline-none transition-colors" />
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400">{user.class ? `${user.class}/${user.section}` : '—'}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === user.id ? (
                        <div className="flex items-center gap-2">
                          <select value={editRole} onChange={e => setEditRole(e.target.value as UserRole)} className="input py-1 text-xs w-36" autoFocus>
                            {(Object.keys(ROLE_LABELS) as UserRole[]).map(k => <option key={k} value={k}>{ROLE_LABELS[k]}</option>)}
                          </select>
                          <button onClick={() => handleRoleSave(user.id)} className="w-6 h-6 rounded-md bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25 flex items-center justify-center">
                            <Check size={11} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="w-6 h-6 rounded-md bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center">
                            <X size={11} />
                          </button>
                        </div>
                      ) : (
                        <span className={`badge border ${ROLE_COLORS[user.role]}`}>{ROLE_LABELS[user.role]}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isStaffRole(user.role)
                        ? <span className="text-sm text-slate-600">—</span>
                        : <span className="text-sm text-amber-400 font-medium">{user.points || 0}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => setDetailUser(user.id)} className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 flex items-center justify-center transition-colors" title="Detay">
                          <ChevronDown size={13} />
                        </button>
                        {isSuper && editingId !== user.id && (
                          <button onClick={() => { setEditingId(user.id); setEditRole(user.role); }} className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 flex items-center justify-center transition-colors" title="Rolü Düzenle">
                            <Edit3 size={13} />
                          </button>
                        )}
                        {canManage && !isBanned && canActOn(user.role) && (
                          <button onClick={() => { setResetPwdUserId(user.id); setResetPwdValue(genPassword()); setResetPwdDone(false); setResetPwdCopied(false); }} className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-yellow-400 hover:border-yellow-500/30 flex items-center justify-center transition-colors" title="Şifre Sıfırla">
                            <Key size={13} />
                          </button>
                        )}
                        {canManage && !onWatch && canActOn(user.role) && (
                          <button onClick={() => setShowWatchInput(user.id)} className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-amber-400 hover:border-amber-500/30 flex items-center justify-center transition-colors" title="WatchList'e Ekle">
                            <Eye size={13} />
                          </button>
                        )}
                        {canManage && canActOn(user.role) && (
                          <button onClick={() => resetUserProfile(user.id)} className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-blue-400 hover:border-blue-500/30 flex items-center justify-center transition-colors" title="Profil Sıfırla">
                            <RefreshCw size={13} />
                          </button>
                        )}
                        {canManage && !isBanned && user.role === 'student' && (
                          <button onClick={() => setBanModal(user.id)} className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/30 flex items-center justify-center transition-colors" title="Banla">
                            <ShieldX size={13} />
                          </button>
                        )}
                        {isSuper && isBanned && (
                          <button onClick={() => updateUser(user.id, { isBlacklisted: false, bannedUntil: undefined })} className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 flex items-center justify-center transition-colors" title="Banı Kaldır">
                            <ShieldOff size={13} />
                          </button>
                        )}
                        {canManage && !isBanned && canActOn(user.role) && (
                          <button onClick={() => setConfirmDelete(user.id)} className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/30 flex items-center justify-center transition-colors" title="Sil">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="p-12 text-center text-slate-400">Kullanıcı bulunamadı.</div>}
      </div>

      {/* WatchList reason input */}
      {showWatchInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-sm p-6 animate-slide-up">
            <h3 className="text-lg font-bold text-white mb-1">WatchList'e Ekle</h3>
            <p className="text-slate-400 text-sm mb-4">{users.find(u => u.id === showWatchInput)?.firstName} {users.find(u => u.id === showWatchInput)?.lastName}</p>
            <div className="mb-4">
              <label className="label">Sebep</label>
              <textarea value={watchReason} onChange={e => setWatchReason(e.target.value)} className="input h-24 resize-none" placeholder="İzleme sebebini açıklayın..." />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowWatchInput(null); setWatchReason(''); }} className="btn-secondary flex-1 justify-center">İptal</button>
              <button onClick={() => handleAddWatch(showWatchInput!)} disabled={!watchReason.trim()} className="btn-primary flex-1 justify-center">Ekle</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-sm p-6 animate-slide-up">
            <h3 className="text-lg font-bold text-red-400 mb-2">Kullanıcıyı Sil</h3>
            <p className="text-slate-400 text-sm mb-5">
              <strong className="text-white">{users.find(u => u.id === confirmDelete)?.firstName} {users.find(u => u.id === confirmDelete)?.lastName}</strong> adlı kullanıcı kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1 justify-center">İptal</button>
              <button onClick={() => { deleteUser(confirmDelete); setConfirmDelete(null); }} className="btn-danger flex-1 justify-center">Sil</button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Panel */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-lg p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">Kullanıcı Detayı</h3>
              <button onClick={() => setDetailUser(null)} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
            </div>
            <div className="flex items-center gap-4 mb-5">
              {selectedDetail.photoUrl ? (
                <img src={selectedDetail.photoUrl} alt="Profil" className="w-14 h-14 rounded-2xl object-cover flex-shrink-0" />
              ) : (
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl ${isOnWatchList(selectedDetail.id) ? 'bg-gradient-to-br from-amber-700/60 to-orange-800/40 border border-amber-500/20' : avatarGradient(selectedDetail.id)}`}>
                  {selectedDetail.firstName[0]}{selectedDetail.lastName[0]}
                </div>
              )}
              <div>
                <p className="text-xl font-bold text-white">{selectedDetail.firstName} {selectedDetail.lastName}</p>
                <p className="text-slate-400">@{selectedDetail.username}</p>
                <span className={`badge border mt-1 ${ROLE_COLORS[selectedDetail.role]}`}>{ROLE_LABELS[selectedDetail.role]}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div><p className="text-xs text-slate-500">E-posta</p><p className="text-slate-300">{selectedDetail.email}</p></div>
              <div><p className="text-xs text-slate-500">Telefon</p><p className="text-slate-300">{selectedDetail.phone || '—'}</p></div>
              <div><p className="text-xs text-slate-500">Instagram</p><p className="text-slate-300 flex items-center gap-1">{selectedDetail.instagram ? <><Instagram size={12} /> @{selectedDetail.instagram}</> : '—'}</p></div>
              <div><p className="text-xs text-slate-500">Puan</p><p className="text-amber-400 font-semibold">{selectedDetail.points || 0}</p></div>
              <div><p className="text-xs text-slate-500">Sınıf</p><p className="text-slate-300">{selectedDetail.class ? `${selectedDetail.class}/${selectedDetail.section}` : '—'}</p></div>
              <div><p className="text-xs text-slate-500">Kayıt</p><p className="text-slate-300">{format(new Date(selectedDetail.createdAt), 'd MMM yyyy', { locale: tr })}</p></div>
            </div>
            {selectedDetail.skills.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-slate-500 mb-2">Beceriler</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDetail.skills.map(s => <span key={s} className="text-xs bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-lg">{s}</span>)}
                </div>
              </div>
            )}
            {isOnWatchList(selectedDetail.id) && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mb-4">
                <p className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-1"><Eye size={12} /> WatchList Kayıtları</p>
                {getWatchEntries(selectedDetail.id).map(e => (
                  <div key={e.id} className="text-xs text-slate-400 mb-1">
                    <span className="text-amber-300">·</span> {e.reason} <span className="text-slate-600">({format(new Date(e.date), 'd MMM', { locale: tr })})</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setDetailUser(null)} className="btn-secondary w-full justify-center">Kapat</button>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {banModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-sm p-6 animate-slide-up">
            <h3 className="text-lg font-bold text-red-400 mb-1">Kullanıcıyı Banla</h3>
            <p className="text-slate-400 text-sm mb-4">
              <strong className="text-white">{users.find(u => u.id === banModal)?.firstName} {users.find(u => u.id === banModal)?.lastName}</strong>
            </p>
            <div className="space-y-3 mb-5">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="radio" name="banType" value="indefinite" checked={banType === 'indefinite'} onChange={() => setBanType('indefinite')} className="accent-red-400" />
                <span className="text-sm text-slate-300">Süperadmin açana kadar (belirsiz)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="radio" name="banType" value="date" checked={banType === 'date'} onChange={() => setBanType('date')} className="accent-red-400" />
                <span className="text-sm text-slate-300">Belirli bir tarihe kadar</span>
              </label>
              {banType === 'date' && (
                <input
                  type="date"
                  value={banUntil}
                  onChange={e => setBanUntil(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="input ml-6"
                  required
                />
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setBanModal(null); setBanUntil(''); setBanType('indefinite'); }} className="btn-secondary flex-1 justify-center">İptal</button>
              <button onClick={handleBan} disabled={banType === 'date' && !banUntil} className="btn-danger flex-1 justify-center">
                <ShieldX size={15} /> Banla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetPwdUserId && (() => {
        const targetUser = users.find(u => u.id === resetPwdUserId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="card w-full max-w-sm p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center">
                    <Key size={15} className="text-yellow-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Şifre Sıfırla</h3>
                </div>
                <button onClick={() => setResetPwdUserId(null)} className="text-slate-500 hover:text-slate-300">
                  <X size={18} />
                </button>
              </div>

              <p className="text-slate-400 text-sm mb-4">
                <span className="text-white font-medium">{targetUser?.firstName} {targetUser?.lastName}</span> için yeni şifre
              </p>

              {resetPwdDone ? (
                <div className="space-y-4">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
                    <p className="text-sm text-green-400 font-medium">Şifre başarıyla güncellendi.</p>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 space-y-2">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Yeni Şifre</p>
                    <p className="text-cyan-400 font-bold text-lg tracking-widest" style={{ fontFamily: 'monospace' }}>{resetPwdValue}</p>
                    <p className="text-xs text-slate-600">Bu şifreyi öğrenciyle paylaşın.</p>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(resetPwdValue); setResetPwdCopied(true); setTimeout(() => setResetPwdCopied(false), 2000); }}
                    className={`btn-secondary w-full justify-center ${resetPwdCopied ? 'text-green-400 border-green-500/30' : ''}`}
                  >
                    {resetPwdCopied ? <><CheckCircle size={15} /> Kopyalandı</> : <><Copy size={15} /> Şifreyi Kopyala</>}
                  </button>
                  <button onClick={() => setResetPwdUserId(null)} className="btn-primary w-full justify-center">Tamam</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="label">Yeni Şifre</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={resetPwdValue}
                        onChange={e => setResetPwdValue(e.target.value)}
                        className="input flex-1"
                        style={{ fontFamily: 'monospace' }}
                        placeholder="Şifre giriniz"
                      />
                      <button
                        type="button"
                        onClick={() => setResetPwdValue(genPassword())}
                        className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 flex items-center justify-center transition-colors flex-shrink-0"
                        title="Yeni şifre oluştur"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">Otomatik oluşturuldu — düzenleyebilir veya yenileyebilirsiniz.</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setResetPwdUserId(null)} className="btn-secondary flex-1 justify-center">İptal</button>
                    <button
                      disabled={resetPwdValue.length < 6}
                      onClick={() => {
                        if (!targetUser) return;
                        changePassword(targetUser.username, resetPwdValue);
                        setResetPwdDone(true);
                      }}
                      className="btn-primary flex-1 justify-center"
                    >
                      <Key size={14} /> Güncelle
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Username Edit Modal */}
      {editUsernameId && (() => {
        const targetUser = users.find(u => u.id === editUsernameId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="card w-full max-w-sm p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
                    <AtSign size={15} className="text-purple-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Kullanıcı Adı Değiştir</h3>
                </div>
                <button onClick={() => setEditUsernameId(null)} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
              </div>
              <p className="text-slate-400 text-sm mb-4">
                <span className="text-white font-medium">{targetUser?.firstName} {targetUser?.lastName}</span>
              </p>
              <div className="mb-4">
                <label className="label">Yeni Kullanıcı Adı</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">@</span>
                  <input
                    type="text"
                    value={editUsernameValue}
                    onChange={e => { setEditUsernameValue(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '')); setEditUsernameError(''); }}
                    className="input pl-7"
                    placeholder="yeni_kullanici_adi"
                    autoFocus
                  />
                </div>
                {editUsernameError && <p className="text-xs text-red-400 mt-1">{editUsernameError}</p>}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEditUsernameId(null)} className="btn-secondary flex-1 justify-center">İptal</button>
                <button
                  disabled={!editUsernameValue.trim() || editUsernameValue === targetUser?.username}
                  onClick={() => {
                    const newUn = editUsernameValue.trim();
                    if (users.some(u => u.username === newUn && u.id !== editUsernameId)) {
                      setEditUsernameError('Bu kullanıcı adı zaten alınmış.');
                      return;
                    }
                    updateUser(editUsernameId!, { username: newUn });
                    setEditUsernameId(null);
                  }}
                  className="btn-primary flex-1 justify-center"
                >
                  <AtSign size={14} /> Güncelle
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Registration Code Modal */}
      {showAddUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">Kullanıcı Ekle</h3>
              <button onClick={closeAdd} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
            </div>

            {!addResult ? (
              <form onSubmit={handleAddUser} className="space-y-4">
                <p className="text-sm text-slate-400">Ad, soyad ve rol girin — kayıt kodu oluşturulur, kişi bu kodla kendi hesabını açar.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Ad</label>
                    <input type="text" value={addForm.firstName} onChange={e => setAddForm(f => ({ ...f, firstName: e.target.value }))} className="input" required placeholder="Ad" />
                  </div>
                  <div>
                    <label className="label">Soyad</label>
                    <input type="text" value={addForm.lastName} onChange={e => setAddForm(f => ({ ...f, lastName: e.target.value }))} className="input" required placeholder="Soyad" />
                  </div>
                </div>
                <div>
                  <label className="label">Rol</label>
                  <select value={addForm.role} onChange={e => setAddForm(f => ({ ...f, role: e.target.value as UserRole }))} className="input">
                    {ADDABLE_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </div>
                {addForm.role === 'graduate' && (
                  <div>
                    <label className="label">Mezuniyet Yılı</label>
                    <select value={addForm.graduationYear} onChange={e => setAddForm(f => ({ ...f, graduationYear: e.target.value }))} className="input">
                      {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                )}
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={closeAdd} className="btn-secondary flex-1 justify-center">İptal</button>
                  <button type="submit" className="btn-primary flex-1 justify-center"><Key size={15} /> Kod Oluştur</button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
                  <p className="text-sm text-green-400 font-medium">Kayıt kodu başarıyla oluşturuldu.</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 space-y-3">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Kayıt Kodu</p>
                  <p className="font-mono text-cyan-400 font-bold text-lg tracking-widest">{addResult.code}</p>
                  <p className="text-xs text-slate-600">Bu kodu kişiyle paylaşın. Kişi sisteme girerek bu kodla kendi hesabını oluşturacak.</p>
                </div>
                <button onClick={copyCode} className={`btn-secondary w-full justify-center ${copied ? 'text-green-400 border-green-500/30' : ''}`}>
                  {copied ? <><CheckCircle size={15} /> Kopyalandı</> : <><Copy size={15} /> Kodu Kopyala</>}
                </button>
                <button onClick={closeAdd} className="btn-primary w-full justify-center">Tamam</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
