import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { OriginInfo, TravelPlan, City, SearchStation } from '../types/index';

interface ControlBarProps {
  origin: OriginInfo;
  onOriginChange: (origin: OriginInfo) => void;
  travelPlan: TravelPlan;
  onTravelPlanChange: (plan: TravelPlan) => void;
  onScan: () => void;
  onStopScan: () => void;
  scanning: boolean;
  scanProgress: string; // 如 "R2 5/12"
  showOnlyAvailable: boolean;
  onToggleAvailable: () => void;
  allCities: City[];
  searchStations: SearchStation[];
  onSearchSelect: (city: City) => void;
}

function getNextWeekend(): { goDate: string; returnDate: string } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 6=Sat
  const daysUntilSat = day === 6 ? 0 : day === 0 ? 6 : 6 - day;
  const sat = new Date(now);
  sat.setDate(now.getDate() + daysUntilSat);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { goDate: fmt(sat), returnDate: fmt(sun) };
}

function filterStations(stations: SearchStation[], query: string, max = 8): SearchStation[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();
  const matched = stations.filter(
    (s) =>
      s.n.toLowerCase().includes(q) ||
      s.p.toLowerCase().includes(q) ||
      s.cn.toLowerCase().includes(q)
  );
  return matched.slice(0, max);
}

function stationToCity(station: SearchStation, allCities: City[] | undefined | null): City | null {
  if (!Array.isArray(allCities)) return null;
  const city = allCities.find(
    (c) => c.name === station.cn || c.name === station.n || c.code === station.c
  );
  if (city) return city;
  return null;
}

function stationToOrigin(station: SearchStation, allCities: City[] | undefined | null): OriginInfo {
  if (Array.isArray(allCities)) {
    const city = allCities.find(
      (c) => c.name === station.cn || c.name === station.n || c.code === station.c
    );
    if (city) {
      return {
        city: city.name,
        code: city.code,
        lat: city.lat,
        lng: city.lng,
        province: city.province,
      };
    }
  }
  return {
    city: station.cn || station.n,
    code: station.c,
    lat: 0,
    lng: 0,
    province: '',
  };
}

