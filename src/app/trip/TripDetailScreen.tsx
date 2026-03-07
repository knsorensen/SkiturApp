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
import { doc, onSnapshot, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { updateTrip, deleteTrip, addParticipant, removeParticipant } from '../../services/trips';
import { subscribeToTripInvites, respondToInvite } from '../../services/tripInvites';
import { useAuthStore } from '../../stores/authStore';
import { Trip, TripInvite } from '../../types';
import { formatDate } from '../../utils/dateUtils';
import Button from '../../components/common/Button';
import TripMap from '../../components/map/TripMap';
import WeatherWidget from '../../components/weather/WeatherWidget';
import { COLORS } from '../../constants';

interface Props {
  tripId: string;
  onBack: () => void;
  onChat: (tripId: string) => void;
  onPhotos: (tripId: string) => void;
  onShopping: (tripId: string) => void;
  onArchive: (tripId: string) => void;
  onEdit: (tripId: string) => void;
}

export default function TripDetailScreen({ tripId, onBack, onChat, onPhotos, onShopping, onArchive, onEdit }: Props) {
  const user = useAuthStore((s) => s.user);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [invites, setInvites] = useState<TripInvite[]>([]);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSending, setInviteSending] = useState(false);

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
        <InfoRow
          label="Deltakere"
          value={`${trip.participants.length} person${trip.participants.length !== 1 ? 'er' : ''}`}
        />
      </View>

      {/* Invite list */}
      {invites.length > 0 && (
        <View style={styles.inviteSection}>
          <Text style={styles.inviteSectionTitle}>Inviterte deltakere</Text>
          {invites.map((inv) => {
            const isMe = user?.uid === inv.uid;
            const canRespond = isMe && inv.status === 'pending';
            return (
              <View key={inv.id} style={styles.inviteRow}>
                <View style={styles.inviteInfo}>
                  <Text style={styles.inviteName}>{inv.displayName}</Text>
                  {inv.email ? <Text style={styles.inviteEmail}>{inv.email}</Text> : null}
                  {inv.phone ? <Text style={styles.inviteEmail}>{inv.phone}</Text> : null}
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
                        await removeParticipant(tripId, user!.uid);
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
            );
          })}
        </View>
      )}

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
  inviteSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 10,
    letterSpacing: 0.3,
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
