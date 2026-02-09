import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

// 1. Читаем ключи. Используем префикс EXPO_PUBLIC_, чтобы они были видны в приложении
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// 2. Проверка для отладки (покажет в терминале, если ключей нет)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ ОШИБКА: Ключи Supabase не найдены! Проверь файл .env");
} else {
  console.log("✅ Supabase инициализирован: ", supabaseUrl);
}

// 3. Создаем клиент
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// 4. Обновление сессии при возвращении в приложение
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});