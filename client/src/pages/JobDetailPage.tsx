import { useMemo, useState } from 'react';
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconBuildingStore,
  IconCheck,
  IconClock,
  IconEdit,
  IconFlag,
  IconHistory,
  IconMapPin,
  IconMessagePlus,
  IconPlayerPlay,
  IconSend,
  IconShieldCheck,
  IconStarFilled,
} from '@tabler/icons-react';
import { Link, useParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Image,
  List,
  Modal,
  Paper,
  Progress,
  Rating,
  SimpleGrid,
  Stack,
  Text,
  Timeline,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { PostComposerModal } from '../components/Modals/PostComposerModal';
import { ReportModal } from '../components/Modals/ReportModal';
import { TrustBadge } from '../components/TrustBadge/TrustBadge';
import { PHOTO_FALLBACK } from '../data/seedData';
import {
  CompanyRatingStats,
  computeCompanyRatingStats,
  computeJobScheduleMatch,
  computePostOverallRating,
  CRITERIA_RATING_ITEMS,
  formatVnd,
  JOB_STATUS_META,
  JobScheduleMatch,
} from '../domain/jobLogic';
import {
  ApplicationRecord,
  CanonicalJob,
  CommunityPost,
  Company,
  PostType,
  RawJobListing,
} from '../domain/types';
import { useAppState } from '../state/AppStateContext';
import classes from './JobDetailPage.module.css';

const POST_TYPE_META: Record<PostType, { label: string; color: string }> = {
  warning: { label: 'Cảnh báo', color: 'danger' },
  review: { label: 'Đánh giá', color: 'success' },
  question: { label: 'Hỏi đáp', color: 'brand' },
};

function JobOverviewCard({
  job,
  company,
  scheduleMatch,
}: Readonly<{
  job: CanonicalJob | RawJobListing;
  company: Company;
  scheduleMatch: JobScheduleMatch | null;
}>) {
  return (
    <Card p="md">
      <Stack gap="sm">
        <Title order={1} size="h2">
          {job.title}
        </Title>
        <Group gap="xs" align="center">
          <IconBuildingStore size={17} />
          <Text fw={600} c="brand">
            {company.name}
          </Text>
        </Group>

        <Group gap="md" wrap="wrap">
          <Badge size="lg" color="success" className="app-tabular">
            {formatVnd(job.hourlyWageVnd)}/giờ
          </Badge>
          <Text size="sm" c="dimmed">
            {job.payCycle}
          </Text>
        </Group>

        <Group gap="xs">
          <IconMapPin size={16} />
          <Text size="sm">{company.address}</Text>
        </Group>

        <Divider />

        <Title order={2} size="h4">
          Mô tả
        </Title>
        <Text size="sm">{job.description}</Text>

        <Title order={2} size="h4" mt="xs">
          Ca làm việc
        </Title>
        <Stack gap="xs">
          {scheduleMatch?.shiftDetails.map(({ shift, fitsSchedule, conflicts }) => (
            <Card key={shift.id} p="xs" bg="var(--app-bg-subtle)">
              <Group justify="space-between" wrap="wrap">
                <Group gap="xs">
                  <IconClock size={15} />
                  <Text size="sm" fw={600}>
                    {shift.label}
                  </Text>
                </Group>
                {fitsSchedule ? (
                  <Badge color="success" leftSection={<IconCheck size={12} />}>
                    Khớp lịch rảnh
                  </Badge>
                ) : (
                  <Badge color="danger">Trùng TKB: {conflicts.slice(0, 2).join(', ')}</Badge>
                )}
              </Group>
            </Card>
          ))}
        </Stack>

        <Title order={2} size="h4" mt="xs">
          Tính minh bạch
        </Title>
        <List size="sm" spacing="xs">
          <List.Item>
            Hợp đồng lao động / CTV bằng văn bản:{' '}
            <Text span fw={700} c={job.contractTerms.hasWrittenContract ? 'success' : 'warning'}>
              {job.contractTerms.hasWrittenContract ? 'Có ký rõ ràng' : 'Thỏa thuận miệng'}
            </Text>
          </List.Item>
          <List.Item>
            Yêu cầu đặt cọc / đóng phí:{' '}
            <Text span fw={700} c={job.contractTerms.depositRequired ? 'danger' : 'success'}>
              {job.contractTerms.depositRequired ? 'Có yêu cầu (Rủi ro cao)' : 'Không'}
            </Text>
          </List.Item>
          <List.Item>
            Giữ CCCD / giấy tờ gốc:{' '}
            <Text span fw={700} c={job.contractTerms.holdIdCard ? 'danger' : 'success'}>
              {job.contractTerms.holdIdCard ? 'Có giữ giấy tờ' : 'Không'}
            </Text>
          </List.Item>
          <List.Item>Thử việc & quyền lợi: {job.contractTerms.probationNote}</List.Item>
        </List>
      </Stack>
    </Card>
  );
}

function WorkplaceMediaCard({
  company,
  onOpenVideo,
}: Readonly<{
  company: Company;
  onOpenVideo: () => void;
}>) {
  const hasMedia = company.photos.length > 0 || Boolean(company.videoPreview);
  return (
    <Card p="md">
      <Stack gap="sm">
        <Title order={2} size="h4">
          Hình ảnh thực tế
        </Title>
        {hasMedia ? (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            {company.photos.map((photo) => (
              <Stack key={photo.id} gap={4}>
                <Image
                  src={photo.url}
                  fallbackSrc={PHOTO_FALLBACK}
                  h={170}
                  radius="md"
                  fit="cover"
                  alt={photo.caption}
                />
                <Text size="xs" c="dimmed">
                  {photo.caption}
                </Text>
              </Stack>
            ))}
            {company.videoPreview ? (
              <UnstyledButton onClick={onOpenVideo} className={classes.interactiveButton}>
                <Card p="xs" className={classes.interactiveCard}>
                  <Stack gap={6}>
                    <Image
                      src={company.videoPreview.thumbnailUrl}
                      fallbackSrc={PHOTO_FALLBACK}
                      h={130}
                      radius="sm"
                      fit="cover"
                      alt={company.videoPreview.title}
                    />
                    <Group justify="space-between">
                      <Badge color="brand" leftSection={<IconPlayerPlay size={12} />}>
                        Video thực tế • {company.videoPreview.durationLabel}
                      </Badge>
                    </Group>
                    <Text size="xs" fw={600}>
                      {company.videoPreview.title}
                    </Text>
                  </Stack>
                </Card>
              </UnstyledButton>
            ) : null}
          </SimpleGrid>
        ) : (
          <Text size="sm" c="dimmed">
            Cơ sở chưa có hình ảnh thực tế được xác minh từ cộng đồng sinh viên.
          </Text>
        )}
      </Stack>
    </Card>
  );
}

type RatingFilterValue = 'all' | 'with-images' | '5' | '4' | '3' | '2' | '1';

function CompanyRatingSummaryCard({
  company,
  stats,
  onWriteReview,
  onZoomImage,
}: Readonly<{
  company: Company;
  stats: CompanyRatingStats;
  onWriteReview: () => void;
  onZoomImage: (url: string) => void;
}>) {
  const [filter, setFilter] = useState<RatingFilterValue>('all');

  const withImagesCount = useMemo(
    () => stats.reviewPosts.filter((post) => post.evidenceImages.length > 0).length,
    [stats.reviewPosts]
  );

  const filteredReviews = useMemo(() => {
    if (filter === 'all') {
      return stats.reviewPosts;
    }
    if (filter === 'with-images') {
      return stats.reviewPosts.filter((post) => post.evidenceImages.length > 0);
    }
    const targetStar = Number(filter);
    return stats.reviewPosts.filter((post) => {
      if (!post.criteriaRatings) {
        return false;
      }
      const bucket = Math.min(
        5,
        Math.max(1, Math.round(computePostOverallRating(post.criteriaRatings)))
      );
      return bucket === targetStar;
    });
  }, [filter, stats.reviewPosts]);

  return (
    <Card component="section" aria-label="Đánh giá sao từ cộng đồng" p="md">
      <Stack gap="md">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Group gap="xs">
            <IconStarFilled size={18} />
            <Title order={2} size="h4">
              Đánh giá
            </Title>
          </Group>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconMessagePlus size={14} />}
            onClick={onWriteReview}
          >
            Viết đánh giá công ty
          </Button>
        </Group>

        {stats.reviewCount === 0 ? (
          <Paper withBorder p="md" bg="var(--app-bg-subtle)">
            <Stack gap="xs" align="flex-start">
              <Text size="sm" c="dimmed">
                Chưa có bài đánh giá sao nào từ sinh viên cho {company.name}. Hãy là người đầu tiên
                chia sẻ trải nghiệm thực tế!
              </Text>
              <Button size="xs" onClick={onWriteReview}>
                Đánh giá ngay
              </Button>
            </Stack>
          </Paper>
        ) : (
          <>
            <Grid gap="md" align="center">
              <Grid.Col span={{ base: 12, sm: 4 }}>
                <Paper withBorder p="md" bg="var(--app-bg-subtle)">
                  <Stack gap={6} align="center">
                    <Group gap={4} align="baseline">
                      <Text className={`${classes.ratingHeroScore} app-tabular`}>
                        {stats.averageRating.toFixed(1)}
                      </Text>
                      <Text size="sm" c="dimmed">
                        / 5
                      </Text>
                    </Group>
                    <Rating
                      value={stats.averageRating}
                      fractions={2}
                      readOnly
                      size="md"
                      color="warning"
                    />
                    <Text size="xs" c="dimmed" ta="center">
                      Tổng hợp từ {stats.reviewCount} bài đánh giá
                    </Text>
                  </Stack>
                </Paper>
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 8 }}>
                <Stack gap={6}>
                  {stats.distribution.map((row) => (
                    <Group key={row.stars} gap="xs" wrap="nowrap">
                      <Text size="xs" fw={600} w={36} className="app-tabular">
                        {row.stars} ★
                      </Text>
                      <Progress
                        flex={1}
                        value={row.percent}
                        color="warning"
                        size="sm"
                        aria-label={`Tỷ lệ đánh giá ${row.stars} sao`}
                      />
                      <Text size="xs" c="dimmed" w={68} ta="right" className="app-tabular">
                        {row.count} ({row.percent}%)
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </Grid.Col>
            </Grid>

            <Divider />

            <Stack gap="xs">
              <Text size="xs" fw={700} c="dimmed">
                Thống kê trung bình theo 5 tiêu chí
              </Text>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                {stats.criteriaAverages.map((item) => (
                  <Paper key={item.key} withBorder p="xs" bg="var(--app-bg-subtle)">
                    <Group justify="space-between" gap="xs" wrap="nowrap">
                      <Text size="xs" fw={600}>
                        {item.label}
                      </Text>
                      <Group gap={6} wrap="nowrap">
                        <Rating
                          value={item.average}
                          fractions={2}
                          readOnly
                          size="xs"
                          color="warning"
                        />
                        <Text size="xs" fw={700} className="app-tabular">
                          {item.average.toFixed(1)}/5
                        </Text>
                      </Group>
                    </Group>
                  </Paper>
                ))}
              </SimpleGrid>
            </Stack>

            <Divider />

            <Group gap="xs" wrap="wrap">
              <Button
                size="xs"
                variant={filter === 'all' ? 'filled' : 'light'}
                onClick={() => setFilter('all')}
              >
                Tất cả ({stats.reviewCount})
              </Button>
              <Button
                size="xs"
                variant={filter === 'with-images' ? 'filled' : 'light'}
                onClick={() => setFilter('with-images')}
              >
                Có ảnh ({withImagesCount})
              </Button>
              {stats.distribution.map((row) => (
                <Button
                  key={row.stars}
                  size="xs"
                  variant={filter === String(row.stars) ? 'filled' : 'light'}
                  color="warning"
                  onClick={() => setFilter(String(row.stars) as RatingFilterValue)}
                >
                  {row.stars} ★ ({row.count})
                </Button>
              ))}
            </Group>

            {filteredReviews.length === 0 ? (
              <Text size="xs" c="dimmed">
                Không có bài đánh giá nào khớp bộ lọc đang chọn.
              </Text>
            ) : (
              <Stack gap="sm">
                {filteredReviews.map((post) => {
                  const overall = post.criteriaRatings
                    ? computePostOverallRating(post.criteriaRatings)
                    : 0;
                  return (
                    <Paper key={post.id} withBorder p="sm" bg="var(--app-bg-subtle)">
                      <Stack gap="xs">
                        <Group justify="space-between" wrap="wrap" gap="xs">
                          <Group gap="xs">
                            <Avatar size="sm" color="brand" radius="xl">
                              {post.authorName.slice(0, 1)}
                            </Avatar>
                            <Stack gap={0}>
                              <Group gap="xs">
                                <Text size="xs" fw={700}>
                                  {post.authorName}
                                </Text>
                                {post.verifiedWorker ? (
                                  <Badge
                                    size="xs"
                                    color="success"
                                    leftSection={<IconShieldCheck size={10} />}
                                  >
                                    Đã từng làm việc
                                  </Badge>
                                ) : null}
                              </Group>
                              <Text size="xs" c="dimmed">
                                {post.authorUniversity} •{' '}
                                {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                              </Text>
                            </Stack>
                          </Group>

                          <Group gap={6}>
                            <Rating
                              value={overall}
                              fractions={2}
                              readOnly
                              size="xs"
                              color="warning"
                            />
                            <Badge
                              size="sm"
                              color="warning"
                              leftSection={<IconStarFilled size={11} />}
                              className="app-tabular"
                            >
                              {overall.toFixed(1)} / 5
                            </Badge>
                          </Group>
                        </Group>

                        <Text size="sm" fw={700}>
                          {post.title}
                        </Text>
                        <Text size="xs">{post.content}</Text>

                        {post.criteriaRatings ? (
                          <Group gap="xs" wrap="wrap">
                            {CRITERIA_RATING_ITEMS.map(({ key, label }) => {
                              const value = post.criteriaRatings?.[key];
                              return typeof value === 'number' ? (
                                <Badge key={key} size="xs" color="neutral" className="app-tabular">
                                  {label}: {value}★
                                </Badge>
                              ) : null;
                            })}
                          </Group>
                        ) : null}

                        {post.evidenceImages.length > 0 ? (
                          <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs">
                            {post.evidenceImages.map((imgUrl, idx) => (
                              <UnstyledButton
                                key={`${post.id}-img-${idx}`}
                                onClick={() => onZoomImage(imgUrl)}
                                className={classes.evidenceThumbButton}
                                aria-label={`Phóng to ảnh đánh giá ${idx + 1} của ${post.authorName}`}
                              >
                                <Image
                                  src={imgUrl}
                                  fallbackSrc={PHOTO_FALLBACK}
                                  h={90}
                                  radius="sm"
                                  fit="cover"
                                  alt={`Ảnh minh chứng đánh giá ${idx + 1}`}
                                />
                              </UnstyledButton>
                            ))}
                          </SimpleGrid>
                        ) : null}

                        <Group justify="flex-end">
                          <Button
                            component={Link}
                            to={`/community?postId=${post.id}&companyId=${company.id}`}
                            size="xs"
                            variant="subtle"
                          >
                            Xem chi tiết ở Cộng đồng
                          </Button>
                        </Group>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </>
        )}
      </Stack>
    </Card>
  );
}

function CompanySidebarCards({
  jobId,
  company,
  companyPosts,
  existingApplication,
  onWriteReview,
  onOpenReport,
}: Readonly<{
  jobId: string;
  company: Company;
  companyPosts: CommunityPost[];
  existingApplication: ApplicationRecord | undefined;
  onWriteReview: () => void;
  onOpenReport: () => void;
}>) {
  return (
    <Stack gap="md">
      <Card p="md">
        <Stack gap="sm">
          <Group gap="xs">
            <IconShieldCheck size={18} />
            <Title order={2} size="h4">
              Hồ sơ & Độ tin cậy
            </Title>
          </Group>
          <TrustBadge company={company} />
          <Divider />
          <Text size="xs" c="dimmed">
            Ngành nghề: {company.category}
          </Text>
          <Text size="xs" c="dimmed">
            Mã số GPKD: {company.businessLicenseCode ?? 'Chưa cung cấp'}
          </Text>

          <Stack gap="xs" mt="xs">
            {existingApplication ? (
              <Button
                component={Link}
                to="/profile?tab=history"
                color="success"
                leftSection={<IconCheck size={16} />}
              >
                Đã ứng tuyển — Xem lại (MH-02)
              </Button>
            ) : (
              <Button
                component={Link}
                to={`/jobs/${jobId}/apply`}
                leftSection={<IconSend size={16} />}
              >
                Ứng tuyển ngay
              </Button>
            )}

            <Button
              variant="light"
              leftSection={<IconMessagePlus size={16} />}
              onClick={onWriteReview}
            >
              Viết đánh giá công ty
            </Button>

            <Button
              variant="outline"
              color="danger"
              leftSection={<IconFlag size={16} />}
              onClick={onOpenReport}
            >
              Báo cáo lừa đảo
            </Button>
          </Stack>
        </Stack>
      </Card>

      <Card p="md">
        <Stack gap="sm">
          <Group justify="space-between">
            <Title order={2} size="h4">
              Bài viết ({companyPosts.length})
            </Title>
            <Button
              component={Link}
              to={`/community?companyId=${company.id}`}
              size="xs"
              variant="subtle"
            >
              Xem tất cả
            </Button>
          </Group>

          {companyPosts.length === 0 ? (
            <Text size="xs" c="dimmed">
              Chưa có bài viết nào gắn thẻ cơ sở này. Hãy là người đầu tiên đánh giá!
            </Text>
          ) : (
            companyPosts.map((post) => {
              const postMeta = POST_TYPE_META[post.type];
              return (
                <UnstyledButton
                  key={post.id}
                  component={Link}
                  to={`/community?postId=${post.id}&companyId=${company.id}`}
                  className={classes.interactiveButton}
                >
                  <Card p="xs" className={classes.interactiveCard}>
                    <Stack gap={4}>
                      <Group justify="space-between" gap="xs">
                        <Badge size="xs" color={postMeta.color}>
                          {postMeta.label}
                        </Badge>
                        {post.criteriaRatings ? (
                          <Badge
                            size="xs"
                            color="warning"
                            leftSection={<IconStarFilled size={10} />}
                            className="app-tabular"
                          >
                            {computePostOverallRating(post.criteriaRatings).toFixed(1)}
                          </Badge>
                        ) : null}
                      </Group>
                      <Text size="xs" fw={700} lineClamp={2}>
                        {post.title}
                      </Text>
                      <Text size="xs" c="dimmed" lineClamp={2}>
                        {post.content}
                      </Text>
                    </Stack>
                  </Card>
                </UnstyledButton>
              );
            })
          )}
        </Stack>
      </Card>
    </Stack>
  );
}

export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { state, derived } = useAppState();

  const [reportOpened, { open: openReport, close: closeReport }] = useDisclosure(false);
  const [videoOpened, { open: openVideo, close: closeVideo }] = useDisclosure(false);
  const [composerOpened, { open: openComposer, close: closeComposer }] = useDisclosure(false);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  const job = useMemo(
    () =>
      derived.canonicalJobs.find((j) => j.id === jobId) ??
      state.rawJobs.find((j) => j.id === jobId),
    [derived.canonicalJobs, state.rawJobs, jobId]
  );

  const company = useMemo(
    () => state.companies.find((c) => c.id === job?.companyId),
    [state.companies, job?.companyId]
  );

  const scheduleMatch = useMemo(
    () => (job ? computeJobScheduleMatch(job.shifts, state.busySchedule) : null),
    [job, state.busySchedule]
  );

  const companyPosts = useMemo(
    () => state.posts.filter((p) => p.companyId === company?.id),
    [state.posts, company?.id]
  );

  const ratingStats = useMemo(
    () => (company ? computeCompanyRatingStats(company.id, state.posts) : null),
    [company, state.posts]
  );

  const existingApplication = useMemo(
    () => state.applications.find((a) => a.jobId === job?.id),
    [state.applications, job?.id]
  );

  if (!job || !company) {
    return (
      <Card p="xl">
        <Stack gap="sm" align="center">
          <Title order={1} size="h3">
            Không tìm thấy tin tuyển dụng
          </Title>
          <Button component={Link} to="/" leftSection={<IconArrowLeft size={16} />}>
            Bản đồ việc làm
          </Button>
        </Stack>
      </Card>
    );
  }

  const mergedSources: string[] =
    'mergedSources' in job && Array.isArray(job.mergedSources)
      ? job.mergedSources
      : [job.sourceName];

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap">
        <Button component={Link} to="/" variant="subtle" leftSection={<IconArrowLeft size={16} />}>
          Bản đồ
        </Button>

        <Group gap="xs">
          <Badge color={JOB_STATUS_META[job.status].color}>
            {JOB_STATUS_META[job.status].label}
          </Badge>
          {mergedSources.length > 1 ? (
            <Badge color="brand" variant="outline">
              Đã gộp từ: {mergedSources.join(', ')}
            </Badge>
          ) : (
            <Badge color="neutral" variant="outline">
              Nguồn: {mergedSources[0]}
            </Badge>
          )}
        </Group>
      </Group>

      {company.warningFlag ? (
        <Alert
          color="danger"
          variant="filled"
          icon={<IconAlertTriangle size={20} />}
          title="Cảnh báo an toàn từ cộng đồng"
        >
          <Text size="sm">{company.warningFlag}</Text>
        </Alert>
      ) : null}

      <Grid gap="md">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="md">
            <JobOverviewCard job={job} company={company} scheduleMatch={scheduleMatch} />

            <WorkplaceMediaCard company={company} onOpenVideo={openVideo} />

            {ratingStats ? (
              <CompanyRatingSummaryCard
                company={company}
                stats={ratingStats}
                onWriteReview={openComposer}
                onZoomImage={setZoomImageUrl}
              />
            ) : null}

            <Card p="md">
              <Stack gap="sm">
                <Group gap="xs">
                  <IconHistory size={18} />
                  <Title order={2} size="h4">
                    Lịch sử tuyển dụng
                  </Title>
                </Group>
                {job.editHistory.length === 0 ? (
                  <Text size="xs" c="dimmed">
                    Chưa ghi nhận chỉnh sửa kể từ lúc đăng tin.
                  </Text>
                ) : (
                  <Timeline active={job.editHistory.length - 1} bulletSize={20} lineWidth={2}>
                    {job.editHistory.map((entry) => (
                      <Timeline.Item
                        key={`${entry.at}-${entry.note}`}
                        bullet={<IconEdit size={12} />}
                        title={new Date(entry.at).toLocaleString('vi-VN')}
                      >
                        <Text size="xs" c="dimmed">
                          {entry.note}
                        </Text>
                      </Timeline.Item>
                    ))}
                  </Timeline>
                )}
              </Stack>
            </Card>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <CompanySidebarCards
            jobId={job.id}
            company={company}
            companyPosts={companyPosts}
            existingApplication={existingApplication}
            onWriteReview={openComposer}
            onOpenReport={openReport}
          />
        </Grid.Col>
      </Grid>

      <PostComposerModal
        opened={composerOpened}
        onClose={closeComposer}
        prefillCompanyId={company.id}
      />

      <Modal
        opened={Boolean(zoomImageUrl)}
        onClose={() => setZoomImageUrl(null)}
        size="lg"
        title="Ảnh minh chứng thực tế"
      >
        {zoomImageUrl ? (
          <Image src={zoomImageUrl} fallbackSrc={PHOTO_FALLBACK} radius="md" alt="Ảnh phóng to" />
        ) : null}
      </Modal>

      <ReportModal
        opened={reportOpened}
        onClose={closeReport}
        companyId={company.id}
        companyName={company.name}
        jobId={job.id}
      />

      {company.videoPreview ? (
        <Modal
          opened={videoOpened}
          onClose={closeVideo}
          size="lg"
          title={company.videoPreview.title}
        >
          <Stack gap="sm">
            <Image
              src={company.videoPreview.thumbnailUrl}
              fallbackSrc={PHOTO_FALLBACK}
              h={260}
              radius="md"
              fit="cover"
              alt={company.videoPreview.title}
            />
            <Badge color="brand">Thời lượng: {company.videoPreview.durationLabel}</Badge>
            <Text size="sm">{company.videoPreview.summary}</Text>
          </Stack>
        </Modal>
      ) : null}
    </Stack>
  );
}
