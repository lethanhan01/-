import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Map as OpenMap,
  Marker,
  NavigationControl,
  Popup,
  type GeoJSONSource,
  type StyleSpecification,
} from '@openmapvn/openmapvn-gl';
import { IconCurrentLocation } from '@tabler/icons-react';
import {
  ActionIcon,
  Badge,
  Box,
  Group,
  Paper,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
  useComputedColorScheme,
} from '@mantine/core';
import { JOB_STATUS_META } from '../../domain/jobLogic';
import { CanonicalJob, Company, StudentAnchorZone } from '../../domain/types';
import { theme } from '../../theme';
import classes from './JobOpenMap.module.css';

export interface MapJobItem {
  job: CanonicalJob;
  company: Company;
  distanceKm: number;
  matchPercent: number;
}

interface JobOpenMapProps {
  center: StudentAnchorZone;
  radiusKm: number | null;
  items: MapJobItem[];
  selectedJobId: string | null;
  onSelectJob: (jobId: string) => void;
}

interface UserLocationState {
  lat: number;
  lng: number;
  source: 'gps' | 'fallback';
}

const HANOI_DEFAULT_CENTER: StudentAnchorZone = {
  id: 'zone-bach-khoa-hn',
  label: 'Khu vực Hà Nội (ĐH Bách khoa)',
  lat: 21.0056,
  lng: 105.8431,
};

const MAP_VISIBLE_STATUSES = ['new', 'urgent', 'expiring'] as const;
const RADIUS_SOURCE_ID = 'job-radius-source';
const RADIUS_FILL_LAYER_ID = 'job-radius-fill';
const RADIUS_LINE_LAYER_ID = 'job-radius-line';

function resolveHanoiCenter(zone: StudentAnchorZone): StudentAnchorZone {
  const isInHanoiBounds =
    zone.lat >= 20.5 && zone.lat <= 21.5 && zone.lng >= 105.2 && zone.lng <= 106.2;
  return isInHanoiBounds ? zone : HANOI_DEFAULT_CENTER;
}

function getOpenMapApiKey(): string {
  return import.meta.env.VITE_OPENMAPVN_API_KEY?.trim() ?? '';
}

function buildFallbackMapStyle(colorScheme: 'light' | 'dark'): StyleSpecification {
  const tilePath = colorScheme === 'dark' ? 'dark_all' : 'rastertiles/voyager';
  return {
    version: 8,
    sources: {
      carto: {
        type: 'raster',
        tiles: [
          `https://a.basemaps.cartocdn.com/${tilePath}/{z}/{x}/{y}.png`,
          `https://b.basemaps.cartocdn.com/${tilePath}/{z}/{x}/{y}.png`,
          `https://c.basemaps.cartocdn.com/${tilePath}/{z}/{x}/{y}.png`,
        ],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      },
    },
    layers: [
      {
        id: 'carto-tiles',
        type: 'raster',
        source: 'carto',
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  };
}

function buildMapStyle(colorScheme: 'light' | 'dark'): string | StyleSpecification {
  const apiKey = getOpenMapApiKey();
  if (apiKey) {
    const styleName = colorScheme === 'dark' ? 'night-v1' : 'day-v1';
    return `https://maptiles.openmap.vn/styles/${styleName}/style.json?apikey=${encodeURIComponent(apiKey)}`;
  }

  return buildFallbackMapStyle(colorScheme);
}

function resolveBrandColor(): string {
  const fallback = theme.colors?.brand?.[6] ?? '';
  if (typeof window === 'undefined') {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue('--mantine-color-brand-filled')
    .trim();
  return value || fallback;
}

function createCircleFeature(
  lng: number,
  lat: number,
  radiusKm: number
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  const steps = 64;
  const coords: [number, number][] = [];
  const distanceX = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const distanceY = radiusKm / 110.574;

  for (let i = 0; i <= steps; i += 1) {
    const theta = (i / steps) * (2 * Math.PI);
    coords.push([lng + distanceX * Math.cos(theta), lat + distanceY * Math.sin(theta)]);
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [coords],
        },
      },
    ],
  };
}

