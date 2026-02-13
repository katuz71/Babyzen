import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Switch, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text } from '@/components/Text';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/lib/ThemeContext';

const BRAND_RED = '#D00000';

export default function SettingsScreen() {
  // Убрали toggleTheme и themeName — у нас только строгий Vampire Mode
  const { theme } = useAppTheme();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  
  // Локальные стейты для инпутов
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    // ИСПРАВЛЕНИЕ: Добавили as any, чтобы строгий TS роутера не ругался на динамический путь
    if (!user) { router.replace('/(onboarding)/auth' as any); return; }
    
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) {
      setProfile(data);
      setWeight(data.weight ? data.weight.toString() : '');
      setHeight(data.height ? data.height.toString() : '');
      setPushEnabled(!!data.push_token);
    }
    setLoading(false);
  };

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await supabase.from('profiles').update({
        weight: weight ? parseFloat(weight) : null,
        height: height ? parseFloat(height) : null,
      }).eq('id', profile.id);
      Alert.alert('Готово', 'Данные малыша сохранены.');
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePushToggle = async (val: boolean) => {
    setPushEnabled(val);
    if (val) {
      Alert.alert('Push', 'Здесь мы запросим права на пуши и сохраним токен.');
    } else {
      await supabase.from('profiles').update({ push_token: null }).eq('id', profile?.id);
    }
  };

  if (loading) return <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center' }}><ActivityIndicator color={BRAND_RED} /></View>;

  return (
    <ScreenWrapper style={{ backgroundColor: theme.bg }}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Профиль & Настройки</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* БЛОК МАЛЫША */}
        <Text style={[styles.sectionTitle, { color: BRAND_RED }]}>ДАННЫЕ МАЛЫША</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
            <Text style={{ color: theme.text, fontSize: 16 }}>Имя</Text>
            <Text style={{ color: theme.sub, fontSize: 16 }}>{profile?.baby_name || 'Не указано'}</Text>
          </View>
          <View style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
            <Text style={{ color: theme.text, fontSize: 16 }}>Вес (кг)</Text>
            <TextInput 
              style={[styles.input, { color: theme.text }]} 
              keyboardType="decimal-pad" 
              value={weight} 
              onChangeText={setWeight} 
              placeholder="0.0" 
              placeholderTextColor={theme.sub} 
            />
          </View>
          <View style={styles.row}>
            <Text style={{ color: theme.text, fontSize: 16 }}>Рост (см)</Text>
            <TextInput 
              style={[styles.input, { color: theme.text }]} 
              keyboardType="decimal-pad" 
              value={height} 
              onChangeText={setHeight} 
              placeholder="0.0" 
              placeholderTextColor={theme.sub} 
            />
          </View>
        </View>

        <TouchableOpacity onPress={saveProfile} style={[styles.saveBtn, { backgroundColor: BRAND_RED }]}>
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Сохранить данные</Text>}
        </TouchableOpacity>

        {/* НАСТРОЙКИ */}
        <Text style={[styles.sectionTitle, { color: BRAND_RED, marginTop: 30 }]}>НАСТРОЙКИ</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          
          <View style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
            <View style={styles.rowLeft}>
              <Ionicons name="notifications-outline" size={20} color={theme.text} style={{ marginRight: 10 }} />
              <Text style={{ color: theme.text, fontSize: 16 }}>Умные Push-уведомления</Text>
            </View>
            <Switch value={pushEnabled} onValueChange={handlePushToggle} trackColor={{ true: BRAND_RED }} />
          </View>

          {/* ИСПРАВЛЕНИЕ: Блок со светлой темой удален навсегда! Только Vampire Mode */}

          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="language-outline" size={20} color={theme.text} style={{ marginRight: 10 }} />
              <Text style={{ color: theme.text, fontSize: 16 }}>Язык (Language)</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.sub} />
          </TouchableOpacity>
        </View>

        {/* ДОПОЛНИТЕЛЬНО */}
        <Text style={[styles.sectionTitle, { color: BRAND_RED, marginTop: 30 }]}>ПРИЛОЖЕНИЕ</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
            <Text style={{ color: theme.text, fontSize: 16 }}>Оценить Baby Zen</Text>
            <Ionicons name="star-outline" size={20} color={theme.sub} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
            <Text style={{ color: theme.text, fontSize: 16 }}>Политика конфиденциальности</Text>
            <Ionicons name="open-outline" size={20} color={theme.sub} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => supabase.auth.signOut()}>
            <Text style={{ color: BRAND_RED, fontSize: 16, fontWeight: 'bold' }}>Выйти из аккаунта</Text>
            <Ionicons name="log-out-outline" size={20} color={BRAND_RED} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 60, borderBottomWidth: 1 },
  backBtn: { padding: 5 },
  title: { fontSize: 18, fontWeight: '900' },
  scroll: { padding: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5, marginBottom: 10, marginLeft: 10 },
  card: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 20 },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  input: { fontSize: 16, textAlign: 'right', minWidth: 80 },
  saveBtn: { paddingVertical: 16, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: BRAND_RED, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
});