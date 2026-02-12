import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#D00000', // Наш фирменный красный
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#0B0E14', // Глубокий полночный синий
          borderTopColor: '#1A1D26',
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      {/* 1. ГЛАВНАЯ */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* 2. ИСТОРИЯ */}
      <Tabs.Screen
        name="history"
        options={{
          title: 'Logs',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "journal" : "journal-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* 3. ЗАПИСЬ (ЦЕНТР) */}
      <Tabs.Screen
        name="record"
        options={{
          title: 'Analyze',
          tabBarIcon: ({ color, focused }) => (
            <View 
              style={{
                width: 54,
                height: 54,
                backgroundColor: focused ? '#D00000' : '#1A1D26',
                borderRadius: 27,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: -20, // Приподнимаем кнопку для акцента
                borderWidth: 4,
                borderColor: '#0B0E14',
                shadowColor: '#D00000',
                shadowOpacity: focused ? 0.4 : 0,
                shadowRadius: 10,
              }}
            >
              <Ionicons name="mic" size={28} color={focused ? 'white' : '#D00000'} />
            </View>
          ),
        }}
      />

      {/* 4. ZEN ЗВУКИ */}
      <Tabs.Screen
        name="zen"
        options={{
          title: 'Zen',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "leaf" : "leaf-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* 5. МЕНТОР */}
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Mentor',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}