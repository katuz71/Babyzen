import { Tabs } from 'expo-router';
import { View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/lib/ThemeContext';

export default function TabLayout() {
  const { theme } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.sub,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
        },
      }}
    >
      {/* 1. ГЛАВНАЯ */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Главная',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* 2. РАЗВИТИЕ (Карточки Домана) -> Файл growth.tsx */}
      <Tabs.Screen
        name="growth" 
        options={{
          title: 'Развитие',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "albums" : "albums-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* 3. ЗАПИСЬ (Анализ плача) -> Файл record.tsx */}
      <Tabs.Screen
        name="record"
        options={{
          title: 'Запись',
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: focused ? theme.accent : theme.bg,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 2,
                borderColor: theme.accent,
                marginTop: -10, // Приподнимаем над меню
              }}
            >
              <Ionicons 
                name={focused ? "mic" : "mic-outline"} 
                size={26} 
                color={focused ? '#FFF' : theme.accent} 
              />
            </View>
          ),
        }}
      />

      {/* 4. ЧАТ (AI Ментор) -> Файл chat.tsx */}
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Чат',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* 5. МУЗЫКА (Белый шум, Колыбельные) -> Файл zen.tsx */}
      <Tabs.Screen
        name="zen"
        options={{
          title: 'Музыка',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "musical-notes" : "musical-notes-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* --- СКРЫТЫЕ ЭКРАНЫ --- */}
      {/* Файл history.tsx все еще лежит в папке tabs, поэтому мы должны его объявить, 
          но ставим href: null, чтобы он НЕ появлялся в нижнем меню */}
      <Tabs.Screen 
        name="history" 
        options={{ href: null }} 
      />
    </Tabs>
  );
}