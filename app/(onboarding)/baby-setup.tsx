import React, { useState, useEffect } from 'react';
import { View, TextInput, Platform, TouchableOpacity, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { useAppTheme } from '@/lib/ThemeContext';

import { supabase } from '@/lib/supabase';
import { signInAnonymously } from '@/lib/auth';

export const BABY_DATA_KEY = 'baby_data_v1';

function toDateOnlyISO(d: Date) {
  return d.toISOString().split('T')[0]; // YYYY-MM-DD (важно для column type DATE)
}

export default function BabySetup() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useAppTheme();

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState(new Date());
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const dismissKeyboard = () => Keyboard.dismiss();

  useEffect(() => {
    (async () => {
      try {
        // 1) локально
        const cached = await AsyncStorage.getItem(BABY_DATA_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.name) setName(parsed.name);
          if (parsed?.birthDate) setBirthDate(new Date(parsed.birthDate));
          if (parsed?.heightCm !== undefined && parsed?.heightCm !== null) setHeightCm(String(parsed.heightCm));
          if (parsed?.weightKg !== undefined && parsed?.weightKg !== null) setWeightKg(String(parsed.weightKg));
        }

        // 2) если уже есть user — подтянем из БД
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        if (!prof) return;

        if (prof.baby_name) setName(prof.baby_name);
        if (prof.baby_dob) setBirthDate(new Date(prof.baby_dob));
        if (typeof prof.baby_height_cm === 'number') setHeightCm(String(prof.baby_height_cm));
        if (typeof prof.baby_weight_kg === 'number') setWeightKg(String(prof.baby_weight_kg));
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const parsedHeight = heightCm.trim() ? Number(heightCm.replace(',', '.')) : null;
      const parsedWeight = weightKg.trim() ? Number(weightKg.replace(',', '.')) : null;

      // 1) локально
      const babyData = {
        name,
        birthDate: birthDate.toISOString(),
        heightCm: Number.isFinite(parsedHeight as any) ? parsedHeight : null,
        weightKg: Number.isFinite(parsedWeight as any) ? parsedWeight : null,
        isSetup: true,
        onboardingFinished: false,
      };
      await AsyncStorage.setItem(BABY_DATA_KEY, JSON.stringify(babyData));

      // 2) user (если нет — создаём anon)
      const { data: { user: existing } } = await supabase.auth.getUser();
      const user = existing || await signInAnonymously();

      if (user) {
        // Profile is guaranteed to exist via trigger, just update it
        await supabase.from('profiles').update({
          is_anonymous: true,
          baby_name: name,
          baby_dob: toDateOnlyISO(birthDate),
          baby_height_cm: Number.isFinite(parsedHeight as any) ? Math.round(parsedHeight as number) : null,
          baby_weight_kg: Number.isFinite(parsedWeight as any) ? (parsedWeight as number) : null,
          updated_at: new Date().toISOString(),
        }).eq('id', user.id);
      }

      router.replace('/(onboarding)/paywall');
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
        <ScreenWrapper style={{ backgroundColor: theme.bg }}>
          <View className="flex-1 px-6 py-8 justify-between">

            {/* HEADER */}
            <View className="mt-4">
              <View className="flex-row items-center mb-4">
                <View style={{ backgroundColor: theme.accent }} className="px-3 py-1 rounded-full mr-3">
                  <Text style={{ color: '#FFF' }} className="text-xs font-bold">STEP 1 / 2</Text>
                </View>
                <Text style={{ color: theme.mutedText }} className="text-sm uppercase tracking-widest">AI CALIBRATION</Text>
              </View>

              <Text style={{ color: theme.text }} className="text-4xl font-extrabold mb-2 leading-10">
                {t('setup.title') || 'Настройка ИИ'}
              </Text>
              <Text style={{ color: theme.mutedText }} className="text-lg opacity-80 leading-7">
                {t('setup.subtitle') || 'Точность анализа зависит от возраста.'}
              </Text>
            </View>

            {/* FORM */}
            <View className="space-y-6">
              {/* Name */}
              <View>
                <Text style={{ color: theme.accent }} className="text-xs font-bold uppercase mb-3 ml-1 tracking-wider">
                  {t('setup.name_label')}
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Leo"
                  placeholderTextColor={theme.mutedText}
                  style={{
                    backgroundColor: theme.surface,
                    color: theme.text,
                    padding: 20,
                    borderRadius: 24,
                    fontSize: 20,
                    borderWidth: 1,
                    borderColor: name ? theme.accent : theme.border,
                  }}
                />
              </View>

              {/* DOB */}
              <View>
                <Text style={{ color: theme.accent }} className="text-xs font-bold uppercase mb-3 ml-1 tracking-wider">
                  {t('setup.birth_date_label')}
                </Text>

                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={{
                    backgroundColor: theme.surface,
                    padding: 20,
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: theme.border,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: theme.text }} className="text-xl font-medium">{formattedDate}</Text>
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

              {/* Height + Weight */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.accent }} className="text-xs font-bold uppercase mb-3 ml-1 tracking-wider">
                    Рост (см)
                  </Text>
                  <TextInput
                    value={heightCm}
                    onChangeText={setHeightCm}
                    placeholder="62"
                    placeholderTextColor={theme.mutedText}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: theme.surface,
                      color: theme.text,
                      padding: 18,
                      borderRadius: 24,
                      fontSize: 18,
                      borderWidth: 1,
                      borderColor: heightCm ? theme.accent : theme.border,
                    }}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.accent }} className="text-xs font-bold uppercase mb-3 ml-1 tracking-wider">
                    Вес (кг)
                  </Text>
                  <TextInput
                    value={weightKg}
                    onChangeText={setWeightKg}
                    placeholder="5.4"
                    placeholderTextColor={theme.mutedText}
                    keyboardType="decimal-pad"
                    style={{
                      backgroundColor: theme.surface,
                      color: theme.text,
                      padding: 18,
                      borderRadius: 24,
                      fontSize: 18,
                      borderWidth: 1,
                      borderColor: weightKg ? theme.accent : theme.border,
                    }}
                  />
                </View>
              </View>
            </View>

            {/* INFO */}
            <View style={{ backgroundColor: theme.surface, borderColor: theme.border }} className="p-5 rounded-3xl border">
              <View className="flex-row items-center mb-3">
                <Text className="text-xl mr-3">🔬</Text>
                <Text style={{ color: theme.text }} className="font-bold text-sm uppercase tracking-widest">
                  {t('setup.why_header')}
                </Text>
              </View>
              <Text style={{ color: theme.mutedText }} className="text-sm leading-5">
                {t('setup.reason_ai')}
              </Text>
            </View>

            {/* CTA */}
            <Button
              title={loading ? t('common.loading') : t('setup.continue')}
              onPress={handleSave}
              disabled={!name || loading}
              style={{
                backgroundColor: name ? theme.accent : theme.surface2,
                borderRadius: 30,
                height: 64,
                shadowColor: name ? theme.accent : 'transparent',
                shadowOpacity: 0.4,
                shadowRadius: 10,
                elevation: name ? 5 : 0,
              }}
              textStyle={{
                fontSize: 18,
                fontWeight: 'bold',
                letterSpacing: 1,
                color: name ? '#FFF' : theme.mutedText,
              }}
            />
          </View>
        </ScreenWrapper>
      </View>
    </TouchableWithoutFeedback>
  );
}
