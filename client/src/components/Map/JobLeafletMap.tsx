import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Badge,
  Box,
  DEFAULT_THEME,
  Group,
  Paper,
  Stack,
  Text,
  UnstyledButton,
  useMantineColorScheme,
} from '@mantine/core';
import { JOB_STATUS_META } from '../../domain/jobLogic';
import { CanonicalJob, Company, StudentAnchorZone } from '../../domain/types';
import { theme } from '../../theme';
import classes from './JobLeafletMap.module.css';

export interface MapJobItem {
  job: CanonicalJob;
  company: Company;
  distanceKm: number;
  matchPercent: number;
}

interface JobLeafletMapProps {
  center: StudentAnchorZone;
  radiusKm: number | null;
  items: MapJobItem[];
  selectedJobId: string | null;
  onSelectJob: (jobId: string) => void;
}

const STATUS_CSS_VAR: Record<string, { cssVar: string; fallback: string }> = {
  new: {
    cssVar: '--mantine-color-brand-filled',
    fallback: theme.colors?.brand?.[6] ?? DEFAULT_THEME.colors.blue[6],
  },
  urgent: {
    cssVar: '--mantine-color-warning-filled',
    fallback: theme.colors?.amber?.[6] ?? DEFAULT_THEME.colors.yellow[6],
  },
  updated: {
    cssVar: '--mantine-color-success-filled',
    fallback: DEFAULT_THEME.colors.teal[6],
  },
  expiring: {
    cssVar: '--mantine-color-danger-filled',
    fallback: DEFAULT_THEME.colors.red[6],
  },
};

function resolveCssVar(cssVar: string, fallback: string): string {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  return value || fallback;
}

export function JobLeafletMap({
  center,
  radiusKm,
  items,
  selectedJobId,
  onSelectJob,
}: JobLeafletMapProps) {
  const { colorScheme } = useMantineColorScheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const initialCenterRef = useRef(center);
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapInstanceRef.current) {
      return;
    }

    try {
      const initialCenter = initialCenterRef.current;
      const map = L.map(el, {
        center: [initialCenter.lat, initialCenter.lng],
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      const group = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
      layerGroupRef.current = group;

      return () => {
        map.remove();
        mapInstanceRef.current = null;
        layerGroupRef.current = null;
      };
    } catch {
      setMapFailed(true);
      return undefined;
    }
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) {
      return;
    }

    const brandColor = resolveCssVar(STATUS_CSS_VAR.new.cssVar, STATUS_CSS_VAR.new.fallback);
    const bodyColor = resolveCssVar('--mantine-color-body', DEFAULT_THEME.white);
    const textColor = resolveCssVar('--mantine-color-text', DEFAULT_THEME.black);

    map.setView([center.lat, center.lng], radiusKm && radiusKm <= 3 ? 14 : 12, { animate: true });
    group.clearLayers();

    // Anchor marker for the student's current area
    L.circleMarker([center.lat, center.lng], {
      radius: 8,
      color: bodyColor,
      weight: 2,
      fillColor: textColor,
      fillOpacity: 1,
    })
      .bindTooltip(`Vị trí của bạn: ${center.label}`)
      .addTo(group);

    if (radiusKm && radiusKm > 0) {
      L.circle([center.lat, center.lng], {
        radius: radiusKm * 1000,
        color: brandColor,
        weight: 1.5,
        dashArray: '6 6',
        fillColor: brandColor,
        fillOpacity: 0.06,
      }).addTo(group);
    }

    for (const item of items) {
      const isSelected = item.job.id === selectedJobId;
      const statusToken = STATUS_CSS_VAR[item.job.status] ?? STATUS_CSS_VAR.new;
      const color = resolveCssVar(statusToken.cssVar, statusToken.fallback);
      const marker = L.circleMarker([item.company.lat, item.company.lng], {
        radius: isSelected ? 12 : 9,
        color: isSelected ? textColor : bodyColor,
        weight: isSelected ? 3 : 2,
        fillColor: color,
        fillOpacity: 0.95,
      });

      marker.bindTooltip(
        `${item.company.name} • ${(item.job.hourlyWageVnd / 1000).toFixed(0)}k/h (${JOB_STATUS_META[item.job.status].label})`
      );
      marker.on('click', () => onSelectJob(item.job.id));
      marker.addTo(group);
    }
  }, [center, radiusKm, items, selectedJobId, onSelectJob, colorScheme]);

  if (mapFailed) {
    return (
      <Paper withBorder p="md" radius="md">
        <Stack gap="xs">
          <Text size="sm" fw={600}>
            Bản đồ ghim việc làm quanh {center.label}
          </Text>
          <Group gap="xs">
            {items.map((item) => (
              <UnstyledButton key={item.job.id} onClick={() => onSelectJob(item.job.id)}>
                <Badge
                  color={JOB_STATUS_META[item.job.status].color}
                  variant={item.job.id === selectedJobId ? 'filled' : 'light'}
                >
                  {item.company.name} • {item.distanceKm.toFixed(1)} km
                </Badge>
              </UnstyledButton>
            ))}
          </Group>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack gap="xs">
      {/* Leaflet requires a direct DOM container node to mount interactive map tiles and markers */}
      <Box ref={containerRef} className={classes.mapContainer} aria-label="Bản đồ việc làm thêm" />
      <Group gap="xs" wrap="wrap">
        {(['new', 'urgent', 'updated', 'expiring'] as const).map((statusKey) => (
          <Badge key={statusKey} size="xs" color={JOB_STATUS_META[statusKey].color} variant="dot">
            {JOB_STATUS_META[statusKey].label}
          </Badge>
        ))}
      </Group>
    </Stack>
  );
}
