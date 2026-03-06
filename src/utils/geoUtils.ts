/** Calculate distance between two points using the Haversine formula (meters) */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Calculate total distance for an array of route points (meters) */
export function totalDistance(
  points: Array<{ latitude: number; longitude: number }>
): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(
      points[i - 1].latitude,
      points[i - 1].longitude,
      points[i].latitude,
      points[i].longitude
    );
  }
  return total;
}

/** Calculate total elevation gain (meters) */
export function elevationGain(points: Array<{ altitude: number }>): number {
  let gain = 0;
  for (let i = 1; i < points.length; i++) {
    const diff = points[i].altitude - points[i - 1].altitude;
    if (diff > 0) gain += diff;
  }
  return gain;
}

/** Calculate total elevation loss (meters) */
export function elevationLoss(points: Array<{ altitude: number }>): number {
  let loss = 0;
  for (let i = 1; i < points.length; i++) {
    const diff = points[i - 1].altitude - points[i].altitude;
    if (diff > 0) loss += diff;
  }
  return loss;
}
