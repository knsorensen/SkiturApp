import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from './firebase';
import { Trip } from '../types';

const tripsRef = collection(db, 'trips');

export function subscribeToTrips(
  userId: string,
  callback: (trips: Trip[]) => void
) {
  const q = query(
    tripsRef,
    where('participants', 'array-contains', userId),
    orderBy('startDate', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const trips = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Trip[];
    callback(trips);
  });
}

export async function createTrip(trip: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>) {
  const docRef = await addDoc(tripsRef, {
    ...trip,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateTrip(tripId: string, data: Partial<Trip>) {
  await updateDoc(doc(db, 'trips', tripId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTrip(tripId: string) {
  await deleteDoc(doc(db, 'trips', tripId));
}

export async function addParticipant(tripId: string, userId: string) {
  await updateDoc(doc(db, 'trips', tripId), {
    participants: arrayUnion(userId),
    updatedAt: serverTimestamp(),
  });
}

export async function removeParticipant(tripId: string, userId: string) {
  await updateDoc(doc(db, 'trips', tripId), {
    participants: arrayRemove(userId),
    updatedAt: serverTimestamp(),
  });
}
