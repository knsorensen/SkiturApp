import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, Alert, ActionSheetIOS } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { db, auth, storage } from '../../services/firebase';
import { useAuthStore } from '../../stores/authStore';
import { signOut } from '../../services/auth';
import { useTheme } from '../../hooks/useTheme';
import { useThemeStore, ThemePreference } from '../../stores/themeStore';
import { PALETTES, PaletteId } from '../../constants';
import { useTranslation, useLocaleStore } from '../../i18n';
import UserAvatar from '../../components/common/UserAvatar';

const THEME_OPTIONS: { label: string; value: ThemePreference; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'System', value: 'system', icon: 'phone-portrait-outline' },
  { label: 'Lys', value: 'light', icon: 'sunny-outline' },
  { label: 'Mork', value: 'dark', icon: 'moon-outline' },
];

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const themeStore = useThemeStore();
  const { preference, palette: paletteId } = themeStore;
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  // Load palette from Firestore on mount
  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.palette) useThemeStore.getState().setPalette(data.palette);
        if (data.themePreference) useThemeStore.getState().setPreference(data.themePreference);
      }
    });
  }, [user?.uid]);

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    setDisplayName(user.displayName || '');
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setPhone(data.phone ?? '');
        setPhotoURL(data.photoURL ?? null);
        if (data.displayName) setDisplayName(data.displayName);
      }
    });
  }, [user?.uid]);

  const handleSave = async () => {
    if (!user?.uid) return;
    const name = displayName.trim();
    if (!name) {
      const msg = 'Navn kan ikke vare tomt.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Mangler navn', msg);
      }
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: name,
        phone: phone.trim(),
      });
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: name });
      }
      setEditing(false);
    } catch {
      const msg = 'Kunne ikke lagre endringene. Prov igjen.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Feil', msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const uploadPhoto = async (blob: Blob) => {
    if (!user?.uid) return;
    setUploadingPhoto(true);
    try {
      const filename = `users/${user.uid}/profile_${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'users', user.uid), { photoURL: url });
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: url });
      }
      setPhotoURL(url);
    } catch (err: any) {
      const detail = err?.message || '';
      const msg = `Kunne ikke laste opp bildet. ${detail}`;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Feil', msg);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleWebFileSelected = async (event: any) => {
    const file = event.target?.files?.[0];
    if (!file) return;
    await uploadPhoto(file);
    event.target.value = '';
  };

  const pickAndUploadNative = async (useCamera: boolean) => {
    if (!user?.uid) return;

    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Tillatelse', 'Vi trenger tilgang til kameraet.');
        return;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Tillatelse', 'Vi trenger tilgang til bildebiblioteket.');
        return;
      }
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1] })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1] });

    if (result.canceled || !result.assets[0]) return;

    const response = await fetch(result.assets[0].uri);
    const blob = await response.blob();
    await uploadPhoto(blob);
  };

  const handleChangePhoto = () => {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
    } else if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Avbryt', 'Ta bilde', 'Velg fra bibliotek'],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) pickAndUploadNative(true);
          else if (index === 2) pickAndUploadNative(false);
        }
      );
    } else {
      Alert.alert('Endre profilbilde', 'Velg kilde', [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Ta bilde', onPress: () => pickAndUploadNative(true) },
        { text: 'Velg fra bibliotek', onPress: () => pickAndUploadNative(false) },
      ]);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef as any}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleWebFileSelected}
        />
      )}

      {/* Profile header card */}
      <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={handleChangePhoto} disabled={uploadingPhoto} activeOpacity={0.8}>
          <View style={styles.avatarContainer}>
            <UserAvatar photoURL={photoURL} name={displayName || '?'} size={90} />
            <View style={[styles.cameraIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>
        {uploadingPhoto && (
          <Text style={[styles.uploadingText, { color: colors.textSecondary }]}>Laster opp...</Text>
        )}
        <Text style={[styles.profileName, { color: colors.text }]}>
          {displayName || 'Uten navn'}
        </Text>
        <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
          {user?.email}
        </Text>
      </View>

      {/* Personal info section */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Personlig informasjon
            </Text>
          </View>
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)} activeOpacity={0.7}>
              <Ionicons name="create-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Navn</Text>
          {editing ? (
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Ditt navn"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="words"
            />
          ) : (
            <Text style={[styles.fieldValue, { color: colors.text }]}>
              {displayName || '-'}
            </Text>
          )}
        </View>

        <View style={[styles.fieldGroup, styles.fieldGroupBorder, { borderTopColor: colors.border }]}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>E-post</Text>
          <Text style={[styles.fieldValue, { color: colors.text }]}>
            {user?.email || '-'}
          </Text>
        </View>

        <View style={[styles.fieldGroup, styles.fieldGroupBorder, { borderTopColor: colors.border }]}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Mobilnummer</Text>
          {editing ? (
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={phone}
              onChangeText={setPhone}
              placeholder="Ditt mobilnummer"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
            />
          ) : (
            <Text style={[styles.fieldValue, { color: colors.text }]}>
              {phone || '-'}
            </Text>
          )}
        </View>

        {editing && (
          <View style={styles.editButtons}>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>{saving ? 'Lagrer...' : 'Lagre'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={() => {
                setEditing(false);
                setDisplayName(user?.displayName || '');
                getDoc(doc(db, 'users', user!.uid)).then((snap) => {
                  if (snap.exists()) setPhone(snap.data().phone ?? '');
                });
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Avbryt</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Settings section */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Innstillinger</Text>
          </View>
        </View>

        <Text style={[styles.settingLabel, { color: colors.text }]}>
          {locale === 'nb' ? 'Tema' : 'Theme'}
        </Text>
        <View style={styles.optionRow}>
          {THEME_OPTIONS.map((option) => {
            const isActive = preference === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionBtn,
                  {
                    backgroundColor: isActive ? colors.primary + '15' : colors.background,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  useThemeStore.getState().setPreference(option.value);
                  if (user?.uid) updateDoc(doc(db, 'users', user.uid), { themePreference: option.value }).catch(() => {});
                }}
                activeOpacity={0.7}
              >
                <Ionicons name={option.icon} size={16} color={isActive ? colors.primary : colors.textSecondary} />
                <Text
                  style={[
                    styles.optionText,
                    { color: isActive ? colors.primary : colors.text },
                    isActive && styles.optionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.settingLabel, { color: colors.text, marginTop: 16 }]}>
          Fargepalett
        </Text>
        <View style={styles.paletteRow}>
          {(Object.keys(PALETTES) as PaletteId[]).map((id) => {
            const p = PALETTES[id];
            const isActive = paletteId === id;
            const icon: keyof typeof Ionicons.glyphMap =
              id === 'nordic' ? 'snow-outline' :
              id === 'alpine' ? 'bonfire-outline' : 'flash-outline';
            return (
              <TouchableOpacity
                key={id}
                style={[
                  styles.paletteBtn,
                  {
                    borderColor: isActive ? p.preview[0] : colors.border,
                    backgroundColor: isActive ? p.preview[0] + '18' : colors.background,
                  },
                ]}
                onPress={() => {
                  useThemeStore.getState().setPalette(id);
                  if (user?.uid) updateDoc(doc(db, 'users', user.uid), { palette: id }).catch(() => {});
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.paletteIconWrap, { backgroundColor: p.preview[0] + '20' }]}>
                  <Ionicons name={icon} size={24} color={p.preview[0]} />
                </View>
                <Text
                  style={[
                    styles.paletteLabel,
                    { color: isActive ? p.preview[0] : colors.text },
                    isActive && { fontWeight: '700' },
                  ]}
                >
                  {p.label}
                </Text>
                {isActive && (
                  <Ionicons name="checkmark-circle" size={18} color={p.preview[0]} style={{ marginTop: 2 }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.settingLabel, { color: colors.text, marginTop: 16 }]}>
          {t('profile.language')}
        </Text>
        <View style={styles.optionRow}>
          {[
            { label: t('profile.languageNorwegian'), value: 'nb' as const },
            { label: t('profile.languageEnglish'), value: 'en' as const },
          ].map((option) => {
            const isActive = locale === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionBtn,
                  {
                    backgroundColor: isActive ? colors.primary + '15' : colors.background,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setLocale(option.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: isActive ? colors.primary : colors.text },
                    isActive && styles.optionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Sign out */}
      <TouchableOpacity
        style={[styles.signOutBtn, { borderColor: colors.error }]}
        onPress={signOut}
        activeOpacity={0.7}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.error} />
        <Text style={[styles.signOutText, { color: colors.error }]}>{t('auth.signOut')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  profileCard: {
    alignItems: 'center',
    borderRadius: 16,
    padding: 28,
    marginBottom: 16,
    ...Platform.select({
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
      default: { elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
    }),
  },
  avatarContainer: {
    position: 'relative',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  uploadingText: {
    fontSize: 12,
    marginTop: 6,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 14,
    letterSpacing: -0.3,
  },
  profileEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  section: {
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    ...Platform.select({
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
      default: { elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
    }),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldGroup: {
    paddingVertical: 10,
  },
  fieldGroupBorder: {
    borderTopWidth: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelBtnText: {
    fontWeight: '600',
    fontSize: 15,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  optionTextActive: {
    fontWeight: '600',
  },
  paletteRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  paletteBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 2,
    gap: 6,
    minWidth: 95,
  },
  paletteIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletteLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 32,
  },
  signOutText: {
    fontWeight: '600',
    fontSize: 15,
  },
});
