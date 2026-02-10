import { useState, useRef } from 'react';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';
import i18n from '@/lib/i18n';

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      setHasPermission(permission.granted);
      if (!permission.granted) {
        Alert.alert(i18n.t('errors.recording_permission'));
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert(i18n.t('errors.recording_start_failed'));
    }
  }

  async function stopRecording() {
    try {
      if (!recordingRef.current) return;

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);

      console.log('Recording stopped and stored at', uri);
      return uri ?? undefined;
    } catch (err) {
      console.error('Failed to stop recording', err);
      Alert.alert(i18n.t('errors.recording_stop_failed'));
      return;
    }
  }

  return {
    recording: recordingRef.current,
    isRecording,
    startRecording,
    stopRecording,
    hasPermission: hasPermission ?? false,
  };
};