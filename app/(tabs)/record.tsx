import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Alert,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { ThemedText } from '@/components/ThemedText';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { pickSmartSootheUrl } from '@/lib/smartSoothe';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const CRY_TYPES: Record<
  string,
  { emoji: string; color: string; label_key: string; gradient: [string, string, ...string[]] }
> = {
  Hunger: { emoji: '🍼', color: '#FF9500', label_key: 'cry_types.hunger', gradient: ['#FF9500', '#FF5E00'] },
  Burp: { emoji: '☁️', color: '#34C759', label_key: 'cry_types.burp', gradient: ['#34C759', '#1D9444'] },
  Sleep: { emoji: '😴', color: '#5856D6', label_key: 'cry_types.sleep', gradient: ['#5856D6', '#322F91'] },
  Discomfort: { emoji: '🧷', color: '#FF3B30', label_key: 'cry_types.discomfort', gradient: ['#FF3B30', '#B01F18'] },
  Gas: { emoji: '💨', color: '#AF52DE', label_key: 'cry_types.gas', gradient: ['#AF52DE', '#732B9C'] },
  Unknown: { emoji: '❓', color: '#8E8E93', label_key: 'cry_types.unknown', gradient: ['#3A3A3C', '#1C1C1E'] },
};

function normalizeTypeKey(rawType: any): string {
  if (!rawType || typeof rawType !== 'string') return 'Unknown';
  return rawType.charAt(0).toUpperCase() + rawType.slice(1);
}

// --- Result Sheet Content (SmartSoothe PRELOAD) ---
const ResultSheet = ({ data, onClose }: { data: any; onClose: () => void }) => {
  const { t } = useTranslation();

  const soothePlayerRef = useRef<Audio.Sound | null>(null);
  const [isSoothePlaying, setIsSoothePlaying] = useState(false);
  const [sootheReady, setSootheReady] = useState(false);
  const [sootheBusy, setSootheBusy] = useState(false);

  const typeKey = normalizeTypeKey(data?.detected_type);
  const currentType = CRY_TYPES[typeKey] || CRY_TYPES.Unknown;
  const isSleepType = typeKey === 'Sleep';

  const unloadSoothe = async () => {
    try {
      if (soothePlayerRef.current) {
        try {
          await soothePlayerRef.current.stopAsync();
        } catch { }
        await soothePlayerRef.current.unloadAsync();
        soothePlayerRef.current = null;
      }
    } catch (e) {
      console.error('unloadSoothe error:', e);
    } finally {
      setIsSoothePlaying(false);
      setSootheReady(false);
      setSootheBusy(false);
    }
  };

  // PRELOAD when sheet appears (or when detected_type changes)
  useEffect(() => {
    let mounted = true;

    const preload = async () => {
      setSootheReady(false);
      setIsSoothePlaying(false);
      try {
        // unload previous if any
        if (soothePlayerRef.current) {
          await unloadSoothe();
        }

        const source = pickSmartSootheUrl(data?.detected_type);

        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });

        const { sound } = await Audio.Sound.createAsync(source, {
          shouldPlay: false,
          isLooping: true,
          volume: 1.0,
        });

        await sound.setVolumeAsync(1.0);

        if (!mounted) {
          await sound.unloadAsync();
          return;
        }

        soothePlayerRef.current = sound;
        setSootheReady(true);
      } catch (e) {
        console.error('SmartSoothe preload error:', e);
        if (mounted) {
          setSootheReady(false);
          setIsSoothePlaying(false);
        }
      }
    };

    preload();

    return () => {
      mounted = false;
      // on unmount, unload (safe)
      unloadSoothe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.detected_type]);

  const toggleSoothe = async () => {
    if (sootheBusy) return;
    if (!soothePlayerRef.current) {
      Alert.alert(t('errors.soothe_failed'), t('errors.soothe_failed', { defaultValue: 'Audio not ready' }));
      return;
    }

    setSootheBusy(true);
    try {
      if (isSoothePlaying) {
        // Pause is faster than stop/unload; keeps buffer warm
        await soothePlayerRef.current.pauseAsync();
        setIsSoothePlaying(false);
      } else {
        await soothePlayerRef.current.playAsync();
        setIsSoothePlaying(true);
      }
    } catch (e) {
      console.error('toggleSoothe error:', e);
      // fallback: reset state
      setIsSoothePlaying(false);
      Alert.alert(t('errors.soothe_failed'), (e as Error).message);
    } finally {
      setSootheBusy(false);
    }
  };

  const close = async () => {
    await unloadSoothe();
    onClose();
  };

  return (
    <LinearGradient colors={currentType.gradient} style={styles.modalBody}>
      <View style={styles.handle} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.largeEmoji}>{currentType.emoji}</Text>

        <Text style={styles.typeTitle}>
          {t(currentType.label_key, { defaultValue: data?.detected_type })}
        </Text>

        {typeof data?.confidence === 'number' && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {t('record.modal.confidence')}: {(data.confidence * 100).toFixed(0)}%
            </Text>
          </View>
        )}

        <View style={styles.line} />
        <Text style={styles.descriptionText}>{data?.reasoning}</Text>
      </ScrollView>

      <View style={styles.sootheContainer}>
        <TouchableOpacity
          onPress={toggleSoothe}
          disabled={!sootheReady || sootheBusy}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.9}
          style={[
            styles.sootheButton,
            isSoothePlaying ? styles.sootheButtonStop : null,
            isSleepType && !isSoothePlaying ? styles.sootheButtonProminent : null,
            (!sootheReady || sootheBusy) ? { opacity: 0.75 } : null,
          ]}
        >
          <Ionicons
            name={
              !sootheReady ? 'hourglass' : isSoothePlaying ? 'stop' : (isSleepType ? 'moon' : 'musical-notes')
            }
            size={20}
            color={isSleepType && !isSoothePlaying && sootheReady ? currentType.color : '#FFF'}
            style={{ marginRight: 10 }}
          />
          <Text
            style={[
              styles.sootheButtonText,
              isSleepType && !isSoothePlaying && sootheReady ? { color: currentType.color } : null,
            ]}
          >
            {!sootheReady
              ? t('soothe.starting', { defaultValue: 'Загружаю...' })
              : isSoothePlaying
                ? t('soothe.stop')
                : t('soothe.button')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.whiteButton} onPress={close}>
          <Text style={[styles.buttonLabel, { color: currentType.color }]}>
            {t('record.modal.understand')}
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

