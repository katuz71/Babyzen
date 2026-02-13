import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker'; 
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text } from '@/components/Text';
import { supabase } from '@/lib/supabase';
import { changeLanguage } from '@/lib/i18n';
// Импортируем наш движок тем и тип ThemeName
import { useAppTheme, ThemeName } from '@/lib/ThemeContext'; 

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, themeName, updateTheme } = useAppTheme();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Состояние профиля
  const [profile, setProfile] = useState({
    baby_name: '',
    baby_dob: '', 
    baby_weight: '',
    baby_height: '',
    parent_email: '',
    app_language: 'ru'
  });

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setProfile({
          baby_name: data.baby_name || '',
          baby_dob: data.baby_dob || '', 
          baby_weight: data.baby_weight?.toString() || '',
          baby_height: data.baby_height?.toString() || '',
          parent_email: data.parent_email || user.email || '',
          app_language: data.app_language || 'ru'
        });
      }
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('profiles')
        .update({
          baby_name: profile.baby_name,
          baby_dob: profile.baby_dob || null,
          baby_weight: parseFloat(profile.baby_weight) || null,
          baby_height: parseFloat(profile.baby_height) || null,
          parent_email: profile.parent_email,
          app_language: profile.app_language,
          app_theme: themeName 
        })
        .eq('id', user?.id);

      if (error) throw error;
      Alert.alert("Прекрасно", "Ваши данные обновлены ✨");
    } catch (e: any) {
      Alert.alert("Ошибка", e.message);
    } finally {
      setSaving(false);
    }
  };

  const cycleLanguage = async () => {
    const langs = ['ru', 'en', 'es'];
    const next = langs[(langs.indexOf(profile.app_language) + 1) % langs.length];
    setProfile({ ...profile, app_language: next });
    await changeLanguage(next as any);
  };

  const cycleTheme = () => {
    // ИСПРАВЛЕНИЕ: Строго указываем TypeScript, что массив содержит только ключи тем
    const th: ThemeName[] = ['dark', 'pink', 'blue'];
    const next = th[(th.indexOf(themeName) + 1) % th.length];
    updateTheme(next);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setProfile({ ...profile, baby_dob: selectedDate.toISOString().split('T')[0] });
    }
  };

  // ИСПРАВЛЕНИЕ: Экран загрузки теперь тоже подчиняется дизайн-токенам
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  return (
    <ScreenWrapper style={{ backgroundColor: theme.bg }}>
      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        
        {/* HEADER */}
        <View className="flex-row items-center justify-between mt-6 mb-8">
          <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: theme.card }} className="p-2 rounded-full shadow-sm">
            <Ionicons name="arrow-back" size={24} color={theme.accent} />
          </TouchableOpacity>
          <Text style={{ color: theme.text }} className="text-xl font-black italic uppercase">Профиль</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={theme.accent} /> : <Text style={{ color: theme.accent }} className="font-bold text-lg italic">Готово</Text>}
          </TouchableOpacity>
        </View>

        {/* СЕКЦИЯ: МАЛЫШ */}
        <View className="mb-6">
          <Text style={{ color: theme.sub }} className="font-bold uppercase tracking-[2px] text-[10px] mb-3 ml-2">Малыш</Text>
          <View style={{ backgroundColor: theme.card, borderColor: theme.border }} className="rounded-[32px] p-6 border shadow-sm">
            <SettingInput theme={theme} label="Имя" value={profile.baby_name} onChange={(v: string) => setProfile({...profile, baby_name: v})} icon="heart" />
            
            <Text style={{ color: theme.sub }} className="text-[10px] font-bold uppercase mb-2 ml-1 mt-2">Дата рождения</Text>
            <TouchableOpacity 
              onPress={() => setShowDatePicker(true)}
              style={{ backgroundColor: theme.bg, borderColor: theme.border }}
              className="flex-row items-center p-4 rounded-2xl border mb-4"
            >
              <Ionicons name="calendar" size={18} color={theme.accent} style={{ marginRight: 10 }} />
              <Text style={{ color: profile.baby_dob ? theme.text : theme.sub }}>
                {profile.baby_dob || "Выбрать дату"}
              </Text>
            </TouchableOpacity>

            <View className="flex-row justify-between">
               <View className="w-[48%]">
                 <SettingInput theme={theme} label="Вес (кг)" value={profile.baby_weight} onChange={(v: string) => setProfile({...profile, baby_weight: v})} keyboardType="numeric" />
               </View>
               <View className="w-[48%]">
                 <SettingInput theme={theme} label="Рост (см)" value={profile.baby_height} onChange={(v: string) => setProfile({...profile, baby_height: v})} keyboardType="numeric" />
               </View>
            </View>
          </View>
        </View>

        {/* СЕКЦИЯ: ПРИЛОЖЕНИЕ */}
        <View className="mb-6">
          <Text style={{ color: theme.sub }} className="font-bold uppercase tracking-[2px] text-[10px] mb-3 ml-2">Приложение</Text>
          <View style={{ backgroundColor: theme.card, borderColor: theme.border }} className="rounded-[32px] p-2 border shadow-sm">
            <SettingRow theme={theme} label="Язык системы" value={profile.app_language.toUpperCase()} icon="language" onPress={cycleLanguage} />
            <SettingRow theme={theme} label="Цветовая тема" value={themeName.toUpperCase()} icon="color-palette" onPress={cycleTheme} />
            <SettingRow theme={theme} label="Email для отчетов" value={profile.parent_email.split('@')[0] + '...'} icon="mail" onPress={() => Alert.alert("Email", profile.parent_email)} />
          </View>
        </View>

        {/* СЕКЦИЯ: ИНФО */}
        <View className="mb-10">
          <Text style={{ color: theme.sub }} className="font-bold uppercase tracking-[2px] text-[10px] mb-3 ml-2">Поддержка</Text>
          <View style={{ backgroundColor: theme.card, borderColor: theme.border }} className="rounded-[32px] p-2 border shadow-sm">
            <SettingRow theme={theme} label="Оценить Baby Zen" icon="star" onPress={() => Alert.alert("Скоро", "Мы добавим переход в App Store")} />
            <SettingRow theme={theme} label="Политика конфиденциальности" icon="shield-checkmark" onPress={() => Linking.openURL('https://google.com')} />
          </View>
        </View>

        <TouchableOpacity 
          onPress={async () => { await supabase.auth.signOut(); router.replace('/login' as any); }}
          className="items-center mb-20"
        >
          <Text style={{ color: theme.sub }} className="font-bold italic">Выйти из аккаунта</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={profile.baby_dob ? new Date(profile.baby_dob) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

// Вспомогательные компоненты (чистые и типизированные)
function SettingInput({ label, value, onChange, icon, keyboardType = 'default', theme }: any) {
  return (
    <View className="mb-2">
      <Text style={{ color: theme.sub }} className="text-[10px] font-bold uppercase mb-2 ml-1">{label}</Text>
      <View style={{ backgroundColor: theme.bg, borderColor: theme.border }} className="flex-row items-center p-4 rounded-2xl border">
        {icon && <Ionicons name={icon} size={18} color={theme.accent} style={{ marginRight: 10 }} />}
        <TextInput value={value} onChangeText={onChange} keyboardType={keyboardType} style={{ color: theme.text, fontSize: 16, flex: 1 }} placeholderTextColor={theme.sub} />
      </View>
    </View>
  );
}

function SettingRow({ label, value, icon, onPress, theme }: any) {
  return (
    <TouchableOpacity onPress={onPress} className="flex-row items-center justify-between p-4">
      <View className="flex-row items-center">
        <View style={{ backgroundColor: theme.bg }} className="w-10 h-10 rounded-xl items-center justify-center mr-4">
          <Ionicons name={icon} size={20} color={theme.accent} />
        </View>
        <Text style={{ color: theme.text }} className="font-bold text-base">{label}</Text>
      </View>
      <View className="flex-row items-center">
        <Text style={{ color: theme.sub }} className="font-bold mr-2">{value}</Text>
        <Ionicons name="chevron-forward" size={16} color={theme.sub} />
      </View>
    </TouchableOpacity>
  );
}