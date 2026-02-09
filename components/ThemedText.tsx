import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';

interface Props extends TextProps {
  variant?: 'h1' | 'h2' | 'body' | 'caption' | 'error';
}

export const ThemedText = ({ style, variant = 'body', ...props }: Props) => {
  let baseStyle: TextStyle = { color: '#E0E0E0' }; // Primary Text

  switch (variant) {
    case 'h1': baseStyle = { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 10 }; break;
    case 'h2': baseStyle = { fontSize: 24, fontWeight: '600', color: '#E0E0E0', marginBottom: 8 }; break;
    case 'body': baseStyle = { fontSize: 16, color: '#B0B0B0', lineHeight: 24 }; break;
    case 'caption': baseStyle = { fontSize: 12, color: '#666666' }; break;
    case 'error': baseStyle = { fontSize: 14, color: '#FF453A' }; break; // Apple Red
  }

  return <Text style={[baseStyle, style]} {...props} />;
};