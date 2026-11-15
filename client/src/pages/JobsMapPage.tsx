import { useMemo, useState } from 'react';
import {
  IconArrowRight,
  IconClockCheck,
  IconFilter,
  IconMapPin,
  IconRefresh,
} from '@tabler/icons-react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Chip,
  Grid,
  Group,
  Popover,
  Select,
  Stack,
  Switch,
  Text,
  Title,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { JobLeafletMap, MapJobItem } from '../components/Map/JobLeafletMap';
import { TrustBadge } from '../components/TrustBadge/TrustBadge';
import { ANCHOR_ZONES } from '../data/seedData';
import {
  computeJobScheduleMatch,
  formatVnd,
  haversineDistanceKm,
  JOB_STATUS_META,
} from '../domain/jobLogic';
import {
  BusyScheduleMap,
  CanonicalJob,
  Company,
  ShiftPeriod,
  StudentAnchorZone,
} from '../domain/types';
import { useAppState } from '../state/AppStateContext';
import classes from './JobsMapPage.module.css';

type MapJobListEntry = MapJobItem & {
  matchingShiftCount: number;
  totalShiftCount: number;
};

function buildFilteredJobItems(params: {
  canonicalJobs: CanonicalJob[];
  companyMap: Map<string, Company>;
  anchorZone: StudentAnchorZone;
  radiusVal: number;
  wageVal: number;
  trustVal: number;
  selectedPeriods: ShiftPeriod[];
  busySchedule: BusyScheduleMap;
  onlyMatchingSchedule: boolean;
}): MapJobListEntry[] {
  const {
    canonicalJobs,
    companyMap,
    anchorZone,
    radiusVal,
    wageVal,
    trustVal,
    selectedPeriods,
    busySchedule,
    onlyMatchingSchedule,
  } = params;

  const results: MapJobListEntry[] = [];

  for (const job of canonicalJobs) {
    const company = companyMap.get(job.companyId);
    if (!company) {
      continue;
    }

    const distanceKm = haversineDistanceKm(
      anchorZone.lat,
      anchorZone.lng,
      company.lat,
      company.lng
    );

    const failsNumericFilter =
      (radiusVal > 0 && distanceKm > radiusVal) ||
      job.hourlyWageVnd < wageVal ||
      company.trustScore < trustVal;
    const failsPeriodFilter =
      selectedPeriods.length > 0 && !job.shifts.some((s) => selectedPeriods.includes(s.period));

    if (failsNumericFilter || failsPeriodFilter) {
      continue;
    }

    const scheduleMatch = computeJobScheduleMatch(job.shifts, busySchedule);
    if (onlyMatchingSchedule && !scheduleMatch.isMatch) {
      continue;
    }

    results.push({
      job,
      company,
      distanceKm,
      matchPercent: scheduleMatch.matchPercent,
      matchingShiftCount: scheduleMatch.matchingCount,
      totalShiftCount: scheduleMatch.totalCount,
    });
  }

  results.sort((a, b) => {
    if (b.matchPercent !== a.matchPercent) {
      return b.matchPercent - a.matchPercent;
    }
    return a.distanceKm - b.distanceKm;
  });

  return results;
}

