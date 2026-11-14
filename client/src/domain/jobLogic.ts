import {
  BusyScheduleMap,
  CanonicalJob,
  HOUR_SLOTS,
  JobShift,
  JobStatus,
  RawJobListing,
  WEEKDAYS,
  Weekday,
} from './types';

export interface DeduplicateResult {
  jobs: CanonicalJob[];
  expiredHiddenCount: number;
  mergedDuplicatesCount: number;
}

export const JOB_STATUS_META: Record<JobStatus, { label: string; color: string }> = {
  new: { label: 'Mới đăng', color: 'brand' },
  urgent: { label: 'Tuyển gấp', color: 'amber' },
  updated: { label: 'Đã cập nhật', color: 'teal' },
  expiring: { label: 'Sắp hết hạn', color: 'red' },
};

const WEEKDAY_LABEL_MAP = Object.fromEntries(WEEKDAYS.map((d) => [d.key, d.shortLabel])) as Record<
  Weekday,
  string
>;

/**
 * Hides expired listings and merges duplicate job listings gathered from multiple sources.
 */
export function deduplicateAndFilterJobs(
  rawJobs: RawJobListing[],
  nowMs: number = Date.now()
): DeduplicateResult {
  let expiredHiddenCount = 0;
  let mergedDuplicatesCount = 0;
  const groups = new Map<string, RawJobListing[]>();

  for (const job of rawJobs) {
    const expiresMs = Date.parse(job.expiresAt);
    if (!Number.isNaN(expiresMs) && expiresMs <= nowMs) {
      expiredHiddenCount += 1;
      continue;
    }
    const existing = groups.get(job.dedupeKey);
    if (existing) {
      existing.push(job);
    } else {
      groups.set(job.dedupeKey, [job]);
    }
  }

  const jobs: CanonicalJob[] = [];

  for (const list of groups.values()) {
    list.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    const primary = list[0];
    const mergedSources = Array.from(new Set(list.map((item) => item.sourceName)));
    const duplicateCount = list.length;
    if (duplicateCount > 1) {
      mergedDuplicatesCount += duplicateCount - 1;
    }
    jobs.push({
      ...primary,
      mergedSources,
      duplicateCount,
    });
  }

  return { jobs, expiredHiddenCount, mergedDuplicatesCount };
}

export interface ShiftMatchDetail {
  shift: JobShift;
  fitsSchedule: boolean;
  conflicts: string[];
}

export interface JobScheduleMatch {
  shiftDetails: ShiftMatchDetail[];
  matchingCount: number;
  totalCount: number;
  matchPercent: number;
  isMatch: boolean;
}

export function computeJobScheduleMatch(
  shifts: JobShift[],
  busyMap: BusyScheduleMap
): JobScheduleMatch {
  const shiftDetails: ShiftMatchDetail[] = shifts.map((shift) => {
    const conflicts: string[] = [];
    for (const day of shift.days) {
      const busyHours = busyMap[day] ?? [];
      for (let h = shift.startHour; h < shift.endHour; h += 1) {
        if (busyHours.includes(h)) {
          conflicts.push(`${WEEKDAY_LABEL_MAP[day]} ${String(h).padStart(2, '0')}:00`);
        }
      }
    }
    return {
      shift,
      fitsSchedule: conflicts.length === 0,
      conflicts,
    };
  });

  const matchingCount = shiftDetails.filter((d) => d.fitsSchedule).length;
  const totalCount = shifts.length;
  const matchPercent = totalCount > 0 ? Math.round((matchingCount / totalCount) * 100) : 0;

  return {
    shiftDetails,
    matchingCount,
    totalCount,
    matchPercent,
    isMatch: matchingCount > 0,
  };
}

export function computeFreeSummary(busyMap: BusyScheduleMap): {
  totalBusyHours: number;
  totalFreeHours: number;
  freeBlocksByDay: { dayLabel: string; ranges: string[] }[];
} {
  let totalBusyHours = 0;
  const freeBlocksByDay: { dayLabel: string; ranges: string[] }[] = [];

  for (const day of WEEKDAYS) {
    const busy = new Set(busyMap[day.key] ?? []);
    totalBusyHours += busy.size;

    const ranges: string[] = [];
    let rangeStart: number | null = null;

    for (const h of HOUR_SLOTS) {
      if (!busy.has(h)) {
        if (rangeStart === null) {
          rangeStart = h;
        }
      } else if (rangeStart !== null) {
        if (h - rangeStart >= 3) {
          ranges.push(`${String(rangeStart).padStart(2, '0')}h-${String(h).padStart(2, '0')}h`);
        }
        rangeStart = null;
      }
    }
    if (rangeStart !== null && HOUR_SLOTS[HOUR_SLOTS.length - 1] + 1 - rangeStart >= 3) {
      ranges.push(`${String(rangeStart).padStart(2, '0')}h-22h`);
    }

    if (ranges.length > 0) {
      freeBlocksByDay.push({ dayLabel: day.shortLabel, ranges });
    }
  }

  const totalSlots = WEEKDAYS.length * HOUR_SLOTS.length;
  return {
    totalBusyHours,
    totalFreeHours: totalSlots - totalBusyHours,
    freeBlocksByDay,
  };
}

export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatVnd(amount: number): string {
  return `${amount.toLocaleString('vi-VN')}đ`;
}
