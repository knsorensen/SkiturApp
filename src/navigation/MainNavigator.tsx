import React, { useState } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../app/tabs/HomeScreen';
import TripsNavigator from './TripsNavigator';
import MapScreen from '../app/tabs/MapScreen';
import UsersScreen from '../app/tabs/UsersScreen';
import ProfileScreen from '../app/tabs/ProfileScreen';
import { useTripStore } from '../stores/tripStore';
import { useTheme } from '../hooks/useTheme';
import { useResponsive } from '../hooks/useResponsive';
import WebLayout from '../components/common/WebLayout';

export type MainTabParamList = {
  Home: undefined;
  TripsTab: undefined;
  Map: undefined;
  Users: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home-outline',
  TripsTab: 'compass-outline',
  Map: 'map-outline',
  Users: 'people-outline',
  Profile: 'person-outline',
};

const TAB_LABELS: Record<string, string> = {
  Home: 'Hjem',
  TripsTab: 'Turer',
  Map: 'Kart',
  Users: 'Brukere',
  Profile: 'Profil',
};

export default function MainNavigator() {
  const trips = useTripStore((s) => s.trips);
  const hasActiveTrip = trips.some((t) => t.status === 'active');
  const { colors } = useTheme();
  const { isWide } = useResponsive();
  const [activeTab, setActiveTab] = useState('Home');

  // Desktop: use sidebar layout with manual screen switching
  if (isWide && Platform.OS === 'web') {
    const navItems = Object.keys(TAB_ICONS).map((key) => ({
      key,
      label: TAB_LABELS[key],
      icon: TAB_ICONS[key],
      active: activeTab === key,
      disabled: key === 'Map' && !hasActiveTrip,
      onPress: () => {
        if (key === 'Map' && !hasActiveTrip) return;
        setActiveTab(key);
      },
    }));

    const renderScreen = () => {
      switch (activeTab) {
        case 'Home': return <HomeScreen />;
        case 'TripsTab': return <TripsNavigator />;
        case 'Map': return <MapScreen />;
        case 'Users': return <UsersScreen />;
        case 'Profile': return <ProfileScreen />;
        default: return <HomeScreen />;
      }
    };

    return (
      <WebLayout navItems={navItems}>
        <View style={[styles.screenWrap, { backgroundColor: colors.background }]}>
          {renderScreen()}
        </View>
      </WebLayout>
    );
  }

  // Mobile: bottom tabs
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 88 : 64,
        },
        headerStyle: {
          backgroundColor: colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTitleStyle: { color: colors.text, fontWeight: '600', fontSize: 17 },
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
              color={hasActiveTrip ? colors.textSecondary : colors.border}
            />
          ),
          tabBarLabelStyle: {
            color: hasActiveTrip ? undefined : colors.border,
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

const styles = StyleSheet.create({
  screenWrap: {
    flex: 1,
  },
});
