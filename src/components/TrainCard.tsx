import React, { useMemo } from 'react';
import { Train } from '../types';
import WaterBottle from './WaterBottle';

interface TrainCardProps {
  train: Train;
  onBuy: (train: Train) => void;
}

// 解析座位状态
const parseSeatStatus = (value: string): { percent: number; color: string; label: string } => {
  if (value === '有') return { percent: 100, color: '#22c55e', label: '充足' };
  if (value === '--' || value === '' || value === '无' || value === '*') {
    return { percent: 0, color: '#d1d5db', label: '无票' };
  }
  const num = parseInt(value, 10);
  if (isNaN(num)) return { percent: 0, color: '#d1d5db', label: '无票' };
  if (num >= 50) return { percent: 90, color: '#22c55e', label: value };
  if (num >= 20) return { percent: 65, color: '#3b82f6', label: value };
  if (num >= 5) return { percent: 35, color: '#f59e0b', label: value };
  if (num >= 1) return { percent: 15, color: '#ef4444', label: value };
  return { percent: 0, color: '#d1d5db', label: '无票' };
};

// 列车类型颜色
const getTrainTypeColor = (trainCode: string): string => {
  const prefix = trainCode.charAt(0);
  switch (prefix) {
    case 'G': return 'var(--c-g-train)';
    case 'D': return 'var(--c-d-train)';
    case 'C': return 'var(--c-c-train)';
    default: return 'var(--c-k-train)';
  }
};

// 解析历时为分钟
const parseDuration = (duration: string): number => {
  const parts = duration.split(':');
  if (parts.length !== 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
};

// 检测移动端
const isMobile = (): boolean => {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

// 检测 iOS
const isIOS = (): boolean => {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
};

const TrainCard: React.FC<TrainCardProps> = ({ train, onBuy }) => {
  const trainColor = getTrainTypeColor(train.trainCode);
  const durationMin = parseDuration(train.duration);
  const durationBarWidth = Math.min(100, Math.max(15, (durationMin / 360) * 100));

  const seatConfigs = useMemo(() => [
    { seatType: '二等座', ...parseSeatStatus(train.secondClassSeats) },
    { seatType: '一等座', ...parseSeatStatus(train.firstClassSeats) },
    { seatType: '商务座', ...parseSeatStatus(train.businessSeats) },
    { seatType: '无座', ...parseSeatStatus(train.noSeatTickets) },
  ], [train]);

  const handleBuyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onBuy(train);
    
    if (isMobile()) {
      // 复制车次号到剪贴板
      navigator.clipboard.writeText(train.trainCode).catch(() => {});
      
      // 打开 12306
      if (isIOS()) {
        window.location.href = 'https://www.12306.cn/index/';
      } else {
        window.location.href = 'intent://www.12306.cn/#Intent;scheme=https;package=com.MobileTicket;end';
      }
    }
  };

  // 构建 12306 链接（桌面端）
  const date = new Date().toISOString().split('T')[0]; // 应使用 travelPlan.goDate，这里简化处理
  const buyUrl = `https://www.12306.cn/index/view/infos/ticket_check.html?trainDate=${date}&from_station=${train.fromStation}&to_station=${train.toStation}&trainCode=${train.trainCode}`;

  return (
    <div className="bg-[var(--c-card)] rounded-xl p-4 shadow-sm border border-[var(--c-border-light)] hover:shadow-md transition-shadow">
      {/* 顶部行：车次 + 历时 + 购买按钮 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span 
            className="text-lg font-bold font-mono"
            style={{ color: trainColor }}
          >
            {train.trainCode}
          </span>
          <span className="text-xs text-[var(--c-text-muted)] bg-[var(--c-border-light)] px-2 py-0.5 rounded-full">
            {train.duration}
          </span>
        </div>
        
        {isMobile() ? (
          <button
            onClick={handleBuyClick}
            className="px-4 py-1.5 bg-[var(--c-primary)] text-white text-sm font-medium rounded-lg hover:bg-[var(--c-primary-hover)] active:scale-95 transition-all"
          >
            购买
          </button>
        ) : (
          <a
            href={buyUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => onBuy(train)}
            className="px-4 py-1.5 bg-[var(--c-primary)] text-white text-sm font-medium rounded-lg hover:bg-[var(--c-primary-hover)] active:scale-95 transition-all inline-block"
          >
            购买
          </a>
        )}
      </div>

      {/* 时间轴 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="text-center min-w-[60px]">
          <p className="text-lg font-semibold text-[var(--c-text)]">{train.departTime}</p>
          <p className="text-xs text-[var(--c-text-muted)]">{train.fromStation}</p>
        </div>
        
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full h-0.5 bg-[var(--c-border)] rounded-full relative">
            <div 
              className="absolute left-0 top-0 h-full bg-[var(--c-primary)] rounded-full"
              style={{ width: `${durationBarWidth}%` }}
            />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[var(--c-primary)] rounded-full" />
          </div>
          <span className="text-[10px] text-[var(--c-text-muted)]">{train.duration}</span>
        </div>
        
        <div className="text-center min-w-[60px]">
          <p className="text-lg font-semibold text-[var(--c-text)]">{train.arriveTime}</p>
          <p className="text-xs text-[var(--c-text-muted)]">{train.toStation}</p>
        </div>
      </div>

      {/* 座位区 */}
      <div className="grid grid-cols-4 gap-2">
        {seatConfigs.map((config, index) => (
          <div key={index} className="flex flex-col items-center">
            <WaterBottle
              percent={config.percent}
              color={config.color}
              label={config.label}
              size={32}
            />
            <span className="text-[10px] text-[var(--c-text-muted)] mt-1">{config.seatType}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrainCard;