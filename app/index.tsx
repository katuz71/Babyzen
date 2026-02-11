import { Redirect } from 'expo-router';

export default function Index() {
  // Жестко направляем всех новых пользователей на начало твоей воронки
  return <Redirect href="/(onboarding)" />;
}