import React, { useEffect, useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text } from '@/components/Text';
import { supabase } from '@/lib/supabase';
import { format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAppTheme } from '@/lib/ThemeContext';

// Функция для создания конфигурации событий на основе темы
const createEventConfig = (accentColor: string) => ({
  feeding: { label: 'Кормление', icon: 'restaurant', color: '#F3C623' },
  sleep: { label: 'Сон', icon: 'moon', color: '#A78BFA' },
  wake_up: { label: 'Проснулся', icon: 'sunny', color: '#FFD700' },
  diaper: { label: 'Смена подгузника', icon: 'water', color: '#4FD1C5' },
  Hunger: { label: 'Плач: Голод', icon: 'alert-circle', color: accentColor },
  Discomfort: { label: 'Плач: Дискомфорт', icon: 'alert-circle', color: accentColor },
  Tired: { label: 'Плач: Усталость', icon: 'alert-circle', color: accentColor },
  Colic: { label: 'Плач: Колики', icon: 'alert-circle', color: accentColor },
});

export default function HistoryScreen() {
  const { theme } = useAppTheme();
  const EVENT_CONFIG = useMemo(() => createEventConfig(theme.accent), [theme.accent]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<any[]>([]);

  const fetchHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Получаем логи событий
      const { data: logs } = await supabase.from('logs').select('*').eq('user_id', user.id);
      
      // 2. Получаем историю плача
      const { data: cries } = await supabase.from('cries').select('*').eq('user_id', user.id);

      // 3. Объединяем и сортируем по времени (новые сверху)
      const combined = [...(logs || []), ...(cries || [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setEvents(combined);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return 'Сегодня';
    if (isYesterday(d)) return 'Вчера';
    return format(d, 'd MMMM', { locale: ru });
  };

  if (loading) return <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.bg }}><ActivityIndicator color={theme.accent} /></View>;

  return (
    <ScreenWrapper style={{ backgroundColor: theme.bg }}>
      <ScrollView 
        className="flex-1 px-5"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHistory(); }} tintColor={theme.accent} />}
      >
        <View className="mt-6 mb-8">
          <Text className="text-gray-400 text-sm uppercase tracking-widest font-bold">Архив</Text>
          <Text className="text-3xl font-bold text-white">История событий</Text>
        </View>

        {events.length === 0 ? (
          <View className="items-center justify-center mt-20">
            <Ionicons name="calendar-outline" size={60} color="#333" />
            <Text className="text-gray-500 mt-4 text-center">Здесь будут появляться ваши записи кормлений, сна и анализы плача.</Text>
          </View>
        ) : (
          events.map((event, index) => {
            const config = EVENT_CONFIG[event.type] || { label: event.type, icon: 'help-circle', color: '#666' };
            const showDate = index === 0 || formatDateLabel(event.created_at) !== formatDateLabel(events[index - 1].created_at);

            return (
              <View key={event.id}>
                {showDate && (
                  <Text className="text-gray-600 font-bold mt-6 mb-3 uppercase text-xs tracking-tighter">
                    {formatDateLabel(event.created_at)}
                  </Text>
                )}
                
                <View className="flex-row items-center mb-4 bg-[#161B22] p-4 rounded-2xl border border-gray-900">
                  <View 
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: `${config.color}20` }}
                  >
                    <Ionicons name={config.icon} size={20} color={config.color} />
                  </View>
                  
                  <View className="ml-4 flex-1">
                    <Text className="text-white font-bold text-base">{config.label}</Text>
                    {event.confidence && (
                      <Text className="text-gray-500 text-xs">Уверенность: {Math.round(event.confidence * 100)}%</Text>
                    )}
                  </View>
                  
                  <Text className="text-gray-500 text-sm font-medium">
                    {format(new Date(event.created_at), 'HH:mm')}
                  </Text>
                </View>
              </View>
            );
          })
        )}
        <View className="h-10" />
      </ScrollView>
    </ScreenWrapper>
  );
}