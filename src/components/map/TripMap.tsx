import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { RoutePoint, Photo } from '../../types';
import { fetchSkiTrails, SkiTrail } from '../../services/skiTrails';
import { COLORS } from '../../constants';

interface Props {
  routePoints: RoutePoint[];
  participantPositions: Map<string, { latitude: number; longitude: number }>;
  photos?: Photo[];
  onPhotoPress?: (photo: Photo) => void;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  startLocation?: { latitude: number; longitude: number; name?: string };
  endLocation?: { latitude: number; longitude: number; name?: string };
  showsUserLocation?: boolean;
  showSkiTrails?: boolean;
}

const PARTICIPANT_COLORS = ['#E63946', '#457B9D', '#2A9D8F', '#E9C46A', '#F4A261'];

export default function TripMap({
  routePoints,
  participantPositions,
  photos = [],
  onPhotoPress,
  initialRegion,
  startLocation,
  endLocation,
  showsUserLocation = true,
  showSkiTrails = false,
}: Props) {
  const [skiTrails, setSkiTrails] = useState<SkiTrail[]>([]);

  useEffect(() => {
    if (!showSkiTrails || !startLocation) return;
    fetchSkiTrails(startLocation.latitude, startLocation.longitude, 15)
      .then(setSkiTrails)
      .catch(() => setSkiTrails([]));
  }, [showSkiTrails, startLocation?.latitude, startLocation?.longitude]);

  const routeCoords = routePoints.map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude,
  }));

  const defaultRegion = initialRegion ?? {
    latitude: 61.5,
    longitude: 8.5,
    latitudeDelta: 5,
    longitudeDelta: 5,
  };

  const allPoints = [...routeCoords];
  if (startLocation) allPoints.push({ latitude: startLocation.latitude, longitude: startLocation.longitude });
  if (endLocation) allPoints.push({ latitude: endLocation.latitude, longitude: endLocation.longitude });

  const region =
    allPoints.length > 0
      ? getRegionForCoordinates(allPoints)
      : defaultRegion;

  return (
    <MapView
      style={styles.map}
      initialRegion={region}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton
      mapType="terrain"
    >
      {/* Ski trails from Sporet.no */}
      {skiTrails.map((trail) => (
        <Polyline
          key={`trail-${trail.id}`}
          coordinates={trail.coordinates.map(([lng, lat]) => ({
            latitude: lat,
            longitude: lng,
          }))}
          strokeWidth={2}
          strokeColor={trail.hasClassic ? '#FF6B35' : '#9B59B6'}
        />
      ))}

      {/* GPS tracked route */}
      {routeCoords.length > 1 && (
        <Polyline
          coordinates={routeCoords}
          strokeWidth={3}
          strokeColor={COLORS.primary}
        />
      )}

      {startLocation && (
        <Marker
          coordinate={{ latitude: startLocation.latitude, longitude: startLocation.longitude }}
          pinColor="#2A9D8F"
          title={startLocation.name || 'Startpunkt'}
        />
      )}

      {endLocation && (
        <Marker
          coordinate={{ latitude: endLocation.latitude, longitude: endLocation.longitude }}
          pinColor="#E63946"
          title={endLocation.name || 'Sluttpunkt'}
        />
      )}

      {startLocation && endLocation && routeCoords.length <= 1 && (
        <Polyline
          coordinates={[
            { latitude: startLocation.latitude, longitude: startLocation.longitude },
            { latitude: endLocation.latitude, longitude: endLocation.longitude },
          ]}
          strokeWidth={2}
          strokeColor={COLORS.primary}
        />
      )}

      {Array.from(participantPositions.entries()).map(([userId, pos], idx) => (
        <Marker
          key={userId}
          coordinate={pos}
          pinColor={PARTICIPANT_COLORS[idx % PARTICIPANT_COLORS.length]}
          title={`Deltaker ${idx + 1}`}
        />
      ))}

      {photos.map((photo) => (
        <Marker
          key={photo.id}
          coordinate={{
            latitude: photo.location.latitude,
            longitude: photo.location.longitude,
          }}
          pinColor="#8338EC"
          title={photo.caption || 'Bilde'}
          onCalloutPress={() => onPhotoPress?.(photo)}
        />
      ))}
    </MapView>
  );
}

function getRegionForCoordinates(
  points: Array<{ latitude: number; longitude: number }>
) {
  let minLat = points[0].latitude;
  let maxLat = points[0].latitude;
  let minLng = points[0].longitude;
  let maxLng = points[0].longitude;

  for (const p of points) {
    minLat = Math.min(minLat, p.latitude);
    maxLat = Math.max(maxLat, p.latitude);
    minLng = Math.min(minLng, p.longitude);
    maxLng = Math.max(maxLng, p.longitude);
  }

  const padding = 0.01;
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(maxLat - minLat, 0.01) + padding,
    longitudeDelta: Math.max(maxLng - minLng, 0.01) + padding,
  };
}

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
