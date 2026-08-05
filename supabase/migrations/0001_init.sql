create extension if not exists pgcrypto;

-- =========================
-- USERS
-- =========================
create table if not exists public.users (
    telegram_id bigint primary key,
    username text,
    first_name text,
    last_name text,
    language text not null default 'latn' check (language in ('latn', 'kyr')),
    is_premium boolean not null default false,
    premium_until timestamptz,
    is_banned boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_users_username on public.users (username);
create index if not exists idx_users_first_name on public.users (first_name);
create index if not exists idx_users_is_banned on public.users (is_banned);

-- =========================
-- PREMIUM REQUESTS / PAYMENTS
-- =========================
create table if not exists public.premium_requests (
    id uuid primary key default gen_random_uuid(),
    user_telegram_id bigint not null references public.users (telegram_id) on delete cascade,
    screenshot_url text not null,
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    admin_telegram_id bigint,
    created_at timestamptz not null default now(),
    reviewed_at timestamptz
);

create index if not exists idx_premium_requests_status on public.premium_requests (status);
create index if not exists idx_premium_requests_user on public.premium_requests (user_telegram_id);

-- =========================
-- RECIPES
-- =========================
create table if not exists public.recipes (
    id bigint generated always as identity primary key,
    category text,
    title text not null,
    description text,
    image_url text,
    cook_time_minutes int,
    difficulty text,
    servings int not null default 4,
    ingredients jsonb not null default '[]',
    steps jsonb not null default '[]',
    is_published boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_recipes_category on public.recipes (category);
create index if not exists idx_recipes_is_published on public.recipes (is_published);

-- =========================
-- LIFEHACKS
-- =========================
create table if not exists public.lifehacks (
    id bigint generated always as identity primary key,
    category text,
    title text not null,
    content text not null,
    image_url text,
    is_published boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_lifehacks_category on public.lifehacks (category);
create index if not exists idx_lifehacks_is_published on public.lifehacks (is_published);

-- =========================
-- APP SETTINGS
-- =========================
create table if not exists public.app_settings (
    key text primary key,
    value jsonb not null default '{}',
    updated_at timestamptz not null default now()
);

-- =========================
-- UPDATED AT TRIGGER
-- =========================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists recipes_updated_at on public.recipes;
create trigger recipes_updated_at
before update on public.recipes
for each row execute function public.set_updated_at();

drop trigger if exists lifehacks_updated_at on public.lifehacks;
create trigger lifehacks_updated_at
before update on public.lifehacks
for each row execute function public.set_updated_at();

drop trigger if exists app_settings_updated_at on public.app_settings;
create trigger app_settings_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

-- =========================
-- RLS
-- =========================
alter table public.users enable row level security;
alter table public.premium_requests enable row level security;
alter table public.recipes enable row level security;
alter table public.lifehacks enable row level security;
alter table public.app_settings enable row level security;

-- Anon foydalanuvchi faqat published recipe/lifehack ko'radi.
create policy public_read_recipes
on public.recipes
for select
using (is_published = true);

create policy public_read_lifehacks
on public.lifehacks
for select
using (is_published = true);
