import * as Location from 'expo-location';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { TRACKING } from '../constants';

export async function requestLocationPermissions(): Promise<boolean> {
  const { status: foreground } = await Location.requestForegroundPermissionsAsync();
  if (foreground !== 'granted') return false;

  const { status: background } = await Location.requestBackgroundPermissionsAsync();
  return background === 'granted';
}

export async function getCurrentLocation() {
  return Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
}

export async function uploadTrackPoints(
  tripId: string,
  points: Array<{
    userId: string;
    latitude: number;
    longitude: number;
    altitude: number;
    speed: number;
    accuracy: number;
    timestamp: number;
  }>
) {
  const routeRef = collection(db, 'trips', tripId, 'route');
  const batch = points.map((point) =>
    addDoc(routeRef, {
      ...point,
      timestamp: serverTimestamp(),
    })
  );
  await Promise.all(batch);
}

export const LOCATION_TASK_NAME = 'skitur-background-location';
