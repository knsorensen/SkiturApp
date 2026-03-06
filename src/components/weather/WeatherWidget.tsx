import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useWeather, WeatherForecast } from '../../hooks/useWeather';
import { COLORS } from '../../constants';

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

const DAY_NAMES = ['S\u00f8n', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'L\u00f8r'];

function formatShortDate(d: Date): string {
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()}.`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getDayEntries(forecast: WeatherForecast[], date: Date) {
  return forecast.filter((f) => f.time && isSameDay(new Date(f.time), date));
}

function summarize(entries: WeatherForecast[]) {
  if (entries.length === 0) return null;
  const temps = entries.map((e) => e.temperature).filter((t) => t != null && !isNaN(t));
  const winds = entries.map((e) => e.windSpeed).filter((w) => w != null && !isNaN(w));
  const precip = entries.reduce((s, e) => s + (e.precipitation || 0), 0);
  const midday = entries.find((e) => { const h = new Date(e.time).getHours(); return h >= 10 && h <= 14; }) ?? entries[Math.floor(entries.length / 2)];
  if (temps.length === 0) return null;
  return {
    min: Math.round(Math.min(...temps)),
    max: Math.round(Math.max(...temps)),
    wind: Math.round(winds.length > 0 ? winds.reduce((a, b) => a + b, 0) / winds.length : 0),
    precip: Math.round(precip * 10) / 10,
    symbol: midday?.symbol ?? 'cloudy',
  };
}

export default function WeatherWidget({ latitude, longitude, compact, tripDate }: Props) {
  const { forecast, loading, error } = useWeather(latitude, longitude);

  if (latitude === 0 && longitude === 0) return null;
  if (loading) return <View style={styles.container}><ActivityIndicator size="small" color={COLORS.primary} /></View>;
  if (error || forecast.length === 0) return null;

  if (compact) {
    const c = forecast[0];
    return (
      <View style={styles.compactRow}>
        <Text style={styles.compactEmoji}>{symbolToEmoji(c.symbol)}</Text>
        <Text style={styles.compactTemp}>{Math.round(c.temperature)}\u00b0</Text>
        <Text style={styles.compactWind}>{Math.round(c.windSpeed)} m/s</Text>
      </View>
    );
  }

  if (tripDate) {
    // Build 4 days: 3 before + trip day
    const days: Array<{ date: Date; label: string; isTrip: boolean }> = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(tripDate);
      d.setDate(d.getDate() - i);
      days.push({ date: d, label: i === 0 ? 'TURDAG' : formatShortDate(d), isTrip: i === 0 });
    }

    const summaries = days.map((d) => ({ ...d, s: summarize(getDayEntries(forecast, d.date)), entries: getDayEntries(forecast, d.date) }));
    const any = summaries.some((d) => d.s);
    if (!any) return (
      <View style={styles.container}>
        <Text style={styles.title}>V\u00c6RVARSEL</Text>
        <Text style={styles.noData}>Ikke tilgjengelig for denne datoen enn\u00e5</Text>
      </View>
    );

    // Trip day hourly entries (every 3h, daytime 06-21)
    const tripDay = summaries.find((d) => d.isTrip);
    const hourly = tripDay?.entries.filter((e) => {
      const h = new Date(e.time).getHours();
      return h >= 6 && h <= 21 && h % 3 === 0;
    }).slice(0, 6) ?? [];

    return (
      <View style={styles.container}>
        <Text style={styles.title}>V\u00c6RVARSEL</Text>

        {/* Compact day rows */}
        <View style={styles.dayTable}>
          {summaries.map((d, i) => {
            if (!d.s) return null;
            return (
              <View key={i} style={[styles.dayRow, d.isTrip && styles.tripRow]}>
                <Text style={[styles.dayLabel, d.isTrip && styles.tripLabel]}>{d.label}</Text>
                <Text style={styles.dayIcon}>{symbolToEmoji(d.s.symbol)}</Text>
                <Text style={styles.dayTemp}>{d.s.min}\u00b0/{d.s.max}\u00b0</Text>
                <Text style={styles.dayWind}>{d.s.wind} m/s</Text>
                <Text style={styles.dayPrecip}>{d.s.precip} mm</Text>
              </View>
            );
          })}
        </View>

        {/* Trip day hourly */}
        {hourly.length > 0 && (
          <View style={styles.hourlyBox}>
            <Text style={styles.hourlyTitle}>Turdag timevarsel</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.hourlyRow}>
                {hourly.map((e, i) => {
                  const h = new Date(e.time).getHours();
                  return (
                    <View key={i} style={styles.hourlyItem}>
                      <Text style={styles.hTime}>{String(h).padStart(2, '0')}:00</Text>
                      <Text style={styles.hIcon}>{symbolToEmoji(e.symbol)}</Text>
                      <Text style={styles.hTemp}>{Math.round(e.temperature)}\u00b0C</Text>
                      <Text style={styles.hWind}>{Math.round(e.windSpeed)} m/s</Text>
                      {e.precipitation > 0 && <Text style={styles.hPrecip}>{e.precipitation} mm</Text>}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}
      </View>
    );
  }

  // Default current
  const c = forecast[0];
  return (
    <View style={styles.container}>
      <Text style={styles.title}>V\u00c6R</Text>
      <View style={styles.currentRow}>
        <Text style={{ fontSize: 36, marginRight: 12 }}>{symbolToEmoji(c.symbol)}</Text>
        <View>
          <Text style={styles.currentTemp}>{Math.round(c.temperature)}\u00b0C</Text>
          <Text style={styles.currentDetail}>{symbolToNorwegian(c.symbol)}, {Math.round(c.windSpeed)} m/s</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  title: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 10, letterSpacing: 0.5 },
  noData: { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic' },
  // Day table
  dayTable: { gap: 4 },
  dayRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 6, backgroundColor: COLORS.background },
  tripRow: { backgroundColor: '#EBF5FF', borderWidth: 1, borderColor: COLORS.primary },
  dayLabel: { width: 50, fontSize: 13, fontWeight: '600', color: COLORS.text },
  tripLabel: { color: COLORS.primary, fontWeight: '700' },
  dayIcon: { fontSize: 18, width: 30, textAlign: 'center' },
  dayTemp: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  dayWind: { width: 55, fontSize: 12, color: COLORS.textSecondary, textAlign: 'right' },
  dayPrecip: { width: 45, fontSize: 12, color: COLORS.textSecondary, textAlign: 'right' },
  // Hourly
  hourlyBox: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  hourlyTitle: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  hourlyRow: { flexDirection: 'row', gap: 16 },
  hourlyItem: { alignItems: 'center', minWidth: 56 },
  hTime: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  hIcon: { fontSize: 18, marginVertical: 2 },
  hTemp: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  hWind: { fontSize: 11, color: COLORS.textSecondary },
  hPrecip: { fontSize: 11, color: COLORS.primary },
  // Current
  currentRow: { flexDirection: 'row', alignItems: 'center' },
  currentTemp: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  currentDetail: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  // Compact
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  compactEmoji: { fontSize: 18 },
  compactTemp: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  compactWind: { fontSize: 13, color: COLORS.textSecondary },
});
