import React, { useState, useEffect } from 'react';
import { View, TextInput, Platform, TouchableOpacity, Keyboard, TouchableWithoutFeedback, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase'; // Наша база

export default function BabySetup() {
    const { t } = useTranslation();
    const router = useRouter();

    const [name, setName] = useState('');
    const [birthDate, setBirthDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(true); // Для начальной загрузки
    const [saving, setSaving] = useState(false);  // Для кнопки сохранения
    const [isEditing, setIsEditing] = useState(false);

    // 1. Проверяем: новый это юзер или он пришел из настроек?
    useEffect(() => {
        const checkExistingProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setLoading(false);
                    return;
                }

                const { data } = await supabase
                    .from('profiles')
                    .select('baby_name, baby_dob')
                    .eq('id', user.id)
                    .single();

                if (data) {
                    setName(data.baby_name || '');
                    if (data.baby_dob) setBirthDate(new Date(data.baby_dob));
                    setIsEditing(true);
                }
            } catch (e) {
                console.log("Новый пользователь, данных в БД нет");
            } finally {
                setLoading(false);
            }
        };
        checkExistingProfile();
    }, []);

    const handleSave = async () => {
        if (!name) return;
        setSaving(true);
        
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                // Если юзер еще не залогинен (первый запуск), 
                // можем временно кинуть его на Auth, как в твоем старом коде
                router.replace('/auth' as any);
                return;
            }

            // СОХРАНЯЕМ В ОБЛАКО (Supabase)
            const { error } = await supabase
                .from('profiles')
                .upsert({ 
                    id: user.id, 
                    baby_name: name, 
                    baby_dob: birthDate.toISOString().split('T')[0], // формат YYYY-MM-DD
                    updated_at: new Date() 
                });

            if (error) throw error;

            // Если всё ок — на главную
            router.replace('/(tabs)');

        } catch (e: any) {
            Alert.alert("Ошибка", e.message);
        } finally {
            setSaving(false);
        }
    };

    const formattedDate = birthDate.toLocaleDateString();

    if (loading) return (
        <View className="flex-1 bg-black items-center justify-center">
            <ActivityIndicator color="#D00000" />
        </View>
    );

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
                <ScreenWrapper style={{ backgroundColor: '#000000' }}>
                    <View className="flex-1 px-6 py-8 justify-between">
                        
                        <View className="mt-4">
                            {/* Назад, если мы в режиме редактирования */}
                            {isEditing && (
                                <TouchableOpacity onPress={() => router.back()} className="mb-4">
                                    <Ionicons name="arrow-back" size={28} color="white" />
                                </TouchableOpacity>
                            )}

                            <View className="flex-row items-center mb-4">
                                <View className="bg-[#D00000] px-3 py-1 rounded-full mr-3">
                                    <Text className="text-white text-xs font-bold">
                                        {isEditing ? 'PROFILE' : 'STEP 1 / 2'}
                                    </Text>
                                </View>
                                <Text className="text-[#888] text-sm uppercase tracking-widest">
                                    AI CALIBRATION
                                </Text>
                            </View>

                            <Text className="text-4xl font-extrabold text-white mb-2 leading-10">
                                {isEditing ? "Профиль" : (t('setup.title') || "Настройка ИИ")}
                            </Text>
                            <Text className="text-[#CCCCCC] text-lg opacity-80 leading-7">
                                {t('setup.subtitle') || "Точность анализа зависит от возраста."}
                            </Text>
                        </View>

                        <View className="space-y-8">
                            {/* Поле ИМЯ */}
                            <View>
                                <Text className="text-[#D00000] text-xs font-bold uppercase mb-3 ml-1 tracking-wider">
                                    {t('setup.name_label') || "Имя ребенка"}
                                </Text>
                                <TextInput
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Leo"
                                    placeholderTextColor="#555"
                                    className="bg-[#121212] text-white p-5 rounded-3xl text-xl border border-[#333]"
                                    style={{ borderColor: name ? '#D00000' : '#333' }}
                                />
                            </View>

                            {/* Поле ДАТА */}
                            <View className="mt-6">
                                <Text className="text-[#D00000] text-xs font-bold uppercase mb-3 ml-1 tracking-wider">
                                    {t('setup.birth_date_label') || "Дата рождения"}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setShowDatePicker(true)}
                                    className="bg-[#121212] p-5 rounded-3xl border border-[#333] flex-row justify-between items-center"
                                >
                                    <Text className="text-white text-xl font-medium">{formattedDate}</Text>
                                    <Text className="text-2xl">📅</Text>
                                </TouchableOpacity>

                                {showDatePicker && (
                                    <DateTimePicker
                                        value={birthDate}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        maximumDate={new Date()}
                                        themeVariant="dark"
                                        onChange={(event, date) => {
                                            if (Platform.OS === 'android') setShowDatePicker(false);
                                            if (date) setBirthDate(date);
                                        }}
                                    />
                                )}
                            </View>
                        </View>

                        <View className="mt-10">
                            <Button
                                title={saving ? "..." : (isEditing ? "Сохранить" : (t('setup.continue') || "Продолжить"))}
                                onPress={handleSave}
                                disabled={!name || saving}
                                style={{
                                    backgroundColor: name ? '#D00000' : '#333',
                                    borderRadius: 30,
                                    height: 64,
                                }}
                            />
                        </View>
                    </View>
                </ScreenWrapper>
            </View>
        </TouchableWithoutFeedback>
    );
}