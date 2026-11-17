import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { ANCHOR_ZONES, createSeedState } from '../data/seedData';
import {
  deduplicateAndFilterJobs,
  DeduplicateResult,
  syncCompaniesWithPosts,
} from '../domain/jobLogic';
import {
  ApplicationRecord,
  BusyScheduleMap,
  CanonicalJob,
  CommunityPost,
  CriteriaRatings,
  JobStatus,
  PersistedAppState,
  PostType,
  ProfileCardSnapshot,
  ScamReport,
  ShiftPeriod,
  StudentProfile,
  Weekday,
} from '../domain/types';
import { useAuthMock } from './AuthMockContext';

const STORAGE_KEY = 'svjob_state_v1';

function getUserStorageKey(userId: string): string {
  return `${STORAGE_KEY}:${encodeURIComponent(userId)}`;
}

function createAccountSeedState(user: ReturnType<typeof useAuthMock>['currentUser']) {
  const seed = createSeedState();
  if (!user) {
    return seed;
  }

  const isOriginalDemoAccount = user.id === 'student-1';
  return {
    ...seed,
    profile: {
      ...seed.profile,
      id: user.id,
      fullName: user.fullName,
      university: user.university,
      major: user.major,
      yearLabel: user.yearLabel,
      phone: user.phone,
      email: user.email,
      skills: isOriginalDemoAccount ? seed.profile.skills : [],
      bio: isOriginalDemoAccount ? seed.profile.bio : '',
      reputationPoints: isOriginalDemoAccount ? seed.profile.reputationPoints : 0,
      verifiedStudent: user.verifiedStudent,
    },
  };
}

function applyAccountIdentity(
  state: PersistedAppState,
  user: NonNullable<ReturnType<typeof useAuthMock>['currentUser']>
): PersistedAppState {
  return {
    ...state,
    profile: {
      ...state.profile,
      id: user.id,
      fullName: user.fullName,
      university: user.university,
      major: user.major,
      yearLabel: user.yearLabel,
      phone: user.phone,
      email: user.email,
      verifiedStudent: user.verifiedStudent,
    },
  };
}

function normalizeJobStatus(status: string): JobStatus {
  if (status === 'urgent' || status === 'expiring') {
    return 'urgent';
  }
  return 'new';
}

function isPersistedAppState(value: Partial<PersistedAppState>): value is PersistedAppState {
  return (
    value.schemaVersion === 1 &&
    Boolean(value.profile) &&
    Boolean(value.busySchedule) &&
    Array.isArray(value.companies) &&
    Array.isArray(value.rawJobs) &&
    Array.isArray(value.posts) &&
    Array.isArray(value.threads) &&
    Array.isArray(value.applications) &&
    Array.isArray(value.reports)
  );
}

function mergeSeedCatalog(
  persistedState: PersistedAppState,
  seedState: PersistedAppState
): PersistedAppState {
  const existingCompanyIds = new Set(persistedState.companies.map((company) => company.id));
  const existingJobIds = new Set(persistedState.rawJobs.map((job) => job.id));
  const seedPostsById = new Map(seedState.posts.map((post) => [post.id, post]));
  const existingPostIds = new Set(persistedState.posts.map((post) => post.id));

  const enrichedExistingPosts = persistedState.posts.map((post) => {
    const seedPost = seedPostsById.get(post.id);
    if (!seedPost) {
      return post;
    }
    const mergedRatings =
      post.criteriaRatings && seedPost.criteriaRatings
        ? { ...seedPost.criteriaRatings, ...post.criteriaRatings }
        : post.criteriaRatings;
    return {
      ...post,
      criteriaRatings: mergedRatings,
      evidenceImages:
        post.evidenceImages.length > 0 ? post.evidenceImages : seedPost.evidenceImages,
    };
  });

  const mergedPosts = [
    ...enrichedExistingPosts,
    ...seedState.posts.filter((post) => !existingPostIds.has(post.id)),
  ];

  const seedCompaniesById = new Map(seedState.companies.map((company) => [company.id, company]));
  const normalizedExistingCompanies = persistedState.companies.map((company) => {
    const seedCompany = seedCompaniesById.get(company.id);
    if (!seedCompany) {
      return company;
    }
    return {
      ...company,
      name: seedCompany.name,
      address: seedCompany.address,
      district: seedCompany.district,
      lat: seedCompany.lat,
      lng: seedCompany.lng,
    };
  });

  const mergedCompanies = [
    ...normalizedExistingCompanies,
    ...seedState.companies.filter((company) => !existingCompanyIds.has(company.id)),
  ];

  const validAnchorZoneIds = new Set(ANCHOR_ZONES.map((zone) => zone.id));

  return {
    ...persistedState,
    profile: {
      ...persistedState.profile,
      anchorZoneId: validAnchorZoneIds.has(persistedState.profile.anchorZoneId)
        ? persistedState.profile.anchorZoneId
        : 'zone-bach-khoa-hn',
    },
    companies: syncCompaniesWithPosts(mergedCompanies, mergedPosts),
    rawJobs: [
      ...persistedState.rawJobs.map((job) => ({
        ...job,
        status: normalizeJobStatus(job.status),
      })),
      ...seedState.rawJobs.filter((job) => !existingJobIds.has(job.id)),
    ],
    posts: mergedPosts,
  };
}

