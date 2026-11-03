-- Long videos (YouTube, 16:9): one row per project so users can list and resume them.
-- The project's content (script, shot plan, art, parts) lives on the video server (R2: long/<id>/state.json).
create table if not exists public.video_projects (
  id text primary key,                         -- the video server's project id
  user_id uuid references public.users(id) on delete cascade not null,
  template text not null default 'flat-explainer',
  title text not null default 'Untitled video',
  status text not null default 'planning',     -- planning | awaiting_approval | producing | completed | failed
  minutes integer not null default 5,
  credits integer not null default 0,          -- charged on approval
  thumbnail_url text,
  final_video_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists video_projects_user on public.video_projects (user_id, updated_at desc);
alter table public.video_projects enable row level security;
create policy "Users read own video projects" on public.video_projects for select using (auth.uid() = user_id);
create policy "Users insert own video projects" on public.video_projects for insert with check (auth.uid() = user_id);
create policy "Users update own video projects" on public.video_projects for update using (auth.uid() = user_id);
