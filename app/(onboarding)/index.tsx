import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { changeLanguage, type AppLanguage } from '@/lib/i18n';

export default function OnboardingWelcome() {
  const router = useRouter();
  const { t, i18n } = useTranslation();

  // текущий язык (нормализованный)
  const currentLang = useMemo<AppLanguage>(() => {
    const base = (i18n.language || 'en').slice(0, 2).toLowerCase();
    return base === 'ru' || base === 'en' || base === 'es'
      ? (base as AppLanguage)
      : 'en';
  }, [i18n.language]);

  const [lang, setLang] = useState<AppLanguage>(currentLang);

  const setAppLang = async (next: AppLanguage) => {
    setLang(next);
    await changeLanguage(next);
  };

  return (
    <ScreenWrapper style={{ backgroundColor: '#000000' }}>
      <View className="flex-1 px-6 py-10 justify-between items-center">
        
        {/* БЛОК 1: БРЕНД */}
        <View className="flex-1 justify-center items-center w-full mt-10">
          <View
            className="w-40 h-40 bg-[#0A0A0A] rounded-full items-center justify-center mb-6 border border-[#1A1A1A]"
            style={{
              shadowColor: '#D00000',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.25,
              shadowRadius: 25,
              elevation: 10,
            }}
          >
            <Text style={{ fontSize: 80 }}>👶</Text>
          </View>

          <Text className="text-5xl font-extrabold text-white text-center tracking-tighter">
            Baby Zen
          </Text>

          <View className="w-12 h-1 bg-[#333] rounded-full my-8" />

          <Text className="text-2xl text-white text-center font-bold leading-9 mb-2">
            {t('welcome.title') || 'Почему он плачет?'}
          </Text>

          <Text className="text-lg text-[#CCCCCC] text-center leading-7 px-4">
            {t('welcome.subtitle') ||
              'Голод, Боль или Сон? ИИ определит причину за 10 секунд.'}
          </Text>
        </View>

        {/* БЛОК 2: ЯЗЫК (компактно) */}
        <View className="flex-row justify-center items-center mb-5">
          {(['ru', 'en', 'es'] as AppLanguage[]).map((code) => {
            const active = lang === code;
            return (
              <TouchableOpacity
                key={code}
                activeOpacity={0.9}
                onPress={() => setAppLang(code)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  marginHorizontal: 6,
                  borderWidth: 1,
                  borderColor: active ? '#D00000' : '#333',
                  backgroundColor: active ? '#1a0505' : '#111',
                }}
              >
                <Text
                  style={{
                    color: active ? '#FFFFFF' : '#AAAAAA',
                    fontWeight: '800',
                  }}
                >
                  {code.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* БЛОК 3: CTA */}
        <View className="w-full mb-8">
          <Button
            title={t('common.start') || 'РАСШИФРОВАТЬ ПЛАЧ'}
            onPress={() => router.replace('/(onboarding)/baby-setup')}
            style={{
              backgroundColor: '#D00000',
              borderRadius: 30,
              height: 64,
              shadowColor: '#D00000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.5,
              shadowRadius: 15,
              elevation: 10,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            textStyle={{
              color: '#FFFFFF',
              fontSize: 19,
              fontWeight: '900',
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          />

          <Text className="text-[#555] text-center text-xs mt-4 font-medium">
            {t('welcome.trust') || 'Нам доверяют 10,000+ родителей'}
          </Text>
        </View>
      </View>
    </ScreenWrapper>
  );
}
