import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

const ADMIN_EMAILS = ['knsorensen@gmail.com'];

export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function signUp(email: string, password: string, displayName: string, phone: string = '') {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(user);
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email,
    displayName,
    phone,
    photoURL: null,
    fcmTokens: [],
    role: ADMIN_EMAILS.includes(email) ? 'admin' : 'user',
    createdAt: serverTimestamp(),
  });
  return user;
}

export async function signIn(email: string, password: string) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  // Ensure admin role is set for admin emails and role field exists
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (!data.role || (ADMIN_EMAILS.includes(email) && data.role !== 'admin')) {
        await updateDoc(doc(db, 'users', user.uid), {
          role: ADMIN_EMAILS.includes(email) ? 'admin' : data.role || 'user',
        });
      }
    }
  } catch {
    // Non-critical, continue login
  }
  return user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}
