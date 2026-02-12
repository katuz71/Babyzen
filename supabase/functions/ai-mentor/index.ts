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

// Хелпер 2: Относительное время (чтобы ИИ понимал контекст "только что")
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

    // 2. Данные о событиях (Кнопки Покормил/Уложил)
    const { data: logs } = await supabaseClient
      .from('logs').select('type, created_at').eq('user_id', user_id)
      .order('created_at', { ascending: false }).limit(5);

    const logContext = logs?.length 
      ? logs.map(l => {
          const t = l.type === 'feeding' ? 'Кормление' : l.type === 'sleep' ? 'Сон' : 'Подгузник';
          return `- ${t} (${getRelativeTime(l.created_at)})`;
        }).join('\n')
      : "Событий сегодня еще не было.";

    // 3. Данные о плаче
    const { data: cries } = await supabaseClient
      .from('cries').select('type, created_at').eq('user_id', user_id)
      .order('created_at', { ascending: false }).limit(2);

    const cryContext = cries?.length 
      ? cries.map(c => `- Плач "${c.type}" (${getRelativeTime(c.created_at)})`).join('\n')
      : "Записей плача пока нет.";

    // 4. Формируем "Зенитный" Промпт
    const systemPrompt = `Ты — AI-Ментор Baby Zen. Малыш: ${babyName} (${babyAge}).
    
ТЕКУЩИЙ СТАТУС (из логов):
${logContext}

ПОСЛЕДНИЕ ЗАПИСИ ПЛАЧА:
${cryContext}

ТВОЯ ЗАДАЧА:
Давай короткие (2-3 предложения) и точные советы. 
Если юзер спрашивает про сон или еду, обязательно сверяйся со списком ТЕКУЩИЙ СТАТУС. 
Например, если написано "Кормление (3 ч. назад)", значит пора кушать. Если "Сон (только что)", значит ребенок должен спать.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
    });

    const aiResponse = completion.choices[0].message.content;

    // 5. Сохраняем в историю чата (чтобы не забыть диалог)
    let { data: session } = await supabaseClient.from('chat_sessions').select('id').eq('user_id', user_id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!session) {
      const { data: newS } = await supabaseClient.from('chat_sessions').insert({ user_id, topic: 'Daily Zen' }).select().single();
      session = newS;
    }
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