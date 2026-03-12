import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTrips } from '../../hooks/useTrips';
import { useAuthStore } from '../../stores/authStore';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../hooks/useResponsive';
import { cloneTrip } from '../../services/trips';
import TripCard from '../../components/trip/TripCard';
import { Trip } from '../../types';

interface Props {
  onCreateTrip: () => void;
  onSelectTrip: (tripId: string) => void;
}

export default function TripsScreen({ onCreateTrip, onSelectTrip }: Props) {
  const { active, planning, completed } = useTrips();
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const { columns, isWide } = useResponsive();

  const handleClone = async (trip: Trip) => {
    if (!user?.uid) return;
    const doClone = async () => {
      try {
        const newTripId = await cloneTrip(trip.id, trip, user.uid);
        onSelectTrip(newTripId);
      } catch {
        const msg = 'Kunne ikke kopiere turen. Prov igjen.';
        if (Platform.OS === 'web') {
          window.alert(msg);
        } else {
          Alert.alert('Feil', msg);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Vil du opprette en ny tur basert pa "${trip.title}"?`)) {
        await doClone();
      }
    } else {
      Alert.alert('Gjenta tur', `Vil du opprette en ny tur basert pa "${trip.title}"?`, [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Gjenta', onPress: doClone },
      ]);
    }
  };

  const sections: Array<{ title: string; icon: keyof typeof Ionicons.glyphMap; data: Trip[] }> = [];
  if (active.length > 0) sections.push({ title: 'Aktive turer', icon: 'navigate-outline', data: active });
  if (planning.length > 0) sections.push({ title: 'Planlagte turer', icon: 'calendar-outline', data: planning });
  if (completed.length > 0) sections.push({ title: 'Turhistorikk', icon: 'checkmark-circle-outline', data: completed });

  const allItems = sections.flatMap((section) => [
    { type: 'header' as const, title: section.title, icon: section.icon, key: `h-${section.title}` },
    ...section.data.map((trip) => ({ type: 'trip' as const, trip, key: trip.id })),
  ]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={allItems}
        keyExtractor={(item) => item.key}
        contentContainerStyle={[styles.list, isWide && styles.listWide]}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <View style={styles.sectionHeader}>
                <Ionicons name={item.icon!} size={18} color={colors.textSecondary} />
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  {item.title}
                </Text>
              </View>
            );
          }
          return (
            <TripCard
              trip={item.trip}
              onPress={() => onSelectTrip(item.trip.id)}
              onClone={item.trip.status === 'completed' ? () => handleClone(item.trip) : undefined}
            />
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="compass-outline" size={48} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.text }]}>Ingen turer enna</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Opprett din forste tur!
            </Text>
          </View>
        }
      />
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={onCreateTrip}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  listWide: {
    paddingHorizontal: 0,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  empty: {
    alignItems: 'center',
    marginTop: 80,
    gap: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(27, 109, 178, 0.3)',
      },
      default: {
        elevation: 6,
        shadowColor: '#1B6DB2',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
    }),
  },
});
