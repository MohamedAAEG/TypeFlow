// ============================================================================
// TypeFlow — `tts` Edge Function
// Get-or-create cached pronunciation audio (Google Cloud Text-to-Speech) +
// word translation (MyMemory) for a batch of words. Secrets stay here, never in
// the browser. The browser calls this with the public anon key.
//
// Request  : POST { words: string[], accent: "us"|"gb", translateTo: string }
// Response : { results: [{ word, audioUrl, translation }] }
//
// Required function secrets (set via `supabase secrets set`):
//   SB_URL               = your Supabase project URL
//   SB_SERVICE_ROLE_KEY  = service-role key (bypasses RLS)
//   GOOGLE_TTS_API_KEY   = Google Cloud API key restricted to the
//                          Cloud Text-to-Speech API
//
// (To use Azure instead, only `synthesize()` needs to change.)
// ============================================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "word-audio";
// Google Neural2 voices per accent (change freely).
const VOICE: Record<string, { lang: string; name: string }> = {
  us: { lang: "en-US", name: "en-US-Neural2-F" },
  gb: { lang: "en-GB", name: "en-GB-Neural2-A" },
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const supabase = createClient(Deno.env.get("SB_URL")!, Deno.env.get("SB_SERVICE_ROLE_KEY")!);

const normalize = (w: string) => w.toLowerCase().trim().replace(/[^\p{L}\p{M}'’\-]/gu, "");

// --- Google Cloud Text-to-Speech (REST, API key) ---------------------------
async function synthesize(word: string, accent: string): Promise<Uint8Array> {
  const v = VOICE[accent] ?? VOICE.us;
  const key = Deno.env.get("GOOGLE_TTS_API_KEY")!;
  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text: word },
      voice: { languageCode: v.lang, name: v.name },
      audioConfig: { audioEncoding: "MP3" },
    }),
  });
  if (!res.ok) throw new Error("google tts " + res.status + " " + (await res.text()));
  const { audioContent } = await res.json();
  const bin = atob(audioContent);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function getOrCreateAudio(word: string, accent: string): Promise<string | null> {
  const path = `${accent}/${encodeURIComponent(word)}.mp3`;
  const { data: row } = await supabase
    .from("word_audio").select("audio_path").eq("word", word).eq("accent", accent).maybeSingle();
  if (!row) {
    const bytes = await synthesize(word, accent);
    const up = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: "audio/mpeg", upsert: true });
    if (up.error) throw up.error;
    await supabase.from("word_audio").insert({ word, accent, audio_path: path, voice: (VOICE[accent] ?? VOICE.us).name });
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
