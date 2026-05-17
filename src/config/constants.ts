import dayjs from 'dayjs';
import type { OriginInfo, TravelPlan } from '@/types/index';

// 默认城市：杭州
export const DEFAULT_ORIGIN: OriginInfo = {
  city: '杭州',
  code: 'HGH',
  lat: 30.2741,
  lng: 120.1551,
  province: '浙江省',
};

export const DEFAULT_TRAVEL_PLAN: TravelPlan = {
  goDate: dayjs().add(1, 'day').format('YYYY-MM-DD'),
  returnDate: dayjs().add(2, 'day').format('YYYY-MM-DD'),
  goDepartRange: ['07:00', '23:59'],
  returnDepartRange: ['17:00', '21:00'],
  trainTypes: 'all',
};

export const SCAN_RINGS = [
  { maxKm: 200, label: 'R1' },
  { maxKm: 400, label: 'R2' },
  { maxKm: 700, label: 'R3' },
  { maxKm: 1200, label: 'R4' },
] as const;