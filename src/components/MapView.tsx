import React, { useEffect, useRef } from 'react';
import { useAMap } from '../hooks/useAMap';  // ← 改成实际导入
import type { OriginInfo, City, CityTicketSummary } from '../types/index';


interface MapViewProps {
  origin: OriginInfo;
  allCities: City[];
  queriedCities: Map<string, CityTicketSummary>;
  selectedCity: City | null;
  scanning: boolean;
  scanningCity: string | null;
  scanRing: number; // 0-3
  flyToCity: City | null;
  onCityClick: (city: City) => void;
  onZoomChange: (zoom: number) => void;
}

// Haversine distance in km
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const SCAN_RINGS = [
  { maxKm: 200, label: 'R1' },
  { maxKm: 400, label: 'R2' },
  { maxKm: 700, label: 'R3' },
  { maxKm: 1200, label: 'R4' },
];

// Zoom-based visibility rules
function isCityVisibleAtZoom(city: City, zoom: number, isQueried: boolean): boolean {
  if (isQueried) {
    if (city.level === 'county') return zoom >= 5;
    if (city.level === 'station') return zoom >= 7;
    return true;
  }
  if (zoom < 5) return false;
  if (zoom <= 6) return city.level === 'city';
  if (zoom <= 8) return city.level === 'city';
  return true;
}

// Marker size by city level
function getMarkerSize(city: City): number {
  switch (city.level) {
    case 'city':
      return 12;
    case 'county':
      return 9;
    case 'station':
    default:
      return 7;
  }
}

// Build origin marker HTML
function buildOriginMarkerHTML(cityName: string): string {
  return `
    <div style="
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      background: var(--c-origin);
      border-radius: 9999px;
      color: white;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(232, 93, 74, 0.4);
      pointer-events: none;
      font-family: var(--font-family);
    ">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        <circle cx="12" cy="9" r="2.5"/>
      </svg>
      <span>${cityName}</span>
    </div>
  `;
}

// Build default city marker HTML
function buildDefaultMarkerHTML(city: City): string {
  const size = getMarkerSize(city);
  const isCapital = city.province?.includes('省会') || false;
  const bg = isCapital ? 'var(--c-primary-hover)' : 'var(--c-primary)';
  return `
    <div class="map-marker-default" style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: ${bg};
      cursor: pointer;
      transition: transform 0.2s ease;
      box-shadow: 0 1px 4px rgba(2, 132, 199, 0.3);
    " data-city="${city.name}"></div>
  `;
}

// Build scanning marker HTML - 增强视觉反馈
function buildScanningMarkerHTML(city: City): string {
  const size = getMarkerSize(city);
  return `
    <div style="
      position: relative;
      width: ${size + 12}px;
      height: ${size + 12}px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    ">
      <!-- 外圈旋转动画 -->
      <div style="
        position: absolute;
        inset: 0;
        border-radius: 50%;
        border: 2px solid var(--c-primary);
        border-top-color: transparent;
        animation: spin 0.8s linear infinite;
      "></div>
      <!-- 内圈脉冲 -->
      <div style="
        position: absolute;
        inset: -8px;
        border-radius: 50%;
        border: 1px solid var(--c-primary);
        opacity: 0.3;
        animation: pulse-ring 1.5s infinite;
      "></div>
      <!-- 中心圆点 -->
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: var(--c-primary);
        box-shadow: 0 0 8px var(--c-primary);
      "></div>
    </div>
  `;
}

