import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, UserPlus, Lock, Megaphone, Trash2, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { avatarGradient } from '../utils/avatar';

const PRESET_TYPES: Record<string, string> = { robotics: 'Robotik', teknofest: 'Teknofest', other: 'Diğer' };
const PRESET_COLORS: Record<string, string> = {
  robotics: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  teknofest: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  other: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
};
const DEFAULT_CUSTOM_COLOR = 'bg-slate-700/60 text-slate-300 border-slate-600';

const getTypeLabel = (type: string) => PRESET_TYPES[type] || type;
const getTypeColor = (type: string) => PRESET_COLORS[type] || DEFAULT_CUSTOM_COLOR;

export default function TeamsPage() {
  const { currentUser, teams, users, selectedSchoolId, createTeam, deleteTeam, toggleRecruiting } = useStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDeleteTeamId, setConfirmDeleteTeamId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', type: 'robotics', customType: '', description: '', captainId: '' });
  // Captain search state for create modal
  const [captainSearch, setCaptainSearch] = useState('');
  const [selectedCaptain, setSelectedCaptain] = useState<{ id: string; label: string } | null>(null);
  // Initial members for create modal
  const [createMembers, setCreateMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [showMemberSearch, setShowMemberSearch] = useState(false);

  // School students & captains that admin can assign as captain
  const schoolStudents = users.filter(u => u.schoolId === selectedSchoolId && u.role === 'student');
  // Live search results for captain input
  const captainSearchResults = captainSearch.trim().length >= 1
    ? schoolStudents.filter(u => {
        const q = captainSearch.toLowerCase();
        return u.firstName.toLowerCase().includes(q) || u.lastName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
      }).slice(0, 8)
    : [];

  // Live search results for member add in create modal (exclude captain + already selected)
  const captainIdForSearch = selectedCaptain?.id;
  const memberSearchResults = memberSearch.trim().length >= 1
    ? schoolStudents.filter(u => {
        if (u.id === captainIdForSearch) return false;
        if (createMembers.includes(u.id)) return false;
        const q = memberSearch.toLowerCase();
        return u.firstName.toLowerCase().includes(q) || u.lastName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
      }).slice(0, 8)
    : [];

  const isAdmin = currentUser && ['superadmin', 'admin', 'tech_teacher'].includes(currentUser.role);
  const isBranchTeacher = currentUser?.role === 'branch_teacher';
  const canPickCaptain = !!(isAdmin || isBranchTeacher);

  const schoolTeams = teams.filter(t => t.schoolId === selectedSchoolId);
  const isCaptain = currentUser ? schoolTeams.some(t => t.captainId === currentUser.id) : false;

  // Dynamic filter list: all unique types from existing teams + all presets
  const teamTypes = ['all', ...new Set([...Object.keys(PRESET_TYPES), ...schoolTeams.map(t => t.type)])];

  const filtered = schoolTeams.filter(t => {
    if (filter !== 'all' && t.type !== filter) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const resolvedType = form.type === 'custom' ? (form.customType.trim() || 'other') : form.type;

  const resetCreateForm = () => {
    setShowCreate(false);
    setForm({ name: '', type: 'robotics', customType: '', description: '', captainId: '' });
    setCaptainSearch('');
    setSelectedCaptain(null);
    setCreateMembers([]);
    setMemberSearch('');
    setShowMemberSearch(false);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    // Admins/branch teachers must pick a captain via search; students become their own team captain
    const captainId = canPickCaptain ? (selectedCaptain?.id || '') : currentUser.id;
    if (canPickCaptain && !captainId) return; // should not happen since input is required
    const gradients = ['from-cyan-500 to-blue-600', 'from-orange-500 to-red-600', 'from-purple-500 to-indigo-600', 'from-green-500 to-teal-600'];
    createTeam({
      name: form.name,
      type: resolvedType,
      captainId,
      description: form.description,
      logoInitials: form.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      logoColor: gradients[Math.floor(Math.random() * gradients.length)],
      socialMedia: {},
      isRecruiting: false,
      schoolId: selectedSchoolId,
      ...(createMembers.length > 0 ? { initialMembers: createMembers } as any : {}),
    });
    resetCreateForm();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
            <Users size={16} className="text-orange-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Takımlar</h1>
          <span className="badge bg-slate-800 text-slate-400 border border-slate-700">{schoolTeams.length}</span>
        </div>
        <div className="flex-1" />
        {(isAdmin || isBranchTeacher || isCaptain) && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} /> Yeni Takım
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Takım ara..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {teamTypes.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 text-sm rounded-lg border transition-all ${filter === f ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:border-slate-600'}`}
            >
              {f === 'all' ? 'Tümü' : getTypeLabel(f)}
            </button>
          ))}
        </div>
      </div>

      {/* Teams Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(team => {
          const captain = users.find(u => u.id === team.captainId);
          const isMyTeam = currentUser && team.members.includes(currentUser.id);
          const hasApplied = currentUser && team.applications.some(a => a.userId === currentUser.id);

          return (
            <div key={team.id} className="card-hover p-5 flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {team.logoUrl ? (
                    <img src={team.logoUrl} alt={team.name} className="w-12 h-12 object-contain flex-shrink-0" />
                  ) : (
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${team.logoColor} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                      {team.logoInitials}
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-white leading-tight">{team.name}</h3>
                    <span className={`badge border ${getTypeColor(team.type)} mt-1`}>
                      {getTypeLabel(team.type)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                {team.isRecruiting && (
                  <span className="badge bg-green-500/15 text-green-400 border border-green-500/20">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    Alım Açık
                  </span>
                )}
                {isAdmin && (
                  confirmDeleteTeamId === team.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={e => { e.stopPropagation(); deleteTeam(team.id); setConfirmDeleteTeamId(null); }}
                        className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 rounded hover:bg-red-500/20 transition-colors"
                      >Evet</button>
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeleteTeamId(null); }}
                        className="text-xs text-slate-400 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded hover:bg-slate-700 transition-colors"
                      >İptal</button>
                    </div>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmDeleteTeamId(team.id); }}
                      className="text-slate-600 hover:text-red-400 transition-colors p-0.5"
                      title="Takımı sil"
                    >
                      <Trash2 size={13} />
                    </button>
                  )
                )}
              </div>
              </div>

              <p className="text-sm text-slate-400 leading-relaxed mb-4 flex-1 line-clamp-3">{team.description}</p>

              {/* Members */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex -space-x-2">
                  {team.members.slice(0, 4).map(memberId => {
                    const m = users.find(u => u.id === memberId);
                    if (!m) return null;
                    return (
                      <div key={memberId} className={`w-7 h-7 rounded-full border-2 border-[#0f1d30] flex items-center justify-center text-xs font-medium text-white ${avatarGradient(memberId)}`}>
                        {m.firstName[0]}{m.lastName[0]}
                      </div>
                    );
                  })}
                  {team.members.length > 4 && (
                    <div className="w-7 h-7 rounded-full bg-slate-700 border-2 border-[#0f1d30] flex items-center justify-center text-xs text-slate-400">
                      +{team.members.length - 4}
                    </div>
                  )}
                </div>
                <span className="text-xs text-slate-500">{team.members.length} üye</span>
                {captain && <span className="text-xs text-slate-600">· Kpt: {captain.firstName}</span>}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={() => navigate(`/teams/${team.id}`)} className="btn-secondary flex-1 justify-center text-sm py-2">Detay</button>
                {!isMyTeam && team.isRecruiting && !hasApplied && currentUser?.role === 'student' && (
                  <button onClick={() => navigate(`/teams/${team.id}`)} className="btn-primary flex-1 justify-center text-sm py-2">
                    <UserPlus size={14} /> Başvur
                  </button>
                )}
                {hasApplied && <span className="flex-1 text-center text-sm text-slate-500 py-2">Başvuruldu</span>}
                {isMyTeam && <span className="flex-1 text-center text-xs text-cyan-400 py-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">Üyesin</span>}
              </div>

              {/* Toggle recruiting */}
              {currentUser && (team.captainId === currentUser.id || isAdmin) && (
                <button
                  onClick={(e) => { e.stopPropagation(); toggleRecruiting(team.id); }}
                  className={`mt-2 text-xs w-full py-1.5 rounded-lg border transition-all ${team.isRecruiting ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'}`}
                >
                  {team.isRecruiting ? <><Lock size={12} className="inline mr-1" /> Alımı Kapat</> : <><Megaphone size={12} className="inline mr-1" /> Alım Aç</>}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card p-12 text-center">
          <Users size={32} className="mx-auto text-slate-700 mb-3" />
          <p className="text-slate-400">Takım bulunamadı.</p>
        </div>
      )}

      {/* Create Team Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 animate-slide-up">
            <h2 className="text-lg font-bold text-white mb-5">Yeni Takım Oluştur</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Takım Adı</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" required placeholder="Takım adı..." />
              </div>
              <div>
                <label className="label">Kategori</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input">
                  <option value="robotics">Robotik</option>
                  <option value="teknofest">Teknofest</option>
                  <option value="other">Diğer</option>
                  <option value="custom">Özel kategori...</option>
                </select>
              </div>
              {form.type === 'custom' && (
                <div>
                  <label className="label">Kategori Adı</label>
                  <input
                    type="text"
                    value={form.customType}
                    onChange={e => setForm(f => ({ ...f, customType: e.target.value }))}
                    className="input"
                    required={form.type === 'custom'}
                    placeholder="ör. Yapay Zeka, Siber Güvenlik..."
                  />
                </div>
              )}
              <div>
                <label className="label">Açıklama</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input h-24 resize-none" required placeholder="Takım hakkında kısa açıklama..." />
              </div>
              {canPickCaptain && (
                <div>
                  <label className="label">Kaptan</label>
                  {selectedCaptain ? (
                    <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-3 py-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${avatarGradient(selectedCaptain.id)}`}>
                        {selectedCaptain.label.split(' ').map(w => w[0]).join('').slice(0, 2)}
                      </div>
                      <span className="text-sm text-white flex-1 truncate">{selectedCaptain.label}</span>
                      <button
                        type="button"
                        onClick={() => { setSelectedCaptain(null); setCaptainSearch(''); }}
                        className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={captainSearch}
                        onChange={e => setCaptainSearch(e.target.value)}
                        className="input pl-9"
                        placeholder="Kaptan adını yaz..."
                        required={canPickCaptain && !selectedCaptain}
                      />
                      {captainSearchResults.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-[#0d1826] border border-slate-700/60 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                          {captainSearchResults.map(u => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setSelectedCaptain({ id: u.id, label: `${u.firstName} ${u.lastName}${u.class ? ` — ${u.class}/${u.section}` : ''}` });
                                setCaptainSearch('');
                              }}
                              className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-800/60 transition-colors"
                            >
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${avatarGradient(u.id)}`}>
                                {u.firstName[0]}{u.lastName[0]}
                              </div>
                              <div>
                                <p className="text-sm text-white">{u.firstName} {u.lastName}</p>
                                <p className="text-xs text-slate-500">{u.class ? `${u.class}/${u.section} · ` : ''}@{u.username}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {captainSearch.trim().length >= 1 && captainSearchResults.length === 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-[#0d1826] border border-slate-700/60 rounded-xl p-3 text-center text-sm text-slate-500 z-20">
                          Kullanıcı bulunamadı.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {/* Initial members */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Üyeler <span className="text-slate-600 font-normal">(opsiyonel)</span></label>
                  <button
                    type="button"
                    onClick={() => setShowMemberSearch(s => !s)}
                    className="flex items-center gap-1 text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded-lg hover:bg-cyan-500/20 transition-colors"
                  >
                    <UserPlus size={12} /> Üye Ekle
                  </button>
                </div>
                {createMembers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {createMembers.map(uid => {
                      const u = users.find(x => x.id === uid);
                      if (!u) return null;
                      return (
                        <div key={uid} className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700 text-slate-300 text-xs px-2 py-1 rounded-lg">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${avatarGradient(uid)}`}>
                            {u.firstName[0]}{u.lastName[0]}
                          </div>
                          {u.firstName} {u.lastName}
                          <button type="button" onClick={() => setCreateMembers(m => m.filter(id => id !== uid))} className="text-slate-500 hover:text-red-400 transition-colors ml-0.5">
                            <X size={10} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {showMemberSearch && (
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                      className="input pl-8 text-sm"
                      placeholder="Üye ara..."
                      autoFocus
                    />
                    {memberSearchResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-[#0d1826] border border-slate-700/60 rounded-xl shadow-xl z-20 max-h-40 overflow-y-auto">
                        {memberSearchResults.map(u => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => { setCreateMembers(m => [...m, u.id]); setMemberSearch(''); }}
                            className="w-full text-left flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800/60 transition-colors"
                          >
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${avatarGradient(u.id)}`}>
                              {u.firstName[0]}{u.lastName[0]}
                            </div>
                            <div>
                              <p className="text-sm text-white">{u.firstName} {u.lastName}</p>
                              <p className="text-xs text-slate-500">{u.class ? `${u.class}/${u.section} · ` : ''}@{u.username}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {memberSearch.trim().length >= 1 && memberSearchResults.length === 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-[#0d1826] border border-slate-700/60 rounded-xl p-3 text-center text-sm text-slate-500 z-20">
                        Kullanıcı bulunamadı.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={resetCreateForm} className="btn-secondary flex-1 justify-center">İptal</button>
                <button type="submit" className="btn-primary flex-1 justify-center">Oluştur</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
