// ============================================
// 文件: api/src/types.ts（后端类型）— 修复版
// ============================================

// 注意：后端类型完全自包含，不导入前端类型文件
// 前端和后端共享的接口在这里重新定义，避免跨目录依赖问题

// ==================== 与前端对齐的基础类型 ====================

export interface Station {
  name: string;
  city: string;
  code: string;
  lat: number;
  lng: number;
  province?: string;
  level?: 'city' | 'county' | 'station';
  pinyin?: string;
}

export interface City {
  name: string;
  code: string;
  lat: number;
  lng: number;
  province?: string;
  level?: 'city' | 'county' | 'station';
  pinyin?: string;
}

export interface Train {
  trainNo: string;
  trainCode: string;
  fromStation: string;
  toStation: string;
  departTime: string;
  arriveTime: string;
  duration: string;
  secondClassSeats: string;
  firstClassSeats: string;
  businessSeats: string;
  noSeatTickets: string;
}

export interface TravelPlan {
  goDate: string;
  returnDate: string;
  goDepartRange: [string, string];
  returnDepartRange: [string, string];
  trainTypes: 'all' | 'G/D';
}

export interface CityTicketSummary {
  goPercent: number;
  goColor: string;
  goLabel: string;
  returnPercent: number;
  returnColor: string;
  returnLabel: string;
  distanceKm?: number;
  minDurationGo?: string;
  weatherText?: string;
}

export interface OriginInfo {
  city: string;
  code: string;
  lat: number;
  lng: number;
  province?: string;
}

export interface SearchStation {
  n: string;
  c: string;
  p: string;
  cn: string;
}

// ==================== 后端扩展类型 ====================

export interface TicketPrice {
  business?: string;
  firstClass?: string;
  secondClass?: string;
  noSeat?: string;
}

export interface TrainWithPrice extends Train {
  prices?: TicketPrice;
  fromStationCode: string;
  toStationCode: string;
  fromStationNo: string;
  toStationNo: string;
  seatTypeCodes: string;
}

export interface TrainStop {
  stationName: string;
  stationCode: string;
  arriveTime: string;
  departTime: string;
  stopDuration: string;
}

export interface CityResult {
  city: string;
  code: string;
  lat: number;
  lng: number;
  goTrains: Train[];
  returnTrains: Train[];
  goSummary: CityTicketSummary;
  returnSummary: CityTicketSummary;
}

export interface WeatherDay {
  date: string;
  tempMax: string;
  tempMin: string;
  textDay: string;
  iconDay: string;
}

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}