import React, { useEffect, useRef, useImperativeHandle, useCallback, useState } from 'react';
import { View } from 'react-native';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

let googleMapsPromise = null;

function loadGoogleMaps() {
  if (googleMapsPromise) return googleMapsPromise;
  if (window.google?.maps) return Promise.resolve(window.google.maps);

  googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return googleMapsPromise;
}

const MAP_TYPE_MAP = {
  terrain: 'terrain',
  satellite: 'satellite',
  hybrid: 'hybrid',
  standard: 'roadmap',
};

// --- MapView ---
const MapView = React.forwardRef(
  ({ style, children, initialRegion, region, mapType, onPress, showsUserLocation }, ref) => {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const [ready, setReady] = useState(false);

    useImperativeHandle(ref, () => ({
      get map() {
        return mapRef.current;
      },
    }));

    useEffect(() => {
      let mounted = true;
      loadGoogleMaps().then((maps) => {
        if (!mounted || !containerRef.current || mapRef.current) return;

        const r = region || initialRegion || {
          latitude: 61.5,
          longitude: 8.5,
          latitudeDelta: 5,
          longitudeDelta: 5,
        };

        const map = new maps.Map(containerRef.current, {
          center: { lat: r.latitude, lng: r.longitude },
          zoom: deltaToZoom(r.latitudeDelta),
          mapTypeId: MAP_TYPE_MAP[mapType] || 'terrain',
          gestureHandling: 'greedy',
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        mapRef.current = map;

        if (onPress) {
          map.addListener('click', (e) => {
            onPress({
              nativeEvent: {
                coordinate: {
                  latitude: e.latLng.lat(),
                  longitude: e.latLng.lng(),
                },
              },
            });
          });
        }

        if (showsUserLocation && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              new maps.Marker({
                position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
                map,
                icon: {
                  path: maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: '#4285F4',
                  fillOpacity: 1,
                  strokeColor: '#fff',
                  strokeWeight: 2,
                },
                title: 'Min posisjon',
              });
            },
            () => {}
          );
        }

        setReady(true);
      });
      return () => {
        mounted = false;
      };
    }, []);

    return (
      <View style={[{ flex: 1 }, style]}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        {ready &&
          React.Children.map(children, (child) => {
            if (!React.isValidElement(child)) return null;
            return React.cloneElement(child, { __map: mapRef.current });
          })}
      </View>
    );
  }
);

MapView.displayName = 'MapView';

// --- Marker ---
function Marker({ __map, coordinate, pinColor, title, onCalloutPress }) {
  const markerRef = useRef(null);

  useEffect(() => {
    if (!__map || !coordinate || !window.google?.maps) return;

    const marker = new window.google.maps.Marker({
      position: { lat: coordinate.latitude, lng: coordinate.longitude },
      map: __map,
      title: title || '',
    });

    if (pinColor) {
      marker.setIcon({
        path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
        scale: 6,
        fillColor: pinColor,
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 1,
      });
    }

    if (onCalloutPress) {
      marker.addListener('click', onCalloutPress);
    } else if (title) {
      const infoWindow = new window.google.maps.InfoWindow({ content: title });
      marker.addListener('click', () => infoWindow.open(__map, marker));
    }

    markerRef.current = marker;

    return () => {
      marker.setMap(null);
    };
  }, [__map, coordinate?.latitude, coordinate?.longitude, pinColor, title]);

  return null;
}

// --- Polyline ---
function Polyline({ __map, coordinates, strokeWidth, strokeColor }) {
  const lineRef = useRef(null);

  useEffect(() => {
    if (!__map || !coordinates || !window.google?.maps) return;

    const path = coordinates.map((c) => ({ lat: c.latitude, lng: c.longitude }));

    const polyline = new window.google.maps.Polyline({
      path,
      strokeColor: strokeColor || '#1B6DB2',
      strokeOpacity: 1,
      strokeWeight: strokeWidth || 3,
      map: __map,
    });

    lineRef.current = polyline;

    return () => {
      polyline.setMap(null);
    };
  }, [__map, coordinates, strokeWidth, strokeColor]);

  return null;
}

// --- Helpers ---
function deltaToZoom(latDelta) {
  if (!latDelta || latDelta <= 0) return 10;
  return Math.round(Math.log2(360 / latDelta));
}

// --- Stubs ---
const Callout = () => null;
const Circle = () => null;
const Polygon = () => null;
const Overlay = () => null;

const PROVIDER_GOOGLE = 'google';
const PROVIDER_DEFAULT = null;

export default MapView;
export {
  Marker,
  Polyline,
  Callout,
  Circle,
  Polygon,
  Overlay,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
};
