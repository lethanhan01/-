import { useEffect, useState } from 'react';
import { IconPhoto, IconTrash, IconUpload, IconX } from '@tabler/icons-react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  Group,
  Image,
  Modal,
  MultiSelect,
  NumberInput,
  Rating,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { useForm } from '@mantine/form';
import { ANCHOR_ZONES } from '../../data/seedData';
import { ShiftPeriod } from '../../domain/types';
import { useAppState } from '../../state/AppStateContext';

export type ComposerMode = 'review' | 'qa' | 'share';

interface PostComposerModalProps {
  opened: boolean;
  onClose: () => void;
  defaultMode?: ComposerMode;
  prefillCompanyId?: string;
  onSharedJobCreated?: (jobId: string) => void;
}

interface ReviewFormValues {
  companyId: string;
  title: string;
  content: string;
  salaryTransparency: number;
  environment: number;
  scheduleFlexibility: number;
  verifiedWorker: boolean;
}

interface QaFormValues {
  subType: 'question' | 'warning';
  companyId: string;
  title: string;
  content: string;
}

interface ShareJobFormValues {
  companyId: string;
  newCompanyName: string;
  zoneId: string;
  address: string;
  title: string;
  hourlyWageVnd: number;
  payCycle: string;
  shiftPeriods: ShiftPeriod[];
  sourceName: string;
  description: string;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Không đọc được ảnh'));
    reader.readAsDataURL(file);
  });
}

