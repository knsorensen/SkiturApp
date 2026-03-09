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
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthStore } from '../../stores/authStore';
import { subscribeToMessages, sendMessage } from '../../services/chat';
import { addParticipant } from '../../services/trips';
import { Message } from '../../types';
import { formatTime } from '../../utils/dateUtils';
import { COLORS } from '../../constants';
import UserAvatar from '../../components/common/UserAvatar';

interface Props {
  tripId: string;
}

export default function TripChatScreen({ tripId }: Props) {
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const [userPhotos, setUserPhotos] = useState<Map<string, string | null>>(new Map());
  const fetchedUids = useRef(new Set<string>());

  useEffect(() => {
    const unsubscribe = subscribeToMessages(tripId, setMessages);
    return unsubscribe;
  }, [tripId]);

  // Fetch photo URLs for message senders
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
    // Auto-join as participant if not already
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
        <View style={[styles.bubble, styles.bubbleMe]}>
          {item.imageURL ? (
            <Image source={{ uri: item.imageURL }} style={styles.chatImage} />
          ) : null}
          {item.text ? (
            <Text style={[styles.messageText, styles.messageTextMe]}>
              {item.text}
            </Text>
          ) : null}
          <Text style={[styles.time, styles.timeMe]}>
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
            size={28}
          />
        </View>
        <View style={[styles.bubble, styles.bubbleOther]}>
          {senderName ? (
            <Text style={styles.senderName}>{senderName}</Text>
          ) : null}
          {item.imageURL ? (
            <Image source={{ uri: item.imageURL }} style={styles.chatImage} />
          ) : null}
          {item.text ? (
            <Text style={styles.messageText}>{item.text}</Text>
          ) : null}
          <Text style={styles.time}>{formatTime(time)}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
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
      <View style={styles.inputRow}>
        <TouchableOpacity style={styles.photoButton} onPress={handleSendPhoto}>
          <Text style={styles.photoButtonText}>+</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Skriv en melding..."
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, !text.trim() && styles.sendDisabled]}
          onPress={handleSend}
          disabled={!text.trim()}
        >
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  list: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  messageAvatar: {
    marginRight: 6,
    marginBottom: 0,
  },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  bubbleMe: {
    backgroundColor: COLORS.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: COLORS.surface,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 0,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 20,
  },
  messageTextMe: {
    color: '#fff',
  },
  time: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeMe: {
    color: 'rgba(255,255,255,0.7)',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  chatImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  photoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 24,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: COLORS.text,
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
