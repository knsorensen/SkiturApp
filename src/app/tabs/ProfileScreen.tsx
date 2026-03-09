import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, Alert, ActionSheetIOS } from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { db, auth, storage } from '../../services/firebase';
import { useAuthStore } from '../../stores/authStore';
import { signOut } from '../../services/auth';
import { useTheme } from '../../hooks/useTheme';
import { useThemeStore, ThemePreference } from '../../stores/themeStore';
import { useTranslation, useLocaleStore } from '../../i18n';
import UserAvatar from '../../components/common/UserAvatar';

const THEME_OPTIONS: { label: string; value: ThemePreference }[] = [
  { label: 'System', value: 'system' },
  { label: 'Lys', value: 'light' },
  { label: 'Mork', value: 'dark' },
];

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

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

  // Ref for hidden web file input
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
      // On mobile browsers, <input type="file" accept="image/*"> natively
      // shows a menu with Camera / Photo Library / Browse options
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
      <Text style={[styles.title, { color: colors.text }]}>{t('profile.profile')}</Text>

      {/* Hidden file input for web — mobile browsers show camera/library choice natively */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef as any}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleWebFileSelected}
        />
      )}

      {/* Profile info section */}
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Personlig informasjon</Text>

        <View style={styles.avatarSection}>
          <UserAvatar photoURL={photoURL} name={displayName || '?'} size={80} />
          <TouchableOpacity
            style={[styles.changePhotoBtn, { backgroundColor: colors.primary }]}
            onPress={handleChangePhoto}
            disabled={uploadingPhoto}
          >
            <Text style={styles.changePhotoBtnText}>
              {uploadingPhoto ? 'Laster opp...' : 'Endre bilde'}
            </Text>
          </TouchableOpacity>
        </View>

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

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>E-post</Text>
        <Text style={[styles.fieldValue, { color: colors.text }]}>
          {user?.email || '-'}
        </Text>

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

        {editing ? (
          <View style={styles.editButtons}>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              disabled={saving}
            >
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
            >
              <Text style={[styles.cancelBtnText, { color: colors.text }]}>Avbryt</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: colors.primary }]}
            onPress={() => setEditing(true)}
          >
            <Text style={styles.editBtnText}>Rediger profil</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Theme section */}
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
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
                    backgroundColor: isActive ? colors.primary : colors.background,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setPreference(option.value)}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: isActive ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Language section */}
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {t('profile.language')}
        </Text>
        <View style={styles.optionRow}>
          <TouchableOpacity
            style={[
              styles.optionBtn,
              {
                backgroundColor: locale === 'nb' ? colors.primary : colors.background,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setLocale('nb')}
          >
            <Text
              style={[
                styles.optionText,
                { color: locale === 'nb' ? '#FFFFFF' : colors.text },
              ]}
            >
              {t('profile.languageNorwegian')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.optionBtn,
              {
                backgroundColor: locale === 'en' ? colors.primary : colors.background,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setLocale('en')}
          >
            <Text
              style={[
                styles.optionText,
                { color: locale === 'en' ? '#FFFFFF' : colors.text },
              ]}
            >
              {t('profile.languageEnglish')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sign out */}
      <TouchableOpacity
        style={[styles.signOutBtn, { backgroundColor: colors.error }]}
        onPress={signOut}
      >
        <Text style={styles.signOutText}>{t('auth.signOut')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  section: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  changePhotoBtn: {
    marginTop: 10,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  changePhotoBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  fieldLabel: {
    fontSize: 13,
    marginBottom: 4,
    marginTop: 8,
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 4,
  },
  editBtn: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  editBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  saveBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelBtnText: {
    fontWeight: '600',
    fontSize: 15,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  signOutBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  signOutText: {
    color: '#fff',
    fontWeight: '600',
  },
});
