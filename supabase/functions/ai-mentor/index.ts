import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.28.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Хелпер 1: Расчет возраста
function calculateAge(birthDate: string) {
  const dob = new Date(birthDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - dob.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return `${diffDays} дн.`;
  const weeks = Math.floor(diffDays / 7);
  if (weeks < 8) return `${weeks} нед.`;
  const months = Math.floor(diffDays / 30.44);
  return `${months} мес.`;
}

// Хелпер 2: Относительное время
function getRelativeTime(dateString: string) {
  const now = new Date();
  const past = new Date(dateString);
  const diffMins = Math.floor((now.getTime() - past.getTime()) / 60000);
  if (diffMins < 1) return "только что";
  if (diffMins < 60) return `${diffMins} мин. назад`;
  const hours = Math.floor(diffMins / 60);
  return `${hours} ч. назад`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { message, user_id } = await req.json();
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

    // 1. Данные профиля
    const { data: profile } = await supabaseClient
      .from('profiles').select('baby_name, baby_dob').eq('id', user_id).single();
    
    const babyName = profile?.baby_name || 'Малыш';
    const babyAge = profile?.baby_dob ? calculateAge(profile.baby_dob) : 'неизвестного возраста';

    // 2. Данные о событиях (Парсим наши новые типы логов)
    const { data: logs } = await supabaseClient
      .from('logs').select('type, created_at').eq('user_id', user_id)
      .order('created_at', { ascending: false }).limit(8);

    let sleepState = "Бодрствует";
    let sleepStateTime = "";

    const formattedLogs = [];
    if (logs && logs.length > 0) {
      // Определяем статус сна по самому свежему логу сна
      const latestSleepLog = logs.find(l => l.type === 'sleep_start' || l.type === 'sleep_wake');
      if (latestSleepLog) {
          if (latestSleepLog.type === 'sleep_start') {
              sleepState = "Спит";
              sleepStateTime = `(уже ${getRelativeTime(latestSleepLog.created_at)})`;
          } else {
              sleepState = "Бодрствует";
              sleepStateTime = `(проснулся ${getRelativeTime(latestSleepLog.created_at)})`;
          }
      }

      // Форматируем список событий для GPT
      logs.forEach(l => {
        let t = l.type;
        if (l.type === 'feeding') t = '🍼 Кормление';
        else if (l.type === 'sleep_start') t = '😴 Уснул';
        else if (l.type === 'sleep_wake') t = '☀️ Проснулся';
        else if (l.type === 'diaper') t = '🧷 Смена подгузника';
        formattedLogs.push(`- ${t} (${getRelativeTime(l.created_at)})`);
      });
    }

    const logContext = formattedLogs.length ? formattedLogs.join('\n') : "Событий сегодня еще не было.";

    // 3. Данные о плаче
    const { data: cries } = await supabaseClient
      .from('cries').select('type, confidence, reasoning, created_at').eq('user_id', user_id)
      .order('created_at', { ascending: false }).limit(3);

    const cryContext = cries?.length 
      ? cries.map(c => `- Плач "${c.type}" (Точность: ${Math.round(c.confidence * 100)}%, ${getRelativeTime(c.created_at)})`).join('\n')
      : "Записей плача пока нет.";

    // 4. Подтягиваем ИСТОРИЮ ЧАТА из БД (Память ИИ)
    let { data: session } = await supabaseClient
      .from('chat_sessions').select('id')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1).maybeSingle();
    
    let chatHistory: any[] = [];
    
    if (!session) {
      const { data: newS } = await supabaseClient.from('chat_sessions').insert({ user_id, topic: 'Daily Zen' }).select().single();
      session = newS;
    } else {
      // Достаем последние 6 сообщений для контекста
      const { data: pastMsgs } = await supabaseClient.from('chat_messages')
          .select('role, content')
          .eq('session_id', session.id)
          .order('created_at', { ascending: false })
          .limit(6);
      
      if (pastMsgs) {
          // Переворачиваем массив, чтобы старые сообщения шли первыми
          chatHistory = pastMsgs.reverse().map(m => ({ role: m.role, content: m.content }));
      }
    }

    // 5. Формируем "Зенитный" Промпт
    const systemPrompt = `Ты — AI-Ментор Baby Zen, опытный педиатр и консультант по сну.
Твой тон: спокойный, эмпатичный, уверенный.
Имя малыша: ${babyName} (${babyAge}).
Текущее состояние: ${sleepState} ${sleepStateTime}.

ХРОНОЛОГИЯ СОБЫТИЙ СЕГОДНЯ:
${logContext}

ПОСЛЕДНИЕ АНАЛИЗЫ ПЛАЧА:
${cryContext}

ТВОЯ ЗАДАЧА:
1. Давай короткие (3-4 предложения) и предельно конкретные советы.
2. Опирайся на хронологию. Если малыш спит — учитывай это. Если плачет от голода и с последнего кормления прошло больше 2-3 часов — рекомендуй покормить.
3. Не пиши общие фразы. Действуй как личный врач, который смотрит в медкарту.`;

    // 6. Вызов OpenAI с полной историей сообщений
    const messagesToSend = [
      { role: "system", content: systemPrompt },
      ...chatHistory, // Вставляем предыдущий диалог
      { role: "user", content: message } // Добавляем новый вопрос
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messagesToSend,
    });

    const aiResponse = completion.choices[0].message.content;

    // 7. Сохраняем новый вопрос и ответ в историю
    await supabaseClient.from('chat_messages').insert([
      { session_id: session.id, role: 'user', content: message },
      { session_id: session.id, role: 'assistant', content: aiResponse }
    ]);

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: corsHeaders,
    });
  }
});