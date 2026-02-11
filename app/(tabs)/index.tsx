import { Redirect } from 'expo-router';

export default function Index() {
  // Как только приложение открывается — летим на экран записи
  return <Redirect href="/(tabs)/record" />;
}