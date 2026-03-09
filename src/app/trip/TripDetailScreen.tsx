import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  Modal,
  TextInput,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { doc, onSnapshot, collection, addDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { updateTrip, deleteTrip, addParticipant, removeParticipant } from '../../services/trips';
import { subscribeToTripInvites, respondToInvite, reinviteAll } from '../../services/tripInvites';
import { useAuthStore } from '../../stores/authStore';
import { Trip, TripInvite } from '../../types';
import { formatDate } from '../../utils/dateUtils';
import Button from '../../components/common/Button';
import UserAvatar from '../../components/common/UserAvatar';
import TripMap from '../../components/map/TripMap';
import WeatherWidget from '../../components/weather/WeatherWidget';
import { COLORS } from '../../constants';

interface ParticipantInfo {
  name: string;
  photoURL: string | null;
}

function useParticipantInfo(userIds: string[]) {
  const [info, setInfo] = useState<Map<string, ParticipantInfo>>(new Map());
  useEffect(() => {
    if (userIds.length === 0) return;
    const fetchInfo = async () => {
      const result = new Map<string, ParticipantInfo>();
      for (const uid of userIds) {
        try {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            result.set(uid, {
              name: data.displayName || 'Ukjent',
              photoURL: data.photoURL ?? null,
            });
          } else {
            result.set(uid, { name: 'Ukjent', photoURL: null });
          }
        } catch {
          result.set(uid, { name: 'Ukjent', photoURL: null });
        }
      }
      setInfo(result);
    };
    fetchInfo();
  }, [userIds.join(',')]);
  return info;
}

interface Props {
  tripId: string;
  onBack: () => void;
  onChat: (tripId: string) => void;
  onPhotos: (tripId: string) => void;
  onShopping: (tripId: string) => void;
  onArchive: (tripId: string) => void;
  onEdit: (tripId: string) => void;
  onParticipants?: () => void;
}

