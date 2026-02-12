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
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="record"
        options={{
          title: t('tabs.record'),
          tabBarIcon: ({ color, focused }) => (
            <View style={{ transform: [{ scale: focused ? 1.1 : 1 }] }}>
              <Ionicons name={focused ? 'mic' : 'mic-outline'} size={28} color={color} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: t('tabs.history'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'book' : 'book-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
