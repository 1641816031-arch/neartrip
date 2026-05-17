// ============================================
// 文件: src/types/index.ts（前端类型，供参考对齐）
// ============================================

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

export interface WeatherDay {
  date: string;
  tempMax: string;
  tempMin: string;
  textDay: string;
  iconDay: string;
}