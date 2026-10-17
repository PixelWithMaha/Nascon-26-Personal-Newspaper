-- 0001_init.sql

-- 1. PREFERENCES
create table if not exists public.preferences (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  display_name     text,
  topics           jsonb  not null default '[]'::jsonb,   -- [{ name, weight }]
  keywords         text[] not null default '{}',
  blocked_keywords text[] not null default '{}',
  sources          jsonb  not null default '[]'::jsonb,   -- [{ type, url }]
  reading_minutes  int    not null default 5 check (reading_minutes between 1 and 60),
  timezone         text   not null default 'UTC',
  learned_summary  text   not null default '',
  updated_at       timestamptz not null default now()
);

-- 2. EDITIONS
create table if not exists public.editions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  edition_date date not null,
  status       text not null default 'generating'
               check (status in ('generating', 'ready', 'failed')),
  payload      jsonb,
  pdf_path     text,
  created_at   timestamptz not null default now(),
  unique (user_id, edition_date)
);

-- 3. FEEDBACK
create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  edition_id uuid not null references public.editions(id) on delete cascade,
  story_id   text not null,
  topic      text not null,
  signal     text not null
             check (signal in ('like','dislike','skip','less_like_this','click','read')),
  value      numeric check (value is null or value >= 0),
  created_at timestamptz not null default now()
);

create index if not exists feedback_user_recent_idx
  on public.feedback (user_id, created_at desc);
create index if not exists feedback_edition_idx
  on public.feedback (edition_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists preferences_updated_at on public.preferences;
create trigger preferences_updated_at
  before update on public.preferences
  for each row execute function public.set_updated_at();

-- RLS
alter table public.preferences enable row level security;
alter table public.editions    enable row level security;
alter table public.feedback    enable row level security;

-- preferences: reader owns them fully
drop policy if exists "prefs_own_all" on public.preferences;
create policy "prefs_own_all" on public.preferences
  for all to authenticated
  using      ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- editions: read-only for the reader; server writes with service role
drop policy if exists "editions_own_select" on public.editions;
create policy "editions_own_select" on public.editions
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- feedback: reader can add and read their own signals
drop policy if exists "feedback_own_select" on public.feedback;
create policy "feedback_own_select" on public.feedback
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "feedback_own_insert" on public.feedback;
create policy "feedback_own_insert" on public.feedback
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- STORAGE: private bucket, files at papers/<user_id>/<edition_date>.pdf
insert into storage.buckets (id, name, public)
values ('papers', 'papers', false)
on conflict (id) do nothing;

drop policy if exists "papers_own_read" on storage.objects;
create policy "papers_own_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'papers'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );