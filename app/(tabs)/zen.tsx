import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text } from '@/components/Text';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/lib/ThemeContext';

const SOUNDS_LIST = [
  { id: 'white_noise', title: 'Белый шум', icon: 'thunderstorm-outline', color: '#5DADE2', file: require('../../assets/sounds/white_noise.mp3') },
  { id: 'rain', title: 'Летний дождь', icon: 'rainy-outline', color: '#48C9B0', file: require('../../assets/sounds/rain.mp3') },
  { id: 'shush', title: 'Шипение (Shush)', icon: 'volume-high-outline', color: '#F4D03F', file: require('../../assets/sounds/shush.mp3') },
  { id: 'heartbeat', title: 'Сердцебиение', icon: 'heart-outline', color: '#EC7063', file: require('../../assets/sounds/heartbeat.mp3') },
];

const TIMER_OPTIONS = [15, 30, 45, 60];

export default function ZenScreen() {
  const { theme } = useAppTheme();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [soundInstance, setSoundInstance] = useState<Audio.Sound | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  // Состояния таймера
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const timerIntervalRef = useRef<any>(null);

  // Очистка при закрытии
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, []);

  // Логика обратного отсчета
  useEffect(() => {
    if (secondsLeft !== null && secondsLeft > 0) {
      timerIntervalRef.current = setInterval(() => {
        setSecondsLeft(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (secondsLeft === 0) {
      stopAll();
      Alert.alert("Zen Mode", "Таймер завершен, звук остановлен.");
    }

    return () => clearInterval(timerIntervalRef.current);
  }, [secondsLeft]);

  const stopAll = async () => {
    if (soundInstance) {
      await soundInstance.stopAsync();
      await soundInstance.unloadAsync();
      setSoundInstance(null);
    }
    setPlayingId(null);
    setSecondsLeft(null);
    clearInterval(timerIntervalRef.current);
  };

  async function toggleSound(soundItem: any) {
    try {
      if (playingId === soundItem.id) {
        await stopAll();
        return;
      }

      if (soundInstance) {
        await soundInstance.unloadAsync();
      }

      setLoadingId(soundItem.id);

      const { sound } = await Audio.Sound.createAsync(
        soundItem.file,
        { shouldPlay: true, isLooping: true, volume: 0.5 }
      );

      setSoundInstance(sound);
      setPlayingId(soundItem.id);
    } catch (error) {
      Alert.alert("Ошибка", "Не удалось запустить звук.");
    } finally {
      setLoadingId(null);
    }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <ScreenWrapper style={{ backgroundColor: theme.bg }}>
      <ScrollView className="flex-1 px-5">
        <View className="mt-6 mb-8 flex-row justify-between items-end">
          <View>
            <Text style={{ color: theme.mutedText }} className="text-sm uppercase tracking-widest font-bold">Zen Library</Text>
            <Text style={{ color: theme.text }} className="text-3xl font-bold">Спокойный сон</Text>
          </View>
          {secondsLeft !== null && (
            <View style={{ backgroundColor: theme.accent }} className="px-3 py-1 rounded-full mb-1">
              <Text className="text-white font-bold text-xs">⏱ {formatTime(secondsLeft)}</Text>
            </View>
          )}
        </View>

        {/* СЕТКА ЗВУКОВ */}
        <View className="flex-row flex-wrap justify-between">
          {SOUNDS_LIST.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => toggleSound(item)}
              activeOpacity={0.7}
              style={{ width: '47%' }}
              className="mb-5"
            >
              <LinearGradient
                colors={playingId === item.id ? [theme.surface2, theme.surface] : [theme.surface, theme.surface]}
                style={{ borderColor: playingId === item.id ? theme.accent : theme.border }}
                className="rounded-3xl p-6 items-center border"
              >
                <View 
                  className="w-16 h-16 rounded-2xl items-center justify-center mb-4"
                  style={{ backgroundColor: `${item.color}15` }}
                >
                  {loadingId === item.id ? (
                    <ActivityIndicator color={item.color} />
                  ) : (
                    <Ionicons 
                      name={playingId === item.id ? "pause" : (item.icon as any)} 
                      size={32} 
                      color={playingId === item.id ? theme.accent : item.color} 
                    />
                  )}
                </View>
                <Text style={{ color: playingId === item.id ? theme.text : theme.mutedText }} className="font-bold text-center text-sm">
                  {item.title}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* ТАЙМЕР АВТОВЫКЛЮЧЕНИЯ */}
        <View className="mt-4 mb-10">
          <Text style={{ color: theme.text }} className="font-bold mb-4 text-lg">Таймер выключения</Text>
          <View className="flex-row justify-between">
            {TIMER_OPTIONS.map((min) => (
              <TouchableOpacity
                key={min}
                onPress={() => {
                  if (!playingId) {
                    Alert.alert("Сначала выберите звук");
                    return;
                  }
                  setSecondsLeft(min * 60);
                }}
                style={{
                  backgroundColor: secondsLeft === min * 60 ? theme.accent : theme.surface,
                  borderColor: secondsLeft === min * 60 ? theme.accent : theme.border,
                }}
                className="px-4 py-3 rounded-2xl border"
              >
                <Text style={{ color: secondsLeft === min * 60 ? '#FFF' : theme.mutedText }} className="font-bold">
                  {min} м
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setSecondsLeft(null)}
              style={{ backgroundColor: theme.surface, borderColor: theme.border }}
              className="px-4 py-3 rounded-2xl border"
            >
              <Ionicons name="close-outline" size={20} color={theme.mutedText} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}