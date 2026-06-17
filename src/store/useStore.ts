import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createSupabaseStorage } from '../lib/supabase';
import type {
  User, ActivationCode, Team, Project, Event, Announcement, Task,
  TimelineEntry, WatchListEntry, InventoryItem, InventoryLoan, Graduate,
  School, TeamApplication, TaskApplicant, TeamNews, TeamAchievement, UserRole,
  Feedback, FixedAsset, FixedAssetAssignment, InventoryRoom, InventoryCabinet,
} from '../types';
import {
  INITIAL_USERS, INITIAL_CODES, INITIAL_TEAMS, INITIAL_PROJECTS,
  INITIAL_EVENTS, INITIAL_ANNOUNCEMENTS, INITIAL_TASKS, INITIAL_TIMELINE,
  INITIAL_WATCHLIST, INITIAL_INVENTORY, INITIAL_LOANS, INITIAL_GRADUATES,
  INITIAL_SCHOOLS, PASSWORDS,
} from './data';

// Turkish profanity list (placeholder patterns)
const PROFANITY_PATTERNS = ['amk', 'orospu', 'sik', 'oç', 'göt', 'bok', 'piç', 'salak', 'mal', 'gerizekalı'];

function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase().replace(/[^a-zğüşıöç0-9]/g, '');
  return PROFANITY_PATTERNS.some(p => lower.includes(p.replace(/[^a-zğüşıöç]/g, '')));
}

const nanoid = () => Math.random().toString(36).substring(2, 10);

function generateCode(schoolAbbr: string, year: number, existingCodes: string[]): string {
  let code: string;
  do {
    const digits = String(Math.floor(10000 + Math.random() * 90000));
    code = `${year}-${schoolAbbr}-${digits}`;
  } while (existingCodes.includes(code));
  return code;
}

export interface Notification {
  id: string;
  userId?: string; // if set, only visible to that user; if unset, superadmin-only warning
  message: string;
  type: 'warning' | 'info' | 'success';
  read: boolean;
  createdAt: string;
}

interface AppState {
  theme: 'dark' | 'light';
  currentUser: User | null;
  selectedSchoolId: string;
  schools: School[];
  feedbacks: Feedback[];
  lastFeedbackSeenAt: string | null;
  users: User[];
  codes: ActivationCode[];
  teams: Team[];
  projects: Project[];
  events: Event[];
  announcements: Announcement[];
  tasks: Task[];
  timeline: TimelineEntry[];
  watchList: WatchListEntry[];
  inventory: InventoryItem[];
  loans: InventoryLoan[];
  inventoryRooms: InventoryRoom[];
  graduates: Graduate[];
  notifications: Notification[];
  runtimePasswords: Record<string, string>;

  // Theme
  toggleTheme: () => void;

  // Schools
  addSchool: (school: Omit<School, 'id'>) => void;
  updateSchool: (id: string, updates: Partial<School>) => void;
  deleteSchool: (id: string) => void;

  // Feedback
  submitFeedback: (fb: Omit<Feedback, 'id' | 'createdAt' | 'status'>) => void;
  resolveFeedback: (id: string) => void;
  deleteFeedback: (id: string) => void;
  markFeedbacksAsSeen: () => void;

  // Auth
  login: (id: string, pw: string) => { success: boolean; error?: string };
  logout: () => void;
  activateCode: (code: string) => { success: boolean; data?: ActivationCode; error?: string };
  createAccount: (codeId: string, username: string, email: string, phone: string, instagram: string, password: string, extraData?: { graduationYear?: string; university?: string; department?: string }) => { success: boolean; error?: string };
  changePassword: (username: string, newPassword: string) => void;
  createRegistrationCode: (params: { firstName: string; lastName: string; role: UserRole; schoolId: string; graduationYear?: string }) => string;

  // School (superadmin)
  selectSchool: (schoolId: string) => void;

  // Users
  addUser: (user: Omit<User, 'id' | 'createdAt' | 'points'>, password?: string) => User;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  resetUserProfile: (id: string) => void;
  toggleBlacklist: (id: string) => void; // legacy compat
  updatePoints: (userId: string, delta: number) => void;
  generateCodes: (students: Omit<ActivationCode, 'code' | 'isUsed' | 'createdAt'>[], schoolId: string) => void;
  deleteCodeSession: (sessionId: string) => void;
  deleteCode: (code: string) => void;
  markNotificationRead: (id: string) => void;
  addUserNotification: (userId: string, message: string, type: 'warning' | 'info' | 'success') => void;

  // WatchList
  addToWatchList: (userId: string, reason: string, addedBy: string) => void;
  removeFromWatchList: (entryId: string) => void;
  isOnWatchList: (userId: string) => boolean;

  // Teams
  createTeam: (team: Omit<Team, 'id' | 'createdAt' | 'applications' | 'members' | 'news' | 'achievements'>) => void;
  updateTeam: (id: string, updates: Partial<Team>) => void;
  deleteTeam: (id: string) => void;
  toggleRecruiting: (id: string, title?: string) => void;
  applyToTeam: (teamId: string, application: TeamApplication) => void;
  handleTeamApplication: (teamId: string, userId: string, status: 'approved' | 'rejected') => void;
  addTeamMember: (teamId: string, userId: string) => void;
  removeTeamMember: (teamId: string, userId: string, eject?: boolean) => void;
  addTeamNews: (teamId: string, news: Omit<TeamNews, 'id'>) => void;
  addTeamAchievement: (teamId: string, ach: Omit<TeamAchievement, 'id'>) => void;
  removeTeamNews: (teamId: string, newsId: string) => void;
  removeTeamAchievement: (teamId: string, achievementId: string) => void;

