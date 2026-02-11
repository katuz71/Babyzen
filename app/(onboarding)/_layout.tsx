import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#000000' }, // Наш любимый Vampire Mode
      }}
    >
      {/* 1. Welcome */}
      <Stack.Screen name="index" />

      {/* 2. Baby setup */}
      <Stack.Screen name="baby-setup" />

      {/* ========================================== */}
      {/* 3. НАШ НОВЫЙ ЭКРАН АВТОРИЗАЦИИ (ВСТАВЛЯТЬ СЮДА) */}
      <Stack.Screen name="auth" />
      {/* ========================================== */}

      {/* 4. Paywall внутри онбординга */}
      <Stack.Screen
        name="paywall"
        options={{ presentation: 'modal' }}
      />
    </Stack>
  );
}