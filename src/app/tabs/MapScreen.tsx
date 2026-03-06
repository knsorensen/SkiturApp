import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useTripStore } from '../../stores/tripStore';
import { useAuthStore } from '../../stores/authStore';
import { useLocationStore } from '../../stores/locationStore';
import { useRoutePoints, useParticipantPositions } from '../../hooks/useLocation';
import { startTracking, stopTracking } from '../../services/tracking';
import TripMap from '../../components/map/TripMap';
import TrackingControls from '../../components/map/TrackingControls';
import { COLORS } from '../../constants';

export default function MapScreen() {
  const user = useAuthStore((s) => s.user);
  const trips = useTripStore((s) => s.trips);
  const activeTrip = trips.find((t) => t.status === 'active');
  const [loading, setLoading] = useState(false);

  const tripId = activeTrip?.id ?? '';
  const routePoints = useRoutePoints(tripId);
  const participantPositions = useParticipantPositions(tripId);

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
        initialRegion={initialRegion}
        startLocation={activeTrip.location}
        endLocation={activeTrip.endLocation}
      />
      <View style={styles.tripBanner}>
        <Text style={styles.tripName}>{activeTrip.title}</Text>
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
});
