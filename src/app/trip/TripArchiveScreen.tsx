import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { usePhotos } from '../../hooks/usePhotos';
import { useRoutePoints } from '../../hooks/useLocation';
import { totalDistance, elevationGain, elevationLoss } from '../../utils/geoUtils';
import { formatDate, formatDuration } from '../../utils/dateUtils';
import TripMap from '../../components/map/TripMap';
import PhotoGallery from '../../components/photos/PhotoGallery';
import PhotoViewer from '../../components/photos/PhotoViewer';
import ElevationProfile from '../../components/trip/ElevationProfile';
import { Trip, Photo } from '../../types';
import { COLORS } from '../../constants';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface Props {
  tripId: string;
}

export default function TripArchiveScreen({ tripId }: Props) {
  const [trip, setTrip] = useState<Trip | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'trips', tripId), (snapshot) => {
      if (snapshot.exists()) {
        setTrip({ id: snapshot.id, ...snapshot.data() } as Trip);
      }
    });
    return unsubscribe;
  }, [tripId]);

  if (!trip) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return <TripArchiveContent trip={trip} />;
}

function TripArchiveContent({ trip }: { trip: Trip }) {
  const routePoints = useRoutePoints(trip.id);
  const { photos } = usePhotos(trip.id);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const distance = totalDistance(routePoints);
  const gain = elevationGain(routePoints);
  const loss = elevationLoss(routePoints);

  const startTime = routePoints.length > 0
    ? (routePoints[0].timestamp?.toDate?.()?.getTime() ?? 0)
    : 0;
  const endTime = routePoints.length > 1
    ? (routePoints[routePoints.length - 1].timestamp?.toDate?.()?.getTime() ?? 0)
    : 0;
  const duration = endTime - startTime;

  const speeds = routePoints.map((p) => p.speed ?? 0).filter((s) => s > 0);
  const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
  const avgSpeed = speeds.length > 0
    ? speeds.reduce((a, b) => a + b, 0) / speeds.length
    : 0;

  const startDate = trip.startDate?.toDate?.() ?? new Date();

  const initialRegion = trip.location.latitude !== 0
    ? {
        latitude: trip.location.latitude,
        longitude: trip.location.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : undefined;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{trip.title}</Text>
      <Text style={styles.date}>{formatDate(startDate)}</Text>
      <Text style={styles.location}>{trip.location.name}</Text>

      <View style={styles.mapContainer}>
        <TripMap
          routePoints={routePoints}
          participantPositions={new Map()}
          photos={photos}
          onPhotoPress={setSelectedPhoto}
          initialRegion={initialRegion}
          startLocation={trip.location}
          endLocation={trip.endLocation}
          showsUserLocation={false}
          showSkiTrails
        />
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Distanse" value={`${(distance / 1000).toFixed(1)} km`} />
        <StatCard label="Stigning" value={`${Math.round(gain)} m`} />
        <StatCard label="Nedstigning" value={`${Math.round(loss)} m`} />
        <StatCard label="Tid" value={formatDuration(duration)} />
        <StatCard label="Maks fart" value={`${(maxSpeed * 3.6).toFixed(1)} km/t`} />
        <StatCard label="Snittfart" value={`${(avgSpeed * 3.6).toFixed(1)} km/t`} />
        <StatCard label="Deltakere" value={`${trip.participants.length}`} />
        <StatCard label="Bilder" value={`${photos.length}`} />
      </View>

      {routePoints.length > 2 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Høydeprofil</Text>
          <ElevationProfile
            points={routePoints.map((p) => ({ altitude: p.altitude }))}
            width={SCREEN_WIDTH - 48}
            height={140}
          />
        </View>
      )}

      {photos.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bilder ({photos.length})</Text>
          <View style={styles.galleryContainer}>
            <PhotoGallery
              photos={photos}
              onPhotoPress={setSelectedPhoto}
            />
          </View>
        </View>
      )}

      <Modal visible={!!selectedPhoto} animationType="fade">
        {selectedPhoto && (
          <PhotoViewer
            photo={selectedPhoto}
            onClose={() => setSelectedPhoto(null)}
          />
        )}
      </Modal>
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  date: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  location: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: 20,
  },
  mapContainer: {
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  galleryContainer: {
    minHeight: 200,
  },
});
