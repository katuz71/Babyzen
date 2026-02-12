import React from 'react';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export default function TabLayout() {
  const { t } = useTranslation();

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
      {/* 1. Скрытый индекс (Redirect) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons name="home-sharp" size={24} color={color} />,
        }}
      />

      {/* 2. Вкладка Записи */}
      <Tabs.Screen
        name="record"
        options={{
          title: t('tabs.record') || 'Record',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ transform: [{ scale: focused ? 1.1 : 1 }] }}>
              <Ionicons name={focused ? 'mic' : 'mic-outline'} size={28} color={color} />
            </View>
          ),
        }}
      />

      {/* 3. Вкладка Истории */}
      <Tabs.Screen
        name="history"
        options={{
          title: t('tabs.history') || 'History',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'book' : 'book-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* 4. Вкладка Ментора (Чат) */}
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Mentor',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}