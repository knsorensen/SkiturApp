import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Trip } from '../../types';
import { formatDate } from '../../utils/dateUtils';
import { COLORS } from '../../constants';

interface Props {
  trip: Trip;
  onPress: () => void;
  onClone?: () => void;
}

const STATUS_LABELS: Record<Trip['status'], string> = {
  planning: 'Planlegges',
  active: 'Aktiv',
  completed: 'Fullfort',
};

const STATUS_COLORS: Record<Trip['status'], string> = {
  planning: COLORS.warning,
  active: COLORS.success,
  completed: COLORS.textSecondary,
};

const STATUS_ICONS: Record<Trip['status'], keyof typeof Ionicons.glyphMap> = {
  planning: 'calendar-outline',
  active: 'navigate-outline',
  completed: 'checkmark-circle-outline',
};

export default function TripCard({ trip, onPress, onClone }: Props) {
  const date = trip.startDate?.toDate?.() ?? new Date();
  const statusColor = STATUS_COLORS[trip.status];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Color accent bar on the left */}
      <View style={[styles.accentBar, { backgroundColor: statusColor }]} />

      <View style={styles.cardContent}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {trip.title}
          </Text>
          <View style={[styles.badge, { backgroundColor: statusColor + '18' }]}>
            <Ionicons name={STATUS_ICONS[trip.status]} size={13} color={statusColor} />
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {STATUS_LABELS[trip.status]}
            </Text>
          </View>
        </View>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={15} color={COLORS.textSecondary} />
          <Text style={styles.location} numberOfLines={1}>
            {trip.location.name}{trip.endLocation?.name ? ` → ${trip.endLocation.name}` : ''}
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.metaText}>{formatDate(date)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.metaText}>
                {trip.participants.length} deltaker{trip.participants.length !== 1 ? 'e' : ''}
              </Text>
            </View>
          </View>
          {onClone && (
            <TouchableOpacity
              style={styles.cloneBtn}
              onPress={(e) => {
                e.stopPropagation();
                onClone();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="copy-outline" size={14} color={COLORS.primary} />
              <Text style={styles.cloneBtnText}>Gjenta</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
    }),
  },
  accentBar: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 12,
  },
  location: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  cloneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cloneBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
