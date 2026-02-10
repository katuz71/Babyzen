import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, TouchableOpacity, StyleSheet, Modal, Text, Alert,
  Dimensions, ScrollView
} from 'react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { ThemedText } from '@/components/ThemedText';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { pickSmartSootheUrl } from '@/lib/smartSoothe';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { RecordingSphere } from '@/components/RecordingSphere';
import '@/lib/i18n';

const { width, height } = Dimensions.get('window');

const CRY_TYPES: Record<string, { emoji: string, color: string, label_key: string, gradient: [string, string, ...string[]] }> = {
  'Hunger': { emoji: '🍼', color: '#FF9500', label_key: 'cry_types.hunger', gradient: ['#FF9500', '#FF5E00'] },
  'Burp': { emoji: '☁️', color: '#34C759', label_key: 'cry_types.burp', gradient: ['#34C759', '#1D9444'] },
  'Sleep': { emoji: '😴', color: '#5856D6', label_key: 'cry_types.sleep', gradient: ['#5856D6', '#322F91'] },
  'Discomfort': { emoji: '🧷', color: '#FF3B30', label_key: 'cry_types.discomfort', gradient: ['#FF3B30', '#B01F18'] },
  'Gas': { emoji: '💨', color: '#AF52DE', label_key: 'cry_types.gas', gradient: ['#AF52DE', '#732B9C'] },
  'Unknown': { emoji: '❓', color: '#8E8E93', label_key: 'cry_types.unknown', gradient: ['#3A3A3C', '#1C1C1E'] },
};

