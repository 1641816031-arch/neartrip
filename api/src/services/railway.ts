// ============================================
// 文件: api/src/services/railway.ts
// ============================================

import type { TrainWithPrice, TrainStop, TicketPrice } from '../types.js';
import { parseTrainResult, parseStationMap, parseTicketPrice } from '../utils/parser.js';
import { stationMapCache } from '../utils/cache.js';

const BASE_URL = 'https://kyfw.12306.cn';
const THROTTLE_MS = 1500;
const SESSION_CACHE_MS = 20 * 60 * 1000;
const STATION_MAP_TTL = 24 * 60 * 60 * 1000;

let lastRequestTime = 0;

async function throttledFetch(url: string, init?: RequestInit): Promise<Response> {
  const now = Date.now();
  const delay = Math.max(0, THROTTLE_MS - (now - lastRequestTime));
  if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
  try {
    const response = await fetch(url, init);
    lastRequestTime = Date.now();
    return response;
  } catch (error) {
    lastRequestTime = Date.now();
    throw error;
  }
}

let sessionCookie: string | null = null;
let sessionCookieExpiresAt = 0;

export async function getSessionCookie(): Promise<string> {
  const now = Date.now();
  if (sessionCookie && now < sessionCookieExpiresAt) return sessionCookie;
  
  const response = await throttledFetch(`${BASE_URL}/otn/leftTicket/init`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9',
    },
  });

  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    sessionCookie = setCookie.split(/,(?=[^;]*=)/).map(c => c.split(';')[0].trim()).filter(c => c.includes('=')).join('; ');
  } else {
    throw new Error('12306 未返回 Cookie');
  }

  sessionCookieExpiresAt = now + SESSION_CACHE_MS;
  return sessionCookie;
}

export async function getStationMap(): Promise<Map<string, string>> {
  const cached = stationMapCache.get('station_map');
  if (cached) return cached;

  const response = await throttledFetch(`${BASE_URL}/otn/resources/js/framework/station_name.js`);
  const jsContent = await response.text();
  const stationMap = parseStationMap(jsContent);
  stationMapCache.set('station_map', stationMap, STATION_MAP_TTL);
  return stationMap;
}

export async function queryTrains(params: { from: string; to: string; date: string }): Promise<TrainWithPrice[]> {
  const { from, to, date } = params;
  const [cookie, stationMap] = await Promise.all([getSessionCookie(), getStationMap()]);
  const endpoints = ['queryG', 'queryZ', 'query', 'queryA'];

  const headers: Record<string, string> = {
    'Cookie': cookie,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Referer': `${BASE_URL}/otn/leftTicket/init`,
    'X-Requested-With': 'XMLHttpRequest',
  };

  let lastError: Error | undefined;

  for (const endpoint of endpoints) {
    const url = `${BASE_URL}/otn/leftTicket/${endpoint}?leftTicketDTO.train_date=${encodeURIComponent(date)}&leftTicketDTO.from_station=${encodeURIComponent(from)}&leftTicketDTO.to_station=${encodeURIComponent(to)}&purpose_codes=ADULT`;

    try {
      const response = await throttledFetch(url, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const result = await response.json();
      if (result.httpstatus === 200 && result.data && Array.isArray(result.data.result)) {
        const trains: TrainWithPrice[] = result.data.result.map((item: string) => {
          const train = parseTrainResult(item);
          train.fromStation = stationMap.get(train.fromStationCode) || train.fromStationCode;
          train.toStation = stationMap.get(train.toStationCode) || train.toStationCode;
          return train;
        });
        return trains;
      }
      
      if (result.messages?.length > 0) {
        throw new Error(result.messages.join(', '));
      }
      throw new Error('无效数据结构');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }
  }

  throw new Error(`所有端点失败: ${lastError?.message}`);
}

export async function queryTrainStops(params: { trainNo: string; from: string; to: string; date: string }): Promise<TrainStop[]> {
  const { trainNo, from, to, date } = params;
  const cookie = await getSessionCookie();
  const url = `${BASE_URL}/otn/czxx/queryByTrainNo?train_no=${encodeURIComponent(trainNo)}&from_station_telecode=${encodeURIComponent(from)}&to_station_telecode=${encodeURIComponent(to)}&depart_date=${encodeURIComponent(date)}`;
  
  const response = await throttledFetch(url, {
    headers: { 'Cookie': cookie, 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
  });
  
  const result = await response.json();
  return result.data?.data?.map((item: any) => ({
    stationName: item.station_name || '',
    stationCode: item.station_code || '',
    arriveTime: item.arrive_time || '',
    departTime: item.depart_time || '',
    stopDuration: item.stopover_time || '',
  })) || [];
}

export async function queryTicketPrice(params: { trainNo: string; fromStationNo: string; toStationNo: string; seatTypes: string; date: string }): Promise<TicketPrice> {
  const { trainNo, fromStationNo, toStationNo, seatTypes, date } = params;
  const cookie = await getSessionCookie();
  const url = `${BASE_URL}/otn/leftTicket/queryTicketPrice?train_no=${encodeURIComponent(trainNo)}&from_station_no=${encodeURIComponent(fromStationNo)}&to_station_no=${encodeURIComponent(toStationNo)}&seat_types=${encodeURIComponent(seatTypes)}&train_date=${encodeURIComponent(date)}`;
  
  const response = await throttledFetch(url, {
    headers: { 'Cookie': cookie, 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
  });
  
  const result = await response.json();
  return parseTicketPrice(result.data);
}