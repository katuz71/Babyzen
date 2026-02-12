import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.28.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Хелпер для расчета возраста (добавь его сюда)
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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { message, user_id } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

    // 1. Сессия чата
    let { data: session } = await supabaseClient
      .from('chat_sessions')
      .select('id')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      const { data: newSession, error: sError } = await supabaseClient
        .from('chat_sessions')
        .insert({ user_id, topic: 'Консультация' })
        .select()
        .single();
      if (sError) throw sError;
      session = newSession;
    }

    // 2. Сохраняем вопрос пользователя
    await supabaseClient.from('chat_messages').insert({
      session_id: session.id,
      role: 'user',
      content: message
    });

    // 3. Собираем контекст (ИСПРАВЛЕНО ЗДЕСЬ)
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('baby_name, baby_dob')
      .eq('id', user_id)
      .single();

    // Объявляем переменные, которые используем в промпте
    const babyName = profile?.baby_name || 'Малыш';
    const babyAge = profile?.baby_dob ? calculateAge(profile.baby_dob) : 'неизвестного возраста';

    const { data: cries } = await supabaseClient
      .from('cries')
      .select('type, created_at')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(3);

    const cryContext = cries?.length 
      ? cries.map(c => `- ${new Date(c.created_at).toLocaleTimeString()}: ${c.type}`).join('\n')
      : "История плача пуста.";

    // 4. Запрос к GPT-4o
    const systemPrompt = `Ты — эмпатичный AI-Ментор приложения Baby Zen. 
Ты консультируешь родителей малыша по имени ${babyName}. 
Возраст малыша: ${babyAge}.

ПОСЛЕДНИЕ ЗАПИСИ ПЛАЧА:
${cryContext}

Твоя задача: отвечать кратко (2-3 предложения), давать советы по уходу и ОБЯЗАТЕЛЬНО иногда упоминать возраст или имя ребенка, чтобы ответ был персонализированным.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
    });

    const aiResponse = completion.choices[0].message.content;

    // 5. Сохраняем ответ AI
    await supabaseClient.from('chat_messages').insert({
      session_id: session.id,
      role: 'assistant',
      content: aiResponse
    });

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Mentor Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});