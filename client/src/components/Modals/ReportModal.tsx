import { Box, Button, Checkbox, Group, Modal, Stack, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useAppState } from '../../state/AppStateContext';

interface ReportModalProps {
  opened: boolean;
  onClose: () => void;
  companyId: string;
  companyName: string;
  jobId: string;
}

const REPORT_REASONS = [
  'Yêu cầu đóng tiền đặt cọc / phí giữ chỗ / đồng phục',
  'Yêu cầu giữ căn cước công dân hoặc giấy tờ tùy thân gốc',
  'Thông tin mức lương hoặc địa chỉ làm việc sai sự thật',
  'Dấu hiệu đa cấp hoặc lôi kéo chuyển sang công việc khác',
];

interface ReportFormValues {
  reasons: string[];
  details: string;
}

export function ReportModal({ opened, onClose, companyId, jobId }: ReportModalProps) {
  const { actions } = useAppState();

  const form = useForm<ReportFormValues>({
    mode: 'uncontrolled',
    initialValues: {
      reasons: [],
      details: '',
    },
    validate: {
      reasons: (val) => (val.length === 0 ? 'Vui lòng chọn ít nhất 1 dấu hiệu vi phạm' : null),
      details: (val) =>
        val.trim().length < 10
          ? 'Mô tả chi tiết tối thiểu 10 ký tự để ban quản trị xác minh'
          : null,
    },
  });

  const handleSubmit = (values: ReportFormValues) => {
    actions.submitScamReport({
      companyId,
      jobId,
      reasons: values.reasons,
      details: values.details.trim(),
    });
    form.reset();
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Báo cáo công việc này">
      <Box component="form" onSubmit={form.onSubmit(handleSubmit)} noValidate>
        <Stack gap="md">

          <Checkbox.Group
            label="Chọn dấu hiệu vi phạm bạn gặp phải"
            withAsterisk
            key={form.key('reasons')}
            {...form.getInputProps('reasons')}
          >
            <Stack gap="xs" mt="xs">
              {REPORT_REASONS.map((reason) => (
                <Checkbox key={reason} value={reason} label={reason} />
              ))}
            </Stack>
          </Checkbox.Group>

          <Textarea
            withAsterisk
            label="Mô tả chi tiết tình huống hoặc bằng chứng"
            placeholder="Ví dụ: Khi tới phỏng vấn tại địa chỉ..., người tuyển dụng yêu cầu nộp 400.000đ..."
            minRows={3}
            key={form.key('details')}
            {...form.getInputProps('details')}
          />

          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" color="danger">
              Gửi báo cáo ngay
            </Button>
          </Group>
        </Stack>
      </Box>
    </Modal>
  );
}
