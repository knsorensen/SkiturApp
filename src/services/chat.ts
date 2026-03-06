import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { Message } from '../types';

export function subscribeToMessages(
  tripId: string,
  callback: (messages: Message[]) => void,
  messageLimit = 50
) {
  const messagesRef = collection(db, 'trips', tripId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(messageLimit));
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as Message)
      .reverse();
    callback(messages);
  });
}

export async function sendMessage(
  tripId: string,
  userId: string,
  text: string,
  imageURL: string | null = null,
  displayName: string = ''
) {
  const messagesRef = collection(db, 'trips', tripId, 'messages');
  await addDoc(messagesRef, {
    userId,
    text,
    imageURL,
    displayName,
    createdAt: serverTimestamp(),
  });
}
