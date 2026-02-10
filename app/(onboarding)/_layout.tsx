import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#000000' },
      }}
    >
      {/* Welcome */}
      <Stack.Screen name="index" />

      {/* Baby setup */}
      <Stack.Screen name="baby-setup" />

      {/* Paywall внутри онбординга */}
      <Stack.Screen
        name="paywall"
        options={{ presentation: 'modal' }}
      />
    </Stack>
  );
}
