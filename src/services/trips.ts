import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from './firebase';
import { Trip } from '../types';

const tripsRef = collection(db, 'trips');

export function subscribeToTrips(
  _userId: string,
  callback: (trips: Trip[]) => void
) {
  const q = query(
    tripsRef,
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

export async function cloneTrip(sourceTripId: string, trip: Trip, userId: string): Promise<string> {
  const newTripId = await createTrip({
    title: trip.title,
    description: trip.description,
    createdBy: userId,
    status: 'planning',
    startDate: Timestamp.fromDate(new Date()),
    endDate: null,
    location: trip.location,
    endLocation: trip.endLocation,
    participants: [userId],
    invitedEmails: [],
  });

  // Clone shopping list items (unchecked)
  const shoppingRef = collection(db, 'trips', sourceTripId, 'shoppingList');
  const shoppingSnap = await getDocs(shoppingRef);
  const newShoppingRef = collection(db, 'trips', newTripId, 'shoppingList');
  for (const item of shoppingSnap.docs) {
    const data = item.data();
    await addDoc(newShoppingRef, {
      text: data.text,
      checked: false,
      addedBy: userId,
      createdAt: serverTimestamp(),
    });
  }

  // Clone invite list (reset status to pending)
  const invitesRef = collection(db, 'trips', sourceTripId, 'tripInvites');
  const invitesSnap = await getDocs(invitesRef);
  const newInvitesRef = collection(db, 'trips', newTripId, 'tripInvites');
  for (const inv of invitesSnap.docs) {
    const data = inv.data();
    await addDoc(newInvitesRef, {
      uid: data.uid,
      displayName: data.displayName,
      email: data.email,
      phone: data.phone ?? '',
      invitedBy: userId,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
  }

  return newTripId;
}
