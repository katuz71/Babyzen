import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

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
  SectionList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
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

const PAGE_SIZE = 30;

const CRY_TYPES: Record<string, { emoji: string; color: string; gradient: [string, string, ...string[]] }> = {
  Hunger: { emoji: '🍼', color: '#FF9500', gradient: ['#FF9500', '#FF5E00'] },
  Burp: { emoji: '☁️', color: '#34C759', gradient: ['#34C759', '#1D9444'] },
  Sleep: { emoji: '😴', color: '#5856D6', gradient: ['#5856D6', '#322F91'] },
  Discomfort: { emoji: '🧷', color: '#FF3B30', gradient: ['#FF3B30', '#B01F18'] },
  Gas: { emoji: '💨', color: '#AF52DE', gradient: ['#AF52DE', '#732B9C'] },
  Unknown: { emoji: '❓', color: '#8E8E93', gradient: ['#3A3A3C', '#1C1C1E'] },
};

type HistorySection = {
  title: string;
  key: string; // YYYY-MM-DD
  data: CryHistoryItem[];
};

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isToday(d: Date) {
  return isSameDay(d, new Date());
}

function isYesterday(d: Date) {
  const y = startOfDay(new Date());
  y.setDate(y.getDate() - 1);
  return isSameDay(d, y);
}

function normalizeTypeKey(rawType: any) {
  if (!rawType || typeof rawType !== 'string') return 'Unknown';
  return rawType.charAt(0).toUpperCase() + rawType.slice(1);
}

function safeLocale(lang?: string) {
  const l = (lang || 'en').toLowerCase();
  if (l.startsWith('ru')) return 'ru-RU';
  if (l.startsWith('es')) return 'es-ES';
  return 'en-US';
}

