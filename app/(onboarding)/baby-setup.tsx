import React, { useState } from 'react';
import { View, TextInput, Platform, TouchableOpacity, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';

// Экспортируем ключ, чтобы auth.tsx мог его прочитать
export const BABY_DATA_KEY = 'baby_data_v1';

export default function BabySetup() {
    const { t } = useTranslation();
    const router = useRouter();

    const [name, setName] = useState('');
    const [birthDate, setBirthDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);

    const dismissKeyboard = () => Keyboard.dismiss();

    const handleSave = async () => {
        setLoading(true);
        try {
            const babyData = {
                name,
                birthDate: birthDate.toISOString(),
                isSetup: true,
                onboardingFinished: false,
            };

            // Лог для проверки
            console.log('💾 BabySetup: Сохраняем данные:', babyData);

            // Сохраняем
            await AsyncStorage.setItem(BABY_DATA_KEY, JSON.stringify(babyData));

            router.replace('/(onboarding)/auth');

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const formattedDate = birthDate.toLocaleDateString();

    return (
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <View style={{ flex: 1 }}>
                <ScreenWrapper style={{ backgroundColor: '#000000' }}>
                    <View className="flex-1 px-6 py-8 justify-between">

                        {/* 1. ШАПКА */}
                        <View className="mt-4">
                            <View className="flex-row items-center mb-4">
                                <View className="bg-[#D00000] px-3 py-1 rounded-full mr-3">
                                    <Text className="text-white text-xs font-bold">STEP 1 / 2</Text>
                                </View>
                                <Text className="text-[#888] text-sm uppercase tracking-widest">
                                    AI CALIBRATION
                                </Text>
                            </View>

                            <Text className="text-4xl font-extrabold text-white mb-2 leading-10">
                                {t('setup.title') || "Настройка ИИ"}
                            </Text>
                            <Text className="text-[#CCCCCC] text-lg opacity-80 leading-7">
                                {t('setup.subtitle') || "Точность анализа зависит от возраста."}
                            </Text>
                        </View>

                        {/* 2. ФОРМА ВВОДА */}
                        <View className="space-y-8">

                            {/* Поле ИМЯ */}
                            <View>
                                <Text className="text-[#D00000] text-xs font-bold uppercase mb-3 ml-1 tracking-wider">
                                    {t('setup.name_label')}
                                </Text>
                                <TextInput
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Leo"
                                    placeholderTextColor="#555"
                                    style={{
                                        backgroundColor: '#121212',
                                        color: '#FFF',
                                        padding: 20,
                                        borderRadius: 24,
                                        fontSize: 20,
                                        borderWidth: 1,
                                        borderColor: name ? '#D00000' : '#333'
                                    }}
                                />
                            </View>

                            {/* Поле ДАТА */}
                            <View>
                                <Text className="text-[#D00000] text-xs font-bold uppercase mb-3 ml-1 tracking-wider">
                                    {t('setup.birth_date_label')}
                                </Text>

                                <TouchableOpacity
                                    onPress={() => setShowDatePicker(true)}
                                    style={{
                                        backgroundColor: '#121212',
                                        padding: 20,
                                        borderRadius: 24,
                                        borderWidth: 1,
                                        borderColor: '#333',
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <Text className="text-white text-xl font-medium">
                                        {formattedDate}
                                    </Text>
                                    <Text className="text-2xl">📅</Text>
                                </TouchableOpacity>

                                {(showDatePicker || (Platform.OS === 'ios' && showDatePicker)) && (
                                    <DateTimePicker
                                        value={birthDate}
                                        mode="date"
                                        display="default"
                                        maximumDate={new Date()}
                                        onChange={(event, date) => {
                                            if (Platform.OS === 'android') setShowDatePicker(false);
                                            if (date) {
                                                setBirthDate(date);
                                                if (Platform.OS === 'ios') setShowDatePicker(false);
                                            } else {
                                                if (Platform.OS === 'android') setShowDatePicker(false);
                                            }
                                        }}
                                        themeVariant="dark"
                                    />
                                )}
                            </View>
                        </View>

                        {/* 3. ИНФО-БЛОК */}
                        <View className="bg-[#121212] p-5 rounded-3xl border border-[#222]">
                            <View className="flex-row items-center mb-3">
                                <Text className="text-xl mr-3">🔬</Text>
                                <Text className="text-white font-bold text-sm uppercase tracking-widest">
                                    {t('setup.why_header')}
                                </Text>
                            </View>
                            <Text className="text-[#999] text-sm leading-5">
                                {t('setup.reason_ai')}
                            </Text>
                        </View>

                        {/* 4. КНОПКА ДЕЙСТВИЯ */}
                        <Button
                            title={loading ? t('common.loading') : t('setup.continue')}
                            onPress={handleSave}
                            disabled={!name || loading}
                            style={{
                                backgroundColor: name ? '#D00000' : '#333',
                                borderRadius: 30,
                                height: 64,
                                shadowColor: name ? '#D00000' : 'transparent',
                                shadowOpacity: 0.4,
                                shadowRadius: 10,
                                elevation: name ? 5 : 0
                            }}
                            textStyle={{
                                fontSize: 18,
                                fontWeight: 'bold',
                                letterSpacing: 1,
                                color: name ? '#FFF' : '#777'
                            }}
                        />
                    </View>
                </ScreenWrapper>
            </View>
        </TouchableWithoutFeedback>
    );
}