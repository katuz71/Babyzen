import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
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

  const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'weekly'>('yearly');
  const [loading, setLoading] = useState(false);

  // --- регион → цены
  const userTier = useMemo<'tier1' | 'tier2'>(() => {
    const region = Localization.getLocales()[0]?.regionCode;
    return TIER_1_COUNTRIES.includes(region || '') ? 'tier1' : 'tier2';
  }, []);

  const prices = {
    tier1: { yearly: '$59.99', weekly: '$9.99', yearlyPerWeek: '$1.15' },
    tier2: { yearly: '$29.99', weekly: '$4.99', yearlyPerWeek: '$0.57' },
  };

  const currentPrices = prices[userTier];

  // --- единая точка завершения онбординга
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
      // имитация стора
      await new Promise(res => setTimeout(res, 1500));
      await markOnboardingFinished();
      router.replace('/(tabs)');
    } catch (e) {
      console.error('Ошибка при покупке:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    try {
      // free-доступ → тоже завершаем онбординг
      await markOnboardingFinished();
    } catch (e) {
      console.error('Ошибка при закрытии paywall:', e);
    } finally {
      router.replace('/(tabs)');
    }
  };

  return (
    <ScreenWrapper style={{ backgroundColor: '#000000' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        
        {/* CLOSE */}
        <View className="px-4 pt-4 flex-row justify-end">
          <TouchableOpacity
            onPress={handleClose}
            className="p-2 bg-[#1A1A1A] rounded-full opacity-60"
          >
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View className="px-6 pb-10 flex-1 justify-between">
          
          {/* HEADER */}
          <View className="items-center mt-2">
            <View className="w-24 h-24 bg-[#111] rounded-full items-center justify-center mb-6 border border-[#333]">
              <Text className="text-5xl">🔓</Text>
            </View>

            <Text className="text-3xl font-extrabold text-white text-center mb-2">
              {t('paywall.title') || 'Анализ готов'}
            </Text>

            <Text className="text-[#CCC] text-center text-lg px-2 leading-6">
              {t('paywall.subtitle') ||
                'Разблокируйте переводчик плача и начните понимать малыша прямо сейчас.'}
            </Text>
          </View>

          {/* FEATURES */}
          <View className="my-6 space-y-4">
            <FeatureRow text={t('paywall.feature1') || 'Неограниченный перевод плача'} />
            <FeatureRow text={t('paywall.feature2') || 'Почему он плачет?'} />
            <FeatureRow text={t('paywall.feature3') || 'Советы по успокоению'} />
            <FeatureRow text={t('paywall.feature4') || 'Дневник сна'} />
          </View>

          {/* PLANS */}
          <View className="space-y-4 mb-8">
            <PlanCard
              active={selectedPlan === 'yearly'}
              onPress={() => setSelectedPlan('yearly')}
              title="YEARLY"
              badge="SAVE 50%"
              oldPrice={`${currentPrices.weekly} / week`}
              price={`${currentPrices.yearly} / year`}
            />

            <PlanCard
              active={selectedPlan === 'weekly'}
              onPress={() => setSelectedPlan('weekly')}
              title="WEEKLY"
              price={`${currentPrices.weekly} / week`}
            />
          </View>

          {/* CTA */}
          <View>
            <Button
              title={loading ? t('common.loading') : t('paywall.cta_trial_3days') || '3 DAYS FREE TRIAL'}
              onPress={handlePurchase}
              style={{
                backgroundColor: '#D00000',
                borderRadius: 30,
                height: 60,
              }}
              textStyle={{
                fontSize: 18,
                fontWeight: '900',
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            />

            <Text className="text-[#555] text-center text-xs mt-4">
              {selectedPlan === 'yearly'
                ? '3 days free, then auto-renews. Cancel anytime.'
                : 'Recurring billing. Cancel anytime.'}
            </Text>
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

function PlanCard({
  active,
  onPress,
  title,
  badge,
  oldPrice,
  price,
}: {
  active: boolean;
  onPress: () => void;
  title: string;
  badge?: string;
  oldPrice?: string;
  price: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      className={`flex-row justify-between items-center p-5 rounded-2xl border-2 ${
        active ? 'border-[#D00000] bg-[#1a0505]' : 'border-[#333] bg-[#111]'
      }`}
    >
      <View>
        <View className="flex-row items-center mb-1">
          <Text className="text-white font-bold text-lg mr-2">{title}</Text>
          {badge && (
            <View className="bg-[#D00000] px-2 py-0.5 rounded">
              <Text className="text-white text-[10px] font-bold">{badge}</Text>
            </View>
          )}
        </View>

        {oldPrice && (
          <Text className="text-[#888] text-sm line-through">{oldPrice}</Text>
        )}

        <Text className="text-white font-bold text-xl">{price}</Text>
      </View>

      {active && (
        <View className="bg-[#D00000] p-1 rounded-full">
          <Feather name="check" size={16} color="#FFF" />
        </View>
      )}
    </TouchableOpacity>
  );
}
