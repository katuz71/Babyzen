import React, { useEffect, useState, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text } from '@/components/Text';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

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
  const [lastLog, setLastLog] = useState<any>(null);
  const [sleepTimer, setSleepTimer] = useState<string>('00:00:00');
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef<any>(null);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);

      const { data: cries } = await supabase.from('cries').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
      if (cries && cries.length > 0) setLastCry(cries[0]);

      // Получаем ВООБЩЕ последний лог, чтобы понять статус (спит или нет)
      const { data: allLogs } = await supabase.from('logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
      const latest = allLogs?.[0];
      setLastLog(latest);

      // Отдельно для инсайта последнее кормление
      const { data: feeds } = await supabase.from('logs').select('*').eq('user_id', user.id).eq('type', 'feeding').order('created_at', { ascending: false }).limit(1);
      setLastFeeding(feeds?.[0]);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Живой таймер сна
  useEffect(() => {
    if (lastLog?.type === 'sleep') {
      timerRef.current = setInterval(() => {
        const start = new Date(lastLog.created_at).getTime();
        const now = new Date().getTime();
        const diff = now - start;
        
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        
        setSleepTimer(
          `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        );
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setSleepTimer('00:00:00');
    }
    return () => clearInterval(timerRef.current);
  }, [lastLog]);

  useEffect(() => { fetchData(); }, []);

  const quickLog = async (type: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('logs').insert({ user_id: user.id, type });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const getAiInsight = () => {
    const babyName = profile?.baby_name || 'малыш';
    
    if (lastLog?.type === 'sleep') {
      return `💤 ${babyName} сейчас спит. Тишина — это золото! Я слежу за временем сна.`;
    }

    if (lastCry && (new Date().getTime() - new Date(lastCry.created_at).getTime()) < 2700000 && lastCry.type === 'Hunger') {
      return `🍼 Был зафиксирован голодный плач. Если вы покормили ${babyName}, отметьте это.`;
    }

    if (lastFeeding) {
      const diffHours = (new Date().getTime() - new Date(lastFeeding.created_at).getTime()) / 3600000;
      if (diffHours >= 3) return `⚠️ Пора планировать кормление, прошло уже ${diffHours.toFixed(1)} ч.`;
    }

    return `${babyName} бодрствует. Вы отлично справляетесь! ✨`;
  };

  if (loading) return <View className="flex-1 bg-[#0B0E14] items-center justify-center"><ActivityIndicator color="#D00000" /></View>;

  return (
    <ScreenWrapper style={{ backgroundColor: COLORS.bg }}>
      <ScrollView className="flex-1 px-5" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#D00000" />}>
        
        {/* HEADER */}
        <View className="mt-6 mb-8 flex-row justify-between items-center">
          <View>
            <Text className="text-gray-400 text-base">Привет, {profile?.baby_name || 'Мама'}! 👋</Text>
            <Text className="text-white text-3xl font-bold">Baby Zen</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(onboarding)/baby-setup')} className="w-12 h-12 rounded-full bg-[#161B22] items-center justify-center border border-gray-800">
            <Ionicons name="settings-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* AI INSIGHT / SLEEP TIMER CARD */}
        <LinearGradient colors={lastLog?.type === 'sleep' ? ['#2D1B4E', '#12141C'] : ['#1A1D26', '#12141C']} className="rounded-3xl p-6 mb-8 border border-gray-800">
          <View className="flex-row items-center mb-3">
            <Ionicons name={lastLog?.type === 'sleep' ? "moon" : "sparkles"} size={20} color={lastLog?.type === 'sleep' ? COLORS.sleep : COLORS.feeding} />
            <Text className="text-gray-300 ml-2 font-bold uppercase tracking-widest text-xs">
              {lastLog?.type === 'sleep' ? 'Идет сон' : 'AI Инсайт'}
            </Text>
          </View>
          
          {lastLog?.type === 'sleep' ? (
            <View>
              <Text className="text-white text-4xl font-bold mb-1">{sleepTimer}</Text>
              <Text className="text-gray-400 text-sm italic">{getAiInsight()}</Text>
            </View>
          ) : (
            <Text className="text-white text-lg leading-6 font-medium">{getAiInsight()}</Text>
          )}
        </LinearGradient>

        {/* QUICK ACTIONS */}
        <View className="flex-row justify-between mb-10">
          <ActionButton icon="restaurant" label="Покормил" color={COLORS.feeding} onPress={() => quickLog('feeding')} />
          
          {/* Динамическая кнопка Сон/Проснулся */}
          {lastLog?.type === 'sleep' ? (
            <ActionButton icon="sunny" label="Проснулся" color="#FFD700" onPress={() => quickLog('wake_up')} />
          ) : (
            <ActionButton icon="moon" label="Уложил" color={COLORS.sleep} onPress={() => quickLog('sleep')} />
          )}
          
          <ActionButton icon="water" label="Сменил" color={COLORS.diaper} onPress={() => quickLog('diaper')} />
        </View>

        {/* MICROPHONE BUTTON */}
        <View className="items-center mb-10">
          <TouchableOpacity onPress={() => router.push('/record')} activeOpacity={0.8} className="w-48 h-48 rounded-full items-center justify-center" style={{ backgroundColor: '#161B22', shadowColor: COLORS.accent, shadowOpacity: 0.5, shadowRadius: 20, elevation: 15 }}>
            <LinearGradient colors={['#D00000', '#8B0000']} className="w-40 h-40 rounded-full items-center justify-center">
              <Ionicons name="mic" size={60} color="white" />
            </LinearGradient>
          </TouchableOpacity>
          <Text className="text-white mt-4 font-bold text-lg text-center">Нажать, когда плачет</Text>
        </View>

        {/* LAST ANALYSIS */}
        {lastCry && (
          <TouchableOpacity onPress={() => router.push('/history')} className="bg-[#161B22] rounded-3xl p-5 mb-10 flex-row items-center border border-gray-800">
            <View className="w-12 h-12 rounded-2xl bg-[#D0000020] items-center justify-center">
              <Ionicons name="pulse" size={24} color={COLORS.accent} />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-gray-400 text-xs uppercase font-bold">Последний плач</Text>
              <Text className="text-white font-bold text-base">{lastCry.type} ({Math.round(lastCry.confidence * 100)}%)</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="gray" />
          </TouchableOpacity>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

function ActionButton({ icon, label, color, onPress }: any) {
  return (
    <TouchableOpacity onPress={onPress} className="items-center">
      <View className="w-16 h-16 rounded-2xl items-center justify-center mb-2 border border-gray-800" style={{ backgroundColor: `${color}15` }}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <Text className="text-gray-400 text-xs font-semibold">{label}</Text>
    </TouchableOpacity>
  );
}