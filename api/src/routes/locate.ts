import { Router } from 'express';
import { getStationMap } from '../services/railway.js';

const router = Router();

/**
 * 获取客户端真实 IP
 * 优先级：fly-client-ip → cf-connecting-ip → x-forwarded-for → req.ip
 */
function getClientIP(req: any): string {
  const headers = req.headers;
  return (
    headers['fly-client-ip'] ||
    headers['cf-connecting-ip'] ||
    (typeof headers['x-forwarded-for'] === 'string' 
      ? headers['x-forwarded-for'].split(',')[0].trim() 
      : null) ||
    req.ip ||
    '127.0.0.1'
  );
}

/**
 * 通过 ip-api.com 获取地理位置
 * 免费版：45 请求/分钟，无需 API Key，HTTP 即可
 */
async function getIPLocation(ip: string): Promise<{
  city: string;
  lat: number;
  lon: number;
  regionName: string;
} | null> {
  try {
    // 本地 IP 直接返回 null，使用 fallback
    if (ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return null;
    }

    const response = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN&fields=status,message,city,lat,lon,regionName`);
    const data = await response.json();

    if (data.status === 'success') {
      return {
        city: data.city,
        lat: data.lat,
        lon: data.lon,
        regionName: data.regionName,
      };
    }
    return null;
  } catch (error) {
    console.error('[Locate] IP API failed:', error);
    return null;
  }
}

/**
 * 找到最近的车站
 */
function findNearestStation(
  lat: number, 
  lon: number, 
  stationMap: Map<string, string>,
  stations: any[]
): { name: string; code: string; lat: number; lng: number } | null {
  let nearest = null;
  let minDistance = Infinity;

  for (const station of stations) {
    const distance = haversineKm(lat, lon, station.lat, station.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = station;
    }
  }

  return nearest;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = 
    Math.sin(dLat / 2) ** 2 + 
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * 
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

router.get('/', async (req, res) => {
  try {
    const clientIP = getClientIP(req);
    console.log('[Locate] Client IP:', clientIP);

    // 获取 IP 地理位置
    const location = await getIPLocation(clientIP);

    if (location) {
      // 加载车站数据
      const stationsResponse = await fetch('http://localhost:3002/data/stations.json');
      const stations = await stationsResponse.json();

      // 找到最近的车站
      const nearest = findNearestStation(location.lat, location.lon, new Map(), stations);

      if (nearest) {
        return res.json({
          city: nearest.name.replace(/站|东|西|南|北$/, ''), // 去掉"站"等后缀得到城市名
          code: nearest.code,
          lat: nearest.lat,
          lng: nearest.lng,
          province: location.regionName,
          source: 'ip',
        });
      }
    }

    // Fallback：杭州
    res.json({
      city: '杭州',
      code: 'HGH',
      lat: 30.2741,
      lng: 120.1551,
      province: '浙江省',
      source: 'fallback',
    });
  } catch (error) {
    console.error('[Locate] Error:', error);
    // 出错也返回 fallback
    res.json({
      city: '杭州',
      code: 'HGH',
      lat: 30.2741,
      lng: 120.1551,
      province: '浙江省',
      source: 'fallback',
    });
  }
});

export default router;