  // Projects
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Events
  createEvent: (event: Omit<Event, 'id' | 'createdAt'>) => void;
  updateEvent: (id: string, updates: Partial<Event>) => void;
  deleteEvent: (id: string) => void;

  // Announcements
  createAnnouncement: (ann: Omit<Announcement, 'id' | 'createdAt'>) => void;
  deleteAnnouncement: (id: string) => void;

  // Tasks
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'applicants'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  applyToTask: (taskId: string, applicant: TaskApplicant) => void;
  handleTaskApplication: (taskId: string, userId: string, status: 'approved' | 'rejected') => void;

  // Timeline
  addTimelineEntry: (entry: Omit<TimelineEntry, 'id'>) => void;

  // Inventory
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'createdAt'>) => void;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  requestLoan: (loan: Omit<InventoryLoan, 'id' | 'requestedAt'>) => void;
  batchRequestLoans: (loans: Omit<InventoryLoan, 'id' | 'requestedAt'>[]) => void;
  handleLoan: (loanId: string, status: 'approved' | 'rejected' | 'returned' | 'return_pending') => void;

  // Inventory Rooms (Kroki)
  addInventoryRoom: (schoolId: string, name: string) => void;
  updateInventoryRoom: (id: string, name: string) => void;
  deleteInventoryRoom: (id: string) => void;
  upsertCabinet: (roomId: string, cabinet: InventoryCabinet) => void;
  deleteCabinet: (roomId: string, cabinetId: string) => void;

  // Graduates
  saveGraduate: (data: Graduate) => void;

  // Fixed Assets (Demirbaş)
  fixedAssets: FixedAsset[];
  fixedAssetAssignments: FixedAssetAssignment[];
  fixedAssetManagers: string[];   // user IDs who can access the Demirbaş page
  addFixedAsset: (asset: Omit<FixedAsset, 'id' | 'createdAt'>) => void;
  updateFixedAsset: (id: string, updates: Partial<FixedAsset>) => void;
  removeFixedAsset: (id: string) => void;
  assignFixedAsset: (assetId: string, userId: string, quantity: number, note?: string) => void;
  unassignFixedAsset: (assignmentId: string) => void;
  addFixedAssetManager: (userId: string) => void;
  removeFixedAssetManager: (userId: string) => void;

  // Auto grade promotion (July 1)
  applyGradePromotion: () => void;

  // Reset
  resetToDefaults: () => void;
}

