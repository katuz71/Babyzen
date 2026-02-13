import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { useAppTheme } from '@/lib/ThemeContext'; // <-- Добавь это

interface Props extends TextProps {
  variant?: 'h1' | 'h2' | 'body' | 'caption' | 'error';
}

export const ThemedText = ({ style, variant = 'body', ...props }: Props) => {
  const { theme } = useAppTheme();
  
  let baseStyle: TextStyle = { color: theme.text };

  switch (variant) {
    case 'h1': 
      baseStyle = { 
        ...theme.typography.h1, 
        color: theme.text, 
        marginBottom: theme.spacing.sm 
      }; 
      break;
    case 'h2': 
      baseStyle = { 
        ...theme.typography.h2, 
        color: theme.text, 
        marginBottom: theme.spacing.xs 
      }; 
      break;
    case 'body': 
      baseStyle = { 
        ...theme.typography.body, 
        color: theme.mutedText, 
        lineHeight: 24 
      }; 
      break;
    case 'caption': 
      baseStyle = { 
        ...theme.typography.caption, 
        color: theme.mutedText 
      }; 
      break;
    case 'error': 
      baseStyle = { 
        fontSize: 14, 
        color: theme.accent 
      }; 
      break;
  }

  return <Text style={[baseStyle, style]} {...props} />;
};