import React from 'react';
import { Text as RNText } from 'react-native';
import { useAppTheme } from '@/lib/ThemeContext';

export const Text = ({ children, style, className, ...props }: any) => {
  const { theme } = useAppTheme();

  return (
    <RNText 
      style={[{ color: theme.text }, style]} // ТЕПЕРЬ ЦВЕТ ТЕКСТА АДАПТИВНЫЙ
      className={className}
      {...props}
    >
      {children}
    </RNText>
  );
};