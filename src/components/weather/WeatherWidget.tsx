import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useWeather, WeatherForecast } from '../../hooks/useWeather';
import { COLORS } from '../../constants';

interface Props {
  latitude: number;
  longitude: number;
  compact?: boolean;
  tripDate?: Date;
}

const SYMBOL_EMOJI: Record<string, string> = {
  clearsky_day: '\u2600\ufe0f',
  clearsky_night: '\ud83c\udf19',
  fair_day: '\ud83c\udf24',
  fair_night: '\ud83c\udf19',
  partlycloudy_day: '\u26c5',
  partlycloudy_night: '\u2601\ufe0f',
  cloudy: '\u2601\ufe0f',
  rain: '\ud83c\udf27',
  lightrain: '\ud83c\udf26',
  heavyrain: '\ud83c\udf27',
  rainshowers_day: '\ud83c\udf26',
  rainshowers_night: '\ud83c\udf27',
  snow: '\u2744\ufe0f',
  lightsnow: '\u2744\ufe0f',
  heavysnow: '\ud83c\udf28',
  snowshowers_day: '\ud83c\udf28',
  snowshowers_night: '\ud83c\udf28',
  sleet: '\ud83c\udf28',
  fog: '\ud83c\udf2b',
  thunder: '\u26a1',
};

function symbolToEmoji(symbol: string): string {
  const base = symbol.replace(/_day|_night|_polartwilight/g, '');
  return SYMBOL_EMOJI[symbol] ?? SYMBOL_EMOJI[base] ?? '\u2601\ufe0f';
}

function windDescription(speed: number): string {
  if (speed < 1) return 'Stille';
  if (speed < 5) return 'Svak vind';
  if (speed < 11) return 'Moderat vind';
  if (speed < 17) return 'Frisk vind';
  if (speed < 25) return 'Sterk vind';
  return 'Storm';
}

function symbolToNorwegian(symbol: string): string {
  const base = symbol.replace(/_day|_night|_polartwilight/g, '');
  const map: Record<string, string> = {
    clearsky: 'Klart',
    fair: 'Lettskyet',
    partlycloudy: 'Delvis skyet',
    cloudy: 'Skyet',
    rain: 'Regn',
    lightrain: 'Lett regn',
    heavyrain: 'Kraftig regn',
    rainshowers: 'Regnbyger',
    snow: 'Sn\u00f8',
    lightsnow: 'Lett sn\u00f8',
    heavysnow: 'Kraftig sn\u00f8fall',
    snowshowers: 'Sn\u00f8byger',
    sleet: 'Sludd',
    fog: 'T\u00e5ke',
    thunder: 'Tordenv\u00e6r',
  };
  return map[base] ?? base;
}

const DAY_NAMES = ['S\u00f8n', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'L\u00f8r'];
const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];

function formatShortDate(d: Date): string {
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()}. ${MONTH_NAMES[d.getMonth()]}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function getDayForecasts(forecast: WeatherForecast[], targetDate: Date) {
  return forecast.filter((f) => {
    const d = new Date(f.time);
    return isSameDay(d, targetDate);
  });
}

function getDaySummary(entries: WeatherForecast[]) {
  if (entries.length === 0) return null;
  const temps = entries.map((e) => e.temperature);
  const winds = entries.map((e) => e.windSpeed);
  const precip = entries.reduce((sum, e) => sum + e.precipitation, 0);
  // Pick the midday symbol (around 12:00) or first available
  const midday = entries.find((e) => new Date(e.time).getHours() >= 11 && new Date(e.time).getHours() <= 14) ?? entries[0];
  return {
    minTemp: Math.min(...temps),
    maxTemp: Math.max(...temps),
    avgWind: winds.reduce((a, b) => a + b, 0) / winds.length,
    maxWind: Math.max(...winds),
    totalPrecip: precip,
    symbol: midday.symbol,
    humidity: midday.humidity,
    entries,
  };
}

