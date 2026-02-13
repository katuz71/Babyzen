// @ts-nocheck - Deno Edge Function (use Deno extension for proper type checking)
import { z } from "https://deno.land/x/zod/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

declare const Deno: any;

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const CrySchema = z.object({
  detected_type: z.enum(["Hunger", "Sleep", "Discomfort", "Lower Gas", "Burp"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  advice_key: z.string(),
  soothe_sound: z.string(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("Analyze-cry function started");
    console.log("Request Content-Type:", req.headers.get("content-type"));

    if (!OPENAI_API_KEY) {
      console.error("OpenAI API Key is missing");
      throw new Error("Server configuration error: OpenAI API Key missing");
    }

    // Initialize Supabase client
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

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Authentication failed:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const userId = user.id;
    console.log("User authenticated:", userId);

    const formData = await req.formData();

    // Log keys for debugging
    const keys: string[] = [];
    for (const key of formData.keys()) {
      keys.push(key);
    }
    console.log("FormData keys received:", keys);

    const audioParam = formData.get('file');
    const userLanguage = formData.get('language') || 'en';

    if (!audioParam) {
      console.error("No 'file' key in FormData");
      return new Response(
        JSON.stringify({ error: "No file uploaded", received_keys: keys }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Проверяем, является ли полученный объект File или Blob
    let finalAudioFile: File;

    if (audioParam instanceof File) {
      finalAudioFile = audioParam;
      console.log(`Received standard File. Name: ${finalAudioFile.name}, Type: ${finalAudioFile.type}, Size: ${finalAudioFile.size}`);
    } else if ((audioParam as any) instanceof Blob) {
      const blobParam = audioParam as unknown as Blob;
      console.log(`Received Blob. Type: ${blobParam.type}, Size: ${blobParam.size}`);
      // Преобразуем Blob в File, так как FormData для OpenAI требует имя файла
      // Android часто шлет просто Blob без имени
      finalAudioFile = new File([blobParam], "audio.m4a", { type: blobParam.type || "audio/mp4" });
    } else {
      console.error("Uploaded item is not a File or Blob. Type:", typeof audioParam);
      return new Response(
        JSON.stringify({ error: "Uploaded item is not a valid File or Blob" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing final file: ${finalAudioFile.name}, Size: ${finalAudioFile.size} bytes, Type: ${finalAudioFile.type}, Language: ${userLanguage}`);

    // Rate limit check
    const today = new Date().toISOString().slice(0, 10);
    console.log("Checking rate limit for date:", today);

    const { data: usage, error: usageError } = await supabase
      .from("usage_limits")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle();

    if (usageError) {
      console.error("Error checking usage limits:", usageError);
    }

    if (usage && usage.scan_count >= 10) {
      console.log("Rate limit exceeded for user:", userId);
      return new Response(JSON.stringify({ error: "Rate limit exceeded. You have reached the maximum of 10 scans per day." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Create usage record if it doesn't exist
    if (!usage) {
      console.log("Creating new usage record for today");
      await supabase.from("usage_limits").insert({
        user_id: userId,
        date: today,
        scan_count: 0,
      });
    }

    // 1. Whisper transcription + GPT-4o Analysis с логированием
    const start = Date.now();
    let tokenUsage: number | null = null;
    let openaiError: string | null = null;
    let parsed: any;

    try {
      const arrayBuffer = await finalAudioFile.arrayBuffer();
      // Force correct MIME type for Whisper if missing/wrong
      const fileBlob = new Blob([arrayBuffer], { type: finalAudioFile.type || 'audio/mp4' });
      const whisperFormData = new FormData();
      whisperFormData.append("file", fileBlob, "audio.m4a");
      whisperFormData.append("model", "whisper-1");
      // Не ограничиваем язык транскрипции, пусть Whisper сам поймет, если там речь
      // Но промпт оставляем, чтобы он искал фонемы
      whisperFormData.append("prompt", "Baby crying sounds, phonemes: Neh, Owh, Heh, Eairh, Eh.");

      console.log("Sending to Whisper API...");
      const whisperResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` },
        body: whisperFormData,
      });

      if (!whisperResponse.ok) {
        const wErr = await whisperResponse.text();
        console.error("Whisper API Error:", wErr);
        throw new Error(`Whisper API Failed: ${wErr}`);
      }

      const whisperData = await whisperResponse.json();
      const transcript = whisperData.text || "";
      console.log("Transcript received:", transcript.substring(0, 50) + "...");

      // 2. GPT-4o Analysis
      console.log("Sending to GPT-4o...");
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
    The 'detected_type', 'advice_key', and 'soothe_sound' must remain in English.

    Style of reasoning:
    - Speak naturally, gently, and empathetically to the parent.
    - Avoid robotic phrases like "Cry with sounds". Instead use "I hear the sound..." or "The baby is making...".
    - Explain clearly why it is this specific type based on the phonemes heard.

    Return JSON only:
    {
      "detected_type": "Hunger" | "Sleep" | "Discomfort" | "Lower Gas" | "Burp",
      "confidence": 0.0 to 1.0,
      "reasoning": "Natural, comforting explanation in ${userLanguage}.",
      "advice_key": "feed_baby" | "sleep_baby" | "check_baby" | "burp_baby" | "massage_tummy",
      "soothe_sound": "white_noise" | "shushing" | "heartbeat" | "lullaby" | "nature_sounds"
    }`
            },
            {
              role: "user",
              content: `Transcript: "${transcript}"`
            }
          ]
        })
      });

      if (!gptResponse.ok) {
        const gErr = await gptResponse.text();
        console.error("GPT API Error:", gErr);
        throw new Error(`GPT API Failed: ${gErr}`);
      }

      const gptData = await gptResponse.json();
      const duration = Date.now() - start;
      tokenUsage = gptData.usage?.total_tokens ?? null;

      let content = gptData.choices[0].message.content;

      // Clean up markdown code blocks if present
      const cleaned = content
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      console.log("GPT raw content:", cleaned);

      try {
        parsed = CrySchema.parse(JSON.parse(cleaned));
      } catch (e) {
        console.error("Validation Error on GPT response:", e);
        // Fallback result if JSON is broken or invalid
        parsed = {
          detected_type: "Discomfort",
          confidence: 0.5,
          reasoning: "Fallback due to invalid AI response format.",
          advice_key: "check_baby",
          soothe_sound: "white_noise",
        };
      }

      // Логирование успешного запроса (не блокирует основной flow)
      try {
        await supabaseService.from("ai_logs").insert({
          user_id: userId,
          function_name: "analyze-cry",
          duration_ms: duration,
          token_usage: tokenUsage,
          error: null,
        });
      } catch (logError) {
        console.error("Failed to log success:", logError);
      }

      // Increment usage counter after successful AI analysis (atomic)
      console.log("Incrementing usage counter");
      await supabase.rpc("increment_usage_scan", {
        p_user_id: userId,
        p_date: today,
      });

    } catch (error: any) {
      openaiError = String(error);
      const duration = Date.now() - start;

      // Логирование ошибки (не блокирует основной flow)
      try {
        await supabaseService.from("ai_logs").insert({
          user_id: userId,
          function_name: "analyze-cry",
          duration_ms: duration,
          token_usage: tokenUsage,
          error: openaiError,
        });
      } catch (logError) {
        console.error("Failed to log error:", logError);
      }

      throw error;
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Edge Function Fatal Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});