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
import { useTrips } from '../../hooks/useTrips';
import { useAuthStore } from '../../stores/authStore';
import { cloneTrip } from '../../services/trips';
import TripCard from '../../components/trip/TripCard';
import { COLORS } from '../../constants';
import { Trip } from '../../types';

interface Props {
  onCreateTrip: () => void;
  onSelectTrip: (tripId: string) => void;
}

export default function TripsScreen({ onCreateTrip, onSelectTrip }: Props) {
  const { active, planning, completed } = useTrips();
  const user = useAuthStore((s) => s.user);

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

  const sections: Array<{ title: string; data: Trip[] }> = [];
  if (active.length > 0) sections.push({ title: 'Aktive turer', data: active });
  if (planning.length > 0) sections.push({ title: 'Planlagte turer', data: planning });
  if (completed.length > 0) sections.push({ title: 'Turhistorikk', data: completed });

  const allItems = sections.flatMap((section) => [
    { type: 'header' as const, title: section.title, key: `h-${section.title}` },
    ...section.data.map((trip) => ({ type: 'trip' as const, trip, key: trip.id })),
  ]);

  return (
    <View style={styles.container}>
      <FlatList
        data={allItems}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return <Text style={styles.sectionTitle}>{item.title}</Text>;
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
            <Text style={styles.emptyText}>Ingen turer enna</Text>
            <Text style={styles.emptySubtext}>Opprett din forste tur!</Text>
          </View>
        }
      />
      <TouchableOpacity style={styles.fab} onPress={onCreateTrip} activeOpacity={0.8}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 8,
    marginBottom: 10,
  },
  empty: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
});
