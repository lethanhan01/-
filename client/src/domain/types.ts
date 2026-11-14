export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export const WEEKDAYS: { key: Weekday; label: string; shortLabel: string }[] = [
  { key: 'mon', label: 'Thứ 2', shortLabel: 'T2' },
  { key: 'tue', label: 'Thứ 3', shortLabel: 'T3' },
  { key: 'wed', label: 'Thứ 4', shortLabel: 'T4' },
  { key: 'thu', label: 'Thứ 5', shortLabel: 'T5' },
  { key: 'fri', label: 'Thứ 6', shortLabel: 'T6' },
  { key: 'sat', label: 'Thứ 7', shortLabel: 'T7' },
  { key: 'sun', label: 'Chủ nhật', shortLabel: 'CN' },
];

export const HOUR_SLOTS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21] as const;

export type BusyScheduleMap = Record<Weekday, number[]>;

export interface StudentAnchorZone {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

export interface StudentProfile {
  id: string;
  fullName: string;
  university: string;
  major: string;
  yearLabel: string;
  phone: string;
  email: string;
  skills: string[];
  bio: string;
  reputationPoints: number;
  verifiedStudent: boolean;
  anchorZoneId: string;
}

export interface WorkplacePhoto {
  id: string;
  url: string;
  caption: string;
}

export interface WorkplaceVideoPreview {
  title: string;
  durationLabel: string;
  thumbnailUrl: string;
  summary: string;
}

export interface Company {
  id: string;
  name: string;
  category: string;
  address: string;
  district: string;
  lat: number;
  lng: number;
  trustScore: number;
  reviewCount: number;
  mapVerified: boolean;
  businessLicenseCode: string | null;
  businessLicenseVerified: boolean;
  warningFlag: string | null;
  photos: WorkplacePhoto[];
  videoPreview?: WorkplaceVideoPreview;
}

export type JobStatus = 'new' | 'urgent' | 'updated' | 'expiring';

export type ShiftPeriod = 'morning' | 'afternoon' | 'evening' | 'weekend';

export interface JobShift {
  id: string;
  label: string;
  days: Weekday[];
  startHour: number;
  endHour: number;
  period: ShiftPeriod;
}

export interface ContractTerms {
  hasWrittenContract: boolean;
  depositRequired: boolean;
  holdIdCard: boolean;
  probationNote: string;
}

export interface JobEditEntry {
  at: string;
  note: string;
}

export interface RawJobListing {
  id: string;
  dedupeKey: string;
  companyId: string;
  title: string;
  hourlyWageVnd: number;
  payCycle: string;
  shifts: JobShift[];
  description: string;
  contractTerms: ContractTerms;
  sourceName: string;
  status: JobStatus;
  postedAt: string;
  updatedAt: string;
  expiresAt: string;
  editHistory: JobEditEntry[];
}

export interface CanonicalJob extends RawJobListing {
  mergedSources: string[];
  duplicateCount: number;
}

export type PostType = 'review' | 'question' | 'warning';

export interface CriteriaRatings {
  salaryTransparency: number;
  environment: number;
  scheduleFlexibility: number;
}

export interface PostComment {
  id: string;
  authorName: string;
  authorUniversity: string;
  content: string;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  type: PostType;
  companyId?: string;
  authorId: string;
  authorName: string;
  authorUniversity: string;
  verifiedWorker: boolean;
  title: string;
  content: string;
  criteriaRatings?: CriteriaRatings;
  evidenceImages: string[];
  helpfulCount: number;
  helpfulByMe?: boolean;
  createdAt: string;
  comments: PostComment[];
}

export type ProfileCardSnapshot = Pick<
  StudentProfile,
  'fullName' | 'university' | 'major' | 'yearLabel' | 'skills' | 'reputationPoints'
>;

export interface ChatMessage {
  id: string;
  sender: 'me' | 'peer';
  text: string;
  sentAt: string;
  profileCard?: ProfileCardSnapshot;
}

export interface ChatThread {
  id: string;
  peerId: string;
  peerName: string;
  peerRoleLabel: string;
  peerHasReviewed: boolean;
  contextPostId?: string;
  contextCompanyId?: string;
  unreadCount: number;
  messages: ChatMessage[];
}

export interface ApplicationRecord {
  id: string;
  jobId: string;
  companyId: string;
  jobTitle: string;
  companyName: string;
  selectedShiftIds: string[];
  selectedShiftLabels: string[];
  applicantName: string;
  university: string;
  phone: string;
  email: string;
  introNote: string;
  attachmentName: string | null;
  confirmedTerms: boolean;
  submittedAt: string;
  status: 'submitted' | 'reviewing';
}

export interface ScamReport {
  id: string;
  companyId: string;
  jobId: string;
  reasons: string[];
  details: string;
  createdAt: string;
}

export interface PersistedAppState {
  schemaVersion: 1;
  profile: StudentProfile;
  busySchedule: BusyScheduleMap;
  companies: Company[];
  rawJobs: RawJobListing[];
  posts: CommunityPost[];
  threads: ChatThread[];
  applications: ApplicationRecord[];
  reports: ScamReport[];
}
