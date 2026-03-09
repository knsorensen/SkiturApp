import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { fetchAllUsers } from '../../services/users';
import { User } from '../../types';
import { useTrips } from '../../hooks/useTrips';
import { COLORS } from '../../constants';
import UserAvatar from '../../components/common/UserAvatar';

export default function ParticipantsScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { trips } = useTrips();

  useEffect(() => {
    fetchAllUsers()
      .then((u) => {
        setUsers(u);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Count how many trips each user participates in
  const tripCounts = new Map<string, number>();
  for (const trip of trips) {
    for (const uid of trip.participants) {
      tripCounts.set(uid, (tripCounts.get(uid) || 0) + 1);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Laster...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={users}
      keyExtractor={(item) => item.uid}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <Text style={styles.header}>
          {users.length} registrerte brukere
        </Text>
      }
      renderItem={({ item }) => {
        const count = tripCounts.get(item.uid) || 0;
        return (
          <View style={styles.row}>
            <View style={styles.avatarWrap}>
              <UserAvatar photoURL={item.photoURL} name={item.displayName} size={40} />
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.displayName}</Text>
              {item.phone ? (
                <Text style={styles.detail}>{item.phone}</Text>
              ) : null}
              <Text style={styles.detail}>{item.email}</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>
                {count} tur{count !== 1 ? 'er' : ''}
              </Text>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        <Text style={styles.emptyText}>Ingen registrerte brukere</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: COLORS.textSecondary,
  },
  list: {
    padding: 16,
    backgroundColor: COLORS.background,
  },
  header: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarWrap: {
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  detail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  countBadge: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: 40,
  },
});
