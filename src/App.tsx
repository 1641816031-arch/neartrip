import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  City, 
  Train, 
  TravelPlan, 
  CityTicketSummary, 
  OriginInfo, 
  SearchStation 
} from './types';
import { DEFAULT_ORIGIN, DEFAULT_TRAVEL_PLAN, SCAN_RINGS } from './config/constants';
import { fetchTrains, fetchTrainsBatch, locateByIP } from './services/api';
import MapView from './components/MapView';
import ControlBar from './components/ControlBar';
import TrainListPanel from './components/TrainListPanel';

// 前端缓存
const trainCacheRef = { current: new Map<string, { go: Train[]; return: Train[] }>() };

// 在 App.tsx 顶部添加辅助函数
const isToday = (dateStr: string): boolean => {
  return new Date().toISOString().split('T')[0] === dateStr;
};

const filterDepartedTrains = (trains: Train[]): Train[] => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  return trains.filter(train => {
    const [hour, minute] = train.departTime.split(':').map(Number);
    const departMinutes = hour * 60 + minute;
    // 留 5 分钟缓冲
    return departMinutes > currentMinutes - 5;
  });
};

// Haversine 距离（公里）
const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = 
    Math.sin(dLat / 2) ** 2 + 
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * 
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// 聚合座位状态
const aggregateStatus = (trains: Train[]): { percent: number; color: string; label: string } => {
  if (trains.length === 0) return { percent: 0, color: '#d1d5db', label: '无票' };

  let bestPercent = 0;
  let bestColor = '#d1d5db';
  let bestLabel = '无票';

  for (const train of trains) {
    for (const seat of [train.secondClassSeats, train.firstClassSeats, train.businessSeats]) {
      if (seat === '有') return { percent: 100, color: '#22c55e', label: '充足' };
      if (seat === '--' || seat === '' || seat === '无' || seat === '*') continue;

      const num = parseInt(seat, 10);
      if (isNaN(num)) continue;

      if (num >= 50 && bestPercent < 90) {
        bestPercent = 90; bestColor = '#22c55e'; bestLabel = seat;
      } else if (num >= 20 && bestPercent < 65) {
        bestPercent = 65; bestColor = '#3b82f6'; bestLabel = seat;
      } else if (num >= 5 && bestPercent < 35) {
        bestPercent = 35; bestColor = '#f59e0b'; bestLabel = seat;
      } else if (num >= 1 && bestPercent < 15) {
        bestPercent = 15; bestColor = '#ef4444'; bestLabel = seat;
      }
    }
  }

  return { percent: bestPercent, color: bestColor, label: bestLabel };
};

