import { useMemo, useState } from 'react';
import {
  IconAward,
  IconCalendarTime,
  IconCheck,
  IconFileSpreadsheet,
  IconHistory,
  IconIdBadge2,
  IconTrash,
  IconUpload,
  IconUser,
  IconX,
} from '@tabler/icons-react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  TagsInput,
  Text,
  Textarea,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { computeFreeSummary } from '../domain/jobLogic';
import {
  createEmptyBusyMap,
  parseCsvSchedule,
  ParsedSchedulePreview,
  parseIcsSchedule,
  simulateImageOcrSchedule,
} from '../domain/scheduleParser';
import {
  ApplicationRecord,
  BusyScheduleMap,
  CommunityPost,
  HOUR_SLOTS,
  StudentProfile,
  WEEKDAYS,
  Weekday,
} from '../domain/types';
import { useAppState } from '../state/AppStateContext';
import classes from './ProfileSchedulePage.module.css';

interface ProfileFormValues {
  fullName: string;
  university: string;
  major: string;
  yearLabel: string;
  phone: string;
  email: string;
  skills: string[];
  bio: string;
}

const WEEKDAY_NAME: Record<Weekday, string> = {
  mon: 'Thứ 2',
  tue: 'Thứ 3',
  wed: 'Thứ 4',
  thu: 'Thứ 5',
  fri: 'Thứ 6',
  sat: 'Thứ 7',
  sun: 'Chủ nhật',
};

function ProfileTabPanel({
  profile,
  onSaveProfile,
}: {
  profile: StudentProfile;
  onSaveProfile: (values: ProfileFormValues) => void;
}) {
  const form = useForm<ProfileFormValues>({
    mode: 'uncontrolled',
    initialValues: {
      fullName: profile.fullName,
      university: profile.university,
      major: profile.major,
      yearLabel: profile.yearLabel,
      phone: profile.phone,
      email: profile.email,
      skills: profile.skills,
      bio: profile.bio,
    },
    validate: {
      fullName: (v) => (v.trim().length < 2 ? 'Vui lòng nhập họ tên' : null),
      university: (v) => (v.trim().length < 3 ? 'Vui lòng nhập tên trường' : null),
      phone: (v) => (v.trim().length < 9 ? 'Số điện thoại không hợp lệ' : null),
      email: (v) => (!v.includes('@') ? 'Email không hợp lệ' : null),
    },
  });

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
      <Card p="md">
        <Box component="form" onSubmit={form.onSubmit(onSaveProfile)} noValidate>
          <Stack gap="sm">
            <Title order={2} size="h4">
              Thông tin tự động điền ứng tuyển
            </Title>
            <TextInput
              withAsterisk
              label="Họ và tên"
              key={form.key('fullName')}
              {...form.getInputProps('fullName')}
            />
            <TextInput
              withAsterisk
              label="Trường Đại học / Cao đẳng"
              key={form.key('university')}
              {...form.getInputProps('university')}
            />
            <SimpleGrid cols={2} spacing="sm">
              <TextInput
                label="Chuyên ngành"
                key={form.key('major')}
                {...form.getInputProps('major')}
              />
              <TextInput
                label="Năm học"
                key={form.key('yearLabel')}
                {...form.getInputProps('yearLabel')}
              />
            </SimpleGrid>
            <SimpleGrid cols={2} spacing="sm">
              <TextInput
                withAsterisk
                label="Số điện thoại"
                key={form.key('phone')}
                {...form.getInputProps('phone')}
              />
              <TextInput
                withAsterisk
                label="Email sinh viên"
                key={form.key('email')}
                {...form.getInputProps('email')}
              />
            </SimpleGrid>
            <TagsInput
              label="Kỹ năng & Kinh nghiệm cơ bản"
              placeholder="Nhập kỹ năng rồi nhấn Enter"
              key={form.key('skills')}
              {...form.getInputProps('skills')}
            />
            <Textarea
              label="Giới thiệu ngắn"
              minRows={3}
              key={form.key('bio')}
              {...form.getInputProps('bio')}
            />
            <Group justify="flex-end">
              <Button type="submit">Lưu hồ sơ chuẩn</Button>
            </Group>
          </Stack>
        </Box>
      </Card>

      <Card p="md" bg="var(--app-bg-subtle)">
        <Stack gap="sm">
          <Group gap="xs">
            <IconIdBadge2 size={18} />
            <Title order={2} size="h4">
              Xem trước Thẻ hồ sơ chia sẻ (MH-05)
            </Title>
          </Group>
          <Text size="xs" c="dimmed">
            Thẻ này có thể gửi nhanh 1 chạm khi trò chuyện trao đổi kinh nghiệm với các sinh viên
            khác ở MH-05.
          </Text>
          <Card p="md">
            <Stack gap="xs">
              <Group justify="space-between">
                <Text fw={700}>{profile.fullName}</Text>
                <Badge color="success">{profile.yearLabel}</Badge>
              </Group>
              <Text size="xs" c="dimmed">
                {profile.university} • {profile.major}
              </Text>
              <Text size="sm">{profile.bio}</Text>
              <Group gap={6} wrap="wrap">
                {profile.skills.map((skill) => (
                  <Badge key={skill} size="xs" color="brand">
                    {skill}
                  </Badge>
                ))}
              </Group>
            </Stack>
          </Card>
        </Stack>
      </Card>
    </SimpleGrid>
  );
}

