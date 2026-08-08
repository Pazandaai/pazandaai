create table if not exists public.ai_usage (
  user_id bigint not null references public.users (telegram_id) on delete cascade,
  day date not null default current_date,
  used int not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;

-- Atomar limit: oshsa inkrement qilmaydi
create or replace function public.ai_try_consume(uid bigint, max_limit int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare cur int;
begin
  insert into ai_usage (user_id, day, used)
  values (uid, current_date, 1)
  on conflict (user_id, day) do update set used = ai_usage.used + 1
  returning used into cur;
  if cur > max_limit then
    update ai_usage set used = used - 1 where user_id = uid and day = current_date;
    return jsonb_build_object('ok', false, 'used', cur - 1);
  end if;
  return jsonb_build_object('ok', true, 'used', cur);
end; $$;

-- Server xatosida kvotani qaytarish
create or replace function public.ai_refund(uid bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  update ai_usage set used = greatest(0, used - 1)
  where user_id = uid and day = current_date;
end; $$;
