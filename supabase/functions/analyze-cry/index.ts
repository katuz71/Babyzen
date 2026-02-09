import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!OPENAI_API_KEY) throw new Error("OpenAI API Key is missing");

    const formData = await req.formData();
    const audioFile = formData.get('file');
    // Получаем язык от клиента, или ставим английский по умолчанию
    const userLanguage = formData.get('language') || 'en'; 

    if (!audioFile) throw new Error("No file uploaded");

    console.log(`Processing file in language: ${userLanguage}`);

    // 1. Whisper (Транскрипция всегда лучше работает с en hint, но понимает все)
    // @ts-ignore
    const arrayBuffer = await audioFile.arrayBuffer();
    const fileBlob = new Blob([arrayBuffer], { type: 'audio/m4a' });

    const whisperFormData = new FormData();
    whisperFormData.append("file", fileBlob, "audio.m4a");
    whisperFormData.append("model", "whisper-1");
    
    // Не ограничиваем язык транскрипции, пусть Whisper сам поймет, если там речь
    // Но промпт оставляем, чтобы он искал фонемы
    whisperFormData.append("prompt", "Baby crying sounds, phonemes: Neh, Owh, Heh, Eairh, Eh.");

    const whisperResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` },
      body: whisperFormData,
    });

    const whisperData = await whisperResponse.json();
    if (!whisperResponse.ok) throw new Error(`Whisper Error: ${whisperData.error?.message}`);
    
    const transcript = whisperData.text;

    // 2. GPT-4o (Анализ на ЯЗЫКЕ ПОЛЬЗОВАТЕЛЯ)
    const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a supportive, expert pediatrician specializing in Dunstan Baby Language. 
    Analyze the cry transcript. 
    
    IMPORTANT: Output the 'reasoning' field in the following language: "${userLanguage}".
    The 'detected_type' and 'advice_key' must remain in English.

    Style of reasoning:
    - Speak naturally, gently, and empathetically to the parent.
    - Avoid robotic phrases like "Cry with sounds". Instead use "I hear the sound..." or "The baby is making...".
    - Explain clearly why it is this specific type based on the phonemes heard.

    Return JSON only:
    {
      "detected_type": "Hunger" | "Sleep" | "Discomfort" | "Gas" | "Burp" | "Unknown",
      "confidence": 0.0 to 1.0,
      "reasoning": "Natural, comforting explanation in ${userLanguage}.",
      "advice_key": "feed_baby" | "sleep_baby" | "check_diaper" | "burp_baby" | "massage_tummy"
    }`
          },
          {
            role: "user",
            content: `Transcript: "${transcript}"`
          }
        ]
      })
    });

    const gptData = await gptResponse.json();
    let content = gptData.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(content);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});