const App: React.FC = () => {
  const [origin, setOrigin] = useState<OriginInfo>(DEFAULT_ORIGIN);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [goTrains, setGoTrains] = useState<Train[]>([]);
  const [returnTrains, setReturnTrains] = useState<Train[]>([]);
  const [loading, setLoading] = useState(false);
  const [queriedCities, setQueriedCities] = useState<Map<string, CityTicketSummary>>(new Map());
  const [travelPlan, setTravelPlan] = useState<TravelPlan>(DEFAULT_TRAVEL_PLAN);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [scanningCity, setScanningCity] = useState<string | null>(null);
  const [scanRing, setScanRing] = useState(0);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [allCities, setAllCities] = useState<City[]>([]);
  const [flyToCity, setFlyToCity] = useState<City | null>(null);
  const [searchStations, setSearchStations] = useState<SearchStation[]>([]);
  const [mapZoom, setMapZoom] = useState(6);

  // 扫描中断标志
  const scanAbortRef = useRef(false);

  // 初始化：加载城市和搜索数据
  useEffect(() => {
    let mounted = true;

    Promise.all([
      fetch('/data/stations.json').then(r => r.json()),
      fetch('/data/search-stations.json').then(r => r.json()),
    ]).then(([stations, searchData]) => {
      if (!mounted) return;

      // 去重：按城市名
      const cityMap = new Map<string, City>();
      for (const s of stations) {
        if (!cityMap.has(s.city)) {
          cityMap.set(s.city, {
            name: s.city,
            code: s.code,
            lat: s.lat,
            lng: s.lng,
            province: s.province,
            level: s.level,
            pinyin: s.pinyin,
          });
        }
      }
      setAllCities(Array.from(cityMap.values()));
      setSearchStations(searchData || []);
    }).catch(console.error);

    // IP 定位
    locateByIP().then(info => {
      if (mounted && info) setOrigin(info);
    }).catch(() => {});

    return () => { mounted = false; };
  }, []);

  // 监听 origin/travelPlan 变化，清空缓存
  useEffect(() => {
    trainCacheRef.current.clear();
  }, [origin, travelPlan]);

  // 处理城市点击 - 修复：使用对象参数调用 fetchTrains
  const handleCityClick = useCallback(async (city: City) => {
    setSelectedCity(city);
    setLoading(true);

    const cacheKey = city.name;
    const cached = trainCacheRef.current.get(cacheKey);

    if (cached) {
      setGoTrains(cached.go);
      setReturnTrains(cached.return);
      setLoading(false);
      return;
    }

    try {
      const [goData, returnData] = await Promise.all([
        fetchTrains({ from: origin.code, to: city.code, date: travelPlan.goDate }),
        fetchTrains({ from: city.code, to: origin.code, date: travelPlan.returnDate }),
      ]);

      let goTrains = goData.trains || [];
      let returnTrains = returnData.trains || [];

      // 今天查询：过滤已发车
      if (isToday(travelPlan.goDate)) {
        goTrains = filterDepartedTrains(goTrains);
      }
      if (isToday(travelPlan.returnDate)) {
        returnTrains = filterDepartedTrains(returnTrains);
      }

      setGoTrains(goTrains);
      setReturnTrains(returnTrains);
      trainCacheRef.current.set(cacheKey, { go: goTrains, return: returnTrains });
    } catch (err) {
      console.error('Failed to fetch trains:', err);
      setGoTrains([]);
      setReturnTrains([]);
    } finally {
      setLoading(false);
    }
  }, [origin, travelPlan]);

  // 搜索选择
  const handleSearchSelect = useCallback((city: City) => {
    setFlyToCity(city);
    handleCityClick(city);
  }, [handleCityClick]);

  // 雷达扫描算法 - 使用 fetchTrainsBatch
  const handleScan = useCallback(async () => {
    console.log('[App] === 开始扫描 ===');

    if (scanning) {
      // 停止扫描
      scanAbortRef.current = true;
      console.log('[App] 用户停止扫描');
      setScanning(false);
      setScanningCity(null);
      setScanProgress('');
      return;
    }

    scanAbortRef.current = false;
    setScanning(true);
    setQueriedCities(new Map());

    // 1. 去重并按 level === 'city' 过滤
    const uniqueCities = allCities.filter(c => c.level === 'city');

    // 2. 计算距离并排序
    const citiesWithDist = uniqueCities.map(city => ({
      city,
      distance: haversineKm(origin.lat, origin.lng, city.lat, city.lng),
    })).sort((a, b) => a.distance - b.distance);

    // 3. 按 SCAN_RINGS 分环
    const ringCities: { label: string; cities: typeof citiesWithDist }[] = [];
    for (let i = 0; i < SCAN_RINGS.length; i++) {
      const minKm = i === 0 ? 0 : SCAN_RINGS[i - 1].maxKm;
      const maxKm = SCAN_RINGS[i].maxKm;
      const label = SCAN_RINGS[i].label;

      const citiesInRing = citiesWithDist.filter(
        d => d.distance >= minKm && d.distance < maxKm
      );

      if (citiesInRing.length > 0) {
        ringCities.push({ label, cities: citiesInRing });
      }
    }

    // 4. 逐环扫描，使用 fetchTrainsBatch
    for (let ringIndex = 0; ringIndex < ringCities.length; ringIndex++) {
      if (scanAbortRef.current) break;

      const ring = ringCities[ringIndex];
      setScanRing(ringIndex);

      const totalInRing = ring.cities.length;
      console.log(`[App] ${ring.label} 扫描 ${totalInRing} 个城市`);

      // 构建批量查询
      const queries = ring.cities.map(({ city }) => ({
        from: origin.code,
        to: city.code,
        date: travelPlan.goDate,
        key: city.name,
      }));

      // 分批处理，每批最多 10 个（避免请求过大）
      const BATCH_SIZE = 10;
      for (let batchStart = 0; batchStart < queries.length; batchStart += BATCH_SIZE) {
        if (scanAbortRef.current) break;

        const batchQueries = queries.slice(batchStart, batchStart + BATCH_SIZE);
        const batchIndex = Math.floor(batchStart / BATCH_SIZE);
        const totalBatches = Math.ceil(queries.length / BATCH_SIZE);

        console.log(`[App] ${ring.label} 批次 ${batchIndex + 1}/${totalBatches}`);

        try {
          await fetchTrainsBatch(batchQueries, (chunk) => {
            if (scanAbortRef.current) return;

            const cityName = chunk.key;
            let goTrainsData = chunk.trains || [];

            // 今天查询：过滤已发车
            if (isToday(travelPlan.goDate)) {
              goTrainsData = filterDepartedTrains(goTrainsData);
            }

            // 找到对应城市
            const cityDist = ring.cities.find(c => c.city.name === cityName);
            if (!cityDist) return;

            const { city, distance } = cityDist;

            // 更新扫描进度
            const progressInRing = batchStart + batchQueries.findIndex(q => q.key === cityName) + 1;
            setScanningCity(cityName);
            setScanProgress(`${ring.label} ${progressInRing}/${totalInRing}`);

            // 聚合状态
            const goStatus = aggregateStatus(goTrainsData);

            // 计算最短历时
            const parseDuration = (d: string): number => {
              const parts = d.split(':');
              return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
            };

            const minDurationGo = goTrainsData.length > 0
              ? goTrainsData.reduce((min: number, t: Train) => {
                  const dur = parseDuration(t.duration);
                  return dur < min ? dur : min;
                }, Infinity)
              : undefined;

            const summary: CityTicketSummary = {
              goPercent: goStatus.percent,
              goColor: goStatus.color,
              goLabel: goStatus.label,
              returnPercent: 0,  // 批量查询只查去程，返程可以后续补充
              returnColor: '#d1d5db',
              returnLabel: '未查',
              distanceKm: Math.round(distance),
              minDurationGo: minDurationGo !== undefined && minDurationGo !== Infinity
                ? `${Math.floor(minDurationGo / 60)}h${minDurationGo % 60}m`
                : undefined,
            };

            // 函数式更新 Map
            setQueriedCities(prev => {
              const next = new Map(prev);
              next.set(cityName, summary);
              return next;
            });
          });
        } catch (err) {
          console.error(`[App] ${ring.label} 批次失败:`, err);
        }
      }
    }

    console.log('[Scan] goDate:', travelPlan.goDate, 'returnDate:', travelPlan.returnDate);
    setScanning(false);
    setScanningCity(null);
    setScanProgress('');
    console.log('[App] === 扫描结束 ===');
    
  }, [scanning, allCities, origin, travelPlan]);

  // 购买处理
  const handleBuy = useCallback((train: Train) => {
    console.log('Buy train:', train.trainCode);
  }, []);

  return (
    <div className="relative w-full h-screen bg-[var(--c-bg)] overflow-hidden">
      <MapView 
        origin={origin}
        allCities={allCities}
        queriedCities={queriedCities}
        selectedCity={selectedCity}
        scanning={scanning}
        scanningCity={scanningCity}
        scanRing={scanRing}
        flyToCity={flyToCity}
        showOnlyAvailable={showOnlyAvailable}
        onCityClick={handleCityClick}
        onZoomChange={setMapZoom}
      />

      <ControlBar
        origin={origin}
        searchStations={searchStations}
        travelPlan={travelPlan}
        scanning={scanning}
        scanProgress={scanProgress}
        showOnlyAvailable={showOnlyAvailable}
        onOriginChange={setOrigin}
        onSearchSelect={handleSearchSelect}
        onTravelPlanChange={setTravelPlan}
        onScan={handleScan}
        onToggleAvailable={() => setShowOnlyAvailable(!showOnlyAvailable)}
      />

      {selectedCity && (
        <TrainListPanel
          origin={origin}
          selectedCity={selectedCity}
          goTrains={goTrains}
          returnTrains={returnTrains}
          travelPlan={travelPlan}
          loading={loading}
          onClose={() => setSelectedCity(null)}
          onBuy={handleBuy}
          showOnlyAvailable={showOnlyAvailable}
        />
      )}
    </div>
  );
};

export default App;