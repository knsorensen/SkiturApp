import React from 'react';
import { Platform, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import TripsScreen from '../app/tabs/TripsScreen';
import CreateTripScreen from '../app/trip/CreateTripScreen';
import TripDetailScreen from '../app/trip/TripDetailScreen';
import EditTripScreen from '../app/trip/EditTripScreen';
import TripChatScreen from '../app/trip/TripChatScreen';
import TripPhotosScreen from '../app/trip/TripPhotosScreen';
import ShoppingListScreen from '../app/trip/ShoppingListScreen';
import TripArchiveScreen from '../app/trip/TripArchiveScreen';
import ParticipantsScreen from '../app/trip/ParticipantsScreen';
import { useTheme } from '../hooks/useTheme';

export type TripsStackParamList = {
  TripsList: undefined;
  CreateTrip: undefined;
  TripDetail: { tripId: string };
  EditTrip: { tripId: string };
  TripChat: { tripId: string };
  TripPhotos: { tripId: string };
  ShoppingList: { tripId: string };
  TripArchive: { tripId: string };
  Participants: undefined;
};

const Stack = createNativeStackNavigator<TripsStackParamList>();

function BackButton({ onPress, colors }: { onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity style={backStyles.btn} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name="chevron-back" size={26} color={colors.primary} />
    </TouchableOpacity>
  );
}

const backStyles = StyleSheet.create({
  btn: { marginLeft: 12, paddingVertical: 6, paddingRight: 14 },
});

export default function TripsNavigator() {
  const { colors } = useTheme();

  const screenOptions = {
    headerStyle: {
      backgroundColor: colors.surface,
    },
    headerTitleStyle: { color: colors.text, fontWeight: '600' as const, fontSize: 17 },
    headerTintColor: colors.primary,
    headerShadowVisible: false,
    headerBackTitleVisible: false,
  };

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="TripsList" options={{ title: 'Turer' }}>
        {({ navigation }) => (
          <TripsScreen
            onCreateTrip={() => navigation.navigate('CreateTrip')}
            onSelectTrip={(tripId) => navigation.navigate('TripDetail', { tripId })}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="CreateTrip" options={({ navigation }) => ({
        title: 'Ny tur',
        headerLeft: () => <BackButton onPress={() => navigation.goBack()} colors={colors} />,
      })}>
        {({ navigation }) => (
          <CreateTripScreen
            onCreated={(tripId) => {
              navigation.replace('TripDetail', { tripId });
            }}
            onCancel={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="TripDetail" options={({ navigation }) => ({
        title: 'Turdetaljer',
        headerLeft: () => <BackButton onPress={() => {
          if (navigation.canGoBack()) navigation.goBack();
          else navigation.navigate('TripsList');
        }} colors={colors} />,
      })}>
        {({ navigation, route }) => (
          <TripDetailScreen
            tripId={(route.params as { tripId: string }).tripId}
            onBack={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('TripsList');
              }
            }}
            onChat={(tripId) => navigation.navigate('TripChat', { tripId })}
            onPhotos={(tripId) => navigation.navigate('TripPhotos', { tripId })}
            onShopping={(tripId) => navigation.navigate('ShoppingList', { tripId })}
            onArchive={(tripId) => navigation.navigate('TripArchive', { tripId })}
            onEdit={(tripId) => navigation.navigate('EditTrip', { tripId })}
            onParticipants={() => navigation.navigate('Participants')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="EditTrip" options={({ navigation }) => ({
        title: 'Rediger tur',
        headerLeft: () => <BackButton onPress={() => navigation.goBack()} colors={colors} />,
      })}>
        {({ navigation, route }) => (
          <EditTripScreen
            tripId={(route.params as { tripId: string }).tripId}
            onSaved={() => navigation.goBack()}
            onCancel={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="TripChat" options={({ navigation }) => ({
        title: 'Chat',
        headerLeft: () => <BackButton onPress={() => navigation.goBack()} colors={colors} />,
      })}>
        {({ route }) => (
          <TripChatScreen
            tripId={(route.params as { tripId: string }).tripId}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="TripPhotos" options={({ navigation }) => ({
        title: 'Bilder',
        headerLeft: () => <BackButton onPress={() => navigation.goBack()} colors={colors} />,
      })}>
        {({ route }) => (
          <TripPhotosScreen
            tripId={(route.params as { tripId: string }).tripId}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="ShoppingList" options={({ navigation }) => ({
        title: 'Handleliste',
        headerLeft: () => <BackButton onPress={() => navigation.goBack()} colors={colors} />,
      })}>
        {({ route }) => (
          <ShoppingListScreen
            tripId={(route.params as { tripId: string }).tripId}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="TripArchive" options={({ navigation }) => ({
        title: 'Turarkiv',
        headerLeft: () => <BackButton onPress={() => navigation.goBack()} colors={colors} />,
      })}>
        {({ route }) => (
          <TripArchiveScreen
            tripId={(route.params as { tripId: string }).tripId}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Participants"
        component={ParticipantsScreen}
        options={({ navigation }) => ({
          title: 'Alle brukere',
          headerLeft: () => <BackButton onPress={() => navigation.goBack()} colors={colors} />,
        })}
      />
    </Stack.Navigator>
  );
}
