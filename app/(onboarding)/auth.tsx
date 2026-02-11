import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text } from '@/components/Text';
import { supabase } from '@/lib/supabase';

// Дублируем ключ здесь, чтобы исключить ошибки импорта
const BABY_DATA_KEY = 'baby_data_v1';

export default function OnboardingAuth() {
    const { t } = useTranslation();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [babyName, setBabyName] = useState<string>('малыша');

    // Достаем имя из кэша для заголовка
    useEffect(() => {
        const fetchBabyName = async () => {
            const raw = await AsyncStorage.getItem(BABY_DATA_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                if (data.name) setBabyName(data.name);
            }
        };
        fetchBabyName();
    }, []);

    // 🧠 Синхронизация с БД (ИСПРАВЛЕННАЯ ЛОГИКА)
    const syncProfileAndContinue = async (userId: string) => {
        try {
            console.log('🔄 Начинаем синхронизацию профиля...');
            const raw = await AsyncStorage.getItem(BABY_DATA_KEY);
            
            if (raw) {
                const data = JSON.parse(raw);
                console.log(`📦 Отправляем данные: ${data.name}, ${data.birthDate}`);

                // ИСПОЛЬЗУЕМ UPSERT ВМЕСТО UPDATE
                // Это гарантирует запись, даже если профиль еще не создан триггером
                const { error } = await supabase
                    .from('profiles')
                    .upsert({
                        id: userId, // Обязательно указываем ID
                        baby_name: data.name,
                        baby_dob: data.birthDate.split('T')[0], // Оставляем только дату YYYY-MM-DD
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'id' });

                if (error) {
                    console.error('❌ Ошибка Supabase:', error.message);
                } else {
                    console.log('✅ Данные ребенка успешно записаны в базу!');
                }
            } else {
                console.warn('⚠️ Нет данных в AsyncStorage для отправки');
            }
        } catch (e) {
            console.error('Ошибка синхронизации:', e);
        } finally {
            // В любом случае пускаем дальше
            router.replace('/(onboarding)/paywall');
        }
    };

    // 🍏 Авторизация
    const handleLogin = async () => {
        setLoading(true);
        try {
            // Анонимный вход (работает, если включен в Supabase)
            const { data, error } = await supabase.auth.signInAnonymously();

            if (error) throw error;
            
            if (data.user) {
                console.log('✅ Вход выполнен, ID:', data.user.id);
                await syncProfileAndContinue(data.user.id);
            }
        } catch (e: any) {
            console.error('Ошибка входа:', e.message);
            setLoading(false);
        }
    };

    return (
        <ScreenWrapper style={{ backgroundColor: '#000000' }}>
            <View className="flex-1 px-6 py-10 justify-between items-center">
                {/* Шапка */}
                <View className="flex-1 justify-center items-center w-full mt-10">
                    <View className="w-24 h-24 bg-[#111] rounded-full items-center justify-center mb-6 border border-[#333]">
                        <Text className="text-5xl">🔒</Text>
                    </View>
                    <Text className="text-4xl font-extrabold text-[#E0E0E0] text-center tracking-tighter mb-4">
                        Сохраняем профиль {babyName}
                    </Text>
                    <Text className="text-lg text-[#CCCCCC] text-center leading-7 px-4 opacity-80">
                        {t('auth.subtitle') || 'Создайте аккаунт в 1 клик, чтобы не потерять историю плача и дневник сна.'}
                    </Text>
                </View>

                {/* Кнопки */}
                <View className="w-full mb-8 space-y-4">
                    
                    {/* Apple (только iOS) */}
                    {Platform.OS === 'ios' && (
                        <TouchableOpacity
                            onPress={handleLogin}
                            disabled={loading}
                            className="flex-row items-center justify-center bg-white rounded-full h-16 w-full shadow-lg"
                        >
                            {loading ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <>
                                    <Ionicons name="logo-apple" size={28} color="black" style={{ marginRight: 8 }} />
                                    <Text className="text-black text-lg font-bold">Продолжить с Apple</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    {/* Google */}
                    <TouchableOpacity
                        onPress={handleLogin}
                        disabled={loading}
                        className="flex-row items-center justify-center bg-[#1A1A1A] border border-[#333] rounded-full h-16 w-full"
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <Ionicons name="logo-google" size={24} color="white" style={{ marginRight: 10 }} />
                                <Text className="text-white text-lg font-bold">Продолжить с Google</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <Text className="text-[#555] text-center text-xs mt-6 font-medium px-4">
                        Продолжая, вы соглашаетесь с Политикой конфиденциальности.
                    </Text>
                </View>
            </View>
        </ScreenWrapper>
    );
}