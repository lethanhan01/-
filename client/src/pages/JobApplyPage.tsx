import { useMemo } from 'react';
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconCheck,
  IconFileUpload,
  IconSend,
} from '@tabler/icons-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Divider,
  FileInput,
  Group,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { computeJobScheduleMatch, formatVnd } from '../domain/jobLogic';
import { useAppState } from '../state/AppStateContext';

interface ApplyFormValues {
  applicantName: string;
  university: string;
  phone: string;
  email: string;
  selectedShiftIds: string[];
  introNote: string;
  attachmentFile: File | null;
  confirmedTerms: boolean;
}

export function JobApplyPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { state, derived, actions } = useAppState();

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

  const preselectedShiftIds = useMemo(
    () =>
      scheduleMatch
        ? scheduleMatch.shiftDetails.filter((d) => d.fitsSchedule).map((d) => d.shift.id)
        : [],
    [scheduleMatch]
  );

  const form = useForm<ApplyFormValues>({
    mode: 'uncontrolled',
    initialValues: {
      applicantName: state.profile.fullName,
      university: state.profile.university,
      phone: state.profile.phone,
      email: state.profile.email,
      selectedShiftIds: preselectedShiftIds,
      introNote: state.profile.bio,
      attachmentFile: null,
      confirmedTerms: false,
    },
    validate: {
      applicantName: (v) => (v.trim().length < 2 ? 'Vui lòng nhập họ tên' : null),
      university: (v) => (v.trim().length < 3 ? 'Vui lòng nhập tên trường' : null),
      phone: (v) => (v.trim().length < 9 ? 'Vui lòng nhập số điện thoại liên hệ' : null),
      email: (v) => (!v.includes('@') ? 'Email không hợp lệ' : null),
      selectedShiftIds: (v) =>
        v.length === 0 ? 'Vui lòng chọn ít nhất 1 ca làm muốn đăng ký' : null,
      confirmedTerms: (v) =>
        !v ? 'Vui lòng xác nhận bạn đã kiểm tra kỹ điều kiện làm việc & hợp đồng' : null,
    },
  });

  if (!job || !company) {
    return (
      <Card p="xl">
        <Stack gap="sm" align="center">
          <Title order={3}>Không tìm thấy công việc để ứng tuyển</Title>
          <Button component={Link} to="/">
            Quay lại Bản đồ
          </Button>
        </Stack>
      </Card>
    );
  }

  const handleSubmit = (values: ApplyFormValues) => {
    const selectedLabels = job.shifts
      .filter((s) => values.selectedShiftIds.includes(s.id))
      .map((s) => s.label);

    actions.submitApplication({
      jobId: job.id,
      companyId: company.id,
      jobTitle: job.title,
      companyName: company.name,
      selectedShiftIds: values.selectedShiftIds,
      selectedShiftLabels: selectedLabels,
      applicantName: values.applicantName.trim(),
      university: values.university.trim(),
      phone: values.phone.trim(),
      email: values.email.trim(),
      introNote: values.introNote.trim(),
      attachmentName: values.attachmentFile ? values.attachmentFile.name : null,
      confirmedTerms: values.confirmedTerms,
    });

    void navigate('/profile?tab=history');
  };

  return (
    <Stack gap="md" maw={820} mx="auto">
      <Group justify="space-between">
        <Button
          component={Link}
          to={`/jobs/${job.id}`}
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
        >
          Hủy & Quay lại Chi tiết (MH-03)
        </Button>
        <Badge color="brand">Tự động điền từ Hồ sơ MH-02</Badge>
      </Group>

      <Card p="md">
        <Stack gap={4}>
          <Text size="xs" fw={700} c="brand">
            ỨNG TUYỂN CÔNG VIỆC (MH-06)
          </Text>
          <Title order={3}>{job.title}</Title>
          <Group gap="md" wrap="wrap">
            <Text size="sm" fw={600}>
              {company.name}
            </Text>
            <Badge color="teal" className="app-tabular">
              {formatVnd(job.hourlyWageVnd)}/giờ
            </Badge>
            <Text size="xs" c="dimmed">
              {company.address}
            </Text>
          </Group>
        </Stack>
      </Card>

      {company.warningFlag ? (
        <Alert color="red" icon={<IconAlertTriangle size={18} />} title="Lưu ý cảnh báo an toàn">
          <Text size="xs">{company.warningFlag}</Text>
        </Alert>
      ) : null}

      <Card p="md">
        <Box component="form" onSubmit={form.onSubmit(handleSubmit)} noValidate>
          <Stack gap="md">
            <Title order={4}>1. Thông tin ứng viên (tự động điền từ MH-02)</Title>

            <Group grow>
              <TextInput
                withAsterisk
                label="Họ và tên"
                key={form.key('applicantName')}
                {...form.getInputProps('applicantName')}
              />
              <TextInput
                withAsterisk
                label="Trường học"
                key={form.key('university')}
                {...form.getInputProps('university')}
              />
            </Group>

            <Group grow>
              <TextInput
                withAsterisk
                label="Số điện thoại"
                key={form.key('phone')}
                {...form.getInputProps('phone')}
              />
              <TextInput
                withAsterisk
                label="Email"
                key={form.key('email')}
                {...form.getInputProps('email')}
              />
            </Group>

            <Group gap={6} wrap="wrap">
              <Text size="xs" fw={600} c="dimmed">
                Kỹ năng từ hồ sơ:
              </Text>
              {state.profile.skills.map((skill) => (
                <Badge key={skill} size="xs" color="brand">
                  {skill}
                </Badge>
              ))}
            </Group>

            <Divider />

            <Title order={4}>2. Chọn ca làm & Đối chiếu lịch rảnh cá nhân</Title>
            <Checkbox.Group
              label="Đánh dấu các ca làm bạn có thể đăng ký"
              withAsterisk
              key={form.key('selectedShiftIds')}
              {...form.getInputProps('selectedShiftIds')}
            >
              <Stack gap="xs" mt="xs">
                {scheduleMatch?.shiftDetails.map(({ shift, fitsSchedule, conflicts }) => (
                  <Card key={shift.id} p="xs" bg="var(--app-bg-canvas)">
                    <Group justify="space-between" wrap="wrap">
                      <Checkbox value={shift.id} label={shift.label} />
                      {fitsSchedule ? (
                        <Badge color="teal" leftSection={<IconCheck size={12} />}>
                          Khớp lịch rảnh
                        </Badge>
                      ) : (
                        <Badge color="red">
                          Trùng lịch học: {conflicts.slice(0, 2).join(', ')}
                        </Badge>
                      )}
                    </Group>
                  </Card>
                ))}
              </Stack>
            </Checkbox.Group>

            <Divider />

            <Title order={4}>3. Lời nhắn & Hồ sơ năng lực</Title>
            <Textarea
              label="Lời nhắn giới thiệu bản thân với nhà tuyển dụng"
              minRows={3}
              key={form.key('introNote')}
              {...form.getInputProps('introNote')}
            />

            <FileInput
              label="Đính kèm CV / Hồ sơ năng lực (tùy chọn)"
              placeholder="Chọn tệp PDF hoặc ảnh..."
              leftSection={<IconFileUpload size={16} />}
              accept=".pdf,.doc,.docx,image/*"
              key={form.key('attachmentFile')}
              {...form.getInputProps('attachmentFile')}
            />

            <Checkbox
              label="Tôi đã kiểm tra kỹ mức lương, ca làm và điều kiện hợp đồng (không đặt cọc tiền, không giao nộp CCCD gốc) trước khi gửi hồ sơ."
              key={form.key('confirmedTerms')}
              {...form.getInputProps('confirmedTerms', { type: 'checkbox' })}
            />

            <Group justify="flex-end" mt="xs">
              <Button component={Link} to={`/jobs/${job.id}`} variant="default">
                Hủy
              </Button>
              <Button type="submit" color="teal" leftSection={<IconSend size={16} />}>
                Gửi hồ sơ ứng tuyển
              </Button>
            </Group>
          </Stack>
        </Box>
      </Card>
    </Stack>
  );
}
