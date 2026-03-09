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
import {
  fetchAllUsers,
  createUser,
  updateUserRole,
  deleteUser as deleteUserService,
} from '../../services/users';
import { subscribeToTrips } from '../../services/trips';
import { useAuthStore } from '../../stores/authStore';
import { User, Trip } from '../../types';
import { COLORS } from '../../constants';
import UserAvatar from '../../components/common/UserAvatar';

export default function UsersScreen() {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<User[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const isAdmin = currentUser?.email === 'knsorensen@gmail.com' ||
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
      <View style={styles.center}>
        <Text style={styles.loadingText}>Laster...</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <Text style={styles.headerText}>
              {users.length} registrerte brukere
            </Text>
            {isAdmin && (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => setAddModalVisible(true)}
              >
                <Text style={styles.addBtnText}>+ Ny bruker</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const count = tripCountMap.get(item.uid) || 0;
          const roleLabel = item.role === 'admin' ? 'Admin' : '';
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => setDetailUser(item)}
            >
              <View style={styles.avatarWrap}>
                <UserAvatar photoURL={item.photoURL} name={item.displayName} size={40} />
              </View>
              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{item.displayName}</Text>
                  {roleLabel ? (
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminBadgeText}>{roleLabel}</Text>
                    </View>
                  ) : null}
                </View>
                {item.phone ? <Text style={styles.detail}>{item.phone}</Text> : null}
                {item.email ? <Text style={styles.detail}>{item.email}</Text> : null}
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>
                  {count} tur{count !== 1 ? 'er' : ''}
                </Text>
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
          <View style={styles.modalContent}>
            {detailUser && (
              <>
                <View style={styles.detailHeader}>
                  <View style={styles.detailAvatarWrap}>
                    <UserAvatar photoURL={detailUser.photoURL} name={detailUser.displayName} size={56} />
                  </View>
                  <View style={styles.detailInfo}>
                    <Text style={styles.detailName}>{detailUser.displayName}</Text>
                    <Text style={styles.detailRole}>
                      {detailUser.role === 'admin' ? 'Administrator' : 'Bruker'}
                    </Text>
                  </View>
                </View>

                {detailUser.email ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>E-post</Text>
                    <Text style={styles.detailValue}>{detailUser.email}</Text>
                  </View>
                ) : null}
                {detailUser.phone ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Mobil</Text>
                    <Text style={styles.detailValue}>{detailUser.phone}</Text>
                  </View>
                ) : null}

                {/* Trips list */}
                <Text style={styles.tripsTitle}>
                  Turer ({tripCountMap.get(detailUser.uid) || 0})
                </Text>
                {(userTripsMap.get(detailUser.uid) || []).length > 0 ? (
                  (userTripsMap.get(detailUser.uid) || []).map((trip) => (
                    <View key={trip.id} style={styles.tripRow}>
                      <Text style={styles.tripName}>{trip.title}</Text>
                      <Text style={styles.tripStatus}>
                        {trip.status === 'planning' ? 'Planlegges' :
                         trip.status === 'active' ? 'Aktiv' : 'Fullført'}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noTrips}>Ingen turer</Text>
                )}

                {/* Admin actions */}
                {isAdmin && detailUser.uid !== currentUser?.uid && (
                  <View style={styles.adminActions}>
                    <TouchableOpacity
                      style={styles.roleBtn}
                      onPress={() => handleToggleRole(detailUser)}
                    >
                      <Text style={styles.roleBtnText}>
                        {detailUser.role === 'admin' ? 'Fjern admin' : 'Gjør til admin'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteUser(detailUser)}
                    >
                      <Text style={styles.deleteBtnText}>Slett bruker</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setDetailUser(null)}
                >
                  <Text style={styles.closeBtnText}>Lukk</Text>
                </TouchableOpacity>
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ny bruker</Text>

            <Text style={styles.inputLabel}>Navn *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Fullt navn"
              placeholderTextColor={COLORS.textSecondary}
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={styles.inputLabel}>E-post</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="E-post"
              placeholderTextColor={COLORS.textSecondary}
              value={newEmail}
              onChangeText={setNewEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Mobilnummer</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="+47 123 45 678"
              placeholderTextColor={COLORS.textSecondary}
              value={newPhone}
              onChangeText={setNewPhone}
              keyboardType="phone-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => {
                  setAddModalVisible(false);
                  setNewName('');
                  setNewEmail('');
                  setNewPhone('');
                }}
              >
                <Text style={styles.cancelModalBtnText}>Avbryt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleAddUser}
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
    backgroundColor: COLORS.background,
  },
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
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  adminBadge: {
    backgroundColor: '#FFF3CD',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#856404',
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  cancelModalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  cancelModalBtnText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  // Detail modal
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailAvatarWrap: {
    marginRight: 16,
  },
  detailInfo: {
    flex: 1,
  },
  detailName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  detailRole: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  tripsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  tripRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tripName: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  tripStatus: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  noTrips: {
    fontSize: 13,
    color: COLORS.textSecondary,
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
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  roleBtnText: {
    color: '#856404',
    fontWeight: '700',
    fontSize: 14,
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: '#F8D7DA',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: '#721C24',
    fontWeight: '700',
    fontSize: 14,
  },
  closeBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeBtnText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
