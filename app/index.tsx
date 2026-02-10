import { Redirect } from 'expo-router';

export default function StartPage() {
  // ВРЕМЕННО: Принудительно отправляем всех на онбординг для теста
  return <Redirect href="/(onboarding)" />;
}