import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; 

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopWidth: 0,
          height: 85,
          paddingBottom: 25,
        },
        tabBarActiveTintColor: '#FFF',
        tabBarInactiveTintColor: '#444',
      }}>

      <Tabs.Screen
        name="index"
        options={{
          title: 'Анализ',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "mic" : "mic-outline"} size={28} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Дневник',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "journal" : "journal-outline"} size={26} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}