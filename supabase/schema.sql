-- AnimAI Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ═══════════════════════════════════════
-- USERS TABLE
-- ═══════════════════════════════════════
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro', 'studio')),
  credits integer not null default 500,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can read own data"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own data"
  on public.users for update
  using (auth.uid() = id);

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═══════════════════════════════════════
-- ANIMATIONS TABLE
-- ═══════════════════════════════════════
create table public.animations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  job_id text unique,
  title text not null default 'Untitled Animation',
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  scenes_count integer not null default 1,
  resolution text not null default '720p' check (resolution in ('480p', '720p', '1080p')),
  lipsync boolean not null default false,
  final_video_url text,
  created_at timestamptz not null default now()
);

alter table public.animations enable row level security;

create policy "Users can read own animations"
  on public.animations for select
  using (auth.uid() = user_id);

create policy "Users can insert own animations"
  on public.animations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own animations"
  on public.animations for update
  using (auth.uid() = user_id);

create index idx_animations_user on public.animations(user_id);
create index idx_animations_status on public.animations(status);

-- ═══════════════════════════════════════
-- CREDIT TRANSACTIONS TABLE
-- ═══════════════════════════════════════
create table public.credit_transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  amount integer not null, -- positive = credit added, negative = credit spent
  description text not null,
  created_at timestamptz not null default now()
);

alter table public.credit_transactions enable row level security;

create policy "Users can read own transactions"
  on public.credit_transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert own transactions"
  on public.credit_transactions for insert
  with check (auth.uid() = user_id);

create index idx_transactions_user on public.credit_transactions(user_id);

-- ═══════════════════════════════════════
-- PROJECTS TABLE (draft/in-progress stories)
-- ═══════════════════════════════════════
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null default 'Untitled',
  genre text,
  style text,
  state jsonb not null default '{}',
  scenes_count integer not null default 0,
  has_videos boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "Users can read own projects" on public.projects for select using (auth.uid() = user_id);
create policy "Users can insert own projects" on public.projects for insert with check (auth.uid() = user_id);
create policy "Users can update own projects" on public.projects for update using (auth.uid() = user_id);
create policy "Users can delete own projects" on public.projects for delete using (auth.uid() = user_id);

create index idx_projects_user on public.projects(user_id);

-- Auto-update updated_at
create or replace function public.handle_project_updated()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_project_updated
  before update on public.projects
  for each row execute function public.handle_project_updated();
