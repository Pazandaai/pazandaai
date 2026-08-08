-- ========================================================
-- PAZANDA AI: SUPABASE SECURITY & RLS AUDIT FIX (0004)
-- Resolves all Supabase Linter Critical & Warning Issues
-- ========================================================

-- 1) Enable RLS on public.admin_logs & public.events (Fixes CRITICAL: RLS Disabled in Public)
alter table public.admin_logs enable row level security;
alter table public.events enable row level security;

-- 2) Fix Function Search Path Mutable warning
alter function public.set_updated_at() set search_path = public;

-- 3) Fix RLS Enabled No Policy warnings (Explicit security policies)

-- admin_logs: Restricted to service_role (via backend/Vercel serverless)
drop policy if exists service_role_admin_logs on public.admin_logs;
create policy service_role_admin_logs on public.admin_logs for all using (false);

-- events: Allow anon to insert analytics event, restrict select/update/delete
drop policy if exists allow_anon_insert_events on public.events;
create policy allow_anon_insert_events on public.events for insert with check (true);

-- premium_requests: Restricted to service_role (via Vercel backend)
drop policy if exists service_role_premium_requests on public.premium_requests;
create policy service_role_premium_requests on public.premium_requests for all using (false);

-- users: Restricted to service_role (via Vercel backend)
drop policy if exists service_role_users on public.users;
create policy service_role_users on public.users for all using (false);

-- app_settings: Restricted to service_role
drop policy if exists service_role_app_settings on public.app_settings;
create policy service_role_app_settings on public.app_settings for all using (false);

-- 4) Verify RLS on recipes & lifehacks (allow public read published items)
alter table public.recipes enable row level security;
alter table public.lifehacks enable row level security;

drop policy if exists public_read_recipes on public.recipes;
create policy public_read_recipes on public.recipes for select using (is_published = true);

drop policy if exists public_read_lifehacks on public.lifehacks;
create policy public_read_lifehacks on public.lifehacks for select using (is_published = true);
