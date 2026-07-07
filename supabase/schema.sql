-- US Grid Explorer: automated daily research articles
-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).

create table if not exists public.watch_articles (
  id text primary key,
  title text not null,
  source_name text not null,
  source_type text default 'media',
  source_tier int,
  url text not null unique,
  published_date date,
  summary text not null,
  why_it_matters text,
  tags jsonb not null default '[]'::jsonb,
  corroborating_sources jsonb not null default '[]'::jsonb,
  importance_score int default 70,
  model text,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists watch_articles_published_idx
  on public.watch_articles (status, published_date desc, created_at desc);

-- Row Level Security: the public (anon key) may only read published rows.
-- Writes happen exclusively through the service-role key in GitHub Actions.
alter table public.watch_articles enable row level security;

drop policy if exists "public read published articles" on public.watch_articles;
create policy "public read published articles"
  on public.watch_articles
  for select
  to anon
  using (status = 'published');
