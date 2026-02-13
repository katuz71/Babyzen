import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator, 
  StyleSheet, 
  Keyboard,
  Alert 
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons'; 
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/lib/ThemeContext'; 

export default function ChatScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { initialQuery } = useLocalSearchParams<{ initialQuery?: string }>(); 
  
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [lastProcessedQuery, setLastProcessedQuery] = useState<string | null>(null);
  
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (session) {
        const { data: msgs } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('session_id', session.id)
          .order('created_at', { ascending: true });
        if (msgs) setMessages(msgs);
      } else {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: 'Я готов помочь. Какой вопрос по малышу?',
          created_at: new Date().toISOString()
        }]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery && !loading && userId && initialQuery !== lastProcessedQuery && !sending) {
      setLastProcessedQuery(initialQuery);
      sendMessage(initialQuery);
    }
  }, [initialQuery, loading, userId, lastProcessedQuery]);

  const sendMessage = async (textToProcess?: string) => {
    const text = textToProcess || inputText.trim();
    if (!text || !userId || sending) return;

    if (!textToProcess) {
      setInputText('');
      Keyboard.dismiss();
    }

    const tempId = Date.now().toString();
    setMessages(prev => [
      ...prev, 
      { id: tempId, role: 'user', content: text, created_at: new Date().toISOString() },
      { id: tempId + '_loading', role: 'assistant', content: '', is_loading: true }
    ]);
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-mentor', {
        body: { message: text, user_id: userId }
      });
      if (error) throw error;

      setMessages(prev => {
        const filtered = prev.filter(m => !m.is_loading);
        return [...filtered, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response || 'Ошибка ответа ИИ.',
          created_at: new Date().toISOString()
        }];
      });
    } catch (e: any) {
      setMessages(prev => prev.filter(m => !m.is_loading));
      console.error("AI MENTOR ERROR:", e);
      Alert.alert('Дебаг Ошибка', e.message || JSON.stringify(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <ScreenWrapper style={{ backgroundColor: theme.bg }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* HEADER */}
        <View style={[styles.header, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <View style={[styles.avatar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="sparkles" size={18} color={theme.accent} />
            </View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>AI Педиатр</Text>
          </View>
        </View>

        <ScrollView 
          ref={scrollViewRef}
          style={styles.chatArea}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <View key={msg.id || index} style={[
                styles.bubble, 
                isUser ? styles.userBubble : styles.aiBubble,
                { 
                  backgroundColor: isUser ? theme.surface2 : theme.surface,
                  borderColor: theme.border 
                }
              ]}>
                {msg.is_loading ? (
                  <ActivityIndicator color={theme.accent} size="small" />
                ) : (
                  <Text style={[styles.text, { color: isUser ? theme.text : theme.mutedText }]}>
                    {msg.content}
                  </Text>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* INPUT */}
        <View style={[styles.inputRow, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
            placeholder="Ваш вопрос..."
            placeholderTextColor={theme.mutedText}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            onPress={() => sendMessage()}
            disabled={!inputText.trim() || sending}
            style={[styles.sendBtn, { backgroundColor: inputText.trim() ? theme.accent : theme.surface }]}
          >
            {sending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Ionicons name="arrow-up" size={24} color={inputText.trim() ? '#FFF' : theme.mutedText} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    height: 60, 
    borderBottomWidth: 1, 
    marginTop: Platform.OS === 'ios' ? 0 : 30 
  },
  backBtn: { padding: 5 },
  headerInfo: { flexDirection: 'row', alignItems: 'center', marginLeft: 15 },
  avatar: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 12, 
    borderWidth: 1 
  },
  headerTitle: { fontSize: 18, fontWeight: '900' },
  chatArea: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  bubble: { maxWidth: '85%', padding: 14, borderRadius: 20, marginBottom: 12, borderWidth: 1 },
  userBubble: { marginLeft: 'auto', borderBottomRightRadius: 4 },
  aiBubble: { marginRight: 'auto', borderBottomLeftRadius: 4 },
  text: { fontSize: 16, lineHeight: 22, fontWeight: '500' },
  inputRow: { 
    flexDirection: 'row', 
    padding: 10, 
    paddingBottom: Platform.OS === 'ios' ? 30 : 10, 
    borderTopWidth: 1, 
    alignItems: 'center' 
  },
  input: { 
    flex: 1, 
    minHeight: 44, 
    maxHeight: 100, 
    borderRadius: 22, 
    paddingHorizontal: 16, 
    paddingTop: 10, 
    paddingBottom: 10, 
    fontSize: 16, 
    borderWidth: 1, 
    marginRight: 10 
  },
  sendBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
});