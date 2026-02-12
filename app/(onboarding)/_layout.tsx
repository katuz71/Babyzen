import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#000000' }, // Наш любимый Vampire Mode
      }}
    >
      {/* 1. Welcome - Экран приветствия */}
      <Stack.Screen name="index" />

      {/* 2. Baby setup - Ввод имени и даты (здесь теперь происходит тихая регистрация) */}
      <Stack.Screen name="baby-setup" />

      {/* 3. Paywall - Экран подписки */}
      <Stack.Screen
        name="paywall"
        options={{ presentation: 'modal', gestureEnabled: false }}
      />
    </Stack>
  );
}