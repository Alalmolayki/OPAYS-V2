export type UserRole = 'superadmin' | 'admin' | 'tech_teacher' | 'branch_teacher' | 'student' | 'demo' | 'graduate';

export interface School {
  id: string;
  name: string;
  abbreviation: string;
  city: string;
  directorName?: string;
  isDefault?: boolean;
  logoUrl?: string;   // base64 school logo uploaded by superadmin
  socialLinks?: { id: string; label: string; instagram: string }[];
}

export interface InventoryCabinet {
  id: string;
  name: string;
  x: number; // 0-100 (% of room canvas width)
  y: number; // 0-100 (% of room canvas height)
  items: { itemId: string; qty: number }[];
}

export interface InventoryRoom {
  id: string;
  schoolId: string;
  name: string;
  cabinets: InventoryCabinet[];
}

export interface User {
  id: string;
  schoolId: string;
  studentNo: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone?: string;
  instagram?: string;
  role: UserRole;
  class?: string;
  section?: string;
  isBlacklisted: boolean;
  bannedUntil?: string;     // ISO date string; if set = time-limited ban; if absent = indefinite
  isActivated: boolean;
  skills: string[];
  bio?: string;
  points: number;
  createdAt: string;
}

export interface ActivationCode {
  code: string;
  schoolId: string;
  studentNo: string;
  studentName: string; // "FirstName LastName"
  class: string;
  section: string;
  role?: UserRole; // defaults to 'student' when absent
  graduationYear?: string; // for graduate role
  isUsed: boolean;
  usedById?: string;
  createdAt: string;
  sessionId?: string;   // groups codes created in the same import batch
  sessionDate?: string; // ISO date of the import session
}

export type TeamType = string; // supports built-ins (robotics/teknofest/other) + custom categories

export interface TeamApplication {
  userId: string;
  note: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
  roundTitle?: string; // recruitment round title this application belongs to
}

export interface TeamNews {
  id: string;
  teamId?: string;
  authorId?: string;
  title: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
}

export interface TeamAchievement {
  id: string;
  teamId?: string;
  title: string;
  description?: string;
  sponsor?: string;
  date?: string;
  type: 'achievement' | 'sponsor';
}

export interface Team {
  id: string;
  schoolId: string;
  name: string;
  type: TeamType;
  captainId: string;
  members: string[];
  formerMembers?: string[];  // user IDs of members who left/were removed
  description: string;
  logoInitials: string;
  logoColor: string;
  logoUrl?: string;        // base64 PNG uploaded by captain/admin
  socialMedia?: { instagram?: string; twitter?: string; linkedin?: string };
  isRecruiting: boolean;
  recruitingTitle?: string; // title of the currently open (or most recent) recruitment round
  applications: TeamApplication[];
  news: TeamNews[];
  achievements: TeamAchievement[];
  createdAt: string;
}

export type ProjectStatus = 'design' | 'prototype' | 'testing' | 'completed' | 'in_progress';

export interface Project {
  id: string;
  schoolId: string;
  teamId: string;
  teamName?: string;      // free-text team name when no teamId
  title: string;
  description: string;
  goal?: string;
  method?: string;
  status: ProjectStatus;
  technologies: string[];
  contributors: string[];
  contributorRoles?: Record<string, string>; // userId → role / task description
  createdBy?: string;     // userId of the user who created the project
  startDate?: string;     // optional project start date
  endDate?: string;       // optional project end date
  isVisible: boolean;     // stage 1: admin makes it visible to all users
  isApproved: boolean;    // stage 2: full admin approval → inventory access + notification
  createdAt: string;
  updatedAt: string;
}

export type EventType = string; // 'competition' | 'meeting' | 'workshop' | 'custom' | any admin-defined string

export interface Event {
  id: string;
  schoolId: string;
  title: string;
  type: EventType;
  customTypeLabel?: string; // label when type === 'custom'
  date: string;
  endDate?: string; // optional end date/time
  location?: string;
  description: string;
  participants: string[];
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
}

export type AnnouncementPriority = 'urgent' | 'medium' | 'low';

export interface Announcement {
  id: string;
  schoolId: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  authorId: string;
  createdAt: string;
}

export type TaskType = 'organization' | 'technical' | 'design' | 'other';
export type TaskStatus = 'open' | 'in_progress' | 'closed';

export interface TaskApplicant {
  userId: string;
  note: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
}

export interface Task {
  id: string;
  schoolId: string;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  assignedTo?: string;
  applicants: TaskApplicant[];
  createdBy: string;
  createdAt: string;
  wpLink?: string;  // optional WhatsApp group link; notified on approval
}

export interface TimelineEntry {
  id: string;
  userId: string;
  type: 'event' | 'project' | 'task' | 'team' | 'achievement';
  referenceId: string;
  title: string;
  description: string;
  isVerified: boolean;
  date: string;
}

export interface WatchListEntry {
  id: string;
  userId: string;
  reason: string;
  addedBy: string;
  date: string;
  isActive: boolean;
}

export interface InventoryItem {
  id: string;
  schoolId: string;
  name: string;
  description: string;
  category: string;
  quantity: number;
  available: number;
  addedBy: string;
  createdAt: string;
  visibleToStudents?: boolean;
}

export interface InventoryLoan {
  id: string;
  itemId: string;
  userId: string;
  projectId: string;
  quantity: number;
  status: 'pending' | 'approved' | 'returned' | 'rejected' | 'return_pending';
  note: string;
  requestedAt: string;
  approvedAt?: string;
  returnedAt?: string;
}

export interface FixedAsset {
  id: string;
  schoolId: string;
  name: string;
  description?: string;
  category: string;
  quantity: number;
  available: number;
  serialNo?: string;
  addedBy: string;
  createdAt: string;
}

export interface FixedAssetAssignment {
  id: string;
  assetId: string;
  userId: string;
  quantity: number;
  note?: string;
  assignedAt: string;
}

export interface Feedback {
  id: string;
  userId: string;
  schoolId: string;
  category: 'Talep' | 'Öneri' | 'Şikayet';
  content: string;
  status: 'open' | 'resolved';
  createdAt: string;
}

export interface Graduate {
  userId: string;
  schoolId: string;
  graduationYear: string;
  university?: string;
  department?: string;
  shareProfile: boolean;
  contactInstagram?: string;
  contactEmail?: string;
  contactPhone?: string;
  shareInstagram?: boolean;  // show user's instagram on graduates page
  shareEmail?: boolean;      // show user's email on graduates page
  sharePhone?: boolean;      // show user's phone on graduates page
}
