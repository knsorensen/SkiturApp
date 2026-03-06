// Fetch ski trails from Sporet.no (Skiforeningen) ArcGIS API
const SPORET_BASE =
  'https://maps.sporet.no/arcgis/rest/services/Markadatabase_v2/Sporet_Simple/MapServer/6/query';

export interface SkiTrail {
  id: number;
  coordinates: Array<[number, number]>; // [lng, lat]
  hasClassic: boolean;
  hasSkating: boolean;
  hasFloodlight: boolean;
  isScooterTrail: boolean;
  length: number;
  trailType: number;
}

export async function fetchSkiTrailsBetween(
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number },
  paddingKm = 3
): Promise<SkiTrail[]> {
  // Bounding box between start and end with padding
  const padDeg = paddingKm / 111;
  const bbox = {
    xmin: Math.min(start.longitude, end.longitude) - padDeg,
    ymin: Math.min(start.latitude, end.latitude) - padDeg,
    xmax: Math.max(start.longitude, end.longitude) + padDeg,
    ymax: Math.max(start.latitude, end.latitude) + padDeg,
  };

  const params = new URLSearchParams({
    where: '1=1',
    outFields: 'id,has_classic,has_skating,has_floodlight,is_scootertrail,trailtypesymbol,st_length(shape)',
    geometry: JSON.stringify(bbox),
    geometryType: 'esriGeometryEnvelope',
    spatialRel: 'esriSpatialRelIntersects',
    inSR: '4326',
    outSR: '4326',
    f: 'geojson',
    resultRecordCount: '500',
  });

  const response = await fetch(`${SPORET_BASE}?${params}`);
  if (!response.ok) return [];

  const data = await response.json();
  if (!data.features) return [];

  return data.features.map((f: any) => ({
    id: f.properties.id ?? f.id,
    coordinates:
      f.geometry.type === 'LineString'
        ? f.geometry.coordinates
        : f.geometry.type === 'MultiLineString'
          ? f.geometry.coordinates.flat()
          : [],
    hasClassic: f.properties.has_classic === 1,
    hasSkating: f.properties.has_skating === 1,
    hasFloodlight: f.properties.has_floodlight === 1,
    isScooterTrail: f.properties.is_scootertrail === 1,
    length: f.properties['st_length(shape)'] ?? 0,
    trailType: f.properties.trailtypesymbol ?? 0,
  }));
}
