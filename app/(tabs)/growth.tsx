import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Image, Modal, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useAppTheme } from '@/lib/ThemeContext';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

export default function GrowthScreen() {
  const { theme } = useAppTheme(); // Берем наш красный отсюда
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  // Теперь цвета категорий зависят только от твоего бренда
  const CATEGORIES = [
    { id: '1', title: 'Животные', icon: '🐾', cards: [
      { id: 'a1', term: 'ЛЕВ', img: 'https://img.freepik.com/free-vector/isolated-lion-cartoon-character_1308-132215.jpg' },
      { id: 'a2', term: 'СЛОН', img: 'https://img.freepik.com/free-vector/elephant-cartoon-character-isolated_1308-133543.jpg' },
    ]},
    { id: '2', title: 'Фрукты', icon: '🍎', cards: [
      { id: 'f1', term: 'ЯБЛОКО', img: 'https://img.freepik.com/free-vector/red-apple-isolated_1308-133345.jpg' },
    ]},
    { id: '3', title: 'Транспорт', icon: '🚗', cards: [
      { id: 't1', term: 'МАШИНА', img: 'https://img.freepik.com/free-vector/red-car-isolated_1308-133544.jpg' },
    ]}
  ];

  const renderCategory = ({ item }: { item: any }) => (
    <TouchableOpacity 
      onPress={() => { setSelectedCategory(item); setActiveCardIndex(0); }}
      style={[
        styles.categoryCard, 
        { 
          backgroundColor: theme.card, 
          borderColor: theme.border,
          // Тонкая красная полоска сверху для стиля
          borderTopColor: theme.accent, 
          borderTopWidth: 3 
        }
      ]}
    >
      <Text style={styles.categoryEmoji}>{item.icon}</Text>
      <Text style={[styles.categoryTitle, { color: theme.text }]}>{item.title}</Text>
      <Text style={[styles.categoryCount, { color: theme.sub }]}>{item.cards.length} карточек</Text>
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper style={{ backgroundColor: theme.bg }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Развитие</Text>
          <Text style={[styles.subtitle, { color: theme.sub }]}>Карточки Домана</Text>
        </View>

        <FlatList
          data={CATEGORIES}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
        />

        <Modal visible={!!selectedCategory} animationType="fade" transparent={true}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.closeOverlay} onPress={() => setSelectedCategory(null)} />
            
            {selectedCategory && (
              <View style={styles.cardViewer}>
                <View style={styles.cardContent}>
                  <Image source={{ uri: selectedCategory.cards[activeCardIndex].img }} style={styles.cardImage} resizeMode="contain" />
                  <Text style={styles.cardTerm}>{selectedCategory.cards[activeCardIndex].term}</Text>
                </View>

                <View style={styles.cardNav}>
                  <TouchableOpacity 
                    onPress={() => setActiveCardIndex(prev => prev - 1)}
                    disabled={activeCardIndex === 0}
                    style={[styles.navBtn, { backgroundColor: theme.accent }, activeCardIndex === 0 && { opacity: 0.3 }]}
                  >
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => setActiveCardIndex(prev => prev + 1)}
                    disabled={activeCardIndex === selectedCategory.cards.length - 1}
                    style={[styles.navBtn, { backgroundColor: theme.accent }, activeCardIndex === selectedCategory.cards.length - 1 && { opacity: 0.3 }]}
                  >
                    <Ionicons name="arrow-forward" size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </Modal>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { marginTop: 20, marginBottom: 30 },
  title: { fontSize: 32, fontWeight: '900' },
  subtitle: { fontSize: 16, marginTop: 5, fontWeight: '600' },
  columnWrapper: { justifyContent: 'space-between' },
  categoryCard: {
    width: (width - 55) / 2,
    borderRadius: 24,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    alignItems: 'center',
  },
  categoryEmoji: { fontSize: 40, marginBottom: 10 },
  categoryTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  categoryCount: { fontSize: 12, marginTop: 5, fontWeight: '700' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  closeOverlay: { ...StyleSheet.absoluteFillObject },
  cardViewer: { width: width, alignItems: 'center' },
  cardContent: { 
    width: width * 0.85, 
    height: width * 1.1, 
    backgroundColor: '#FFF', 
    borderRadius: 30, 
    padding: 20, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  cardImage: { width: '80%', height: '60%' },
  cardTerm: { fontSize: 42, fontWeight: '900', color: '#000', marginTop: 20 },
  cardNav: { flexDirection: 'row', marginTop: 40, gap: 30 },
  navBtn: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' }
});