// Build queried marker HTML
function buildQueriedMarkerHTML(
  city: City,
  summary: CityTicketSummary,
  isSelected: boolean
): string {
  const borderColor = summary.goColor || 'var(--c-border)';
  const shadowColor = summary.goColor ? `${summary.goColor}40` : 'rgba(0,0,0,0.1)';
  const goBottleColor = summary.goColor || '#d1d5db';
  const returnBottleColor = summary.returnColor || '#d1d5db';

  return `
    <div style="
      background: white;
      border-radius: 8px;
      padding: 6px 10px;
      box-shadow: 0 2px 12px ${shadowColor}, 0 0 0 2px ${isSelected ? borderColor : 'transparent'};
      min-width: 100px;
      cursor: pointer;
      font-family: var(--font-family);
      transition: box-shadow 0.2s ease;
    " data-city="${city.name}" class="map-marker-queried">
      <div style="
        font-size: 13px;
        font-weight: 700;
        color: var(--c-text);
        margin-bottom: 4px;
      ">${city.name}</div>
      <div style="
        display: flex;
        gap: 6px;
        margin-bottom: 4px;
      ">
        <div style="
          width: 16px;
          height: 24px;
          border-radius: 4px;
          background: ${goBottleColor}20;
          border: 2px solid ${goBottleColor};
          position: relative;
          overflow: hidden;
        ">
          <div style="
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: ${summary.goPercent}%;
            background: ${goBottleColor};
          "></div>
        </div>
        <div style="
          width: 16px;
          height: 24px;
          border-radius: 4px;
          background: ${returnBottleColor}20;
          border: 2px solid ${returnBottleColor};
          position: relative;
          overflow: hidden;
        ">
          <div style="
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: ${summary.returnPercent}%;
            background: ${returnBottleColor};
          "></div>
        </div>
      </div>
      <div style="
        display: flex;
        gap: 8px;
        font-size: 10px;
        color: var(--c-text-muted);
        line-height: 1.4;
      ">
        ${summary.distanceKm ? `<span>${summary.distanceKm}km</span>` : ''}
        ${summary.minDurationGo ? `<span>${summary.minDurationGo}</span>` : ''}
      </div>
      ${summary.weatherText ? `<div style="font-size: 10px; color: var(--c-text-secondary); margin-top: 2px;">${summary.weatherText}</div>` : ''}
    </div>
  `;
}

// Hook type declaration
// declare function useAMap(): {
//   mapRef: React.RefObject<HTMLDivElement | null>;
//   AMap: any | null;
//   map: any | null;
// };