export function PostComposerModal({
  opened,
  onClose,
  defaultMode = 'review',
  prefillCompanyId,
  onSharedJobCreated,
}: PostComposerModalProps) {
  const { state, actions } = useAppState();
  const [mode, setMode] = useState<ComposerMode>(defaultMode);
  const [evidenceImages, setEvidenceImages] = useState<string[]>([]);

  const companyOptions = state.companies.map((c) => ({ value: c.id, label: c.name }));

  const reviewForm = useForm<ReviewFormValues>({
    mode: 'uncontrolled',
    initialValues: {
      companyId: prefillCompanyId || state.companies[0]?.id || '',
      title: '',
      content: '',
      salaryTransparency: 5,
      environment: 5,
      scheduleFlexibility: 5,
      verifiedWorker: true,
    },
    validate: {
      companyId: (v) => (!v ? 'Vui lòng chọn cơ sở tuyển dụng' : null),
      title: (v) => (v.trim().length < 5 ? 'Tiêu đề tối thiểu 5 ký tự' : null),
      content: (v) => (v.trim().length < 15 ? 'Nội dung đánh giá tối thiểu 15 ký tự' : null),
    },
  });

  const qaForm = useForm<QaFormValues>({
    mode: 'uncontrolled',
    initialValues: {
      subType: 'question',
      companyId: prefillCompanyId || '',
      title: '',
      content: '',
    },
    validate: {
      title: (v) => (v.trim().length < 5 ? 'Tiêu đề tối thiểu 5 ký tự' : null),
      content: (v) => (v.trim().length < 10 ? 'Nội dung tối thiểu 10 ký tự' : null),
    },
  });

  const shareForm = useForm<ShareJobFormValues>({
    mode: 'uncontrolled',
    initialValues: {
      companyId: prefillCompanyId || '',
      newCompanyName: '',
      zoneId: state.profile.anchorZoneId,
      address: '',
      title: '',
      hourlyWageVnd: 32000,
      payCycle: 'Chuyển khoản hàng tháng',
      shiftPeriods: ['evening'],
      sourceName: 'Sinh viên cùng trường giới thiệu',
      description: '',
    },
    validate: {
      title: (v) => (v.trim().length < 4 ? 'Vui lòng nhập tên vị trí' : null),
      address: (v, vals) =>
        !vals.companyId && v.trim().length < 5 ? 'Vui lòng nhập địa chỉ cơ sở mới' : null,
      newCompanyName: (v, vals) =>
        !vals.companyId && v.trim().length < 3
          ? 'Vui lòng nhập tên cơ sở hoặc chọn bên trên'
          : null,
      hourlyWageVnd: (v) => (v < 15000 ? 'Mức lương tối thiểu 15.000đ/giờ' : null),
      shiftPeriods: (v) => (v.length === 0 ? 'Chọn ít nhất 1 khung ca làm' : null),
      description: (v) => (v.trim().length < 10 ? 'Mô tả ngắn tối thiểu 10 ký tự' : null),
    },
  });

  useEffect(() => {
    if (opened) {
      setMode(defaultMode);
      if (prefillCompanyId) {
        reviewForm.setFieldValue('companyId', prefillCompanyId);
        qaForm.setFieldValue('companyId', prefillCompanyId);
        shareForm.setFieldValue('companyId', prefillCompanyId);
      }
    }
  }, [opened, defaultMode, prefillCompanyId]);

  const handleDropEvidence = async (files: File[]) => {
    const selected = files.slice(0, 3 - evidenceImages.length);
    const urls = await Promise.all(selected.map(readFileAsDataUrl));
    setEvidenceImages((prev) => [...prev, ...urls].slice(0, 3));
  };

  const handleSubmitReview = (values: ReviewFormValues) => {
    actions.createCommunityPost({
      type: 'review',
      companyId: values.companyId,
      title: values.title.trim(),
      content: values.content.trim(),
      verifiedWorker: values.verifiedWorker,
      criteriaRatings: {
        salaryTransparency: values.salaryTransparency,
        environment: values.environment,
        scheduleFlexibility: values.scheduleFlexibility,
      },
      evidenceImages,
    });
    reviewForm.reset();
    setEvidenceImages([]);
    onClose();
  };

  const handleSubmitQa = (values: QaFormValues) => {
    actions.createCommunityPost({
      type: values.subType,
      companyId: values.companyId || undefined,
      title: values.title.trim(),
      content: values.content.trim(),
    });
    qaForm.reset();
    onClose();
  };

  const handleSubmitShare = (values: ShareJobFormValues) => {
    const existingCompany = state.companies.find((c) => c.id === values.companyId);
    const zone = ANCHOR_ZONES.find((z) => z.id === values.zoneId) ?? ANCHOR_ZONES[0];

    const createdJob = actions.shareTrustedJob({
      companyId: existingCompany?.id,
      newCompanyName: values.newCompanyName.trim(),
      address: existingCompany?.address || values.address.trim(),
      district: existingCompany?.district || zone.label,
      lat: existingCompany?.lat ?? zone.lat + 0.003,
      lng: existingCompany?.lng ?? zone.lng - 0.002,
      title: values.title.trim(),
      hourlyWageVnd: values.hourlyWageVnd,
      payCycle: values.payCycle.trim(),
      shiftPeriods: values.shiftPeriods,
      sourceName: values.sourceName.trim(),
      description: values.description.trim(),
    });

    shareForm.reset();
    onClose();
    onSharedJobCreated?.(createdJob.id);
  };

  return (
    <Modal opened={opened} onClose={onClose} size="lg" title="Đăng bài & Chia sẻ Cộng đồng (CS-02)">
      <Stack gap="md">
        <SegmentedControl
          fullWidth
          value={mode}
          onChange={(v) => setMode(v as ComposerMode)}
          data={[
            { value: 'review', label: 'Viết đánh giá công ty' },
            { value: 'qa', label: 'Hỏi đáp / Cảnh báo' },
            { value: 'share', label: 'Chia sẻ tin uy tín lên Bản đồ' },
          ]}
        />

        {mode === 'review' ? (
          <Box component="form" onSubmit={reviewForm.onSubmit(handleSubmitReview)} noValidate>
            <Stack gap="sm">
              <Select
                withAsterisk
                searchable
                label="Cơ sở tuyển dụng được gắn thẻ"
                data={companyOptions}
                key={reviewForm.key('companyId')}
                {...reviewForm.getInputProps('companyId')}
              />

              <TextInput
                withAsterisk
                label="Tiêu đề đánh giá"
                placeholder="Ví dụ: Trải nghiệm 3 tháng làm ca tối tại..."
                key={reviewForm.key('title')}
                {...reviewForm.getInputProps('title')}
              />

              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                <Stack gap={4}>
                  <Text size="xs" fw={600}>
                    Minh bạch lương
                  </Text>
                  <Rating
                    key={reviewForm.key('salaryTransparency')}
                    {...reviewForm.getInputProps('salaryTransparency')}
                  />
                </Stack>
                <Stack gap={4}>
                  <Text size="xs" fw={600}>
                    Môi trường làm việc
                  </Text>
                  <Rating
                    key={reviewForm.key('environment')}
                    {...reviewForm.getInputProps('environment')}
                  />
                </Stack>
                <Stack gap={4}>
                  <Text size="xs" fw={600}>
                    Linh hoạt lịch học
                  </Text>
                  <Rating
                    key={reviewForm.key('scheduleFlexibility')}
                    {...reviewForm.getInputProps('scheduleFlexibility')}
                  />
                </Stack>
              </SimpleGrid>

              <Textarea
                withAsterisk
                label="Trải nghiệm thực tế (lương thực nhận, quản lý, hợp đồng)"
                minRows={3}
                key={reviewForm.key('content')}
                {...reviewForm.getInputProps('content')}
              />

              <Checkbox
                label="Tôi đã từng làm việc hoặc phỏng vấn trực tiếp tại cơ sở này"
                key={reviewForm.key('verifiedWorker')}
                {...reviewForm.getInputProps('verifiedWorker', { type: 'checkbox' })}
              />

              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="xs" fw={600}>
                    Ảnh minh chứng (tùy chọn, tối đa 3 ảnh)
                  </Text>
                  <Badge size="xs" color="gray">
                    {evidenceImages.length}/3 ảnh
                  </Badge>
                </Group>
                <Dropzone
                  onDrop={handleDropEvidence}
                  accept={IMAGE_MIME_TYPE}
                  maxSize={5 * 1024 ** 2}
                  disabled={evidenceImages.length >= 3}
                >
                  <Group justify="center" gap="sm" mih={64} style={{ pointerEvents: 'none' }}>
                    <Dropzone.Accept>
                      <IconUpload size={22} />
                    </Dropzone.Accept>
                    <Dropzone.Reject>
                      <IconX size={22} />
                    </Dropzone.Reject>
                    <Dropzone.Idle>
                      <IconPhoto size={22} />
                    </Dropzone.Idle>
                    <Text size="xs" c="dimmed">
                      Kéo thả ảnh hợp đồng, bảng lương hoặc nơi làm việc vào đây
                    </Text>
                  </Group>
                </Dropzone>

                {evidenceImages.length > 0 ? (
                  <SimpleGrid cols={3} spacing="xs">
                    {evidenceImages.map((src, idx) => (
                      <Box key={src.slice(0, 32) + idx} pos="relative">
                        <Image
                          src={src}
                          h={72}
                          radius="sm"
                          fit="cover"
                          alt={`Minh chứng ${idx + 1}`}
                        />
                        <ActionIcon
                          size="xs"
                          color="red"
                          variant="filled"
                          pos="absolute"
                          top={4}
                          right={4}
                          aria-label={`Xóa ảnh minh chứng ${idx + 1}`}
                          onClick={() =>
                            setEvidenceImages((prev) => prev.filter((_, i) => i !== idx))
                          }
                        >
                          <IconTrash size={12} />
                        </ActionIcon>
                      </Box>
                    ))}
                  </SimpleGrid>
                ) : null}
              </Stack>

              <Group justify="flex-end" mt="xs">
                <Button variant="default" onClick={onClose}>
                  Đóng
                </Button>
                <Button type="submit">Đăng đánh giá (+10đ uy tín)</Button>
              </Group>
            </Stack>
          </Box>
        ) : null}

        {mode === 'qa' ? (
          <Box component="form" onSubmit={qaForm.onSubmit(handleSubmitQa)} noValidate>
            <Stack gap="sm">
              <SegmentedControl
                value={qaForm.getValues().subType}
                onChange={(v) => qaForm.setFieldValue('subType', v as 'question' | 'warning')}
                data={[
                  { value: 'question', label: 'Đặt câu hỏi kinh nghiệm' },
                  { value: 'warning', label: 'Cảnh báo lừa đảo' },
                ]}
              />
              <Select
                clearable
                searchable
                label="Gắn thẻ công ty / cơ sở (tùy chọn)"
                placeholder="Chọn nếu liên quan tới một cơ sở cụ thể"
                data={companyOptions}
                key={qaForm.key('companyId')}
                {...qaForm.getInputProps('companyId')}
              />
              <TextInput
                withAsterisk
                label="Tiêu đề"
                placeholder="Ví dụ: Ca tối ở khu ĐHQG về KTX có an toàn không?"
                key={qaForm.key('title')}
                {...qaForm.getInputProps('title')}
              />
              <Textarea
                withAsterisk
                label="Nội dung chi tiết"
                minRows={4}
                key={qaForm.key('content')}
                {...qaForm.getInputProps('content')}
              />
              <Group justify="flex-end" mt="xs">
                <Button variant="default" onClick={onClose}>
                  Đóng
                </Button>
                <Button type="submit" color="brand">
                  Đăng lên bảng tin
                </Button>
              </Group>
            </Stack>
          </Box>
        ) : null}

        {mode === 'share' ? (
          <Box component="form" onSubmit={shareForm.onSubmit(handleSubmitShare)} noValidate>
            <Stack gap="sm">
              <Text size="xs" c="dimmed">
                Tin tuyển dụng uy tín bạn chia sẻ sẽ đi qua bộ khử trùng lặp và xuất hiện ngay dưới
                dạng ghim mới trên Bản đồ MH-01.
              </Text>
              <Select
                clearable
                searchable
                label="Chọn cơ sở có sẵn (hoặc bỏ trống để nhập cơ sở mới)"
                placeholder="Tìm trong danh sách cơ sở..."
                data={companyOptions}
                key={shareForm.key('companyId')}
                {...shareForm.getInputProps('companyId')}
              />
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <TextInput
                  label="Tên cơ sở mới (nếu chưa có)"
                  placeholder="Ví dụ: Phê La Làng ĐHQG"
                  key={shareForm.key('newCompanyName')}
                  {...shareForm.getInputProps('newCompanyName')}
                />
                <Select
                  label="Khu vực bản đồ"
                  data={ANCHOR_ZONES.map((z) => ({ value: z.id, label: z.label }))}
                  key={shareForm.key('zoneId')}
                  {...shareForm.getInputProps('zoneId')}
                />
              </SimpleGrid>
              <TextInput
                label="Địa chỉ cụ thể"
                placeholder="Ví dụ: 18 Hàn Thuyên, Linh Trung, Thủ Đức"
                key={shareForm.key('address')}
                {...shareForm.getInputProps('address')}
              />
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <TextInput
                  withAsterisk
                  label="Vị trí tuyển dụng"
                  placeholder="Ví dụ: Nhân viên phục vụ ca tối"
                  key={shareForm.key('title')}
                  {...shareForm.getInputProps('title')}
                />
                <NumberInput
                  withAsterisk
                  label="Mức lương / giờ (VNĐ)"
                  step={1000}
                  min={15000}
                  key={shareForm.key('hourlyWageVnd')}
                  {...shareForm.getInputProps('hourlyWageVnd')}
                />
              </SimpleGrid>
              <MultiSelect
                withAsterisk
                label="Khung ca làm tuyển dụng"
                data={[
                  { value: 'morning', label: 'Ca Sáng (08:00 - 12:00)' },
                  { value: 'afternoon', label: 'Ca Chiều (13:30 - 17:30)' },
                  { value: 'evening', label: 'Ca Tối (18:00 - 22:00)' },
                  { value: 'weekend', label: 'Ca Cuối tuần (T7 - CN)' },
                ]}
                key={shareForm.key('shiftPeriods')}
                {...shareForm.getInputProps('shiftPeriods')}
              />
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <TextInput
                  label="Chu kỳ trả lương"
                  key={shareForm.key('payCycle')}
                  {...shareForm.getInputProps('payCycle')}
                />
                <TextInput
                  label="Nguồn xác thực"
                  key={shareForm.key('sourceName')}
                  {...shareForm.getInputProps('sourceName')}
                />
              </SimpleGrid>
              <Textarea
                withAsterisk
                label="Mô tả công việc & điều kiện minh bạch"
                minRows={3}
                key={shareForm.key('description')}
                {...shareForm.getInputProps('description')}
              />
              <Group justify="flex-end" mt="xs">
                <Button variant="default" onClick={onClose}>
                  Đóng
                </Button>
                <Button type="submit" color="teal">
                  Chia sẻ lên Bản đồ (+15đ uy tín)
                </Button>
              </Group>
            </Stack>
          </Box>
        ) : null}
      </Stack>
    </Modal>
  );
}
