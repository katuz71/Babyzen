import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BABY_DATA_KEY } from "./(onboarding)/baby-setup";

export default function Index() {
  const [ready, setReady] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const raw = await AsyncStorage.getItem(BABY_DATA_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          setFinished(data?.onboardingFinished === true);
        } else {
          setFinished(false);
        }
      } catch {
        setFinished(false);
      } finally {
        setReady(true);
      }
    };

    checkOnboarding();
  }, []);

  if (!ready) return null;

  return finished ? <Redirect href="/(tabs)/record" /> : <Redirect href="/(onboarding)" />;
}
