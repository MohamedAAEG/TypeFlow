// ============================================================================
// TypeFlow — `tts` Edge Function  (Phase 1: voice only, no server storage)
//
// Thin secure proxy: word + accent -> Google Cloud TTS audio (base64 mp3).
// The Google key stays here (never in the browser). The browser caches the
// audio per-device (IndexedDB). Shared server-side storage comes in a later
// phase (see supabase/migrations + BACKEND_SETUP.md).
//
// Request  : POST { words: string[], accent: "us"|"gb" }
// Response : { results: [{ word, audioBase64 }] }
//
// Required secret:  GOOGLE_TTS_API_KEY  (Google Cloud API key, restricted to
//                   the Cloud Text-to-Speech API)
// (To use Azure instead, only synthesizeBase64() changes.)
// ============================================================================
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

const normalize = (w: string) => w.toLowerCase().trim().replace(/[^\p{L}\p{M}'’\-]/gu, "");

// Google Cloud Text-to-Speech (REST, API key) → base64 mp3.
async function synthesizeBase64(word: string, accent: string): Promise<string | null> {
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
  const data = await res.json();
  return data.audioContent ?? null; // already base64 mp3
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { words = [], accent = "us" } = await req.json();
    const acc = accent === "gb" ? "gb" : "us";
    const unique = [...new Set((words as string[]).map(normalize).filter(Boolean))].slice(0, 80);

    const results = await Promise.all(unique.map(async (word) => {
      try { return { word, audioBase64: await synthesizeBase64(word, acc) }; }
      catch (_) { return { word, audioBase64: null }; }
    }));

    return json({ results });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
