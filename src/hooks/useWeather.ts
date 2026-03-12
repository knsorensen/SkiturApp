import { useEffect, useState, useCallback, useRef } from 'react';
import { fetchWeather, WeatherEntry } from '../services/weather';

export type { WeatherEntry as WeatherForecast };

const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

export function useWeather(latitude: number, longitude: number) {
  const [forecast, setForecast] = useState<WeatherEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetch = useRef<number>(0);

  const doFetch = useCallback(() => {
    if (latitude === 0 && longitude === 0) return;

    setLoading(true);
    setError(null);

    fetchWeather(latitude, longitude)
      .then((data) => {
        setForecast(data);
        setLoading(false);
        lastFetch.current = Date.now();
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [latitude, longitude]);

  // Initial fetch
  useEffect(() => {
    doFetch();
  }, [doFetch]);

  // Auto-refresh
  useEffect(() => {
    if (latitude === 0 && longitude === 0) return;

    const interval = setInterval(() => {
      doFetch();
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [doFetch, latitude, longitude]);

  return { forecast, loading, error, refresh: doFetch };
}
