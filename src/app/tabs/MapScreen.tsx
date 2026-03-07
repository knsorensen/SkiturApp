import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useTripStore } from '../../stores/tripStore';
import { useAuthStore } from '../../stores/authStore';
import { useRoutePoints, useParticipantPositions, useParticipantNames } from '../../hooks/useLocation';
import { startTracking, stopTracking } from '../../services/tracking';
import TripMap from '../../components/map/TripMap';
import TrackingControls from '../../components/map/TrackingControls';
import { COLORS } from '../../constants';

export default function MapScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const trips = useTripStore((s) => s.trips);
  const activeTrip = trips.find((t) => t.status === 'active');
  const [loading, setLoading] = useState(false);
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);

  const tripId = activeTrip?.id ?? '';
  const routePoints = useRoutePoints(tripId);
  const participantPositions = useParticipantPositions(tripId);
  const participantNames = useParticipantNames(activeTrip?.participants ?? []);

  // Redirect to Home if no active trip (handles direct URL access on web)
  useEffect(() => {
    if (!activeTrip) {
      if (Platform.OS === 'web') {
        window.location.replace('/');
      } else {
        navigation.navigate('Home');
      }
    }
  }, [activeTrip, navigation]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationGranted(status === 'granted');
    })();
  }, []);

  const requestLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationGranted(status === 'granted');
    if (status !== 'granted') {
      if (Platform.OS === 'web') {
        window.alert('Du må gi tilgang til posisjon for å vise deltakere på kartet.');
      } else {
        Alert.alert(
          'Posisjon kreves',
          'Du må gi appen tilgang til posisjonen din for at andre deltakere kan se hvor du er. Gå til Innstillinger og aktiver posisjon for SkiturApp.',
        );
      }
    }
  }, []);

  useEffect(() => {
    if (locationGranted === false) {
      requestLocation();
    }
  }, [locationGranted, requestLocation]);

  const handleStart = useCallback(async () => {
    if (!activeTrip || !user) {
      Alert.alert('Ingen aktiv tur', 'Start en tur først fra Turer-fanen.');
      return;
    }
    setLoading(true);
    try {
      await startTracking(activeTrip.id, user.uid);
    } catch (error: any) {
      Alert.alert('Feil', error.message);
    } finally {
      setLoading(false);
    }
  }, [activeTrip, user]);

  const handleStop = useCallback(async () => {
    setLoading(true);
    try {
      await stopTracking();
    } catch (error: any) {
      Alert.alert('Feil', error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  if (!activeTrip) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Ingen aktiv tur</Text>
        <Text style={styles.emptyText}>
          Start en tur fra Turer-fanen for å se kartet
        </Text>
      </View>
    );
  }

  const initialRegion = activeTrip.location.latitude !== 0
    ? {
        latitude: activeTrip.location.latitude,
        longitude: activeTrip.location.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : undefined;

  return (
    <View style={styles.container}>
      <TripMap
        routePoints={routePoints}
        participantPositions={participantPositions}
        participantNames={participantNames}
        initialRegion={initialRegion}
        startLocation={activeTrip.location}
        endLocation={activeTrip.endLocation}
        showSkiTrails={true}
        showsUserLocation={locationGranted === true}
      />
      <View style={styles.tripBanner}>
        <Text style={styles.tripName}>{activeTrip.title}</Text>
        {participantPositions.size > 0 && (
          <Text style={styles.participantCount}>
            {participantPositions.size} deltaker{participantPositions.size !== 1 ? 'e' : ''} på kartet
          </Text>
        )}
      </View>
      <TrackingControls
        onStart={handleStart}
        onStop={handleStop}
        loading={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  empty: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  tripBanner: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  tripName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  participantCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});
