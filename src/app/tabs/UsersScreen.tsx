import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchAllUsers,
  createUser,
  updateUserRole,
  deleteUser as deleteUserService,
} from '../../services/users';
import { subscribeToTrips } from '../../services/trips';
import { useAuthStore } from '../../stores/authStore';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../hooks/useResponsive';
import { User, Trip } from '../../types';
import UserAvatar from '../../components/common/UserAvatar';

export default function UsersScreen() {
  const currentUser = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const { isWide } = useResponsive();
  const [users, setUsers] = useState<User[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const isAdmin = currentUser?.email === 'knsorensen@gmail.com' || currentUser?.email === 'daeand@gmail.com' ||
    users.find((u) => u.uid === currentUser?.uid)?.role === 'admin';

  const loadUsers = useCallback(() => {
    fetchAllUsers()
      .then((u) => {
        setUsers(u);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToTrips(currentUser.uid, setTrips);
    return unsub;
  }, [currentUser]);

  const tripCountMap = new Map<string, number>();
  const userTripsMap = new Map<string, Trip[]>();
  for (const trip of trips) {
    for (const uid of trip.participants) {
      tripCountMap.set(uid, (tripCountMap.get(uid) || 0) + 1);
      const list = userTripsMap.get(uid) || [];
      list.push(trip);
      userTripsMap.set(uid, list);
    }
  }

  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert(title, msg);
  };

  const confirmAction = (title: string, msg: string, onOk: () => void) => {
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) onOk();
    } else {
      Alert.alert(title, msg, [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'OK', onPress: onOk },
      ]);
    }
  };

  const handleAddUser = async () => {
    if (!newName.trim()) {
      showAlert('Feil', 'Navn er påkrevd');
      return;
    }
    if (!newEmail.trim() && !newPhone.trim()) {
      showAlert('Feil', 'E-post eller mobilnummer er påkrevd');
      return;
    }
    try {
      await createUser({
        displayName: newName.trim(),
        email: newEmail.trim(),
        phone: newPhone.trim(),
      });
      setAddModalVisible(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      loadUsers();
    } catch {
      showAlert('Feil', 'Kunne ikke opprette bruker');
    }
  };

  const handleDeleteUser = (user: User) => {
    confirmAction(
      'Slett bruker',
      `Er du sikker på at du vil slette ${user.displayName}? Dette kan ikke angres.`,
      async () => {
        try {
          await deleteUserService(user.uid);
          setDetailUser(null);
          loadUsers();
        } catch {
          showAlert('Feil', 'Kunne ikke slette bruker');
        }
      }
    );
  };

  const handleToggleRole = async (user: User) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const label = newRole === 'admin' ? 'administrator' : 'vanlig bruker';
    confirmAction(
      'Endre rolle',
      `Vil du gjøre ${user.displayName} til ${label}?`,
      async () => {
        try {
          await updateUserRole(user.uid, newRole);
          loadUsers();
          if (detailUser?.uid === user.uid) {
            setDetailUser({ ...user, role: newRole });
          }
        } catch {
          showAlert('Feil', 'Kunne ikke endre rolle');
        }
      }
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Laster...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={[styles.list, isWide && styles.listWide]}
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Ionicons name="people" size={18} color={colors.textSecondary} />
              <Text style={[styles.headerText, { color: colors.textSecondary }]}>
                {users.length} brukere
              </Text>
            </View>
            {isAdmin && (
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
                onPress={() => setAddModalVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.addBtnText}>Ny bruker</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const count = tripCountMap.get(item.uid) || 0;
          return (
            <TouchableOpacity
              style={[styles.row, { backgroundColor: colors.surface }]}
              onPress={() => setDetailUser(item)}
              activeOpacity={0.7}
            >
              <View style={styles.avatarWrap}>
                <UserAvatar photoURL={item.photoURL} name={item.displayName} size={42} />
              </View>
              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, { color: colors.text }]}>{item.displayName}</Text>
                  {item.role === 'admin' && (
                    <View style={[styles.adminBadge, { backgroundColor: colors.warning + '20' }]}>
                      <Text style={[styles.adminBadgeText, { color: colors.warning }]}>Admin</Text>
                    </View>
                  )}
                </View>
                {item.phone ? <Text style={[styles.detail, { color: colors.textSecondary }]}>{item.phone}</Text> : null}
                {item.email ? <Text style={[styles.detail, { color: colors.textSecondary }]}>{item.email}</Text> : null}
              </View>
              <View style={[styles.countBadge, { backgroundColor: colors.primary + '12' }]}>
                <Ionicons name="compass-outline" size={13} color={colors.primary} />
                <Text style={[styles.countText, { color: colors.primary }]}>{count}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* User detail modal */}
      <Modal
        visible={!!detailUser}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailUser(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            {detailUser && (
              <>
                <View style={styles.detailHeader}>
                  <UserAvatar photoURL={detailUser.photoURL} name={detailUser.displayName} size={56} />
                  <View style={styles.detailInfo}>
                    <Text style={[styles.detailName, { color: colors.text }]}>{detailUser.displayName}</Text>
                    <Text style={[styles.detailRole, { color: colors.textSecondary }]}>
                      {detailUser.role === 'admin' ? 'Administrator' : 'Bruker'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setDetailUser(null)} activeOpacity={0.7}>
                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {detailUser.email ? (
                  <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                    <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.detailValue, { color: colors.text }]}>{detailUser.email}</Text>
                  </View>
                ) : null}
                {detailUser.phone ? (
                  <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                    <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.detailValue, { color: colors.text }]}>{detailUser.phone}</Text>
                  </View>
                ) : null}

                <Text style={[styles.tripsTitle, { color: colors.textSecondary }]}>
                  Turer ({tripCountMap.get(detailUser.uid) || 0})
                </Text>
                {(userTripsMap.get(detailUser.uid) || []).length > 0 ? (
                  (userTripsMap.get(detailUser.uid) || []).map((trip) => (
                    <View key={trip.id} style={[styles.tripRow, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.tripName, { color: colors.text }]}>{trip.title}</Text>
                      <Text style={[styles.tripStatus, { color: colors.textSecondary }]}>
                        {trip.status === 'planning' ? 'Planlegges' :
                         trip.status === 'active' ? 'Aktiv' : 'Fullført'}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={[styles.noTrips, { color: colors.textSecondary }]}>Ingen turer</Text>
                )}

                {isAdmin && detailUser.uid !== currentUser?.uid && (
                  <View style={styles.adminActions}>
                    <TouchableOpacity
                      style={[styles.roleBtn, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '30' }]}
                      onPress={() => handleToggleRole(detailUser)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="shield-outline" size={16} color={colors.warning} />
                      <Text style={[styles.roleBtnText, { color: colors.warning }]}>
                        {detailUser.role === 'admin' ? 'Fjern admin' : 'Gjor til admin'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.deleteBtn, { backgroundColor: colors.error + '10', borderColor: colors.error + '30' }]}
                      onPress={() => handleDeleteUser(detailUser)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                      <Text style={[styles.deleteBtnText, { color: colors.error }]}>Slett</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Add user modal */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalTitleRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Ny bruker</Text>
              <TouchableOpacity onPress={() => { setAddModalVisible(false); setNewName(''); setNewEmail(''); setNewPhone(''); }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Navn *</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="Fullt navn"
              placeholderTextColor={colors.textSecondary}
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>E-post</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="E-post"
              placeholderTextColor={colors.textSecondary}
              value={newEmail}
              onChangeText={setNewEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Mobilnummer</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="+47 123 45 678"
              placeholderTextColor={colors.textSecondary}
              value={newPhone}
              onChangeText={setNewPhone}
              keyboardType="phone-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={handleAddUser}
                activeOpacity={0.8}
              >
                <Text style={styles.submitBtnText}>Opprett</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 16,
  },
  listWide: {
    paddingHorizontal: 0,
    paddingTop: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
      default: { elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
    }),
  },
  avatarWrap: {
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
  },
  adminBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detail: {
    fontSize: 13,
    marginTop: 2,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    maxHeight: '80%',
  },
  modalTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    marginTop: 8,
  },
  submitBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Detail modal
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 14,
  },
  detailInfo: {
    flex: 1,
  },
  detailName: {
    fontSize: 20,
    fontWeight: '700',
  },
  detailRole: {
    fontSize: 13,
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  tripsTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 18,
    marginBottom: 8,
  },
  tripRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  tripName: {
    fontSize: 14,
    flex: 1,
  },
  tripStatus: {
    fontSize: 12,
  },
  noTrips: {
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  adminActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  roleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
  },
  roleBtnText: {
    fontWeight: '700',
    fontSize: 13,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
  },
  deleteBtnText: {
    fontWeight: '700',
    fontSize: 13,
  },
});
