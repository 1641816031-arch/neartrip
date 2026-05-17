import { useState, useEffect, useRef } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';

const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || '';

export function useAMap() {
  const [AMap, setAMap] = useState<any>(null);
  const [map, setMap] = useState<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    if (!mapRef.current) return;
    if (!AMAP_KEY) {
      console.warn('VITE_AMAP_KEY is not set');
      return;
    }

    AMapLoader.load({
      key: AMAP_KEY,
      version: '2.0',
      plugins: [],
    })
      .then((AMapModule: any) => {
        if (!isMounted || !mapRef.current) return;

        const mapInstance = new AMapModule.Map(mapRef.current, {
          zoom: 6,
          viewMode: '2D',
          center: [120.1551, 30.2741], // 默认杭州中心
        });

        mapInstanceRef.current = mapInstance;
        setAMap(AMapModule);
        setMap(mapInstance);
      })
      .catch((error: any) => {
        console.error('Failed to load AMap:', error);
      });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying map:', e);
        }
        mapInstanceRef.current = null;
      }
      setMap(null);
      setAMap(null);
    };
  }, []);

  return { AMap, map, mapRef };
}