const defaultState = {
  theme: (() => {
    if (typeof window === 'undefined') return 'dark';
    const saved = localStorage.getItem('opays-v2-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  })() as 'dark' | 'light',
  currentUser: null,
  selectedSchoolId: 'sch1',
  schools: INITIAL_SCHOOLS,
  feedbacks: [] as Feedback[],
  lastFeedbackSeenAt: null as string | null,
  users: INITIAL_USERS,
  codes: INITIAL_CODES,
  teams: INITIAL_TEAMS,
  projects: INITIAL_PROJECTS,
  events: INITIAL_EVENTS,
  announcements: INITIAL_ANNOUNCEMENTS,
  tasks: INITIAL_TASKS,
  timeline: INITIAL_TIMELINE,
  watchList: INITIAL_WATCHLIST,
  inventory: INITIAL_INVENTORY,
  loans: INITIAL_LOANS,
  inventoryRooms: [] as InventoryRoom[],
  graduates: INITIAL_GRADUATES,
  notifications: [] as Notification[],
  fixedAssets: [] as FixedAsset[],
  fixedAssetAssignments: [] as FixedAssetAssignment[],
  fixedAssetManagers: [] as string[],
  runtimePasswords: { ...PASSWORDS } as Record<string, string>,
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...defaultState,

      toggleTheme: () => set(s => {
        const next = s.theme === 'dark' ? 'light' : 'dark';
        if (typeof window !== 'undefined') localStorage.setItem('opays-v2-theme', next);
        return { theme: next };
      }),

      addSchool: (school) => set(s => ({
        schools: [...s.schools, { ...school, id: nanoid() }],
      })),

      updateSchool: (id, updates) => set(s => ({
        schools: s.schools.map(sc => sc.id === id ? { ...sc, ...updates } : sc),
      })),

      deleteSchool: (id) => set(s => ({
        schools: s.schools.filter(sc => sc.id !== id),
      })),

      submitFeedback: (fb) => {
        const u = get().users.find(user => user.id === fb.userId);
        if (u && containsProfanity(fb.content)) {
          const notification: Notification = {
            id: nanoid(),
            message: `Uygunsuz dil tespit edildi: ${u.firstName} ${u.lastName} (@${u.username}) — geri bildirim. Hesap askıya alındı.`,
            type: 'warning', read: false, createdAt: new Date().toISOString(),
          };
          set(s => ({
            users: s.users.map(user => user.id === fb.userId ? { ...user, isBlacklisted: true } : user),
            currentUser: s.currentUser?.id === fb.userId ? null : s.currentUser,
            notifications: [...s.notifications, notification],
          }));
          return;
        }
        set(s => ({
          feedbacks: [...s.feedbacks, { ...fb, id: nanoid(), status: 'open', createdAt: new Date().toISOString() }],
        }));
      },

      resolveFeedback: (id) => set(s => ({
        feedbacks: s.feedbacks.map(f => f.id === id ? { ...f, status: 'resolved' } : f),
      })),

      deleteFeedback: (id) => set(s => ({
        feedbacks: s.feedbacks.filter(f => f.id !== id),
      })),

      markFeedbacksAsSeen: () => set({ lastFeedbackSeenAt: new Date().toISOString() }),

      login: (identifier, password) => {
        const { users, runtimePasswords } = get();
        const user = users.find(u => u.username === identifier || u.email === identifier);
        if (!user) return { success: false, error: 'Kullanıcı bulunamadı.' };
        if (user.isBlacklisted) {
          // Check if time-limited ban has expired → auto-unban
          if (user.bannedUntil && new Date() > new Date(user.bannedUntil)) {
            set(s => ({ users: s.users.map(u => u.id === user.id ? { ...u, isBlacklisted: false, bannedUntil: undefined } : u) }));
            // fall through to password check
          } else {
            const msg = user.bannedUntil
              ? `Hesabınıza ${new Date(user.bannedUntil).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} tarihine kadar erişim kısıtlandı.`
              : 'Hesabınıza erişim kısıtlandı. Süperadmin ile iletişime geçin.';
            return { success: false, error: msg };
          }
        }
        const storedPwd = runtimePasswords[user.username];
        if (!storedPwd || password !== storedPwd) return { success: false, error: 'Şifre hatalı.' };
        const defaultSchool = get().schools.find(s => s.isDefault)?.id || 'sch1';
        // Refresh user from state in case auto-unban updated it
        const freshUser = get().users.find(u => u.username === identifier || u.email === identifier) || user;
        set({ currentUser: freshUser, selectedSchoolId: freshUser.schoolId || defaultSchool });
        return { success: true };
      },

      logout: () => set({ currentUser: null }),

      activateCode: (code) => {
        // Normalize input: trim, lowercase, replace iOS smart-punctuation dashes
        // (en-dash U+2013, em-dash U+2014, minus U+2212) with regular hyphen,
        // and strip any accidental whitespace injected by mobile keyboards.
        const normalize = (s: string) =>
          s.trim().toLowerCase()
           .replace(/[–—−﹘﹣－]/g, '-')
           .replace(/\s+/g, '');
        const normalized = normalize(code);
        const found = get().codes.find(c => normalize(c.code) === normalized && !c.isUsed);
        if (!found) return { success: false, error: 'Geçersiz veya kullanılmış aktivasyon kodu.' };
        return { success: true, data: found };
      },

      changePassword: (username, newPassword) => set(s => ({
        runtimePasswords: { ...s.runtimePasswords, [username]: newPassword },
      })),

      createAccount: (codeId, username, email, phone, instagram, password, extraData?) => {
        const { users, codes } = get();
        const normalizedId = codeId.trim().toLowerCase();
        const code = codes.find(c => c.code.trim().toLowerCase() === normalizedId && !c.isUsed);
        if (!code) return { success: false, error: 'Geçersiz kod.' };
        if (users.find(u => u.username === username)) return { success: false, error: 'Bu kullanıcı adı alınmış.' };
        if (users.find(u => u.email === email)) return { success: false, error: 'Bu e-posta zaten kayıtlı.' };

        // Profanity check
        if (containsProfanity(username)) {
          const notification: Notification = {
            id: nanoid(), message: `"${username}" kullanıcı adında uygunsuz ifade tespit edildi.`,
            type: 'warning', read: false, createdAt: new Date().toISOString(),
          };
          set(s => ({ notifications: [...s.notifications, notification] }));
          return { success: false, error: 'Kullanıcı adınız uygun değil. Lütfen tekrar deneyin.' };
        }

        const nameParts = code.studentName.split(' ');
        const lastName = nameParts.pop() || '';
        const firstName = nameParts.join(' ');
        const role = code.role || 'student';

        const newUser: User = {
          id: nanoid(), schoolId: code.schoolId, studentNo: code.studentNo,
          firstName, lastName, username, email,
          phone: phone ? `+90${phone}` : undefined,
          instagram: instagram || undefined,
          role,
          class: code.class || undefined,
          section: code.section || undefined,
          isBlacklisted: false, isActivated: true, skills: [], points: 0,
          createdAt: new Date().toISOString(),
        };

        const graduateRecord = role === 'graduate' ? {
          userId: newUser.id,
          schoolId: code.schoolId,
          graduationYear: extraData?.graduationYear || code.graduationYear || String(new Date().getFullYear()),
          university: extraData?.university,
          department: extraData?.department,
          shareProfile: true,
        } : null;

        set(s => ({
          users: [...s.users, newUser],
          codes: s.codes.map(c => c.code.trim().toLowerCase() === normalizedId ? { ...c, isUsed: true, usedById: newUser.id } : c),
          currentUser: newUser,
          runtimePasswords: { ...s.runtimePasswords, [username]: password },
          graduates: graduateRecord
            ? [...s.graduates.filter(g => g.userId !== newUser.id), graduateRecord]
            : s.graduates,
        }));
        return { success: true };
      },

      createRegistrationCode: ({ firstName, lastName, role, schoolId, graduationYear }) => {
        const school = get().schools.find(s => s.id === schoolId);
        const abbr = school?.abbreviation || 'usr';
        const year = new Date().getFullYear();
        const existing = get().codes.map(c => c.code);
        const code = generateCode(abbr, year, existing);
        const newCode: ActivationCode = {
          code,
          schoolId,
          studentNo: `U${Date.now().toString().slice(-6)}`,
          studentName: `${firstName} ${lastName}`,
          class: '',
          section: '',
          role,
          graduationYear,
          isUsed: false,
          createdAt: new Date().toISOString(),
        };
        set(s => ({ codes: [...s.codes, newCode] }));
        return code;
      },

      selectSchool: (schoolId) => set({ selectedSchoolId: schoolId }),

      addUser: (user, password) => {
        const newUser = { ...user, id: nanoid(), points: 0, createdAt: new Date().toISOString() };
        set(s => ({
          users: [...s.users, newUser],
          runtimePasswords: password ? { ...s.runtimePasswords, [user.username]: password } : s.runtimePasswords,
        }));
        return newUser;
      },

      updateUser: (id, updates) => set(s => {
        // ── Permission gate ──────────────────────────────────────────────────
        // Re-derive the actor's role from the canonical users list (not the
        // possibly-stale `currentUser` object) so that UI-level checks can't be
        // bypassed by calling this action directly (e.g. from devtools/console)
        // with a payload that grants roles, points, or fields the actor can't
        // legitimately touch.
        const actor = s.currentUser ? s.users.find(u => u.id === s.currentUser!.id) : undefined;
        if (!actor) return s;
        const isSelf = actor.id === id;
        const isStaff = ['superadmin', 'admin', 'tech_teacher', 'branch_teacher'].includes(actor.role);
        const isSuper = actor.role === 'superadmin';

        let allowedKeys: (keyof User)[];
        if (isSelf) {
          allowedKeys = ['bio', 'email', 'phone', 'instagram', 'skills', 'photoUrl', 'username'];
          if (isSuper) { allowedKeys.push('firstName', 'lastName'); }
        } else if (isStaff) {
          allowedKeys = Object.keys(updates) as (keyof User)[];
          if (!isSuper) allowedKeys = allowedKeys.filter(k => k !== 'role');
        } else {
          return s;
        }
        const safeUpdates: Partial<User> = {};
        for (const key of allowedKeys) {
          if (key in updates) (safeUpdates as Record<string, unknown>)[key] = (updates as Record<string, unknown>)[key];
        }
        const updates_ = safeUpdates;

        const targetUser = s.users.find(u => u.id === id);
        let newRuntimePasswords = s.runtimePasswords;
        // If username is changing, migrate the password to the new key
        if (updates_.username && targetUser && updates_.username !== targetUser.username) {
          const oldPwd = s.runtimePasswords[targetUser.username];
          newRuntimePasswords = { ...s.runtimePasswords };
          if (oldPwd !== undefined) {
            newRuntimePasswords[updates_.username] = oldPwd;
            delete newRuntimePasswords[targetUser.username];
          }
        }
        return {
          users: s.users.map(u => u.id === id ? { ...u, ...updates_ } : u),
          currentUser: s.currentUser?.id === id ? { ...s.currentUser, ...updates_ } : s.currentUser,
          runtimePasswords: newRuntimePasswords,
        };
      }),

      deleteUser: (id) => set(s => ({
        users: s.users.filter(u => u.id !== id),
        teams: s.teams.map(t => ({ ...t, members: t.members.filter(m => m !== id) })),
      })),

      resetUserProfile: (id) => set(s => ({
        users: s.users.map(u => u.id === id ? {
          ...u, bio: undefined, skills: [], phone: undefined, instagram: undefined, points: 0,
        } : u),
        timeline: s.timeline.filter(e => e.userId !== id),
      })),

      toggleBlacklist: (id) => set(s => ({
        users: s.users.map(u => u.id === id ? { ...u, isBlacklisted: !u.isBlacklisted } : u),
      })),

      updatePoints: (userId, delta) => set(s => ({
        users: s.users.map(u => u.id === userId ? { ...u, points: Math.max(0, (u.points || 0) + delta) } : u),
      })),

      generateCodes: (students, schoolId) => {
        const school = get().schools.find(s => s.id === schoolId);
        const abbr = school?.abbreviation || 'xxx';
        const year = new Date().getFullYear();
        const existing = get().codes.map(c => c.code);
        const sessionId = nanoid();
        const sessionDate = new Date().toISOString();
        const newCodes = students.map(s => ({
          ...s, schoolId,
          code: generateCode(abbr, year, existing),
          isUsed: false, createdAt: new Date().toISOString(),
          sessionId, sessionDate,
        }));
        set(s => ({ codes: [...s.codes, ...newCodes] }));
      },

      deleteCodeSession: (sessionId) => set(s => ({
        codes: s.codes.filter(c => c.sessionId !== sessionId || c.isUsed),
      })),

      deleteCode: (code) => set(s => ({
        codes: s.codes.filter(c => c.code !== code || c.isUsed),
      })),

      markNotificationRead: (id) => set(s => ({
        notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
      })),

      addUserNotification: (userId, message, type) => {
        const notif: Notification = {
          id: nanoid(), userId, message, type, read: false, createdAt: new Date().toISOString(),
        };
        set(s => ({ notifications: [...s.notifications, notif] }));
      },

      addToWatchList: (userId, reason, addedBy) => {
        const entry: WatchListEntry = {
          id: nanoid(), userId, reason, addedBy, date: new Date().toISOString(), isActive: true,
        };
        set(s => ({ watchList: [...s.watchList, entry] }));
      },

      removeFromWatchList: (entryId) => set(s => ({
        watchList: s.watchList.map(w => w.id === entryId ? { ...w, isActive: false } : w),
      })),

      isOnWatchList: (userId) => {
        return get().watchList.some(w => w.userId === userId && w.isActive);
      },

      createTeam: (team) => set(s => {
        const initialMembers = [team.captainId, ...((team as any).initialMembers || []).filter((id: string) => id !== team.captainId)];
        return { teams: [...s.teams, { ...team, id: nanoid(), members: initialMembers, applications: [], news: [], achievements: [], createdAt: new Date().toISOString() }] };
      }),

      updateTeam: (id, updates) => set(s => ({
        teams: s.teams.map(t => t.id === id ? { ...t, ...updates } : t),
      })),

      deleteTeam: (id) => set(s => ({
        teams: s.teams.filter(t => t.id !== id),
      })),

      toggleRecruiting: (id, title) => set(s => ({
        teams: s.teams.map(t => t.id === id ? {
          ...t,
          isRecruiting: !t.isRecruiting,
          // When opening, save the title; when closing, keep the old title for history
          ...(!t.isRecruiting && title ? { recruitingTitle: title } : {}),
        } : t),
      })),

      applyToTeam: (teamId, application) => {
        const note = application.note;
        if (containsProfanity(note)) {
          const u = get().users.find(user => user.id === application.userId);
          const notification: Notification = {
            id: nanoid(),
            message: `Uygunsuz dil tespit edildi: ${u ? `${u.firstName} ${u.lastName} (@${u.username})` : 'Bilinmeyen kullanıcı'} — takım başvurusu. Hesap askıya alındı.`,
            type: 'warning', read: false, createdAt: new Date().toISOString(),
          };
          set(s => ({
            users: s.users.map(user => user.id === application.userId ? { ...user, isBlacklisted: true } : user),
            currentUser: s.currentUser?.id === application.userId ? null : s.currentUser,
            notifications: [...s.notifications, notification],
          }));
          return;
        }
        const teamForNotif = get().teams.find(t => t.id === teamId);
        const applicant = get().users.find(u => u.id === application.userId);
        const notifTargets = new Set<string>();
        if (teamForNotif?.captainId) notifTargets.add(teamForNotif.captainId);
        if (teamForNotif?.advisorId) notifTargets.add(teamForNotif.advisorId);
        const appNotifs: Notification[] = [];
        notifTargets.forEach(uid => {
          if (uid !== application.userId) {
            appNotifs.push({
              id: nanoid(), userId: uid,
              message: `"${teamForNotif?.name}" takımına yeni başvuru: ${applicant?.firstName} ${applicant?.lastName}`,
              type: 'info', read: false, createdAt: new Date().toISOString(),
            });
          }
        });
        set(s => ({
          teams: s.teams.map(t => t.id === teamId ? { ...t, applications: [...t.applications.filter(a => a.userId !== application.userId), application] } : t),
          notifications: appNotifs.length > 0 ? [...s.notifications, ...appNotifs] : s.notifications,
        }));
      },

      handleTeamApplication: (teamId, userId, status) => {
        set(s => ({
          teams: s.teams.map(t => {
            if (t.id !== teamId) return t;
            // On rejection: remove the application so the user can re-apply later
            const apps = status === 'rejected'
              ? t.applications.filter(a => a.userId !== userId)
              : t.applications.map(a => a.userId === userId ? { ...a, status } : a);
            const members = status === 'approved' && !t.members.includes(userId) ? [...t.members, userId] : t.members;
            return { ...t, applications: apps, members };
          }),
        }));
        const team = get().teams.find(t => t.id === teamId);
        if (status === 'approved' && team) {
          get().addTimelineEntry({ userId, type: 'team', referenceId: teamId, title: `${team.name}'a Katıldı`, description: 'Başvurusu kabul edilerek takıma eklendi.', isVerified: true, date: new Date().toISOString() });
          get().updatePoints(userId, 100);
          get().addUserNotification(userId, `"${team.name}" takımına başvurunuz kabul edildi! Takıma hoş geldiniz. 🎉`, 'success');
        }
        if (status === 'rejected' && team) {
          get().addUserNotification(userId, `"${team.name}" takım başvurunuz olumsuz sonuçlanmıştır.`, 'warning');
        }
      },

      addTeamMember: (teamId, userId) => set(s => ({
        teams: s.teams.map(t => t.id === teamId && !t.members.includes(userId) ? { ...t, members: [...t.members, userId] } : t),
      })),

      removeTeamMember: (teamId, userId, eject) => {
        const team = get().teams.find(t => t.id === teamId);
        set(s => ({
          teams: s.teams.map(t => {
            if (t.id !== teamId) return t;
            const former = t.formerMembers || [];
            return {
              ...t,
              members: t.members.filter(m => m !== userId),
              formerMembers: former.includes(userId) ? former : [...former, userId],
            };
          }),
        }));
        if (eject && team) {
          get().updatePoints(userId, -100);
          get().addToWatchList(userId, `Takımdan ihraç edildi — ${team.name}`, 'sistem');
          get().addUserNotification(userId, `${team.name} takımından ihraç edildiniz.`, 'warning');
        }
      },

      addTeamNews: (teamId, news) => set(s => ({
        // Use provided createdAt for historical entry; fall back to now
        teams: s.teams.map(t => t.id === teamId ? { ...t, news: [...(t.news || []), { ...news, id: nanoid(), createdAt: news.createdAt || new Date().toISOString() }] } : t),
      })),

      addTeamAchievement: (teamId, ach) => set(s => ({
        // Use provided date for historical entry; fall back to now (ISO string)
        teams: s.teams.map(t => t.id === teamId ? { ...t, achievements: [...(t.achievements || []), { ...ach, id: nanoid(), date: ach.date || new Date().toISOString() }] } : t),
      })),

      removeTeamNews: (teamId, newsId) => set(s => ({
        teams: s.teams.map(t => t.id === teamId ? { ...t, news: (t.news || []).filter(n => n.id !== newsId) } : t),
      })),

      removeTeamAchievement: (teamId, achId) => set(s => ({
        teams: s.teams.map(t => t.id === teamId ? { ...t, achievements: (t.achievements || []).filter(a => a.id !== achId) } : t),
      })),

      createProject: (project) => {
        const cu = get().currentUser;
        if (cu) {
          const textToCheck = [project.title, project.description, project.goal || '', project.method || '', project.technologies.join(' ')].join(' ');
          if (containsProfanity(textToCheck)) {
            const notification: Notification = {
              id: nanoid(),
              message: `Uygunsuz dil tespit edildi: ${cu.firstName} ${cu.lastName} (@${cu.username}) — proje oluşturma. Hesap askıya alındı.`,
              type: 'warning', read: false, createdAt: new Date().toISOString(),
            };
            set(s => ({
              users: s.users.map(u => u.id === cu.id ? { ...u, isBlacklisted: true } : u),
              currentUser: null,
              notifications: [...s.notifications, notification],
            }));
            return;
          }
        }
        const newProject = {
          ...project,
          id: nanoid(),
          isVisible: project.isVisible ?? false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set(s => ({ projects: [...s.projects, newProject] }));
        if (!newProject.isVisible) {
          const creator = get().users.find(u => u.id === project.createdBy);
          const admins = get().users.filter(u => u.schoolId === project.schoolId && ['admin', 'tech_teacher', 'superadmin'].includes(u.role));
          admins.forEach(admin => {
            get().addUserNotification(admin.id, `Proje görünürlük talebi: "${project.title}" — ${creator?.firstName} ${creator?.lastName}`, 'info');
          });
        }
      },

      updateProject: (id, updates) => {
        const existing = get().projects.find(p => p.id === id);
        const newNotifs: Notification[] = [];
        // Stage 1: visibility approved → notify contributors
        if (updates.isVisible === true && existing && !existing.isVisible) {
          existing.contributors.forEach(uid => {
            newNotifs.push({ id: nanoid(), userId: uid, message: `"${existing.title}" projeniz artık diğer kullanıcılara görünür! 👀`, type: 'info', read: false, createdAt: new Date().toISOString() });
          });
        }
        // Stage 2: full approval → notify contributors
        if (updates.isApproved === true && existing && !existing.isApproved) {
          existing.contributors.forEach(uid => {
            newNotifs.push({ id: nanoid(), userId: uid, message: `"${existing.title}" projeniz tamamen onaylandı! Envanterden malzeme talep edebilirsiniz. 🎉`, type: 'success', read: false, createdAt: new Date().toISOString() });
          });
        }
        set(s => ({
          projects: s.projects.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p),
          notifications: newNotifs.length > 0 ? [...s.notifications, ...newNotifs] : s.notifications,
        }));
      },

      deleteProject: (id) => set(s => ({
        projects: s.projects.filter(p => p.id !== id),
      })),

      createEvent: (event) => set(s => ({
        events: [...s.events, { ...event, id: nanoid(), createdAt: new Date().toISOString() }],
      })),

      updateEvent: (id, updates) => set(s => ({
        events: s.events.map(e => e.id === id ? { ...e, ...updates } : e),
      })),

      deleteEvent: (id) => set(s => ({ events: s.events.filter(e => e.id !== id) })),

      createAnnouncement: (ann) => {
        const newAnn = { ...ann, id: nanoid(), createdAt: new Date().toISOString() };
        // Push a notification to every non-banned school user
        const schoolUsers = get().users.filter(u => u.schoolId === ann.schoolId && !u.isBlacklisted);
        const newNotifs: Notification[] = schoolUsers.map(u => ({
          id: nanoid(),
          userId: u.id,
          message: `Yeni duyuru: "${ann.title}"`,
          type: 'info' as const,
          read: false,
          createdAt: new Date().toISOString(),
        }));
        set(s => ({
          announcements: [newAnn, ...s.announcements],
          notifications: [...s.notifications, ...newNotifs],
        }));
      },

      deleteAnnouncement: (id) => set(s => ({ announcements: s.announcements.filter(a => a.id !== id) })),

      createTask: (task) => set(s => ({
        tasks: [...s.tasks, { ...task, id: nanoid(), applicants: [], createdAt: new Date().toISOString() }],
      })),

      updateTask: (id, updates) => set(s => ({
        tasks: s.tasks.map(t => t.id === id ? { ...t, ...updates } : t),
      })),

      applyToTask: (taskId, applicant) => {
        const note = applicant.note;
        if (containsProfanity(note)) {
          const u = get().users.find(user => user.id === applicant.userId);
          const notification: Notification = {
            id: nanoid(),
            message: `Uygunsuz dil tespit edildi: ${u ? `${u.firstName} ${u.lastName} (@${u.username})` : 'Bilinmeyen kullanıcı'} — görev başvurusu. Hesap askıya alındı.`,
            type: 'warning', read: false, createdAt: new Date().toISOString(),
          };
          set(s => ({
            users: s.users.map(user => user.id === applicant.userId ? { ...user, isBlacklisted: true } : user),
            currentUser: s.currentUser?.id === applicant.userId ? null : s.currentUser,
            notifications: [...s.notifications, notification],
          }));
          return;
        }
        set(s => ({
          tasks: s.tasks.map(t => t.id === taskId ? { ...t, applicants: [...t.applicants.filter(a => a.userId !== applicant.userId), applicant] } : t),
        }));
      },

      handleTaskApplication: (taskId, userId, status) => {
        set(s => ({
          tasks: s.tasks.map(t => {
            if (t.id !== taskId) return t;
            const applicants = t.applicants.map(a => a.userId === userId ? { ...a, status } : a);
            return status === 'approved' ? { ...t, applicants, assignedTo: userId, status: 'in_progress' as const } : { ...t, applicants };
          }),
        }));
        if (status === 'approved') {
          get().updatePoints(userId, 50);
          const task = get().tasks.find(t => t.id === taskId);
          if (task) {
            get().addUserNotification(userId, `"${task.title}" görevine başvurunuz kabul edildi! 🎉`, 'success');
            if (task.wpLink) {
              get().addUserNotification(userId, `📱 "${task.title}" görevinin WhatsApp grubuna katılın: ${task.wpLink}`, 'info');
            }
          }
        }
      },

      addTimelineEntry: (entry) => set(s => ({ timeline: [...s.timeline, { ...entry, id: nanoid() }] })),

      addInventoryItem: (item) => set(s => ({
        inventory: [...s.inventory, { ...item, id: nanoid(), createdAt: new Date().toISOString() }],
      })),

      updateInventoryItem: (id, updates) => set(s => ({
        inventory: s.inventory.map(i => i.id === id ? { ...i, ...updates } : i),
      })),

      deleteInventoryItem: (id) => set(s => ({
        inventory: s.inventory.filter(i => i.id !== id),
        loans: s.loans.filter(l => l.itemId !== id),
      })),

      requestLoan: (loan) => {
        const newLoan = { ...loan, id: nanoid(), requestedAt: new Date().toISOString() };
        const { users, inventory } = get();
        const user = users.find(u => u.id === loan.userId);
        const item = inventory.find(i => i.id === loan.itemId);
        const schoolId = item?.schoolId || user?.schoolId;
        const adminNotifs: Notification[] = [];
        if (schoolId && user) {
          const admins = users.filter(u => u.schoolId === schoolId && ['admin', 'tech_teacher', 'superadmin'].includes(u.role));
          admins.forEach(admin => {
            adminNotifs.push({ id: nanoid(), userId: admin.id, message: `Malzeme talebi: ${user.firstName} ${user.lastName} — ${item?.name} ×${loan.quantity}`, type: 'info', read: false, createdAt: new Date().toISOString() });
          });
        }
        set(s => ({ loans: [...s.loans, newLoan], notifications: [...s.notifications, ...adminNotifs] }));
      },

      // Adds all cart loans in a single set() call to avoid Supabase write races,
      // and sends one batched notification per admin listing all requested items.
      batchRequestLoans: (loanInputs) => {
        if (loanInputs.length === 0) return;
        const now = new Date().toISOString();
        const newLoans = loanInputs.map(loan => ({ ...loan, id: nanoid(), requestedAt: now }));
        const { users, inventory } = get();
        const firstInput = loanInputs[0];
        const user = users.find(u => u.id === firstInput.userId);
        const schoolId = user?.schoolId || inventory.find(i => i.id === firstInput.itemId)?.schoolId;
        const adminNotifs: Notification[] = [];
        if (schoolId && user) {
          const admins = users.filter(u => u.schoolId === schoolId && ['admin', 'tech_teacher', 'superadmin'].includes(u.role));
          const itemNames = loanInputs.map(l => {
            const item = inventory.find(i => i.id === l.itemId);
            return `${item?.name || '?'} ×${l.quantity}`;
          }).join(', ');
          admins.forEach(admin => {
            adminNotifs.push({ id: nanoid(), userId: admin.id, message: `Malzeme talebi: ${user.firstName} ${user.lastName} — ${itemNames}`, type: 'info', read: false, createdAt: now });
          });
        }
        set(s => ({ loans: [...s.loans, ...newLoans], notifications: [...s.notifications, ...adminNotifs] }));
      },

      handleLoan: (loanId, status) => {
        const loan = get().loans.find(l => l.id === loanId);
        const now = new Date().toISOString();
        // Notify the requesting user when their loan is approved or rejected
        const userNotifs: Notification[] = [];
        if (loan && (status === 'approved' || status === 'rejected')) {
          const item = get().inventory.find(i => i.id === loan.itemId);
          const msg = status === 'approved'
            ? `Malzeme talebiniz onaylandı: ${item?.name} ×${loan.quantity} 📦`
            : `Malzeme talebiniz reddedildi: ${item?.name} ×${loan.quantity}`;
          userNotifs.push({ id: nanoid(), userId: loan.userId, message: msg, type: status === 'approved' ? 'success' : 'warning', read: false, createdAt: now });
        }
        set(s => ({
          loans: s.loans.map(l => l.id === loanId ? {
            ...l, status,
            approvedAt: status === 'approved' ? now : l.approvedAt,
            returnedAt: status === 'returned' ? now : undefined,
          } : l),
          inventory: status === 'approved' && loan
            ? s.inventory.map(i => i.id === loan.itemId ? { ...i, available: Math.max(0, i.available - loan.quantity) } : i)
            : status === 'returned' && loan
            ? s.inventory.map(i => i.id === loan.itemId ? { ...i, available: i.available + loan.quantity } : i)
            : s.inventory,
          notifications: userNotifs.length > 0 ? [...s.notifications, ...userNotifs] : s.notifications,
        }));
      },

      // Inventory Rooms
      addInventoryRoom: (schoolId, name) => set(s => ({
        inventoryRooms: [...s.inventoryRooms, { id: nanoid(), schoolId, name, cabinets: [] }],
      })),
      updateInventoryRoom: (id, name) => set(s => ({
        inventoryRooms: s.inventoryRooms.map(r => r.id === id ? { ...r, name } : r),
      })),
      deleteInventoryRoom: (id) => set(s => ({
        inventoryRooms: s.inventoryRooms.filter(r => r.id !== id),
      })),
      upsertCabinet: (roomId, cabinet) => set(s => ({
        inventoryRooms: s.inventoryRooms.map(r => r.id === roomId ? {
          ...r,
          cabinets: r.cabinets.some(c => c.id === cabinet.id)
            ? r.cabinets.map(c => c.id === cabinet.id ? cabinet : c)
            : [...r.cabinets, cabinet],
        } : r),
      })),
      deleteCabinet: (roomId, cabinetId) => set(s => ({
        inventoryRooms: s.inventoryRooms.map(r => r.id === roomId ? {
          ...r, cabinets: r.cabinets.filter(c => c.id !== cabinetId),
        } : r),
      })),

      saveGraduate: (data) => set(s => ({
        graduates: [...s.graduates.filter(g => g.userId !== data.userId), data],
      })),

      addFixedAsset: (asset) => set(s => ({
        fixedAssets: [...s.fixedAssets, { ...asset, id: nanoid(), createdAt: new Date().toISOString() }],
      })),

      updateFixedAsset: (id, updates) => set(s => ({
        fixedAssets: s.fixedAssets.map(a => a.id === id ? { ...a, ...updates } : a),
      })),

      removeFixedAsset: (id) => set(s => ({
        fixedAssets: s.fixedAssets.filter(a => a.id !== id),
        fixedAssetAssignments: s.fixedAssetAssignments.filter(a => a.assetId !== id),
      })),

      assignFixedAsset: (assetId, userId, quantity, note) => {
        const asset = get().fixedAssets.find(a => a.id === assetId);
        if (!asset || asset.available < quantity) return;
        const assignment: FixedAssetAssignment = {
          id: nanoid(), assetId, userId, quantity, note, assignedAt: new Date().toISOString(),
        };
        set(s => ({
          fixedAssets: s.fixedAssets.map(a => a.id === assetId ? { ...a, available: a.available - quantity } : a),
          fixedAssetAssignments: [...s.fixedAssetAssignments, assignment],
        }));
      },

      unassignFixedAsset: (assignmentId) => {
        const assignment = get().fixedAssetAssignments.find(a => a.id === assignmentId);
        set(s => ({
          fixedAssets: assignment
            ? s.fixedAssets.map(a => a.id === assignment.assetId ? { ...a, available: a.available + assignment.quantity } : a)
            : s.fixedAssets,
          fixedAssetAssignments: s.fixedAssetAssignments.filter(a => a.id !== assignmentId),
        }));
      },

      addFixedAssetManager: (userId) => set(s => ({
        fixedAssetManagers: s.fixedAssetManagers.includes(userId) ? s.fixedAssetManagers : [...s.fixedAssetManagers, userId],
      })),

      removeFixedAssetManager: (userId) => set(s => ({
        fixedAssetManagers: s.fixedAssetManagers.filter(id => id !== userId),
      })),

      applyGradePromotion: () => {
        const today = new Date();
        if (today.getMonth() === 6 && today.getDate() === 1) {
          set(s => ({
            users: s.users.map(u => {
              if (!u.class) return u;
              const cls = parseInt(u.class);
              if (cls >= 12) return u;
              return { ...u, class: String(cls + 1) };
            }),
          }));
        }
      },

      resetToDefaults: () => set({ ...defaultState, fixedAssets: [], fixedAssetAssignments: [], fixedAssetManagers: [], inventoryRooms: [], runtimePasswords: { ...PASSWORDS } }),
    }),
    {
      name: 'opays-v2-storage',
      storage: createSupabaseStorage<AppState>() as never,
      // Only currentUser (active session) is excluded from the shared Supabase store.
      // runtimePasswords IS synced to Supabase so that:
      //   • Users can log in from any device after registering.
      //   • Password-reset links work on any device.
      // currentUser is device-local so sessions never leak across devices.
      partialize: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { currentUser, theme, ...rest } = state as unknown as Record<string, unknown>;
        void theme; // excluded: device-local, stored separately in localStorage
        return rest as Omit<AppState, 'currentUser' | 'theme'>;
      },
      // After Supabase hydration, restore the session from this device's localStorage.
      // Validate against the freshly-loaded user list so banned/deleted accounts
      // are never silently re-admitted.
      onRehydrateStorage: () => (hydratedState) => {
        if (!hydratedState) return;

        // ── Migrate old 'team_captain' role → 'student' (captaincy is now per-team via Team.captainId) ──
        if (hydratedState.users) {
          hydratedState.users = hydratedState.users.map((u: User) =>
            (u.role as string) === 'team_captain' ? { ...u, role: 'student' } : u
          );
        }

        // ── Migrate old cabinet format: itemIds → items ──────────────────────
        if (hydratedState.inventoryRooms) {
          hydratedState.inventoryRooms = hydratedState.inventoryRooms.map((room: InventoryRoom) => ({
            ...room,
            cabinets: room.cabinets.map((cab: InventoryCabinet & { itemIds?: string[] }) => {
              if (!cab.items && cab.itemIds) {
                return { ...cab, items: cab.itemIds.map((id: string) => ({ itemId: id, qty: 1 })) };
              }
              if (!cab.items) return { ...cab, items: [] };
              return cab;
            }),
          }));
        }

        // ── Restore device session ────────────────────────────────────────────
        const raw = localStorage.getItem('opays-v2-session');
        if (!raw) return;
        try {
          const saved = JSON.parse(raw) as User;
          const fresh = hydratedState.users?.find((u: User) => u.id === saved.id);
          if (fresh && !fresh.isBlacklisted) {
            setTimeout(() => useStore.setState({ currentUser: fresh }), 0);
          } else {
            localStorage.removeItem('opays-v2-session');
          }
        } catch {
          localStorage.removeItem('opays-v2-session');
        }
      },
    }
  )
);

// ── Device-local session persistence ──────────────────────────────────────────
// Save currentUser to localStorage so page refreshes don't log the user out,
// while never sharing the active session across devices via Supabase.
let _prevSessionUser: User | null = null;
useStore.subscribe((state) => {
  if (state.currentUser !== _prevSessionUser) {
    _prevSessionUser = state.currentUser;
    if (state.currentUser) {
      localStorage.setItem('opays-v2-session', JSON.stringify(state.currentUser));
    } else {
      localStorage.removeItem('opays-v2-session');
    }
  }
});
