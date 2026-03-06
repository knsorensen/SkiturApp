import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

// TODO: Configure SMS provider (e.g., Twilio)
export const sendTripInviteSMS = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in');
  }

  const { tripId, phone } = request.data;
  if (!tripId || !phone) {
    throw new HttpsError('invalid-argument', 'tripId and phone are required');
  }

  const db = getFirestore();
  const token = crypto.randomUUID();

  await db.collection('invites').add({
    tripId,
    invitedBy: request.auth.uid,
    phone,
    email: null,
    token,
    status: 'pending',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });

  // TODO: Send SMS via Twilio with invite link
  // const link = `https://skiturapp.page.link/trip/${token}`;

  return { success: true, token };
});
