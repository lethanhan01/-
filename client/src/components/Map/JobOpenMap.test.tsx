import { useEffect } from 'react';
import { render, screen, userEvent } from '@test-utils';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMantineColorScheme } from '@mantine/core';
import { createSeedState } from '../../data/seedData';
import { CanonicalJob, Company } from '../../domain/types';
import { JobOpenMap, MapJobItem } from './JobOpenMap';

const mockState = vi.hoisted(() => ({
  mapInitOptions: [] as Array<{
    center: [number, number];
    zoom: number;
    style: string | object;
  }>,
  setStyleCalls: [] as Array<string | object>,
  flyToCalls: [] as Array<{ center: [number, number]; zoom: number }>,
  panToCalls: [] as Array<[number, number]>,
  zoomInCalls: 0,
  zoomOutCalls: 0,
  addSourceCalls: [] as Array<{ id: string; source: object }>,
  addLayerCalls: [] as Array<{ id: string; type: string }>,
  popupSetTextCalls: [] as string[],
  markers: [] as Array<{
    element?: HTMLElement;
    anchor?: string;
    subpixelPositioning?: boolean;
    lngLat?: [number, number];
    removed: boolean;
  }>,
  eventHandlers: {} as Record<string, Array<() => void>>,
  shouldThrowOnMapInit: false,
  isStyleLoaded: false,
}));

vi.mock('@openmapvn/openmapvn-gl', () => {
  class MockMap {
    constructor(options: { center: [number, number]; zoom: number; style: string | object }) {
      if (mockState.shouldThrowOnMapInit) {
        throw new Error('WebGL unavailable');
      }
      mockState.mapInitOptions.push(options);
    }

    addControl = vi.fn();

    on = vi.fn((event: string, handler: () => void) => {
      mockState.eventHandlers[event] ??= [];
      mockState.eventHandlers[event].push(handler);
    });

    off = vi.fn((event: string, handler: () => void) => {
      if (mockState.eventHandlers[event]) {
        mockState.eventHandlers[event] = mockState.eventHandlers[event].filter(
          (fn) => fn !== handler
        );
      }
    });

    resize = vi.fn();
    remove = vi.fn();
    isStyleLoaded = vi.fn(() => mockState.isStyleLoaded);

    setStyle = vi.fn((style: string | object) => {
      mockState.setStyleCalls.push(style);
    });

    getSource = vi.fn(() => undefined);

    addSource = vi.fn((id: string, source: object) => {
      mockState.addSourceCalls.push({ id, source });
    });

    addLayer = vi.fn((layer: { id: string; type: string }) => {
      mockState.addLayerCalls.push(layer);
    });

    flyTo = vi.fn((opts: { center: [number, number]; zoom: number }) => {
      mockState.flyToCalls.push(opts);
    });

    panTo = vi.fn((lngLat: [number, number]) => {
      mockState.panToCalls.push(lngLat);
    });

    zoomIn = vi.fn(() => {
      mockState.zoomInCalls += 1;
    });

    zoomOut = vi.fn(() => {
      mockState.zoomOutCalls += 1;
    });
  }

  class MockPopup {
    setText = vi.fn((text: string) => {
      mockState.popupSetTextCalls.push(text);
      return this;
    });
    setLngLat = vi.fn(() => this);
    addTo = vi.fn(() => this);
    remove = vi.fn();
  }

  class MockMarker {
    private record: {
      element?: HTMLElement;
      anchor?: string;
      subpixelPositioning?: boolean;
      lngLat?: [number, number];
      removed: boolean;
    };

    constructor(opts?: { element?: HTMLElement; anchor?: string; subpixelPositioning?: boolean }) {
      this.record = {
        element: opts?.element,
        anchor: opts?.anchor,
        subpixelPositioning: opts?.subpixelPositioning,
        removed: false,
      };
    }

    getElement = vi.fn(() => {
      if (!this.record.element) {
        throw new Error('Marker missing element');
      }
      return this.record.element;
    });

    setLngLat = vi.fn((lngLat: [number, number]) => {
      this.record.lngLat = lngLat;
      return this;
    });

    setPopup = vi.fn(() => this);

    addTo = vi.fn(() => {
      mockState.markers.push(this.record);
      return this;
    });

    remove = vi.fn(() => {
      this.record.removed = true;
    });
  }

  class MockNavigationControl {}

  return {
    Map: MockMap,
    Marker: MockMarker,
    Popup: MockPopup,
    NavigationControl: MockNavigationControl,
  };
});

