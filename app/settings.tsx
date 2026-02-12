import React from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text } from '@/components/Text';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert("Выход", "Вы уверены, что хотите выйти?", [
      { text: "Отмена", style: "cancel" },
      { text: "Выйти", style: "destructive", onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/login' as any);
      }}
    ]);
  };

  return (
    <ScreenWrapper style={{ backgroundColor: '#0B0E14' }}>
      <View className="flex-1 px-6">
        {/* HEADER */}
        <View className="flex-row items-center mt-6 mb-10">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold">Настройки</Text>
        </View>

        {/* MENU GROUPS */}
        <View className="space-y-4">
          <SettingsItem 
           icon="happy-outline" // Личико — идеально для малыша
           label="Профиль малыша" 
           onPress={() => router.push('/(onboarding)/baby-setup')} 
        />
          <SettingsItem 
            icon="star-outline" 
            label="Подписка Zen Pro" 
            color="#D00000"
            onPress={() => router.push('/paywall')} 
          />
          <SettingsItem 
            icon="notifications-outline" 
            label="Уведомления" 
            onPress={() => Alert.alert("В разработке")} 
          />
          <SettingsItem 
            icon="help-circle-outline" 
            label="Поддержка" 
            onPress={() => Alert.alert("Email: support@babyzen.ai")} 
          />
        </View>

        <View className="flex-1" />

        {/* LOGOUT */}
        <TouchableOpacity 
          onPress={handleLogout}
          className="mb-10 flex-row items-center justify-center p-4 border border-red-900/30 rounded-2xl"
        >
          <Ionicons name="log-out-outline" size={20} color="#D00000" />
          <Text className="text-[#D00000] font-bold ml-2">Выйти из аккаунта</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

// Компонент пункта меню
function SettingsItem({ icon, label, onPress, color = "white" }: any) {
  return (
    <TouchableOpacity 
      onPress={onPress}
      className="flex-row items-center bg-[#161B22] p-5 rounded-2xl mb-3 border border-gray-900"
    >
      <Ionicons name={icon} size={22} color={color} />
      <Text className="text-gray-200 ml-4 text-lg flex-1">{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#444" />
    </TouchableOpacity>
  );
}