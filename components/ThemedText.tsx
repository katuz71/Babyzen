import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { useAppTheme } from '@/lib/ThemeContext'; // <-- Добавь это

interface Props extends TextProps {
  variant?: 'h1' | 'h2' | 'body' | 'caption' | 'error';
}

export const ThemedText = ({ style, variant = 'body', ...props }: Props) => {
  const { theme } = useAppTheme(); // <-- Берем цвета
  
  let baseStyle: TextStyle = { color: theme.text };

  switch (variant) {
    case 'h1': baseStyle = { fontSize: 32, fontWeight: 'bold', color: theme.text, marginBottom: 10 }; break;
    case 'h2': baseStyle = { fontSize: 24, fontWeight: '600', color: theme.text, marginBottom: 8 }; break;
    case 'body': baseStyle = { fontSize: 16, color: theme.sub, lineHeight: 24 }; break;
    case 'caption': baseStyle = { fontSize: 12, color: theme.sub }; break;
    case 'error': baseStyle = { fontSize: 14, color: theme.accent }; break;
  }

  return <Text style={[baseStyle, style]} {...props} />;
};