function buildSampleItems(): MapJobItem[] {
  const seed = createSeedState();
  const companyMap = new Map<string, Company>(seed.companies.map((c) => [c.id, c]));
  const hustJobs = seed.rawJobs.filter((job) => job.id.startsWith('job-hust-')).slice(0, 2);
  const statuses: CanonicalJob['status'][] = ['new', 'urgent'];

  return statuses.map((status, idx) => {
    const raw = hustJobs[idx];
    if (!raw) {
      throw new Error(`Missing hust job at index ${idx}`);
    }
    const company = companyMap.get(raw.companyId);
    if (!company) {
      throw new Error(`Missing company ${raw.companyId}`);
    }
    return {
      job: { ...raw, status, mergedSources: [raw.sourceName], duplicateCount: 1 },
      company,
      distanceKm: 0.5 + idx * 0.2,
      matchPercent: 100,
    };
  });
}

function ColorSchemeSetter({ scheme }: { scheme: 'light' | 'dark' | 'auto' }) {
  const { setColorScheme } = useMantineColorScheme();
  useEffect(() => {
    setColorScheme(scheme);
  }, [scheme, setColorScheme]);
  return null;
}

describe('JobOpenMap', () => {
  beforeEach(() => {
    mockState.mapInitOptions = [];
    mockState.setStyleCalls = [];
    mockState.flyToCalls = [];
    mockState.panToCalls = [];
    mockState.zoomInCalls = 0;
    mockState.zoomOutCalls = 0;
    mockState.addSourceCalls = [];
    mockState.addLayerCalls = [];
    mockState.popupSetTextCalls = [];
    mockState.markers = [];
    mockState.eventHandlers = {};
    mockState.shouldThrowOnMapInit = false;
    mockState.isStyleLoaded = false;
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_OPENMAPVN_API_KEY', '');
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('centers in Hanoi even if passed a non-Hanoi center and renders distinct pin icons/anchors for job statuses and user location', () => {
    const items = buildSampleItems();

    const { container } = render(
      <JobOpenMap
        center={{ id: 'zone-dhqg', label: 'TP.HCM cũ', lat: 10.87, lng: 106.8031 }}
        radiusKm={5}
        items={items}
        selectedJobId={null}
        onSelectJob={vi.fn()}
      />
    );

    expect(mockState.mapInitOptions[0]?.center).toEqual([105.8431, 21.0056]);

    // 1 user location marker + 2 job markers (new, urgent)
    expect(mockState.markers).toHaveLength(3);
    for (const marker of mockState.markers) {
      expect(marker.subpixelPositioning).toBe(true);
    }

    const userMarker = mockState.markers.find(
      (m) => m.element?.getAttribute('aria-label') === 'Vị trí hiện tại của bạn'
    );
    expect(userMarker?.anchor).toBe('bottom');
    expect(userMarker?.element?.querySelector('[data-kind="user"] svg')).not.toBeNull();

    const jobMarkers = mockState.markers.filter((m) => m.element?.dataset.status);
    expect(jobMarkers.map((m) => m.element?.dataset.status)).toEqual(['new', 'urgent']);
    for (const marker of jobMarkers) {
      expect(marker.anchor).toBe('center');
      const status = marker.element?.dataset.status;
      expect(marker.element?.querySelector(`[data-kind="${status}"] svg`)).not.toBeNull();
    }

    const compactLegendPins = Array.from(container.querySelectorAll('[data-compact="true"]'));
    expect(compactLegendPins.map((el) => el.getAttribute('data-kind'))).toEqual([
      'new',
      'urgent',
      'user',
    ]);
    for (const pin of compactLegendPins) {
      expect(pin.querySelector('svg')).not.toBeNull();
    }

    expect(screen.getByText('Đang tuyển')).toBeInTheDocument();
    expect(screen.getByText('Tuyển gấp')).toBeInTheDocument();
    expect(screen.queryByText('Đã cập nhật')).not.toBeInTheDocument();
    expect(screen.queryByText('Sắp hết hạn')).not.toBeInTheDocument();
    expect(screen.getByText('Vị trí của bạn')).toBeInTheDocument();
  });

  it('calls onSelectJob, preserves marker DOM elements on selection change, and pans map', async () => {
    const user = userEvent.setup();
    const items = buildSampleItems();
    const onSelectJob = vi.fn();

    const { rerender } = render(
      <JobOpenMap
        center={{
          id: 'zone-bach-khoa-hn',
          label: 'ĐH Bách khoa Hà Nội',
          lat: 21.0056,
          lng: 105.8431,
        }}
        radiusKm={5}
        items={items}
        selectedJobId={null}
        onSelectJob={onSelectJob}
      />
    );

    const initialJobMarkerEls = mockState.markers
      .filter((m) => m.element?.dataset.status)
      .map((m) => m.element);
    expect(initialJobMarkerEls).toHaveLength(2);

    const firstPin = initialJobMarkerEls[0];
    if (!firstPin) {
      throw new Error('Missing first job marker element');
    }

    await user.click(firstPin);
    expect(onSelectJob).toHaveBeenCalledWith(items[0].job.id);
    expect(mockState.popupSetTextCalls.at(-1)).toContain(items[0].company.name);

    rerender(
      <JobOpenMap
        center={{
          id: 'zone-bach-khoa-hn',
          label: 'ĐH Bách khoa Hà Nội',
          lat: 21.0056,
          lng: 105.8431,
        }}
        radiusKm={5}
        items={items}
        selectedJobId={items[1].job.id}
        onSelectJob={onSelectJob}
      />
    );

    const activeJobMarkers = mockState.markers.filter(
      (m) => !m.removed && m.element?.dataset.status
    );
    expect(activeJobMarkers).toHaveLength(2);
    expect(activeJobMarkers[0]?.element).toBe(firstPin);
    expect(activeJobMarkers[1]?.element?.dataset.selected).toBe('true');
    expect(mockState.panToCalls).toContainEqual([items[1].company.lng, items[1].company.lat]);
  });

  it('keeps user pin fixed at zone center on mount and updates to GPS when clicking the recenter button', async () => {
    const user = userEvent.setup();
    const items = buildSampleItems();

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((success: PositionCallback) => {
          success({
            coords: {
              latitude: 21.0285,
              longitude: 105.8542,
              accuracy: 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
              toJSON: () => ({}),
            },
            timestamp: Date.now(),
            toJSON: () => ({}),
          });
        }),
      },
    });

    render(
      <JobOpenMap
        center={{
          id: 'zone-bach-khoa-hn',
          label: 'ĐH Bách khoa Hà Nội',
          lat: 21.0056,
          lng: 105.8431,
        }}
        radiusKm={null}
        items={items}
        selectedJobId={null}
        onSelectJob={vi.fn()}
      />
    );

    const initialUserMarkers = mockState.markers.filter(
      (m) => m.element?.getAttribute('aria-label') === 'Vị trí hiện tại của bạn'
    );
    expect(initialUserMarkers.at(-1)?.lngLat).toEqual([105.8431, 21.0056]);

    await user.click(screen.getByRole('button', { name: /Phóng to bản đồ/i }));
    await user.click(screen.getByRole('button', { name: /Thu nhỏ bản đồ/i }));
    expect(mockState.zoomInCalls).toBe(1);
    expect(mockState.zoomOutCalls).toBe(1);

    await user.click(screen.getByRole('button', { name: /Quay về vị trí hiện tại/i }));
    const updatedUserMarkers = mockState.markers.filter(
      (m) => m.element?.getAttribute('aria-label') === 'Vị trí hiện tại của bạn'
    );
    expect(updatedUserMarkers.at(-1)?.lngLat).toEqual([105.8542, 21.0285]);
    expect(mockState.flyToCalls).toContainEqual(
      expect.objectContaining({ center: [105.8542, 21.0285] })
    );
  });

  it('uses OpenMapVN night-v1 style when API key is set and computed color scheme is dark', () => {
    vi.stubEnv('VITE_OPENMAPVN_API_KEY', 'test-openmap-key');
    const items = buildSampleItems();

    render(
      <>
        <ColorSchemeSetter scheme="dark" />
        <JobOpenMap
          center={{
            id: 'zone-bach-khoa-hn',
            label: 'ĐH Bách khoa Hà Nội',
            lat: 21.0056,
            lng: 105.8431,
          }}
          radiusKm={5}
          items={items}
          selectedJobId={null}
          onSelectJob={vi.fn()}
        />
      </>
    );

    expect(mockState.setStyleCalls).toContain(
      'https://maptiles.openmap.vn/styles/night-v1/style.json?apikey=test-openmap-key'
    );
  });

  it('syncs radius overlay on style.load and falls back on map style error', () => {
    const items = buildSampleItems();

    render(
      <JobOpenMap
        center={{
          id: 'zone-bach-khoa-hn',
          label: 'ĐH Bách khoa Hà Nội',
          lat: 21.0056,
          lng: 105.8431,
        }}
        radiusKm={5}
        items={items}
        selectedJobId={null}
        onSelectJob={vi.fn()}
      />
    );

    mockState.isStyleLoaded = true;
    act(() => {
      for (const handler of mockState.eventHandlers['style.load'] ?? []) {
        handler();
      }
    });
    expect(mockState.addSourceCalls).toHaveLength(1);
    expect(mockState.addLayerCalls).toHaveLength(2);

    mockState.isStyleLoaded = false;
    act(() => {
      for (const handler of mockState.eventHandlers.error ?? []) {
        handler();
      }
    });

    expect(screen.getByText(/Bản đồ ghim việc làm quanh ĐH Bách khoa Hà Nội/i)).toBeInTheDocument();
  });

  it('switches to Carto raster fallback before showing badge fallback if OpenMapVN style fails', () => {
    vi.stubEnv('VITE_OPENMAPVN_API_KEY', 'invalid-openmap-key');
    const items = buildSampleItems();

    render(
      <JobOpenMap
        center={{
          id: 'zone-bach-khoa-hn',
          label: 'ĐH Bách khoa Hà Nội',
          lat: 21.0056,
          lng: 105.8431,
        }}
        radiusKm={5}
        items={items}
        selectedJobId={null}
        onSelectJob={vi.fn()}
      />
    );

    mockState.isStyleLoaded = false;
    act(() => {
      for (const handler of mockState.eventHandlers.error ?? []) {
        handler();
      }
    });

    expect(mockState.setStyleCalls.at(-1)).toMatchObject({
      sources: {
        carto: expect.objectContaining({
          type: 'raster',
        }),
      },
    });
    expect(
      screen.queryByText(/Bản đồ ghim việc làm quanh ĐH Bách khoa Hà Nội/i)
    ).not.toBeInTheDocument();

    act(() => {
      for (const handler of mockState.eventHandlers.error ?? []) {
        handler();
      }
    });

    expect(screen.getByText(/Bản đồ ghim việc làm quanh ĐH Bách khoa Hà Nội/i)).toBeInTheDocument();
  });

  it('includes active jobs and preserves legend in WebGL-unavailable fallback mode', () => {
    mockState.shouldThrowOnMapInit = true;
    const items = buildSampleItems();

    render(
      <JobOpenMap
        center={{
          id: 'zone-bach-khoa-hn',
          label: 'ĐH Bách khoa Hà Nội',
          lat: 21.0056,
          lng: 105.8431,
        }}
        radiusKm={5}
        items={items}
        selectedJobId={null}
        onSelectJob={vi.fn()}
      />
    );

    expect(screen.getByText(/Bản đồ ghim việc làm quanh ĐH Bách khoa Hà Nội/i)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(items[1].company.name, 'i'))).toBeInTheDocument();
    expect(screen.getByText('Vị trí của bạn')).toBeInTheDocument();
    expect(screen.getByText('Đang tuyển')).toBeInTheDocument();
    expect(screen.getByText('Tuyển gấp')).toBeInTheDocument();
  });
});
