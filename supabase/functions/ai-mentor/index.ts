import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

// Прячем CORS прямо сюда, никаких внешних импортов, которые могут сломать деплой!
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // 1. CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) throw new Error("Ключ OpenAI не найден на сервере!");

    const body = await req.json();
    const message = body.message || "Нет сообщения";
    const user_id = body.user_id || "00000000-0000-0000-0000-000000000000";

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    // 2. Изолированный сбор контекста
    let contextText = "Имя ребенка: Малыш.\n";
    try {
      const { data: profile } = await supabase.from('profiles').select('baby_name').eq('id', user_id).maybeSingle();
      if (profile?.baby_name) contextText = `Имя ребенка: ${profile.baby_name}.\n`;

      const { data: cries } = await supabase.from('cries').select('type').eq('user_id', user_id).order('created_at', { ascending: false }).limit(3);
      if (cries && cries.length > 0) contextText += `Недавние плачи: ${cries.map((c: any) => c.type).join(', ')}.\n`;
    } catch (e) {
      console.log("БД игнорируем");
    }

    // 3. Прямой запрос к OpenAI
    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: `Ты педиатр. Отвечай коротко. Контекст: ${contextText}` },
          { role: 'user', content: message }
        ],
        temperature: 0.6,
        max_tokens: 250,
      }),
    });

    const openAiData = await openAiResponse.json();
    if (!openAiResponse.ok) throw new Error(openAiData.error?.message || "Ошибка API OpenAI");

    const aiText = openAiData.choices[0].message.content;

    // 4. Отдаем результат
    return new Response(JSON.stringify({ response: aiText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    // ДАЖЕ ЕСЛИ КОД ПАДАЕТ, ОН ПРОБЬЕТСЯ В ПРИЛОЖЕНИЕ СО СТАТУСОМ 200
    return new Response(JSON.stringify({ response: `🚨 СИСТЕМА: ${error.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, 
    });
  }
});