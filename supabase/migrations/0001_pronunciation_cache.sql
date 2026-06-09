-- ============================================================================
-- TypeFlow — pronunciation + translation cache
-- Two tables (audio is per word+accent; translation is per word+language) so we
-- never duplicate audio across languages. Public READ for everyone; WRITES only
-- happen from the `tts` Edge Function via the service-role key (which bypasses
-- RLS), so the browser can never insert/spam rows directly.
-- ============================================================================

-- ---- word_audio : one row per (word, accent) ------------------------------
create table if not exists public.word_audio (
  id          uuid primary key default gen_random_uuid(),
  word        text not null,
  accent      text not null check (accent in ('us', 'gb')),
  audio_path  text not null,                -- path inside the 'word-audio' bucket
  voice       text,                         -- Polly VoiceId used
  created_at  timestamptz not null default now(),
  unique (word, accent)
);

-- ---- word_translations : one row per (word, target language) --------------
create table if not exists public.word_translations (
  id          uuid primary key default gen_random_uuid(),
  word        text not null,
  lang        text not null,                -- target language code: ar / fr / es / de / tr
  translation text not null,
  created_at  timestamptz not null default now(),
  unique (word, lang)
);

-- ---- Row Level Security ----------------------------------------------------
alter table public.word_audio        enable row level security;
alter table public.word_translations enable row level security;

-- Anyone (anonymous key) may READ the caches.
drop policy if exists "public read word_audio" on public.word_audio;
create policy "public read word_audio"
  on public.word_audio for select using (true);

drop policy if exists "public read word_translations" on public.word_translations;
create policy "public read word_translations"
  on public.word_translations for select using (true);

-- No INSERT/UPDATE/DELETE policies are defined for the anon/authenticated roles,
-- so only the service role (used inside the Edge Function) can write.

-- ---- Public storage bucket for the mp3 files -------------------------------
insert into storage.buckets (id, name, public)
values ('word-audio', 'word-audio', true)
on conflict (id) do nothing;

-- Public read of objects in the bucket; uploads happen via the service role.
drop policy if exists "public read word-audio objects" on storage.objects;
create policy "public read word-audio objects"
  on storage.objects for select
  using (bucket_id = 'word-audio');
