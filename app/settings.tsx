import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text } from '@/components/Text';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/lib/ThemeContext';
import { useTranslation } from 'react-i18next';
import { changeLanguage, type AppLanguage } from '@/lib/i18n';

// Constant for text on accent-colored backgrounds (ensures readability)
const TEXT_ON_ACCENT = '#FFFFFF';

function toNote(payload?: any): string | null {
  if (payload === undefined || payload === null) return null;
  if (typeof payload === 'string') return payload;
  try { return JSON.stringify(payload); } catch { return String(payload); }
}

interface UserProfile {
  baby_name?: string;
  baby_dob?: string;
  tier?: 'free' | 'pro';
  language?: string;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, themeName, setTheme } = useAppTheme();
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('baby_name, baby_dob, tier, language')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
      } else {
        setProfile(data);
      }
    } catch (e) {
      console.error('loadProfile error:', e);
    } finally {
      setLoading(false);
    }
  };

  const logEvent = async (type: string, meta?: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Profile is guaranteed to exist via trigger, no need to upsert
      await supabase.from('logs').insert({
        user_id: user.id,
        type,
        note: toNote(meta),
      });
    } catch (e) {
      console.error('logEvent error:', e);
    }
  };

  const handleLanguageChange = async (lang: AppLanguage) => {
    await logEvent('ui_settings_language_change', { lang });
    await changeLanguage(lang);
    await loadProfile();
  };

  const handleThemeChange = async (newTheme: 'pure_black' | 'indigo_night' | 'emerald_night') => {
    await logEvent('ui_settings_theme_change', { theme: newTheme });
    setTheme(newTheme);
  };

  const handleLogout = async () => {
    await logEvent('ui_settings_logout_tap');

    Alert.alert('Выход', 'Вы уверены, что хотите выйти?', [
      { text: 'Отмена', style: 'cancel', onPress: () => logEvent('ui_settings_logout_cancel') },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: async () => {
          await logEvent('ui_settings_logout_confirm');
          await supabase.auth.signOut();
          router.replace('/login' as any);
        },
      },
    ]);
  };

  const currentTier = profile?.tier || 'free';
  const currentLanguage = profile?.language || i18n.language || 'en';

  return (
    <ScreenWrapper style={{ backgroundColor: theme.bg }}>
      <ScrollView className="flex-1 px-6">
        {/* HEADER */}
        <View className="flex-row items-center mt-6 mb-8">
          <TouchableOpacity
            onPress={async () => { await logEvent('ui_settings_back'); router.back(); }}
            className="mr-4"
          >
            <Ionicons name="arrow-back" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={{ color: theme.text, fontSize: 28, fontWeight: 'bold' }}>Настройки</Text>
        </View>

        {/* PROFILE SECTION */}
        <SectionHeader title="Профиль" theme={theme} />
        <SettingsItem
          icon="happy-outline"
          label={profile?.baby_name || 'Профиль малыша'}
          onPress={async () => {
            await logEvent('ui_settings_open_baby_profile');
            router.push('/baby-profile' as any);
          }}
          theme={theme}
        />

        {/* LANGUAGE SECTION */}
        <SectionHeader title="Язык" theme={theme} />
        <View style={{ backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 4, marginBottom: 24 }}>
          <LanguageOption
            label="Русский"
            value="ru"
            selected={currentLanguage === 'ru'}
            onPress={() => handleLanguageChange('ru')}
            theme={theme}
          />
          <LanguageOption
            label="English"
            value="en"
            selected={currentLanguage === 'en'}
            onPress={() => handleLanguageChange('en')}
            theme={theme}
          />
          <LanguageOption
            label="Español"
            value="es"
            selected={currentLanguage === 'es'}
            onPress={() => handleLanguageChange('es')}
            theme={theme}
            isLast
          />
        </View>

        {/* THEME SECTION */}
        <SectionHeader title="Тема" theme={theme} />
        <View style={{ backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 4, marginBottom: 24 }}>
          <ThemeOption
            label="Pure Black"
            value="pure_black"
            selected={themeName === 'pure_black'}
            onPress={() => handleThemeChange('pure_black')}
            theme={theme}
            previewColor="#D00000" // Theme preview: Pure Black accent
          />
          <ThemeOption
            label="Indigo Night"
            value="indigo_night"
            selected={themeName === 'indigo_night'}
            onPress={() => handleThemeChange('indigo_night')}
            theme={theme}
            previewColor="#6366F1" // Theme preview: Indigo Night accent
          />
          <ThemeOption
            label="Emerald Night"
            value="emerald_night"
            selected={themeName === 'emerald_night'}
            onPress={() => handleThemeChange('emerald_night')}
            theme={theme}
            previewColor="#10B981" // Theme preview: Emerald Night accent
            isLast
          />
        </View>

        {/* SUBSCRIPTION SECTION */}
        <SectionHeader title="Подписка" theme={theme} />
        <View style={{ backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 16, marginBottom: 24 }}>
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Ionicons name="star" size={20} color={theme.accent} />
              <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
                Текущий план
              </Text>
            </View>
            <View style={{ backgroundColor: theme.accent, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ color: TEXT_ON_ACCENT, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' }}>
                {currentTier}
              </Text>
            </View>
          </View>
          <Text style={{ color: theme.mutedText, fontSize: 14, marginBottom: 12 }}>
            {currentTier === 'pro' 
              ? 'У вас активна подписка Zen Pro с полным доступом ко всем функциям'
              : 'Бесплатный план с базовыми функциями'}
          </Text>
          <TouchableOpacity
            onPress={async () => {
              await logEvent('ui_settings_open_paywall');
              router.push('/(onboarding)/paywall' as any);
            }}
            style={{ backgroundColor: theme.accent, paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
          >
            <Text style={{ color: TEXT_ON_ACCENT, fontSize: 15, fontWeight: 'bold' }}>
              {currentTier === 'pro' ? 'Управление подпиской' : 'Перейти на Pro'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* DANGER ZONE */}
        <SectionHeader title="Опасная зона" theme={theme} />
        <TouchableOpacity
          onPress={handleLogout}
          style={{ 
            backgroundColor: theme.surface, 
            borderWidth: 1, 
            borderColor: theme.accent + '40',
            borderRadius: 16, 
            padding: 16, 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'center',
            marginBottom: 40
          }}
        >
          <Ionicons name="log-out-outline" size={20} color={theme.accent} />
          <Text style={{ color: theme.accent, fontSize: 16, fontWeight: 'bold', marginLeft: 8 }}>
            Выйти из аккаунта
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
}

// Section Header Component
function SectionHeader({ title, theme }: { title: string; theme: any }) {
  return (
    <Text style={{ color: theme.mutedText, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 12, marginTop: 8 }}>
      {title}
    </Text>
  );
}

// Settings Item Component
function SettingsItem({ icon, label, onPress, theme }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ 
        backgroundColor: theme.surface, 
        borderWidth: 1, 
        borderColor: theme.border,
        borderRadius: 16, 
        padding: 16, 
        flexDirection: 'row', 
        alignItems: 'center',
        marginBottom: 24
      }}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={22} color={theme.accent} />
      <Text style={{ color: theme.text, fontSize: 16, marginLeft: 12, flex: 1 }}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={theme.mutedText} />
    </TouchableOpacity>
  );
}

// Language Option Component
function LanguageOption({ label, value, selected, onPress, theme, isLast = false }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ 
        backgroundColor: selected ? theme.surface2 : 'transparent',
        padding: 12,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: isLast ? 0 : 4
      }}
      activeOpacity={0.7}
    >
      <Text style={{ color: selected ? theme.text : theme.mutedText, fontSize: 15, fontWeight: selected ? '600' : '400' }}>
        {label}
      </Text>
      {selected && <Ionicons name="checkmark-circle" size={20} color={theme.accent} />}
    </TouchableOpacity>
  );
}

// Theme Option Component
function ThemeOption({ label, value, selected, onPress, theme, previewColor, isLast = false }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ 
        backgroundColor: selected ? theme.surface2 : 'transparent',
        padding: 12,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: isLast ? 0 : 4
      }}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center">
        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: previewColor, marginRight: 10 }} />
        <Text style={{ color: selected ? theme.text : theme.mutedText, fontSize: 15, fontWeight: selected ? '600' : '400' }}>
          {label}
        </Text>
      </View>
      {selected && <Ionicons name="checkmark-circle" size={20} color={theme.accent} />}
    </TouchableOpacity>
  );
}
