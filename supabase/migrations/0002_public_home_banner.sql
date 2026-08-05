-- Anon kalit uchun faqat public kontentga select ruxsati
grant select on table public.recipes to anon;
grant select on table public.lifehacks to anon;
grant select on table public.app_settings to anon;

-- Home banner public read
drop policy if exists public_read_home_banner on public.app_settings;

create policy public_read_home_banner
on public.app_settings
for select
to anon
using (
  key = 'home_banner'
  and coalesce((value->>'active')::boolean, true)
);

-- Boshlang‘ich banner
insert into public.app_settings (key, value)
values (
  'home_banner',
  jsonb_build_object(
    'image_url', '',
    'title', 'Pazanda AI',
    'subtitle', 'Oilaviy oshxona yordamchisi',
    'active', true
  )
)
on conflict (key)
do update set value = excluded.value;
