/// <reference types="nativewind/types" />
import type { ViewProps, TextProps, TouchableOpacityProps, TextInputProps } from 'react-native';

declare module 'react-native' {
  interface ViewProps {
    className?: string;
  }
  interface TextProps {
    className?: string;
  }
  interface TouchableOpacityProps {
    className?: string;
  }
  interface TextInputProps {
    className?: string;
  }
}