export default function ControlBar({
  origin,
  onOriginChange,
  travelPlan,
  onTravelPlanChange,
  onScan,
  onStopScan,
  scanning,
  scanProgress,
  showOnlyAvailable,
  onToggleAvailable,
  allCities,
  searchStations,
  onSearchSelect,
}: ControlBarProps) {
  const [expanded, setExpanded] = useState(true);
  const [originDropdownOpen, setOriginDropdownOpen] = useState(false);
  const [originQuery, setOriginQuery] = useState('');
  const [destQuery, setDestQuery] = useState('');
  const [destDropdownOpen, setDestDropdownOpen] = useState(false);
  const originInputRef = useRef<HTMLInputElement>(null);
  const destInputRef = useRef<HTMLInputElement>(null);

  const safeSearchStations = Array.isArray(searchStations) ? searchStations : [];
  const safeAllCities = Array.isArray(allCities) ? allCities : [];

  useEffect(() => {
    if (originDropdownOpen && originInputRef.current) {
      originInputRef.current.focus();
    }
  }, [originDropdownOpen]);

  useEffect(() => {
    if (destDropdownOpen && destInputRef.current) {
      destInputRef.current.focus();
    }
  }, [destDropdownOpen]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('.origin-dropdown-container')) {
        setOriginDropdownOpen(false);
      }
      if (!target.closest('.dest-dropdown-container')) {
        setDestDropdownOpen(false);
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const originResults = filterStations(safeSearchStations, originQuery);
  const destResults = filterStations(safeSearchStations, destQuery);

  const handleOriginSelect = useCallback(
    (station: SearchStation) => {
      const newOrigin = stationToOrigin(station, safeAllCities);
      onOriginChange(newOrigin);
      setOriginDropdownOpen(false);
      setOriginQuery('');
    },
    [safeAllCities, onOriginChange]
  );

  const handleDestSelect = useCallback(
    (station: SearchStation) => {
      const city = stationToCity(station, safeAllCities);
      if (city) {
        onSearchSelect(city);
        setDestDropdownOpen(false);
        setDestQuery('');
      }
    },
    [safeAllCities, onSearchSelect]
  );

  const handleGoDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onTravelPlanChange({ ...travelPlan, goDate: e.target.value });
  };

  const handleReturnDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onTravelPlanChange({ ...travelPlan, returnDate: e.target.value });
  };

  const handleGoTimeChange = (idx: 0 | 1, value: string) => {
    const newRange: [string, string] = [...travelPlan.goDepartRange] as [string, string];
    newRange[idx] = value;
    onTravelPlanChange({ ...travelPlan, goDepartRange: newRange });
  };

  const handleReturnTimeChange = (idx: 0 | 1, value: string) => {
    const newRange: [string, string] = [...travelPlan.returnDepartRange] as [string, string];
    newRange[idx] = value;
    onTravelPlanChange({ ...travelPlan, returnDepartRange: newRange });
  };

  const toggleTrainType = () => {
    onTravelPlanChange({
      ...travelPlan,
      trainTypes: travelPlan.trainTypes === 'all' ? 'G/D' : 'all',
    });
  };

  const handleWeekendShortcut = () => {
    const { goDate, returnDate } = getNextWeekend();
    onTravelPlanChange({
      ...travelPlan,
      goDate,
      returnDate,
    });
  };

  // 解析扫描进度，计算百分比
  const scanMatch = scanProgress.match(/R(\d)\s+(\d+)\/(\d+)/);
  const scanRingIdx = scanMatch ? parseInt(scanMatch[1], 10) - 1 : 0;
  const scanCurrent = scanMatch ? parseInt(scanMatch[2], 10) : 0;
  const scanTotal = scanMatch ? parseInt(scanMatch[3], 10) : 1;
  const scanPercent = scanTotal > 0 ? (scanCurrent / scanTotal) * 100 : 0;

  return (
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-24px)] max-w-[520px] bg-white/92 backdrop-blur-md rounded-2xl shadow-lg transition-all duration-300"
      style={{ fontFamily: 'var(--font-family)' }}
    >
      {/* Row 1: Always visible */}
      <div className="flex items-center gap-2 px-4 py-3">
        {/* Origin dropdown */}
        <div className="origin-dropdown-container relative flex-shrink-0">
          <button
            onClick={() => setOriginDropdownOpen((v) => !v)}
            className="flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-xl bg-[var(--c-primary-light)] text-[var(--c-primary)] text-sm font-semibold hover:bg-[var(--c-primary)]/10 transition-colors"
            aria-expanded={originDropdownOpen}
            aria-haspopup="listbox"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            <span className="max-w-[80px] truncate">{origin.city}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${originDropdownOpen ? 'rotate-180' : ''}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {originDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-[var(--c-border)] overflow-hidden z-50">
              <div className="p-2">
                <input
                  ref={originInputRef}
                  type="text"
                  value={originQuery}
                  onChange={(e) => setOriginQuery(e.target.value)}
                  placeholder="搜索出发地..."
                  className="w-full min-h-[44px] px-3 py-2 text-sm rounded-lg border border-[var(--c-border)] focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]/30"
                />
              </div>
              <ul className="max-h-60 overflow-y-auto" role="listbox">
                {originResults.length === 0 && originQuery.trim() && (
                  <li className="px-4 py-3 text-sm text-[var(--c-text-muted)]">无匹配结果</li>
                )}
                {originResults.map((station) => (
                  <li key={station.c}>
                    <button
                      onClick={() => handleOriginSelect(station)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--c-primary-light)] transition-colors min-h-[44px] flex items-center"
                      role="option"
                    >
                      <span className="font-medium text-[var(--c-text)]">{station.n}</span>
                      <span className="ml-1.5 text-[var(--c-text-muted)] text-xs">· {station.cn}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Destination search */}
        <div className="dest-dropdown-container relative flex-1 min-w-0">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text-muted)]"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref={destInputRef}
              type="text"
              value={destQuery}
              onChange={(e) => {
                setDestQuery(e.target.value);
                setDestDropdownOpen(true);
              }}
              onFocus={() => setDestDropdownOpen(true)}
              placeholder="搜索目的地..."
              className="w-full min-h-[44px] pl-9 pr-3 py-2 text-sm rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]/30"
            />
          </div>

          {destDropdownOpen && destResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-[var(--c-border)] overflow-hidden z-50">
              <ul className="max-h-60 overflow-y-auto" role="listbox">
                {destResults.map((station) => (
                  <li key={station.c}>
                    <button
                      onClick={() => handleDestSelect(station)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--c-primary-light)] transition-colors min-h-[44px] flex items-center"
                      role="option"
                    >
                      <span className="font-medium text-[var(--c-text)]">{station.n}</span>
                      <span className="ml-1.5 text-[var(--c-text-muted)] text-xs">· {station.cn}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-[var(--c-border-light)] transition-colors text-[var(--c-text-secondary)]"
          aria-label={expanded ? '折叠' : '展开'}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-transform duration-300 ${expanded ? '' : 'rotate-180'}`}
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      </div>

      {/* Expandable rows */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${expanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        {/* Row 2: Go date + time range */}
        <div className="flex items-center gap-2 px-4 py-2 border-t border-[var(--c-border-light)]">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <label className="text-xs text-[var(--c-text-muted)] whitespace-nowrap">去程</label>
            <input
              type="date"
              value={travelPlan.goDate}
              onChange={handleGoDateChange}
              className="min-h-[40px] px-1.5 py-1.5 text-sm rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]/30 w-[120px] sm:w-auto sm:flex-1"
            />
          </div>
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <span className="hidden sm:inline text-xs text-[var(--c-text-muted)] whitespace-nowrap">时间</span>
            <input
              type="time"
              value={travelPlan.goDepartRange[0]}
              onChange={(e) => handleGoTimeChange(0, e.target.value)}
              className="flex-1 min-w-0 min-h-[40px] px-1 py-1.5 text-sm rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]/30"
            />
            <span className="text-[var(--c-text-muted)] text-xs">-</span>
            <input
              type="time"
              value={travelPlan.goDepartRange[1]}
              onChange={(e) => handleGoTimeChange(1, e.target.value)}
              className="flex-1 min-w-0 min-h-[40px] px-1 py-1.5 text-sm rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]/30"
            />
          </div>
        </div>

        {/* Row 3: Return date + time range */}
        <div className="flex items-center gap-2 px-4 py-2 border-t border-[var(--c-border-light)]">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <label className="text-xs text-[var(--c-text-muted)] whitespace-nowrap">返程</label>
            <input
              type="date"
              value={travelPlan.returnDate}
              onChange={handleReturnDateChange}
              className="min-h-[40px] px-1.5 py-1.5 text-sm rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]/30 w-[120px] sm:w-auto sm:flex-1"
            />
          </div>
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <span className="hidden sm:inline text-xs text-[var(--c-text-muted)] whitespace-nowrap">时间</span>
            <input
              type="time"
              value={travelPlan.returnDepartRange[0]}
              onChange={(e) => handleReturnTimeChange(0, e.target.value)}
              className="flex-1 min-w-0 min-h-[40px] px-1 py-1.5 text-sm rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]/30"
            />
            <span className="text-[var(--c-text-muted)] text-xs">-</span>
            <input
              type="time"
              value={travelPlan.returnDepartRange[1]}
              onChange={(e) => handleReturnTimeChange(1, e.target.value)}
              className="flex-1 min-w-0 min-h-[40px] px-1 py-1.5 text-sm rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]/30"
            />
          </div>
        </div>

        {/* Row 4: Filters + Scan button */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-[var(--c-border-light)]">
          {/* Filter chips */}
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <button
              onClick={toggleTrainType}
              className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                travelPlan.trainTypes === 'G/D'
                  ? 'bg-[var(--c-primary)] text-white border-[var(--c-primary)]'
                  : 'bg-white text-[var(--c-text-secondary)] border-[var(--c-border)] hover:border-[var(--c-primary)]'
              }`}
            >
              高铁/动车
            </button>
            <button
              onClick={onToggleAvailable}
              className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                showOnlyAvailable
                  ? 'bg-[var(--c-accent)] text-white border-[var(--c-accent)]'
                  : 'bg-white text-[var(--c-text-secondary)] border-[var(--c-border)] hover:border-[var(--c-accent)]'
              }`}
            >
              仅显示有票
            </button>
            <button
              onClick={handleWeekendShortcut}
              className="min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-full border border-[var(--c-border)] bg-white text-[var(--c-text-secondary)] hover:border-[var(--c-warning)] hover:text-[var(--c-warning)] transition-colors"
            >
              周末游
            </button>
          </div>

          {/* Scan / Stop button - 增强版，确保有明确的视觉反馈 */}
          <div className="flex-shrink-0">
            {scanning ? (
              <div className="flex items-center gap-2">
                {/* 扫描进度指示器 - 带背景动画 */}
                <div className="relative overflow-hidden bg-[var(--c-primary)]/15 rounded-full px-4 py-2 min-h-[44px] flex items-center gap-2 border border-[var(--c-primary)]/30">
                  {/* Shimmer 动画背景 */}
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, var(--c-primary) 50%, transparent 100%)',
                      backgroundSize: '200% 100%',
                      animation: 'scan-bar 1.5s infinite',
                      opacity: 0.2,
                    }}
                  />
                  {/* 旋转的加载图标 */}
                  <svg 
                    className="animate-spin flex-shrink-0" 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="var(--c-primary)" 
                    strokeWidth="2"
                  >
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  <span className="relative text-sm font-semibold text-[var(--c-primary)] whitespace-nowrap">
                    {scanProgress || '扫描中...'}
                  </span>
                </div>
                <button
                  onClick={onStopScan}
                  className="min-h-[44px] px-4 py-2 rounded-full bg-[var(--c-danger)] text-white text-sm font-semibold hover:bg-[var(--c-danger)]/90 transition-colors shadow-sm active:scale-95"
                >
                  停止
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  console.log('[ControlBar] 点击开始扫描');
                  onScan();
                }}
                className="min-h-[44px] px-6 py-2 rounded-full bg-[var(--c-primary)] text-white text-sm font-semibold hover:bg-[var(--c-primary-hover)] transition-colors shadow-md active:scale-95 flex items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                开始扫描
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}