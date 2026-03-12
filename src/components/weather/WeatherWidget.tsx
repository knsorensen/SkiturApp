import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { useWeather, WeatherForecast } from '../../hooks/useWeather';
import { useTheme } from '../../hooks/useTheme';

interface Props {
  latitude: number;
  longitude: number;
  compact?: boolean;
  tripDate?: Date;
}

const SYMBOL_EMOJI: Record<string, string> = {
  clearsky_day: '\u2600\ufe0f', clearsky_night: '\ud83c\udf19',
  fair_day: '\ud83c\udf24', fair_night: '\ud83c\udf19',
  partlycloudy_day: '\u26c5', partlycloudy_night: '\u2601\ufe0f',
  cloudy: '\u2601\ufe0f', rain: '\ud83c\udf27', lightrain: '\ud83c\udf26',
  heavyrain: '\ud83c\udf27', rainshowers_day: '\ud83c\udf26', rainshowers_night: '\ud83c\udf27',
  snow: '\u2744\ufe0f', lightsnow: '\u2744\ufe0f', heavysnow: '\ud83c\udf28',
  snowshowers_day: '\ud83c\udf28', snowshowers_night: '\ud83c\udf28',
  sleet: '\ud83c\udf28', fog: '\ud83c\udf2b', thunder: '\u26a1',
};

function symbolToEmoji(symbol: string): string {
  const base = symbol.replace(/_day|_night|_polartwilight/g, '');
  return SYMBOL_EMOJI[symbol] ?? SYMBOL_EMOJI[base] ?? '\u2601\ufe0f';
}

function symbolToNorwegian(symbol: string): string {
  const base = symbol.replace(/_day|_night|_polartwilight/g, '');
  const map: Record<string, string> = {
    clearsky: 'Klart', fair: 'Lettskyet', partlycloudy: 'Delvis skyet',
    cloudy: 'Skyet', rain: 'Regn', lightrain: 'Lett regn', heavyrain: 'Kraftig regn',
    rainshowers: 'Regnbyger', snow: 'Sn\u00f8', lightsnow: 'Lett sn\u00f8',
    heavysnow: 'Kraftig sn\u00f8fall', snowshowers: 'Sn\u00f8byger',
    sleet: 'Sludd', fog: 'T\u00e5ke', thunder: 'Tordenv\u00e6r',
  };
  return map[base] ?? base;
}

const DAY_NAMES = ['S\u00f8ndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'L\u00f8rdag'];
const DAY_SHORT = ['S\u00f8n', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'L\u00f8r'];
const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];

