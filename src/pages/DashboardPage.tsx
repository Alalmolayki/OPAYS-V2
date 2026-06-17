import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FolderOpen, Calendar, Activity, Trophy, Megaphone, ChevronRight, Medal, Camera, Instagram, Plus, X, Check, Pencil } from 'lucide-react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { avatarGradient } from '../utils/avatar';

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ElementType; color: string }) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-400">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  if (priority === 'urgent') return <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0 mt-1.5" />;
  if (priority === 'medium') return <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />;
  return <span className="w-2 h-2 rounded-full bg-slate-600 flex-shrink-0 mt-1.5" />;
}


export default function DashboardPage() {
  const { currentUser, users, teams, projects, events, announcements, selectedSchoolId, schools, watchList, updateSchool } = useStore();
  const navigate = useNavigate();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const canManage = currentUser && ['superadmin', 'admin', 'tech_teacher'].includes(currentUser.role);

  // Social links edit state
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkInsta, setNewLinkInsta] = useState('');
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editLinkLabel, setEditLinkLabel] = useState('');
  const [editLinkInsta, setEditLinkInsta] = useState('');

  const handleAddSocialLink = () => {
    if (!newLinkLabel.trim() || !newLinkInsta.trim() || !selectedSchoolId) return;
    const school = schools.find(s => s.id === selectedSchoolId);
    const existing = school?.socialLinks || [];
    const id = Math.random().toString(36).substring(2, 10);
    updateSchool(selectedSchoolId, {
      socialLinks: [...existing, { id, label: newLinkLabel.trim(), instagram: newLinkInsta.trim().replace('@', '') }],
    });
    setNewLinkLabel(''); setNewLinkInsta(''); setShowAddLink(false);
  };

  const handleDeleteSocialLink = (id: string) => {
    const school = schools.find(s => s.id === selectedSchoolId);
    updateSchool(selectedSchoolId, { socialLinks: (school?.socialLinks || []).filter(l => l.id !== id) });
  };

  const handleSaveLinkEdit = (id: string) => {
    const school = schools.find(s => s.id === selectedSchoolId);
    updateSchool(selectedSchoolId, {
      socialLinks: (school?.socialLinks || []).map(l => l.id === id ? { ...l, label: editLinkLabel, instagram: editLinkInsta.replace('@', '') } : l),
    });
    setEditingLinkId(null);
  };

  const handleSchoolLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSchoolId) return;
    const reader = new FileReader();
    reader.onloadend = () => updateSchool(selectedSchoolId, { logoUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  const school = schools.find(s => s.id === selectedSchoolId);
  const activeProjects = projects.filter(p => p.status !== 'completed' && p.schoolId === selectedSchoolId);
  const upcomingEvents = events.filter(e => new Date(e.date) > new Date() && e.schoolId === selectedSchoolId);
  const schoolUsers = users.filter(u => u.schoolId === selectedSchoolId && u.role === 'student');
  const schoolTeams = teams.filter(t => t.schoolId === selectedSchoolId);
  const schoolAnnouncements = announcements.filter(a => a.schoolId === selectedSchoolId)
    .sort((a, b) => {
      const order: Record<string, number> = { urgent: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority] || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Leaderboard — top 5 students by points (excluding blacklisted)
  const leaderboard = users
    .filter(u => u.schoolId === selectedSchoolId && u.role === 'student' && !u.isBlacklisted)
    .sort((a, b) => (b.points || 0) - (a.points || 0))
    .slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* School Header */}
      <div className="card p-5 bg-gradient-to-r from-[#0f1d30] to-[#0d1626] border-cyan-500/10">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity size={16} className="text-cyan-400" />
              <span className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">Dashboard</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white">{school?.name || 'Okul'}</h1>
            <p className="text-slate-400 text-sm mt-0.5">{school?.city} · {new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          {/* Logo + branding — side by side */}
          <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
            <p className="text-[10px] text-slate-500 text-right leading-relaxed max-w-[160px]">
              Bu sistem Bahçelievler 15 Temmuz Şehitleri Teknoloji Proje AİHL öğrencileri tarafından tasarlanmıştır.
            </p>
            {/* School logo — superadmin can click to replace */}
            <div className="relative group flex-shrink-0">
              <div
                className={`w-14 h-14 rounded-xl border border-slate-700/60 overflow-hidden flex items-center justify-center bg-slate-800/40 ${isSuperAdmin ? 'cursor-pointer' : ''}`}
                onClick={() => isSuperAdmin && logoInputRef.current?.click()}
                title={isSuperAdmin ? 'Okul logosunu değiştir' : undefined}
              >
                {school?.logoUrl ? (
                  <img src={school.logoUrl} alt="Okul Logosu" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-xs text-slate-500 font-bold">{school?.abbreviation || 'LOGO'}</span>
                )}
              </div>
              {isSuperAdmin && (
                <>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleSchoolLogoChange} />
                  <div className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                    <Camera size={16} className="text-white" />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Social Links */}
      {((school?.socialLinks && school.socialLinks.length > 0) || canManage) && (
        <div className="card p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Instagram size={14} className="text-pink-400" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sosyal Medya</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {(school?.socialLinks || []).map(link => (
                <div key={link.id} className="flex items-center gap-1">
                  {editingLinkId === link.id ? (
                    /* Admin edit mode */
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <input value={editLinkLabel} onChange={e => setEditLinkLabel(e.target.value)} className="input text-xs py-1 h-7 w-28" placeholder="Etiket" />
                      <span className="text-slate-500 text-xs">@</span>
                      <input value={editLinkInsta} onChange={e => setEditLinkInsta(e.target.value)} className="input text-xs py-1 h-7 w-32" placeholder="instagram_adresi" />
                      <button onClick={() => handleSaveLinkEdit(link.id)} className="text-green-400 hover:text-green-300 transition-colors"><Check size={13} /></button>
                      <button onClick={() => setEditingLinkId(null)} className="text-slate-500 hover:text-slate-300 transition-colors"><X size={13} /></button>
                    </div>
                  ) : (
                    /* View mode — everyone sees "Takip Et" button, admin also sees handle + controls */
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`https://instagram.com/${link.instagram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-500/15 to-purple-500/15 border border-pink-500/25 rounded-full text-xs text-pink-400 hover:from-pink-500/25 hover:to-purple-500/25 transition-all font-medium"
                      >
                        <Instagram size={11} />
                        {link.label} — Takip Et
                      </a>
                      {canManage && (
                        <div className="flex items-center gap-0.5">
                          <span className="text-[10px] text-slate-600 hidden sm:inline">@{link.instagram}</span>
                          <button onClick={() => { setEditingLinkId(link.id); setEditLinkLabel(link.label); setEditLinkInsta(link.instagram); }} className="text-slate-600 hover:text-slate-400 p-0.5 transition-colors"><Pencil size={10} /></button>
                          <button onClick={() => handleDeleteSocialLink(link.id)} className="text-slate-600 hover:text-red-400 p-0.5 transition-colors"><X size={10} /></button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {canManage && !showAddLink && (
                <button onClick={() => setShowAddLink(true)} className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-cyan-400 border border-dashed border-slate-700 hover:border-cyan-500/40 rounded-full transition-colors">
                  <Plus size={11} /> Ekle
                </button>
              )}
              {canManage && showAddLink && (
                <div className="flex items-center gap-1.5">
                  <input value={newLinkLabel} onChange={e => setNewLinkLabel(e.target.value)} className="input text-xs py-1 h-7 w-28" placeholder="Etiket (ör. Okul)" autoFocus />
                  <span className="text-slate-500 text-xs">@</span>
                  <input value={newLinkInsta} onChange={e => setNewLinkInsta(e.target.value)} className="input text-xs py-1 h-7 w-32" placeholder="instagram_adresi" />
                  <button onClick={handleAddSocialLink} disabled={!newLinkLabel.trim() || !newLinkInsta.trim()} className="text-green-400 hover:text-green-300 disabled:opacity-40"><Check size={14} /></button>
                  <button onClick={() => { setShowAddLink(false); setNewLinkLabel(''); setNewLinkInsta(''); }} className="text-slate-500"><X size={14} /></button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Öğrenci" value={schoolUsers.length} icon={Users} color="bg-cyan-500/15 text-cyan-400" />
        <StatCard label="Takım" value={schoolTeams.length} icon={Trophy} color="bg-orange-500/15 text-orange-400" />
        <StatCard label="Aktif Proje" value={activeProjects.length} icon={FolderOpen} color="bg-green-500/15 text-green-400" />
        <StatCard label="Yaklaşan Etkinlik" value={upcomingEvents.length} icon={Calendar} color="bg-purple-500/15 text-purple-400" />
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Announcements — vertical list */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Megaphone size={16} className="text-amber-400" />
              <h2 className="font-semibold text-white">Son Duyurular</h2>
            </div>
            <button onClick={() => navigate('/announcements')} className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1">
              Tümü <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-4">
            {schoolAnnouncements.length === 0 && (
              <p className="text-slate-500 text-sm">Henüz duyuru yok.</p>
            )}
            {schoolAnnouncements.slice(0, 4).map(ann => {
              const author = users.find(u => u.id === ann.authorId);
              return (
                <div key={ann.id} className={`border-l-2 pl-4 pb-4 border-b border-slate-800/40 last:border-b-0 ${ann.priority === 'urgent' ? 'border-l-red-500' : ann.priority === 'medium' ? 'border-l-amber-500' : 'border-l-slate-700'}`}>
                  <div className="flex items-start gap-2 mb-1">
                    <PriorityDot priority={ann.priority} />
                    <h3 className="text-sm font-semibold text-white leading-tight">{ann.title}</h3>
                    {ann.priority === 'urgent' && (
                      <span className="text-xs bg-red-500/15 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-full ml-auto flex-shrink-0">Acil</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed pl-4 line-clamp-2">{ann.content}</p>
                  <div className="flex items-center gap-2 mt-2 pl-4 text-xs text-slate-600">
                    {author && <span>{author.firstName} {author.lastName}</span>}
                    <span>·</span>
                    <span>{format(new Date(ann.createdAt), 'd MMMM yyyy', { locale: tr })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leaderboard mini */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-amber-400" />
              <h2 className="font-semibold text-white">Liderlik Tablosu</h2>
            </div>
            <button onClick={() => navigate('/leaderboard')} className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1">
              Tümü <ChevronRight size={12} />
            </button>
          </div>
          {leaderboard.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">Henüz sıralama yok.</p>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((u, idx) => {
                const rank = idx + 1;
                const isMe = u.id === currentUser?.id;
                return (
                  <div key={u.id} className={`flex items-center gap-3 p-2 rounded-lg ${isMe ? 'bg-cyan-500/5 border border-cyan-500/15' : ''}`}>
                    {/* Rank badge */}
                    {rank === 1 ? (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center flex-shrink-0">
                        <Trophy size={12} className="text-white" />
                      </div>
                    ) : rank === 2 ? (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center flex-shrink-0">
                        <Medal size={12} className="text-white" />
                      </div>
                    ) : rank === 3 ? (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-700 to-orange-800 flex items-center justify-center flex-shrink-0">
                        <Medal size={12} className="text-white" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 flex-shrink-0">
                        {rank}
                      </div>
                    )}
                    {/* Avatar */}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${avatarGradient(u.id)}`}>
                      {u.firstName[0]}{u.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isMe ? 'text-cyan-400' : 'text-white'}`}>{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-slate-500">{u.class ? `${u.class}/${u.section}` : 'Öğrenci'}</p>
                    </div>
                    <span className="text-sm font-bold text-amber-400 flex-shrink-0">{u.points || 0}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-purple-400" />
              <h2 className="font-semibold text-white">Yaklaşan Etkinlikler</h2>
            </div>
            <button onClick={() => navigate('/events')} className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              Tümü <ChevronRight size={12} />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingEvents.slice(0, 3).map(event => (
              <div key={event.id} className="card-hover p-4">
                <span className={`badge border mb-2 inline-flex ${event.type === 'competition' ? 'bg-red-500/15 text-red-400 border-red-500/20' : event.type === 'meeting' ? 'bg-blue-500/15 text-blue-400 border-blue-500/20' : 'bg-green-500/15 text-green-400 border-green-500/20'}`}>
                  {event.type === 'competition' ? 'yarışma' : event.type === 'meeting' ? 'toplantı' : 'workshop'}
                </span>
                <p className="text-sm font-semibold text-white mb-1">{event.title}</p>
                <p className="text-xs text-slate-500">{format(new Date(event.date), 'd MMMM yyyy', { locale: tr })}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
