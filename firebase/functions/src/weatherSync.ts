import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';

const WEATHER_API = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
const USER_AGENT = 'SkiturApp/1.0 github.com/knsorensen/SkiturApp';

export const weatherSync = onSchedule('every 60 minutes', async () => {
  const db = getFirestore();

  // Find active and upcoming trips (next 7 days)
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const trips = await db
    .collection('trips')
    .where('status', 'in', ['planning', 'active'])
    .where('startDate', '<=', weekFromNow)
    .get();

  for (const tripDoc of trips.docs) {
    const trip = tripDoc.data();
    const { latitude, longitude } = trip.location;

    try {
      const response = await fetch(
        `${WEATHER_API}?lat=${latitude}&lon=${longitude}`,
        { headers: { 'User-Agent': USER_AGENT } }
      );

      if (!response.ok) continue;

      const weather = await response.json();

      await db.doc(`trips/${tripDoc.id}`).update({
        weatherCache: {
          data: weather.properties.timeseries.slice(0, 48), // Next 48 hours
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error(`Weather sync failed for trip ${tripDoc.id}:`, error);
    }
  }
});
