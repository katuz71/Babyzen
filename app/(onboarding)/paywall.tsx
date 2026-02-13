import React, { useState, useMemo, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Localization from 'expo-localization';
import { Ionicons, Feather } from '@expo/vector-icons';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';

const TIER_1_COUNTRIES = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'SE', 'NO', 'CH', 'NZ'];

export default function PaywallScreen() {
  const router = useRouter();

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'weekly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [babyName, setBabyName] = useState<string>('');

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('profiles').select('baby_name').eq('id', user.id).single();
        if (data?.baby_name) setBabyName(data.baby_name);
      } catch (e) {
        console.log('Ошибка профиля');
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  // --- ЦЕНЫ: Tier 1 ($29.99/$9.99) vs Tier 2 ($14.99/$4.99) ---
  const currentPrices = useMemo(() => {
    const region = Localization.getLocales()[0]?.regionCode;
    const isTier1 = TIER_1_COUNTRIES.includes(region || '');
    
    return {
      monthly: isTier1 ? '29.99 $' : '14.99 $',
      weekly: isTier1 ? '9.99 $' : '4.99 $',
    };
  }, []);

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await new Promise(res => setTimeout(res, 1500)); // Имитация оплаты

      const until = new Date();
      if (selectedPlan === 'monthly') until.setMonth(until.getMonth() + 1);
      else until.setDate(until.getDate() + 7);

      await supabase.from('profiles').update({ is_premium: true, premium_until: until }).eq('id', user?.id);
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert("Ошибка", "Платеж не прошел");
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) return <View className="flex-1 bg-black items-center justify-center"><ActivityIndicator color="#D00000" /></View>;

  return (
    <ScreenWrapper style={{ backgroundColor: '#000000' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        
        {/* ВЕРХНЯЯ ПАНЕЛЬ */}
        <View className="px-4 pt-2 flex-row justify-end">
          <TouchableOpacity onPress={() => router.replace('/(tabs)')} className="p-2">
            <Ionicons name="close" size={28} color="#666" />
          </TouchableOpacity>
        </View>

        <View className="px-6 pb-6 flex-1 justify-around">
          
          {/* ХЕДЕР (Компактный замок) */}
          <View className="items-center">
            <View 
              className="w-20 h-20 bg-[#1A0505] rounded-full items-center justify-center mb-4 border-2 border-[#D0000030]"
              style={{ shadowColor: '#D00000', shadowOpacity: 0.4, shadowRadius: 15, elevation: 10 }}
            >
              <Feather name="lock" size={36} color="#D00000" style={{ transform: [{ rotate: '-10deg' }] }} />
            </View>

            <Text className="text-3xl font-black text-white text-center mb-2 leading-tight">
              {babyName ? `План для ${babyName} готов!` : 'Доступ открыт!'}
            </Text>

            <Text className="text-[#BBB] text-center text-lg font-medium leading-6 px-4">
              Разблокируйте ИИ-переводчик и поймите плач малыша
            </Text>
          </View>

          {/* ПРЕИМУЩЕСТВА (Меньше отступы) */}
          <View className="my-6 space-y-3">
            <FeatureRow text="Точный перевод плача (AI)" />
            <FeatureRow text="Советы педиатров 24/7" />
            <FeatureRow text="Безлимитные колыбельные" />
          </View>

          {/* ТАРИФЫ (Узкие карточки) */}
          <View className="mb-6">
            <PlanCard
              active={selectedPlan === 'monthly'}
              onPress={() => setSelectedPlan('monthly')}
              title="МЕСЯЦ"
              badge="3 ДНЯ БЕСПЛАТНО"
              price={currentPrices.monthly}
            />

            <PlanCard
              active={selectedPlan === 'weekly'}
              onPress={() => setSelectedPlan('weekly')}
              title="НЕДЕЛЯ"
              price={currentPrices.weekly}
            />
          </View>

          {/* КНОПКА И ФУТЕР */}
          <View>
            <Button
              title={purchasing ? '' : 'ПОПРОБОВАТЬ БЕСПЛАТНО'}
              onPress={handlePurchase}
              disabled={purchasing}
              style={{
                backgroundColor: '#D00000',
                borderRadius: 20,
                height: 64,
                elevation: 5,
              }}
              textStyle={{ fontSize: 17, fontWeight: '900', color: '#FFF' }}
              icon={purchasing ? <ActivityIndicator color="white" /> : null}
            />

            <View className="flex-row justify-center items-center mt-4 opacity-40">
              <Feather name="shield" size={12} color="white" />
              <Text className="text-white text-[10px] ml-2 font-bold uppercase tracking-widest">
                Безопасная оплата • Отмена в любое время
              </Text>
            </View>
            
            <Text className="text-[#444] text-center text-[10px] mt-3 px-6">
              После 3 дней начнется платная подписка. Управляйте в настройках Apple/Google.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

function FeatureRow({ text }: { text: string }) {
  return (
    <View className="flex-row items-center mb-1">
      <View className="bg-[#D0000010] p-1.5 rounded-full mr-4 border border-[#D0000020]">
        <Feather name="check" size={14} color="#D00000" />
      </View>
      <Text className="text-white text-base font-semibold flex-1">{text}</Text>
    </View>
  );
}

function PlanCard({ active, onPress, title, badge, price }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      className={`flex-row justify-between items-center p-5 rounded-3xl border-2 mb-3 ${
        active ? 'border-[#D00000] bg-[#120202]' : 'border-[#222] bg-[#0A0A0A]'
      }`}
    >
      <View className="flex-1">
        <View className="flex-row items-center mb-0.5">
          <Text className={`font-black text-xl mr-3 ${active ? 'text-white' : 'text-[#666]'}`}>
            {title}
          </Text>
          {badge && (
            <View className="bg-[#D00000] px-2 py-0.5 rounded-md">
              <Text className="text-white text-[9px] font-black">{badge}</Text>
            </View>
          )}
        </View>
        <Text className={`${active ? 'text-[#D00000]' : 'text-[#444]'} text-xs font-bold`}>
           {title === 'МЕСЯЦ' ? '3 дня пробный период' : 'Доступ на 7 дней'}
        </Text>
      </View>
      <Text className={`font-black text-xl ${active ? 'text-white' : 'text-[#666]'}`}>{price}</Text>
    </TouchableOpacity>
  );
}