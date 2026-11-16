-- Run once in Supabase → SQL editor.
-- Content, media list, messages and visit stats are stored as JSON documents.
create table if not exists public.kv (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.kv enable row level security;   -- no public policies: only the server (service role) can read/write

-- Public bucket for uploaded photos / PDFs (files are served directly to visitors).
insert into storage.buckets (id, name, public) values ('media', 'media', true)
on conflict (id) do nothing;