export default function TripDetailScreen({ tripId, onBack, onChat, onPhotos, onShopping, onArchive, onEdit, onParticipants }: Props) {
  const user = useAuthStore((s) => s.user);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [invites, setInvites] = useState<TripInvite[]>([]);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [reinviting, setReinviting] = useState(false);
  const [declineModalVisible, setDeclineModalVisible] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [declining, setDeclining] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists()) {
        setIsAdmin(snap.data().role === 'admin');
      }
    }).catch(() => {});
  }, [user?.uid]);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'trips', tripId), (snapshot) => {
      if (snapshot.exists()) {
        setTrip({ id: snapshot.id, ...snapshot.data() } as Trip);
      }
    });
    return unsubscribe;
  }, [tripId]);

  useEffect(() => {
    const unsub = subscribeToTripInvites(tripId, setInvites);
    return unsub;
  }, [tripId]);

  const participantInfo = useParticipantInfo(trip?.participants ?? []);

  if (!trip) {
    return (
      <View style={styles.loading}>
        <Text>Laster...</Text>
      </View>
    );
  }

  const isCreator = user?.uid === trip.createdBy;
  const date = trip.startDate?.toDate?.() ?? new Date();

  const handleStartTrip = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Vil du starte turen nå?')) {
        await updateTrip(tripId, { status: 'active' });
      }
    } else {
      Alert.alert('Start tur', 'Vil du starte turen nå?', [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            await updateTrip(tripId, { status: 'active' });
          },
        },
      ]);
    }
  };

  const handleCompleteTrip = async () => {
    const doComplete = async () => {
      await updateTrip(tripId, { status: 'completed' });
      onBack();
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Vil du avslutte turen?')) {
        await doComplete();
      }
    } else {
      Alert.alert('Avslutt tur', 'Vil du avslutte turen?', [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Avslutt', onPress: doComplete },
      ]);
    }
  };

  const handleDeleteTrip = async () => {
    const doDelete = async () => {
      await deleteTrip(tripId);
      onBack();
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Er du sikker på at du vil slette denne turen? Dette kan ikke angres.')) {
        await doDelete();
      }
    } else {
      Alert.alert('Slett tur', 'Er du sikker på at du vil slette denne turen? Dette kan ikke angres.', [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Slett', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const handleReinviteAll = async () => {
    if (!user?.uid) return;
    const doReinvite = async () => {
      setReinviting(true);
      try {
        const count = await reinviteAll(tripId, user.uid);
        const msg = count > 0
          ? `${count} invitasjon${count !== 1 ? 'er' : ''} sendt pa nytt.`
          : 'Alle invitasjoner er allerede aktive.';
        if (Platform.OS === 'web') {
          window.alert(msg);
        } else {
          Alert.alert('Invitasjoner', msg);
        }
      } catch {
        const msg = 'Kunne ikke sende invitasjoner. Prov igjen.';
        if (Platform.OS === 'web') {
          window.alert(msg);
        } else {
          Alert.alert('Feil', msg);
        }
      } finally {
        setReinviting(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Vil du sende ny invitasjon til alle tidligere inviterte?')) {
        await doReinvite();
      }
    } else {
      Alert.alert(
        'Inviter alle igjen',
        'Vil du sende ny invitasjon til alle tidligere inviterte?',
        [
          { text: 'Avbryt', style: 'cancel' },
          { text: 'Send', onPress: doReinvite },
        ]
      );
    }
  };

  const handleInviteSubmit = async () => {
    const phone = invitePhone.trim();
    if (!phone) {
      if (Platform.OS === 'web') {
        window.alert('Mobilnummer er påkrevd');
      } else {
        Alert.alert('Mangler mobilnummer', 'Du må oppgi et mobilnummer for å sende invitasjon.');
      }
      return;
    }

    setInviteSending(true);
    try {
      const token = Math.random().toString(36).substring(2, 10);
      await addDoc(collection(db, 'invites'), {
        tripId,
        invitedBy: user?.uid,
        name: inviteName.trim() || null,
        phone,
        email: inviteEmail.trim() || null,
        token,
        status: 'pending',
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const inviteUrl = `https://skiturapp.pages.dev`;
      const smsBody = `Hei${inviteName.trim() ? ` ${inviteName.trim()}` : ''}! Du er invitert på skitur: ${trip.title} (${formatDate(date)}). Last ned appen og bli med: ${inviteUrl}`;

      if (Platform.OS === 'web') {
        window.open(`sms:${phone}?body=${encodeURIComponent(smsBody)}`);
      } else {
        const smsUrl = Platform.OS === 'ios'
          ? `sms:${phone}&body=${encodeURIComponent(smsBody)}`
          : `sms:${phone}?body=${encodeURIComponent(smsBody)}`;
        await Linking.openURL(smsUrl);
      }

      setInviteModalVisible(false);
      setInviteName('');
      setInvitePhone('');
      setInviteEmail('');
    } catch (error) {
      const msg = 'Kunne ikke opprette invitasjon. Prøv igjen.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Feil', msg);
      }
    } finally {
      setInviteSending(false);
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      const msg = 'Du må oppgi en grunn for avmelding.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Mangler grunn', msg);
      }
      return;
    }
    if (!user?.uid) return;
    setDeclining(true);
    try {
      // Find invite by uid match
      const myInvite = invites.find((inv) => inv.uid === user.uid);
      if (myInvite) {
        await respondToInvite(tripId, myInvite.id, 'declined', declineReason.trim());
      }
      // Remove from participants if present
      if (trip.participants.includes(user.uid)) {
        await removeParticipant(tripId, user.uid);
      }
      setDeclineModalVisible(false);
      setDeclineReason('');
    } catch {
      const msg = 'Kunne ikke melde av. Prøv igjen.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Feil', msg);
      }
    } finally {
      setDeclining(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{trip.title}</Text>
        <View style={[styles.badge, { backgroundColor: statusColor(trip.status) }]}>
          <Text style={styles.badgeText}>{statusLabel(trip.status)}</Text>
        </View>
      </View>

      {trip.description ? (
        <Text style={styles.description}>{trip.description}</Text>
      ) : null}

      <View style={styles.infoSection}>
        <InfoRow label="Startsted" value={trip.location.name} />
        {trip.endLocation?.name ? (
          <InfoRow label="Sluttpunkt" value={trip.endLocation.name} />
        ) : null}
        <InfoRow label="Dato" value={formatDate(date)} />
      </View>

      {/* Participants & Invites section */}
      <View style={styles.inviteSection}>
        <View style={styles.inviteSectionHeader}>
          <Text style={styles.inviteSectionTitle}>
            Deltakere ({trip.participants.length})
          </Text>
          {isCreator && invites.some((inv) => inv.status !== 'pending') && (
            <TouchableOpacity
              style={styles.reinviteBtn}
              onPress={handleReinviteAll}
              disabled={reinviting}
            >
              <Text style={styles.reinviteBtnText}>
                {reinviting ? 'Sender...' : 'Inviter alle igjen'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Confirmed participants */}
        {trip.participants.map((uid) => {
          const pInfo = participantInfo.get(uid);
          const name = pInfo?.name || 'Laster...';
          return (
            <View key={uid} style={styles.inviteRow}>
              <View style={styles.avatarWrap}>
                <UserAvatar photoURL={pInfo?.photoURL} name={name} size={32} />
              </View>
              <View style={styles.inviteInfo}>
                <Text style={styles.inviteName}>{name}</Text>
                {uid === trip.createdBy && (
                  <Text style={styles.inviteEmail}>Opprettet turen</Text>
                )}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: '#D4EDDA' }]}>
                <Text style={[styles.statusText, { color: '#155724' }]}>Deltar</Text>
              </View>
            </View>
          );
        })}

        {/* Pending/accepted/declined invites (not already in participants) */}
        {invites
          .filter((inv) => !trip.participants.includes(inv.uid))
          .map((inv) => {
            const isMe = user?.uid === inv.uid;
            const canRespond = isMe && inv.status === 'pending';
            const canMeldAv = isMe && inv.status === 'accepted' && trip.status !== 'completed';
            return (
              <View key={inv.id}>
                <View style={styles.inviteRow}>
                  <View style={styles.avatarWrap}>
                    <UserAvatar photoURL={null} name={inv.displayName || '?'} size={32} />
                  </View>
                  <View style={styles.inviteInfo}>
                    <Text style={styles.inviteName}>{inv.displayName}</Text>
                    {inv.phone ? <Text style={styles.inviteEmail}>{inv.phone}</Text> : null}
                    {inv.status === 'declined' && inv.declineReason && (isCreator || isAdmin) ? (
                      <Text style={styles.declineReasonText}>«{inv.declineReason}»</Text>
                    ) : null}
                  </View>
                  {canRespond ? (
                    <View style={styles.inviteActions}>
                      <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={async () => {
                          await respondToInvite(tripId, inv.id, 'accepted');
                          await addParticipant(tripId, user!.uid);
                        }}
                      >
                        <Text style={styles.acceptText}>Deltar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.declineBtn}
                        onPress={async () => {
                          await respondToInvite(tripId, inv.id, 'declined');
                        }}
                      >
                        <Text style={styles.declineText}>Deltar ikke</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={[styles.statusBadge, statusBadgeStyle(inv.status)]}>
                      <Text style={[styles.statusText, statusTextStyle(inv.status)]}>
                        {inviteStatusLabel(inv.status)}
                      </Text>
                    </View>
                  )}
                </View>
                {canMeldAv && (
                  <TouchableOpacity
                    style={styles.meldAvBtn}
                    onPress={() => setDeclineModalVisible(true)}
                  >
                    <Text style={styles.meldAvBtnText}>Meld meg av turen</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
      </View>

      {trip.location.latitude !== 0 && (
        <View style={styles.mapContainer}>
          <TripMap
            routePoints={[]}
            participantPositions={new Map()}
            startLocation={trip.location}
            endLocation={trip.endLocation}
            showsUserLocation={false}
            showSkiTrails={trip.status === 'planning' || trip.status === 'active'}
            initialRegion={{
              latitude: trip.location.latitude,
              longitude: trip.location.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          />
        </View>
      )}

      <View style={styles.weatherSection}>
        <WeatherWidget
          latitude={trip.endLocation?.latitude ?? trip.location.latitude}
          longitude={trip.endLocation?.longitude ?? trip.location.longitude}
          tripDate={date}
        />
      </View>

      <View style={styles.actions}>
        <Button title="Chat" onPress={() => onChat(tripId)} />
        <View style={styles.spacer} />
        <Button title="Bilder" onPress={() => onPhotos(tripId)} />
        <View style={styles.spacer} />
        <Button title="Handleliste" onPress={() => onShopping(tripId)} />
        <View style={styles.spacer} />
        {trip.status === 'completed' && (
          <>
            <Button title="Se turarkiv" onPress={() => onArchive(tripId)} />
            <View style={styles.spacer} />
          </>
        )}
        <Button title="Inviter deltaker" onPress={() => setInviteModalVisible(true)} variant="secondary" />
        {onParticipants && (
          <>
            <View style={styles.spacer} />
            <Button title="Alle brukere" onPress={onParticipants} variant="secondary" />
          </>
        )}

        {isCreator && trip.status === 'planning' && (
          <>
            <View style={styles.spacer} />
            <Button title="Start tur" onPress={handleStartTrip} />
          </>
        )}

        {isCreator && trip.status === 'active' && (
          <>
            <View style={styles.spacer} />
            <Button title="Avslutt tur" onPress={handleCompleteTrip} variant="danger" />
          </>
        )}

        {isCreator && (
          <>
            <View style={styles.spacer} />
            <Button title="Rediger tur" onPress={() => onEdit(tripId)} variant="secondary" />
            <View style={styles.spacer} />
            <Button title="Slett tur" onPress={handleDeleteTrip} variant="danger" />
          </>
        )}

        <View style={styles.spacer} />
        <Button title="Tilbake" onPress={onBack} variant="secondary" />
      </View>
      <Modal
        visible={inviteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Inviter deltaker</Text>

            <Text style={styles.inputLabel}>Navn</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Navn (valgfritt)"
              placeholderTextColor={COLORS.textSecondary}
              value={inviteName}
              onChangeText={setInviteName}
            />

            <Text style={styles.inputLabel}>Mobilnummer *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="+47 123 45 678"
              placeholderTextColor={COLORS.textSecondary}
              value={invitePhone}
              onChangeText={setInvitePhone}
              keyboardType="phone-pad"
              autoComplete="tel"
            />

            <Text style={styles.inputLabel}>E-post</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="E-post (valgfritt)"
              placeholderTextColor={COLORS.textSecondary}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.modalButtons}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Button
                  title="Avbryt"
                  onPress={() => {
                    setInviteModalVisible(false);
                    setInviteName('');
                    setInvitePhone('');
                    setInviteEmail('');
                  }}
                  variant="secondary"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Button
                  title={inviteSending ? 'Sender...' : 'Send SMS'}
                  onPress={handleInviteSubmit}
                  disabled={inviteSending}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={declineModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeclineModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Meld av tur</Text>
            <Text style={styles.inputLabel}>Grunn for avmelding *</Text>
            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Skriv hvorfor du melder deg av..."
              placeholderTextColor={COLORS.textSecondary}
              value={declineReason}
              onChangeText={setDeclineReason}
              multiline
            />
            <View style={styles.modalButtons}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Button
                  title="Avbryt"
                  onPress={() => {
                    setDeclineModalVisible(false);
                    setDeclineReason('');
                  }}
                  variant="secondary"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Button
                  title={declining ? 'Melder av...' : 'Meld av'}
                  onPress={handleDecline}
                  disabled={declining}
                  variant="danger"
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function inviteStatusLabel(status: TripInvite['status']): string {
  const labels: Record<TripInvite['status'], string> = {
    pending: 'Venter',
    accepted: 'Deltar',
    declined: 'Deltar ikke',
  };
  return labels[status];
}

function statusBadgeStyle(status: TripInvite['status']) {
  const colors: Record<TripInvite['status'], string> = {
    pending: '#FFF3CD',
    accepted: '#D4EDDA',
    declined: '#F8D7DA',
  };
  return { backgroundColor: colors[status] };
}

function statusTextStyle(status: TripInvite['status']) {
  const colors: Record<TripInvite['status'], string> = {
    pending: '#856404',
    accepted: '#155724',
    declined: '#721C24',
  };
  return { color: colors[status] };
}

function statusLabel(status: Trip['status']): string {
  const labels: Record<Trip['status'], string> = {
    planning: 'Planlegges',
    active: 'Aktiv',
    completed: 'Fullført',
  };
  return labels[status];
}

function statusColor(status: Trip['status']): string {
  const colors: Record<Trip['status'], string> = {
    planning: COLORS.warning,
    active: COLORS.success,
    completed: COLORS.textSecondary,
  };
  return colors[status];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 24,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    marginRight: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  description: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 20,
    lineHeight: 22,
  },
  infoSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  mapContainer: {
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  weatherSection: {
    marginBottom: 20,
  },
  actions: {
    marginTop: 4,
  },
  spacer: {
    height: 12,
  },
  inviteSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inviteSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  inviteSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },
  reinviteBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  reinviteBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  avatarWrap: {
    marginRight: 10,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  inviteInfo: {
    flex: 1,
    marginRight: 8,
  },
  inviteName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  inviteEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  meldAvBtn: {
    backgroundColor: '#F8D7DA',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center' as const,
    marginTop: 6,
    marginBottom: 6,
  },
  meldAvBtnText: {
    color: '#721C24',
    fontWeight: '700' as const,
    fontSize: 14,
  },
  declineReasonText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 6,
  },
  acceptBtn: {
    backgroundColor: '#D4EDDA',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  acceptText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#155724',
  },
  declineBtn: {
    backgroundColor: '#F8D7DA',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  declineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#721C24',
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
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
    marginTop: 8,
  },
});
