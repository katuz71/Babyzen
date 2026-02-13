import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { useAppTheme } from '@/lib/ThemeContext';

export default function OnboardingWelcome() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useAppTheme();

  return (
    <ScreenWrapper style={{ backgroundColor: theme.bg }}>
      <View className="flex-1 px-6 py-12 justify-between items-center">
        
        {/* === ВЕРХ: БРЕНД И ЛОГО === */}
        <View className="items-center pt-16">
          {/* Логотип с дорогим свечением */}
          <View 
            className="w-32 h-32 rounded-full items-center justify-center mb-8 border"
            style={{ 
              backgroundColor: theme.surface,
              borderColor: theme.border,
              shadowColor: theme.accent, 
              shadowOffset: { width: 0, height: 0 }, 
              shadowOpacity: 0.4, 
              shadowRadius: 35,
              elevation: 20 
            }}
          >
            <Text style={{ fontSize: 60 }}>👶</Text>
          </View>

          {/* Название бренда: Широкий трекинг = Премиум */}
          <Text style={{ color: theme.text }} className="text-2xl font-black text-center tracking-[0.4em] uppercase opacity-90">
            Baby Zen
          </Text>
        </View>


        {/* === ЦЕНТР: ГЛАВНЫЙ ВОПРОС === */}
        <View className="items-center w-full">
          {/* Тонкий эстетичный разделитель */}
          <View style={{ backgroundColor: theme.border }} className="w-16 h-[1px] rounded-full mb-8 opacity-60" />

          {/* Заголовок */}
          <Text style={{ color: theme.text }} className="text-4xl text-center font-bold leading-tight mb-6 tracking-tight">
            {t('welcome.title') || 'Почему он плачет?'}
          </Text>

          {/* Подзаголовок (Сжал px-10, чтобы текст лег пирамидкой, а не висел одной строкой) */}
          <Text style={{ color: theme.mutedText }} className="text-lg text-center leading-8 font-medium px-10">
            {t('welcome.subtitle') || 'Голод? Боль? Усталость?\nИИ определит причину за 10 секунд.'}
          </Text>
        </View>


        {/* === НИЗ: КНОПКА ДЕЙСТВИЯ === */}
        <View className="w-full pb-8">
          <Button 
            title={t('common.start') || 'РАСШИФРОВАТЬ ПЛАЧ'}
            onPress={() => router.replace('/(onboarding)/baby-setup')}
            style={{ 
              backgroundColor: theme.accent, 
              borderRadius: 35, // Более скругленная кнопка
              height: 72,       // Высокая, удобная для пальца
              shadowColor: theme.accent,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 15,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.1)' // Едва заметный блик по контуру
            }}
            textStyle={{
              color: '#FFFFFF',
              fontSize: 18,
              fontWeight: '800',
              letterSpacing: 2,
              textTransform: 'uppercase'
            }}
          />

          <Text style={{ color: theme.mutedText }} className="text-center text-[10px] mt-6 font-bold tracking-[0.2em] uppercase opacity-60">
            {t('welcome.trust') || 'TRUSTED BY 10,000+ PARENTS'}
          </Text>
        </View>

      </View>
    </ScreenWrapper>
  );
}