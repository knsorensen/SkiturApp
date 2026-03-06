import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

export const sendNotification = onDocumentCreated(
  'trips/{tripId}/messages/{messageId}',
  async (event) => {
    const message = event.data?.data();
    if (!message) return;

    const db = getFirestore();
    const tripDoc = await db.doc(`trips/${event.params.tripId}`).get();
    const trip = tripDoc.data();
    if (!trip) return;

    const senderDoc = await db.doc(`users/${message.userId}`).get();
    const sender = senderDoc.data();

    // Get FCM tokens for all participants except the sender
    const participants = trip.participants.filter(
      (uid: string) => uid !== message.userId
    );

    const tokenPromises = participants.map((uid: string) =>
      db.doc(`users/${uid}`).get()
    );
    const userDocs = await Promise.all(tokenPromises);
    const tokens = userDocs.flatMap(
      (doc) => doc.data()?.fcmTokens ?? []
    );

    if (tokens.length === 0) return;

    await getMessaging().sendEachForMulticast({
      tokens,
      notification: {
        title: `${sender?.displayName ?? 'Noen'} i ${trip.title}`,
        body: message.text,
      },
      data: {
        tripId: event.params.tripId,
        type: 'message',
      },
    });
  }
);