export default function ExploreScreen() {
  const { t, i18n } = useTranslation();
  const locale = useMemo(() => safeLocale(i18n.language), [i18n.language]);

  const [history, setHistory] = useState<CryHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [selectedItem, setSelectedItem] = useState<CryHistoryItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const soothePlayerRef = useRef<Audio.Sound | null>(null);
  const [isSoothePlaying, setIsSoothePlaying] = useState(false);

  // Guards to avoid duplicated fetches (onEndReached can fire multiple times)
  const endReachedLockRef = useRef(false);

  const buildSections = useCallback(
    (items: CryHistoryItem[]): HistorySection[] => {
      const map = new Map<string, CryHistoryItem[]>();

      for (const item of items) {
        const d = new Date(item.created_at);
        const key = dayKey(d);
        const arr = map.get(key) || [];
        arr.push(item);
        map.set(key, arr);
      }

      const keys = Array.from(map.keys()).sort((a, b) => (a < b ? 1 : -1)); // desc
      return keys.map(k => {
        const arr = (map.get(k) || []).slice().sort((a, b) => {
          const ta = new Date(a.created_at).getTime();
          const tb = new Date(b.created_at).getTime();
          return tb - ta;
        });

        const d = new Date(arr[0]?.created_at || `${k}T00:00:00`);
        let title = '';
        if (isToday(d)) title = t('history.today', { defaultValue: 'Сегодня' });
        else if (isYesterday(d)) title = t('history.yesterday', { defaultValue: 'Вчера' });
        else title = d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });

        return { title, key: k, data: arr };
      });
    },
    [locale, t]
  );

  const sections: HistorySection[] = useMemo(() => {
    const s = buildSections(history);
    console.log('History sections:', s.length);
    return s;
  }, [history, buildSections]);

  const fetchPage = async (opts: { reset: boolean }) => {
    const { reset } = opts;

    if (reset) {
      setLoading(true);
      setHasMore(true);
      endReachedLockRef.current = false;
    } else {
      if (loadingMore || loading || !hasMore) return;
      setLoadingMore(true);
    }

    try {
      const offset = reset ? 0 : history.length;
      console.log('Fetch page:', { reset, offset, limit: PAGE_SIZE });

      const { data, error } = await supabase
        .from('cries')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.error('Ошибка загрузки:', error.message);
        Alert.alert(t('common.error', { defaultValue: 'Ошибка' }), error.message);
        return;
      }

      const page = (data as CryHistoryItem[]) || [];

      if (reset) {
        setHistory(page);
      } else {
        // merge with de-dup by id (safety)
        setHistory(prev => {
          const seen = new Set(prev.map(x => x.id));
          const merged = prev.slice();
          for (const it of page) {
            if (!seen.has(it.id)) merged.push(it);
          }
          return merged;
        });
      }

      if (page.length < PAGE_SIZE) setHasMore(false);

      console.log('Fetched:', page.length, 'hasMore:', page.length >= PAGE_SIZE);
    } finally {
      if (reset) setLoading(false);
      else setLoadingMore(false);
    }
  };

  const fetchHistoryReset = async () => {
    await fetchPage({ reset: true });
  };

  const loadMore = async () => {
    if (endReachedLockRef.current) return;
    endReachedLockRef.current = true;

    await fetchPage({ reset: false });

    setTimeout(() => {
      endReachedLockRef.current = false;
    }, 350);
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
      const typeKey = selectedItem ? normalizeTypeKey(selectedItem.type) : 'Unknown';
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

  const closeModal = async () => {
    await stopSmartSoothe();
    setModalVisible(false);
    setSelectedItem(null);
  };

  const deleteOne = async (item: CryHistoryItem) => {
    try {
      console.log('Delete single:', item.id);

      setHistory(prev => prev.filter(x => x.id !== item.id));
      if (selectedItem?.id === item.id) {
        await closeModal();
      }

      const { error } = await supabase.from('cries').delete().eq('id', item.id);
      if (error) {
        console.error('Delete error:', error.message);
        Alert.alert(t('common.error', { defaultValue: 'Ошибка' }), error.message);
        fetchHistoryReset();
      }
    } catch (e: any) {
      console.error('Delete single exception:', e);
      Alert.alert(t('common.error', { defaultValue: 'Ошибка' }), e?.message || String(e));
      fetchHistoryReset();
    }
  };

  const confirmDeleteOne = (item: CryHistoryItem) => {
    Alert.alert(
      t('history.delete_one_title', { defaultValue: 'Удалить запись?' }),
      t('history.delete_one_body', { defaultValue: 'Это действие необратимо.' }),
      [
        { text: t('common.cancel', { defaultValue: 'Отмена' }), style: 'cancel' },
        {
          text: t('common.delete', { defaultValue: 'Удалить' }),
          style: 'destructive',
          onPress: () => deleteOne(item),
        },
      ]
    );
  };

  const deleteAll = async () => {
    try {
      const count = history.length;
      console.log('Delete ALL (local count):', count);

      await closeModal();
      setHistory([]);
      setHasMore(false);

      const { error } = await supabase.from('cries').delete().gt('id', 0);
      if (error) {
        console.error('Delete all error:', error.message);
        Alert.alert(t('common.error', { defaultValue: 'Ошибка' }), error.message);
        setHasMore(true);
        fetchHistoryReset();
      }
    } catch (e: any) {
      console.error('Delete all exception:', e);
      Alert.alert(t('common.error', { defaultValue: 'Ошибка' }), e?.message || String(e));
      setHasMore(true);
      fetchHistoryReset();
    }
  };

  const confirmDeleteAll = () => {
    const count = history.length;
    if (count === 0) return;

    Alert.alert(
      t('history.delete_all_title', { defaultValue: 'Удалить все записи?' }),
      t('history.delete_all_body', { defaultValue: `Будет удалено записей: ${count}. Это действие необратимо.` }),
      [
        { text: t('common.cancel', { defaultValue: 'Отмена' }), style: 'cancel' },
        { text: t('common.delete', { defaultValue: 'Удалить' }), style: 'destructive', onPress: deleteAll },
      ]
    );
  };

  // Delete by day (section key YYYY-MM-DD)
  const deleteDay = async (sectionKey: string) => {
    try {
      console.log('Delete DAY:', sectionKey);

      // Optimistic UI
      setHistory(prev =>
        prev.filter(it => {
          const k = dayKey(new Date(it.created_at));
          return k !== sectionKey;
        })
      );

      // DB delete by timestamp range (UTC)
      const fromISO = `${sectionKey}T00:00:00.000Z`;
      const toISO = `${sectionKey}T23:59:59.999Z`;

      const { error } = await supabase.from('cries').delete().gte('created_at', fromISO).lte('created_at', toISO);

      if (error) {
        console.error('Delete day error:', error.message);
        Alert.alert(t('common.error', { defaultValue: 'Ошибка' }), error.message);
        fetchHistoryReset();
      }
    } catch (e: any) {
      console.error('Delete day exception:', e);
      Alert.alert(t('common.error', { defaultValue: 'Ошибка' }), e?.message || String(e));
      fetchHistoryReset();
    }
  };

  const confirmDeleteDay = (sectionKey: string, title: string) => {
    Alert.alert(
      t('history.delete_day_title', { defaultValue: 'Удалить записи за день?' }),
      t('history.delete_day_body', { defaultValue: `День: ${title}. Это действие необратимо.` }),
      [
        { text: t('common.cancel', { defaultValue: 'Отмена' }), style: 'cancel' },
        {
          text: t('common.delete', { defaultValue: 'Удалить' }),
          style: 'destructive',
          onPress: () => deleteDay(sectionKey),
        },
      ]
    );
  };

  useFocusEffect(
    useCallback(() => {
      fetchHistoryReset();
      return () => {
        stopSmartSoothe();
        setModalVisible(false);
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

  const renderSectionHeader = ({ section }: { section: HistorySection }) => (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>{section.title}</Text>

      <TouchableOpacity
        onPress={() => confirmDeleteDay(section.key, section.title)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={{ opacity: 0.9 }}
      >
        <Ionicons name="trash-outline" size={18} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: CryHistoryItem }) => {
    const typeKey = normalizeTypeKey(item.type);
    const config = CRY_TYPES[typeKey] || CRY_TYPES.Unknown;

    const dateObj = new Date(item.created_at);
    const time = dateObj.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          setSelectedItem(item);
          setModalVisible(true);
        }}
        onLongPress={() => confirmDeleteOne(item)}
      >
        <View style={styles.card}>
          <View style={[styles.emojiContainer, { backgroundColor: config.color + '20' }]}>
            <Text style={styles.emojiText}>{config.emoji}</Text>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.typeText}>{typeKey}</Text>
              <Text style={styles.timeText}>{time}</Text>
            </View>

            <Text style={styles.reasoningText} numberOfLines={2}>
              {item.reasoning}
            </Text>
          </View>

          <View style={styles.cardAction}>
            <Ionicons name="chevron-forward" size={18} color="#3A3A3C" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const selectedTypeKey = selectedItem ? normalizeTypeKey(selectedItem.type) : 'Unknown';
  const selectedConfig = CRY_TYPES[selectedTypeKey] || CRY_TYPES.Unknown;
  const isSleepType = selectedTypeKey === 'Sleep';
  const confidencePct =
    selectedItem?.confidence && typeof selectedItem.confidence === 'number'
      ? Math.round(selectedItem.confidence * 100)
      : null;

  const footer = useMemo(() => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator color="#FFF" />
        </View>
      );
    }
    if (!hasMore && history.length > 0) {
      return (
        <View style={styles.footerDone}>
          <Text style={styles.footerDoneText}>{t('history.end', { defaultValue: 'Конец истории' })}</Text>
        </View>
      );
    }
    return <View style={{ height: 18 }} />;
  }, [loadingMore, hasMore, history.length, t]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#000', '#121212', '#1A1A1A']} style={StyleSheet.absoluteFill} />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerSide} />

        <Text style={styles.title} numberOfLines={1}>
          {t('history.title') || 'Дневник'}
        </Text>

        <View style={styles.headerSide}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <TouchableOpacity
              onPress={confirmDeleteAll}
              disabled={history.length === 0}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ opacity: history.length === 0 ? 0.35 : 1 }}
            >
              <Ionicons name="trash-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item: CryHistoryItem) => String(item.id)}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchHistoryReset} tintColor="#FFF" />}
        stickySectionHeadersEnabled={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={footer}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="journal-outline" size={80} color="#2C2C2E" />
            <Text style={styles.emptyText}>{t('history.empty')}</Text>
          </View>
        }
      />

      {/* MODAL */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
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

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.dangerButton}
                onPress={() => selectedItem && confirmDeleteOne(selectedItem)}
              >
                <Text style={styles.dangerLabel}>{t('common.delete', { defaultValue: 'Удалить' })}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.whiteButton} onPress={closeModal}>
                <Text style={[styles.buttonLabel, { color: selectedConfig.color }]}>
                  {t('history.close', { defaultValue: 'Закрыть' })}
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingTop: 60,
    paddingHorizontal: 25,
    paddingBottom: 14,
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

  sectionHeaderRow: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#FFF',
    opacity: 0.7,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.2,
  },

  list: { paddingHorizontal: 20, paddingBottom: 40 },

  card: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
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

  cardAction: { marginLeft: 10, opacity: 0.65 },

  empty: { marginTop: 120, alignItems: 'center' },
  emptyText: {
    color: '#444',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
  },

  footerLoader: { paddingVertical: 16, alignItems: 'center' },
  footerDone: { paddingVertical: 14, alignItems: 'center' },
  footerDoneText: { color: '#666', fontSize: 13, fontWeight: '700' },

  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.85)' },
  modalBody: {
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    paddingTop: 20,
    paddingHorizontal: 30,
    paddingBottom: 30,
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
  scrollContent: { alignItems: 'center', paddingBottom: 16 },
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

  sootheContainer: { width: '100%', marginTop: 10 },
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
  sootheButtonStop: { backgroundColor: 'rgba(0,0,0,0.22)', borderColor: 'rgba(255,255,255,0.22)', shadowOpacity: 0 },
  sootheButtonText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.4 },

  buttonRow: {
    width: '100%',
    marginTop: 16,
    flexDirection: 'row',
    gap: 12,
  },
  dangerButton: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  dangerLabel: {
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
    color: '#FFF',
    opacity: 0.9,
  },

  whiteButton: { flex: 1, paddingVertical: 20, borderRadius: 25, backgroundColor: '#FFF' },
  buttonLabel: { fontSize: 19, fontWeight: '900', textAlign: 'center' },
});
