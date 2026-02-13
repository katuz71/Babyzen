// lib/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeName = 'dark' | 'pink' | 'blue';

export interface ThemeColors {
  bg: string;
  card: string;
  accent: string;
  text: string;
  sub: string;
  border: string;
}

const THEMES: Record<ThemeName, ThemeColors> = {
  dark: { // Наш фирменный Vampire Mode
    bg: '#000000',
    card: '#121212',
    accent: '#FF453A', // BabyZen Red
    text: '#FFFFFF',
    sub: '#8E8E93',
    border: '#2C2C2E',
  },
  pink: { // Нежная розовая тема
    bg: '#FFF0F5', 
    card: '#FFFFFF',
    accent: '#FF2D55', 
    text: '#1C1C1E',
    sub: '#8E8E93',
    border: '#FADEE3',
  },
  blue: { // Спокойная голубая тема
    bg: '#F0F8FF',
    card: '#FFFFFF',
    accent: '#007AFF', 
    text: '#1C1C1E',
    sub: '#8E8E93',
    border: '#D2E2F2',
  }
};

interface ThemeContextProps {
  theme: ThemeColors;
  themeName: ThemeName;
  updateTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

const THEME_STORAGE_KEY = '@babyzen_theme';

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeName, setThemeName] = useState<ThemeName>('dark');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme && (savedTheme === 'dark' || savedTheme === 'pink' || savedTheme === 'blue')) {
          setThemeName(savedTheme);
        }
      } catch (e) {
        console.error('Failed to load theme', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  const updateTheme = async (name: ThemeName) => {
    setThemeName(name);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, name);
    } catch (e) {
      console.error('Failed to save theme', e);
    }
  };

  if (!isLoaded) return null; // Или можно вернуть SplashScreen

  return (
    <ThemeContext.Provider value={{ theme: THEMES[themeName], themeName, updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useAppTheme must be used within a ThemeProvider');
  return context;
};