function loadInitialState(
  user: ReturnType<typeof useAuthMock>['currentUser'] = null
): PersistedAppState {
  const seedState = createAccountSeedState(user);
  if (typeof window === 'undefined') {
    return seedState;
  }

  try {
    const userStorageKey = user ? getUserStorageKey(user.id) : STORAGE_KEY;
    const storedUserState = window.localStorage.getItem(userStorageKey);
    const isLegacyDemoState = !storedUserState && user?.id === 'student-1';
    const raw =
      storedUserState ?? (isLegacyDemoState ? window.localStorage.getItem(STORAGE_KEY) : null);
    if (!raw) {
      return seedState;
    }
    const parsed = JSON.parse(raw) as Partial<PersistedAppState>;
    if (isPersistedAppState(parsed)) {
      const mergedState = mergeSeedCatalog(parsed, seedState);
      return user && isLegacyDemoState ? applyAccountIdentity(mergedState, user) : mergedState;
    }
  } catch {
    // Fallback to clean seed data if localStorage is corrupted.
  }
  return seedState;
}

export interface CreatePostInput {
  type: PostType;
  companyId?: string;
  title: string;
  content: string;
  verifiedWorker?: boolean;
  criteriaRatings?: CriteriaRatings;
  evidenceImages?: string[];
}

export interface ShareTrustedJobInput {
  companyId?: string;
  newCompanyName?: string;
  address: string;
  district: string;
  lat: number;
  lng: number;
  title: string;
  hourlyWageVnd: number;
  payCycle: string;
  shiftPeriods: ShiftPeriod[];
  sourceName: string;
  description: string;
}

export interface SubmitApplicationInput {
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
}

export interface OpenThreadInput {
  peerId: string;
  peerName: string;
  peerRoleLabel: string;
  peerHasReviewed: boolean;
  contextPostId?: string;
  contextCompanyId?: string;
}

