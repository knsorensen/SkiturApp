import { WEATHER } from '../constants';

interface WeatherData {
  temperature: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  cloudCover: number;
  symbol: string;
}

export async function fetchWeather(
  latitude: number,
  longitude: number
): Promise<WeatherData[]> {
  const url = `${WEATHER.baseUrl}compact?lat=${latitude}&lon=${longitude}`;
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
    return {
      temperature: instant.air_temperature,
      windSpeed: instant.wind_speed,
      windDirection: instant.wind_from_direction,
      precipitation: next1h?.details?.precipitation_amount ?? 0,
      cloudCover: instant.cloud_area_fraction,
      symbol: next1h?.summary?.symbol_code ?? 'cloudy',
    };
  });
}
