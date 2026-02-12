import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text } from '@/components/Text';
import { supabase } from '@/lib/supabase';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  // Загружаем историю при открытии вкладки
  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Находим последнюю сессию
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (session) {
        // 2. Загружаем все сообщения этой сессии
        const { data: msgs, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('session_id', session.id)
          .order('created_at', { ascending: true });

        if (msgs) setMessages(msgs);
      }
    } catch (e) {
      console.log('Error loading history:', e);
    } finally {
      setFetching(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsgText = input.trim();
    setInput('');
    
    // Оптимистично добавляем сообщение юзера на экран
    const tempId = Date.now().toString();
    setMessages(prev => [...prev, { id: tempId, role: 'user', content: userMsgText }]);
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('ai-mentor', {
        body: { message: userMsgText, user_id: user?.id }
      });

      if (error) throw error;
      
      // Добавляем ответ AI на экран
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: data.response 
      }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { id: 'err', role: 'assistant', content: '⚠️ Ошибка связи. Попробуйте еще раз.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <View className="flex-1 bg-black">
        {/* Header */}
        <View className="p-4 border-b border-gray-900">
          <Text className="text-xl font-bold text-white">AI Mentor</Text>
        </View>

        {fetching ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#D00000" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => (
              <View className={`my-2 max-w-[85%] rounded-2xl p-4 ${
                item.role === 'user' 
                  ? 'bg-[#222] self-end rounded-tr-none' 
                  : 'bg-[#111] border border-gray-800 self-start rounded-tl-none'
              }`}>
                <Text className="text-gray-200">{item.content}</Text>
              </View>
            )}
            ListEmptyComponent={
              <View className="items-center justify-center mt-20 opacity-30">
                <Ionicons name="chatbubbles-outline" size={64} color="gray" />
                <Text className="text-gray-500 mt-4 text-center">Задайте вопрос о вашем малыше...</Text>
              </View>
            }
          />
        )}

        {/* Input */}
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          className="absolute bottom-0 w-full bg-black border-t border-gray-900 p-4"
        >
          <View className="flex-row items-center gap-3">
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Спроси BabyZen..."
              placeholderTextColor="#555"
              className="flex-1 bg-[#1C1C1E] text-white p-4 rounded-full text-base"
              multiline
            />
            <TouchableOpacity 
              onPress={sendMessage} 
              disabled={loading} 
              className={`w-12 h-12 rounded-full items-center justify-center ${loading ? 'bg-gray-800' : 'bg-[#D00000]'}`}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="arrow-up" size={24} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </ScreenWrapper>
  );
}