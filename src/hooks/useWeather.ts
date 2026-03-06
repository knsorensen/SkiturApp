import { useEffect, useState } from 'react';
import { fetchWeather, WeatherEntry } from '../services/weather';

export type { WeatherEntry as WeatherForecast };

export function useWeather(latitude: number, longitude: number) {
  const [forecast, setForecast] = useState<WeatherEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (latitude === 0 && longitude === 0) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchWeather(latitude, longitude)
      .then((data) => {
        if (!cancelled) {
          setForecast(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  return { forecast, loading, error };
}
