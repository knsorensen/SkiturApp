import { create } from 'zustand';

interface LocationState {
  isTracking: boolean;
  currentPosition: {
    latitude: number;
    longitude: number;
    altitude: number;
  } | null;
  trackPoints: Array<{
    latitude: number;
    longitude: number;
    altitude: number;
    timestamp: number;
  }>;
  setTracking: (tracking: boolean) => void;
  setCurrentPosition: (position: LocationState['currentPosition']) => void;
  addTrackPoint: (point: LocationState['trackPoints'][0]) => void;
  clearTrackPoints: () => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  isTracking: false,
  currentPosition: null,
  trackPoints: [],
  setTracking: (isTracking) => set({ isTracking }),
  setCurrentPosition: (currentPosition) => set({ currentPosition }),
  addTrackPoint: (point) =>
    set((state) => ({ trackPoints: [...state.trackPoints, point] })),
  clearTrackPoints: () => set({ trackPoints: [] }),
}));
