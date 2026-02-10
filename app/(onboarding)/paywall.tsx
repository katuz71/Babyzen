import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
// Используем стандартные иконки (Feather/Ionicons), чтобы не ломать сборку
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Localization from 'expo-localization';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';

// Tier 1: Богатые страны (США, Европа и т.д.)
const TIER_1_COUNTRIES = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'SE', 'NO', 'CH', 'NZ'];

export default function PaywallScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'weekly'>('yearly');
  const [loading, setLoading] = useState(false);

  // 1. ОПРЕДЕЛЯЕМ СТРАНУ И ЦЕНУ
  const userTier = useMemo(() => {
    const region = Localization.getLocales()[0]?.regionCode;
    return TIER_1_COUNTRIES.includes(region || '') ? 'tier1' : 'tier2';
  }, []);

  // Цены для разных регионов
  const prices = {
    tier1: { yearly: '$59.99', weekly: '$9.99', yearlyPerWeek: '$1.15' },
    tier2: { yearly: '$29.99', weekly: '$4.99', yearlyPerWeek: '$0.57' } // РФ, СНГ, ЛАТАМ
  };
  
  const currentPrices = prices[userTier];

  const handlePurchase = async () => {
    setLoading(true);
    // Имитация покупки
    setTimeout(() => {
      setLoading(false);
      router.replace('/(tabs)/record');
    }, 1500);
  };

  const handleClose = () => {
    router.replace('/(tabs)/record');
  };

  return (
    <ScreenWrapper style={{ backgroundColor: '#000000' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        
        {/* КНОПКА ЗАКРЫТЬ */}
        <View className="px-4 pt-4 flex-row justify-end">
          <TouchableOpacity onPress={handleClose} className="p-2 bg-[#1A1A1A] rounded-full opacity-60">
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View className="px-6 pb-10 flex-1 justify-between">
          
          {/* 1. ЗАГОЛОВОК (Вернули крупный размер) */}
          <View className="items-center mt-2">
            {/* Большая иконка замка (w-24) */}
            <View className="w-24 h-24 bg-[#111] rounded-full items-center justify-center mb-6 border border-[#333] shadow-2xl shadow-red-900/40">
              <Text className="text-5xl">🔓</Text>
            </View>
            
            <Text className="text-3xl font-extrabold text-white text-center mb-2">
              {t('paywall.title') || "Анализ готов"}
            </Text>
            <Text className="text-[#CCC] text-center text-lg px-2 leading-6">
              {t('paywall.subtitle') || "Разблокируйте переводчик плача и начните понимать малыша прямо сейчас."}
            </Text>
          </View>

          {/* 2. СПИСОК ПРЕИМУЩЕСТВ (Просторный: my-6) */}
          <View className="my-6 space-y-4">
            <FeatureRow text={t('paywall.feature1') || "Неограниченный перевод плача"} />
            <FeatureRow text={t('paywall.feature2') || "Режим «Почему он плачет?»"} />
            <FeatureRow text={t('paywall.feature3') || "Советы по успокоению (Dunstan)"} />
            <FeatureRow text={t('paywall.feature4') || "Дневник сна и прогресса"} />
          </View>

          {/* 3. КАРТОЧКИ ТАРИФОВ (Большие: p-5) */}
          <View className="space-y-4 mb-8">
            {/* YEARLY PLAN */}
            <TouchableOpacity 
              onPress={() => setSelectedPlan('yearly')}
              activeOpacity={0.9}
              className={`flex-row justify-between items-center p-5 rounded-2xl border-2 ${
                selectedPlan === 'yearly' ? 'border-[#D00000] bg-[#1a0505]' : 'border-[#333] bg-[#111]'
              }`}
            >
              <View>
                <View className="flex-row items-center mb-1">
                  <Text className="text-white font-bold text-lg mr-2">YEARLY</Text>
                  <View className="bg-[#D00000] px-2 py-0.5 rounded text-xs">
                     <Text className="text-white text-[10px] font-bold">SAVE 50%</Text>
                  </View>
                </View>
                <Text className="text-[#888] text-sm line-through">{currentPrices.weekly} / week</Text>
                <Text className="text-white font-bold text-xl">
                    {currentPrices.yearly} <Text className="text-sm font-normal text-[#888]">/ year</Text>
                </Text>
              </View>
              {selectedPlan === 'yearly' && (
                <View className="bg-[#D00000] p-1 rounded-full">
                    <Feather name="check" size={16} color="white"/>
                </View>
              )}
            </TouchableOpacity>

            {/* WEEKLY PLAN */}
            <TouchableOpacity 
              onPress={() => setSelectedPlan('weekly')}
              activeOpacity={0.9}
              className={`flex-row justify-between items-center p-5 rounded-2xl border-2 ${
                selectedPlan === 'weekly' ? 'border-[#D00000] bg-[#1a0505]' : 'border-[#333] bg-[#111]'
              }`}
            >
              <View>
                <Text className="text-white font-bold text-lg mb-1">WEEKLY</Text>
                <Text className="text-white font-bold text-xl">
                    {currentPrices.weekly} <Text className="text-sm font-normal text-[#888]">/ week</Text>
                </Text>
              </View>
              {selectedPlan === 'weekly' && (
                <View className="bg-[#D00000] p-1 rounded-full">
                    <Feather name="check" size={16} color="white"/>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* 4. КНОПКА (Всегда показывает "3 ДНЯ БЕСПЛАТНО") */}
          <View>
             <Button 
                // ВСЕГДА ТРИАЛ (По запросу)
                title={loading ? t('common.loading') : (t('paywall.cta_trial_3days') || "3 DAYS FREE TRIAL")}
                onPress={handlePurchase}
                style={{ 
                  backgroundColor: '#D00000', 
                  borderRadius: 30, 
                  height: 60,
                  shadowColor: '#D00000',
                  shadowOpacity: 0.5,
                  shadowRadius: 15,
                  elevation: 10
                }}
                textStyle={{ fontSize: 18, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' }}
             />
             
             {/* Подпись меняется, но кнопка остается агрессивной */}
             <Text className="text-[#555] text-center text-xs mt-4">
                {selectedPlan === 'yearly' 
                    ? "3 days free, then auto-renews. Cancel anytime." 
                    : "Recurring billing. Cancel anytime."}
             </Text>
          </View>
          
          <View className="flex-row justify-center mt-6 space-x-6 opacity-60">
             <Text className="text-[#444] text-xs">Terms of Use</Text>
             <Text className="text-[#444] text-xs">Privacy Policy</Text>
             <Text className="text-[#444] text-xs">Restore</Text>
          </View>

        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

function FeatureRow({ text }: { text: string }) {
  return (
    <View className="flex-row items-center">
      <View className="bg-[#222] p-1.5 rounded-full mr-4">
        <Feather name="check" size={14} color="#D00000" />
      </View>
      <Text className="text-[#EEE] text-base font-medium">{text}</Text>
    </View>
  );
}