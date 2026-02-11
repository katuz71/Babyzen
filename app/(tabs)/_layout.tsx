import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopColor: '#333',
          height: 60,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#D00000',
        tabBarInactiveTintColor: '#666',
      }}
    >
      {/* 1. СКРЫВАЕМ INDEX (Ретранслятор) */}
      <Tabs.Screen 
        name="index" 
        options={{ 
          href: null, // <--- Это убирает кнопку из меню
        }} 
      />

      {/* 2. ЗАПИСЬ (record.tsx) */}
      <Tabs.Screen
        name="record"
        options={{
          title: 'Анализ',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ transform: [{ scale: focused ? 1.1 : 1 }] }}>
              <Ionicons name={focused ? "mic" : "mic-outline"} size={28} color={color} />
            </View>
          ),
        }}
      />

      {/* 3. ИСТОРИЯ (history.tsx) */}
      <Tabs.Screen
        name="history"
        options={{
          title: 'Дневник',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "book" : "book-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}