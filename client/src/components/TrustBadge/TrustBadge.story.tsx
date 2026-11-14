import type { Meta, StoryObj } from '@storybook/react';
import { Stack } from '@mantine/core';
import type { Company } from '../../domain/types';
import { TrustBadge } from './TrustBadge';

const BASE_COMPANY: Company = {
  id: 'comp-demo',
  name: 'Highlands Coffee - Cơ sở Linh Trung',
  category: 'F&B / Pha chế',
  address: '120 Hoàng Diệu 2, Linh Trung, Thủ Đức',
  district: 'TP. Thủ Đức',
  lat: 10.858,
  lng: 106.768,
  trustScore: 4.7,
  reviewCount: 38,
  businessLicenseVerified: true,
  businessLicenseCode: '0312345678',
  mapVerified: true,
  warningFlag: null,
  photos: [],
};

const meta: Meta<typeof TrustBadge> = {
  title: 'Components/TrustBadge',
  component: TrustBadge,
};

export default meta;
type Story = StoryObj<typeof TrustBadge>;

export const Variants: Story = {
  render: () => (
    <Stack gap="md" p="md">
      <TrustBadge company={BASE_COMPANY} />
      <TrustBadge
        company={{
          ...BASE_COMPANY,
          trustScore: 3.1,
          reviewCount: 12,
          businessLicenseVerified: false,
          mapVerified: false,
          warningFlag: 'Cảnh báo thu phí đồng phục trước khi ký hợp đồng.',
        }}
      />
      <TrustBadge company={BASE_COMPANY} compact />
    </Stack>
  ),
};
