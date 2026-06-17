import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Users, UserPlus, UserMinus, Megaphone, Lock, Check, X,
  MessageSquare, Instagram, Twitter, Newspaper, Award, Plus, Edit3,
  Image, Trophy, Handshake, Save, Search, Trash2, Camera, GraduationCap, FileText, ExternalLink, Download,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { slugifyTeam } from './TeamsPage';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { avatarGradient } from '../utils/avatar';

export default function TeamDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentUser, users, teams, selectedSchoolId,
    applyToTeam, handleTeamApplication, removeTeamMember, addTeamMember,
    toggleRecruiting, addTeamNews, addTeamAchievement, updateTeam,
    removeTeamNews, removeTeamAchievement,
    createAnnouncement,
  } = useStore();

  const [applyNote, setApplyNote] = useState('');
  const [applyCvDataUrl, setApplyCvDataUrl] = useState('');
  const [applyCvName, setApplyCvName] = useState('');
  const [showApply, setShowApply] = useState(false);
  const cvInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'news' | 'achievements'>('news');

  // News form
  const [showAddNews, setShowAddNews] = useState(false);
  const [newsForm, setNewsForm] = useState({ title: '', content: '', imageUrl: '', date: '' });
  const [newsImagePreview, setNewsImagePreview] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Team logo upload
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation states
  const [deleteNewsId, setDeleteNewsId] = useState<string | null>(null);
  const [deleteAchId, setDeleteAchId] = useState<string | null>(null);

  // Achievement/Sponsor form
  const [showAddAchieve, setShowAddAchieve] = useState(false);
  const [achieveForm, setAchieveForm] = useState({ title: '', description: '', sponsor: '', type: 'achievement' as 'achievement' | 'sponsor', date: '' });

  // Direct member add
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  // Team info edit form (includes social media, captain, advisor)
  const [showEditTeam, setShowEditTeam] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', instagram: '', twitter: '' });
  const [editCaptainSearch, setEditCaptainSearch] = useState('');
  const [editSelectedCaptain, setEditSelectedCaptain] = useState<{ id: string; label: string } | null>(null);
  const [editAdvisorSearch, setEditAdvisorSearch] = useState('');
  const [editSelectedAdvisor, setEditSelectedAdvisor] = useState<{ id: string; label: string } | null>(null);

  // Recruitment open modal
  const [showOpenRecruit, setShowOpenRecruit] = useState(false);
  const [recruitTitle, setRecruitTitle] = useState('');

  // Ejection confirm
  const [ejectConfirmId, setEjectConfirmId] = useState<string | null>(null);

  const team = teams.find(t => t.id === slug || slugifyTeam(t.name, t.id) === slug);
  if (!team) return <div className="card p-8 text-center text-slate-400">Takım bulunamadı.</div>;

  // Auto-open apply modal when navigated with state.openApply
  useEffect(() => {
    if ((location.state as { openApply?: boolean })?.openApply && team.isRecruiting && currentUser?.role === 'student') {
      setShowApply(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const captain = users.find(u => u.id === team.captainId);
  const advisor = team.advisorId ? users.find(u => u.id === team.advisorId) : null;
  const classRank = (cls?: string) => { const n = parseInt(cls || '', 10); return isNaN(n) ? 0 : n; };
  const memberUsers = team.members
    .map(mid => users.find(u => u.id === mid))
    .filter((u): u is NonNullable<typeof u> => Boolean(u))
    .sort((a, b) => {
      if (a.id === team.captainId) return -1;
      if (b.id === team.captainId) return 1;
      return classRank(b.class) - classRank(a.class);
    });
  const isAdmin = currentUser && ['superadmin', 'admin', 'tech_teacher'].includes(currentUser.role);
  const isCaptain = currentUser?.id === team.captainId;
  const isMember = currentUser && team.members.includes(currentUser.id);
  const hasApplied = currentUser && team.applications.some(a => a.userId === currentUser.id && a.status !== 'rejected');
  const canManage = isAdmin || isCaptain;

  // Deduplicate achievements by id
  const allAchievements = team.achievements || [];
  const uniqueAchievements = allAchievements.filter((a, idx, arr) => arr.findIndex(b => b.id === a.id) === idx);
  const teamAchievements = uniqueAchievements.filter(a => a.type === 'achievement');
  const teamSponsors = uniqueAchievements.filter(a => a.type === 'sponsor');

  // Group applications by recruitment round
  const appsByRound: Record<string, typeof team.applications> = {};
  team.applications.forEach(app => {
    const key = app.roundTitle || 'Genel Başvuru';
    if (!appsByRound[key]) appsByRound[key] = [];
    appsByRound[key].push(app);
  });
  const roundEntries = Object.entries(appsByRound);

  // Handlers
  const handleApply = () => {
    if (!currentUser) return;
    applyToTeam(team.id, {
      userId: currentUser.id,
      note: applyNote,
      status: 'pending',
      appliedAt: new Date().toISOString(),
      roundTitle: team.recruitingTitle || undefined,
      cvDataUrl: applyCvDataUrl || undefined,
    });
    setShowApply(false);
    setApplyNote('');
    setApplyCvDataUrl('');
    setApplyCvName('');
  };

  const handleOpenRecruit = () => {
    if (!currentUser) return;
    const title = recruitTitle.trim();
    toggleRecruiting(team.id, title || undefined);
    createAnnouncement({
      title: `${team.name} — Başvurular Açıldı`,
      content: title
        ? `${team.name} takımı "${title}" alımı için başvuruları açmıştır. Takım sayfasını ziyaret ederek başvuru yapabilirsiniz.`
        : `${team.name} takımı üye alımı için başvuruları açmıştır. Takım sayfasını ziyaret ederek başvuru yapabilirsiniz.`,
      priority: 'medium',
      authorId: currentUser.id,
      schoolId: team.schoolId || selectedSchoolId,
    });
    setShowOpenRecruit(false);
    setRecruitTitle('');
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      updateTeam(team.id, { logoUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setNewsImagePreview(result);
      setNewsForm(f => ({ ...f, imageUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleAddNews = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    addTeamNews(team.id, {
      title: newsForm.title,
      content: newsForm.content,
      imageUrl: newsForm.imageUrl || undefined,
      authorId: currentUser.id,
      createdAt: newsForm.date ? new Date(newsForm.date).toISOString() : new Date().toISOString(),
    });
    setNewsForm({ title: '', content: '', imageUrl: '', date: '' });
    setNewsImagePreview('');
    setShowAddNews(false);
  };

  const handleAddAchieve = (e: React.FormEvent) => {
    e.preventDefault();
    addTeamAchievement(team.id, {
      title: achieveForm.title,
      description: achieveForm.description || undefined,
      sponsor: achieveForm.type === 'sponsor' ? achieveForm.sponsor : undefined,
      type: achieveForm.type,
      date: achieveForm.date ? new Date(achieveForm.date).toISOString() : undefined,
    });
    setAchieveForm({ title: '', description: '', sponsor: '', type: 'achievement', date: '' });
    setShowAddAchieve(false);
  };

  // Direct member search results (school users not already in team)
  const memberSearchResults = memberSearch.trim().length >= 1
    ? users.filter(u => {
        if (u.schoolId !== (team.schoolId || selectedSchoolId)) return false;
        if (team.members.includes(u.id)) return false;
        const q = memberSearch.toLowerCase();
        return u.firstName.toLowerCase().includes(q) || u.lastName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
      }).slice(0, 8)
    : [];

  // Captain/advisor search for edit modal
  const schoolStudents = users.filter(u => u.schoolId === (team.schoolId || selectedSchoolId) && u.role === 'student');
  const schoolTeachers = users.filter(u => u.schoolId === (team.schoolId || selectedSchoolId) && ['branch_teacher', 'tech_teacher', 'admin'].includes(u.role));
  const editCaptainResults = editCaptainSearch.trim().length >= 1
    ? schoolStudents.filter(u => {
        const q = editCaptainSearch.toLowerCase();
        return u.firstName.toLowerCase().includes(q) || u.lastName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
      }).slice(0, 8)
    : [];
  const editAdvisorResults = editAdvisorSearch.trim().length >= 1
    ? schoolTeachers.filter(u => {
        const q = editAdvisorSearch.toLowerCase();
        return u.firstName.toLowerCase().includes(q) || u.lastName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
      }).slice(0, 8)
    : [];

  const handleSaveTeam = (e: React.FormEvent) => {
    e.preventDefault();
    const newCaptainId = editSelectedCaptain ? editSelectedCaptain.id : team.captainId;
    const updates: Partial<typeof team> = {
      name: editForm.name,
      description: editForm.description,
      socialMedia: {
        ...team.socialMedia,
        instagram: editForm.instagram.replace('@', '') || undefined,
        twitter: editForm.twitter.replace('@', '') || undefined,
      },
      captainId: newCaptainId,
      advisorId: editSelectedAdvisor ? editSelectedAdvisor.id : undefined,
    };
    // Ensure new captain is a member
    if (!team.members.includes(newCaptainId)) {
      (updates as any).members = [...team.members, newCaptainId];
    }
    updateTeam(team.id, updates);
    setShowEditTeam(false);
  };

  const openEditTeam = () => {
    setEditForm({
      name: team.name,
      description: team.description,
      instagram: team.socialMedia?.instagram || '',
      twitter: team.socialMedia?.twitter || '',
    });
    setEditSelectedCaptain(captain ? { id: captain.id, label: `${captain.firstName} ${captain.lastName}` } : null);
    setEditSelectedAdvisor(advisor ? { id: advisor.id, label: `${advisor.firstName} ${advisor.lastName}` } : null);
    setEditCaptainSearch('');
    setEditAdvisorSearch('');
    setShowEditTeam(true);
  };

  const tabs = [
    { key: 'news', label: 'Haberler', icon: Newspaper, count: (team.news || []).length },
    { key: 'achievements', label: 'Başarılar & Sponsorlar', icon: Award, count: teamAchievements.length + teamSponsors.length },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={() => navigate('/teams')} className="flex items-center gap-2 text-slate-400 hover:text-slate-100 text-sm transition-colors">
        <ArrowLeft size={16} /> Takımlara Dön
      </button>

      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          {/* Team logo — click to replace if canManage */}
          <div className="relative flex-shrink-0 group">
            {team.logoUrl ? (
              <img src={team.logoUrl} alt={team.name} className="w-20 h-20 object-contain" />
            ) : (
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${team.logoColor} flex items-center justify-center text-white font-bold text-2xl`}>
                {team.logoInitials}
              </div>
            )}
            {canManage && (
              <>
                <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoChange} />
                <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    title="Logo yükle (PNG/JPG)"
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <Camera size={16} className="text-white" />
                  </button>
                  {team.logoUrl && (
                    <button
                      onClick={() => updateTeam(team.id, { logoUrl: undefined })}
                      title="Logoyu sil"
                      className="p-1.5 rounded-lg bg-red-500/40 hover:bg-red-500/60 transition-colors"
                    >
                      <Trash2 size={16} className="text-white" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-white">{team.name}</h1>
              {team.isRecruiting && (
                <span className="badge bg-green-500/15 text-green-400 border border-green-500/20">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> Alım Açık
                  {team.recruitingTitle && <span className="ml-1 opacity-70">— {team.recruitingTitle}</span>}
                </span>
              )}
            </div>
            <p className="text-slate-400 leading-relaxed mb-3">{team.description}</p>

            {advisor && (
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap size={14} className="text-blue-400 flex-shrink-0" />
                <span className="text-sm text-blue-500">Danışman: <span className="font-medium">{advisor.firstName} {advisor.lastName}</span></span>
              </div>
            )}

            {team.socialMedia && Object.values(team.socialMedia).some(Boolean) && (
              <div className="flex gap-3 mb-4">
                {team.socialMedia.instagram && (
                  <a
                    href={`https://instagram.com/${team.socialMedia.instagram.replace('@', '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-pink-400 transition-colors"
                  >
                    <Instagram size={14} /> @{team.socialMedia.instagram.replace('@', '')}
                  </a>
                )}
                {team.socialMedia.twitter && (
                  <a
                    href={`https://twitter.com/${team.socialMedia.twitter.replace('@', '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-sky-400 transition-colors"
                  >
                    <Twitter size={14} /> @{team.socialMedia.twitter.replace('@', '')}
                  </a>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {!isMember && team.isRecruiting && !hasApplied && currentUser?.role === 'student' && (
                <button onClick={() => setShowApply(true)} className="btn-primary"><UserPlus size={16} /> Başvur</button>
              )}
              {hasApplied && !isMember && (
                <span className="badge bg-amber-500/15 text-amber-400 border border-amber-500/20 px-3 py-1.5 text-sm">Başvurun İnceleniyor</span>
              )}
              {canManage && (
                <>
                  {team.isRecruiting ? (
                    <button
                      onClick={() => toggleRecruiting(team.id)}
                      className="btn-secondary text-red-400 border-red-500/30"
                    >
                      <Lock size={16} /> Alımı Kapat
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowOpenRecruit(true)}
                      className="btn-secondary text-green-400 border-green-500/30"
                    >
                      <Megaphone size={16} /> Alım Aç
                    </button>
                  )}
                  <button onClick={openEditTeam} className="btn-secondary text-cyan-400 border-cyan-500/30">
                    <Edit3 size={16} /> Düzenle
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Members + Applications */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users size={16} className="text-cyan-400" />
              <h2 className="font-semibold text-white">Üyeler ({team.members.length})</h2>
              {canManage && (
                <button
                  onClick={() => setShowAddMember(v => !v)}
                  className="ml-auto w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/25 flex items-center justify-center transition-colors"
                  title="Üye Ekle"
                >
                  <UserPlus size={13} />
                </button>
              )}
            </div>
            {/* Direct member add search */}
            {showAddMember && canManage && (
              <div className="mb-4 relative">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    className="input pl-8 text-sm"
                    placeholder="Kullanıcı ara…"
                    autoFocus
                  />
                </div>
                {memberSearchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-[#0d1826] border border-slate-700/60 rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto">
                    {memberSearchResults.map(u => (
                      <button
                        key={u.id}
                        onClick={() => { addTeamMember(team.id, u.id); setMemberSearch(''); setShowAddMember(false); }}
                        className="w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800/60 transition-colors"
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${avatarGradient(u.id)}`}>
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm text-white">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-slate-500">@{u.username}{u.class ? ` · ${u.class}/${u.section}` : ''}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {memberSearch.trim().length >= 1 && memberSearchResults.length === 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-[#0d1826] border border-slate-700/60 rounded-xl p-3 text-center text-sm text-slate-500">
                    Kullanıcı bulunamadı.
                  </div>
                )}
              </div>
            )}
            <div className="space-y-3">
              {memberUsers.map(m => {
                if (!m) return null;
                const isCapt = m.id === team.captainId;
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    {m.photoUrl ? (
                      <img src={m.photoUrl} alt="Profil" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${team.logoColor} flex items-center justify-center text-xs font-bold text-white`}>
                        {m.firstName[0]}{m.lastName[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{m.firstName} {m.lastName}</p>
                      <p className="text-xs text-slate-500">{isCapt ? 'Kaptan' : m.class ? `${m.class}/${m.section}` : 'Üye'}</p>
                    </div>
                    {canManage && !isCapt && (
                      ejectConfirmId === m.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { removeTeamMember(team.id, m.id, false); setEjectConfirmId(null); }}
                            className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded hover:bg-amber-500/20 transition-colors"
                          >
                            Çıkar
                          </button>
                          <button
                            onClick={() => { removeTeamMember(team.id, m.id, true); setEjectConfirmId(null); }}
                            className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 rounded hover:bg-red-500/20 transition-colors"
                          >
                            İhraç Et
                          </button>
                          <button onClick={() => setEjectConfirmId(null)} className="text-slate-600 hover:text-slate-400 transition-colors">
                            <X size={10} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setEjectConfirmId(m.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                          <UserMinus size={14} />
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Former members — visible only to admin/captain */}
          {canManage && (team.formerMembers || []).length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <UserMinus size={15} className="text-slate-500" />
                <h2 className="font-semibold text-slate-400 text-sm">Eski Üyeler ({(team.formerMembers || []).length})</h2>
              </div>
              <div className="space-y-2.5">
                {(team.formerMembers || []).map(uid => {
                  const m = users.find(u => u.id === uid);
                  if (!m) return null;
                  return (
                    <div key={uid} className="flex items-center gap-3 opacity-60">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white ${avatarGradient(uid)}`}>
                        {m.firstName[0]}{m.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-300 truncate">{m.firstName} {m.lastName}</p>
                        <p className="text-xs text-slate-600">{m.class ? `${m.class}/${m.section}` : `@${m.username}`}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Applications — grouped by round */}
          {canManage && team.applications.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-white mb-4">
                Başvurular ({team.applications.filter(a => a.status === 'pending').length} bekliyor)
              </h2>
              <div className="space-y-5">
                {roundEntries.map(([roundTitle, apps]) => {
                  // Earliest date in this round
                  const dates = apps.map(a => new Date(a.appliedAt).getTime()).sort();
                  const earliest = dates[0] ? new Date(dates[0]) : null;
                  return (
                    <div key={roundTitle}>
                      {/* Round header */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider truncate">{roundTitle}</span>
                        {earliest && (
                          <span className="text-xs text-slate-600 flex-shrink-0">
                            · {format(earliest, 'd MMM yyyy', { locale: tr })}
                          </span>
                        )}
                        <span className="ml-auto badge bg-slate-800 text-slate-400 border border-slate-700 flex-shrink-0">{apps.length}</span>
                      </div>
                      <div className="space-y-3">
                        {apps.map(app => {
                          const applicant = users.find(u => u.id === app.userId);
                          if (!applicant) return null;
                          return (
                            <div key={app.userId} className="border border-slate-800/60 rounded-xl p-3">
                              <div className="flex items-center gap-2 mb-2">
                                {applicant.photoUrl ? (
                                  <img src={applicant.photoUrl} alt="Profil" className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />
                                ) : (
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white ${avatarGradient(applicant.id)}`}>
                                    {applicant.firstName[0]}{applicant.lastName[0]}
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-medium text-white">{applicant.firstName} {applicant.lastName}</p>
                                  <p className="text-xs text-slate-500">
                                    {applicant.class}/{applicant.section} · {format(new Date(app.appliedAt), 'd MMM', { locale: tr })}
                                  </p>
                                </div>
                                <div className="ml-auto">
                                  {app.status === 'pending' && <span className="badge bg-amber-500/15 text-amber-400 border border-amber-500/20">bekliyor</span>}
                                  {app.status === 'approved' && <span className="badge bg-green-500/15 text-green-400 border border-green-500/20">kabul</span>}
                                  {app.status === 'rejected' && <span className="badge bg-red-500/15 text-red-400 border border-red-500/20">red</span>}
                                </div>
                              </div>
                              {app.note && (
                                <p className="text-xs text-slate-400 bg-slate-900/40 rounded-lg p-2 mb-2 flex gap-1.5">
                                  <MessageSquare size={11} className="text-slate-600 mt-0.5 flex-shrink-0" /> {app.note}
                                </p>
                              )}
                              {app.cvDataUrl && (
                                <div className="flex items-center gap-2 mb-2">
                                  <button
                                    onClick={() => {
                                      fetch(app.cvDataUrl!)
                                        .then(r => r.blob())
                                        .then(blob => {
                                          const url = URL.createObjectURL(blob);
                                          window.open(url, '_blank');
                                          setTimeout(() => URL.revokeObjectURL(url), 30000);
                                        });
                                    }}
                                    className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                                  >
                                    <ExternalLink size={11} /> CV Görüntüle
                                  </button>
                                  <button
                                    onClick={() => {
                                      const a = document.createElement('a');
                                      a.href = app.cvDataUrl!;
                                      a.download = `CV-${applicant.firstName}-${applicant.lastName}-${team.name}.pdf`;
                                      a.click();
                                    }}
                                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300 transition-colors"
                                  >
                                    <Download size={11} /> İndir
                                  </button>
                                </div>
                              )}
                              {app.status === 'pending' && (
                                <div className="flex gap-2">
                                  <button onClick={() => handleTeamApplication(team.id, app.userId, 'approved')} className="btn-primary text-xs py-1 px-3 flex-1 justify-center"><Check size={12} /> Kabul</button>
                                  <button onClick={() => handleTeamApplication(team.id, app.userId, 'rejected')} className="btn-danger text-xs py-1 px-3 flex-1 justify-center"><X size={12} /> Reddet</button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Tabs: News | Achievements & Sponsors */}
        <div className="lg:col-span-2">
          <div className="flex gap-1 bg-slate-800/40 rounded-xl p-1 border border-slate-700/60 mb-4">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-300'}`}
              >
                <tab.icon size={14} />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count > 0 && <span className="text-xs bg-slate-600/60 px-1.5 rounded-full">{tab.count}</span>}
              </button>
            ))}
          </div>

          {/* News Tab */}
          {activeTab === 'news' && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white flex items-center gap-2"><Newspaper size={16} className="text-blue-400" /> Haberler</h2>
                {canManage && (
                  <button onClick={() => setShowAddNews(true)} className="btn-primary text-sm py-1.5"><Plus size={14} /> Haber Ekle</button>
                )}
              </div>
              {(team.news || []).length === 0 ? (
                <div className="text-center py-8">
                  <Newspaper size={28} className="mx-auto text-slate-700 mb-3" />
                  <p className="text-slate-500 text-sm">Henüz haber yok.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {[...(team.news || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(item => {
                    const author = users.find(u => u.id === item.authorId);
                    const isConfirming = deleteNewsId === item.id;
                    return (
                      <div key={item.id} className="border border-slate-800/60 rounded-xl overflow-hidden">
                        {item.imageUrl && <img src={item.imageUrl} alt={item.title} className="w-full h-48 object-cover" />}
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-white leading-tight">{item.title}</h3>
                            {canManage && (
                              isConfirming ? (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button onClick={() => { removeTeamNews(team.id, item.id); setDeleteNewsId(null); }}
                                    className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 rounded hover:bg-red-500/20 transition-colors">Evet</button>
                                  <button onClick={() => setDeleteNewsId(null)}
                                    className="text-xs text-slate-400 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded hover:bg-slate-700 transition-colors">İptal</button>
                                </div>
                              ) : (
                                <button onClick={() => setDeleteNewsId(item.id)} className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0" title="Sil">
                                  <Trash2 size={13} />
                                </button>
                              )
                            )}
                          </div>
                          <p className="text-sm text-slate-400 leading-relaxed mb-3">{item.content}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            {author && <span>{author.firstName} {author.lastName}</span>}
                            <span>·</span>
                            <span>{format(new Date(item.createdAt), 'd MMM yyyy', { locale: tr })}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Achievements & Sponsors Tab */}
          {activeTab === 'achievements' && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-white flex items-center gap-2"><Award size={16} className="text-amber-400" /> Başarılar & Sponsorlar</h2>
                {canManage && (
                  <button onClick={() => setShowAddAchieve(true)} className="btn-primary text-sm py-1.5"><Plus size={14} /> Ekle</button>
                )}
              </div>
              {teamAchievements.length === 0 && teamSponsors.length === 0 ? (
                <div className="text-center py-8">
                  <Award size={28} className="mx-auto text-slate-700 mb-3" />
                  <p className="text-slate-500 text-sm">Henüz kayıt yok.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Trophy size={12} className="text-amber-400" /> Başarılar
                    </h3>
                    <div className="space-y-3">
                      {teamAchievements.length === 0 ? (
                        <p className="text-xs text-slate-600 italic">Henüz başarı kaydı yok.</p>
                      ) : teamAchievements.map(item => {
                        const isConfirming = deleteAchId === item.id;
                        return (
                        <div key={item.id} className="bg-slate-900/40 rounded-xl p-3 border border-slate-800/60">
                          <div className="flex items-start gap-2">
                            <Trophy size={13} className="text-amber-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white">{item.title}</p>
                              {item.description && <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>}
                              {item.date && <p className="text-xs text-slate-600 mt-1">{format(new Date(item.date), 'd MMM yyyy', { locale: tr })}</p>}
                            </div>
                            {canManage && (
                              isConfirming ? (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button onClick={() => { removeTeamAchievement(team.id, item.id); setDeleteAchId(null); }}
                                    className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 rounded hover:bg-red-500/20 transition-colors">Evet</button>
                                  <button onClick={() => setDeleteAchId(null)}
                                    className="text-xs text-slate-400 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded hover:bg-slate-700 transition-colors">İptal</button>
                                </div>
                              ) : (
                                <button onClick={() => setDeleteAchId(item.id)} className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0" title="Sil">
                                  <Trash2 size={12} />
                                </button>
                              )
                            )}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Handshake size={12} className="text-cyan-400" /> Sponsorlar
                    </h3>
                    <div className="space-y-3">
                      {teamSponsors.length === 0 ? (
                        <p className="text-xs text-slate-600 italic">Henüz sponsor kaydı yok.</p>
                      ) : teamSponsors.map(item => {
                        const isConfirming = deleteAchId === item.id;
                        return (
                        <div key={item.id} className="bg-slate-900/40 rounded-xl p-3 border border-slate-800/60">
                          <div className="flex items-start gap-2">
                            <Handshake size={13} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white">{item.title}</p>
                              {item.description && <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>}
                              {item.sponsor && <p className="text-xs text-cyan-400 mt-1 flex items-center gap-1"><span className="w-1 h-1 bg-cyan-400 rounded-full" /> {item.sponsor}</p>}
                              {item.date && <p className="text-xs text-slate-600 mt-1">{format(new Date(item.date), 'd MMM yyyy', { locale: tr })}</p>}
                            </div>
                            {canManage && (
                              isConfirming ? (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button onClick={() => { removeTeamAchievement(team.id, item.id); setDeleteAchId(null); }}
                                    className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 rounded hover:bg-red-500/20 transition-colors">Evet</button>
                                  <button onClick={() => setDeleteAchId(null)}
                                    className="text-xs text-slate-400 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded hover:bg-slate-700 transition-colors">İptal</button>
                                </div>
                              ) : (
                                <button onClick={() => setDeleteAchId(item.id)} className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0" title="Sil">
                                  <Trash2 size={12} />
                                </button>
                              )
                            )}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Apply Modal */}
      {showApply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-sm p-6 animate-slide-up">
            <h3 className="text-lg font-bold text-white mb-1">{team.name}</h3>
            {team.recruitingTitle && <p className="text-sm text-cyan-400 mb-2">Alım: {team.recruitingTitle}</p>}
            <p className="text-slate-400 text-sm mb-4">Motivasyon notunuzu ekleyebilirsiniz.</p>
            <div className="mb-4">
              <label className="label">Motivasyon Notu (opsiyonel)</label>
              <textarea value={applyNote} onChange={e => setApplyNote(e.target.value)} className="input h-20 resize-none" placeholder="Bu takıma neden katılmak istiyorsunuz?" />
            </div>
            <div className="mb-5">
              <label className="label flex items-center gap-1.5"><FileText size={13} /> CV (PDF, opsiyonel)</label>
              <input ref={cvInputRef} type="file" accept=".pdf" className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setApplyCvName(file.name);
                  const reader = new FileReader();
                  reader.onloadend = () => setApplyCvDataUrl(reader.result as string);
                  reader.readAsDataURL(file);
                }}
              />
              {applyCvDataUrl ? (
                <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-3 py-2">
                  <FileText size={14} className="text-cyan-400 flex-shrink-0" />
                  <span className="text-xs text-cyan-300 flex-1 truncate">{applyCvName}</span>
                  <button type="button" onClick={() => { setApplyCvDataUrl(''); setApplyCvName(''); }} className="text-slate-500 hover:text-red-400">
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => cvInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-700/60 rounded-lg py-3 text-sm text-slate-500 hover:border-slate-600 hover:text-slate-400 transition-colors flex items-center justify-center gap-2">
                  <FileText size={14} /> PDF Yükle
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowApply(false); setApplyNote(''); setApplyCvDataUrl(''); setApplyCvName(''); }} className="btn-secondary flex-1 justify-center">İptal</button>
              <button onClick={handleApply} className="btn-primary flex-1 justify-center">Başvur</button>
            </div>
          </div>
        </div>
      )}

      {/* Open Recruitment Modal — asks for title */}
      {showOpenRecruit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-sm p-6 animate-slide-up">
            <h3 className="text-lg font-bold text-white mb-1">Alım Başlat</h3>
            <p className="text-slate-400 text-sm mb-5">
              İsterseniz bu alım dönemi için bir başlık belirleyin. Başvuranlar bu başlıkla kategorize edilecek ve otomatik duyuru oluşturulacak.
            </p>
            <div className="mb-5">
              <label className="label">Alım Başlığı <span className="text-slate-600 font-normal">(opsiyonel)</span></label>
              <input
                type="text"
                value={recruitTitle}
                onChange={e => setRecruitTitle(e.target.value)}
                className="input"
                placeholder="ör. 2026-2027 Üye Alımı, Yaz Dönemi..."
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowOpenRecruit(false); setRecruitTitle(''); }} className="btn-secondary flex-1 justify-center">İptal</button>
              <button onClick={handleOpenRecruit} className="btn-primary flex-1 justify-center">
                <Megaphone size={15} /> Alımı Aç
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add News Modal */}
      {showAddNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-lg p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-5">Haber Ekle</h3>
            <form onSubmit={handleAddNews} className="space-y-4">
              <div>
                <label className="label">Başlık</label>
                <input type="text" value={newsForm.title} onChange={e => setNewsForm(f => ({ ...f, title: e.target.value }))} className="input" required placeholder="Haber başlığı..." />
              </div>
              <div>
                <label className="label">İçerik</label>
                <textarea value={newsForm.content} onChange={e => setNewsForm(f => ({ ...f, content: e.target.value }))} className="input h-28 resize-none" required placeholder="Haber içeriği..." />
              </div>
              <div>
                <label className="label">Tarih <span className="text-slate-600 font-normal">(geçmişe yönelik giriş için)</span></label>
                <input type="date" value={newsForm.date} onChange={e => setNewsForm(f => ({ ...f, date: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="label flex items-center gap-1.5"><Image size={13} /> Fotoğraf (opsiyonel)</label>
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                {newsImagePreview ? (
                  <div className="relative">
                    <img src={newsImagePreview} alt="preview" className="w-full h-40 object-cover rounded-lg border border-slate-700/60" />
                    <button type="button" onClick={() => { setNewsImagePreview(''); setNewsForm(f => ({ ...f, imageUrl: '' })); }}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-red-500/80 transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => imageInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-700/60 rounded-lg py-6 text-sm text-slate-500 hover:border-slate-600 hover:text-slate-400 transition-colors flex items-center justify-center gap-2">
                    <Image size={16} /> Fotoğraf Yükle
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowAddNews(false); setNewsImagePreview(''); setNewsForm({ title: '', content: '', imageUrl: '', date: '' }); }} className="btn-secondary flex-1 justify-center">İptal</button>
                <button type="submit" className="btn-primary flex-1 justify-center">Ekle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Achievement / Sponsor Modal */}
      {showAddAchieve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 animate-slide-up">
            <h3 className="text-lg font-bold text-white mb-5">Başarı / Sponsor Ekle</h3>
            <form onSubmit={handleAddAchieve} className="space-y-4">
              <div>
                <label className="label">Tür</label>
                <div className="flex gap-2">
                  {(['achievement', 'sponsor'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setAchieveForm(f => ({ ...f, type: t }))}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        achieveForm.type === t
                          ? t === 'achievement' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                          : 'border-slate-700 text-slate-500 hover:border-slate-600'
                      }`}
                    >
                      {t === 'achievement' ? <><Trophy size={14} /> Başarı</> : <><Handshake size={14} /> Sponsor</>}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">{achieveForm.type === 'achievement' ? 'Başarı Adı' : 'Sponsor / Firma Adı'}</label>
                <input type="text" value={achieveForm.title} onChange={e => setAchieveForm(f => ({ ...f, title: e.target.value }))} className="input" required placeholder={achieveForm.type === 'achievement' ? 'Ödül, derece...' : 'Sponsor adı...'} />
              </div>
              <div>
                <label className="label">Açıklama</label>
                <textarea value={achieveForm.description} onChange={e => setAchieveForm(f => ({ ...f, description: e.target.value }))} className="input h-20 resize-none" placeholder="Detaylar..." />
              </div>
              {achieveForm.type === 'sponsor' && (
                <div>
                  <label className="label">Sponsor Firma / Kurum</label>
                  <input type="text" value={achieveForm.sponsor} onChange={e => setAchieveForm(f => ({ ...f, sponsor: e.target.value }))} className="input" placeholder="Firma / kurum adı..." />
                </div>
              )}
              <div>
                <label className="label">Tarih <span className="text-slate-600 font-normal">(geçmişe yönelik giriş için)</span></label>
                <input type="date" value={achieveForm.date} onChange={e => setAchieveForm(f => ({ ...f, date: e.target.value }))} className="input" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowAddAchieve(false); setAchieveForm({ title: '', description: '', sponsor: '', type: 'achievement', date: '' }); }} className="btn-secondary flex-1 justify-center">İptal</button>
                <button type="submit" className="btn-primary flex-1 justify-center">Ekle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Team Modal — includes social media, captain, advisor */}
      {showEditTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-5">Takım Bilgilerini Düzenle</h3>
            <form onSubmit={handleSaveTeam} className="space-y-4" onKeyDown={e => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') e.preventDefault(); }}>
              <div>
                <label className="label">Takım Adı</label>
                <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="input" required />
              </div>
              <div>
                <label className="label">Açıklama</label>
                <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} className="input h-24 resize-none" placeholder="Takım hakkında..." />
              </div>
              {/* Captain picker */}
              <div>
                <label className="label">Kaptan</label>
                {editSelectedCaptain ? (
                  <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-3 py-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${avatarGradient(editSelectedCaptain.id)}`}>
                      {editSelectedCaptain.label.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <span className="text-sm text-white flex-1 truncate">{editSelectedCaptain.label}</span>
                    <button type="button" onClick={() => { setEditSelectedCaptain(null); setEditCaptainSearch(''); }} className="text-slate-500 hover:text-red-400 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={editCaptainSearch}
                      onChange={e => setEditCaptainSearch(e.target.value)}
                      className="input pl-9"
                      placeholder="Kaptan ara..."
                    />
                    {editCaptainResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-[#0d1826] border border-slate-700/60 rounded-xl shadow-xl z-20 max-h-40 overflow-y-auto">
                        {editCaptainResults.map(u => (
                          <button key={u.id} type="button"
                            onClick={() => { setEditSelectedCaptain({ id: u.id, label: `${u.firstName} ${u.lastName}` }); setEditCaptainSearch(''); }}
                            className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-800/60 transition-colors">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${avatarGradient(u.id)}`}>
                              {u.firstName[0]}{u.lastName[0]}
                            </div>
                            <div>
                              <p className="text-sm text-white">{u.firstName} {u.lastName}</p>
                              <p className="text-xs text-slate-500">@{u.username}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Advisor picker */}
              <div>
                <label className="label flex items-center gap-1.5"><GraduationCap size={13} /> Danışman Öğretmen</label>
                {editSelectedAdvisor ? (
                  <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${avatarGradient(editSelectedAdvisor.id)}`}>
                      {editSelectedAdvisor.label.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <span className="text-sm text-white flex-1 truncate">{editSelectedAdvisor.label}</span>
                    <button type="button" onClick={() => { setEditSelectedAdvisor(null); setEditAdvisorSearch(''); }} className="text-slate-500 hover:text-red-400 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={editAdvisorSearch}
                      onChange={e => setEditAdvisorSearch(e.target.value)}
                      className="input pl-9"
                      placeholder="Branş öğretmeni ara..."
                    />
                    {editAdvisorResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-[#0d1826] border border-slate-700/60 rounded-xl shadow-xl z-20 max-h-40 overflow-y-auto">
                        {editAdvisorResults.map(u => (
                          <button key={u.id} type="button"
                            onClick={() => { setEditSelectedAdvisor({ id: u.id, label: `${u.firstName} ${u.lastName}` }); setEditAdvisorSearch(''); }}
                            className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-800/60 transition-colors">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${avatarGradient(u.id)}`}>
                              {u.firstName[0]}{u.lastName[0]}
                            </div>
                            <p className="text-sm text-white">{u.firstName} {u.lastName}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label flex items-center gap-1"><Instagram size={12} /> Instagram</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">@</span>
                    <input type="text" value={editForm.instagram} onChange={e => setEditForm(f => ({ ...f, instagram: e.target.value.replace('@', '') }))} className="input pl-7" placeholder="kullanici_adi" />
                  </div>
                </div>
                <div>
                  <label className="label flex items-center gap-1"><Twitter size={12} /> Twitter / X</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">@</span>
                    <input type="text" value={editForm.twitter} onChange={e => setEditForm(f => ({ ...f, twitter: e.target.value.replace('@', '') }))} className="input pl-7" placeholder="kullanici_adi" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowEditTeam(false)} className="btn-secondary flex-1 justify-center">İptal</button>
                <button type="submit" className="btn-primary flex-1 justify-center"><Save size={15} /> Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
