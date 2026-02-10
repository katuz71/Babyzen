import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000000' } }}>
      {/* Первый экран: Приветствие */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      
      {/* Второй экран: Настройка профиля */}
      <Stack.Screen name="baby-setup" options={{ headerShown: false }} />
    </Stack>
  );
}