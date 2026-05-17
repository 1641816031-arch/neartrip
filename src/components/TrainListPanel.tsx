import React, { useState, useMemo } from 'react';
import { City, Train, TravelPlan, OriginInfo } from '../types';
import TrainCard from './TrainCard';
import CityInfoCard from './CityInfoCard';
import WaterBottle from './WaterBottle';

interface TrainListPanelProps {
  origin: OriginInfo;
  selectedCity: City;
  goTrains: Train[];
  returnTrains: Train[];
  travelPlan: TravelPlan;
  loading: boolean;
  onClose: () => void;
  onBuy: (train: Train) => void;
  showOnlyAvailable: boolean;
}

// 纯函数：按时间范围过滤
const filterByTimeRange = (trains: Train[], range: [string, string]): Train[] => {
  const [start, end] = range;
  return trains.filter(t => t.departTime >= start && t.departTime <= end);
};

// 纯函数：按列车类型过滤
const filterByTrainType = (trains: Train[], type: 'all' | 'G/D'): Train[] => {
  if (type === 'all') return trains;
  return trains.filter(t => {
    const prefix = t.trainCode.charAt(0);
    return prefix === 'G' || prefix === 'D';
  });
};

// 纯函数：仅显示有票
const filterAvailable = (trains: Train[]): Train[] => {
  return trains.filter(t => {
    const hasSeat = (s: string) => s !== '--' && s !== '' && s !== '无' && s !== '*';
    return hasSeat(t.secondClassSeats) || hasSeat(t.firstClassSeats) || hasSeat(t.businessSeats);
  });
};

// 聚合状态（用于面板头部摘要）
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

type FilterTab = 'all' | 'G/D' | 'available';

const TrainListPanel: React.FC<TrainListPanelProps> = ({
  origin,
  selectedCity,
  goTrains,
  returnTrains,
  travelPlan,
  loading,
  onClose,
  onBuy,
  showOnlyAvailable,
}) => {
  const [activeTab, setActiveTab] = useState<'go' | 'return'>('go');
  const [trainFilter, setTrainFilter] = useState<FilterTab>('all');
  const [cityInfoExpanded, setCityInfoExpanded] = useState(false);

  // 过滤管道
  const filteredGoTrains = useMemo(() => {
    let result = filterByTimeRange(goTrains, travelPlan.goDepartRange);
    result = filterByTrainType(result, travelPlan.trainTypes);
    if (showOnlyAvailable || trainFilter === 'available') {
      result = filterAvailable(result);
    } else if (trainFilter === 'G/D') {
      result = filterByTrainType(result, 'G/D');
    }
    return result;
  }, [goTrains, travelPlan, showOnlyAvailable, trainFilter]);

  const filteredReturnTrains = useMemo(() => {
    let result = filterByTimeRange(returnTrains, travelPlan.returnDepartRange);
    result = filterByTrainType(result, travelPlan.trainTypes);
    if (showOnlyAvailable || trainFilter === 'available') {
      result = filterAvailable(result);
    } else if (trainFilter === 'G/D') {
      result = filterByTrainType(result, 'G/D');
    }
    return result;
  }, [returnTrains, travelPlan, showOnlyAvailable, trainFilter]);

  const currentTrains = activeTab === 'go' ? filteredGoTrains : filteredReturnTrains;
  const totalTrains = activeTab === 'go' ? goTrains.length : returnTrains.length;

  const goStatus = useMemo(() => aggregateStatus(filteredGoTrains), [filteredGoTrains]);
  const returnStatus = useMemo(() => aggregateStatus(filteredReturnTrains), [filteredReturnTrains]);

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'G/D', label: '高铁' },
    { key: 'available', label: '有票' },
  ];

  return (
    <div 
      className="fixed right-0 top-0 h-full w-[400px] bg-[var(--c-bg)] shadow-2xl z-40 flex flex-col"
      style={{ animation: 'slide-in-right 0.28s cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      {/* 头部 */}
      <div className="shrink-0 p-4 md:pt-4 pt-[7em] border-b border-[var(--c-border)] bg-[var(--c-card)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-[var(--c-text)]">{origin.city}</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[var(--c-text-muted)]">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-semibold text-[var(--c-text)]">{selectedCity.name}</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-[var(--c-border-light)] rounded-lg transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-[var(--c-text-muted)]">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-[var(--c-text-muted)]">
            <span>去程 {travelPlan.goDate}</span>
            <span>返程 {travelPlan.returnDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <WaterBottle percent={goStatus.percent} color={goStatus.color} label={goStatus.label} size={20} />
              <span className="text-[10px] text-[var(--c-text-muted)]">去</span>
            </div>
            <div className="flex items-center gap-1">
              <WaterBottle percent={returnStatus.percent} color={returnStatus.color} label={returnStatus.label} size={20} />
              <span className="text-[10px] text-[var(--c-text-muted)]">返</span>
            </div>
          </div>
        </div>
      </div>

      {/* CityInfoCard */}
      <div className="shrink-0 px-4 pt-3">
        <CityInfoCard 
          city={selectedCity} 
          expanded={cityInfoExpanded}
          onToggle={() => setCityInfoExpanded(!cityInfoExpanded)}
        />
      </div>

      {/* 筛选标签 */}
      <div className="shrink-0 px-4 py-3 flex gap-2">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setTrainFilter(tab.key)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
              trainFilter === tab.key
                ? 'bg-[var(--c-primary)] text-white'
                : 'bg-[var(--c-border-light)] text-[var(--c-text-secondary)] hover:bg-[var(--c-border)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 去程/返程标签页 */}
      <div className="shrink-0 px-4 pb-2 flex gap-4 border-b border-[var(--c-border-light)]">
        <button
          onClick={() => setActiveTab('go')}
          className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'go'
              ? 'border-[var(--c-primary)] text-[var(--c-primary)]'
              : 'border-transparent text-[var(--c-text-muted)] hover:text-[var(--c-text-secondary)]'
          }`}
        >
          去程 ({filteredGoTrains.length}/{goTrains.length})
        </button>
        <button
          onClick={() => setActiveTab('return')}
          className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'return'
              ? 'border-[var(--c-accent)] text-[var(--c-accent)]'
              : 'border-transparent text-[var(--c-text-muted)] hover:text-[var(--c-text-secondary)]'
          }`}
        >
          返程 ({filteredReturnTrains.length}/{returnTrains.length})
        </button>
      </div>

      {/* 列车列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-8 h-8 border-2 border-[var(--c-primary)] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[var(--c-text-muted)]">查询列车中...</p>
          </div>
        ) : currentTrains.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-[var(--c-border)]">
              <path d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4zm0 36c-8.837 0-16-7.163-16-16S15.163 8 24 8s16 7.163 16 16-7.163 16-16 16z" fill="currentColor"/>
              <path d="M16 16l16 16M32 16L16 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p className="text-sm text-[var(--c-text-muted)]">暂无符合条件的列车</p>
          </div>
        ) : (
          currentTrains.map(train => (
            // 新代码（唯一 key）
            <TrainCard key={`${train.trainNo}-${train.fromStation}-${train.toStation}`} train={train} onBuy={onBuy} />
          ))
        )}
      </div>
    </div>
  );
};

export default TrainListPanel;