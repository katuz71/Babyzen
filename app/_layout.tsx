// app/_layout.tsx
import '../global.css';
import { Stack } from 'expo-router';
import React, { useEffect } from 'react';
import { LogBox, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// i18n инициализируется ОДИН РАЗ — здесь
import '@/lib/i18n';

// Импортируем наш движок тем
import { ThemeProvider, useAppTheme } from '@/lib/ThemeContext';

LogBox.ignoreLogs(['Linking requires a build-time setting']);

export default function RootLayout() {
  useEffect(() => {
    console.log('BabyZen Engine: Ready');
  }, []);

  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

// Выносим сам Stack в отдельный компонент, чтобы он мог читать useAppTheme (он должен быть ВНУТРИ ThemeProvider)
function AppContent() {
  const { theme, themeName } = useAppTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Динамический статус-бар: белый текст для темной темы, темный для светлой и розовой */}
      <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />

      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade_from_bottom',
          // Глобальный фон роутера теперь зависит от темы
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </View>
  );
}