function syncRadiusOverlay(
  map: OpenMap,
  center: StudentAnchorZone,
  radiusKm: number | null,
  brandColor: string
) {
  if (!map.isStyleLoaded()) {
    return;
  }

  const data: GeoJSON.FeatureCollection<GeoJSON.Polygon> =
    radiusKm && radiusKm > 0
      ? createCircleFeature(center.lng, center.lat, radiusKm)
      : { type: 'FeatureCollection', features: [] };

  const existingSource = map.getSource(RADIUS_SOURCE_ID) as GeoJSONSource | undefined;
  if (existingSource) {
    existingSource.setData(data);
    return;
  }

  map.addSource(RADIUS_SOURCE_ID, { type: 'geojson', data });
  map.addLayer({
    id: RADIUS_FILL_LAYER_ID,
    type: 'fill',
    source: RADIUS_SOURCE_ID,
    paint: {
      'fill-color': brandColor,
      'fill-opacity': 0.08,
    },
  });
  map.addLayer({
    id: RADIUS_LINE_LAYER_ID,
    type: 'line',
    source: RADIUS_SOURCE_ID,
    paint: {
      'line-color': brandColor,
      'line-width': 1.5,
      'line-dasharray': [4, 4],
    },
  });
}

function formatJobTooltip(item: MapJobItem): string {
  return `${item.company.name} • ${(item.job.hourlyWageVnd / 1000).toFixed(0)}k/h (${JOB_STATUS_META[item.job.status].label})`;
}

