// lib/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeName = 'pure_black' | 'indigo_night' | 'emerald_night';

export interface ThemeColors {
  bg: string;           // screen background
  text: string;         // primary text
  mutedText: string;    // secondary/muted text
  surface: string;      // cards/bubbles primary
  surface2: string;     // secondary surface (inactive states)
  accent: string;       // CTA/alert/brand color
  border: string;       // borders and dividers
}

// Design Tokens
export interface DesignTokens {
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  typography: {
    h1: { fontSize: number; fontWeight: '700'; letterSpacing: number };
    h2: { fontSize: number; fontWeight: '700'; letterSpacing: number };
    body: { fontSize: number; fontWeight: '500' };
    caption: { fontSize: number; fontWeight: '500' };
  };
  shadow: {
    sm: { shadowOpacity: number; shadowRadius: number; shadowOffset: { width: number; height: number }; elevation: number };
    md: { shadowOpacity: number; shadowRadius: number; shadowOffset: { width: number; height: number }; elevation: number };
  };
}

export interface Theme extends ThemeColors, DesignTokens {}

// Design tokens (shared across all themes)
const tokens: DesignTokens = {
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
    xxl: 32,
  },
  typography: {
    h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: 0.2 },
    h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: 0.2 },
    body: { fontSize: 16, fontWeight: '500' as const },
    caption: { fontSize: 13, fontWeight: '500' as const },
  },
  shadow: {
    sm: { shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
    md: { shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  },
};

const THEME_COLORS: Record<ThemeName, ThemeColors> = {
  pure_black: { 
    bg: '#000000',        // Чистый черный фон
    text: '#FFFFFF',      // Белый текст
    mutedText: '#666666', // Приглушенный текст (иконки, подписи)
    surface: '#0A0A0A',   // Основные карточки
    surface2: '#161616',  // Вторичные поверхности
    accent: '#D00000',    // Красный акцент (brand)
    border: '#222222',    // Границы
  },
  indigo_night: {
    bg: '#0A0A14',        // Глубокий индиго-черный
    text: '#E8E8F0',      // Светло-серый с синим оттенком
    mutedText: '#6B6B88', // Приглушенный индиго
    surface: '#12121C',   // Темно-индиго карточки
    surface2: '#1A1A28',  // Вторичная поверхность
    accent: '#6366F1',    // Яркий индиго акцент
    border: '#252538',    // Индиго границы
  },
  emerald_night: {
    bg: '#0A120E',        // Глубокий изумрудно-черный
    text: '#E8F0EC',      // Светло-серый с зеленым оттенком
    mutedText: '#5A7566', // Приглушенный изумруд
    surface: '#0F1A14',   // Темно-изумрудные карточки
    surface2: '#162420',  // Вторичная поверхность
    accent: '#10B981',    // Яркий изумрудный акцент
    border: '#1F3329',    // Изумрудные границы
  }
};

// Combine colors with tokens to create full themes
const THEMES: Record<ThemeName, Theme> = {
  pure_black: { ...THEME_COLORS.pure_black, ...tokens },
  indigo_night: { ...THEME_COLORS.indigo_night, ...tokens },
  emerald_night: { ...THEME_COLORS.emerald_night, ...tokens },
};

interface ThemeContextProps {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

const THEME_STORAGE_KEY = '@babyzen_theme';

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeName, setThemeName] = useState<ThemeName>('pure_black');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme && (savedTheme === 'pure_black' || savedTheme === 'indigo_night' || savedTheme === 'emerald_night')) {
          setThemeName(savedTheme as ThemeName);
        }
      } catch (e) {
        console.error('Failed to load theme', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  const setTheme = async (name: ThemeName) => {
    setThemeName(name);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, name);
    } catch (e) {
      console.error('Failed to save theme', e);
    }
  };

  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={{ theme: THEMES[themeName], themeName, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useAppTheme must be used within a ThemeProvider');
  return context;
};