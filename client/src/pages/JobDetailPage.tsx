import { useMemo } from 'react';
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
} from '@tabler/icons-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Image,
  List,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Timeline,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { ReportModal } from '../components/Modals/ReportModal';
import { TrustBadge } from '../components/TrustBadge/TrustBadge';
import { PHOTO_FALLBACK } from '../data/seedData';
import {
  computeJobScheduleMatch,
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
}: {
  job: CanonicalJob | RawJobListing;
  company: Company;
  scheduleMatch: JobScheduleMatch | null;
}) {
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
          Mô tả nhiệm vụ
        </Title>
        <Text size="sm">{job.description}</Text>

        <Title order={2} size="h4" mt="xs">
          Ca làm việc & Đối chiếu lịch rảnh của bạn
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
          Điều kiện hợp đồng minh bạch
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
}: {
  company: Company;
  onOpenVideo: () => void;
}) {
  const hasMedia = company.photos.length > 0 || Boolean(company.videoPreview);
  return (
    <Card p="md">
      <Stack gap="sm">
        <Title order={2} size="h4">
          Hình ảnh & Video thực tế nơi làm việc
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

function CompanySidebarCards({
  jobId,
  company,
  companyPosts,
  existingApplication,
  onWriteReview,
  onOpenReport,
}: {
  jobId: string;
  company: Company;
  companyPosts: CommunityPost[];
  existingApplication: ApplicationRecord | undefined;
  onWriteReview: () => void;
  onOpenReport: () => void;
}) {
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
              Báo cáo
            </Button>
          </Stack>
        </Stack>
      </Card>

      <Card p="md">
        <Stack gap="sm">
          <Group justify="space-between">
            <Title order={2} size="h4">
              Bài viết cộng đồng ({companyPosts.length})
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
                      <Badge size="xs" color={postMeta.color}>
                        {postMeta.label}
                      </Badge>
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
  const navigate = useNavigate();
  const { state, derived } = useAppState();

  const [reportOpened, { open: openReport, close: closeReport }] = useDisclosure(false);
  const [videoOpened, { open: openVideo, close: closeVideo }] = useDisclosure(false);

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

            <Card p="md">
              <Stack gap="sm">
                <Group gap="xs">
                  <IconHistory size={18} />
                  <Title order={2} size="h4">
                    Lịch sử chỉnh sửa tin tuyển dụng
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
            onWriteReview={() => void navigate(`/community?compose=review&companyId=${company.id}`)}
            onOpenReport={openReport}
          />
        </Grid.Col>
      </Grid>

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
