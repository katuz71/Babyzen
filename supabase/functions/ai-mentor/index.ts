// @ts-nocheck - Deno Edge Function (use Deno extension for proper type checking)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

declare const Deno: any;

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    // Service role client для логирования (без RLS)
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Получаем пользователя из JWT
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const userId = user.id;

    const body = await req.json();
    const message = body.message || "Нет сообщения";

    // 2. Изолированный сбор контекста
    let contextText = "Имя ребенка: Малыш.\n";
    let userLanguage = 'en';
    try {
      const { data: profile } = await supabase.from('profiles').select('baby_name, language').eq('id', userId).maybeSingle();
      if (profile?.baby_name) contextText = `Имя ребенка: ${profile.baby_name}.\n`;
      userLanguage = profile?.language || 'en';

      const { data: cries } = await supabase.from('cries').select('type').eq('user_id', userId).order('created_at', { ascending: false }).limit(3);
      if (cries && cries.length > 0) contextText += `Недавние плачи: ${cries.map((c: any) => c.type).join(', ')}.\n`;
    } catch (e) {
      console.log("БД игнорируем");
    }

    // 3. Прямой запрос к OpenAI с логированием
    const start = Date.now();
    let tokenUsage: number | null = null;
    let openaiError: string | null = null;
    let aiText = "";

    try {
      const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { 
              role: 'system', 
              content: `You are an experienced pediatric advisor and sleep consultant.
Your responses are informational guidance only and NOT medical diagnosis.
If symptoms sound serious, recommend consulting a healthcare professional.
Keep answers under 4 short sentences.
Be calm, empathetic and confident.
Respond in this language: ${userLanguage}.

Context: ${contextText}` 
            },
            { role: 'user', content: message }
          ],
          temperature: 0.4,
          max_tokens: 250,
        }),
      });

      const openAiData = await openAiResponse.json();
      if (!openAiResponse.ok) throw new Error(openAiData.error?.message || "Ошибка API OpenAI");

      const duration = Date.now() - start;
      tokenUsage = openAiData.usage?.total_tokens ?? null;

      aiText = openAiData.choices[0].message.content;

      // Hard cap on response length
      if (aiText.length > 600) {
        aiText = aiText.slice(0, 600);
      }

      // Логирование успешного запроса (не блокирует основной flow)
      try {
        await supabaseService.from("ai_logs").insert({
          user_id: userId,
          function_name: "ai-mentor",
          duration_ms: duration,
          token_usage: tokenUsage,
          error: null,
        });
      } catch (logError) {
        console.error("Failed to log success:", logError);
      }

    } catch (error: any) {
      openaiError = String(error);
      const duration = Date.now() - start;

      // Логирование ошибки (не блокирует основной flow)
      try {
        await supabaseService.from("ai_logs").insert({
          user_id: userId,
          function_name: "ai-mentor",
          duration_ms: duration,
          token_usage: tokenUsage,
          error: openaiError,
        });
      } catch (logError) {
        console.error("Failed to log error:", logError);
      }

      throw error;
    }

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