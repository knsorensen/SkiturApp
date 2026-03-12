import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Platform } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import appJson from '../../../app.json';
import { db } from '../../services/firebase';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { useTrips } from '../../hooks/useTrips';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../hooks/useResponsive';
import TripCard from '../../components/trip/TripCard';
import WeatherWidget from '../../components/weather/WeatherWidget';
import Button from '../../components/common/Button';

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const { active, planning } = useTrips();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { columns, isWide } = useResponsive();

  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists()) {
        setDisplayName(snap.data().displayName || null);
      }
    }).catch(() => {});
  }, [user?.uid]);

  const upcoming = [...active, ...planning].slice(0, 6);
  const greeting = displayName || user?.displayName || 'turvenn';
  const appVersion = appJson.expo.version;

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.greeting, { color: colors.text }]}>
        Hei, {greeting}!
      </Text>
      {active.length > 0 ? (
        <>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Du har {active.length} aktiv{active.length !== 1 ? 'e' : ''} tur{active.length !== 1 ? 'er' : ''}
          </Text>
          {active[0].location.latitude !== 0 && (
            <View style={styles.weatherRow}>
              <WeatherWidget
                latitude={active[0].location.latitude}
                longitude={active[0].location.longitude}
                compact
              />
            </View>
          )}
        </>
      ) : (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Ingen aktive turer akkurat nå
        </Text>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.versionTicker, { color: colors.textSecondary, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        SkiturApp v{appVersion}
      </Text>
      <FlatList
        data={upcoming}
        keyExtractor={(item) => item.id}
        numColumns={columns}
        key={`cols-${columns}`}
        contentContainerStyle={[styles.list, isWide && styles.listWide]}
        columnWrapperStyle={columns > 1 ? styles.columnWrapper : undefined}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <View style={columns > 1 ? { flex: 1, maxWidth: `${100 / columns}%` as any, paddingHorizontal: 6 } : undefined}>
            <TripCard
              trip={item}
              onPress={() =>
                navigation.navigate('TripsTab', {
                  screen: 'TripDetail',
                  params: { tripId: item.id },
                })
              }
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Klar for en tur?
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Opprett din forste tur og inviter venner
            </Text>
            <View style={styles.createButton}>
              <Button
                title="Opprett ny tur"
                onPress={() =>
                  navigation.navigate('TripsTab', { screen: 'CreateTrip' })
                }
              />
            </View>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  versionTicker: {
    textAlign: 'center',
    fontSize: 11,
    paddingVertical: 4,
    borderBottomWidth: 1,
  },
  list: {
    padding: 16,
  },
  listWide: {
    paddingHorizontal: 0,
    paddingTop: 24,
  },
  columnWrapper: {
    marginHorizontal: -6,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
    lineHeight: 22,
  },
  weatherRow: {
    marginTop: 12,
  },
  empty: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 15,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  createButton: {
    width: '100%',
    maxWidth: 300,
  },
});
