import type { Train, TrainStop, OriginInfo, Station, SearchStation } from '@/types/index';

const API_BASE = import.meta.env.VITE_API_BASE || '';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    throw new Error(`API ${response.status}: ${text}`);
  }
  return response.json() as Promise<T>;
}

export interface FetchTrainsParams {
  from: string;
  to: string;
  date: string;
  nocache?: boolean;
}

export interface FetchTrainsResult {
  trainCount: number;
  trains: Train[];
}

export async function fetchTrains(params: FetchTrainsParams): Promise<FetchTrainsResult> {
  const searchParams = new URLSearchParams({
    from: params.from,
    to: params.to,
    date: params.date,
  });
  if (params.nocache) searchParams.set('nocache', '1');

  const response = await fetch(`${API_BASE}/api/trains?${searchParams.toString()}`);
  return handleResponse<FetchTrainsResult>(response);
}

export interface BatchQuery {
  from: string;
  to: string;
  date: string;
  key: string;
}

export async function fetchTrainsBatch(
  queries: BatchQuery[],
  onChunk: (data: any) => void
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/trains/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queries }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    throw new Error(`Batch API ${response.status}: ${text}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.trim()) {
          try {
            const parsed = JSON.parse(line);
            onChunk(parsed);
          } catch (e) {
            console.warn('Failed to parse NDJSON line:', line, e);
          }
        }
      }
    }

    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer);
        onChunk(parsed);
      } catch (e) {
        console.warn('Failed to parse final NDJSON buffer:', buffer, e);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export interface FetchCitiesParams {
  from: string;
  date: string;
}

export interface FetchCitiesResult {
  cities: any[];
}

export async function fetchCities(params: FetchCitiesParams): Promise<FetchCitiesResult> {
  const searchParams = new URLSearchParams({
    from: params.from,
    date: params.date,
  });
  const response = await fetch(`${API_BASE}/api/cities?${searchParams.toString()}`);
  return handleResponse<FetchCitiesResult>(response);
}

export interface FetchTrainStopsParams {
  trainNo: string;
  from: string;
  to: string;
  date: string;
}

export interface FetchTrainStopsResult {
  trainNo: string;
  stops: TrainStop[];
}

export async function fetchTrainStops(params: FetchTrainStopsParams): Promise<FetchTrainStopsResult> {
  const searchParams = new URLSearchParams({
    trainNo: params.trainNo,
    from: params.from,
    to: params.to,
    date: params.date,
  });
  const response = await fetch(`${API_BASE}/api/train-stops?${searchParams.toString()}`);
  return handleResponse<FetchTrainStopsResult>(response);
}

export async function locateByIP(): Promise<OriginInfo> {
  // 本地开发用 localhost:3002，生产环境用 API_BASE
  const base = API_BASE || 'http://localhost:3002';
  const response = await fetch(`${base}/api/locate`);
  return handleResponse<OriginInfo>(response);
}

// 天气接口
export interface WeatherDay {
  date: string;
  tempMax: string;
  tempMin: string;
  textDay: string;
  iconDay: string;
}

export interface FetchWeatherResult {
  days: WeatherDay[];
}

export async function getWeather(lat: number, lng: number): Promise<FetchWeatherResult> {
  const searchParams = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
  });
  const response = await fetch(`${API_BASE}/api/weather?${searchParams.toString()}`);
  return handleResponse<FetchWeatherResult>(response);
}

export async function getWeatherText(lat: number, lng: number): Promise<string> {
  try {
    const data = await getWeather(lat, lng);
    if (data.days && data.days.length > 0) {
      const today = data.days[0];
      return `${today.tempMin}~${today.tempMax}° ${today.textDay}`;
    }
    return '';
  } catch (e) {
    return '';
  }
}

// 静态文件：直接从前端 public/data/ 读取
export async function fetchStations(): Promise<Station[]> {
  const response = await fetch('/data/stations.json');
  return handleResponse<Station[]>(response);
}

export async function fetchSearchStations(): Promise<SearchStation[]> {
  const response = await fetch('/data/search-stations.json');
  return handleResponse<SearchStation[]>(response);
}