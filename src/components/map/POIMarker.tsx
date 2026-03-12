import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Marker } from 'react-native-maps';
import { PointOfInterest, POIIcon } from '../../types';

// SVG-style emoji markers that work on all platforms
const POI_CONFIG: Record<POIIcon, { emoji: string; color: string; label: string }> = {
  martini: { emoji: '🍸', color: '#8B5CF6', label: 'Afterski' },
  cabin: { emoji: '🏠', color: '#92400E', label: 'Hytte' },
  parking: { emoji: '🅿️', color: '#3B82F6', label: 'Parkering' },
  viewpoint: { emoji: '👁️', color: '#059669', label: 'Utsiktspunkt' },
  water: { emoji: '💧', color: '#0EA5E9', label: 'Vann' },
  danger: { emoji: '⚠️', color: '#DC2626', label: 'Fare' },
  food: { emoji: '🍕', color: '#F59E0B', label: 'Mat' },
  campfire: { emoji: '🔥', color: '#EA580C', label: 'Bålplass' },
  flag: { emoji: '🚩', color: '#E11D48', label: 'Mål' },
};

export function getPOIConfig(icon: POIIcon) {
  return POI_CONFIG[icon];
}

export function getAllPOITypes(): Array<{ icon: POIIcon; emoji: string; color: string; label: string }> {
  return (Object.keys(POI_CONFIG) as POIIcon[]).map((key) => ({
    icon: key,
    ...POI_CONFIG[key],
  }));
}

interface Props {
  poi: PointOfInterest;
  onPress?: (poi: PointOfInterest) => void;
}

export default function POIMarker({ poi, onPress }: Props) {
  const config = POI_CONFIG[poi.icon] || POI_CONFIG.flag;

  return (
    <Marker
      coordinate={{ latitude: poi.latitude, longitude: poi.longitude }}
      title={poi.name}
      description={config.label}
      onCalloutPress={() => onPress?.(poi)}
    >
      <View style={[styles.marker, { backgroundColor: config.color }]}>
        <Text style={styles.emoji}>{config.emoji}</Text>
      </View>
      <View style={[styles.arrow, { borderTopColor: config.color }]} />
    </Marker>
  );
}

const styles = StyleSheet.create({
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    ...Platform.select({
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.3)' },
      default: { elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
    }),
  },
  emoji: {
    fontSize: 18,
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    alignSelf: 'center',
    marginTop: -1,
  },
});
