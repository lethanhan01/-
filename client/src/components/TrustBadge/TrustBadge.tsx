import { IconAlertTriangle, IconCertificate, IconStarFilled } from '@tabler/icons-react';
import { Badge, Group, Tooltip } from '@mantine/core';
import { Company } from '../../domain/types';

interface TrustBadgeProps {
  company: Company;
  compact?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 4.3) {
    return 'success';
  }
  if (score >= 3.5) {
    return 'warning';
  }
  return 'danger';
}

export function TrustBadge({ company, compact = false }: TrustBadgeProps) {
  const scoreColor = getScoreColor(company.trustScore);

  return (
    <Group gap="xs" wrap="wrap">
      <Badge color={scoreColor} leftSection={<IconStarFilled size={12} />} className="app-tabular">
        {company.trustScore.toFixed(1)} ({company.reviewCount} đánh giá)
      </Badge>

      {!compact && company.businessLicenseVerified ? (
        <Tooltip label={`Giấy phép KD đã xác thực: ${company.businessLicenseCode ?? ''}`}>
          <Badge color="success" variant="outline" leftSection={<IconCertificate size={12} />}>
            GPKD đã xác thực
          </Badge>
        </Tooltip>
      ) : null}

      {company.warningFlag ? (
        <Badge color="danger" variant="filled" leftSection={<IconAlertTriangle size={12} />}>
          Có cảnh báo cộng đồng
        </Badge>
      ) : null}
    </Group>
  );
}
