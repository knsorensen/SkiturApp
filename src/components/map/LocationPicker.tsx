import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline, MapPressEvent } from 'react-native-maps';
import { COLORS } from '../../constants';

interface Props {
  initialLocation?: { latitude: number; longitude: number };
  initialEndLocation?: { latitude: number; longitude: number };
  onLocationSelected: (
    start: { latitude: number; longitude: number },
    end?: { latitude: number; longitude: number }
  ) => void;
  onCancel: () => void;
  mode?: 'single' | 'startend';
}

export default function LocationPicker({
  initialLocation,
  initialEndLocation,
  onLocationSelected,
  onCancel,
  mode = 'startend',
}: Props) {
  const [startPoint, setStartPoint] = useState<{
    latitude: number;
    longitude: number;
  } | null>(initialLocation ?? null);
  const [endPoint, setEndPoint] = useState<{
    latitude: number;
    longitude: number;
  } | null>(initialEndLocation ?? null);
  const [pickingEnd, setPickingEnd] = useState(false);

  const handleMapPress = useCallback(
    (e: MapPressEvent) => {
      const coord = e.nativeEvent.coordinate;
      if (mode === 'single' || !pickingEnd) {
        setStartPoint(coord);
        if (mode === 'startend' && !pickingEnd) {
          // After picking start, switch to end
        }
      } else {
        setEndPoint(coord);
      }
    },
    [pickingEnd, mode]
  );

  const handleConfirm = useCallback(() => {
    if (startPoint) {
      onLocationSelected(startPoint, endPoint ?? undefined);
    }
  }, [startPoint, endPoint, onLocationSelected]);

  const defaultRegion = initialLocation
    ? {
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }
    : {
        latitude: 61.5,
        longitude: 8.5,
        latitudeDelta: 5,
        longitudeDelta: 5,
      };

  const isSingleMode = mode === 'single';
  const canConfirm = isSingleMode ? !!startPoint : !!startPoint;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {isSingleMode
            ? 'Velg posisjon'
            : pickingEnd
            ? 'Velg sluttpunkt'
            : 'Velg startpunkt'}
        </Text>
        <Text style={styles.subtitle}>Trykk på kartet for å velge posisjon</Text>
        {!isSingleMode && (
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, !pickingEnd && styles.toggleActive]}
              onPress={() => setPickingEnd(false)}
            >
              <Text
                style={[styles.toggleText, !pickingEnd && styles.toggleTextActive]}
              >
                Startpunkt
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, pickingEnd && styles.toggleActive]}
              onPress={() => setPickingEnd(true)}
            >
              <Text
                style={[styles.toggleText, pickingEnd && styles.toggleTextActive]}
              >
                Sluttpunkt
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <MapView
        style={styles.map}
        initialRegion={defaultRegion}
        onPress={handleMapPress}
        mapType="terrain"
        showsUserLocation
        showsMyLocationButton
      >
        {startPoint && (
          <Marker
            coordinate={startPoint}
            pinColor="#2A9D8F"
            title="Startpunkt"
          />
        )}
        {endPoint && (
          <Marker
            coordinate={endPoint}
            pinColor="#E63946"
            title="Sluttpunkt"
          />
        )}
        {startPoint && endPoint && (
          <Polyline
            coordinates={[startPoint, endPoint]}
            strokeWidth={2}
            strokeColor={COLORS.primary}
          />
        )}
      </MapView>
      <View style={styles.info}>
        {startPoint && (
          <Text style={styles.infoText}>
            Start: {startPoint.latitude.toFixed(4)}, {startPoint.longitude.toFixed(4)}
          </Text>
        )}
        {endPoint && (
          <Text style={styles.infoText}>
            Slutt: {endPoint.latitude.toFixed(4)}, {endPoint.longitude.toFixed(4)}
          </Text>
        )}
      </View>
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Avbryt</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmBtn, !canConfirm && styles.disabled]}
          onPress={handleConfirm}
          disabled={!canConfirm}
        >
          <Text style={styles.confirmText}>Bekreft</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  toggleTextActive: {
    color: '#fff',
  },
  map: {
    flex: 1,
  },
  info: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  buttons: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.surface,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  disabled: {
    opacity: 0.5,
  },
});
