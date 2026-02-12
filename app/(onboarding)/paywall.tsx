import React, { useState, useMemo, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { Ionicons, Feather } from '@expo/vector-icons';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { BABY_DATA_KEY } from './baby-setup';

// Tier 1: богатые страны
const TIER_1_COUNTRIES = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'SE', 'NO', 'CH', 'NZ'];

export default function PaywallScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  // Тарифы: monthly (месяц) или weekly (неделя)
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'weekly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [babyName, setBabyName] = useState<string>('');

  // Достаем имя ребенка
  useEffect(() => {
    const fetchBabyData = async () => {
      try {
        const raw = await AsyncStorage.getItem(BABY_DATA_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          if (data.name) setBabyName(data.name);
        }
      } catch (e) {
        console.error('Не удалось загрузить имя', e);
      }
    };
    fetchBabyData();
  }, []);

  // --- Регион → Цены ---
  const userTier = useMemo<'tier1' | 'tier2'>(() => {
    const region = Localization.getLocales()[0]?.regionCode;
    return TIER_1_COUNTRIES.includes(region || '') ? 'tier1' : 'tier2';
  }, []);

  // Цены (отображение)
  const prices = {
    tier1: { monthly: '$29.99', weekly: '$9.99' },
    tier2: { monthly: '$14.99', weekly: '$4.99' },
  };

  const currentPrices = prices[userTier];

  // --- Завершение онбординга ---
  const markOnboardingFinished = async () => {
    const raw = await AsyncStorage.getItem(BABY_DATA_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    await AsyncStorage.setItem(
      BABY_DATA_KEY,
      JSON.stringify({ ...data, onboardingFinished: true })
    );
  };

  const handlePurchase = async () => {
    setLoading(true);
    try {
      await new Promise(res => setTimeout(res, 1500)); // Имитация
      await markOnboardingFinished();
      router.replace('/(tabs)/record');
    } catch (e) {
      console.error('Ошибка при покупке:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    try {
      await markOnboardingFinished(); 
      router.replace('/(tabs)');
    } catch (e) {
      console.error('Ошибка при закрытии paywall:', e);
    }
  };

  return (
    <ScreenWrapper style={{ backgroundColor: '#000000' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        
        {/* Кнопка закрытия */}
        <View className="px-4 pt-4 flex-row justify-end">
          <TouchableOpacity
            onPress={handleClose}
            className="w-10 h-10 items-center justify-center bg-[#1A1A1A] rounded-full opacity-70"
          >
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View className="px-6 pb-10 flex-1 justify-between">
          
          {/* HEADER */}
          <View className="items-center mt-4">
            <View 
              className="w-24 h-24 bg-[#111] rounded-full items-center justify-center mb-6 border border-[#333]"
              style={{
                shadowColor: '#FFD700', // Золотое свечение
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 10
              }}
            >
              {/* ИЗМЕНЕНО: Золотой замок (#FFD700) */}
              <Ionicons name="lock-open" size={48} color="#FFD700" />
            </View>

            <Text className="text-3xl font-extrabold text-white text-center mb-3 leading-tight">
              {babyName
                ? t('paywall.title_with_name', { name: babyName })
                : t('paywall.title_generic')}
            </Text>

            <Text className="text-[#CCC] text-center text-lg px-2 leading-7 font-medium">
              {t('paywall.subtitle')}
            </Text>
          </View>

          {/* FEATURES LIST (С ИКОНКАМИ) */}
          <View className="my-8 space-y-5">
            <FeatureRow 
                icon="mic" 
                text={babyName
                  ? t('paywall.feature_cry_with_name', { name: babyName })
                  : t('paywall.feature_cry_generic')} 
            />
            <FeatureRow 
                icon="pulse" 
                text={babyName
                  ? t('paywall.feature_tips_with_name', { name: babyName })
                  : t('paywall.feature_tips_generic')} 
            />
            <FeatureRow 
                icon="moon" 
                text={t('paywall.feature_tracker')} 
            />
            <FeatureRow 
                icon="infinite" 
                text={t('paywall.feature_unlimited')} 
            />
          </View>

          {/* PLANS: Выбор тарифа (РУССКИЙ ЯЗЫК) */}
          <View className="space-y-4 mb-8">
            {/* Месячный план */}
            <PlanCard
              active={selectedPlan === 'monthly'}
              onPress={() => setSelectedPlan('monthly')}
              title={t('paywall.plan_month')}
              badge={t('paywall.badge_best')}
              subText={t('paywall.cancel_anytime')}
              price={`${currentPrices.monthly} ${t('paywall.per_month_suffix')}`}
            />

            {/* Недельный план */}
            <PlanCard
              active={selectedPlan === 'weekly'}
              onPress={() => setSelectedPlan('weekly')}
              title={t('paywall.plan_week')}
              price={`${currentPrices.weekly} ${t('paywall.per_week_suffix')}`}
            />
          </View>

          {/* CTA BUTTON */}
          <View>
            <Button
              title={loading ? '' : t('paywall.cta_trial_3days')}
              onPress={handlePurchase}
              disabled={loading}
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
                fontSize: 20,
                fontWeight: '900',
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
              icon={loading ? <ActivityIndicator color="white" /> : null}
            />

            <Text className="text-[#555] text-center text-xs mt-5 font-medium px-4">
              {selectedPlan === 'monthly'
                ? t('paywall.disclaimer_trial')
                : t('paywall.disclaimer_renew')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

// Компонент строки преимущества
function FeatureRow({ text, icon }: { text: string, icon: any }) {
  return (
    <View className="flex-row items-center">
      <View className="bg-[#1a0505] p-2 rounded-full mr-4 border border-[#330000] w-10 h-10 items-center justify-center">
        <Ionicons name={icon} size={20} color="#D00000" />
      </View>
      <Text className="text-[#EEE] text-lg font-semibold tracking-tight flex-1">
        {text}
      </Text>
    </View>
  );
}

// Компонент карточки тарифа
function PlanCard({
  active,
  onPress,
  title,
  badge,
  subText,
  price,
}: {
  active: boolean;
  onPress: () => void;
  title: string;
  badge?: string;
  subText?: string;
  price: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      className={`flex-row justify-between items-center p-5 rounded-3xl border-2 transition-all ${
        active 
          ? 'border-[#D00000] bg-[#120202]' 
          : 'border-[#333] bg-[#111]'
      }`}
    >
      <View className="flex-1">
        {badge && (
            <View className="self-start bg-[#D00000] px-2 py-0.5 rounded-md mb-2">
              <Text className="text-white text-[10px] font-bold uppercase tracking-wide">
                {badge}
              </Text>
            </View>
        )}
        
        <View className="mb-1">
          <Text className={`font-black text-lg ${active ? 'text-white' : 'text-[#999]'}`}>
            {title}
          </Text>
        </View>

        {subText && (
          <Text className="text-[#D00000] text-sm font-bold mb-0.5">
            {subText}
          </Text>
        )}
      </View>

      <View className="items-end pl-2">
        <Text className={`font-bold text-xl text-right ${active ? 'text-white' : 'text-[#777]'}`}>
          {price}
        </Text>
        {active && (
          <View className="mt-1 bg-[#D00000] w-6 h-6 rounded-full items-center justify-center">
             <Feather name="check" size={14} color="#FFF" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
