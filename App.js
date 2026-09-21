import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Rajdhani_400Regular,
  Rajdhani_500Medium,
  Rajdhani_600SemiBold,
  Rajdhani_700Bold,
} from '@expo-google-fonts/rajdhani';
import { PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';

import HomeScreen from './src/screens/HomeScreen';
import HackDetailScreen from './src/screens/HackDetailScreen';
import PatcherScreen from './src/screens/PatcherScreen';
import { COLORS } from './src/theme';

const Stack = createNativeStackNavigator();

export default function App() {
  const [fontsLoaded] = useFonts({
    Rajdhani_400Regular,
    Rajdhani_500Medium,
    Rajdhani_600SemiBold,
    Rajdhani_700Bold,
    PressStart2P_400Regular,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={COLORS.bg} />
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: COLORS.bg },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="HackDetail" component={HackDetailScreen} />
            <Stack.Screen name="Patcher" component={PatcherScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
