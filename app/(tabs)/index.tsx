import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text } from '@/components/Text';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

// Конфигурация цветов Midnight Zen
const COLORS = {
  bg: '#0B0E14',
  card: '#161B22',
  accent: '#D00000',
  feeding: '#F3C623',
  sleep: '#A78BFA',
  diaper: '#4FD1C5',
};

export default function DashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [lastCry, setLastCry] = useState<any>(null);
  const [lastFeeding, setLastFeeding] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 1. Загрузка всех данных
  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Профиль ребенка
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);

      // Последний анализ плача
      const { data: cries } = await supabase.from('cries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (cries && cries.length > 0) setLastCry(cries[0]);

      // Последнее кормление
      const { data: logs } = await supabase.from('logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'feeding')
        .order('created_at', { ascending: false })
        .limit(1);
      if (logs && logs.length > 0) setLastFeeding(logs[0]);

    } catch (e) {
      console.error('Ошибка загрузки данных:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. Функция записи быстрых событий (Логи)
  const quickLog = async (type: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('logs').insert({ user_id: user.id, type });
      
      if (error) {
        Alert.alert("Ошибка", error.message);
      } else {
        // Мгновенно обновляем данные на экране
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 3. Умная логика AI Инсайта
  const getAiInsight = () => {
    if (!lastFeeding && !lastCry) {
      return "Начните отмечать события (кормление, сон), чтобы я мог анализировать режим малыша.";
    }

    const now = new Date();
    const babyName = profile?.baby_name || 'малыш';

    // Проверка недавнего голодного плача
    if (lastCry) {
      const cryTime = new Date(lastCry.created_at);
      const diffMins = (now.getTime() - cryTime.getTime()) / (1000 * 60);

      if (diffMins < 45 && lastCry.type === 'Hunger') {
        return `🍼 Мы зафиксировали плач "Голод" ${Math.round(diffMins)} мин. назад. Если вы уже покормили ${babyName}, нажмите кнопку ниже.`;
      }
    }

    // Проверка времени с последнего кормления
    if (lastFeeding) {
      const feedTime = new Date(lastFeeding.created_at);
      const diffHours = (now.getTime() - feedTime.getTime()) / (1000 * 60 * 60);

      if (diffHours >= 3) {
        return `⚠️ С последнего кормления ${babyName} прошло уже ${diffHours.toFixed(1)} ч. Вероятно, он скоро проголодается.`;
      }
    }

    // Статус по умолчанию
    return `${babyName} сейчас в порядке. Вы отлично справляетесь! ✨`;
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#0B0E14] items-center justify-center">
        <ActivityIndicator color="#D00000" />
      </View>
    );
  }

  return (
    <ScreenWrapper style={{ backgroundColor: COLORS.bg }}>
      <ScrollView 
        className="flex-1 px-5"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#D00000" />}
      >
        {/* HEADER */}
        <View className="mt-6 mb-8 flex-row justify-between items-center">
          <View>
            <Text className="text-gray-400 text-base">Привет, {profile?.baby_name || 'Мама'}! 👋</Text>
            <Text className="text-white text-3xl font-bold">Baby Zen</Text>
          </View>
          <TouchableOpacity 
            onPress={() => router.push('/(onboarding)/baby-setup')}
            className="w-12 h-12 rounded-full bg-[#161B22] items-center justify-center border border-gray-800"
          >
            <Ionicons name="settings-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* AI INSIGHT CARD */}
        <LinearGradient
          colors={['#1A1D26', '#12141C']}
          className="rounded-3xl p-6 mb-8 border border-gray-800"
        >
          <View className="flex-row items-center mb-3">
            <Ionicons name="sparkles" size={20} color={COLORS.feeding} />
            <Text className="text-gray-300 ml-2 font-bold uppercase tracking-widest text-xs">AI Инсайт</Text>
          </View>
          <Text className="text-white text-lg leading-6 font-medium">
            {getAiInsight()}
          </Text>
        </LinearGradient>

        {/* QUICK ACTIONS */}
        <View className="flex-row justify-between mb-10">
          <ActionButton icon="restaurant" label="Покормил" color={COLORS.feeding} onPress={() => quickLog('feeding')} />
          <ActionButton icon="moon" label="Уложил" color={COLORS.sleep} onPress={() => quickLog('sleep')} />
          <ActionButton icon="water" label="Сменил" color={COLORS.diaper} onPress={() => quickLog('diaper')} />
        </View>

        {/* MAIN RECORD BUTTON */}
        <View className="items-center mb-10">
          <TouchableOpacity 
            onPress={() => router.push('/record')}
            activeOpacity={0.8}
            className="w-48 h-48 rounded-full items-center justify-center"
            style={{ 
              backgroundColor: '#161B22', 
              shadowColor: COLORS.accent, 
              shadowOffset: { width: 0, height: 0 }, 
              shadowOpacity: 0.5, 
              shadowRadius: 20,
              elevation: 15,
              borderWidth: 1,
              borderColor: '#222'
            }}
          >
            <LinearGradient
              colors={['#D00000', '#8B0000']}
              className="w-40 h-40 rounded-full items-center justify-center"
            >
              <Ionicons name="mic" size={60} color="white" />
            </LinearGradient>
          </TouchableOpacity>
          <Text className="text-white mt-4 font-bold text-lg">Понять плач</Text>
        </View>

        {/* LAST ANALYSIS WIDGET */}
        {lastCry && (
          <TouchableOpacity 
            onPress={() => router.push('/history')}
            className="bg-[#161B22] rounded-3xl p-5 mb-10 flex-row items-center border border-gray-800"
          >
            <View className="w-12 h-12 rounded-2xl bg-[#D0000020] items-center justify-center">
              <Ionicons name="pulse" size={24} color={COLORS.accent} />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-gray-400 text-xs uppercase font-bold">Последний анализ</Text>
              <Text className="text-white font-bold text-base">{lastCry.type} ({Math.round(lastCry.confidence * 100)}%)</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="gray" />
          </TouchableOpacity>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

// Компонент кнопок действий
function ActionButton({ icon, label, color, onPress }: any) {
  return (
    <TouchableOpacity onPress={onPress} className="items-center">
      <View 
        className="w-16 h-16 rounded-2xl items-center justify-center mb-2 border border-gray-800"
        style={{ backgroundColor: `${color}15` }}
      >
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <Text className="text-gray-400 text-xs font-semibold">{label}</Text>
    </TouchableOpacity>
  );
}