
import { useCallback, useEffect, useState, useRef } from 'react';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';


const WHITE_NOISE_URL =
  'https://upload.wikimedia.org/wikipedia/commons/transcoded/a/aa/White_noise.ogg/White_noise.ogg.mp3';


export function useSootheSound() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const soundRef = useRef<Audio.Sound | null>(null);


  // Очищаем звук при размонтировании
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, []);

  const start = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: WHITE_NOISE_URL },
        { shouldPlay: true, isLooping: true, volume }
      );
      soundRef.current = sound;
      setIsPlaying(true);
    } catch (e) {
      console.error(e);
      Alert.alert('Ошибка', 'Не удалось включить белый шум');
    }
  }, [volume]);

  const stop = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsPlaying(false);
    }
  }, []);

  const setVolumeAndApply = useCallback(async (v: number) => {
    setVolume(v);
    try {
      if (soundRef.current) {
        await soundRef.current.setVolumeAsync(v);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  return {
    isPlaying,
    volume,
    start,
    stop,
    setVolume,
    setVolumeAndApply,
  };
}
