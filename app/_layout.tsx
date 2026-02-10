// 👇 ЭТО ВКЛЮЧАЕТ ПЕРЕВОДЫ. БЕЗ ЭТОГО ОНИ НЕ РАБОТАЮТ.
import '@/lib/i18n'; 

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import '../global.css'; 

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" backgroundColor="#000000" />
      
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000000' } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}