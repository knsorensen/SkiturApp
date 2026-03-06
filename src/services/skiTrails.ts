// Fetch ski trails from Sporet.no (Skiforeningen) ArcGIS API
const SPORET_BASE =
  'https://maps.sporet.no/arcgis/rest/services/Markadatabase_v2/Sporet_Simple/MapServer/6/query';

export interface SkiTrail {
  id: number;
  coordinates: Array<[number, number]>; // [lng, lat]
  hasClassic: boolean;
  hasSkating: boolean;
  hasFloodlight: boolean;
  length: number;
}

export async function fetchSkiTrails(
  latitude: number,
  longitude: number,
  radiusKm = 10
): Promise<SkiTrail[]> {
  // Create a bounding box around the point
  const delta = radiusKm / 111; // ~1 degree ≈ 111 km
  const bbox = {
    xmin: longitude - delta,
    ymin: latitude - delta,
    xmax: longitude + delta,
    ymax: latitude + delta,
  };

  const params = new URLSearchParams({
    where: '1=1',
    outFields: 'id,has_classic,has_skating,has_floodlight,st_length(shape)',
    geometry: JSON.stringify({
      xmin: bbox.xmin,
      ymin: bbox.ymin,
      xmax: bbox.xmax,
      ymax: bbox.ymax,
    }),
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    outSR: '4326',
    f: 'geojson',
    resultRecordCount: '200',
  });

  const response = await fetch(`${SPORET_BASE}?${params}`);
  if (!response.ok) return [];

  const data = await response.json();
  if (!data.features) return [];

  return data.features.map((f: any) => ({
    id: f.properties.id ?? f.id,
    coordinates: f.geometry.type === 'LineString'
      ? f.geometry.coordinates
      : f.geometry.type === 'MultiLineString'
        ? f.geometry.coordinates.flat()
        : [],
    hasClassic: f.properties.has_classic === 1,
    hasSkating: f.properties.has_skating === 1,
    hasFloodlight: f.properties.has_floodlight === 1,
    length: f.properties['st_length(shape)'] ?? 0,
  }));
}
