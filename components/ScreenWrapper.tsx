import React from 'react';
import { View, ViewStyle, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const ScreenWrapper = ({ children, style }: Props) => {
  const insets = useSafeAreaInsets();
  
  return (
    <View 
      style={[
        { 
          flex: 1, 
          backgroundColor: '#000000', 
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingHorizontal: 20 
        }, 
        style
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      {children}
    </View>
  );
};