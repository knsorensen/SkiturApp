import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TripsScreen from '../app/tabs/TripsScreen';
import CreateTripScreen from '../app/trip/CreateTripScreen';
import TripDetailScreen from '../app/trip/TripDetailScreen';
import EditTripScreen from '../app/trip/EditTripScreen';
import TripChatScreen from '../app/trip/TripChatScreen';
import TripPhotosScreen from '../app/trip/TripPhotosScreen';
import ShoppingListScreen from '../app/trip/ShoppingListScreen';
import TripArchiveScreen from '../app/trip/TripArchiveScreen';
import ParticipantsScreen from '../app/trip/ParticipantsScreen';
import { COLORS } from '../constants';

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

export default function TripsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface },
        headerTitleStyle: { color: COLORS.text, fontWeight: '600' },
        headerTintColor: COLORS.primary,
      }}
    >
      <Stack.Screen name="TripsList" options={{ title: 'Turer' }}>
        {({ navigation }) => (
          <TripsScreen
            onCreateTrip={() => navigation.navigate('CreateTrip')}
            onSelectTrip={(tripId) => navigation.navigate('TripDetail', { tripId })}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="CreateTrip" options={{ title: 'Ny tur' }}>
        {({ navigation }) => (
          <CreateTripScreen
            onCreated={(tripId) => {
              navigation.replace('TripDetail', { tripId });
            }}
            onCancel={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="TripDetail" options={{ title: 'Tur' }}>
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
      <Stack.Screen name="EditTrip" options={{ title: 'Rediger tur' }}>
        {({ navigation, route }) => (
          <EditTripScreen
            tripId={(route.params as { tripId: string }).tripId}
            onSaved={() => navigation.goBack()}
            onCancel={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="TripChat" options={{ title: 'Chat' }}>
        {({ route }) => (
          <TripChatScreen
            tripId={(route.params as { tripId: string }).tripId}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="TripPhotos" options={{ title: 'Bilder' }}>
        {({ route }) => (
          <TripPhotosScreen
            tripId={(route.params as { tripId: string }).tripId}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="ShoppingList" options={{ title: 'Handleliste' }}>
        {({ route }) => (
          <ShoppingListScreen
            tripId={(route.params as { tripId: string }).tripId}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="TripArchive" options={{ title: 'Turarkiv' }}>
        {({ route }) => (
          <TripArchiveScreen
            tripId={(route.params as { tripId: string }).tripId}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Participants"
        component={ParticipantsScreen}
        options={{ title: 'Alle brukere' }}
      />
    </Stack.Navigator>
  );
}
