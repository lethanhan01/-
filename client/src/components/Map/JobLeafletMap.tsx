import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Badge, Box, Group, Paper, Stack, Text, UnstyledButton } from '@mantine/core';
import { JOB_STATUS_META } from '../../domain/jobLogic';
import { CanonicalJob, Company, StudentAnchorZone } from '../../domain/types';

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

const STATUS_HEX: Record<string, string> = {
  new: '#2454E8',
  urgent: '#D97706',
  updated: '#0D9488',
  expiring: '#DC2626',
};

export function JobLeafletMap({
  center,
  radiusKm,
  items,
  selectedJobId,
  onSelectJob,
}: JobLeafletMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapInstanceRef.current) {
      return;
    }

    try {
      const map = L.map(el, {
        center: [center.lat, center.lng],
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

    map.setView([center.lat, center.lng], radiusKm && radiusKm <= 3 ? 14 : 12, { animate: true });
    group.clearLayers();

    // Anchor marker for the student's current area
    L.circleMarker([center.lat, center.lng], {
      radius: 8,
      color: '#FFFFFF',
      weight: 2,
      fillColor: '#0F172A',
      fillOpacity: 1,
    })
      .bindTooltip(`Vị trí của bạn: ${center.label}`)
      .addTo(group);

    if (radiusKm && radiusKm > 0) {
      L.circle([center.lat, center.lng], {
        radius: radiusKm * 1000,
        color: '#2454E8',
        weight: 1.5,
        dashArray: '6 6',
        fillColor: '#2454E8',
        fillOpacity: 0.06,
      }).addTo(group);
    }

    for (const item of items) {
      const isSelected = item.job.id === selectedJobId;
      const color = STATUS_HEX[item.job.status] ?? '#2454E8';
      const marker = L.circleMarker([item.company.lat, item.company.lng], {
        radius: isSelected ? 12 : 9,
        color: isSelected ? '#0F172A' : '#FFFFFF',
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
  }, [center, radiusKm, items, selectedJobId, onSelectJob]);

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
      <Box ref={containerRef} className="app-map-container" aria-label="Bản đồ việc làm thêm" />
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
