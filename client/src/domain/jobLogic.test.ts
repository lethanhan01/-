import { createSeedState } from '../data/seedData';
import { computeJobScheduleMatch, deduplicateAndFilterJobs, haversineDistanceKm } from './jobLogic';

describe('jobLogic', () => {
  it('hides expired jobs and merges duplicate sources by dedupeKey', () => {
    const now = Date.now();
    const seed = createSeedState(now);
    const result = deduplicateAndFilterJobs(seed.rawJobs, now);

    // Seed has 20 raw jobs: 1 expired, 2 duplicate pairs (Highlands & Circle K) => 17 canonical jobs
    expect(result.expiredHiddenCount).toBe(1);
    expect(result.mergedDuplicatesCount).toBe(2);
    expect(result.jobs).toHaveLength(17);

    const highlands = result.jobs.find((j) => j.dedupeKey === 'highlands-nvh-barista');
    expect(highlands).toBeDefined();
    expect(highlands?.duplicateCount).toBe(2);
    expect(highlands?.mergedSources).toContain('Fanpage Chính thức Highlands');
    expect(highlands?.mergedSources).toContain('Facebook Group Việc làm ĐHQG');
  });

  it('computes schedule match and detects conflicts accurately', () => {
    const now = Date.now();
    const seed = createSeedState(now);
    const highlands = seed.rawJobs.find((j) => j.id === 'job-highlands-1')!;
    const match = computeJobScheduleMatch(highlands.shifts, seed.busySchedule);

    // Highlands shifts: evening (fits), weekend (fits), morning T2-T4 (conflicts with mon/wed 7-10)
    expect(match.totalCount).toBe(3);
    expect(match.matchingCount).toBe(2);
    expect(match.isMatch).toBe(true);
    expect(match.shiftDetails[2].fitsSchedule).toBe(false);
    expect(match.shiftDetails[2].conflicts.length).toBeGreaterThan(0);
  });

  it('calculates haversine distance in km', () => {
    const km = haversineDistanceKm(10.87, 106.8031, 10.8752, 106.8007);
    expect(km).toBeGreaterThan(0.3);
    expect(km).toBeLessThan(1.5);
  });
});
