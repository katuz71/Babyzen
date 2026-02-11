import React, { useEffect, useRef, useState, useCallback } from 'react';

interface CryHistoryItem {
  id: number;
  type: string;
  created_at: string;
  reasoning?: string;
  confidence?: number;
}

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';

import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { pickSmartSootheUrl } from '@/lib/smartSoothe';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

const { height } = Dimensions.get('window');

const CRY_TYPES: Record<
  string,
  { emoji: string; color: string; gradient: [string, string, ...string[]] }
> = {
  Hunger: { emoji: '🍼', color: '#FF9500', gradient: ['#FF9500', '#FF5E00'] },
  Burp: { emoji: '☁️', color: '#34C759', gradient: ['#34C759', '#1D9444'] },
  Sleep: { emoji: '😴', color: '#5856D6', gradient: ['#5856D6', '#322F91'] },
  Discomfort: { emoji: '🧷', color: '#FF3B30', gradient: ['#FF3B30', '#B01F18'] },
  Gas: { emoji: '💨', color: '#AF52DE', gradient: ['#AF52DE', '#732B9C'] },
  Unknown: { emoji: '❓', color: '#8E8E93', gradient: ['#3A3A3C', '#1C1C1E'] },
};

export default function HistoryScreen() {
  const { t } = useTranslation();
  const [history, setHistory] = useState<CryHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CryHistoryItem | null>(null);

  const soothePlayerRef = useRef<Audio.Sound | null>(null);
  const [isSoothePlaying, setIsSoothePlaying] = useState(false);

  const getTypeKey = (rawType: any) => {
    if (!rawType || typeof rawType !== 'string') return 'Unknown';
    return rawType.charAt(0).toUpperCase() + rawType.slice(1);
  };

  const fetchHistory = async () => {
    setLoading(true);
    console.log('Запрашиваю историю из Supabase...');

    const { data, error } = await supabase
      .from('cries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка загрузки:', error.message);
    } else {
      console.log('Получено записей:', data?.length);
      setHistory((data as any) || []);
    }
    setLoading(false);
  };

  const stopSmartSoothe = async () => {
    try {
      if (soothePlayerRef.current) {
        await soothePlayerRef.current.stopAsync();
        await soothePlayerRef.current.unloadAsync();
        soothePlayerRef.current = null;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSoothePlaying(false);
    }
  };

  const startSmartSoothe = async () => {
    try {
      const typeKey = selectedItem ? getTypeKey(selectedItem.type) : 'Unknown';
      const source = pickSmartSootheUrl(typeKey);

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      await stopSmartSoothe();

      const { sound } = await Audio.Sound.createAsync(source, {
        shouldPlay: true,
        isLooping: true,
        volume: 1.0,
      });

      await sound.setVolumeAsync(1.0);

      console.log('SmartSoothe: звук запущен');
      soothePlayerRef.current = sound;
      setIsSoothePlaying(true);
    } catch (e) {
      console.error(e);
      Alert.alert(t('errors.soothe_failed'), (e as Error).message);
    }
  };

  const closeSheet = async () => {
    await stopSmartSoothe();
    setSelectedItem(null);
  };

  // Этот хук срабатывает КАЖДЫЙ РАЗ, когда ты заходишь на вкладку
  useFocusEffect(
    useCallback(() => {
      fetchHistory();
      return () => {
        // Уходим с экрана/вкладки — глушим звук и закрываем sheet.
        stopSmartSoothe();
        setSelectedItem(null);
      };
    }, [])
  );

  useEffect(() => {
    return () => {
      try {
        soothePlayerRef.current?.stopAsync();
        soothePlayerRef.current?.unloadAsync();
      } catch (e) {
        console.error(e);
      } finally {
        soothePlayerRef.current = null;
      }
    };
  }, []);

  const renderItem = ({ item }: { item: CryHistoryItem }) => {
    const typeKey = getTypeKey(item.type);
    const config = CRY_TYPES[typeKey] || CRY_TYPES['Unknown'];

    const dateObj = new Date(item.created_at);
    const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = dateObj.toLocaleDateString([], { day: 'numeric', month: 'short' });

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          setSelectedItem(item);
        }}
      >
        <View style={styles.card}>
          <View style={[styles.emojiContainer, { backgroundColor: config.color + '20' }]}>
            <Text style={styles.emojiText}>{config.emoji}</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.typeText}>{typeKey}</Text>
              <Text style={styles.timeText}>
                {time} · {date}
              </Text>
            </View>
            <Text style={styles.reasoningText} numberOfLines={2}>
              {item.reasoning}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const selectedTypeKey = selectedItem ? getTypeKey(selectedItem.type) : 'Unknown';
  const selectedConfig = CRY_TYPES[selectedTypeKey] || CRY_TYPES['Unknown'];
  const isSleepType = selectedTypeKey === 'Sleep';

  const confidencePct =
    selectedItem?.confidence && typeof selectedItem.confidence === 'number'
      ? Math.round(selectedItem.confidence * 100)
      : null;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#000', '#121212', '#1A1A1A']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <View style={styles.headerSide} />

        <Text style={styles.title} numberOfLines={1}>
          {t('history.title') || 'Дневник'}
        </Text>

        <View style={styles.headerSide}>{loading && <ActivityIndicator color="#FFF" />}</View>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item: CryHistoryItem) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchHistory} tintColor="#FFF" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="journal-outline" size={80} color="#2C2C2E" />
            <Text style={styles.emptyText}>{t('history.empty')}</Text>
          </View>
        }
      />

      {/* OVERLAY SHEET (replaces RN Modal) */}
      {selectedItem && (
        <View style={styles.overlay} pointerEvents="auto">
          {/* tap outside to close */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={closeSheet}
            style={StyleSheet.absoluteFillObject}
          />

          {/* sheet container */}
          <View style={styles.sheet} pointerEvents="box-none">
            <LinearGradient colors={selectedConfig.gradient} style={styles.modalBody}>
              <View style={styles.handle} />

              <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.largeEmoji}>{selectedConfig.emoji}</Text>
                <Text style={styles.typeTitle}>{selectedTypeKey}</Text>

                {confidencePct !== null && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {t('record.modal.confidence')}: {confidencePct}%
                    </Text>
                  </View>
                )}

                <View style={styles.line} />
                <Text style={styles.descriptionText}>{selectedItem?.reasoning}</Text>
              </ScrollView>

              <View style={styles.sootheContainer}>
                <TouchableOpacity
                  onPress={isSoothePlaying ? stopSmartSoothe : startSmartSoothe}
                  activeOpacity={0.9}
                  style={[
                    styles.sootheButton,
                    isSoothePlaying ? styles.sootheButtonStop : null,
                    isSleepType && !isSoothePlaying ? styles.sootheButtonProminent : null,
                  ]}
                >
                  <Ionicons
                    name={isSoothePlaying ? 'stop' : isSleepType ? 'moon' : 'musical-notes'}
                    size={20}
                    color={isSleepType && !isSoothePlaying ? selectedConfig.color : '#FFF'}
                    style={{ marginRight: 10 }}
                  />
                  <Text
                    style={[
                      styles.sootheButtonText,
                      isSleepType && !isSoothePlaying ? { color: selectedConfig.color } : null,
                    ]}
                  >
                    {isSoothePlaying ? t('soothe.stop') : t('soothe.button')}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.whiteButton} onPress={closeSheet}>
                  <Text style={[styles.buttonLabel, { color: selectedConfig.color }]}>
                    {t('history.close')}
                  </Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingTop: 60,
    paddingHorizontal: 25,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSide: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 36,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -1,
  },

  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  emojiContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  emojiText: { fontSize: 32 },
  cardContent: { flex: 1 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeText: { color: '#FFF', fontSize: 19, fontWeight: '800' },
  timeText: { color: '#666', fontSize: 13, fontWeight: '600' },
  reasoningText: { color: '#A0A0A0', fontSize: 15, lineHeight: 22 },
  empty: { marginTop: 120, alignItems: 'center' },
  emptyText: {
    color: '#444',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
  },

  // Overlay replacement for RN Modal
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 9999,
    elevation: 9999,
  },
  sheet: {
    width: '100%',
  },

  modalBody: {
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    paddingTop: 20,
    paddingHorizontal: 30,
    paddingBottom: 40,
    alignItems: 'center',
    maxHeight: height * 0.85,
    width: '100%',
  },
  handle: {
    width: 50,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    marginBottom: 20,
  },
  scrollContent: { alignItems: 'center', paddingBottom: 20 },
  largeEmoji: { fontSize: 100 },
  typeTitle: { fontSize: 40, fontWeight: '900', color: '#FFF', textAlign: 'center' },
  badge: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
    marginVertical: 15,
  },
  badgeText: { color: '#FFF', fontWeight: '700' },
  line: { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 25 },
  descriptionText: { fontSize: 20, color: '#FFF', textAlign: 'center', lineHeight: 30 },

  sootheContainer: { width: '100%', marginTop: 16 },
  sootheButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  sootheButtonProminent: {
    backgroundColor: '#FFF',
    borderColor: 'rgba(255,255,255,0.55)',
    paddingVertical: 18,
    shadowOpacity: 0.28,
    elevation: 4,
  },
  sootheButtonStop: {
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderColor: 'rgba(255,255,255,0.22)',
    shadowOpacity: 0,
  },
  sootheButtonText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.4 },

  buttonContainer: { width: '100%', marginTop: 20 },
  whiteButton: { width: '100%', paddingVertical: 20, borderRadius: 25, backgroundColor: '#FFF' },
  buttonLabel: { fontSize: 19, fontWeight: '900', textAlign: 'center' },
});
