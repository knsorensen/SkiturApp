import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { User } from '../types';

export async function fetchAllUsers(): Promise<User[]> {
  const q = query(collection(db, 'users'), orderBy('displayName'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    uid: d.id,
    role: 'user',
    ...d.data(),
  })) as User[];
}

export async function fetchUser(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, role: 'user', ...snap.data() } as User;
}

export async function createUser(data: {
  displayName: string;
  email: string;
  phone: string;
}): Promise<string> {
  const id = data.email
    ? data.email.replace(/[^a-zA-Z0-9]/g, '_')
    : `phone_${data.phone.replace(/[^0-9]/g, '')}`;
  await setDoc(doc(db, 'users', id), {
    uid: id,
    email: data.email,
    displayName: data.displayName,
    phone: data.phone,
    photoURL: null,
    fcmTokens: [],
    role: 'user',
    createdAt: serverTimestamp(),
  });
  return id;
}

export async function updateUserRole(uid: string, role: 'user' | 'admin') {
  await updateDoc(doc(db, 'users', uid), { role });
}

export async function deleteUser(uid: string) {
  await deleteDoc(doc(db, 'users', uid));
}
