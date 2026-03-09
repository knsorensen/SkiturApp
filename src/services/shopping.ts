import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { ShoppingItem } from '../types';

export function subscribeToShoppingList(
  tripId: string,
  callback: (items: ShoppingItem[]) => void
) {
  const ref = collection(db, 'trips', tripId, 'shoppingList');
  const q = query(ref, orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as ShoppingItem
    );
    callback(items);
  });
}

export async function addShoppingItem(
  tripId: string,
  text: string,
  userId: string
) {
  const ref = collection(db, 'trips', tripId, 'shoppingList');
  await addDoc(ref, {
    text,
    checked: false,
    addedBy: userId,
    createdAt: serverTimestamp(),
  });
}

export async function toggleShoppingItem(
  tripId: string,
  itemId: string,
  checked: boolean
) {
  await updateDoc(doc(db, 'trips', tripId, 'shoppingList', itemId), {
    checked,
  });
}

export async function updateShoppingItemText(
  tripId: string,
  itemId: string,
  text: string
) {
  await updateDoc(doc(db, 'trips', tripId, 'shoppingList', itemId), { text });
}

export async function removeShoppingItem(tripId: string, itemId: string) {
  await deleteDoc(doc(db, 'trips', tripId, 'shoppingList', itemId));
}
