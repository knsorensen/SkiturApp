import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Timestamp, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthStore } from '../../stores/authStore';
import { updateTrip } from '../../services/trips';
import { inviteUserToTrip, inviteNewUserToTrip, subscribeToTripInvites, deleteInvite } from '../../services/tripInvites';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import LocationPicker from '../../components/map/LocationPicker';
import InvitePicker, { SelectedUser } from '../../components/trip/InvitePicker';
import { Trip, TripInvite } from '../../types';
import { COLORS } from '../../constants';

interface Props {
  tripId: string;
  onSaved: () => void;
  onCancel: () => void;
}

export default function EditTripScreen({ tripId, onSaved, onCancel }: Props) {
  const user = useAuthStore((s) => s.user);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [title, setTitle] = useState('');
  const [existingInvites, setExistingInvites] = useState<TripInvite[]>([]);
  const [invitedUsers, setInvitedUsers] = useState<SelectedUser[]>([]);
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [endLocationName, setEndLocationName] = useState('');
  const [startCoords, setStartCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [endCoords, setEndCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'trips', tripId), (snapshot) => {
      if (snapshot.exists()) {
        const t = { id: snapshot.id, ...snapshot.data() } as Trip;
        setTrip(t);
        setTitle(t.title);
        setDescription(t.description);
        setLocationName(t.location.name);
        setStartCoords(
          t.location.latitude !== 0
            ? { latitude: t.location.latitude, longitude: t.location.longitude }
            : null
        );
        if (t.endLocation) {
          setEndLocationName(t.endLocation.name);
          setEndCoords(
            t.endLocation.latitude !== 0
              ? { latitude: t.endLocation.latitude, longitude: t.endLocation.longitude }
              : null
          );
        }
        const d = t.startDate?.toDate?.();
        if (d) {
          setDate(d.toISOString().split('T')[0]);
        }
      }
    });
    return unsubscribe;
  }, [tripId]);

  // Load existing invites
  useEffect(() => {
    const unsub = subscribeToTripInvites(tripId, (invites) => {
      setExistingInvites(invites);
      // Pre-populate selected users from existing invites (only on first load)
      setInvitedUsers((prev) => {
        if (prev.length > 0) return prev;
        return invites.map((i) => ({
          uid: i.uid,
          displayName: i.displayName,
          email: i.email,
          phone: i.phone,
        }));
      });
    });
    return unsub;
  }, [tripId]);

  const handleSave = async () => {
    if (!title.trim() || !locationName.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Tittel og startsted er påkrevd');
      } else {
        Alert.alert('Feil', 'Tittel og startsted er påkrevd');
      }
      return;
    }

    setLoading(true);
    try {
      const parsedDate = date ? new Date(date) : new Date();
      const data: any = {
        title: title.trim(),
        description: description.trim(),
        startDate: Timestamp.fromDate(parsedDate),
        location: {
          latitude: startCoords?.latitude ?? 0,
          longitude: startCoords?.longitude ?? 0,
          name: locationName.trim(),
        },
      };

      if (endCoords || endLocationName.trim()) {
        data.endLocation = {
          latitude: endCoords?.latitude ?? 0,
          longitude: endCoords?.longitude ?? 0,
          name: endLocationName.trim() || 'Sluttpunkt',
        };
      }

      await updateTrip(tripId, data);

      // Delete removed invites
      const selectedKeys = new Set(invitedUsers.map((s) => s.uid || s.email || s.phone));
      for (const existing of existingInvites) {
        const existingKey = existing.uid || existing.email || existing.phone;
        if (!selectedKeys.has(existingKey)) {
          await deleteInvite(tripId, existing.id);
        }
      }

      // Send new invites (skip already invited)
      const existingIds = new Set(existingInvites.map((i) => i.uid || i.email));
      for (const inv of invitedUsers) {
        const key = inv.uid || inv.email;
        if (existingIds.has(key)) continue;
        if (inv.isNew || !inv.uid) {
          await inviteNewUserToTrip(tripId, inv.displayName, inv.email, inv.phone ?? '', user?.uid ?? '');
        } else {
          await inviteUserToTrip(tripId, inv, user?.uid ?? '');
        }
      }

      onSaved();
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(error.message);
      } else {
        Alert.alert('Feil', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!trip) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Rediger tur</Text>

        <Input
          label="Tittel"
          placeholder="F.eks. Påsketur Jotunheimen"
          value={title}
          onChangeText={setTitle}
        />
        <Input
          label="Beskrivelse"
          placeholder="Kort beskrivelse av turen"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.sectionLabel}>Startpunkt</Text>
        <Input
          label="Stedsnavn"
          placeholder="F.eks. Besseggen parkering"
          value={locationName}
          onChangeText={setLocationName}
        />
        <TouchableOpacity
          style={styles.locationPickerBtn}
          onPress={() => setShowStartPicker(true)}
        >
          <View style={styles.pickerContent}>
            <View style={[styles.dot, { backgroundColor: '#2A9D8F' }]} />
            <Text style={styles.locationPickerText}>
              {startCoords
                ? `${startCoords.latitude.toFixed(4)}, ${startCoords.longitude.toFixed(4)}`
                : 'Velg startpunkt på kart'}
            </Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Sluttpunkt (valgfritt)</Text>
        <Input
          label="Stedsnavn"
          placeholder="F.eks. Memurubu"
          value={endLocationName}
          onChangeText={setEndLocationName}
        />
        <TouchableOpacity
          style={styles.locationPickerBtn}
          onPress={() => setShowEndPicker(true)}
        >
          <View style={styles.pickerContent}>
            <View style={[styles.dot, { backgroundColor: '#E63946' }]} />
            <Text style={styles.locationPickerText}>
              {endCoords
                ? `${endCoords.latitude.toFixed(4)}, ${endCoords.longitude.toFixed(4)}`
                : 'Velg sluttpunkt på kart'}
            </Text>
          </View>
        </TouchableOpacity>

        <InvitePicker
          currentUserId={user?.uid ?? ''}
          selected={invitedUsers}
          onSelectionChange={setInvitedUsers}
          tripTitle={title}
        />

        <Input
          label="Dato (YYYY-MM-DD)"
          placeholder="2026-04-01"
          value={date}
          onChangeText={setDate}
        />

        <View style={styles.buttons}>
          <Button title="Lagre endringer" onPress={handleSave} loading={loading} />
          <View style={styles.spacer} />
          <Button title="Avbryt" onPress={onCancel} variant="secondary" />
        </View>
      </ScrollView>

      <Modal visible={showStartPicker} animationType="slide">
        <LocationPicker
          title="Velg startpunkt"
          initialLocation={startCoords ?? undefined}
          markerColor="#2A9D8F"
          onLocationSelected={(loc) => {
            setStartCoords(loc);
            setShowStartPicker(false);
          }}
          onCancel={() => setShowStartPicker(false)}
        />
      </Modal>

      <Modal visible={showEndPicker} animationType="slide">
        <LocationPicker
          title="Velg sluttpunkt"
          initialLocation={endCoords ?? startCoords ?? undefined}
          markerColor="#E63946"
          onLocationSelected={(loc) => {
            setEndCoords(loc);
            setShowEndPicker(false);
          }}
          onCancel={() => setShowEndPicker(false)}
        />
      </Modal>
    </KeyboardAvoidingView>
  );
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
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 8,
  },
  locationPickerBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    marginBottom: 16,
  },
  pickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  locationPickerText: {
    fontSize: 15,
    color: COLORS.primary,
  },
  buttons: {
    marginTop: 8,
  },
  spacer: {
    height: 12,
  },
});
