import '../global.css';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { LogBox, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// i18n инициализируется ОДИН РАЗ — здесь
import '@/lib/i18n';

LogBox.ignoreLogs(['Linking requires a build-time setting']);

export default function RootLayout() {
  useEffect(() => {
    console.log('BabyZen Engine: Ready');
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />

      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade_from_bottom',
          contentStyle: { backgroundColor: '#FFFFFF' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </View>
  );
}
