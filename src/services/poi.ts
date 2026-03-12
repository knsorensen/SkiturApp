import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { PointOfInterest, POIIcon } from '../types';

export function subscribeToPOIs(
  tripId: string,
  callback: (pois: PointOfInterest[]) => void
) {
  const q = query(
    collection(db, 'trips', tripId, 'pois'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snapshot) => {
    const pois = snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() } as PointOfInterest)
    );
    callback(pois);
  });
}

export async function addPOI(
  tripId: string,
  name: string,
  icon: POIIcon,
  latitude: number,
  longitude: number,
  userId: string
): Promise<string> {
  const docRef = await addDoc(collection(db, 'trips', tripId, 'pois'), {
    tripId,
    name,
    icon,
    latitude,
    longitude,
    addedBy: userId,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function deletePOI(tripId: string, poiId: string): Promise<void> {
  await deleteDoc(doc(db, 'trips', tripId, 'pois', poiId));
}
