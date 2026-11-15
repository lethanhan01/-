import { createSeedState } from "../data/seedData";
import {
  computeCompanyRatingStats,
  computeJobScheduleMatch,
  computePostOverallRating,
  deduplicateAndFilterJobs,
  haversineDistanceKm,
  syncCompaniesWithPosts,
} from "./jobLogic";

describe("jobLogic", () => {
  it("hides expired jobs and merges duplicate sources by dedupeKey", () => {
    const now = Date.now();
    const seed = createSeedState(now);
    const result = deduplicateAndFilterJobs(seed.rawJobs, now);

    // Seed has 20 raw jobs: 1 expired, 2 duplicate pairs (Highlands & Circle K) => 17 canonical jobs
    expect(result.expiredHiddenCount).toBe(1);
    expect(result.mergedDuplicatesCount).toBe(2);
    expect(result.jobs).toHaveLength(17);

    const highlands = result.jobs.find(
      (j) => j.dedupeKey === "highlands-nvh-barista",
    );
    expect(highlands).toBeDefined();
    expect(highlands?.duplicateCount).toBe(2);
    expect(highlands?.mergedSources).toContain("Fanpage Chính thức Highlands");
    expect(highlands?.mergedSources).toContain("Facebook Group Việc làm ĐHQG");
  });

  it("computes schedule match and detects conflicts accurately", () => {
    const now = Date.now();
    const seed = createSeedState(now);
    const highlands = seed.rawJobs.find((j) => j.id === "job-highlands-1")!;
    const match = computeJobScheduleMatch(highlands.shifts, seed.busySchedule);

    // Highlands shifts: evening (fits), weekend (fits), morning T2-T4 (conflicts with mon/wed 7-10)
    expect(match.totalCount).toBe(3);
    expect(match.matchingCount).toBe(2);
    expect(match.isMatch).toBe(true);
    expect(match.shiftDetails[2].fitsSchedule).toBe(false);
    expect(match.shiftDetails[2].conflicts.length).toBeGreaterThan(0);
  });

  it("calculates haversine distance in km", () => {
    const km = haversineDistanceKm(10.87, 106.8031, 10.8752, 106.8007);
    expect(km).toBeGreaterThan(0.3);
    expect(km).toBeLessThan(1.5);
  });

  it("computes overall post rating and company rating breakdown from posts", () => {
    const seed = createSeedState();

    expect(
      computePostOverallRating({
        salaryTransparency: 5,
        environment: 4,
        scheduleFlexibility: 5,
        benefits: 4,
        jobQuality: 5,
      }),
    ).toBe(4.6);

    const coopStats = computeCompanyRatingStats("comp-coopxtra", seed.posts);
    expect(coopStats.reviewCount).toBe(3);
    expect(coopStats.averageRating).toBe(4.4);
    expect(coopStats.distribution.map((d) => [d.stars, d.count])).toEqual([
      [5, 2],
      [4, 1],
      [3, 0],
      [2, 0],
      [1, 0],
    ]);
    expect(coopStats.criteriaAverages).toHaveLength(5);

    const syncedCoop = syncCompaniesWithPosts(seed.companies, seed.posts).find(
      (c) => c.id === "comp-coopxtra",
    );
    expect(syncedCoop?.trustScore).toBe(4.4);
    expect(syncedCoop?.reviewCount).toBe(3);
  });
});
