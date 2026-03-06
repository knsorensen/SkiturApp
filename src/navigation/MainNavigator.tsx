import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../app/tabs/HomeScreen';
import TripsScreen from '../app/tabs/TripsScreen';
import MapScreen from '../app/tabs/MapScreen';
import ProfileScreen from '../app/tabs/ProfileScreen';
import { COLORS } from '../constants';

export type MainTabParamList = {
  Home: undefined;
  Trips: undefined;
  Map: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainNavigator() {
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
        options={{ title: 'Hjem' }}
      />
      <Tab.Screen
        name="Trips"
        component={TripsScreen}
        options={{ title: 'Turer' }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{ title: 'Kart' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profil' }}
      />
    </Tab.Navigator>
  );
}
