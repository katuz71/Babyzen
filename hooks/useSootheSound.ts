import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

const WHITE_NOISE_URL =
  'https://upload.wikimedia.org/wikipedia/commons/transcoded/a/aa/White_noise.ogg/White_noise.ogg.mp3';

type SootheState = {
  isPlaying: boolean;
  volume: number;
};

let player: AudioPlayer | null = null;
let state: SootheState = {
  isPlaying: false,
  volume: 0.7,
};

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function useSootheSound() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate((v) => (v + 1) % 1_000_000);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const start = useCallback(async () => {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
      });

      if (!player) {
        player = createAudioPlayer(
          { uri: WHITE_NOISE_URL },
          {
            updateInterval: 1000,
            keepAudioSessionActive: true,
            downloadFirst: true,
          }
        );
      }

      player.loop = true;
      player.volume = state.volume;
      player.play();

      state = { ...state, isPlaying: true };
      emit();
    } catch (e) {
      console.error(e);
      Alert.alert('Ошибка', 'Не удалось включить белый шум');
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      player?.pause?.();
      player?.remove?.();
      player = null;
    } catch (e) {
      console.error(e);
    } finally {
      state = { ...state, isPlaying: false };
      emit();
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    state = { ...state, volume };
    emit();
  }, []);

  const setVolumeAndApply = useCallback((volume: number) => {
    state = { ...state, volume };
    try {
      if (player) player.volume = volume;
    } catch (e) {
      console.error(e);
    } finally {
      emit();
    }
  }, []);

  return {
    isPlaying: state.isPlaying,
    volume: state.volume,
    start,
    stop,
    setVolume,
    setVolumeAndApply,
  };
}