function RecordScreen() {
  const { t, i18n } = useTranslation();
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const soothePlayerRef = useRef<Audio.Sound | null>(null);
  const [isSoothePlaying, setIsSoothePlaying] = useState(false);

  useEffect(() => {
    return () => {
      try {
        soothePlayerRef.current?.stopAsync();
        soothePlayerRef.current?.unloadAsync();
      } catch (e) {
        console.error('Cleanup ошибка:', e);
      } finally {
        soothePlayerRef.current = null;
      }
    };
  }, []);

  const stopSmartSoothe = async () => {
    try {
      if (soothePlayerRef.current) {
        await soothePlayerRef.current.stopAsync();
        await soothePlayerRef.current.unloadAsync();
        soothePlayerRef.current = null;
      }
    } catch (e) {
      console.error('Ошибка остановки звука:', e);
    } finally {
      setIsSoothePlaying(false);
    }
  };

  const startSmartSoothe = async () => {
    try {
      const source = pickSmartSootheUrl(result?.detected_type);

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      await stopSmartSoothe();

      // Для локальных файлов (require) используем expo-av
      const { sound } = await Audio.Sound.createAsync(
        source,
        { shouldPlay: true, isLooping: true, volume: 1.0 }
      );

      // Устанавливаем максимальную громкость
      await sound.setVolumeAsync(1.0);

      console.log('SmartSoothe: звук запущен');
      soothePlayerRef.current = sound;
      setIsSoothePlaying(true);
    } catch (e) {
      console.error('SmartSoothe ошибка:', e);
      Alert.alert(t('errors.soothe_failed'), (e as Error).message);
    }
  };


  const handlePress = useCallback(async () => {
    if (isAnalyzing) return;
    if (isRecording) {
      const uri = await stopRecording();
      if (uri) {
        setIsAnalyzing(true);
        try {
          const formData = new FormData();
          formData.append('file', { uri, name: 'cry.m4a', type: 'audio/m4a' } as any);
          formData.append('language', i18n.language || 'en');

          // 1. Анализ через AI
          const { data, error } = await supabase.functions.invoke('analyze-cry', { body: formData });
          if (error) throw error;

          // 2. ЗАПИСЬ В БАЗУ ДАННЫХ
          const { error: dbError } = await supabase
            .from('cries')
            .insert([
              {
                type: data.detected_type,
                confidence: data.confidence,
                reasoning: data.reasoning
              }
            ]);

          if (dbError) console.error("Ошибка сохранения в базу:", dbError);

          setResult(data);
          setModalVisible(true);
        } catch (e) { Alert.alert(t('errors.analysis_failed'), String(e)); }
        finally { setIsAnalyzing(false); }
      }
    } else {
      await stopSmartSoothe();
      await startRecording();
    }
  }, [isAnalyzing, isRecording, stopRecording, i18n.language, stopSmartSoothe, startRecording, t]);

  const currentType = CRY_TYPES[result?.detected_type || 'Unknown'] || CRY_TYPES['Unknown'];
  const isSleepType = (result?.detected_type || 'Unknown') === 'Sleep';

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#000', '#121212', '#1A1A1A']} style={StyleSheet.absoluteFill} />
      <ScreenWrapper style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <ThemedText variant="h1" style={styles.title}>{t('app.name')}</ThemedText>
            <LanguageSwitcher />
          </View>
          <View style={styles.statusBadge}>
            <View style={[styles.dot, { backgroundColor: isRecording ? '#FF453A' : isAnalyzing ? '#007AFF' : '#3A3A3C' }]} />
            <Text style={styles.statusText} numberOfLines={1}>{isAnalyzing ? t('app.analyzing') : isRecording ? t('app.listening') : t('app.ready')}</Text>
          </View>
        </View>

        <View style={styles.center}>
          <RecordingSphere
            key="recording-sphere"
            isRecording={isRecording}
            isAnalyzing={isAnalyzing}
            onPress={handlePress}
          />
        </View>

        <View style={styles.footer}><Text style={styles.tipText}>{t('record.tip')}</Text></View>

        <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <LinearGradient colors={currentType.gradient} style={styles.modalBody}>
              <View style={styles.handle} />
              <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.largeEmoji}>{currentType.emoji}</Text>
                <Text style={styles.typeTitle}>{t(currentType.label_key, { defaultValue: result?.detected_type })}</Text>
                {result?.confidence && (
                  <View style={styles.badge}><Text style={styles.badgeText}>{t('record.modal.confidence')}: {(result.confidence * 100).toFixed(0)}%</Text></View>
                )}
                <View style={styles.line} />
                <Text style={styles.descriptionText}>{result?.reasoning}</Text>
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
                    name={isSoothePlaying ? 'stop' : (isSleepType ? 'moon' : 'musical-notes')}
                    size={20}
                    color={isSleepType && !isSoothePlaying ? currentType.color : '#FFF'}
                    style={{ marginRight: 10 }}
                  />
                  <Text
                    style={[
                      styles.sootheButtonText,
                      isSleepType && !isSoothePlaying ? { color: currentType.color } : null,
                    ]}
                  >
                    {isSoothePlaying ? t('soothe.stop') : t('soothe.button')}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.whiteButton} onPress={() => setModalVisible(false)}>
                  <Text style={[styles.buttonLabel, { color: currentType.color }]}>{t('record.modal.understand')}</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </Modal>
      </ScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }, container: { flex: 1, justifyContent: 'space-between' },
  header: { alignItems: 'center', marginTop: 60, height: 140 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontWeight: '900', fontSize: 42, lineHeight: 46, color: '#FFF', includeFontPadding: false },
  statusBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, marginTop: 15, minWidth: 180 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 }, statusText: { color: '#FFF', fontSize: 12, fontWeight: '800', lineHeight: 16, includeFontPadding: false },
  center: { alignItems: 'center', justifyContent: 'center', height: width },
  footer: { paddingHorizontal: 30, marginBottom: 40, height: 80, justifyContent: 'flex-start', paddingTop: 10 },
  tipText: { color: '#FFF', opacity: 0.4, textAlign: 'center', fontSize: 14, height: 40, lineHeight: 20, textAlignVertical: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.85)' },
  modalBody: { borderTopLeftRadius: 50, borderTopRightRadius: 50, paddingTop: 20, paddingHorizontal: 30, paddingBottom: 40, alignItems: 'center', maxHeight: height * 0.85, width: '100%' },
  handle: { width: 50, height: 5, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 10, marginBottom: 20 },
  scrollContent: { alignItems: 'center', paddingBottom: 20 }, largeEmoji: { fontSize: 100 },
  typeTitle: { fontSize: 40, fontWeight: '900', color: '#FFF', textAlign: 'center' },
  badge: { backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20, marginVertical: 15 },
  badgeText: { color: '#FFF', fontWeight: '700' }, line: { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 25 },
  descriptionText: { fontSize: 20, color: '#FFF', textAlign: 'center', lineHeight: 30 },
  sootheContainer: { width: '100%', marginTop: 22 },
  sootheButton: { width: '100%', paddingVertical: 16, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.14)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', shadowColor: '#FFFFFF', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  sootheButtonProminent: { backgroundColor: '#FFF', borderColor: 'rgba(255,255,255,0.55)', paddingVertical: 18, shadowOpacity: 0.28, elevation: 4 },
  sootheButtonStop: { backgroundColor: 'rgba(0,0,0,0.22)', borderColor: 'rgba(255,255,255,0.22)', shadowOpacity: 0 },
  sootheButtonText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.4 },
  buttonContainer: { width: '100%', marginTop: 20 },
  whiteButton: { width: '100%', paddingVertical: 20, borderRadius: 25, backgroundColor: '#FFF' },
  buttonLabel: { fontSize: 19, fontWeight: '900', textAlign: 'center' }
});

export default React.memo(RecordScreen);