export default function WeatherWidget({ latitude, longitude, compact, tripDate }: Props) {
  const { forecast, loading, error } = useWeather(latitude, longitude);

  if (latitude === 0 && longitude === 0) return null;

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  if (error || forecast.length === 0) return null;

  if (compact) {
    const current = forecast[0];
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.compactEmoji}>{symbolToEmoji(current.symbol)}</Text>
        <Text style={styles.compactTemp}>{Math.round(current.temperature)}\u00b0</Text>
        <Text style={styles.compactWind}>{Math.round(current.windSpeed)} m/s</Text>
      </View>
    );
  }

  // If tripDate is provided, show detailed forecast for trip day + 3 days before
  if (tripDate) {
    const days: Array<{ date: Date; label: string; isTrip: boolean }> = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(tripDate);
      d.setDate(d.getDate() - i);
      days.push({
        date: d,
        label: i === 0 ? `Turdag (${formatShortDate(d)})` : formatShortDate(d),
        isTrip: i === 0,
      });
    }

    const daySummaries = days.map((day) => ({
      ...day,
      summary: getDaySummary(getDayForecasts(forecast, day.date)),
    }));

    const hasForecast = daySummaries.some((d) => d.summary !== null);
    if (!hasForecast) {
      return (
        <View style={styles.container}>
          <Text style={styles.sectionTitle}>V\u00c6R</Text>
          <Text style={styles.noData}>V\u00e6rvarsel er ikke tilgjengelig for denne datoen enn\u00e5</Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>V\u00c6RVARSEL</Text>
        {daySummaries.map((day, idx) => {
          if (!day.summary) return null;
          const s = day.summary;
          return (
            <View
              key={idx}
              style={[styles.dayCard, day.isTrip && styles.tripDayCard]}
            >
              <View style={styles.dayHeader}>
                <Text style={[styles.dayLabel, day.isTrip && styles.tripDayLabel]}>
                  {day.label}
                </Text>
                <Text style={styles.dayEmoji}>{symbolToEmoji(s.symbol)}</Text>
              </View>
              <Text style={styles.dayCondition}>{symbolToNorwegian(s.symbol)}</Text>
              <View style={styles.dayStats}>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Temp</Text>
                  <Text style={styles.statValue}>
                    {Math.round(s.minTemp)}\u00b0 / {Math.round(s.maxTemp)}\u00b0
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Vind</Text>
                  <Text style={styles.statValue}>
                    {Math.round(s.avgWind)} m/s
                  </Text>
                  <Text style={styles.statSub}>
                    maks {Math.round(s.maxWind)}
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Nedb\u00f8r</Text>
                  <Text style={styles.statValue}>
                    {s.totalPrecip.toFixed(1)} mm
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Fukt</Text>
                  <Text style={styles.statValue}>
                    {Math.round(s.humidity)}%
                  </Text>
                </View>
              </View>

              {/* Hourly detail for trip day */}
              {day.isTrip && s.entries.length > 0 && (
                <View style={styles.hourlySection}>
                  <Text style={styles.hourlyTitle}>Timevarsel turdag</Text>
                  <View style={styles.hourlyRow}>
                    {s.entries
                      .filter((_, i) => i % 3 === 0)
                      .slice(0, 8)
                      .map((e, i) => {
                        const h = new Date(e.time).getHours();
                        return (
                          <View key={i} style={styles.hourlyItem}>
                            <Text style={styles.hourlyTime}>{String(h).padStart(2, '0')}</Text>
                            <Text style={styles.hourlyEmoji}>{symbolToEmoji(e.symbol)}</Text>
                            <Text style={styles.hourlyTemp}>{Math.round(e.temperature)}\u00b0</Text>
                            <Text style={styles.hourlyWind}>{Math.round(e.windSpeed)}</Text>
                          </View>
                        );
                      })}
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  }

  // Default: show current weather
  const current = forecast[0];
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>V\u00c6R</Text>
      <View style={styles.currentRow}>
        <Text style={styles.emoji}>{symbolToEmoji(current.symbol)}</Text>
        <View style={styles.currentInfo}>
          <Text style={styles.temp}>{Math.round(current.temperature)}\u00b0C</Text>
          <Text style={styles.detail}>
            {windDescription(current.windSpeed)} ({Math.round(current.windSpeed)} m/s)
          </Text>
          {current.precipitation > 0 && (
            <Text style={styles.detail}>
              Nedb\u00f8r: {current.precipitation} mm/t
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  noData: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 40,
    marginRight: 16,
  },
  currentInfo: {
    flex: 1,
  },
  temp: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  detail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  dayCard: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tripDayCard: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: '#EBF5FF',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dayLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  tripDayLabel: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  dayEmoji: {
    fontSize: 28,
  },
  dayCondition: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  dayStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  statSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  hourlySection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  hourlyTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  hourlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hourlyItem: {
    alignItems: 'center',
    flex: 1,
  },
  hourlyTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  hourlyEmoji: {
    fontSize: 16,
    marginVertical: 2,
  },
  hourlyTemp: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  hourlyWind: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactEmoji: {
    fontSize: 18,
  },
  compactTemp: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  compactWind: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
