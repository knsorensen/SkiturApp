import { WEATHER } from '../constants';

export interface WeatherEntry {
  time: string; // ISO timestamp
  temperature: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  cloudCover: number;
  humidity: number;
  symbol: string;
  // 6-hour summary (available for longer forecasts)
  minTemp?: number;
  maxTemp?: number;
  precipAmount6h?: number;
  symbol6h?: string;
}

export async function fetchWeather(
  latitude: number,
  longitude: number
): Promise<WeatherEntry[]> {
  const url = `${WEATHER.baseUrl}complete?lat=${latitude.toFixed(4)}&lon=${longitude.toFixed(4)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': WEATHER.userAgent,
    },
  });

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  const data = await response.json();
  const timeseries = data.properties.timeseries;

  return timeseries.map((entry: any) => {
    const instant = entry.data.instant.details;
    const next1h = entry.data.next_1_hours;
    const next6h = entry.data.next_6_hours;
    return {
      time: entry.time,
      temperature: instant.air_temperature,
      windSpeed: instant.wind_speed,
      windDirection: instant.wind_from_direction ?? 0,
      precipitation: next1h?.details?.precipitation_amount ?? 0,
      cloudCover: instant.cloud_area_fraction ?? 0,
      humidity: instant.relative_humidity ?? 0,
      symbol: next1h?.summary?.symbol_code ?? next6h?.summary?.symbol_code ?? 'cloudy',
      minTemp: next6h?.details?.air_temperature_min,
      maxTemp: next6h?.details?.air_temperature_max,
      precipAmount6h: next6h?.details?.precipitation_amount,
      symbol6h: next6h?.summary?.symbol_code,
    };
  });
}
