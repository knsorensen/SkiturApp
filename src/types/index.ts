import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  photoURL: string | null;
  fcmTokens: string[];
  role: 'user' | 'admin';
  createdAt: Timestamp;
}

export interface Trip {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  status: 'planning' | 'active' | 'completed';
  startDate: Timestamp;
  endDate: Timestamp | null;
  location: {
    latitude: number;
    longitude: number;
    name: string;
  };
  endLocation?: {
    latitude: number;
    longitude: number;
    name: string;
  };
  participants: string[];
  invitedEmails: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RoutePoint {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  altitude: number;
  timestamp: Timestamp;
  speed: number;
  accuracy: number;
}

export interface Photo {
  id: string;
  userId: string;
  imageURL: string;
  thumbnailURL: string;
  caption: string;
  location: {
    latitude: number;
    longitude: number;
    altitude: number;
  };
  takenAt: Timestamp;
  uploadedAt: Timestamp;
}

export interface Message {
  id: string;
  userId: string;
  text: string;
  imageURL: string | null;
  createdAt: Timestamp;
}

export interface ShoppingItem {
  id: string;
  text: string;
  checked: boolean;
  addedBy: string;
  createdAt: Timestamp;
}

export type POIIcon = 'martini' | 'cabin' | 'parking' | 'viewpoint' | 'water' | 'danger' | 'food' | 'campfire' | 'flag';

export interface PointOfInterest {
  id: string;
  tripId: string;
  name: string;
  icon: POIIcon;
  latitude: number;
  longitude: number;
  addedBy: string;
  createdAt: Timestamp;
}

export interface Invite {
  id: string;
  tripId: string;
  invitedBy: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

export interface TripInvite {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  phone: string;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'declined';
  declineReason?: string;
  createdAt: Timestamp;
}
