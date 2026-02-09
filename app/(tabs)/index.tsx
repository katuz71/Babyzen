import React, { useState, useEffect, useRef } from 'react';
import { 
  View, TouchableOpacity, StyleSheet, Animated, 
  ActivityIndicator, Modal, Text, Alert, Easing, 
  Dimensions, ScrollView 
} from 'react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { ThemedText } from '@/components/ThemedText';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

export default function RecordScreen() {
  const { t, i18n } = useTranslation();
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const ripple1 = useRef(new Animated.Value(1)).current;
  const ripple2 = useRef(new Animated.Value(1)).current;
  const ripple3 = useRef(new Animated.Value(1)).current;

  const pulseAnim = (val: Animated.Value, to: number, dly: number) => 
    Animated.loop(
      Animated.sequence([
        Animated.delay(dly),
        Animated.timing(val, { toValue: to, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(val, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    );

  useEffect(() => {
    let a1: any, a2: any, a3: any;
    if (isRecording) {
      a1 = pulseAnim(ripple1, 1.3, 0); a2 = pulseAnim(ripple2, 1.6, 400); a3 = pulseAnim(ripple3, 1.9, 800);
      a1.start(); a2.start(); a3.start();
    } else {
      ripple1.setValue(1); ripple2.setValue(1); ripple3.setValue(1);
    }
    return () => { a1?.stop(); a2?.stop(); a3?.stop(); };
  }, [isRecording]);

  const handlePress = async () => {
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
        } catch (e) { Alert.alert("Ошибка", "Не удалось проанализировать"); }
        finally { setIsAnalyzing(false); }
      }
    } else { await startRecording(); }
  };

  const currentType = CRY_TYPES[result?.detected_type || 'Unknown'] || CRY_TYPES['Unknown'];

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#000', '#121212', '#1A1A1A']} style={StyleSheet.absoluteFill} />
      <ScreenWrapper style={styles.container}>
        <View style={styles.header}>
          <ThemedText variant="h1" style={styles.title}>BabyZen</ThemedText>
          <View style={styles.statusBadge}>
            <View style={[styles.dot, { backgroundColor: isRecording ? '#FF453A' : isAnalyzing ? '#007AFF' : '#3A3A3C' }]} />
            <Text style={styles.statusText}>{isAnalyzing ? "АНАЛИЗ..." : isRecording ? "СЛУШАЮ" : "ГОТОВ"}</Text>
          </View>
        </View>

        <View style={styles.center}>
          <TouchableOpacity onPress={handlePress} activeOpacity={0.9} style={styles.sphereContainer}>
            <Animated.View style={[styles.ripple, { backgroundColor: isRecording ? '#FF453A' : '#3A3A3C', opacity: 0.1, transform: [{ scale: ripple3 }] }]} />
            <Animated.View style={[styles.ripple, { backgroundColor: isRecording ? '#FF453A' : '#3A3A3C', opacity: 0.2, transform: [{ scale: ripple2 }] }]} />
            <Animated.View style={[styles.sphereCore, { backgroundColor: isRecording ? '#FF453A' : isAnalyzing ? '#007AFF' : '#2C2C2E', transform: [{ scale: ripple1 }] }]}>
              {isAnalyzing ? <ActivityIndicator color="#FFF" size="large" /> : <Ionicons name={isRecording ? "stop" : "mic"} size={65} color="#FFF" />}
            </Animated.View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}><Text style={styles.tipText}>Нажмите на сферу, когда малыш плачет</Text></View>

        <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <LinearGradient colors={currentType.gradient} style={styles.modalBody}>
              <View style={styles.handle} />
              <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.largeEmoji}>{currentType.emoji}</Text>
                <Text style={styles.typeTitle}>{t(currentType.label_key, { defaultValue: result?.detected_type })}</Text>
                {result?.confidence && (
                  <View style={styles.badge}><Text style={styles.badgeText}>Уверенность: {(result.confidence * 100).toFixed(0)}%</Text></View>
                )}
                <View style={styles.line} />
                <Text style={styles.descriptionText}>{result?.reasoning}</Text>
              </ScrollView>
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.whiteButton} onPress={() => setModalVisible(false)}>
                  <Text style={[styles.buttonLabel, { color: currentType.color }]}>ПОНЯТНО, СПАСИБО</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </Modal>
      </ScreenWrapper>
    </View>
  );
}

const SPHERE_SIZE = 190;
const styles = StyleSheet.create({
  root: { flex: 1 }, container: { flex: 1, justifyContent: 'space-between' },
  header: { alignItems: 'center', marginTop: 60 }, title: { fontWeight: '900', fontSize: 42, color: '#FFF' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, marginTop: 15 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 }, statusText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  center: { alignItems: 'center', justifyContent: 'center', height: width }, footer: { paddingHorizontal: 50, marginBottom: 40 }, tipText: { color: '#FFF', opacity: 0.4, textAlign: 'center', fontSize: 15 },
  sphereContainer: { width: SPHERE_SIZE, height: SPHERE_SIZE, justifyContent: 'center', alignItems: 'center' },
  sphereCore: { width: SPHERE_SIZE, height: SPHERE_SIZE, borderRadius: SPHERE_SIZE / 2, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  ripple: { width: SPHERE_SIZE, height: SPHERE_SIZE, borderRadius: SPHERE_SIZE / 2, position: 'absolute' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.85)' },
  modalBody: { borderTopLeftRadius: 50, borderTopRightRadius: 50, paddingTop: 20, paddingHorizontal: 30, paddingBottom: 40, alignItems: 'center', maxHeight: height * 0.85, width: '100%' },
  handle: { width: 50, height: 5, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 10, marginBottom: 20 },
  scrollContent: { alignItems: 'center', paddingBottom: 20 }, largeEmoji: { fontSize: 100 },
  typeTitle: { fontSize: 40, fontWeight: '900', color: '#FFF', textAlign: 'center' },
  badge: { backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20, marginVertical: 15 },
  badgeText: { color: '#FFF', fontWeight: '700' }, line: { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 25 },
  descriptionText: { fontSize: 20, color: '#FFF', textAlign: 'center', lineHeight: 30 },
  buttonContainer: { width: '100%', marginTop: 20 },
  whiteButton: { width: '100%', paddingVertical: 20, borderRadius: 25, backgroundColor: '#FFF' },
  buttonLabel: { fontSize: 19, fontWeight: '900', textAlign: 'center' }
});