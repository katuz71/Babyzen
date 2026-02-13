import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { 
  View, ScrollView, TouchableOpacity, ActivityIndicator, 
  RefreshControl, Modal, SectionList, Dimensions, Alert, StyleSheet 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text } from '@/components/Text';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { pickSmartSootheUrl } from '@/lib/smartSoothe';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/lib/ThemeContext';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';

const { height } = Dimensions.get('window');
const PAGE_SIZE = 30;

// Цвета и конфиги действий
const ACTION_LOGS: Record<string, { emoji: string; color: string; label: string }> = {
  feeding: { emoji: '🍼', color: '#F3C623', label: 'Кормление' },
  sleep_start: { emoji: '😴', color: '#A78BFA', label: 'Уснул' },
  sleep_wake: { emoji: '☀️', color: '#FF9500', label: 'Проснулся' },
  diaper: { emoji: '🧷', color: '#4FD1C5', label: 'Подгузник' },
};

// Конфиг типов плача
const CRY_TYPES: Record<string, { emoji: string; color: string; gradient: [string, string, ...string[]] }> = {
  Hunger: { emoji: '🍼', color: '#FF9500', gradient: ['#FF9500', '#FF5E00'] },
  Burp: { emoji: '☁️', color: '#34C759', gradient: ['#34C759', '#1D9444'] },
  Sleep: { emoji: '😴', color: '#5856D6', gradient: ['#5856D6', '#322F91'] },
  Discomfort: { emoji: '🧷', color: '#FF3B30', gradient: ['#FF3B30', '#B01F18'] },
  Gas: { emoji: '💨', color: '#AF52DE', gradient: ['#AF52DE', '#732B9C'] },
  Unknown: { emoji: '❓', color: '#8E8E93', gradient: ['#3A3A3C', '#1C1C1E'] },
};

interface UnifiedLogItem {
  id: string;
  table: 'cries' | 'logs';
  original_id: number;
  type: string;
  created_at: string;
  reasoning?: string;
  confidence?: number;
}
type HistorySection = { title: string; key: string; data: UnifiedLogItem[] };

