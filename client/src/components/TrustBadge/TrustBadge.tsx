import {
  IconAlertTriangle,
  IconCertificate,
  IconMapPinCheck,
  IconStarFilled,
} from '@tabler/icons-react';
import { Badge, Group, Tooltip } from '@mantine/core';
import { Company } from '../../domain/types';

interface TrustBadgeProps {
  company: Company;
  compact?: boolean;
}

export function TrustBadge({ company, compact = false }: TrustBadgeProps) {
  const scoreColor =
    company.trustScore >= 4.3 ? 'teal' : company.trustScore >= 3.5 ? 'amber' : 'red';

  return (
    <Group gap="xs" wrap="wrap">
      <Badge color={scoreColor} leftSection={<IconStarFilled size={12} />} className="app-tabular">
        {company.trustScore.toFixed(1)} ({company.reviewCount} đánh giá)
      </Badge>

      {!compact && company.businessLicenseVerified ? (
        <Tooltip label={`Giấy phép KD đã xác thực: ${company.businessLicenseCode ?? ''}`}>
          <Badge color="teal" variant="outline" leftSection={<IconCertificate size={12} />}>
            GPKD đã xác thực
          </Badge>
        </Tooltip>
      ) : null}

      {!compact && company.mapVerified ? (
        <Badge color="brand" variant="outline" leftSection={<IconMapPinCheck size={12} />}>
          Địa chỉ khớp bản đồ
        </Badge>
      ) : null}

      {company.warningFlag ? (
        <Badge color="red" variant="filled" leftSection={<IconAlertTriangle size={12} />}>
          Có cảnh báo cộng đồng
        </Badge>
      ) : null}
    </Group>
  );
}
