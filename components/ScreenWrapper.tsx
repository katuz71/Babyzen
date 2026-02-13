// components/ScreenWrapper.tsx
import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/lib/ThemeContext';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const ScreenWrapper = ({ children, style }: Props) => {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme(); // Внедряем тему!
  
  return (
    <View 
      style={[
        { 
          flex: 1, 
          backgroundColor: theme.bg, // Теперь цвет зависит от темы
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingHorizontal: theme.spacing.lg // Используем токен spacing
        }, 
        style
      ]}
    >
      {children}
    </View>
  );
};