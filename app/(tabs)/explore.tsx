import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const CRY_TYPES: Record<string, { emoji: string, color: string }> = {
  'Hunger': { emoji: '🍼', color: '#FF9500' },
  'Burp': { emoji: '☁️', color: '#34C759' },
  'Sleep': { emoji: '😴', color: '#5856D6' },
  'Discomfort': { emoji: '🧷', color: '#FF3B30' },
  'Gas': { emoji: '💨', color: '#AF52DE' },
  'Unknown': { emoji: '❓', color: '#8E8E93' },
};

function HistoryScreen() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cries')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) console.error(error);
    else setHistory(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchHistory(); }, []);

  const renderItem = ({ item }: { item: any }) => {
    const config = CRY_TYPES[item.type] || CRY_TYPES['Unknown'];
    const date = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const day = new Date(item.created_at).toLocaleDateString();

    return (
      <View style={styles.card}>
        <View style={[styles.emojiContainer, { backgroundColor: config.color + '20' }]}>
          <Text style={styles.emojiText}>{config.emoji}</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.typeText}>{item.type}</Text>
            <Text style={styles.timeText}>{date} · {day}</Text>
          </View>
          <Text style={styles.reasoningText} numberOfLines={2}>{item.reasoning}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#000', '#121212']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <Text style={styles.title}>Дневник</Text>
      </View>
      
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchHistory} tintColor="#FFF" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="journal-outline" size={60} color="#333" />
            <Text style={styles.emptyText}>Здесь пока пусто.{"\n"}Сделайте первый анализ!</Text>
          </View>
        }
      />
    </View>
  );
}

export default HistoryScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 25, paddingBottom: 20 },
  title: { fontSize: 34, fontWeight: '900', color: '#FFF' },
  list: { padding: 20 },
  card: { 
    flexDirection: 'row', backgroundColor: '#1C1C1E', 
    borderRadius: 20, padding: 15, marginBottom: 15, alignItems: 'center' 
  },
  emojiContainer: { 
    width: 60, height: 60, borderRadius: 30, 
    justifyContent: 'center', alignItems: 'center', marginRight: 15 
  },
  emojiText: { fontSize: 30 },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  typeText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  timeText: { color: '#666', fontSize: 13 },
  reasoningText: { color: '#999', fontSize: 14, lineHeight: 20 },
  empty: { marginTop: 100, alignItems: 'center', opacity: 0.5 },
  emptyText: { color: '#FFF', textAlign: 'center', marginTop: 15, fontSize: 16 }
});