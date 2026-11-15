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
import { notifications } from '@mantine/notifications';
import { ANCHOR_ZONES } from '../../data/seedData';
import { ShiftPeriod } from '../../domain/types';
import { useAppState } from '../../state/AppStateContext';
import classes from './PostComposerModal.module.css';

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
  benefits: number;
  jobQuality: number;
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

interface EvidenceImageItem {
  id: string;
  url: string;
}

let evidenceSeq = 0;

function nextEvidenceId(): string {
  evidenceSeq += 1;
  return `ev-${Date.now()}-${evidenceSeq}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Không đọc được ảnh'));
    reader.readAsDataURL(file);
  });
}

interface CompanyOption {
  value: string;
  label: string;
}

function ReviewComposerForm({
  companyOptions,
  defaultCompanyId,
  onClose,
}: {
  companyOptions: CompanyOption[];
  defaultCompanyId: string;
  onClose: () => void;
}) {
  const { actions } = useAppState();
  const [evidenceImages, setEvidenceImages] = useState<EvidenceImageItem[]>([]);

  const reviewForm = useForm<ReviewFormValues>({
    mode: 'uncontrolled',
    initialValues: {
      companyId: defaultCompanyId,
      title: '',
      content: '',
      salaryTransparency: 5,
      environment: 5,
      scheduleFlexibility: 5,
      benefits: 5,
      jobQuality: 5,
      verifiedWorker: true,
    },
    validate: {
      companyId: (v) => (!v ? 'Vui lòng chọn cơ sở' : null),
      title: (v) => (v.trim().length < 5 ? 'Tiêu đề tối thiểu 5 ký tự' : null),
      content: (v) => (v.trim().length < 15 ? 'Nội dung tối thiểu 15 ký tự' : null),
    },
  });

  const handleDropEvidence = async (files: File[]) => {
    try {
      const selected = files.slice(0, 3 - evidenceImages.length);
      const urls = await Promise.all(selected.map(readFileAsDataUrl));
      const newItems = urls.filter(Boolean).map((url) => ({ id: nextEvidenceId(), url }));
      setEvidenceImages((prev) => [...prev, ...newItems].slice(0, 3));
    } catch {
      notifications.show({
        title: 'Không đọc được ảnh',
        message: 'Vui lòng chọn tệp ảnh hợp lệ (PNG, JPG, WEBP).',
        color: 'danger',
      });
    }
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
        benefits: values.benefits,
        jobQuality: values.jobQuality,
      },
      evidenceImages: evidenceImages.map((img) => img.url),
    });
    reviewForm.reset();
    setEvidenceImages([]);
    onClose();
  };

  return (
    <Box component="form" onSubmit={reviewForm.onSubmit(handleSubmitReview)} noValidate>
      <Stack gap="sm">
        <Select
          withAsterisk
          searchable
          label="Cơ sở"
          data={companyOptions}
          key={reviewForm.key('companyId')}
          {...reviewForm.getInputProps('companyId')}
        />

        <TextInput
          withAsterisk
          label="Tiêu đề"
          placeholder="Ví dụ: Trải nghiệm 3 tháng làm ca tối..."
          key={reviewForm.key('title')}
          {...reviewForm.getInputProps('title')}
        />

        <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
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
              Môi trường
            </Text>
            <Rating
              key={reviewForm.key('environment')}
              {...reviewForm.getInputProps('environment')}
            />
          </Stack>
          <Stack gap={4}>
            <Text size="xs" fw={600}>
              Linh hoạt lịch
            </Text>
            <Rating
              key={reviewForm.key('scheduleFlexibility')}
              {...reviewForm.getInputProps('scheduleFlexibility')}
            />
          </Stack>
          <Stack gap={4}>
            <Text size="xs" fw={600}>
              Chế độ & Đãi ngộ
            </Text>
            <Rating key={reviewForm.key('benefits')} {...reviewForm.getInputProps('benefits')} />
          </Stack>
          <Stack gap={4}>
            <Text size="xs" fw={600}>
              Chất lượng công việc
            </Text>
            <Rating
              key={reviewForm.key('jobQuality')}
              {...reviewForm.getInputProps('jobQuality')}
            />
          </Stack>
        </SimpleGrid>

        <Textarea
          withAsterisk
          label="Nội dung đánh giá"
          placeholder="Chia sẻ ngắn gọn về lương, quản lý, hợp đồng..."
          minRows={3}
          key={reviewForm.key('content')}
          {...reviewForm.getInputProps('content')}
        />

        <Checkbox
          label="Đã từng làm việc / phỏng vấn tại đây"
          key={reviewForm.key('verifiedWorker')}
          {...reviewForm.getInputProps('verifiedWorker', { type: 'checkbox' })}
        />

        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="xs" fw={600}>
              Ảnh minh chứng
            </Text>
            <Badge size="xs" color="neutral">
              {evidenceImages.length}/3 ảnh
            </Badge>
          </Group>
          <Dropzone
            onDrop={(files) => {
              void handleDropEvidence(files);
            }}
            accept={IMAGE_MIME_TYPE}
            maxSize={5 * 1024 ** 2}
            disabled={evidenceImages.length >= 3}
          >
            <Group justify="center" gap="sm" mih={64} className={classes.dropzoneInner}>
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
              {evidenceImages.map((img, idx) => (
                <Box key={img.id} pos="relative">
                  <Image
                    src={img.url}
                    h={72}
                    radius="sm"
                    fit="cover"
                    alt={`Minh chứng ${idx + 1}`}
                  />
                  <ActionIcon
                    size="xs"
                    color="danger"
                    variant="filled"
                    pos="absolute"
                    top={4}
                    right={4}
                    aria-label={`Xóa ảnh minh chứng ${idx + 1}`}
                    onClick={() =>
                      setEvidenceImages((prev) => prev.filter((item) => item.id !== img.id))
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
          <Button type="submit">Đăng đánh giá</Button>
        </Group>
      </Stack>
    </Box>
  );
}

function QaComposerForm({
  companyOptions,
  defaultCompanyId,
  onClose,
}: {
  companyOptions: CompanyOption[];
  defaultCompanyId: string;
  onClose: () => void;
}) {
  const { actions } = useAppState();

  const qaForm = useForm<QaFormValues>({
    mode: 'uncontrolled',
    initialValues: {
      subType: 'question',
      companyId: defaultCompanyId,
      title: '',
      content: '',
    },
    validate: {
      title: (v) => (v.trim().length < 5 ? 'Tiêu đề tối thiểu 5 ký tự' : null),
      content: (v) => (v.trim().length < 10 ? 'Nội dung tối thiểu 10 ký tự' : null),
    },
  });

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

  return (
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
          label="Cơ sở (tùy chọn)"
          placeholder="Chọn cơ sở liên quan"
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
  );
}

function ShareJobComposerForm({
  companyOptions,
  defaultCompanyId,
  onClose,
  onSharedJobCreated,
}: {
  companyOptions: CompanyOption[];
  defaultCompanyId: string;
  onClose: () => void;
  onSharedJobCreated?: (jobId: string) => void;
}) {
  const { state, actions } = useAppState();

  const shareForm = useForm<ShareJobFormValues>({
    mode: 'uncontrolled',
    initialValues: {
      companyId: defaultCompanyId,
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
    <Box component="form" onSubmit={shareForm.onSubmit(handleSubmitShare)} noValidate>
      <Stack gap="sm">
        <Text size="xs" c="dimmed">
          Tin tuyển dụng uy tín bạn chia sẻ sẽ đi qua bộ khử trùng lặp và xuất hiện ngay dưới dạng
          ghim mới trên Bản đồ MH-01.
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
          <Button type="submit" color="success">
            Chia sẻ lên Bản đồ (+15đ uy tín)
          </Button>
        </Group>
      </Stack>
    </Box>
  );
}

export function PostComposerModal({
  opened,
  onClose,
  defaultMode = 'review',
  prefillCompanyId,
  onSharedJobCreated,
}: PostComposerModalProps) {
  const { state } = useAppState();
  const [mode, setMode] = useState<ComposerMode>(defaultMode);

  useEffect(() => {
    if (opened) {
      setMode(defaultMode);
    }
  }, [opened, defaultMode]);

  const companyOptions = state.companies.map((c) => ({ value: c.id, label: c.name }));
  const prefillKey = prefillCompanyId || 'none';

  return (
    <Modal opened={opened} onClose={onClose} size="lg" title="Đăng bài mới">
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
          <ReviewComposerForm
            key={`review-${prefillKey}`}
            companyOptions={companyOptions}
            defaultCompanyId={prefillCompanyId || state.companies[0]?.id || ''}
            onClose={onClose}
          />
        ) : null}

        {mode === 'qa' ? (
          <QaComposerForm
            key={`qa-${prefillKey}`}
            companyOptions={companyOptions}
            defaultCompanyId={prefillCompanyId || ''}
            onClose={onClose}
          />
        ) : null}

        {mode === 'share' ? (
          <ShareJobComposerForm
            key={`share-${prefillKey}`}
            companyOptions={companyOptions}
            defaultCompanyId={prefillCompanyId || ''}
            onClose={onClose}
            onSharedJobCreated={onSharedJobCreated}
          />
        ) : null}
      </Stack>
    </Modal>
  );
}