function formatDayLabel(d: Date): string {
  return `${DAY_SHORT[d.getDay()]} ${d.getDate()}. ${MONTH_NAMES[d.getMonth()]}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getDayEntries(forecast: WeatherForecast[], date: Date) {
  return forecast.filter((f) => f.time && isSameDay(new Date(f.time), date));
}

// Period names like Yr: natt, morgen, ettermiddag, kveld
const PERIODS = [
  { label: 'Natt', start: 0, end: 6 },
  { label: 'Morgen', start: 6, end: 12 },
  { label: 'Etterm.', start: 12, end: 18 },
  { label: 'Kveld', start: 18, end: 24 },
];

interface PeriodData {
  label: string;
  symbol: string;
  temp: string;
  wind: number;
  precip: number;
}

function getPeriodData(entries: WeatherForecast[]): PeriodData[] {
  return PERIODS.map((period) => {
    const periodEntries = entries.filter((e) => {
      const h = new Date(e.time).getHours();
      return h >= period.start && h < period.end;
    });

    if (periodEntries.length === 0) return null;

    const temps = periodEntries.map((e) => e.temperature).filter((t) => !isNaN(t));
    const winds = periodEntries.map((e) => e.windSpeed).filter((w) => !isNaN(w));
    const precip = periodEntries.reduce((s, e) => s + (e.precipitation || 0), 0);
    const mid = periodEntries[Math.floor(periodEntries.length / 2)];

    if (temps.length === 0) return null;

    const min = Math.round(Math.min(...temps));
    const max = Math.round(Math.max(...temps));

    return {
      label: period.label,
      symbol: mid?.symbol ?? 'cloudy',
      temp: min === max ? `${max}°` : `${min}°/${max}°`,
      wind: Math.round(winds.length > 0 ? winds.reduce((a, b) => a + b) / winds.length : 0),
      precip: Math.round(precip * 10) / 10,
    };
  }).filter(Boolean) as PeriodData[];
}

function summarizeDay(entries: WeatherForecast[]) {
  if (entries.length === 0) return null;
  const temps = entries.map((e) => e.temperature).filter((t) => !isNaN(t));
  const winds = entries.map((e) => e.windSpeed).filter((w) => !isNaN(w));
  const precip = entries.reduce((s, e) => s + (e.precipitation || 0), 0);
  const midday = entries.find((e) => { const h = new Date(e.time).getHours(); return h >= 10 && h <= 14; }) ?? entries[Math.floor(entries.length / 2)];
  if (temps.length === 0) return null;
  return {
    min: Math.round(Math.min(...temps)),
    max: Math.round(Math.max(...temps)),
    wind: Math.round(winds.length > 0 ? winds.reduce((a, b) => a + b) / winds.length : 0),
    precip: Math.round(precip * 10) / 10,
    symbol: midday?.symbol ?? 'cloudy',
  };
}

export default function WeatherWidget({ latitude, longitude, compact, tripDate }: Props) {
  const { forecast, loading, error } = useWeather(latitude, longitude);
  const { colors } = useTheme();

  if (latitude === 0 && longitude === 0) return null;
  if (loading) return <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}><ActivityIndicator size="small" color={colors.primary} /></View>;
  if (error || forecast.length === 0) return null;

  if (compact) {
    const c = forecast[0];
    return (
      <View style={styles.compactRow}>
        <Text style={styles.compactEmoji}>{symbolToEmoji(c.symbol)}</Text>
        <Text style={[styles.compactTemp, { color: colors.text }]}>{`${Math.round(c.temperature)}°`}</Text>
        <Text style={[styles.compactDesc, { color: colors.textSecondary }]}>{symbolToNorwegian(c.symbol)}</Text>
        <Text style={[styles.compactWind, { color: colors.textSecondary }]}>{Math.round(c.windSpeed)} m/s</Text>
      </View>
    );
  }

  if (tripDate) {
    // Build days: 3 days before trip day, closest first
    const days: Array<{ date: Date; label: string; isTrip: boolean }> = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(tripDate);
      d.setDate(d.getDate() - i);
      days.push({ date: d, label: formatDayLabel(d), isTrip: false });
    }

    const dayData = days.map((d) => ({
      ...d,
      entries: getDayEntries(forecast, d.date),
      summary: summarizeDay(getDayEntries(forecast, d.date)),
    }));

    // Trip day period breakdown (shown separately)
    const tripDayEntries = getDayEntries(forecast, tripDate);
    const tripPeriods = getPeriodData(tripDayEntries);

    const any = dayData.some((d) => d.summary) || tripPeriods.length > 0;
    if (!any) return (
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.textSecondary }]}>Værvarsel</Text>
        <Text style={[styles.noData, { color: colors.textSecondary }]}>Ikke tilgjengelig for denne datoen ennå</Text>
      </View>
    );

    return (
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.textSecondary }]}>Værvarsel</Text>

        {/* Trip day period breakdown (Yr-style) — shown first */}
        {tripPeriods.length > 0 && (
          <View style={styles.periodSection}>
            <Text style={[styles.periodTitle, { color: colors.primary }]}>
              Turdag — {DAY_NAMES[tripDate.getDay()].toLowerCase()} {tripDate.getDate()}. {MONTH_NAMES[tripDate.getMonth()]}
            </Text>
            <View style={styles.periodGrid}>
              {tripPeriods.map((p, i) => (
                <View key={i} style={[styles.periodItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.periodLabel, { color: colors.textSecondary }]}>{p.label}</Text>
                  <Text style={styles.periodIcon}>{symbolToEmoji(p.symbol)}</Text>
                  <Text style={[styles.periodTemp, { color: colors.text }]}>{p.temp}</Text>
                  <View style={styles.periodDetail}>
                    <Text style={[styles.periodMeta, { color: colors.textSecondary }]}>{p.wind} m/s</Text>
                    {p.precip > 0 && (
                      <Text style={[styles.periodMeta, { color: colors.primary }]}>{p.precip} mm</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Previous days summary */}
        {dayData.some((d) => d.summary) && (
          <View style={[styles.dayTable, tripPeriods.length > 0 && { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border }]}>
            <Text style={[styles.daysHeader, { color: colors.textSecondary }]}>Foregående dager</Text>
            {dayData.map((d, i) => {
              if (!d.summary) return null;
              return (
                <View key={i} style={[styles.dayRow, { backgroundColor: colors.background }]}>
                  <Text style={[styles.colDay, styles.dayLabel, { color: colors.text }]} numberOfLines={1}>
                    {d.label}
                  </Text>
                  <Text style={styles.colIcon}>{symbolToEmoji(d.summary.symbol)}</Text>
                  <Text style={[styles.colTemp, styles.dayTemp, { color: colors.text }]}>
                    {d.summary.min}° / {d.summary.max}°
                  </Text>
                  <Text style={[styles.colWind, styles.dayMeta, { color: colors.textSecondary }]}>
                    {d.summary.wind} m/s
                  </Text>
                  <Text style={[styles.colPrecip, styles.dayMeta, { color: d.summary.precip > 0 ? colors.primary : colors.textSecondary }]}>
                    {d.summary.precip} mm
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  }

  // Default current
  const c = forecast[0];
  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.textSecondary }]}>Vær nå</Text>
      <View style={styles.currentRow}>
        <Text style={{ fontSize: 40, marginRight: 14 }}>{symbolToEmoji(c.symbol)}</Text>
        <View>
          <Text style={[styles.currentTemp, { color: colors.text }]}>{`${Math.round(c.temperature)}°C`}</Text>
          <Text style={[styles.currentDetail, { color: colors.textSecondary }]}>
            {symbolToNorwegian(c.symbol)}, {Math.round(c.windSpeed)} m/s
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
      default: { elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
    }),
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  noData: { fontSize: 13, fontStyle: 'italic' },

  // Day table
  dayTable: { gap: 4 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 4,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  colDay: { width: 100, minWidth: 80 },
  colIcon: { width: 32, fontSize: 20, textAlign: 'center' },
  colTemp: { flex: 1, minWidth: 70 },
  colWind: { width: 60, minWidth: 50 },
  colPrecip: { width: 55, minWidth: 45, textAlign: 'right' },
  dayLabel: { fontSize: 13, fontWeight: '600' },
  tripLabel: { fontWeight: '700' },
  dayTemp: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  dayMeta: { fontSize: 12, textAlign: 'right' },

  // Period breakdown (Yr-style)
  periodSection: {
    marginBottom: 0,
  },
  daysHeader: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  periodTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  periodGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  periodItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  periodLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  periodIcon: {
    fontSize: 26,
    marginBottom: 4,
  },
  periodTemp: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  periodDetail: {
    alignItems: 'center',
    gap: 2,
  },
  periodMeta: {
    fontSize: 11,
  },

  // Current
  currentRow: { flexDirection: 'row', alignItems: 'center' },
  currentTemp: { fontSize: 28, fontWeight: '700' },
  currentDetail: { fontSize: 14, marginTop: 2 },

  // Compact
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compactEmoji: { fontSize: 20 },
  compactTemp: { fontSize: 16, fontWeight: '700' },
  compactDesc: { fontSize: 13 },
  compactWind: { fontSize: 13 },
});
