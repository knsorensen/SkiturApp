import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthStore } from '../../stores/authStore';
import { useTheme } from '../../hooks/useTheme';
import { subscribeToMessages, sendMessage } from '../../services/chat';
import { addParticipant } from '../../services/trips';
import { Message } from '../../types';
import { formatTime } from '../../utils/dateUtils';
import UserAvatar from '../../components/common/UserAvatar';

interface Props {
  tripId: string;
}

export default function TripChatScreen({ tripId }: Props) {
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const [userPhotos, setUserPhotos] = useState<Map<string, string | null>>(new Map());
  const fetchedUids = useRef(new Set<string>());

  useEffect(() => {
    const unsubscribe = subscribeToMessages(tripId, setMessages);
    return unsubscribe;
  }, [tripId]);

  useEffect(() => {
    const newUids = messages
      .map((m) => m.userId)
      .filter((uid) => !fetchedUids.current.has(uid));
    if (newUids.length === 0) return;
    const unique = [...new Set(newUids)];
    unique.forEach((uid) => fetchedUids.current.add(uid));
    Promise.all(
      unique.map(async (uid) => {
        try {
          const snap = await getDoc(doc(db, 'users', uid));
          return [uid, snap.exists() ? snap.data().photoURL ?? null : null] as const;
        } catch {
          return [uid, null] as const;
        }
      })
    ).then((results) => {
      setUserPhotos((prev) => {
        const next = new Map(prev);
        for (const [uid, url] of results) next.set(uid, url);
        return next;
      });
    });
  }, [messages]);

  const handleSend = async () => {
    if (!user || !text.trim()) return;
    const msg = text.trim();
    setText('');
    const displayName = user.displayName || user.email?.split('@')[0] || 'Ukjent';
    await sendMessage(tripId, user.uid, msg, null, displayName);
    addParticipant(tripId, user.uid).catch(() => {});
  };

  const handleSendPhoto = useCallback(async () => {
    if (!user) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Tillatelse', 'Vi trenger tilgang til bildebiblioteket.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) return;

    try {
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      const filename = `trips/${tripId}/chat/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob);
      const imageURL = await getDownloadURL(storageRef);
      const displayName = user.displayName || user.email?.split('@')[0] || 'Ukjent';
      await sendMessage(tripId, user.uid, '', imageURL, displayName);
    } catch (error: any) {
      Alert.alert('Feil', 'Kunne ikke sende bildet.');
    }
  }, [user, tripId]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.userId === user?.uid;
    const time = item.createdAt?.toDate?.() ?? new Date();
    const senderName = (item as any).displayName || '';

    if (isMe) {
      return (
        <View style={[styles.bubble, styles.bubbleMe, { backgroundColor: colors.primary }]}>
          {item.imageURL ? (
            <Image source={{ uri: item.imageURL }} style={styles.chatImage} />
          ) : null}
          {item.text ? (
            <Text style={styles.messageTextMe}>
              {item.text}
            </Text>
          ) : null}
          <Text style={styles.timeMe}>
            {formatTime(time)}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.messageRow}>
        <View style={styles.messageAvatar}>
          <UserAvatar
            photoURL={userPhotos.get(item.userId)}
            name={senderName}
            size={30}
          />
        </View>
        <View style={[styles.bubble, styles.bubbleOther, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {senderName ? (
            <Text style={[styles.senderName, { color: colors.primary }]}>{senderName}</Text>
          ) : null}
          {item.imageURL ? (
            <Image source={{ uri: item.imageURL }} style={styles.chatImage} />
          ) : null}
          {item.text ? (
            <Text style={[styles.messageText, { color: colors.text }]}>{item.text}</Text>
          ) : null}
          <Text style={[styles.time, { color: colors.textSecondary }]}>{formatTime(time)}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />
      <View style={[styles.inputRow, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.photoButton, { backgroundColor: colors.primary + '15' }]}
          onPress={handleSendPhoto}
          activeOpacity={0.7}
        >
          <Ionicons name="image-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
          placeholder="Skriv en melding..."
          placeholderTextColor={colors.textSecondary}
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: colors.primary }, !text.trim() && styles.sendDisabled]}
          onPress={handleSend}
          disabled={!text.trim()}
          activeOpacity={0.7}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  list: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  messageAvatar: {
    marginRight: 8,
    marginBottom: 0,
  },
  bubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
    marginBottom: 10,
  },
  bubbleMe: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    marginBottom: 0,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 3,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  messageTextMe: {
    fontSize: 15,
    lineHeight: 21,
    color: '#fff',
  },
  time: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeMe: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
  },
  chatImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  photoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
});
