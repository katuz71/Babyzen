

declare const Deno: any;

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

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

    // 1. Whisper transcription
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

    if (!gptResponse.ok) {
      const gErr = await gptResponse.text();
      console.error("GPT API Error:", gErr);
      throw new Error(`GPT API Failed: ${gErr}`);
    }

    const gptData = await gptResponse.json();
    let content = gptData.choices[0].message.content;

    // Clean up markdown code blocks if present
    content = content.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");

    console.log("GPT raw content:", content);

    let result;
    try {
      result = JSON.parse(content);
    } catch (e) {
      console.error("JSON Parse Error on GPT response:", e);
      // Fallback result if JSON is broken
      result = {
        detected_type: "Unknown",
        confidence: 0,
        reasoning: "Could not parse analysis result.",
        advice_key: "check_diaper"
      };
    }

    return new Response(JSON.stringify(result), {
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