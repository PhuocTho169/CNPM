import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import ScanScreen from './src/screens/ScanScreen';
import PlaceDetailScreen from './src/screens/PlaceDetailScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import GPSAudioGuideScreen from './src/screens/GPSAudioGuideScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#e65100' },
        headerTintColor: '#fff',
        tabBarActiveTintColor: '#e65100',
        tabBarInactiveTintColor: '#6d6156',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text> }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{ tabBarLabel: 'Explore', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🧭</Text> }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          tabBarLabel: 'Scan QR',
          // Same optical size as the other tab icons: at 26px the camera glyph
          // was taller than the icon slot, touching the bar's top edge and
          // crowding the "Scan QR" label.
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📷</Text>,
        }}
      />
      <Tab.Screen
        name="GPS Guide"
        component={GPSAudioGuideScreen}
        options={{
          tabBarLabel: 'GPS Guide',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🎧</Text>,
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ tabBarLabel: 'Favorites', tabBarIcon: () => <Text style={{ fontSize: 20 }}>❤️</Text> }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: 'Settings', tabBarIcon: () => <Text style={{ fontSize: 20 }}>⚙️</Text> }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor="#e65100" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#e65100' },
          headerTintColor: '#fff',
        }}
      >
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="PlaceDetail"
          component={PlaceDetailScreen}
          options={({ route }) => ({ title: route.params?.title || 'Food Guide' })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
