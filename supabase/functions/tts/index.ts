// ============================================================================
// TypeFlow — `tts` Edge Function
// Get-or-create cached pronunciation audio (Amazon Polly) + word translation
// (MyMemory) for a batch of words. Secrets (AWS + service role) live here, never
// in the browser. The browser calls this with the public anon key.
//
// Request  : POST { words: string[], accent: "us"|"gb", translateTo: string }
// Response : { results: [{ word, audioUrl, translation }] }
//
// Required function secrets (set via `supabase secrets set`):
//   SB_URL                  = your Supabase project URL
//   SB_SERVICE_ROLE_KEY     = service-role key (bypasses RLS)
//   AWS_ACCESS_KEY_ID
//   AWS_SECRET_ACCESS_KEY
//   AWS_REGION              = e.g. eu-west-1
// ============================================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import { PollyClient, SynthesizeSpeechCommand } from "npm:@aws-sdk/client-polly@3";

const BUCKET = "word-audio";
// Default Polly neural voices per accent (change freely).
const VOICE: Record<string, string> = { us: "Joanna", gb: "Amy" };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const supabase = createClient(
  Deno.env.get("SB_URL")!,
  Deno.env.get("SB_SERVICE_ROLE_KEY")!,
);

const polly = new PollyClient({
  region: Deno.env.get("AWS_REGION") ?? "us-east-1",
  credentials: {
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID")!,
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
  },
});

const normalize = (w: string) => w.toLowerCase().trim().replace(/[^\p{L}\p{M}'’\-]/gu, "");

async function getOrCreateAudio(word: string, accent: string): Promise<string | null> {
  const path = `${accent}/${encodeURIComponent(word)}.mp3`;
  // already cached?
  const { data: row } = await supabase
    .from("word_audio").select("audio_path").eq("word", word).eq("accent", accent).maybeSingle();
  if (!row) {
    const voice = VOICE[accent] ?? "Joanna";
    const out = await polly.send(new SynthesizeSpeechCommand({
      Text: word, OutputFormat: "mp3", VoiceId: voice as never, Engine: "neural",
    }));
    const bytes = await out.AudioStream!.transformToByteArray();
    const up = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: "audio/mpeg", upsert: true });
    if (up.error) throw up.error;
    await supabase.from("word_audio").insert({ word, accent, audio_path: path, voice });
  }
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function getOrCreateTranslation(word: string, lang: string): Promise<string | null> {
  const { data: row } = await supabase
    .from("word_translations").select("translation").eq("word", word).eq("lang", lang).maybeSingle();
  if (row) return row.translation;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|${lang}`;
  const tr = await fetch(url).then((r) => r.json()).then((d) => d?.responseData?.translatedText || null);
  if (tr) await supabase.from("word_translations").insert({ word, lang, translation: tr });
  return tr;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { words = [], accent = "us", translateTo = "ar" } = await req.json();
    const acc = accent === "gb" ? "gb" : "us";
    const unique = [...new Set((words as string[]).map(normalize).filter(Boolean))].slice(0, 80);

    const results = await Promise.all(unique.map(async (word) => {
      const [audioUrl, translation] = await Promise.all([
        getOrCreateAudio(word, acc).catch(() => null),
        getOrCreateTranslation(word, translateTo).catch(() => null),
      ]);
      return { word, audioUrl, translation };
    }));

    return json({ results });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
