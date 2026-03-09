import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import appJson from '../../../app.json';
import { db } from '../../services/firebase';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { useTrips } from '../../hooks/useTrips';
import TripCard from '../../components/trip/TripCard';
import WeatherWidget from '../../components/weather/WeatherWidget';
import Button from '../../components/common/Button';
import { COLORS } from '../../constants';

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const { active, planning } = useTrips();
  const navigation = useNavigation<any>();

  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists()) {
        setDisplayName(snap.data().displayName || null);
      }
    }).catch(() => {});
  }, [user?.uid]);

  const upcoming = [...active, ...planning].slice(0, 5);
  const greeting = displayName || user?.displayName || 'turvenn';

  const appVersion = appJson.expo.version;

  return (
    <View style={styles.container}>
      <Text style={styles.versionTicker}>SkiturApp v{appVersion}</Text>
      <FlatList
        data={upcoming}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.greeting}>
              Hei, {greeting}!
            </Text>
            {active.length > 0 ? (
              <>
                <Text style={styles.subtitle}>
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
              <Text style={styles.subtitle}>Ingen aktive turer akkurat nå</Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TripCard
            trip={item}
            onPress={() =>
              navigation.navigate('TripsTab', {
                screen: 'TripDetail',
                params: { tripId: item.id },
              })
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Ingen kommende turer</Text>
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
    backgroundColor: COLORS.background,
  },
  versionTicker: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.textSecondary,
    paddingVertical: 4,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  list: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  weatherRow: {
    marginTop: 8,
  },
  empty: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  createButton: {
    width: '100%',
  },
});
