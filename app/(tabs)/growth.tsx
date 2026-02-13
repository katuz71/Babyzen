import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Modal, Dimensions, Image, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text } from '@/components/Text';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Данные карточек (позже ты сможешь заменить картинки на свои из папки assets)
const CARD_DATA: any = {
  animals: [
    { id: 1, title: 'ЛЕВ', icon: '🦁', color: '#FFB347' },
    { id: 2, title: 'СЛОН', icon: '🐘', color: '#A2C2E1' },
    { id: 3, title: 'ЖИРАФ', icon: '🦒', color: '#FDFD96' },
  ],
  fruits: [
    { id: 1, title: 'ЯБЛОКО', icon: '🍎', color: '#FF6961' },
    { id: 2, title: 'БАНАН', icon: '🍌', color: '#FDFD96' },
    { id: 3, title: 'АРБУЗ', icon: '🍉', color: '#77DD77' },
  ],
  shapes: [
    { id: 1, title: 'КРУГ', icon: '🔴', color: '#FF6961' },
    { id: 2, title: 'КВАДРАТ', icon: '🟦', color: '#779ECB' },
    { id: 3, title: 'ЗВЕЗДА', icon: '⭐', color: '#FDFD96' },
  ],
};

const CATEGORIES = [
  { id: 'animals', title: 'Животные', icon: '🐾', count: '3 карты', color: '#FF7E5F' },
  { id: 'fruits', title: 'Фрукты', icon: '🍎', count: '3 карты', color: '#FEB47B' },
  { id: 'shapes', title: 'Фигуры', icon: '🟦', count: '3 карты', color: '#6A11CB' },
];

export default function GrowthScreen() {
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const openCategory = (id: string) => {
    setSelectedCategory(id);
    setViewerVisible(true);
  };

  return (
    <ScreenWrapper style={{ backgroundColor: '#0B0E14' }}>
      <ScrollView className="flex-1 px-5">
        <View className="mt-8 mb-8">
          <Text className="text-gray-500 text-xs font-bold uppercase tracking-[3px] mb-2">Интеллект</Text>
          <Text className="text-white text-3xl font-black italic">ДОМАН.ZEN</Text>
        </View>

        <View className="flex-row flex-wrap justify-between">
          {CATEGORIES.map((cat) => (
            <TouchableOpacity 
              key={cat.id} 
              onPress={() => openCategory(cat.id)}
              className="w-[47%] mb-4 active:opacity-70"
            >
              <View className="bg-[#161B22] rounded-[28px] p-5 border border-gray-900 overflow-hidden h-40 justify-center">
                <LinearGradient colors={[`${cat.color}15`, 'transparent']} className="absolute inset-0" />
                <Text className="text-3xl mb-3">{cat.icon}</Text>
                <Text className="text-white font-bold text-lg">{cat.title}</Text>
                <Text className="text-gray-500 text-[10px] font-bold uppercase mt-1">{cat.count}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View className="bg-[#161B22] p-6 rounded-[28px] border border-gray-900 mt-4 mb-10">
          <View className="flex-row items-center mb-3">
            <Ionicons name="information-circle-outline" size={20} color="#D00000" />
            <Text className="text-white font-bold ml-2 italic">МЕТОДИКА</Text>
          </View>
          <Text className="text-gray-400 text-sm leading-5">
            Быстрое предъявление карточек стимулирует правое полушарие мозга. Листайте карточки быстро, называя предмет четко.
          </Text>
        </View>
      </ScrollView>

      {/* МОДАЛКА ПРОСМОТРА КАРТОЧЕК */}
      <Modal visible={viewerVisible} animationType="fade" transparent={false}>
        <View className="flex-1 bg-white"> 
          {/* Фон белый — это классика Домана для концентрации */}
          
          {/* Header просмотра */}
          <View className="absolute top-12 left-6 right-6 z-10 flex-row justify-between items-center">
            <TouchableOpacity 
              onPress={() => setViewerVisible(false)}
              className="w-12 h-12 bg-black/5 rounded-full items-center justify-center"
            >
              <Ionicons name="close" size={28} color="black" />
            </TouchableOpacity>
            <Text className="font-bold text-gray-400 uppercase tracking-widest">
              {selectedCategory === 'animals' ? 'Животные' : selectedCategory === 'fruits' ? 'Фрукты' : 'Фигуры'}
            </Text>
            <TouchableOpacity className="w-12 h-12 bg-black/5 rounded-full items-center justify-center">
              <Ionicons name="volume-medium-outline" size={24} color="black" />
            </TouchableOpacity>
          </View>

          {/* Слайдер карточек */}
          <FlatList
            data={selectedCategory ? CARD_DATA[selectedCategory] : []}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }} className="items-center justify-center p-10">
                <Text style={{ fontSize: 150 }} className="mb-10">{item.icon}</Text>
                <Text className="text-[#D00000] text-6xl font-black text-center tracking-tighter">
                  {item.title}
                </Text>
              </View>
            )}
          />

          <View className="absolute bottom-12 w-full items-center">
             <Text className="text-gray-300 font-bold uppercase tracking-tighter">Листайте вправо →</Text>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}