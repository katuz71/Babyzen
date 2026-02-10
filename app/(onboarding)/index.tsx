import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';

export default function OnboardingWelcome() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <ScreenWrapper style={{ backgroundColor: '#000000' }}>
      <View className="flex-1 px-6 py-10 justify-between items-center">
        
        {/* БЛОК 1: БРЕНД (Иконка + Заголовок вместе) */}
        <View className="flex-1 justify-center items-center w-full mt-10">
           
           {/* Иконка */}
           <View 
             className="w-40 h-40 bg-[#0A0A0A] rounded-full items-center justify-center mb-6 border border-[#1A1A1A]"
             style={{
               shadowColor: '#D00000',
               shadowOffset: { width: 0, height: 0 },
               shadowOpacity: 0.25,
               shadowRadius: 25,
               elevation: 10
             }}
           >
              <Text style={{ fontSize: 80 }}>👶</Text>
           </View>

           {/* Заголовок (Прижат к иконке) */}
           <Text className="text-5xl font-extrabold text-white text-center tracking-tighter shadow-lg">
             Baby Zen
           </Text>
           
           {/* Разделитель (Визуальная пауза) */}
           <View className="w-12 h-1 bg-[#333] rounded-full my-8" />

           {/* БЛОК 2: ХУК (Проблема -> Решение) */}
           {/* Это то, что читает пользователь UAC */}
           <Text className="text-2xl text-white text-center font-bold leading-9 mb-2">
             {t('welcome.title') || "Почему он плачет?"}
           </Text>
           
           <Text className="text-lg text-[#CCCCCC] text-center font-normal leading-7 px-4">
             {t('welcome.subtitle') || "Голод, Боль или Сон? ИИ определит причину за 10 секунд."}
           </Text>
        </View>

        {/* БЛОК 3: КНОПКА ДЕЙСТВИЯ */}
        <View className="w-full mb-8">
          <Button 
            title={t('common.start') || "РАСШИФРОВАТЬ ПЛАЧ"} 
            onPress={() => router.push('/(onboarding)/baby-setup')}
            
            style={{ 
              backgroundColor: '#D00000', // Casino Red
              borderRadius: 30,           
              height: 64,                 
              shadowColor: '#D00000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.5,
              shadowRadius: 15,
              elevation: 10,
              justifyContent: 'center',
              alignItems: 'center'
            }} 
            
            textStyle={{
               color: '#FFFFFF',
               fontSize: 19,
               fontWeight: '900', // Extra Bold
               letterSpacing: 1,
               textTransform: 'uppercase'
            }}
          />
          
          {/* Social Proof (Микро-текст для доверия) */}
          <Text className="text-[#555] text-center text-xs mt-4 font-medium">
             {t('welcome.trust') || "Нам доверяют 10,000+ родителей"}
          </Text>
        </View>

      </View>
    </ScreenWrapper>
  );
}