import { Redirect, type Href } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { BABY_DATA_KEY } from './(onboarding)/baby-setup';

export default function StartPage() {
  const [target, setTarget] = useState<Href | null>(null);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(BABY_DATA_KEY);

      if (!raw) {
        setTarget('/(onboarding)');
        return;
      }

      const data = JSON.parse(raw);

      if (!data?.isSetup) {
        setTarget('/(onboarding)');
        return;
      }

      if (!data?.onboardingFinished) {
        setTarget('/(onboarding)/paywall');
        return;
      }

      setTarget('/(tabs)');
    })();
  }, []);

  if (!target) return null;

  return <Redirect href={target} />;
}