function JobListCard({
  item,
  isSelected,
  onSelect,
}: {
  item: MapJobListEntry;
  isSelected: boolean;
  onSelect: (jobId: string) => void;
}) {
  return (
    <Card p="sm" className={classes.selectableCard} mod={{ selected: isSelected }}>
      <Stack gap={6}>
        <Group justify="space-between" wrap="nowrap">
          <Badge size="xs" color={JOB_STATUS_META[item.job.status].color}>
            {JOB_STATUS_META[item.job.status].label}
          </Badge>
          <Badge
            size="xs"
            color={item.matchingShiftCount > 0 ? 'success' : 'danger'}
            leftSection={<IconClockCheck size={12} />}
          >
            {item.matchingShiftCount}/{item.totalShiftCount} ca khớp lịch
          </Badge>
        </Group>

        <UnstyledButton
          onClick={() => onSelect(item.job.id)}
          ta="left"
          className={classes.titleButton}
        >
          <Text size="sm" fw={700}>
            {item.job.title}
          </Text>
        </UnstyledButton>

        <Group justify="space-between" wrap="wrap" gap="xs">
          <Text size="xs" c="dimmed">
            {item.company.name}
          </Text>
          <Text size="xs" fw={700} c="success" className="app-tabular">
            {formatVnd(item.job.hourlyWageVnd)}/giờ
          </Text>
        </Group>

        <Group justify="space-between" align="center" wrap="wrap">
          <Group gap="xs">
            <Badge
              size="xs"
              variant="outline"
              color="neutral"
              leftSection={<IconMapPin size={11} />}
            >
              {item.distanceKm.toFixed(1)} km
            </Badge>
            {item.job.duplicateCount > 1 ? (
              <Badge size="xs" color="brand" variant="light">
                Gộp {item.job.duplicateCount} nguồn
              </Badge>
            ) : null}
          </Group>
          <Button
            component={Link}
            to={`/jobs/${item.job.id}`}
            size="xs"
            variant={isSelected ? 'filled' : 'light'}
          >
            Chi tiết
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}

export function JobsMapPage() {
  const [searchParams] = useSearchParams();
  const highlightJobId = searchParams.get('highlightJobId');

  const { state, derived, actions } = useAppState();
  const [onlyMatchingSchedule, setOnlyMatchingSchedule] = useState(false);
  const [radiusKm, setRadiusKm] = useState<string>('10');
  const [minWage, setMinWage] = useState<string>('0');
  const [minTrust, setMinTrust] = useState<string>('0');
  const [selectedPeriods, setSelectedPeriods] = useState<ShiftPeriod[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(highlightJobId);
  const [filtersOpened, { toggle: toggleFilters }] = useDisclosure(false);

  const anchorZone = useMemo(
    () => ANCHOR_ZONES.find((z) => z.id === state.profile.anchorZoneId) ?? ANCHOR_ZONES[0],
    [state.profile.anchorZoneId]
  );

  const companyMap = useMemo(
    () => new Map(state.companies.map((c) => [c.id, c])),
    [state.companies]
  );

  const filteredItems = useMemo(
    () =>
      buildFilteredJobItems({
        canonicalJobs: derived.canonicalJobs,
        companyMap,
        anchorZone,
        radiusVal: Number(radiusKm),
        wageVal: Number(minWage),
        trustVal: Number(minTrust),
        selectedPeriods,
        busySchedule: state.busySchedule,
        onlyMatchingSchedule,
      }),
    [
      derived.canonicalJobs,
      companyMap,
      anchorZone,
      radiusKm,
      minWage,
      minTrust,
      selectedPeriods,
      state.busySchedule,
      onlyMatchingSchedule,
    ]
  );

  const activeItem =
    filteredItems.find((item) => item.job.id === selectedJobId) ?? filteredItems[0] ?? null;

  return (
    <Stack gap="md">
      <Group justify="flex-end" gap="xs">
        <Popover
          opened={filtersOpened}
          onChange={(opened) => {
            if (opened !== filtersOpened) {
              toggleFilters();
            }
          }}
          width={420}
          position="bottom-end"
          withArrow
          trapFocus
          shadow="md"
        >
          <Popover.Target>
            <ActionIcon
              variant="light"
              color="brand"
              aria-label={filtersOpened ? 'Đóng bộ lọc' : 'Mở bộ lọc'}
              aria-expanded={filtersOpened}
              onClick={toggleFilters}
            >
              <IconFilter size={17} />
            </ActionIcon>
          </Popover.Target>
          <Popover.Dropdown>
            <Stack gap="sm">
              <Switch
                label="Chỉ hiện việc khớp lịch rảnh"
                checked={onlyMatchingSchedule}
                onChange={(e) => setOnlyMatchingSchedule(e.currentTarget.checked)}
                color="success"
              />

              <Grid gap="sm">
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Select
                    label="Bán kính quanh khu vực"
                    value={radiusKm}
                    onChange={(v) => setRadiusKm(v ?? '0')}
                    data={[
                      { value: '2', label: 'Trong vòng 2 km' },
                      { value: '5', label: 'Trong vòng 5 km' },
                      { value: '10', label: 'Trong vòng 10 km' },
                      { value: '0', label: 'Toàn TP.HCM' },
                    ]}
                    allowDeselect={false}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Select
                    label="Mức lương tối thiểu"
                    value={minWage}
                    onChange={(v) => setMinWage(v ?? '0')}
                    data={[
                      { value: '0', label: 'Tất cả mức lương' },
                      { value: '25000', label: 'Từ 25.000đ/giờ' },
                      { value: '30000', label: 'Từ 30.000đ/giờ' },
                      { value: '40000', label: 'Từ 40.000đ/giờ' },
                    ]}
                    allowDeselect={false}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Select
                    label="Điểm uy tín cơ sở"
                    value={minTrust}
                    onChange={(v) => setMinTrust(v ?? '0')}
                    data={[
                      { value: '0', label: 'Tất cả (bao gồm tin cảnh báo)' },
                      { value: '3.5', label: 'Từ 3.5 ★ trở lên' },
                      { value: '4.5', label: 'Từ 4.5 ★ (Uy tín cao)' },
                    ]}
                    allowDeselect={false}
                  />
                </Grid.Col>
              </Grid>

              <Group gap="xs" align="center" wrap="wrap">
                <Text size="xs" fw={600} c="dimmed">
                  Ca làm việc:
                </Text>
                <Chip.Group
                  multiple
                  value={selectedPeriods}
                  onChange={(vals) => setSelectedPeriods(vals as ShiftPeriod[])}
                >
                  <Group gap="xs">
                    <Chip value="morning" size="xs">
                      Ca Sáng
                    </Chip>
                    <Chip value="afternoon" size="xs">
                      Ca Chiều
                    </Chip>
                    <Chip value="evening" size="xs">
                      Ca Tối
                    </Chip>
                    <Chip value="weekend" size="xs">
                      Cuối tuần
                    </Chip>
                  </Group>
                </Chip.Group>
              </Group>
            </Stack>
          </Popover.Dropdown>
        </Popover>

        <Tooltip label="Đồng bộ trạng thái thời gian thực">
          <ActionIcon
            variant="light"
            color="brand"
            aria-label="Đồng bộ trạng thái thời gian thực"
            onClick={actions.simulateRealtimeTick}
          >
            <IconRefresh size={17} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Grid gap="md">
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Stack gap="md">
            <JobLeafletMap
              center={anchorZone}
              radiusKm={Number(radiusKm) > 0 ? Number(radiusKm) : null}
              items={filteredItems}
              selectedJobId={activeItem?.job.id ?? null}
              onSelectJob={(jobId) => setSelectedJobId(jobId)}
            />

            {activeItem ? (
              <Card p="md" className={classes.detailCard}>
                <Stack gap="xs">
                  <Group justify="space-between" wrap="wrap">
                    <Badge color={JOB_STATUS_META[activeItem.job.status].color}>
                      {JOB_STATUS_META[activeItem.job.status].label}
                    </Badge>
                    <Group gap="xs">
                      {activeItem.job.duplicateCount > 1 ? (
                        <Badge color="brand" variant="outline">
                          Gộp từ {activeItem.job.duplicateCount} nguồn
                        </Badge>
                      ) : null}
                      <Badge color={activeItem.matchPercent > 0 ? 'success' : 'neutral'}>
                        Khớp {activeItem.matchPercent}% lịch rảnh
                      </Badge>
                    </Group>
                  </Group>

                  <Title order={2} size="h4">
                    {activeItem.job.title}
                  </Title>
                  <Text size="sm" fw={600} c="brand">
                    {activeItem.company.name}
                  </Text>
                  <Group gap="md" wrap="wrap">
                    <Text size="sm" fw={700} c="success" className="app-tabular">
                      {formatVnd(activeItem.job.hourlyWageVnd)}/giờ
                    </Text>
                    <Text size="xs" c="dimmed" className="app-tabular">
                      Cách {activeItem.distanceKm.toFixed(1)} km • {activeItem.company.address}
                    </Text>
                  </Group>

                  <TrustBadge company={activeItem.company} compact />

                  <Group justify="flex-end" mt="xs">
                    <Button
                      component={Link}
                      to={`/jobs/${activeItem.job.id}`}
                      rightSection={<IconArrowRight size={16} />}
                    >
                      Xem chi tiết công việc & công ty
                    </Button>
                  </Group>
                </Stack>
              </Card>
            ) : (
              <Card p="lg">
                <Text size="sm" c="dimmed" ta="center">
                  Không có công việc nào khớp bộ lọc hiện tại. Hãy nới rộng bán kính hoặc tắt bớt
                  điều kiện lọc.
                </Text>
              </Card>
            )}
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 5 }}>
          <Stack gap="sm">
            <Group justify="space-between">
              <Title order={2} size="h4">
                Danh sách việc làm ({filteredItems.length})
              </Title>
            </Group>

            {filteredItems.map((item) => (
              <JobListCard
                key={item.job.id}
                item={item}
                isSelected={activeItem?.job.id === item.job.id}
                onSelect={setSelectedJobId}
              />
            ))}
          </Stack>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