// --- Main Screen ---
function RecordScreen() {
  const { t, i18n } = useTranslation();
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    if (isRecording) {
      scale.value = withRepeat(
        withSequence(withTiming(1.2, { duration: 500 }), withTiming(1, { duration: 500 })),
        -1,
        true
      );
      opacity.value = withRepeat(
        withSequence(withTiming(0.6, { duration: 500 }), withTiming(0.2, { duration: 500 })),
        -1,
        true
      );
    } else if (isAnalyzing) {
      scale.value = withRepeat(withTiming(0.95, { duration: 300 }), -1, true);
      opacity.value = withRepeat(withTiming(0.5, { duration: 300 }), -1, true);
    } else {
      scale.value = withRepeat(
        withSequence(withTiming(1.05, { duration: 2500 }), withTiming(1, { duration: 2500 })),
        -1,
        true
      );
      opacity.value = withTiming(0.2, { duration: 1000 });
    }
  }, [isRecording, isAnalyzing, opacity, scale]);

  const animatedGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePress = useCallback(async () => {
    if (isAnalyzing) return;

    if (isRecording) {
      console.log('Stopping recording...');
      const uri = await stopRecording();
      console.log('STOP uri:', uri);

      if (!uri) {
        Alert.alert(t('common.error'), 'Recording failed: No file generated');
        return;
      }

      setIsAnalyzing(true);

      try {
        const validUri = uri.startsWith('file://') ? uri : `file://${uri}`;
        const fileType = Platform.OS === 'android' ? 'audio/mp4' : 'audio/m4a';

        const formData = new FormData();
        formData.append('file', { uri: validUri, name: 'cry.m4a', type: fileType } as any);
        formData.append('language', i18n.language || 'en');

        console.log('Invoking analyze-cry...');
        const res = await supabase.functions.invoke('analyze-cry', { body: formData });
        console.log('Invoke raw:', JSON.stringify(res));

        if (res.error) throw res.error;
        if (!res.data) throw new Error('Supabase function returned null data');

        const payload = (res.data as any)?.data ?? res.data;
        console.log('Payload normalized:', JSON.stringify(payload));

        if (!payload?.detected_type) {
          throw new Error('Invalid payload: missing detected_type');
        }

        const { error: dbError } = await supabase.from('cries').insert([
          { type: payload.detected_type, confidence: payload.confidence, reasoning: payload.reasoning },
        ]);
        if (dbError) console.error('DB Save Error:', dbError);

        console.log('STATE SET CALLED');
        setAnalysisResult(payload);
      } catch (e: any) {
        console.error('Analysis error:', e);
        Alert.alert(t('errors.analysis_failed'), e.message || String(e));
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      await startRecording();
    }
  }, [isAnalyzing, isRecording, stopRecording, startRecording, i18n.language, t]);

  const closeSheet = useCallback(() => {
    setAnalysisResult(null);
  }, []);

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#000', '#121212', '#1A1A1A']} style={StyleSheet.absoluteFill} />

      <ScreenWrapper style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <ThemedText variant="h1" style={styles.title}>
              {String(t('app.name', { defaultValue: 'Baby Zen' })).replace('BabyZen', 'Baby Zen')}
            </ThemedText>
          </View>

          <View style={styles.statusBadge}>
            <View
              style={[
                styles.dot,
                { backgroundColor: isRecording ? '#FF453A' : isAnalyzing ? '#007AFF' : '#3A3A3C' },
              ]}
            />
            <Text style={styles.statusText} numberOfLines={1}>
              {isAnalyzing ? t('app.analyzing') : isRecording ? t('app.listening') : t('app.ready')}
            </Text>
          </View>
        </View>

        {/* CENTER SPHERE */}
        <View style={styles.center}>
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  width: 260,
                  height: 260,
                  borderRadius: 130,
                  backgroundColor: isAnalyzing ? '#007AFF' : '#D00000',
                },
                animatedGlowStyle,
              ]}
            />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePress}
              disabled={isAnalyzing}
              style={{
                width: 180,
                height: 180,
                borderRadius: 90,
                backgroundColor: '#121212',
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 2,
                borderColor: isAnalyzing ? '#007AFF' : '#D00000',
                elevation: 20,
                shadowColor: isAnalyzing ? '#007AFF' : '#D00000',
                shadowOpacity: 0.5,
                shadowRadius: 20,
              }}
            >
              {isAnalyzing ? (
                <MaterialCommunityIcons name="brain" size={60} color="#007AFF" />
              ) : (
                <Ionicons name={isRecording ? 'stop' : 'mic'} size={70} color={isRecording ? '#D00000' : '#FFF'} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.tipText}>{t('record.tip')}</Text>
        </View>
      </ScreenWrapper>

      {/* OVERLAY SHEET */}
      {analysisResult && (
        <View style={styles.overlay} pointerEvents="box-none">
          {/* Backdrop (tap outside closes) */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={closeSheet}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Sheet (must be above backdrop) */}
          <View style={styles.sheet} pointerEvents="auto">
            <ResultSheet data={analysisResult} onClose={closeSheet} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1, justifyContent: 'space-between' },

  header: { alignItems: 'center', marginTop: 60, height: 140 },
  headerTop: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '900', fontSize: 42, lineHeight: 46, color: '#FFF', letterSpacing: 0.5 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 15,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { color: '#FFF', fontSize: 12, fontWeight: '800' },

  center: { alignItems: 'center', justifyContent: 'center', height: width },
  footer: { paddingHorizontal: 30, marginBottom: 40, height: 80, justifyContent: 'flex-start', paddingTop: 10 },
  tipText: { color: '#FFF', opacity: 0.4, textAlign: 'center', fontSize: 14 },

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
    zIndex: 10000,
    elevation: 10000,
  },

  // Sheet styles
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
  handle: { width: 50, height: 5, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 10, marginBottom: 20 },
  scrollContent: { alignItems: 'center', paddingBottom: 20 },
  largeEmoji: { fontSize: 100 },
  typeTitle: { fontSize: 40, fontWeight: '900', color: '#FFF', textAlign: 'center' },
  badge: { backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20, marginVertical: 15 },
  badgeText: { color: '#FFF', fontWeight: '700' },
  line: { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 25 },
  descriptionText: { fontSize: 20, color: '#FFF', textAlign: 'center', lineHeight: 30 },

  sootheContainer: { width: '100%', marginTop: 22 },
  sootheButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
  },
  sootheButtonProminent: { backgroundColor: '#FFF', borderColor: 'rgba(255,255,255,0.55)' },
  sootheButtonStop: { backgroundColor: 'rgba(0,0,0,0.22)' },
  sootheButtonText: { color: '#FFF', fontSize: 16, fontWeight: '900' },

  buttonContainer: { width: '100%', marginTop: 20 },
  whiteButton: { width: '100%', paddingVertical: 20, borderRadius: 25, backgroundColor: '#FFF' },
  buttonLabel: { fontSize: 19, fontWeight: '900', textAlign: 'center' },
});

export default React.memo(RecordScreen);
