import type { WeatherDay } from '@/types/index';

const API_BASE = import.meta.env.VITE_API_BASE || '';
const CACHE_TTL = 30 * 60 * 1000; // 30 分钟（1800000ms）

interface CacheEntry {
  data: WeatherDay[];
  time: number;
}

const weatherCache = new Map<string, CacheEntry>();

function getCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

function isExpired(entry: CacheEntry): boolean {
  return Date.now() - entry.time > CACHE_TTL;
}

export async function getWeather(lat: number, lng: number): Promise<WeatherDay[]> {
  const key = getCacheKey(lat, lng);
  const cached = weatherCache.get(key);

  if (cached && !isExpired(cached)) {
    return cached.data;
  }

  const searchParams = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
  });

  const response = await fetch(`${API_BASE}/api/weather?${searchParams.toString()}`);
  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    throw new Error(`Weather API ${response.status}: ${text}`);
  }

  const result = await response.json();
  const days: WeatherDay[] = result.days || [];

  weatherCache.set(key, { data: days, time: Date.now() });
  return days;
}

export async function getWeatherText(lat: number, lng: number): Promise<string> {
  try {
    const days = await getWeather(lat, lng);
    if (!days || days.length === 0) return '暂无天气数据';

    const today = days[0];
    const tempRange = `${today.tempMin}~${today.tempMax}°`;
    return `${tempRange} ${today.textDay}`;
  } catch (error) {
    console.warn('Failed to fetch weather text:', error);
    return '天气获取失败';
  }
}