export interface AppStateContextValue {
  state: PersistedAppState;
  derived: {
    canonicalJobs: CanonicalJob[];
    dedupeStats: Omit<DeduplicateResult, 'jobs'>;
    unreadMessagesCount: number;
    lastRealtimeSyncAt: string;
  };
  actions: {
    setAnchorZone: (zoneId: string) => void;
    simulateRealtimeTick: () => void;
    updateProfile: (patch: Partial<StudentProfile>) => void;
    toggleBusySlot: (day: Weekday, hour: number) => void;
    applyBusySchedule: (nextMap: BusyScheduleMap) => void;
    submitApplication: (input: SubmitApplicationInput) => ApplicationRecord;
    createCommunityPost: (input: CreatePostInput) => CommunityPost;
    shareTrustedJob: (input: ShareTrustedJobInput) => CanonicalJob;
    addPostComment: (postId: string, content: string) => void;
    toggleHelpfulPost: (postId: string) => void;
    openOrCreateThread: (input: OpenThreadInput) => string;
    sendChatMessage: (
      threadId: string,
      opts: { text: string; includeProfileCard?: boolean }
    ) => void;
    markThreadRead: (threadId: string) => void;
    submitScamReport: (input: Omit<ScamReport, 'id' | 'createdAt'>) => void;
    resetDemoData: () => void;
  };
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

const PERIOD_TO_SHIFT: Record<
  ShiftPeriod,
  { label: string; days: Weekday[]; startHour: number; endHour: number }
> = {
  morning: {
    label: 'Ca Sáng T2-T4-T6 (08:00 - 12:00)',
    days: ['mon', 'wed', 'fri'],
    startHour: 8,
    endHour: 12,
  },
  afternoon: {
    label: 'Ca Chiều T3-T5 (13:30 - 17:30)',
    days: ['tue', 'thu'],
    startHour: 14,
    endHour: 18,
  },
  evening: {
    label: 'Ca Tối T2-T4-T6 (18:00 - 22:00)',
    days: ['mon', 'wed', 'fri'],
    startHour: 18,
    endHour: 22,
  },
  weekend: {
    label: 'Ca Cuối tuần T7-CN (08:30 - 12:30)',
    days: ['sat', 'sun'],
    startHour: 9,
    endHour: 13,
  },
};

export function AppStateProvider({
  children,
  user = null,
}: Readonly<{
  children: React.ReactNode;
  user?: ReturnType<typeof useAuthMock>['currentUser'];
}>) {
  const [state, setState] = useState<PersistedAppState>(() => loadInitialState(user));
  const storageKey = user ? getUserStorageKey(user.id) : STORAGE_KEY;
  const [lastRealtimeSyncAt, setLastRealtimeSyncAt] = useState<string>(() =>
    new Date().toISOString()
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Ignore quota errors in restricted browser environments.
    }
  }, [state, storageKey]);

  const dedupeResult = useMemo(() => deduplicateAndFilterJobs(state.rawJobs), [state.rawJobs]);

  const unreadMessagesCount = useMemo(
    () => state.threads.reduce((sum, t) => sum + t.unreadCount, 0),
    [state.threads]
  );

  const setAnchorZone = useCallback((zoneId: string) => {
    setState((prev) => ({
      ...prev,
      profile: { ...prev.profile, anchorZoneId: zoneId },
    }));
  }, []);

  const simulateRealtimeTick = useCallback(() => {
    const nowIso = new Date().toISOString();
    setState((prev) => {
      const nextRaw = prev.rawJobs.map((job, idx) =>
        idx === 0
          ? {
              ...job,
              status: job.status === 'new' ? ('urgent' as const) : ('new' as const),
              updatedAt: nowIso,
            }
          : job
      );
      return { ...prev, rawJobs: nextRaw };
    });
    setLastRealtimeSyncAt(nowIso);
    notifications.show({
      title: 'Đã đồng bộ dữ liệu thời gian thực',
      message: 'Trạng thái ghim tuyển dụng và danh sách tin hết hạn vừa được cập nhật.',
      color: 'success',
    });
  }, []);

  const updateProfile = useCallback((patch: Partial<StudentProfile>) => {
    setState((prev) => ({
      ...prev,
      profile: { ...prev.profile, ...patch },
    }));
  }, []);

  const toggleBusySlot = useCallback((day: Weekday, hour: number) => {
    setState((prev) => {
      const current = prev.busySchedule[day] ?? [];
      const exists = current.includes(hour);
      const updated = exists
        ? current.filter((h) => h !== hour)
        : [...current, hour].sort((a, b) => a - b);
      return {
        ...prev,
        busySchedule: { ...prev.busySchedule, [day]: updated },
      };
    });
  }, []);

  const applyBusySchedule = useCallback((nextMap: BusyScheduleMap) => {
    setState((prev) => ({ ...prev, busySchedule: nextMap }));
  }, []);

  const submitApplication = useCallback((input: SubmitApplicationInput): ApplicationRecord => {
    const record: ApplicationRecord = {
      ...input,
      id: `app-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      status: 'submitted',
    };
    setState((prev) => ({
      ...prev,
      applications: [record, ...prev.applications],
    }));
    notifications.show({
      title: 'Nộp hồ sơ ứng tuyển thành công',
      message: `Đã gửi đơn ứng tuyển vị trí ${input.jobTitle}. Bạn có thể theo dõi tại Lịch sử hoạt động.`,
      color: 'success',
    });
    return record;
  }, []);

  const createCommunityPost = useCallback(
    (input: CreatePostInput): CommunityPost => {
      const post: CommunityPost = {
        id: `post-${Date.now()}`,
        type: input.type,
        companyId: input.companyId,
        authorId: state.profile.id,
        authorName: state.profile.fullName,
        authorUniversity: state.profile.university,
        verifiedWorker: Boolean(input.verifiedWorker),
        title: input.title,
        content: input.content,
        criteriaRatings: input.criteriaRatings,
        evidenceImages: input.evidenceImages ?? [],
        helpfulCount: 0,
        createdAt: new Date().toISOString(),
        comments: [],
      };

      setState((prev) => {
        const nextPosts = [post, ...prev.posts];
        return {
          ...prev,
          companies: syncCompaniesWithPosts(prev.companies, nextPosts),
          posts: nextPosts,
          profile: {
            ...prev.profile,
            reputationPoints: prev.profile.reputationPoints + (input.type === 'review' ? 10 : 5),
          },
        };
      });

      notifications.show({
        title: 'Đã đăng bài lên cộng đồng',
        message: 'Đóng góp của bạn giúp các sinh viên khác tìm việc an toàn hơn (+điểm uy tín).',
        color: 'brand',
      });
      return post;
    },
    [state.profile.fullName, state.profile.id, state.profile.university]
  );

  const shareTrustedJob = useCallback((input: ShareTrustedJobInput): CanonicalJob => {
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const expiresIso = new Date(now + 14 * 24 * 3_600_000).toISOString();
    const shouldCreateCompany = !input.companyId;
    const resolvedCompanyId = input.companyId || `comp-shared-${now}`;
    const newJobId = `job-shared-${now}`;

    const shifts = input.shiftPeriods.map((period, index) => ({
      id: `sh-shared-${now}-${index}`,
      period,
      ...PERIOD_TO_SHIFT[period],
    }));

    const newRawJob = {
      id: newJobId,
      dedupeKey: `shared-${(input.companyId || input.newCompanyName || input.title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}`,
      companyId: resolvedCompanyId,
      title: input.title,
      hourlyWageVnd: input.hourlyWageVnd,
      payCycle: input.payCycle,
      shifts,
      description: input.description,
      contractTerms: {
        hasWrittenContract: true,
        depositRequired: false,
        holdIdCard: false,
        probationNote: 'Tin uy tín do sinh viên trong cộng đồng chia sẻ và xác minh.',
      },
      sourceName: input.sourceName || 'Sinh viên chia sẻ',
      status: 'new' as const,
      postedAt: nowIso,
      updatedAt: nowIso,
      expiresAt: expiresIso,
      editHistory: [{ at: nowIso, note: 'Chia sẻ tin uy tín từ cửa sổ CS-02.' }],
    };

    setState((prev) => {
      const nextCompanies = shouldCreateCompany
        ? [
            ...prev.companies,
            {
              id: resolvedCompanyId,
              name: input.newCompanyName || 'Cơ sở do sinh viên giới thiệu',
              category: 'Cộng đồng giới thiệu',
              address: input.address,
              district: input.district,
              lat: input.lat,
              lng: input.lng,
              trustScore: 4.5,
              reviewCount: 1,
              mapVerified: true,
              businessLicenseCode: null,
              businessLicenseVerified: false,
              warningFlag: null,
              photos: [],
            },
          ]
        : prev.companies;

      return {
        ...prev,
        companies: nextCompanies,
        rawJobs: [newRawJob, ...prev.rawJobs],
        profile: {
          ...prev.profile,
          reputationPoints: prev.profile.reputationPoints + 15,
        },
      };
    });

    notifications.show({
      title: 'Đã chia sẻ tin tuyển dụng lên Bản đồ',
      message: 'Tin đã được đưa qua bộ khử trùng lặp và gắn ghim mới trên MH-01 (+15 điểm uy tín).',
      color: 'success',
    });

    return {
      ...newRawJob,
      mergedSources: [newRawJob.sourceName],
      duplicateCount: 1,
    };
  }, []);

  const addPostComment = useCallback((postId: string, content: string) => {
    const trimmed = content.trim();
    if (!trimmed) {
      return;
    }
    setState((prev) => ({
      ...prev,
      posts: prev.posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: [
                ...post.comments,
                {
                  id: `cmt-${Date.now()}`,
                  authorName: prev.profile.fullName,
                  authorUniversity: prev.profile.university,
                  content: trimmed,
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : post
      ),
    }));
  }, []);

  const toggleHelpfulPost = useCallback((postId: string) => {
    setState((prev) => ({
      ...prev,
      posts: prev.posts.map((post) => {
        if (post.id !== postId) {
          return post;
        }
        const nextFlag = !post.helpfulByMe;
        return {
          ...post,
          helpfulByMe: nextFlag,
          helpfulCount: post.helpfulCount + (nextFlag ? 1 : -1),
        };
      }),
    }));
  }, []);

  const openOrCreateThread = useCallback(
    (input: OpenThreadInput): string => {
      const existing = state.threads.find(
        (t) =>
          t.peerId === input.peerId &&
          (!input.contextPostId || t.contextPostId === input.contextPostId)
      );
      if (existing) {
        return existing.id;
      }
      const newId = `thread-${Date.now()}`;
      setState((prev) => ({
        ...prev,
        threads: [
          {
            id: newId,
            peerId: input.peerId,
            peerName: input.peerName,
            peerRoleLabel: input.peerRoleLabel,
            peerHasReviewed: input.peerHasReviewed,
            contextPostId: input.contextPostId,
            contextCompanyId: input.contextCompanyId,
            unreadCount: 0,
            messages: [],
          },
          ...prev.threads,
        ],
      }));
      return newId;
    },
    [state.threads]
  );

  const sendChatMessage = useCallback(
    (threadId: string, opts: { text: string; includeProfileCard?: boolean }) => {
      const trimmed = opts.text.trim();
      if (!trimmed && !opts.includeProfileCard) {
        return;
      }
      setState((prev) => {
        const snapshot: ProfileCardSnapshot | undefined = opts.includeProfileCard
          ? {
              fullName: prev.profile.fullName,
              university: prev.profile.university,
              major: prev.profile.major,
              yearLabel: prev.profile.yearLabel,
              skills: prev.profile.skills,
              reputationPoints: prev.profile.reputationPoints,
            }
          : undefined;

        return {
          ...prev,
          threads: prev.threads.map((t) =>
            t.id === threadId
              ? {
                  ...t,
                  unreadCount: 0,
                  messages: [
                    ...t.messages,
                    {
                      id: `msg-${Date.now()}`,
                      sender: 'me',
                      text: trimmed || 'Mình gửi thẻ hồ sơ cá nhân để tiện trao đổi nhé!',
                      sentAt: new Date().toISOString(),
                      profileCard: snapshot,
                    },
                  ],
                }
              : t
          ),
        };
      });
    },
    []
  );

  const markThreadRead = useCallback((threadId: string) => {
    setState((prev) => ({
      ...prev,
      threads: prev.threads.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t)),
    }));
  }, []);

  const submitScamReport = useCallback((input: Omit<ScamReport, 'id' | 'createdAt'>) => {
    const report: ScamReport = {
      ...input,
      id: `rep-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      reports: [report, ...prev.reports],
      companies: prev.companies.map((c) =>
        c.id === input.companyId
          ? {
              ...c,
              warningFlag:
                c.warningFlag ||
                `Có báo cáo mới từ sinh viên: ${input.reasons.join(', ')}. Ban quản trị đang xác minh.`,
            }
          : c
      ),
      profile: {
        ...prev.profile,
        reputationPoints: prev.profile.reputationPoints + 5,
      },
    }));
    notifications.show({
      title: 'Đã gửi báo cáo vi phạm',
      message: 'Cảm ơn bạn đã bảo vệ cộng đồng sinh viên (+5 điểm uy tín).',
      color: 'warning',
    });
  }, []);

  const resetDemoData = useCallback(() => {
    const fresh = createAccountSeedState(user);
    setState(fresh);
    notifications.show({
      title: 'Đã khôi phục dữ liệu mẫu',
      message: 'Toàn bộ bản đồ, hồ sơ, lịch rảnh và hội thoại đã về trạng thái ban đầu.',
      color: 'brand',
    });
  }, [user]);

  const value: AppStateContextValue = useMemo(
    () => ({
      state,
      derived: {
        canonicalJobs: dedupeResult.jobs,
        dedupeStats: {
          expiredHiddenCount: dedupeResult.expiredHiddenCount,
          mergedDuplicatesCount: dedupeResult.mergedDuplicatesCount,
        },
        unreadMessagesCount,
        lastRealtimeSyncAt,
      },
      actions: {
        setAnchorZone,
        simulateRealtimeTick,
        updateProfile,
        toggleBusySlot,
        applyBusySchedule,
        submitApplication,
        createCommunityPost,
        shareTrustedJob,
        addPostComment,
        toggleHelpfulPost,
        openOrCreateThread,
        sendChatMessage,
        markThreadRead,
        submitScamReport,
        resetDemoData,
      },
    }),
    [
      state,
      dedupeResult,
      unreadMessagesCount,
      lastRealtimeSyncAt,
      setAnchorZone,
      simulateRealtimeTick,
      updateProfile,
      toggleBusySlot,
      applyBusySchedule,
      submitApplication,
      createCommunityPost,
      shareTrustedJob,
      addPostComment,
      toggleHelpfulPost,
      openOrCreateThread,
      sendChatMessage,
      markThreadRead,
      submitScamReport,
      resetDemoData,
    ]
  );

  return <AppStateContext value={value}>{children}</AppStateContext>;
}

export function UserScopedAppStateProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const { currentUser } = useAuthMock();

  return (
    <AppStateProvider key={currentUser?.id ?? 'guest'} user={currentUser}>
      {children}
    </AppStateProvider>
  );
}

export function useAppState(): AppStateContextValue {
  const ctx = use(AppStateContext);
  if (!ctx) {
    throw new Error('useAppState must be used inside AppStateProvider');
  }
  return ctx;
}
