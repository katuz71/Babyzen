import React, { useState, useMemo, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Localization from 'expo-localization';
import { Ionicons, Feather } from '@expo/vector-icons';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/lib/ThemeContext';

const TIER_1_COUNTRIES = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'SE', 'NO', 'CH', 'NZ'];

export default function PaywallScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'weekly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [babyName, setBabyName] = useState<string>('');

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('profiles').select('baby_name').eq('id', user.id).maybeSingle();
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

  if (loading) return <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.bg }}><ActivityIndicator color={theme.accent} /></View>;

  return (
    <ScreenWrapper style={{ backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        
        {/* ВЕРХНЯЯ ПАНЕЛЬ */}
        <View className="px-4 pt-2 flex-row justify-end">
          <TouchableOpacity onPress={() => router.replace('/(tabs)')} className="p-2">
            <Ionicons name="close" size={28} color={theme.mutedText} />
          </TouchableOpacity>
        </View>

        <View className="px-6 pb-6 flex-1 justify-around">
          
          {/* ХЕДЕР (Компактный замок) */}
          <View className="items-center">
            <View 
              className="w-20 h-20 rounded-full items-center justify-center mb-4 border-2"
              style={{ 
                backgroundColor: theme.surface2, 
                borderColor: theme.accent + '30',
                shadowColor: theme.accent, 
                shadowOpacity: 0.4, 
                shadowRadius: 15, 
                elevation: 10 
              }}
            >
              <Feather name="lock" size={36} color={theme.accent} style={{ transform: [{ rotate: '-10deg' }] }} />
            </View>

            <Text className="text-3xl font-black text-center mb-2 leading-tight" style={{ color: theme.text }}>
              {babyName ? `План для ${babyName} готов!` : 'Доступ открыт!'}
            </Text>

            <Text className="text-center text-lg font-medium leading-6 px-4" style={{ color: theme.mutedText }}>
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
                backgroundColor: theme.accent,
                borderRadius: 20,
                height: 64,
                elevation: 5,
              }}
              textStyle={{ fontSize: 17, fontWeight: '900', color: '#FFF' }}
              icon={purchasing ? <ActivityIndicator color="#FFF" /> : null}
            />

            <View className="flex-row justify-center items-center mt-4 opacity-40">
              <Feather name="shield" size={12} color={theme.text} />
              <Text className="text-[10px] ml-2 font-bold uppercase tracking-widest" style={{ color: theme.text }}>
                Безопасная оплата • Отмена в любое время
              </Text>
            </View>
            
            <Text className="text-center text-[10px] mt-3 px-6" style={{ color: theme.border }}>
              После 3 дней начнется платная подписка. Управляйте в настройках Apple/Google.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

function FeatureRow({ text }: { text: string }) {
  const { theme } = useAppTheme();
  
  return (
    <View className="flex-row items-center mb-1">
      <View className="p-1.5 rounded-full mr-4 border" style={{ backgroundColor: theme.accent + '10', borderColor: theme.accent + '20' }}>
        <Feather name="check" size={14} color={theme.accent} />
      </View>
      <Text className="text-base font-semibold flex-1" style={{ color: theme.text }}>{text}</Text>
    </View>
  );
}

function PlanCard({ active, onPress, title, badge, price }: any) {
  const { theme } = useAppTheme();
  
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      className="flex-row justify-between items-center p-5 rounded-3xl border-2 mb-3"
      style={{
        borderColor: active ? theme.accent : theme.border,
        backgroundColor: active ? theme.surface2 : theme.surface,
      }}
    >
      <View className="flex-1">
        <View className="flex-row items-center mb-0.5">
          <Text className="font-black text-xl mr-3" style={{ color: active ? theme.text : theme.mutedText }}>
            {title}
          </Text>
          {badge && (
            <View className="px-2 py-0.5 rounded-md" style={{ backgroundColor: theme.accent }}>
              <Text className="text-[9px] font-black" style={{ color: '#FFF' }}>{badge}</Text>
            </View>
          )}
        </View>
        <Text className="text-xs font-bold" style={{ color: active ? theme.accent : theme.border }}>
           {title === 'МЕСЯЦ' ? '3 дня пробный период' : 'Доступ на 7 дней'}
        </Text>
      </View>
      <Text className="font-black text-xl" style={{ color: active ? theme.text : theme.mutedText }}>{price}</Text>
    </TouchableOpacity>
  );
}