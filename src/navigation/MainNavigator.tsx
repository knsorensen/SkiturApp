import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../app/tabs/HomeScreen';
import TripsNavigator from './TripsNavigator';
import MapScreen from '../app/tabs/MapScreen';
import UsersScreen from '../app/tabs/UsersScreen';
import ProfileScreen from '../app/tabs/ProfileScreen';
import { useTripStore } from '../stores/tripStore';
import { COLORS } from '../constants';

export type MainTabParamList = {
  Home: undefined;
  TripsTab: undefined;
  Map: undefined;
  Users: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainNavigator() {
  const trips = useTripStore((s) => s.trips);
  const hasActiveTrip = trips.some((t) => t.status === 'active');

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        headerStyle: { backgroundColor: COLORS.surface },
        headerTitleStyle: { color: COLORS.text, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Hjem',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="TripsTab"
        component={TripsNavigator}
        options={{
          title: 'Turer',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          title: 'Kart',
          tabBarIcon: ({ size }) => (
            <Ionicons
              name="map-outline"
              size={size}
              color={hasActiveTrip ? COLORS.textSecondary : COLORS.border}
            />
          ),
          tabBarLabelStyle: {
            color: hasActiveTrip ? undefined : COLORS.border,
          },
        }}
        listeners={{
          tabPress: (e) => {
            if (!hasActiveTrip) {
              e.preventDefault();
            }
          },
        }}
      />
      <Tab.Screen
        name="Users"
        component={UsersScreen}
        options={{
          title: 'Brukere',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