export default function MapView({
  origin,
  allCities,
  queriedCities,
  selectedCity,
  scanning,
  scanningCity,
  scanRing,
  flyToCity,
  onCityClick,
  onZoomChange,
}: MapViewProps) {
  const { mapRef, AMap, map } = useAMap();
  const markersRef = useRef<Map<string, any>>(new Map());
  const scanCircleRef = useRef<any>(null);
  const zoomRef = useRef<number>(6);

  // 防御性处理
  const safeAllCities = Array.isArray(allCities) ? allCities : [];
  const safeQueriedCities = queriedCities instanceof Map ? queriedCities : new Map<string, CityTicketSummary>();

  // Initialize map center and zoom
  useEffect(() => {
    if (!map || !AMap) return;
    map.setZoomAndCenter(6, [origin.lng, origin.lat], false, 0);
  }, [map, AMap, origin.lng, origin.lat]);

  // Fly to city
  useEffect(() => {
    if (!map || !flyToCity) return;
    map.setZoomAndCenter(8, [flyToCity.lng, flyToCity.lat], false, 500);
  }, [map, flyToCity]);

  // Zoom change listener
  useEffect(() => {
    if (!map) return;
    const handler = () => {
      const z = map.getZoom();
      zoomRef.current = z;
      onZoomChange(z);
    };
    map.on('zoomchange', handler);
    zoomRef.current = map.getZoom();
    return () => {
      map.off('zoomchange', handler);
    };
  }, [map, onZoomChange]);

  // Map click → find nearest city within 50km
  useEffect(() => {
    if (!map || !AMap) return;
    const clickHandler = (e: any) => {
      const clickLng = e.lnglat.getLng();
      const clickLat = e.lnglat.getLat();

      let nearest: City | null = null;
      let minDist = Infinity;

      for (const city of safeAllCities) {
        const dist = haversineKm(clickLat, clickLng, city.lat, city.lng);
        if (dist <= 50 && dist < minDist) {
          minDist = dist;
          nearest = city;
        }
      }

      if (nearest) {
        onCityClick(nearest);
      }
    };

    map.on('click', clickHandler);
    return () => {
      map.off('click', clickHandler);
    };
  }, [map, AMap, safeAllCities, onCityClick]);

  // Update markers when dependencies change - 增强扫描状态处理
  useEffect(() => {
    if (!map || !AMap) {
      console.log('[MapView] 地图未初始化，跳过标记更新');
      return;
    }

    const currentZoom = zoomRef.current;
    const activeCityNames = new Set<string>();

    console.log(`[MapView] 更新标记: scanning=${scanning}, scanningCity=${scanningCity}, queried=${safeQueriedCities.size}, zoom=${currentZoom}`);

    for (const city of safeAllCities) {
      const isQueried = safeQueriedCities.has(city.name);
      const isScanning = scanningCity === city.name;
      const isOrigin = city.name === origin.city;

      if (!isOrigin && !isQueried && !isCityVisibleAtZoom(city, currentZoom, isQueried)) {
        continue;
      }

      activeCityNames.add(city.name);

      let content: string;
      if (isOrigin) {
        content = buildOriginMarkerHTML(city.name);
      } else if (isScanning && scanning) {
        content = buildScanningMarkerHTML(city);
      } else if (isQueried) {
        const summary = safeQueriedCities.get(city.name)!;
        content = buildQueriedMarkerHTML(city, summary, selectedCity?.name === city.name);
      } else {
        content = buildDefaultMarkerHTML(city);
      }

      const existing = markersRef.current.get(city.name);
      if (existing) {
        existing.setContent(content);
        existing.setPosition([city.lng, city.lat]);
        if (isQueried || isOrigin) {
          existing.setOffset(new AMap.Pixel(0, -10));
        } else {
          existing.setOffset(new AMap.Pixel(0, 0));
        }
        // 扫描中时提升 zIndex
        if (isScanning && scanning) {
          existing.setzIndex(180);
        }
      } else {
        const marker = new AMap.Marker({
          position: [city.lng, city.lat],
          content,
          anchor: isQueried || isOrigin ? 'bottom-center' : 'center',
          offset: isQueried || isOrigin ? new AMap.Pixel(0, -10) : new AMap.Pixel(0, 0),
          zIndex: isOrigin ? 200 : isScanning && scanning ? 180 : isQueried ? 150 : 100,
        });

        if (!isOrigin) {
          marker.on('click', () => {
            onCityClick(city);
          });
        }

        marker.setMap(map);
        markersRef.current.set(city.name, marker);
      }
    }

    // 清理不可见的标记
    for (const [name, marker] of Array.from(markersRef.current.entries())) {
      if (!activeCityNames.has(name)) {
        marker.setMap(null);
        markersRef.current.delete(name);
      }
    }
  }, [
    map,
    AMap,
    safeAllCities,
    safeQueriedCities,
    selectedCity,
    scanning,
    scanningCity,
    origin.city,
    onCityClick,
  ]);

  // Scan circle overlay - 增强扫描圆环
  useEffect(() => {
    if (!map || !AMap) return;

    if (scanning && scanRing >= 0 && scanRing < SCAN_RINGS.length) {
      const radius = SCAN_RINGS[scanRing].maxKm * 1000;

      console.log(`[MapView] 显示扫描圆环: ring=${scanRing}, radius=${radius}m`);

      if (scanCircleRef.current) {
        scanCircleRef.current.setRadius(radius);
        scanCircleRef.current.setCenter([origin.lng, origin.lat]);
      } else {
        const circle = new AMap.Circle({
          center: [origin.lng, origin.lat],
          radius,
          fillColor: 'var(--c-primary)',
          fillOpacity: 0.08,
          strokeColor: 'var(--c-primary)',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          strokeStyle: 'dashed',
          strokeDasharray: [10, 10],
          zIndex: 50,
        });
        circle.setMap(map);
        scanCircleRef.current = circle;
      }
    } else {
      if (scanCircleRef.current) {
        console.log('[MapView] 移除扫描圆环');
        scanCircleRef.current.setMap(null);
        scanCircleRef.current = null;
      }
    }

    return () => {
      if (scanCircleRef.current) {
        scanCircleRef.current.setMap(null);
        scanCircleRef.current = null;
      }
    };
  }, [map, AMap, scanning, scanRing, origin.lng, origin.lat]);

  return (
    <div
      ref={mapRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: 'var(--c-bg)' }}
    />
  );
}