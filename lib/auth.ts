import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { BABY_DATA_KEY } from '@/lib/constants';

/**
 * Простая анонимная авторизация
 */
export const signInAnonymously = async () => {
  try {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    return data.user;
  } catch (error) {
    console.error('Anon Auth Error:', error);
    return null;
  }
};

/**
 * Вход + Синхронизация профиля в облако
 */
export const signInAndSyncProfile = async () => {
  try {
    console.log('🔐 Auth: Начинаем вход и синхронизацию...');

    // 1. Авторизуемся
    const user = await signInAnonymously();
    if (!user) throw new Error('Не удалось создать пользователя');

    console.log('✅ Auth: Успех, ID:', user.id);

    // 2. Берем данные из локального хранилища
    const rawData = await AsyncStorage.getItem(BABY_DATA_KEY);
    
    if (rawData) {
      const { name, birthDate } = JSON.parse(rawData);
      console.log('🔄 Sync: Отправляем профиль в Supabase...', { name, birthDate });

      // 3. Обновляем профиль (он уже создан trigger'ом)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          baby_name: name,
          baby_dob: birthDate,
          tier: 'free',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('❌ Ошибка профиля:', profileError.message);
      } else {
        console.log('✨ Данные ребенка успешно синхронизированы!');
      }
    } else {
      console.warn('⚠️ Локальные данные ребенка не найдены.');
    }

    return user;

  } catch (error) {
    console.error('❌ Критическая ошибка Auth:', error);
    throw error;
  }
};