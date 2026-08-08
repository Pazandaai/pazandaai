-- 1) Barqaror identifikator (reseed'da favorites yo'qolmaydi)
alter table public.recipes add column if not exists slug text unique;

-- 2) Premium-gating
alter table public.recipes add column if not exists is_premium_only boolean not null default false;

-- 3) Analitika
create table if not exists public.events (
  id bigint generated always as identity primary key,
  user_id bigint,
  event text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_events_event on public.events (event);
create index if not exists idx_events_created on public.events (created_at desc);

-- 4) Admin audit
create table if not exists public.admin_logs (
  id bigint generated always as identity primary key,
  admin_id bigint,
  action text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Enable RLS for security
alter table public.events enable row level security;
alter table public.admin_logs enable row level security;
