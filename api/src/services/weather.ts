import { weatherCache } from '../utils/cache.js';
import type { WeatherDay } from '../types.js';

const QWEATHER_HOST = 'https://p73tehyxm7.re.qweatherapi.com';
const QWEATHER_KEY = '41e41e8889c347fcb58c3d5b8f3c0d71';

const WEATHER_TTL = 2 * 60 * 60 * 1000;

export async function getWeather(params: { lat: number; lng: number }): Promise<WeatherDay[]> {
  const { lat, lng } = params;

  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);
  if (cached) return cached as WeatherDay[];

  const url = `${QWEATHER_HOST}/v7/weather/3d?location=${lng.toFixed(2)},${lat.toFixed(2)}&key=${QWEATHER_KEY}`;

  const response = await fetch(url, {
    headers: { 
      'Accept': 'application/json',
      'Accept-Encoding': 'identity'
    }
  });

  if (!response.ok) {
    throw new Error(`Weather API HTTP ${response.status}`);
  }

  const result = await response.json();

  if (result.code !== '200') {
    throw new Error(`Weather API error: code=${result.code}`);
  }

  if (!Array.isArray(result.daily)) {
    throw new Error('Invalid response: daily array missing');
  }

  const days: WeatherDay[] = result.daily.map((day: any) => ({
    date: day.fxDate || '',
    tempMax: day.tempMax || '',
    tempMin: day.tempMin || '',
    textDay: day.textDay || '',
    iconDay: day.iconDay || '',
  }));

  weatherCache.set(cacheKey, days, WEATHER_TTL);
  return days;
}