function ScheduleTabPanel({
  busySchedule,
  freeSummary,
  onToggleSlot,
  onApplyBusySchedule,
}: {
  busySchedule: BusyScheduleMap;
  freeSummary: ReturnType<typeof computeFreeSummary>;
  onToggleSlot: (day: Weekday, hour: number) => void;
  onApplyBusySchedule: (nextMap: BusyScheduleMap) => void;
}) {
  const [parsedPreview, setParsedPreview] = useState<ParsedSchedulePreview | null>(null);

  const handleDropSchedule = async (files: File[]) => {
    const file = files[0];
    if (!file) {
      return;
    }
    try {
      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith('.ics')) {
        const content = await file.text();
        setParsedPreview(parseIcsSchedule(content));
        return;
      }
      if (lowerName.endsWith('.csv') || lowerName.endsWith('.txt')) {
        const content = await file.text();
        setParsedPreview(parseCsvSchedule(content));
        return;
      }
      setParsedPreview(simulateImageOcrSchedule(file.name));
    } catch {
      notifications.show({
        title: 'Không đọc được thời khóa biểu',
        message: 'Vui lòng thử lại với tệp .ics, .csv hoặc ảnh hợp lệ.',
        color: 'danger',
      });
    }
  };

  const handleLoadSampleCsv = () => {
    const sampleCsv = [
      'T2,07:00,11:00,Cấu trúc dữ liệu & Giải thuật',
      'T3,13:00,17:00,Cơ sở dữ liệu',
      'T4,07:00,11:00,Mạng máy tính',
      'T5,13:00,16:00,Kỹ năng mềm',
      'T6,07:00,10:00,Anh văn chuyên ngành',
    ].join('\n');
    setParsedPreview(parseCsvSchedule(sampleCsv));
  };

  const handleApplyParsed = () => {
    if (!parsedPreview) {
      return;
    }
    onApplyBusySchedule(parsedPreview.busyMap);
    setParsedPreview(null);
    notifications.show({
      title: 'Đã cập nhật thời khóa biểu',
      message: 'Hệ thống đã tính lại khung giờ rảnh và đồng bộ với Bản đồ việc làm MH-01.',
      color: 'success',
    });
  };

  return (
    <Stack gap="md">
      <Card p="md">
        <Stack gap="sm">
          <Group justify="space-between" wrap="wrap">
            <Stack gap={2}>
              <Title order={2} size="h4">
                Quét hoặc Nhập thời khóa biểu
              </Title>
              <Text size="xs" c="dimmed">
                Tải lên tệp `.ics`, `.csv` (parse tự động) hoặc ảnh chụp thời khóa biểu (mô phỏng
                OCR), sau đó chỉnh tay trực tiếp trên lưới tuần.
              </Text>
            </Stack>
            <Group gap="xs">
              <Button
                size="xs"
                variant="light"
                leftSection={<IconFileSpreadsheet size={15} />}
                onClick={handleLoadSampleCsv}
              >
                Nạp nhanh TKB mẫu ĐHQG
              </Button>
              <Button
                size="xs"
                variant="default"
                color="danger"
                leftSection={<IconTrash size={15} />}
                onClick={() => onApplyBusySchedule(createEmptyBusyMap())}
              >
                Xóa hết giờ bận
              </Button>
            </Group>
          </Group>

          <Dropzone
            onDrop={(files) => {
              void handleDropSchedule(files);
            }}
            accept={{
              'image/*': ['.png', '.jpg', '.jpeg'],
              'text/csv': ['.csv'],
              'text/calendar': ['.ics'],
              'text/plain': ['.csv', '.ics'],
            }}
            maxSize={5 * 1024 ** 2}
          >
            <Group justify="center" gap="sm" mih={72} className={classes.dropzoneInner}>
              <Dropzone.Accept>
                <IconUpload size={24} />
              </Dropzone.Accept>
              <Dropzone.Reject>
                <IconX size={24} />
              </Dropzone.Reject>
              <Dropzone.Idle>
                <IconCalendarTime size={24} />
              </Dropzone.Idle>
              <Stack gap={2}>
                <Text size="sm" fw={600}>
                  Kéo thả file `.ics`, `.csv` hoặc ảnh lịch học tại đây
                </Text>
                <Text size="xs" c="dimmed">
                  Hỗ trợ định dạng CSV `T2,07:30,11:30,Tên môn`, lịch Google Calendar `.ics` hoặc
                  ảnh chụp màn hình portal trường.
                </Text>
              </Stack>
            </Group>
          </Dropzone>

          {parsedPreview ? (
            <Alert color="brand" title="Kết quả đọc thời khóa biểu">
              <Stack gap="xs">
                <Text size="xs">
                  Đã nhận diện {parsedPreview.subjects.length} khung tiết học bận (nguồn:{' '}
                  {parsedPreview.source === 'ocr-simulated'
                    ? 'Mô phỏng OCR từ ảnh'
                    : parsedPreview.source.toUpperCase()}
                  ):
                </Text>
                <Group gap="xs" wrap="wrap">
                  {parsedPreview.subjects.map((sub) => (
                    <Badge
                      key={`${sub.day}-${sub.startHour}-${sub.endHour}-${sub.title}`}
                      color="warning"
                    >
                      {WEEKDAY_NAME[sub.day]} {sub.startHour}h-{sub.endHour}h: {sub.title}
                    </Badge>
                  ))}
                </Group>
                <Group justify="flex-end">
                  <Button size="xs" variant="default" onClick={() => setParsedPreview(null)}>
                    Bỏ qua
                  </Button>
                  <Button size="xs" color="success" onClick={handleApplyParsed}>
                    Áp dụng vào lưới tuần
                  </Button>
                </Group>
              </Stack>
            </Alert>
          ) : null}
        </Stack>
      </Card>

      <Card p="md">
        <Stack gap="sm">
          <Group justify="space-between" wrap="wrap">
            <Stack gap={2}>
              <Title order={2} size="h4">
                Lưới giờ bận & Tự động khoanh vùng giờ rảnh
              </Title>
              <Text size="xs" c="dimmed">
                Bấm vào từng ô để chuyển đổi trạng thái Bận (đỏ) / Rảnh (xanh). Tổng rảnh:{' '}
                <Text span fw={700} c="success" className="app-tabular">
                  {freeSummary.totalFreeHours} giờ/tuần
                </Text>
              </Text>
            </Stack>
            <Group gap="xs">
              <Badge color="success">Ô xanh: Giờ rảnh</Badge>
              <Badge color="danger">Ô đỏ: Bận học</Badge>
            </Group>
          </Group>

          <Table.ScrollContainer minWidth={600}>
            <Table withTableBorder withColumnBorders verticalSpacing={4} horizontalSpacing={6}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Giờ</Table.Th>
                  {WEEKDAYS.map((d) => (
                    <Table.Th key={d.key} ta="center">
                      {d.shortLabel}
                    </Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {HOUR_SLOTS.map((hour) => (
                  <Table.Tr key={hour}>
                    <Table.Td className="app-tabular">
                      <Text size="xs" fw={600}>
                        {String(hour).padStart(2, '0')}:00
                      </Text>
                    </Table.Td>
                    {WEEKDAYS.map((day) => {
                      const isBusy = (busySchedule[day.key] ?? []).includes(hour);
                      return (
                        <Table.Td key={day.key} p={2}>
                          <UnstyledButton
                            className={classes.scheduleCell}
                            mod={{ busy: isBusy, free: !isBusy }}
                            aria-pressed={isBusy}
                            aria-label={`${day.label} ${hour}:00 - ${
                              isBusy ? 'Đang bận' : 'Đang rảnh'
                            }`}
                            onClick={() => onToggleSlot(day.key, hour)}
                          />
                        </Table.Td>
                      );
                    })}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>

          <Stack gap={4}>
            <Text size="xs" fw={600}>
              Khung giờ rảnh liên tiếp nổi bật (từ 3 giờ trở lên):
            </Text>
            <Group gap="xs" wrap="wrap">
              {freeSummary.freeBlocksByDay.map((b) => (
                <Badge key={b.dayLabel} color="success" variant="outline">
                  {b.dayLabel}: {b.ranges.join(', ')}
                </Badge>
              ))}
            </Group>
          </Stack>
        </Stack>
      </Card>
    </Stack>
  );
}

function HistoryTabPanel({
  applications,
  myPosts,
}: {
  applications: ApplicationRecord[];
  myPosts: CommunityPost[];
}) {
  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
      <Card p="md">
        <Stack gap="sm">
          <Title order={2} size="h4">
            Việc đã ứng tuyển ({applications.length})
          </Title>
          {applications.length === 0 ? (
            <Text size="sm" c="dimmed">
              Bạn chưa nộp hồ sơ ứng tuyển nào.
            </Text>
          ) : (
            applications.map((app) => (
              <Card key={app.id} p="sm" bg="var(--app-bg-subtle)">
                <Stack gap={4}>
                  <Group justify="space-between" wrap="wrap">
                    <Text size="sm" fw={700}>
                      {app.jobTitle}
                    </Text>
                    <Badge color="success">Đã gửi hồ sơ</Badge>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {app.companyName}
                  </Text>
                  <Group gap={4} wrap="wrap">
                    {app.selectedShiftLabels.map((lbl) => (
                      <Badge key={lbl} size="xs" color="brand">
                        {lbl}
                      </Badge>
                    ))}
                  </Group>
                  <Group justify="space-between" mt={4}>
                    <Text size="xs" c="dimmed">
                      Nộp lúc: {new Date(app.submittedAt).toLocaleString('vi-VN')}
                    </Text>
                    <Button component={Link} to={`/jobs/${app.jobId}`} size="xs" variant="light">
                      Xem lại tin
                    </Button>
                  </Group>
                </Stack>
              </Card>
            ))
          )}
        </Stack>
      </Card>

      <Card p="md">
        <Stack gap="sm">
          <Title order={2} size="h4">
            Bài viết & Đánh giá của bạn ({myPosts.length})
          </Title>
          {myPosts.length === 0 ? (
            <Text size="sm" c="dimmed">
              Bạn chưa đăng bài đánh giá nào. Hãy chia sẻ trải nghiệm ở mục Cộng đồng để tích điểm
              uy tín!
            </Text>
          ) : (
            myPosts.map((post) => (
              <Card key={post.id} p="sm" bg="var(--app-bg-subtle)">
                <Stack gap={4}>
                  <Text size="sm" fw={700}>
                    {post.title}
                  </Text>
                  <Text size="xs" c="dimmed" lineClamp={2}>
                    {post.content}
                  </Text>
                  <Group justify="space-between">
                    <Badge size="xs" color="brand">
                      {post.helpfulCount} hữu ích
                    </Badge>
                    <Button
                      component={Link}
                      to={`/community?postId=${post.id}`}
                      size="xs"
                      variant="light"
                    >
                      Mở bài viết
                    </Button>
                  </Group>
                </Stack>
              </Card>
            ))
          )}
        </Stack>
      </Card>
    </SimpleGrid>
  );
}

export function ProfileSchedulePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';
  const { state, actions } = useAppState();

  const freeSummary = useMemo(() => computeFreeSummary(state.busySchedule), [state.busySchedule]);

  const myPosts = useMemo(
    () => state.posts.filter((p) => p.authorId === state.profile.id),
    [state.posts, state.profile.id]
  );

  const handleSaveProfile = (values: ProfileFormValues) => {
    actions.updateProfile(values);
    notifications.show({
      title: 'Đã lưu hồ sơ chuẩn',
      message: 'Dữ liệu này sẽ tự động điền vào trang ứng tuyển MH-06 và thẻ chia sẻ ở MH-05.',
      color: 'success',
    });
  };

  return (
    <Stack gap="md">
      <Card p="md">
        <Group justify="space-between" wrap="wrap">
          <Group gap="md">
            <Avatar size="lg" radius="xl" color="brand">
              {state.profile.fullName.slice(0, 1)}
            </Avatar>
            <Stack gap={2}>
              <Group gap="xs">
                <Title order={1} size="h3">
                  {state.profile.fullName}
                </Title>
                {state.profile.verifiedStudent ? (
                  <Badge color="success" leftSection={<IconCheck size={12} />}>
                    Sinh viên đã xác thực
                  </Badge>
                ) : null}
              </Group>
              <Text size="sm" c="dimmed">
                {state.profile.university} • {state.profile.major} ({state.profile.yearLabel})
              </Text>
            </Stack>
          </Group>

          <Badge
            size="lg"
            color="brand"
            leftSection={<IconAward size={16} />}
            className="app-tabular"
          >
            {state.profile.reputationPoints} điểm uy tín
          </Badge>
        </Group>
      </Card>

      <Tabs value={activeTab} onChange={(tab) => setSearchParams({ tab: tab || 'profile' })}>
        <Tabs.List>
          <Tabs.Tab value="profile" leftSection={<IconUser size={16} />}>
            Hồ sơ chuẩn dùng chung
          </Tabs.Tab>
          <Tabs.Tab value="schedule" leftSection={<IconCalendarTime size={16} />}>
            Thời khóa biểu & Giờ rảnh
          </Tabs.Tab>
          <Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>
            Lịch sử hoạt động ({state.applications.length + myPosts.length})
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="profile" pt="md">
          <ProfileTabPanel profile={state.profile} onSaveProfile={handleSaveProfile} />
        </Tabs.Panel>

        <Tabs.Panel value="schedule" pt="md">
          <ScheduleTabPanel
            busySchedule={state.busySchedule}
            freeSummary={freeSummary}
            onToggleSlot={actions.toggleBusySlot}
            onApplyBusySchedule={actions.applyBusySchedule}
          />
        </Tabs.Panel>

        <Tabs.Panel value="history" pt="md">
          <HistoryTabPanel applications={state.applications} myPosts={myPosts} />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