export function JobOpenMap({
  center,
  radiusKm,
  items,
  selectedJobId,
  onSelectJob,
}: Readonly<JobOpenMapProps>) {
  const computedColorScheme = useComputedColorScheme('light');
  const resolvedCenter = useMemo(() => resolveHanoiCenter(center), [center]);
  const visibleItems = useMemo(
    () => items.filter((item) => item.job.status !== 'updated'),
    [items]
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<OpenMap | null>(null);
  const jobMarkersRef = useRef<Marker[]>([]);
  const userMarkerRef = useRef<Marker | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const onSelectJobRef = useRef(onSelectJob);
  onSelectJobRef.current = onSelectJob;

  const initialCenterRef = useRef(resolvedCenter);
  const initialColorSchemeRef = useRef(computedColorScheme);
  const mountedColorSchemeRef = useRef(computedColorScheme);
  const latestColorSchemeRef = useRef(computedColorScheme);
  latestColorSchemeRef.current = computedColorScheme;
  const usingFallbackStyleRef = useRef(!getOpenMapApiKey());
  const selectedJobIdRef = useRef<string | null>(selectedJobId);
  selectedJobIdRef.current = selectedJobId;
  const prevSelectedJobIdRef = useRef<string | null>(selectedJobId);
  const latestOverlayRef = useRef({ center: resolvedCenter, radiusKm });
  latestOverlayRef.current = { center: resolvedCenter, radiusKm };

  const [mapFailed, setMapFailed] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocationState>(() => ({
    lat: resolvedCenter.lat,
    lng: resolvedCenter.lng,
    source: 'fallback',
  }));

  const requestCurrentPosition = useCallback((flyAfter: boolean) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next: UserLocationState = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          source: 'gps',
        };
        setUserLocation(next);
        setIsLocating(false);

        if (flyAfter && mapRef.current) {
          mapRef.current.flyTo({
            center: [next.lng, next.lat],
            zoom: 14.5,
            essential: true,
          });
        }
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 60_000 }
    );
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) {
      return undefined;
    }

    try {
      const startCenter = initialCenterRef.current;
      const map = new OpenMap({
        container: el,
        style: buildMapStyle(initialColorSchemeRef.current),
        center: [startCenter.lng, startCenter.lat],
        zoom: 13,
      });

      map.addControl(new NavigationControl({ showCompass: false }), 'top-right');

      const handleStyleLoad = () => {
        const { center: overlayCenter, radiusKm: overlayRadius } = latestOverlayRef.current;
        syncRadiusOverlay(map, overlayCenter, overlayRadius, resolveBrandColor());
      };
      const handleMapError = () => {
        if (map.isStyleLoaded()) {
          return;
        }
        if (!usingFallbackStyleRef.current) {
          usingFallbackStyleRef.current = true;
          map.setStyle(buildFallbackMapStyle(latestColorSchemeRef.current));
          return;
        }
        setMapFailed(true);
      };

      map.on('style.load', handleStyleLoad);
      map.on('error', handleMapError);

      mapRef.current = map;
      popupRef.current = new Popup({
        closeButton: false,
        offset: 14,
        className: classes.mapPopup,
      });

      // Imperatively resize the WebGL canvas on sidebar toggle without triggering React re-renders
      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          map.resize();
        });
        resizeObserver.observe(el);
      }

      return () => {
        resizeObserver?.disconnect();
        map.off('style.load', handleStyleLoad);
        map.off('error', handleMapError);
        popupRef.current?.remove();
        popupRef.current = null;
        userMarkerRef.current?.remove();
        userMarkerRef.current = null;
        for (const marker of jobMarkersRef.current) {
          marker.remove();
        }
        jobMarkersRef.current = [];
        map.remove();
        mapRef.current = null;
      };
    } catch {
      setMapFailed(true);
      return undefined;
    }
  }, []);

  useEffect(() => {
    requestCurrentPosition(false);
  }, [requestCurrentPosition]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    if (mountedColorSchemeRef.current === computedColorScheme) {
      return;
    }
    mountedColorSchemeRef.current = computedColorScheme;
    map.setStyle(
      usingFallbackStyleRef.current
        ? buildFallbackMapStyle(computedColorScheme)
        : buildMapStyle(computedColorScheme)
    );
  }, [computedColorScheme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    syncRadiusOverlay(map, resolvedCenter, radiusKm, resolveBrandColor());
  }, [resolvedCenter, radiusKm, computedColorScheme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    userMarkerRef.current?.remove();
    const el = document.createElement('button');
    el.type = 'button';
    el.className = classes.userLocationPin;
    el.setAttribute('aria-label', 'Vị trí hiện tại của bạn');
    el.title = 'Vị trí hiện tại của bạn';

    const popupText =
      userLocation.source === 'gps'
        ? 'Vị trí hiện tại của bạn (GPS)'
        : `Vị trí hiện tại của bạn (${resolvedCenter.label})`;

    el.addEventListener('click', (event) => {
      event.stopPropagation();
      if (popupRef.current && mapRef.current) {
        popupRef.current
          .setLngLat([userLocation.lng, userLocation.lat])
          .setText(popupText)
          .addTo(mapRef.current);
      }
    });

    userMarkerRef.current = new Marker({ element: el, anchor: 'center' })
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(map);
  }, [userLocation, resolvedCenter.label]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    for (const marker of jobMarkersRef.current) {
      marker.remove();
    }
    jobMarkersRef.current = [];

    for (const item of visibleItems) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = classes.jobPin;
      el.dataset.jobId = item.job.id;
      el.dataset.status = item.job.status;
      el.dataset.selected = item.job.id === selectedJobIdRef.current ? 'true' : 'false';
      const label = formatJobTooltip(item);
      el.setAttribute('aria-label', label);
      el.title = label;

      el.addEventListener('click', (event) => {
        event.stopPropagation();
        onSelectJobRef.current(item.job.id);
        if (popupRef.current && mapRef.current) {
          popupRef.current
            .setLngLat([item.company.lng, item.company.lat])
            .setText(label)
            .addTo(mapRef.current);
        }
      });

      const marker = new Marker({ element: el, anchor: 'center' })
        .setLngLat([item.company.lng, item.company.lat])
        .addTo(map);
      jobMarkersRef.current.push(marker);
    }
  }, [visibleItems]);

  useEffect(() => {
    for (const marker of jobMarkersRef.current) {
      const el = marker.getElement();
      el.dataset.selected = el.dataset.jobId === selectedJobId ? 'true' : 'false';
    }

    const map = mapRef.current;
    if (!map || !selectedJobId || prevSelectedJobIdRef.current === selectedJobId) {
      prevSelectedJobIdRef.current = selectedJobId;
      return;
    }
    prevSelectedJobIdRef.current = selectedJobId;

    const selected = visibleItems.find((item) => item.job.id === selectedJobId);
    if (!selected) {
      return;
    }

    map.panTo([selected.company.lng, selected.company.lat], { duration: 400 });
    popupRef.current
      ?.setLngLat([selected.company.lng, selected.company.lat])
      .setText(formatJobTooltip(selected))
      .addTo(map);
  }, [selectedJobId, visibleItems]);

  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 14.5,
        essential: true,
      });
    }
    if (userLocation.source !== 'gps') {
      requestCurrentPosition(true);
    }
  };

  const legend = (
    <Paper withBorder radius="md" p="sm">
      <Group gap="lg" wrap="wrap" align="center">
        {MAP_VISIBLE_STATUSES.map((statusKey) => (
          <Group key={statusKey} gap="xs" wrap="nowrap">
            <Box className={classes.legendPin} mod={{ status: statusKey }} aria-hidden="true" />
            <Text size="sm" fw={600}>
              {JOB_STATUS_META[statusKey].label}
            </Text>
          </Group>
        ))}
        <Group gap="xs" wrap="nowrap">
          <Box className={classes.legendPin} mod={{ kind: 'user' }} aria-hidden="true" />
          <Text size="sm" fw={600}>
            Vị trí của bạn
          </Text>
        </Group>
      </Group>
    </Paper>
  );

  if (mapFailed) {
    return (
      <Stack gap="xs">
        <Paper withBorder p="md" radius="md">
          <Stack gap="xs">
            <Group justify="space-between" wrap="wrap">
              <Text size="sm" fw={600}>
                Bản đồ ghim việc làm quanh {resolvedCenter.label}
              </Text>
              <ButtonFallbackLocate loading={isLocating} onClick={handleRecenter} />
            </Group>
            <Group gap="xs">
              {visibleItems.map((item) => (
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
        {legend}
      </Stack>
    );
  }

  return (
    <Stack gap="xs">
      <Box className={classes.mapWrapper}>
        {/* @openmapvn/openmapvn-gl requires a direct DOM container node to mount WebGL canvas and markers */}
        <Box
          ref={containerRef}
          className={classes.mapContainer}
          aria-label="Bản đồ việc làm thêm tại Hà Nội"
        />
        <Tooltip label="Quay về vị trí hiện tại" position="left">
          <ActionIcon
            className={classes.locateButton}
            variant="filled"
            color="brand"
            size="lg"
            radius="xl"
            loading={isLocating}
            aria-label="Quay về vị trí hiện tại"
            onClick={handleRecenter}
          >
            <IconCurrentLocation size={18} />
          </ActionIcon>
        </Tooltip>
      </Box>
      {legend}
    </Stack>
  );
}

function ButtonFallbackLocate({
  loading,
  onClick,
}: Readonly<{ loading: boolean; onClick: () => void }>) {
  return (
    <Tooltip label="Quay về vị trí hiện tại">
      <ActionIcon
        variant="light"
        color="brand"
        size="md"
        loading={loading}
        aria-label="Quay về vị trí hiện tại"
        onClick={onClick}
      >
        <IconCurrentLocation size={16} />
      </ActionIcon>
    </Tooltip>
  );
}
