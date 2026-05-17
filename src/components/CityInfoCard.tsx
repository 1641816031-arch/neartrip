import React, { useEffect, useState, useCallback } from 'react';
import { City, WeatherDay } from '../types';
import { getWeather } from '../services/weather';

interface CityProfile {
  intro: string;
  food: string[];
  tags: string[];
}

interface CityInfoCardProps {
  city: City;
  weatherDays?: WeatherDay[];
  expanded?: boolean;
  onToggle?: () => void;
}

// 模块级缓存
let profileCache: Record<string, CityProfile> | null = null;

const loadProfiles = async (): Promise<Record<string, CityProfile>> => {
  if (profileCache) return profileCache;
  try {
    const res = await fetch('/data/city-profiles.json');
    profileCache = await res.json();
    return profileCache || {};
  } catch {
    return {};
  }
};

const getClothingAdvice = (temp: number): string => {
  if (temp >= 30) return '短袖短裤';
  if (temp >= 25) return '薄长袖';
  if (temp >= 20) return '长袖衬衫';
  if (temp >= 15) return '薄外套';
  if (temp >= 10) return '毛衣/外套';
  if (temp >= 5) return '厚外套';
  return '羽绒服';
};

const CityInfoCard: React.FC<CityInfoCardProps> = ({ 
  city, 
  weatherDays: propWeatherDays, 
  expanded = false, 
  onToggle 
}) => {
  const [profile, setProfile] = useState<CityProfile | null>(null);
  const [weatherDays, setWeatherDays] = useState<WeatherDay[]>(propWeatherDays || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadProfiles().then(p => {
      if (mounted) setProfile(p[city.name] || null);
    });
    return () => { mounted = false; };
  }, [city.name]);

  useEffect(() => {
    if (propWeatherDays && propWeatherDays.length > 0) {
      setWeatherDays(propWeatherDays);
      return;
    }
    
    let mounted = true;
    setLoading(true);
    getWeather(city.lat, city.lng)
      .then((data: WeatherDay[]) => {
        if (mounted) setWeatherDays(data);
      })
      .catch(() => {
        if (mounted) setWeatherDays([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    
    return () => { mounted = false; };
  }, [city.lat, city.lng, propWeatherDays]);

  const todayWeather = weatherDays[0];
  const avgTemp = todayWeather 
    ? (parseInt(todayWeather.tempMax, 10) + parseInt(todayWeather.tempMin, 10)) / 2 
    : null;

  const compactIntro = profile?.intro 
    ? profile.intro.slice(0, 30) + (profile.intro.length > 30 ? '...' : '')
    : `${city.name}，${city.province || ''}`;

  return (
    <div className="bg-[var(--c-card)] rounded-xl p-4 shadow-sm">
      {/* 紧凑模式 */}
      <div 
        className="flex items-start justify-between gap-3 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--c-text)] leading-relaxed">
            {compactIntro}
          </p>
          {avgTemp !== null && (
            <p className="text-xs text-[var(--c-text-secondary)] mt-1">
              {todayWeather?.tempMin}~{todayWeather?.tempMax}° {todayWeather?.textDay} · 建议{getClothingAdvice(avgTemp || 0)}
            </p>
          )}
          {loading && (
            <p className="text-xs text-[var(--c-text-muted)] mt-1">加载天气中...</p>
          )}
        </div>
        <button className="text-[var(--c-text-muted)] hover:text-[var(--c-primary)] transition-colors shrink-0">
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 16 16" 
            fill="none" 
            className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          >
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* 展开模式 */}
      {expanded && profile && (
        <div className="mt-3 pt-3 border-t border-[var(--c-border-light)] space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-sm text-[var(--c-text-secondary)] leading-relaxed">
            {profile.intro}
          </p>
          
          {profile.food.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[var(--c-text-muted)] mb-2">特色美食</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.food.map((item, i) => (
                  <span 
                    key={i} 
                    className="px-2 py-0.5 bg-[var(--c-primary-light)] text-[var(--c-primary)] text-xs rounded-full"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {profile.tags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[var(--c-text-muted)] mb-2">城市标签</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.tags.map((tag, i) => (
                  <span 
                    key={i} 
                    className="px-2 py-0.5 bg-[var(--c-border-light)] text-[var(--c-text-secondary)] text-xs rounded-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CityInfoCard;