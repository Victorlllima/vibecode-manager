-- Habilitar UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES (opcional, mas recomendado para extender dados do user)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  username text,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone
);

-- PROJECTS
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  description text,
  github_repo_id bigint, -- ID numérico do repo no GitHub
  github_repo_full_name text, -- "owner/repo"
  github_repo_url text,
  status text check (status in ('active', 'archived')) default 'active',
  days_inactive int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- PHASES
create table public.phases (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  order_index int not null,
  status text check (status in ('pending', 'in_progress', 'paused', 'blocked', 'completed')) default 'pending',
  subtasks_total int default 0,
  subtasks_completed int default 0,
  completion_percentage int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SUBTASKS
create table public.subtasks (
  id uuid default uuid_generate_v4() primary key,
  phase_id uuid references public.phases(id) on delete cascade not null,
  title text not null,
  is_completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- NOTES
create table public.notes (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- WEBHOOK LOGS (Auditoria)
create table public.github_webhooks_log (
  id uuid default uuid_generate_v4() primary key,
  payload jsonb,
  processed boolean default false,
  error_message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS (Row Level Security)
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.phases enable row level security;
alter table public.subtasks enable row level security;
alter table public.notes enable row level security;

-- POLICIES (Simplificadas para o dono dos dados)
-- Projects
create policy "Users can view own projects" on projects for select using (auth.uid() = user_id);
create policy "Users can insert own projects" on projects for insert with check (auth.uid() = user_id);
create policy "Users can update own projects" on projects for update using (auth.uid() = user_id);
create policy "Users can delete own projects" on projects for delete using (auth.uid() = user_id);

-- Phases (Baseado no project_id -> user_id)
create policy "Users can manage phases of own projects" on phases for all using (
  exists ( select 1 from projects where id = phases.project_id and user_id = auth.uid() )
);

-- Subtasks
create policy "Users can manage subtasks of own projects" on subtasks for all using (
  exists ( 
    select 1 from phases 
    join projects on projects.id = phases.project_id 
    where phases.id = subtasks.phase_id and projects.user_id = auth.uid() 
  )
);

-- Notes
create policy "Users can manage notes of own projects" on notes for all using (
  exists ( select 1 from projects where id = notes.project_id and user_id = auth.uid() )
);

-- FUNCTIONS & TRIGGERS
-- Auto-update updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

create trigger update_projects_updated_at before update on projects for each row execute procedure update_updated_at_column();
create trigger update_phases_updated_at before update on phases for each row execute procedure update_updated_at_column();
create trigger update_subtasks_updated_at before update on subtasks for each row execute procedure update_updated_at_column();