// Вспомогательные функции времени
function pad2(n: number) { return String(n).padStart(2, '0'); }
function dayKey(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function isSameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function isToday(d: Date) { return isSameDay(d, new Date()); }
function isYesterday(d: Date) { const y = startOfDay(new Date()); y.setDate(y.getDate() - 1); return isSameDay(d, y); }
function normalizeTypeKey(rawType: any) { if (!rawType || typeof rawType !== 'string') return 'Unknown'; return rawType.charAt(0).toUpperCase() + rawType.slice(1); }
function safeLocale(lang?: string) {
  const l = (lang || 'en').toLowerCase();
  if (l.startsWith('ru')) return 'ru-RU';
  if (l.startsWith('es')) return 'es-ES';
  return 'en-US';
}
function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}:${pad2(minutes)}:${pad2(seconds)}`;
  return `${pad2(minutes)}:${pad2(seconds)}`;
}

// =====================================================================
// КОМПОНЕНТ ДНЕВНИКА ПЛАЧА И ДЕЙСТВИЙ (Внутри модалки)
// =====================================================================
function HistoryModalContent({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const { theme } = useAppTheme();
  const router = useRouter(); 
  const locale = useMemo(() => safeLocale(i18n.language), [i18n.language]);

  const [history, setHistory] = useState<UnifiedLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  
  const [selectedCry, setSelectedCry] = useState<UnifiedLogItem | null>(null);

  const soothePlayerRef = useRef<Audio.Sound | null>(null);
  const [isSoothePlaying, setIsSoothePlaying] = useState(false);
  const endReachedLockRef = useRef(false);

  const buildSections = useCallback((items: UnifiedLogItem[]): HistorySection[] => {
    const map = new Map<string, UnifiedLogItem[]>();
    for (const item of items) {
      const d = new Date(item.created_at);
      const key = dayKey(d);
      const arr = map.get(key) || [];
      arr.push(item);
      map.set(key, arr);
    }
    const keys = Array.from(map.keys()).sort((a, b) => (a < b ? 1 : -1));
    return keys.map(k => {
      const arr = (map.get(k) || []).slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const d = new Date(`${k}T00:00:00`);
      let title = '';
      if (isToday(d)) title = t('history.today', { defaultValue: 'Сегодня' });
      else if (isYesterday(d)) title = t('history.yesterday', { defaultValue: 'Вчера' });
      else title = d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
      return { title, key: k, data: arr };
    });
  }, [locale, t]);

  const sections = useMemo(() => buildSections(history), [history, buildSections]);

  const fetchPage = async (opts: { reset: boolean }) => {
    const { reset } = opts;
    if (reset) { setLoading(true); setHasMore(true); setNextCursor(null); endReachedLockRef.current = false; }
    else { if (loadingMore || loading || !hasMore) return; setLoadingMore(true); }

    try {
      const cursor = reset ? null : nextCursor;
      let criesQ = supabase.from('cries').select('*').order('created_at', { ascending: false }).limit(PAGE_SIZE);
      let logsQ = supabase.from('logs').select('*').order('created_at', { ascending: false }).limit(PAGE_SIZE);

      if (cursor) {
        criesQ = criesQ.lt('created_at', cursor);
        logsQ = logsQ.lt('created_at', cursor);
      }

      const [criesRes, logsRes] = await Promise.all([criesQ, logsQ]);
      const combined: UnifiedLogItem[] = [];

      if (criesRes.data) {
        criesRes.data.forEach(c => combined.push({ ...c, id: `cry_${c.id}`, table: 'cries', original_id: c.id }));
      }
      if (logsRes.data) {
        logsRes.data.forEach(l => {
          // СТРОГАЯ ФИЛЬТРАЦИЯ: Показываем только те логи, которые мы знаем
          if (ACTION_LOGS[l.type]) {
            combined.push({ ...l, id: `log_${l.id}`, table: 'logs', original_id: l.id });
          }
        });
      }

      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const page = combined.slice(0, PAGE_SIZE);

      if (reset) setHistory(page);
      else {
        setHistory(prev => {
          const seen = new Set(prev.map(x => x.id));
          const merged = prev.slice();
          for (const it of page) if (!seen.has(it.id)) merged.push(it);
          return merged;
        });
      }

      if (page.length > 0) setNextCursor(page[page.length - 1].created_at);
      if (page.length < PAGE_SIZE) setHasMore(false);

    } catch (e: any) { Alert.alert(t('common.error', { defaultValue: 'Ошибка' }), e.message); } 
    finally { if (reset) setLoading(false); else setLoadingMore(false); }
  };

  useEffect(() => { fetchPage({ reset: true }); }, []);

  const loadMore = async () => {
    if (endReachedLockRef.current) return;
    endReachedLockRef.current = true;
    await fetchPage({ reset: false });
    setTimeout(() => { endReachedLockRef.current = false; }, 350);
  };

  const deleteOne = async (item: UnifiedLogItem) => {
    setHistory(prev => prev.filter(x => x.id !== item.id));
    if (selectedCry?.id === item.id) {
      await soothePlayerRef.current?.stopAsync();
      setSelectedCry(null);
    }
    await supabase.from(item.table).delete().eq('id', item.original_id);
  };

  const deleteDay = async (sectionKey: string) => { 
    setHistory(prev => prev.filter(it => dayKey(new Date(it.created_at)) !== sectionKey));
    const [y, m, d] = sectionKey.split('-');
    const from = new Date(parseInt(y), parseInt(m)-1, parseInt(d), 0, 0, 0).toISOString();
    const to = new Date(parseInt(y), parseInt(m)-1, parseInt(d), 23, 59, 59, 999).toISOString();
    await Promise.all([
      supabase.from('cries').delete().gte('created_at', from).lte('created_at', to),
      supabase.from('logs').delete().gte('created_at', from).lte('created_at', to)
    ]);
  };

  const promptClearHistory = () => {
    Alert.alert(
      'Очистка истории',
      'За какой период вы хотите удалить все записи?',
      [
        { text: 'За сегодня', onPress: () => deletePeriod('today') },
        { text: 'За этот месяц', onPress: () => deletePeriod('month') },
        { text: 'Удалить всё', onPress: () => deletePeriod('all'), style: 'destructive' },
        { text: 'Отмена', style: 'cancel' }
      ]
    );
  };

  const deletePeriod = async (period: 'today' | 'month' | 'all') => {
    const now = new Date();
    let fromISO = '';
    const toISO = now.toISOString();

    if (period === 'today') fromISO = startOfDay(now).toISOString();
    else if (period === 'month') fromISO = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    if (period === 'all') {
      await Promise.all([supabase.from('cries').delete().gte('id', 0), supabase.from('logs').delete().gte('id', 0)]);
    } else {
      await Promise.all([
        supabase.from('cries').delete().gte('created_at', fromISO).lte('created_at', toISO),
        supabase.from('logs').delete().gte('created_at', fromISO).lte('created_at', toISO)
      ]);
    }
    fetchPage({ reset: true });
  };

  const handleAskAI = (item: UnifiedLogItem) => {
    const time = new Date(item.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    let query = '';
    if (item.table === 'cries') {
      const typeKey = normalizeTypeKey(item.type);
      query = `В ${time} был плач типа ${typeKey}. Что это значит и как помочь малышу?`;
    } else {
      const config = ACTION_LOGS[item.type];
      if (!config) return; // Защита
      query = `В ${time} я отметил: ${config.label}. Какие будут рекомендации?`;
    }
    
    stopSmartSoothe();
    onClose();
    
    router.push({
      pathname: '/(tabs)/chat',
      params: { initialQuery: query }
    });
  };

  const handleItemPress = (item: UnifiedLogItem) => {
    if (item.table === 'cries') {
      setSelectedCry(item);
    } else {
      const config = ACTION_LOGS[item.type];
      if (!config) return; // Защита
      
      const time = new Date(item.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
      Alert.alert(
        config.label,
        `Время: ${time}\nЧто сделать с этой записью?`,
        [
          { text: '✨ Спросить ИИ', onPress: () => handleAskAI(item) },
          { text: 'Удалить', onPress: () => deleteOne(item), style: 'destructive' },
          { text: 'Закрыть', style: 'cancel' }
        ]
      );
    }
  };

  const stopSmartSoothe = async () => {
    try {
      if (soothePlayerRef.current) { await soothePlayerRef.current.stopAsync(); await soothePlayerRef.current.unloadAsync(); soothePlayerRef.current = null; }
    } catch (e) { console.error(e); } finally { setIsSoothePlaying(false); }
  };

  const startSmartSoothe = async () => {
    try {
      const typeKey = selectedCry ? normalizeTypeKey(selectedCry.type) : 'Unknown';
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true });
      await stopSmartSoothe();
      const { sound } = await Audio.Sound.createAsync(pickSmartSootheUrl(typeKey), { shouldPlay: true, isLooping: true });
      soothePlayerRef.current = sound;
      setIsSoothePlaying(true);
    } catch (e: any) { Alert.alert(t('errors.soothe_failed'), e.message); }
  };

  const renderSectionHeader = ({ section }: { section: HistorySection }) => (
    <View style={styles.sectionHeaderRow}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{section.title.toUpperCase()}</Text>
      <TouchableOpacity onPress={() => Alert.alert('Удалить записи за этот день?', 'Действие необратимо.', [{ text: 'Отмена', style: 'cancel' }, { text: 'Удалить', style: 'destructive', onPress: () => deleteDay(section.key) }])}>
        <Ionicons name="trash-outline" size={18} color={theme.sub} />
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: UnifiedLogItem }) => {
    const time = new Date(item.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    const isCry = item.table === 'cries';

    let emoji, color, title, subtitle;

    if (isCry) {
      const typeKey = normalizeTypeKey(item.type);
      const config = CRY_TYPES[typeKey] || CRY_TYPES.Unknown;
      emoji = config.emoji; color = config.color; title = `AI: ${typeKey}`; subtitle = item.reasoning;
    } else {
      const config = ACTION_LOGS[item.type];
      if (!config) return null; // Скрываем неизвестные логи из интерфейса
      emoji = config.emoji; color = config.color; title = config.label; subtitle = 'Ручная отметка';
    }

    return (
      <TouchableOpacity activeOpacity={0.8} onPress={() => handleItemPress(item)} onLongPress={() => deleteOne(item)}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.emojiContainer, { backgroundColor: color + '20' }]}>
            <Text style={styles.emojiText}>{emoji}</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={[styles.typeText, { color: theme.text }]}>{title}</Text>
              <Text style={[styles.timeText, { color: theme.sub }]}>{time}</Text>
            </View>
            <Text style={[styles.reasoningText, { color: theme.sub }]} numberOfLines={2}>{subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.sub} style={{ marginLeft: 10 }} />
        </View>
      </TouchableOpacity>
    );
  };

  const selectedCryType = selectedCry ? normalizeTypeKey(selectedCry.type) : 'Unknown';
  const cryConfig = CRY_TYPES[selectedCryType] || CRY_TYPES.Unknown;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.headerSide}><Ionicons name="chevron-down" size={30} color={theme.text} /></TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Лента событий</Text>
        <TouchableOpacity onPress={promptClearHistory} disabled={history.length === 0} style={[styles.headerSide, { opacity: history.length === 0 ? 0.3 : 1 }]}>
          <Ionicons name="trash-outline" size={22} color={theme.accent} />
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections} keyExtractor={(it) => String(it.id)} renderSectionHeader={renderSectionHeader} renderItem={renderItem}
        contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchPage({ reset: true })} tintColor={theme.accent} />}
        onEndReached={loadMore} onEndReachedThreshold={0.3}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="journal-outline" size={80} color={theme.border} /><Text style={[styles.emptyText, { color: theme.sub }]}>Дневник пока пуст</Text></View>}
      />

      {selectedCry && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          <View style={styles.overlayBackdrop}>
            <LinearGradient colors={cryConfig.gradient} style={styles.modalBody}>
              <View style={styles.handle} />
              <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.largeEmoji}>{cryConfig.emoji}</Text>
                <Text style={styles.typeTitle}>{selectedCryType}</Text>
                <View style={styles.line} />
                <Text style={styles.descriptionText}>{selectedCry.reasoning}</Text>
              </ScrollView>
              
              <TouchableOpacity 
                style={styles.aiButton} 
                onPress={() => handleAskAI(selectedCry)}
                activeOpacity={0.9}
              >
                <Ionicons name="sparkles" size={20} color="#FFF" />
                <Text style={styles.aiButtonText}>Спросить ИИ о плаче</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={isSoothePlaying ? stopSmartSoothe : startSmartSoothe} style={[styles.sootheButton, isSoothePlaying ? styles.sootheButtonStop : (selectedCryType === 'Sleep' ? styles.sootheButtonProminent : null)]}>
                <Ionicons name={isSoothePlaying ? 'stop' : (selectedCryType === 'Sleep' ? 'moon' : 'musical-notes')} size={20} color={selectedCryType === 'Sleep' && !isSoothePlaying ? cryConfig.color : '#FFF'} style={{ marginRight: 10 }} />
                <Text style={[styles.sootheButtonText, selectedCryType === 'Sleep' && !isSoothePlaying ? { color: cryConfig.color } : null]}>{isSoothePlaying ? t('soothe.stop') : t('soothe.button')}</Text>
              </TouchableOpacity>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={[styles.dangerButton, { backgroundColor: theme.card }]} onPress={() => deleteOne(selectedCry)}>
                  <Text style={[styles.dangerLabel, { color: theme.accent }]}>{t('common.delete', { defaultValue: 'Удалить' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.whiteButton, { backgroundColor: theme.card }]} onPress={async () => { await stopSmartSoothe(); setSelectedCry(null); }}>
                  <Text style={[styles.buttonLabel, { color: theme.text }]}>{t('history.close', { defaultValue: 'Закрыть' })}</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      )}
    </View>
  );
}

// =====================================================================
// ОСНОВНОЙ ЭКРАН (Главная страница)
// =====================================================================
export default function DashboardScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [lastCry, setLastCry] = useState<any>(null);
  const [lastFeeding, setLastFeeding] = useState<any>(null);
  const [activeSleepRecord, setActiveSleepRecord] = useState<any>(null);
  const [sleepTimerDisplay, setSleepTimerDisplay] = useState('00:00');
  const [refreshing, setRefreshing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const sleepPulseScale = useSharedValue(1);
  const sleepPulseOpacity = useSharedValue(0.5);
  const animatedSleepPulse = useAnimatedStyle(() => ({ transform: [{ scale: sleepPulseScale.value }], opacity: sleepPulseOpacity.value }));

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);

      const { data: cries } = await supabase.from('cries').select('*').order('created_at', { ascending: false }).limit(1);
      if (cries && cries.length > 0) setLastCry(cries[0]);

      const { data: feeds } = await supabase.from('logs').select('*').eq('type', 'feeding').order('created_at', { ascending: false }).limit(1);
      if (feeds && feeds.length > 0) setLastFeeding(feeds[0]);

      const { data: sleepLogs } = await supabase.from('logs').select('*').in('type', ['sleep_start', 'sleep_wake']).order('created_at', { ascending: false }).limit(1);
      if (sleepLogs && sleepLogs.length > 0 && sleepLogs[0].type === 'sleep_start') {
        setActiveSleepRecord(sleepLogs[0]);
        sleepPulseScale.value = withRepeat(withSequence(withTiming(1.05, { duration: 1000 }), withTiming(1, { duration: 1000 })), -1, true);
        sleepPulseOpacity.value = withRepeat(withSequence(withTiming(0.8, { duration: 1000 }), withTiming(0.3, { duration: 1000 })), -1, true);
      } else {
        setActiveSleepRecord(null); setSleepTimerDisplay('00:00');
      }
    } catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSleepRecord) {
      interval = setInterval(() => { setSleepTimerDisplay(formatDuration(Date.now() - new Date(activeSleepRecord.created_at).getTime())); }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSleepRecord]);

  const quickLog = async (type: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('logs').insert({ user_id: user.id, type });
    fetchData(); 
  };

  const handleSleepToggle = async () => {
    if (activeSleepRecord) await quickLog('sleep_wake');
    else await quickLog('sleep_start');
  };

  if (loading) return <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={theme.accent} size="large" /></View>;

  const getAiInsight = () => {
    if (activeSleepRecord) return `Малыш сейчас спит (${sleepTimerDisplay}). Постарайтесь не шуметь. Я запишу это время для аналитики режима.`;
    if (lastFeeding) {
      const hours = Math.floor((Date.now() - new Date(lastFeeding.created_at).getTime()) / 3600000);
      return hours >= 2 ? `С последнего кормления прошло около ${hours} ч. Если малыш заплачет, вероятно, это голод.` : 'Режим в норме. Отмечайте события, чтобы я собирал статистику для ментора.';
    }
    return 'Начните отмечать события (кормление, сон), чтобы я мог анализировать режим малыша.';
  };

  return (
    <ScreenWrapper style={{ backgroundColor: theme.bg }}>
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={theme.accent} />}>
        
        {/* HEADER */}
        <View className="mt-6 mb-8 flex-row justify-between items-center">
          <View>
            <Text style={{ color: theme.sub, fontSize: 16 }}>Привет, {profile?.baby_name || 'Мама'}! 👋</Text>
            <Text style={{ color: theme.text, fontSize: 30, fontWeight: 'bold' }}>Baby Zen</Text>
          </View>
          <View className="flex-row gap-3">
            <TouchableOpacity onPress={() => setHistoryOpen(true)} className="w-12 h-12 rounded-full items-center justify-center border" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
              <Ionicons name="book-outline" size={24} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/settings' as any)} className="w-12 h-12 rounded-full items-center justify-center border" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
              <Ionicons name="settings-outline" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* AI INSIGHT CARD */}
        <View className="rounded-3xl p-6 mb-8 border" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
          <View className="flex-row items-center mb-3">
            <Ionicons name="sparkles" size={20} color={activeSleepRecord ? ACTION_LOGS.sleep_start.color : theme.accent} />
            <Text style={{ color: theme.sub }} className="ml-2 font-bold uppercase tracking-widest text-xs">{activeSleepRecord ? 'Сонный Инсайт' : 'AI Инсайт'}</Text>
          </View>
          <Text style={{ color: theme.text }} className="text-lg leading-6">{getAiInsight()}</Text>
        </View>

        {/* QUICK ACTIONS */}
        <View className="flex-row justify-between mb-10">
          <ActionButton icon="restaurant" label="Покормил" color={ACTION_LOGS.feeding.color} theme={theme} onPress={() => quickLog('feeding')} />
          
          <TouchableOpacity onPress={handleSleepToggle} className="items-center">
            {activeSleepRecord ? (
              <View className="items-center">
                <View className="w-16 h-16 rounded-2xl items-center justify-center mb-2 border" style={{ backgroundColor: `${ACTION_LOGS.sleep_wake.color}20`, borderColor: theme.border }}>
                  <Animated.View style={[{ position: 'absolute', width: 64, height: 64, borderRadius: 16, backgroundColor: ACTION_LOGS.sleep_start.color }, animatedSleepPulse]} />
                  <Ionicons name="sunny" size={28} color={ACTION_LOGS.sleep_wake.color} />
                </View>
                <Text style={{ color: theme.text }} className="text-xs font-bold">{sleepTimerDisplay}</Text>
                <Text style={{ color: theme.sub }} className="text-[10px] font-medium uppercase mt-1">Проснулся</Text>
              </View>
            ) : (
              <View className="items-center">
                <View className="w-16 h-16 rounded-2xl items-center justify-center mb-2 border" style={{ backgroundColor: `${ACTION_LOGS.sleep_start.color}15`, borderColor: theme.border }}>
                  <Ionicons name="moon" size={28} color={ACTION_LOGS.sleep_start.color} />
                </View>
                <Text style={{ color: theme.sub }} className="text-xs font-medium">Уложил</Text>
              </View>
            )}
          </TouchableOpacity>

          <ActionButton icon="water" label="Сменил" color={ACTION_LOGS.diaper.color} theme={theme} onPress={() => quickLog('diaper')} />
        </View>

        {/* MAIN RECORD BUTTON */}
        <View className="items-center mb-10">
          <TouchableOpacity onPress={() => router.push('/(tabs)/record')} activeOpacity={0.8} className="w-48 h-48 rounded-full items-center justify-center border-[2px]" style={{ backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 }}>
            <View style={{ backgroundColor: theme.accent }} className="w-40 h-40 rounded-full items-center justify-center shadow-lg"><Ionicons name="mic" size={60} color="#FFF" /></View>
          </TouchableOpacity>
          <Text style={{ color: theme.text }} className="mt-4 font-bold text-lg">Понять плач</Text>
        </View>
      </ScrollView>

      {/* МОДАЛКА ЛЕНТЫ СОБЫТИЙ */}
      <Modal visible={historyOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setHistoryOpen(false)}>
        <HistoryModalContent onClose={() => { setHistoryOpen(false); fetchData(); }} />
      </Modal>
    </ScreenWrapper>
  );
}

// Вспомогательный компонент кнопки
function ActionButton({ icon, label, color, theme, onPress }: any) {
  return (
    <TouchableOpacity onPress={onPress} className="items-center">
      <View className="w-16 h-16 rounded-2xl items-center justify-center mb-2 border" style={{ backgroundColor: `${color}15`, borderColor: theme.border }}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <Text style={{ color: theme.sub }} className="text-xs font-medium">{label}</Text>
    </TouchableOpacity>
  );
}

// =====================================================================
// ИСПРАВЛЕННЫЕ СТИЛИ
// =====================================================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 25, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSide: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 22, fontWeight: '900' },
  sectionHeaderRow: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 13, fontWeight: '800', opacity: 0.6, letterSpacing: 1 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { flexDirection: 'row', borderRadius: 24, padding: 18, marginBottom: 14, alignItems: 'center', borderWidth: 1 },
  emojiContainer: { width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  emojiText: { fontSize: 26 },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  typeText: { fontSize: 17, fontWeight: '800' },
  timeText: { fontSize: 12, fontWeight: '600' },
  reasoningText: { fontSize: 14, lineHeight: 20 },
  empty: { marginTop: 120, alignItems: 'center' },
  emptyText: { marginTop: 20, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  overlayBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.85)' },
  modalBody: { borderTopLeftRadius: 50, borderTopRightRadius: 50, paddingTop: 20, paddingHorizontal: 30, paddingBottom: 40, alignItems: 'center', maxHeight: height * 0.85 },
  handle: { width: 50, height: 5, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 10, marginBottom: 20 },
  scrollContent: { alignItems: 'center', paddingBottom: 20 },
  largeEmoji: { fontSize: 80, marginBottom: 10 },
  typeTitle: { fontSize: 32, fontWeight: '900', color: '#FFF', textAlign: 'center' },
  line: { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 20 },
  descriptionText: { fontSize: 18, color: '#FFF', textAlign: 'center', lineHeight: 26 },
  
  // Кнопки взаимодействия
  aiButton: { width: '100%', paddingVertical: 16, borderRadius: 22, backgroundColor: '#007AFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: '#007AFF', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  aiButtonText: { color: '#FFF', fontSize: 16, fontWeight: '900', marginLeft: 8 },
  sootheButton: { width: '100%', paddingVertical: 16, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', marginTop: 10 },
  sootheButtonProminent: { backgroundColor: '#FFF' },
  sootheButtonStop: { backgroundColor: 'rgba(0,0,0,0.3)' },
  sootheButtonText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  buttonRow: { width: '100%', marginTop: 15, flexDirection: 'row', gap: 12 },
  dangerButton: { flex: 1, paddingVertical: 18, borderRadius: 22, justifyContent: 'center' },
  dangerLabel: { fontSize: 16, fontWeight: '900', textAlign: 'center' },
  whiteButton: { flex: 1, paddingVertical: 18, borderRadius: 22, justifyContent: 'center' },
  buttonLabel: { fontSize: 16, fontWeight: '900', textAlign: 'center' },
});