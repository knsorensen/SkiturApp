import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SignInScreen from '../app/auth/SignInScreen';
import SignUpScreen from '../app/auth/SignUpScreen';

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SignIn">
        {({ navigation }) => (
          <SignInScreen onNavigateToSignUp={() => navigation.navigate('SignUp')} />
        )}
      </Stack.Screen>
      <Stack.Screen name="SignUp">
        {({ navigation }) => (
          <SignUpScreen onNavigateToSignIn={() => navigation.navigate('SignIn')} />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
