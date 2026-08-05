# 📖 Pazanda AI — To'liq Proekt Master Manba Kodi (.md)

Ushbu fayl Pazanda AI Telegram Bot, React WebApp va Supabase ma'lumotlar bazasining barcha fayllari manba kodini o'z ichiga oladi.

## 📄 supabase/migrations/0001_init.sql

`sql
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

`

---

## 📄 supabase/migrations/0002_public_home_banner.sql

`sql
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

`

---

## 📄 bot/app/config.py

`python
from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Pazanda AI bot sozlamalari.

    Barcha maxfiy qiymatlar faqat environment variable orqali o'qiladi.
    Kod ichida hardcoded qiymat bo'lmasligi kerak.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # =========================
    # BOT
    # =========================
    BOT_TOKEN: SecretStr
    ADMIN_ID: int = Field(gt=0)
    MODE: Literal["polling", "webhook"] = "polling"

    PORT: int = Field(default=10000, ge=1, le=65535)
    HEALTH_PORT: int = Field(default=10001, ge=1, le=65535)

    WEBAPP_URL: str
    BOT_USERNAME: str = ""

    # =========================
    # WEBHOOK OPTIONAL
    # =========================
    WEBHOOK_HOST: str | None = None
    WEBHOOK_PATH: str = "/webhook"
    WEBHOOK_SECRET: SecretStr | None = None

    # =========================
    # SUPABASE
    # =========================
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: SecretStr

    # =========================
    # CLOUDFLARE R2
    # =========================
    R2_ACCOUNT_ID: str
    R2_ACCESS_KEY_ID: SecretStr
    R2_SECRET_ACCESS_KEY: SecretStr
    R2_BUCKET_NAME: str = "pazanda-media"
    R2_PUBLIC_BASE_URL: str = ""
    R2_UPLOAD_PREFIX: str = "uploads"

    # =========================
    # SCHEDULER
    # =========================
    TIMEZONE: str = "Asia/Tashkent"

    DAILY_RECIPE_HOUR: int = Field(default=9, ge=0, le=23)
    DAILY_RECIPE_MINUTE: int = Field(default=0, ge=0, le=59)

    DAILY_BACKUP_HOUR: int = Field(default=2, ge=0, le=23)
    DAILY_BACKUP_MINUTE: int = Field(default=30, ge=0, le=59)

    # =========================
    # MIDDLEWARE
    # =========================
    ENABLE_THROTTLING: bool = True
    THROTTLE_RATE: float = Field(default=0.5, gt=0)

    # =========================
    # PREMIUM PAYMENT
    # =========================
    PREMIUM_PRICE_UZS: int = Field(default=25000, ge=0)
    PAYMENT_CARD_NUMBER: str = ""
    PAYMENT_CARD_HOLDER: str = ""

    # =========================
    # VALIDATORS
    # =========================

    @field_validator("WEBAPP_URL", "SUPABASE_URL")
    @classmethod
    def validate_required_url(cls, value: str) -> str:
        value = value.strip().rstrip("/")

        if not value:
            raise ValueError("URL bo'sh bo'lishi mumkin emas.")

        if not value.startswith(("http://", "https://")):
            raise ValueError("URL http:// yoki https:// bilan boshlanishi kerak.")

        return value

    @field_validator("R2_PUBLIC_BASE_URL")
    @classmethod
    def validate_optional_url(cls, value: str) -> str:
        value = value.strip().rstrip("/")

        if value and not value.startswith(("http://", "https://")):
            raise ValueError("R2_PUBLIC_BASE_URL http:// yoki https:// bilan boshlanishi kerak.")

        return value

    @field_validator("R2_UPLOAD_PREFIX")
    @classmethod
    def normalize_upload_prefix(cls, value: str) -> str:
        return value.strip("/")

    @model_validator(mode="after")
    def validate_webhook_mode(self):
        if self.MODE == "webhook":
            if not self.WEBHOOK_HOST:
                raise ValueError("MODE=webhook bo'lsa, WEBHOOK_HOST majburiy.")

            if not self.WEBHOOK_SECRET:
                raise ValueError("MODE=webhook bo'lsa, WEBHOOK_SECRET majburiy.")

        return self

    # =========================
    # SAFE ACCESSORS
    # =========================

    @property
    def token(self) -> str:
        return self.BOT_TOKEN.get_secret_value()

    @property
    def supabase_service_key(self) -> str:
        return self.SUPABASE_SERVICE_ROLE_KEY.get_secret_value()

    @property
    def r2_access_key(self) -> str:
        return self.R2_ACCESS_KEY_ID.get_secret_value()

    @property
    def r2_secret_key(self) -> str:
        return self.R2_SECRET_ACCESS_KEY.get_secret_value()

    @property
    def r2_endpoint(self) -> str:
        return f"https://{self.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

    @property
    def webhook_url(self) -> str | None:
        if self.MODE != "webhook" or not self.WEBHOOK_HOST:
            return None

        host = self.WEBHOOK_HOST.rstrip("/")
        path = self.WEBHOOK_PATH if self.WEBHOOK_PATH.startswith("/") else f"/{self.WEBHOOK_PATH}"

        return f"{host}{path}"


@lru_cache
def get_settings() -> Settings:
    return Settings()

`

---

## 📄 bot/app/main.py

`python
import asyncio
import logging
from aiohttp import web
from aiogram import Bot, Dispatcher

from app.config import get_settings
from app.handlers import admin, common, premium, profile, start
from app.middlewares import BanMiddleware, ThrottlingMiddleware
from app.services.db import db
from app.services.scheduler import setup_scheduler
from app.utils.logging import setup_logging

settings = get_settings()


async def health_check_handler(request: web.Request) -> web.Response:
    db_ok = False
    try:
        db_ok = await db.health_check()
    except Exception:
        pass

    return web.json_response({
        "status": "healthy",
        "database": "ok" if db_ok else "connecting"
    }, status=200)


async def main() -> None:
    setup_logging()
    logging.info("Starting Pazanda AI Bot...")

    # Initialize Supabase DB session
    try:
        await db.init()
    except Exception as e:
        logging.warning(f"Database init warning: {e}")

    bot = Bot(token=settings.token)
    dp = Dispatcher()

    # Register Middlewares
    dp.update.outer_middleware(BanMiddleware())
    if settings.ENABLE_THROTTLING:
        dp.message.middleware(ThrottlingMiddleware(rate=settings.THROTTLE_RATE))
        dp.callback_query.middleware(ThrottlingMiddleware(rate=settings.THROTTLE_RATE))

    # Register Routers
    dp.include_router(start.router)
    dp.include_router(profile.router)
    dp.include_router(premium.router)
    dp.include_router(admin.router)
    dp.include_router(common.router)

    # Initialize Scheduler
    scheduler = setup_scheduler(bot)
    scheduler.start()

    # Start Health Check Server
    app = web.Application()
    app.router.add_get("/health", health_check_handler)
    app.router.add_get("/", health_check_handler)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", settings.PORT)
    await site.start()
    logging.info(f"Health check running on port {settings.PORT}")

    try:
        logging.info("Clearing webhook & pending updates...")
        await bot.delete_webhook(drop_pending_updates=True)

        if settings.MODE == "polling":
            logging.info("Starting polling mode...")
            await dp.start_polling(bot)
        else:
            logging.info(f"Setting webhook to {settings.webhook_url}...")
            await bot.set_webhook(
                url=settings.webhook_url,
                secret_token=settings.WEBHOOK_SECRET.get_secret_value() if settings.WEBHOOK_SECRET else None,
            )
            await dp.start_polling(bot)
    finally:
        scheduler.shutdown()
        await runner.cleanup()
        await db.close()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())

`

---

## 📄 bot/app/handlers/admin.py

`python
import asyncio
import sys
from html import escape

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, Message

from app.config import get_settings
from app.handlers.common_helpers import (
    edit_callback,
    get_lang,
    is_admin,
)
from app.keyboards.inline import (
    admin_menu_kb,
    cancel_kb,
    payment_review_kb,
)
from app.services.db import db
from app.texts.strings import t

settings = get_settings()
router = Router()


class AdminStates(StatesGroup):
    waiting_broadcast = State()
    waiting_search = State()


@router.message(Command("admin"))
async def admin_command(message: Message) -> None:
    if not is_admin(message.from_user.id):
        return

    lang = await get_lang(message.from_user.id)
    await message.answer(
        t(lang, "admin_menu"),
        reply_markup=admin_menu_kb(lang),
    )


@router.callback_query(F.data == "admin:stats")
async def admin_stats(callback: CallbackQuery) -> None:
    if not is_admin(callback.from_user.id):
        await callback.answer()
        return

    lang = await get_lang(callback.from_user.id)

    total_users = await db.count_users()
    premium_users = await db.count_premium_active()
    pending_payments = await db.count_pending_requests()
    banned_users = await db.count_banned()

    text = (
        f"<b>📊 {t(lang, 'admin_stats')}</b>\n\n"
        f"👥 {t(lang, 'stats_total')}: <b>{total_users}</b>\n"
        f"💎 {t(lang, 'stats_premium')}: <b>{premium_users}</b>\n"
        f"💳 {t(lang, 'stats_pending')}: <b>{pending_payments}</b>\n"
        f"⛔ {t(lang, 'stats_banned')}: <b>{banned_users}</b>"
    )

    await edit_callback(callback, text, admin_menu_kb(lang))
    await callback.answer()


@router.callback_query(F.data == "admin:payments")
async def admin_payments(callback: CallbackQuery) -> None:
    if not is_admin(callback.from_user.id):
        await callback.answer()
        return

    lang = await get_lang(callback.from_user.id)
    pending_list = await db.list_pending_requests(limit=5)

    if not pending_list:
        await edit_callback(callback, t(lang, "no_pending"), admin_menu_kb(lang))
        await callback.answer()
        return

    first_req = pending_list[0]
    user = await db.get_user(first_req["user_telegram_id"])

    user_name = user.get("first_name") if user else "-"
    username = f"@{user['username']}" if user and user.get("username") else "-"

    caption = (
        f"💳 Kutilayotgan to‘lov ({len(pending_list)} ta mavjud)\n\n"
        f"👤 User: {escape(user_name)}\n"
        f"Username: {username}\n"
        f"ID: <code>{first_req['user_telegram_id']}</code>\n"
        f"Request ID: <code>{str(first_req['id'])[:8]}</code>"
    )

    try:
        await callback.message.answer_photo(
            photo=first_req["screenshot_url"],
            caption=caption,
            reply_markup=payment_review_kb(first_req["id"], lang),
        )
    except Exception:
        await callback.message.answer(
            text=f"{caption}\nURL: {first_req['screenshot_url']}",
            reply_markup=payment_review_kb(first_req["id"], lang),
        )

    await callback.answer()


@router.callback_query(F.data == "admin:broadcast")
async def admin_broadcast_prompt(callback: CallbackQuery, state: FSMContext) -> None:
    if not is_admin(callback.from_user.id):
        await callback.answer()
        return

    lang = await get_lang(callback.from_user.id)
    await state.set_state(AdminStates.waiting_broadcast)

    await edit_callback(callback, t(lang, "broadcast_prompt"), cancel_kb(lang))
    await callback.answer()


@router.message(AdminStates.waiting_broadcast, F.text)
async def admin_broadcast_execute(message: Message, state: FSMContext) -> None:
    if not is_admin(message.from_user.id):
        return

    lang = await get_lang(message.from_user.id)
    broadcast_text = message.text

    sent_count = 0
    fail_count = 0

    status_msg = await message.answer("📣 Broadcast boshlandi...")

    async for user in db.iter_users():
        user_id = user["telegram_id"]
        user_lang = user.get("language", "latn")

        try:
            translated_text = t(user_lang, broadcast_text) if user_lang != "latn" else broadcast_text
            await message.bot.send_message(user_id, translated_text)
            sent_count += 1
            await asyncio.sleep(0.05)
        except Exception:
            fail_count += 1

    await state.clear()
    await status_msg.edit_text(
        t(lang, "broadcast_done", sent=sent_count, failed=fail_count),
        reply_markup=admin_menu_kb(lang),
    )


@router.callback_query(F.data == "admin:search")
async def admin_search_prompt(callback: CallbackQuery, state: FSMContext) -> None:
    if not is_admin(callback.from_user.id):
        await callback.answer()
        return

    lang = await get_lang(callback.from_user.id)
    await state.set_state(AdminStates.waiting_search)

    await edit_callback(callback, t(lang, "search_prompt"), cancel_kb(lang))
    await callback.answer()


@router.message(AdminStates.waiting_search, F.text)
async def admin_search_execute(message: Message, state: FSMContext) -> None:
    if not is_admin(message.from_user.id):
        return

    lang = await get_lang(message.from_user.id)
    results = await db.search_users(message.text)

    await state.clear()

    if not results:
        await message.answer(t(lang, "search_no_results"), reply_markup=admin_menu_kb(lang))
        return

    lines = [f"<b>{t(lang, 'search_results')}</b>\n"]
    for u in results:
        banned_str = "⛔ Banned" if u.get("is_banned") else "✅ Active"
        premium_str = "💎 Premium" if u.get("is_premium") else "👤 Trial"
        username_str = f"@{u['username']}" if u.get("username") else "-"

        lines.append(
            f"• <b>{escape(u.get('first_name') or 'User')}</b> ({username_str}) | "
            f"ID: <code>{u['telegram_id']}</code> | {premium_str} | {banned_str}"
        )

    await message.answer("\n".join(lines), reply_markup=admin_menu_kb(lang))


@router.callback_query(F.data.startswith("admin:toggle_ban:"))
async def toggle_ban_user(callback: CallbackQuery) -> None:
    if not is_admin(callback.from_user.id):
        await callback.answer()
        return

    target_id = int(callback.data.split(":", 2)[2])
    user = await db.get_user(target_id)
    lang = await get_lang(callback.from_user.id)

    if not user:
        await callback.answer("User topilmadi.", show_alert=True)
        return

    new_ban_state = not user.get("is_banned", False)
    await db.set_banned(target_id, new_ban_state)

    msg_key = "user_banned" if new_ban_state else "user_unbanned"
    await callback.answer(t(lang, msg_key), show_alert=True)


@router.callback_query(F.data == "admin:status")
async def admin_system_status(callback: CallbackQuery) -> None:
    if not is_admin(callback.from_user.id):
        await callback.answer()
        return

    lang = await get_lang(callback.from_user.id)

    db_ok = False
    try:
        db_ok = await db.health_check()
    except Exception:
        db_ok = False

    db_status = t(lang, "db_ok") if db_ok else t(lang, "db_fail")
    py_version = sys.version.split()[0]

    text = (
        f"<b>{t(lang, 'system_status')}</b>\n\n"
        f"⚡ {t(lang, 'system_bot_mode')}: <code>{settings.MODE}</code>\n"
        f"🐍 {t(lang, 'system_python')}: <code>{py_version}</code>\n"
        f"🤖 {t(lang, 'system_aiogram')}: <code>3.x</code>\n"
        f"🗄 {t(lang, 'system_db')}: {db_status}"
    )

    await edit_callback(callback, text, admin_menu_kb(lang))
    await callback.answer()

`

---

## 📄 bot/app/handlers/common.py

`python
from aiogram import F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from app.config import get_settings
from app.handlers.common_helpers import edit_callback, ensure_user, get_lang
from app.keyboards.inline import back_main_kb, main_menu_kb
from app.texts.strings import t

settings = get_settings()
router = Router()


@router.message(Command("help"))
async def help_message(message: Message) -> None:
    lang = await get_lang(message.from_user.id)
    await message.answer(
        t(lang, "help_text"),
        reply_markup=back_main_kb(lang),
    )


@router.callback_query(F.data == "menu:help")
async def help_callback(callback: CallbackQuery) -> None:
    lang = await get_lang(callback.from_user.id)

    await edit_callback(
        callback,
        t(lang, "help_text"),
        back_main_kb(lang),
    )

    await callback.answer()


@router.callback_query(F.data == "back:main")
async def back_main(callback: CallbackQuery) -> None:
    await ensure_user(callback.from_user)
    lang = await get_lang(callback.from_user.id)

    await edit_callback(
        callback,
        t(lang, "main_menu"),
        main_menu_kb(lang, settings.WEBAPP_URL),
    )

    await callback.answer()


@router.callback_query(F.data == "cancel:state")
async def cancel_state(callback: CallbackQuery, state: FSMContext) -> None:
    await state.clear()

    lang = await get_lang(callback.from_user.id)

    await edit_callback(
        callback,
        t(lang, "main_menu"),
        main_menu_kb(lang, settings.WEBAPP_URL),
    )

    await callback.answer()


@router.message(Command("cancel"))
async def cancel_command(message: Message, state: FSMContext) -> None:
    await state.clear()

    await ensure_user(message.from_user)
    lang = await get_lang(message.from_user.id)

    await message.answer(
        t(lang, "main_menu"),
        reply_markup=main_menu_kb(lang, settings.WEBAPP_URL),
    )


@router.message(F.text)
async def unknown_message(message: Message) -> None:
    await ensure_user(message.from_user)
    lang = await get_lang(message.from_user.id)

    await message.answer(
        t(lang, "error_generic"),
        reply_markup=main_menu_kb(lang, settings.WEBAPP_URL),
    )

`

---

## 📄 bot/app/handlers/common_helpers.py

`python
import logging
from aiogram.types import CallbackQuery, Message, User

from app.config import get_settings
from app.services.db import db

settings = get_settings()


def is_admin(user_id: int) -> bool:
    return user_id == settings.ADMIN_ID


async def get_lang(user_id: int) -> str:
    try:
        user = await db.get_user(user_id)
        if not user:
            return "latn"
        return user.get("language", "latn")
    except Exception as e:
        logging.warning(f"get_lang fallback error: {e}")
        return "latn"


async def ensure_user(tg_user: User) -> dict:
    try:
        return await db.sync_user(
            telegram_id=tg_user.id,
            first_name=tg_user.first_name,
            last_name=tg_user.last_name,
            username=tg_user.username,
        )
    except Exception as e:
        logging.error(f"ensure_user fallback error: {e}")
        return {
            "telegram_id": tg_user.id,
            "first_name": tg_user.first_name,
            "username": tg_user.username,
            "language": "latn",
        }


async def edit_callback(
    callback: CallbackQuery,
    text: str,
    reply_markup=None,
) -> None:
    if not callback.message:
        return

    try:
        if callback.message.photo:
            await callback.message.edit_caption(
                caption=text,
                reply_markup=reply_markup,
            )
        else:
            await callback.message.edit_text(
                text=text,
                reply_markup=reply_markup,
            )
    except Exception:
        pass

`

---

## 📄 bot/app/handlers/premium.py

`python
import logging
from datetime import datetime, timedelta, timezone
from html import escape
from io import BytesIO

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, Message

from app.config import get_settings
from app.handlers.common_helpers import (
    edit_callback,
    ensure_user,
    get_lang,
    is_admin,
)
from app.keyboards.inline import (
    admin_menu_kb,
    cancel_kb,
    payment_review_kb,
    premium_kb,
)
from app.services.db import db
from app.services.r2 import upload_screenshot
from app.texts.strings import t

settings = get_settings()
router = Router()


class PremiumStates(StatesGroup):
    waiting_screenshot = State()


def _premium_text(lang: str) -> str:
    price = f"{settings.PREMIUM_PRICE_UZS:,}".replace(",", " ")

    lines = [
        f"<b>{t(lang, 'premium_title')}</b>",
        t(lang, "premium_desc"),
        t(lang, "premium_price", price=price),
    ]

    if settings.PAYMENT_CARD_NUMBER:
        lines.append(
            t(lang, "premium_card", card=escape(settings.PAYMENT_CARD_NUMBER))
        )

    if settings.PAYMENT_CARD_HOLDER:
        lines.append(
            t(lang, "premium_card_holder", holder=escape(settings.PAYMENT_CARD_HOLDER))
        )

    if not settings.PAYMENT_CARD_NUMBER and not settings.PAYMENT_CARD_HOLDER:
        lines.append(t(lang, "premium_not_configured"))

    return "\n\n".join(lines)


async def _show_premium_message(message: Message, lang: str) -> None:
    await message.answer(
        _premium_text(lang),
        reply_markup=premium_kb(lang),
    )


async def _show_premium_callback(callback: CallbackQuery, lang: str) -> None:
    await edit_callback(
        callback,
        _premium_text(lang),
        premium_kb(lang),
    )
    await callback.answer()


@router.message(Command("premium"))
async def premium_command(message: Message) -> None:
    await ensure_user(message.from_user)
    lang = await get_lang(message.from_user.id)
    await _show_premium_message(message, lang)


@router.callback_query(F.data == "menu:premium")
async def premium_menu(callback: CallbackQuery) -> None:
    await ensure_user(callback.from_user)
    lang = await get_lang(callback.from_user.id)
    await _show_premium_callback(callback, lang)


@router.callback_query(F.data == "premium:start")
async def premium_start(callback: CallbackQuery, state: FSMContext) -> None:
    await ensure_user(callback.from_user)
    lang = await get_lang(callback.from_user.id)

    pending = await db.get_pending_request_by_user(callback.from_user.id)

    if pending:
        await callback.answer(t(lang, "premium_already_pending"), show_alert=True)
        return

    await state.set_state(PremiumStates.waiting_screenshot)

    await edit_callback(
        callback,
        t(lang, "premium_waiting_screenshot"),
        cancel_kb(lang),
    )

    await callback.answer()


@router.message(PremiumStates.waiting_screenshot, F.photo)
async def premium_screenshot(message: Message, state: FSMContext) -> None:
    user = message.from_user
    lang = await get_lang(user.id)

    pending = await db.get_pending_request_by_user(user.id)

    if pending:
        await state.clear()
        await message.answer(t(lang, "premium_already_pending"))
        return

    status_message = await message.answer(t(lang, "premium_uploading"))

    try:
        buffer = BytesIO()
        await message.bot.download(message.photo[-1].file_id, destination=buffer)
        data = buffer.getvalue()

        content_type = message.photo[-1].mime_type or "image/jpeg"
        screenshot_url = await upload_screenshot(user.id, data, content_type)

        await ensure_user(user)
        request = await db.create_premium_request(user.id, screenshot_url)

        await _notify_admin(message.bot, request, user)

        await state.clear()
        await status_message.edit_text(t(lang, "premium_uploaded"))

    except Exception:
        logging.exception("Premium screenshot upload failed")
        await state.clear()
        await status_message.edit_text(t(lang, "error_generic"))


@router.message(PremiumStates.waiting_screenshot)
async def premium_invalid(message: Message) -> None:
    lang = await get_lang(message.from_user.id)
    await message.answer(t(lang, "premium_invalid"))


async def _notify_admin(bot, request: dict, user) -> None:
    admin_lang = await get_lang(settings.ADMIN_ID)

    username = f"@{user.username}" if user.username else "-"

    caption = (
        f"💳 Yangi to‘lov so‘rovi\n"
        f"👤 {user.first_name}\n"
        f"Username: {username}\n"
        f"ID: <code>{user.id}</code>\n"
        f"Request: <code>{str(request['id'])[:8]}</code>"
    )

    try:
        await bot.send_photo(
            settings.ADMIN_ID,
            photo=request["screenshot_url"],
            caption=caption,
            reply_markup=payment_review_kb(request["id"], admin_lang),
        )
    except Exception:
        await bot.send_message(
            settings.ADMIN_ID,
            caption + f"\nURL: {request['screenshot_url']}",
            reply_markup=payment_review_kb(request["id"], admin_lang),
        )


@router.callback_query(F.data.startswith("pay:approve:"))
async def approve_payment(callback: CallbackQuery) -> None:
    if not is_admin(callback.from_user.id):
        await callback.answer()
        return

    request_id = callback.data.split(":", 2)[2]
    admin_lang = await get_lang(callback.from_user.id)

    request = await db.get_premium_request(request_id)

    if not request or request.get("status") != "pending":
        await edit_callback(
            callback,
            t(admin_lang, "payment_not_pending"),
            admin_menu_kb(admin_lang),
        )
        await callback.answer()
        return

    await db.update_premium_request(request_id, "approved", callback.from_user.id)

    until = datetime.now(timezone.utc) + timedelta(days=30)
    await db.set_premium(request["user_telegram_id"], until)

    await edit_callback(
        callback,
        t(admin_lang, "payment_request_approved"),
        admin_menu_kb(admin_lang),
    )

    buyer = await db.get_user(request["user_telegram_id"])
    buyer_lang = buyer.get("language", "latn") if buyer else "latn"

    try:
        await callback.bot.send_message(
            request["user_telegram_id"],
            t(buyer_lang, "payment_approved", date=until.strftime("%d.%m.%Y")),
        )
    except Exception:
        pass

    await callback.answer()


@router.callback_query(F.data.startswith("pay:reject:"))
async def reject_payment(callback: CallbackQuery) -> None:
    if not is_admin(callback.from_user.id):
        await callback.answer()
        return

    request_id = callback.data.split(":", 2)[2]
    admin_lang = await get_lang(callback.from_user.id)

    request = await db.get_premium_request(request_id)

    if not request or request.get("status") != "pending":
        await edit_callback(
            callback,
            t(admin_lang, "payment_not_pending"),
            admin_menu_kb(admin_lang),
        )
        await callback.answer()
        return

    await db.update_premium_request(request_id, "rejected", callback.from_user.id)

    await edit_callback(
        callback,
        t(admin_lang, "payment_request_rejected"),
        admin_menu_kb(admin_lang),
    )

    buyer = await db.get_user(request["user_telegram_id"])
    buyer_lang = buyer.get("language", "latn") if buyer else "latn"

    try:
        await callback.bot.send_message(
            request["user_telegram_id"],
            t(buyer_lang, "payment_rejected"),
        )
    except Exception:
        pass

    await callback.answer()

`

---

## 📄 bot/app/handlers/profile.py

`python
from html import escape

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.types import CallbackQuery, Message

from app.handlers.common_helpers import (
    edit_callback,
    ensure_user,
    get_lang,
)
from app.keyboards.inline import profile_kb
from app.services.db import db
from app.texts.strings import t

router = Router()


async def _render_profile(user_data: dict, lang: str) -> str:
    user_data = await db.ensure_premium_status(user_data)

    name = escape(user_data.get("first_name") or "Foydalanuvchi")
    username = f"@{user_data['username']}" if user_data.get("username") else "-"
    tg_id = user_data["telegram_id"]
    current_lang = t(lang, "lang_latn") if lang == "latn" else t(lang, "lang_kyr")

    status = t(lang, "status_premium") if user_data.get("is_premium") else t(lang, "status_trial")

    lines = [
        f"<b>{t(lang, 'profile_title')}</b>\n",
        f"👤 {t(lang, 'profile_name')}: {name}",
        f"🏷 {t(lang, 'profile_username')}: {username}",
        f"🆔 {t(lang, 'profile_id')}: <code>{tg_id}</code>",
        f"🌐 {t(lang, 'profile_language')}: {current_lang}",
        f"⭐️ {t(lang, 'profile_status')}: {status}",
    ]

    return "\n".join(lines)


@router.message(Command("profile"))
@router.message(Command("profil"))
async def profile_command(message: Message) -> None:
    user_data = await ensure_user(message.from_user)
    lang = await get_lang(message.from_user.id)
    text = await _render_profile(user_data, lang)

    await message.answer(
        text,
        reply_markup=profile_kb(lang),
    )


@router.callback_query(F.data == "menu:profile")
async def profile_menu(callback: CallbackQuery) -> None:
    user_data = await ensure_user(callback.from_user)
    lang = await get_lang(callback.from_user.id)
    text = await _render_profile(user_data, lang)

    await edit_callback(
        callback,
        text,
        profile_kb(lang),
    )
    await callback.answer()


@router.callback_query(F.data == "profile:toggle_lang")
async def toggle_language(callback: CallbackQuery) -> None:
    current_lang = await get_lang(callback.from_user.id)
    new_lang = "kyr" if current_lang == "latn" else "latn"

    await db.set_language(callback.from_user.id, new_lang)
    user_data = await db.get_user(callback.from_user.id)

    text = await _render_profile(user_data, new_lang)

    await edit_callback(
        callback,
        text,
        profile_kb(new_lang),
    )
    await callback.answer(t(new_lang, "language_set"))

`

---

## 📄 bot/app/handlers/start.py

`python
import logging
from aiogram import F, Router
from aiogram.filters import CommandStart
from aiogram.types import CallbackQuery, Message

from app.config import get_settings
from app.handlers.common_helpers import ensure_user, get_lang
from app.keyboards.inline import language_kb, main_menu_kb
from app.services.db import db
from app.texts.strings import t

settings = get_settings()
router = Router()


@router.message(CommandStart())
async def start(message: Message) -> None:
    try:
        user = await ensure_user(message.from_user)
        language = (user.get("language") if isinstance(user, dict) else None) or "latn"

        await message.answer(
            t(language, "main_menu"),
            reply_markup=main_menu_kb(language, settings.WEBAPP_URL),
        )
    except Exception as e:
        logging.error(f"Start command error: {e}")
        try:
            await message.answer(
                "Xush kelibsiz! Pazanda AI botiga xush kelibsiz.",
                reply_markup=main_menu_kb("latn", settings.WEBAPP_URL),
            )
        except Exception:
            pass


@router.callback_query(F.data.in_(["lang:latn", "lang:kyr"]))
async def choose_language(callback: CallbackQuery) -> None:
    try:
        language = callback.data.split(":")[1]

        await ensure_user(callback.from_user)
        try:
            await db.set_language(callback.from_user.id, language)
        except Exception as e:
            logging.warning(f"set_language error: {e}")

        text = f"{t(language, 'language_set')}\n\n{t(language, 'main_menu')}"

        if callback.message:
            try:
                await callback.message.edit_text(
                    text=text,
                    reply_markup=main_menu_kb(language, settings.WEBAPP_URL),
                )
            except Exception:
                await callback.message.answer(
                    text=text,
                    reply_markup=main_menu_kb(language, settings.WEBAPP_URL),
                )

        await callback.answer()
    except Exception as e:
        logging.error(f"choose_language error: {e}")
        await callback.answer()

`

---

## 📄 bot/app/keyboards/inline.py

`python
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

from app.config import get_settings
from app.texts.strings import t

settings = get_settings()


def language_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="O'zbek (Lotin)",
                    callback_data="lang:latn",
                ),
                InlineKeyboardButton(
                    text="Ўзбек (Кирил)",
                    callback_data="lang:kyr",
                ),
            ]
        ]
    )


def main_menu_kb(lang: str, webapp_url: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text=t(lang, "open_app"),
                    web_app=WebAppInfo(url=webapp_url),
                )
            ],
            [
                InlineKeyboardButton(
                    text=t(lang, "premium"),
                    callback_data="menu:premium",
                ),
                InlineKeyboardButton(
                    text=t(lang, "profile"),
                    callback_data="menu:profile",
                ),
            ],
            [
                InlineKeyboardButton(
                    text=t(lang, "help"),
                    callback_data="menu:help",
                )
            ],
        ]
    )


def back_main_kb(lang: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text=t(lang, "back"),
                    callback_data="back:main",
                )
            ]
        ]
    )


def cancel_kb(lang: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text=t(lang, "cancel"),
                    callback_data="cancel:state",
                )
            ]
        ]
    )


def premium_kb(lang: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text=t(lang, "premium_send_screenshot"),
                    callback_data="premium:start",
                )
            ],
            [
                InlineKeyboardButton(
                    text=t(lang, "back"),
                    callback_data="back:main",
                )
            ],
        ]
    )


def profile_kb(lang: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text=t(lang, "toggle_language"),
                    callback_data="profile:toggle_lang",
                )
            ],
            [
                InlineKeyboardButton(
                    text=t(lang, "back"),
                    callback_data="back:main",
                )
            ],
        ]
    )


def admin_menu_kb(lang: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text=t(lang, "admin_stats"),
                    callback_data="admin:stats",
                )
            ],
            [
                InlineKeyboardButton(
                    text=t(lang, "admin_payments"),
                    callback_data="admin:payments",
                )
            ],
            [
                InlineKeyboardButton(
                    text=t(lang, "admin_broadcast"),
                    callback_data="admin:broadcast",
                )
            ],
            [
                InlineKeyboardButton(
                    text=t(lang, "admin_search"),
                    callback_data="admin:search",
                )
            ],
            [
                InlineKeyboardButton(
                    text=t(lang, "admin_status"),
                    callback_data="admin:status",
                )
            ],
            [
                InlineKeyboardButton(
                    text=t(lang, "back"),
                    callback_data="back:main",
                )
            ],
        ]
    )


def payment_review_kb(request_id: str, lang: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="✅ Tasdiqlash",
                    callback_data=f"pay:approve:{request_id}",
                ),
                InlineKeyboardButton(
                    text="❌ Rad etish",
                    callback_data=f"pay:reject:{request_id}",
                ),
            ],
            [
                InlineKeyboardButton(
                    text=t(lang, "admin_payments"),
                    callback_data="admin:payments",
                )
            ],
        ]
    )

`

---

## 📄 bot/app/keyboards/reply.py

`python
# Reply keyboards

`

---

## 📄 bot/app/middlewares/access.py

`python
import time
from typing import Any, Awaitable, Callable

from aiogram import BaseMiddleware
from aiogram.types import CallbackQuery, Message, Update, User

from app.services.db import db


def extract_user(event: Any) -> User | None:
    if isinstance(event, Message):
        return event.from_user

    if isinstance(event, CallbackQuery):
        return event.from_user

    if isinstance(event, Update):
        if event.message:
            return event.message.from_user
        if event.edited_message:
            return event.edited_message.from_user
        if event.callback_query:
            return event.callback_query.from_user
        if event.inline_query:
            return event.inline_query.from_user

    return None


class BanMiddleware(BaseMiddleware):
    def __init__(self, ttl: int = 30) -> None:
        self.ttl = ttl
        self.cache: dict[int, tuple[float, bool]] = {}

    async def is_banned_cached(self, user_id: int) -> bool:
        now = time.monotonic()
        cached = self.cache.get(user_id)

        if cached and now - cached[0] < self.ttl:
            return cached[1]

        try:
            banned = await db.is_banned(user_id)
        except Exception:
            banned = False

        self.cache[user_id] = (now, banned)

        if len(self.cache) > 10000:
            self.cache = {
                key: value
                for key, value in self.cache.items()
                if now - value[0] < self.ttl
            }

        return banned

    async def __call__(
        self,
        handler: Callable[[Any, dict[str, Any]], Awaitable[Any]],
        event: Any,
        data: dict[str, Any],
    ) -> Any:
        user = extract_user(event)

        if user and await self.is_banned_cached(user.id):
            if isinstance(event, Message):
                await event.answer("Siz bloklangansiz.")
            elif isinstance(event, CallbackQuery):
                await event.answer("Siz bloklangansiz.")
            return

        return await handler(event, data)


class ThrottlingMiddleware(BaseMiddleware):
    def __init__(self, rate: float = 0.5) -> None:
        self.rate = rate
        self.last: dict[int, float] = {}

    async def __call__(
        self,
        handler: Callable[[Any, dict[str, Any]], Awaitable[Any]],
        event: Any,
        data: dict[str, Any],
    ) -> Any:
        user = extract_user(event)

        if not user:
            return await handler(event, data)

        now = time.monotonic()
        last = self.last.get(user.id)

        if last is not None and now - last < self.rate:
            if isinstance(event, CallbackQuery):
                await event.answer("⏱ Sekinroq yuboring.")
            return

        self.last[user.id] = now

        if len(self.last) > 10000:
            self.last = {
                key: value for key, value in self.last.items() if now - value < 10
            }

        return await handler(event, data)

`

---

## 📄 bot/app/middlewares/ban.py

`python
# Ban middleware

`

---

## 📄 bot/app/middlewares/throttle.py

`python
# Throttle middleware

`

---

## 📄 bot/app/services/db.py

`python
import json
import random
from datetime import datetime, timezone
from typing import Any, AsyncIterator

import aiohttp

from app.config import get_settings

settings = get_settings()


class SupabaseDB:
    def __init__(self) -> None:
        self.base_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1"
        self._session: aiohttp.ClientSession | None = None

    async def init(self) -> None:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                headers={
                    "apikey": settings.supabase_service_key,
                    "Authorization": f"Bearer {settings.supabase_service_key}",
                }
            )

    async def close(self) -> None:
        if self._session and not self._session.closed:
            await self._session.close()

    async def _request(
        self,
        method: str,
        table: str,
        params: dict[str, Any] | None = None,
        payload: dict[str, Any] | list[dict[str, Any]] | None = None,
        prefer: str | None = None,
    ) -> Any:
        await self.init()

        url = f"{self.base_url}/{table}"
        headers = {"Accept": "application/json"}

        if prefer:
            headers["Prefer"] = prefer

        async with self._session.request(
            method,
            url,
            params=params,
            json=payload,
            headers=headers,
        ) as resp:
            text = await resp.text()

            if resp.status >= 400:
                raise RuntimeError(f"Supabase error {resp.status}: {text}")

            if resp.status == 204 or not text:
                return []

            return json.loads(text)

    async def _count(self, table: str, params: dict[str, Any] | None = None) -> int:
        await self.init()

        url = f"{self.base_url}/{table}"
        query = {"select": "*", "limit": 0}

        if params:
            query.update(params)

        headers = {
            "Accept": "application/json",
            "Prefer": "count=exact",
        }

        async with self._session.get(url, params=query, headers=headers) as resp:
            if resp.status >= 400:
                text = await resp.text()
                raise RuntimeError(f"Supabase count error {resp.status}: {text}")

            content_range = resp.headers.get("Content-Range", "")
            total = content_range.split("/")[-1]

            return int(total) if total.isdigit() else 0

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    # =========================
    # USERS
    # =========================

    async def get_user(self, telegram_id: int) -> dict[str, Any] | None:
        data = await self._request(
            "GET",
            "users",
            params={
                "telegram_id": f"eq.{telegram_id}",
                "limit": 1,
            },
        )
        return data[0] if data else None

    async def sync_user(
        self,
        telegram_id: int,
        first_name: str | None = None,
        last_name: str | None = None,
        username: str | None = None,
    ) -> dict[str, Any]:
        existing = await self.get_user(telegram_id)

        payload: dict[str, Any] = {"telegram_id": telegram_id}

        if first_name is not None:
            payload["first_name"] = first_name
        if last_name is not None:
            payload["last_name"] = last_name
        if username is not None:
            payload["username"] = username

        if existing:
            patch_payload = {
                key: value for key, value in payload.items() if key != "telegram_id"
            }
            patch_payload["updated_at"] = self._now_iso()

            data = await self._request(
                "PATCH",
                "users",
                params={"telegram_id": f"eq.{telegram_id}"},
                payload=patch_payload,
                prefer="return=representation",
            )
            return data[0] if data else existing

        payload["language"] = payload.get("language", "latn")
        payload["updated_at"] = self._now_iso()

        data = await self._request(
            "POST",
            "users",
            payload=payload,
            prefer="return=representation",
        )
        return data[0]

    async def set_language(self, telegram_id: int, language: str) -> None:
        await self._request(
            "PATCH",
            "users",
            params={"telegram_id": f"eq.{telegram_id}"},
            payload={"language": language, "updated_at": self._now_iso()},
            prefer="return=representation",
        )

    async def set_banned(self, telegram_id: int, banned: bool) -> None:
        await self._request(
            "PATCH",
            "users",
            params={"telegram_id": f"eq.{telegram_id}"},
            payload={"is_banned": banned, "updated_at": self._now_iso()},
            prefer="return=representation",
        )

    async def is_banned(self, telegram_id: int) -> bool:
        data = await self._request(
            "GET",
            "users",
            params={
                "select": "is_banned",
                "telegram_id": f"eq.{telegram_id}",
                "limit": 1,
            },
        )
        return bool(data and data[0].get("is_banned"))

    async def ensure_premium_status(self, user: dict[str, Any]) -> dict[str, Any]:
        if not user:
            return user

        if user.get("is_premium") and user.get("premium_until"):
            try:
                premium_until = datetime.fromisoformat(user["premium_until"])
                if premium_until.tzinfo is None:
                    premium_until = premium_until.replace(tzinfo=timezone.utc)
            except ValueError:
                premium_until = None

            if premium_until and premium_until < datetime.now(timezone.utc):
                updated = await self._request(
                    "PATCH",
                    "users",
                    params={"telegram_id": f"eq.{user['telegram_id']}"},
                    payload={"is_premium": False, "updated_at": self._now_iso()},
                    prefer="return=representation",
                )
                if updated:
                    return updated[0]

        return user

    async def set_premium(self, telegram_id: int, until: datetime) -> None:
        await self._request(
            "PATCH",
            "users",
            params={"telegram_id": f"eq.{telegram_id}"},
            payload={
                "is_premium": True,
                "premium_until": until.isoformat(),
                "updated_at": self._now_iso(),
            },
            prefer="return=representation",
        )

    async def search_users(self, query: str) -> list[dict[str, Any]]:
        query = query.strip().lstrip("@")
        query = query.replace(",", " ").replace("(", " ").replace(")", " ").strip()

        if not query:
            return []

        if query.isdigit():
            params = {
                "or": f"(telegram_id.eq.{query})",
                "limit": 10,
            }
        else:
            safe = f"*{query}*"
            params = {
                "or": f"(username.ilike.{safe},first_name.ilike.{safe})",
                "limit": 10,
            }

        return await self._request("GET", "users", params=params)

    async def iter_users(self) -> AsyncIterator[dict[str, Any]]:
        offset = 0
        limit = 500

        while True:
            data = await self._request(
                "GET",
                "users",
                params={
                    "select": "telegram_id,language",
                    "is_banned": "eq.false",
                    "order": "telegram_id.asc",
                    "limit": limit,
                    "offset": offset,
                },
            )

            if not data:
                break

            for row in data:
                yield row

            if len(data) < limit:
                break

            offset += limit

    # =========================
    # STATS
    # =========================

    async def count_users(self) -> int:
        return await self._count("users")

    async def count_banned(self) -> int:
        return await self._count("users", {"is_banned": "eq.true"})

    async def count_premium_active(self) -> int:
        return await self._count(
            "users",
            {
                "is_premium": "eq.true",
                "premium_until": f"gte.{self._now_iso()}",
            },
        )

    async def count_pending_requests(self) -> int:
        return await self._count("premium_requests", {"status": "eq.pending"})

    # =========================
    # PREMIUM REQUESTS
    # =========================

    async def create_premium_request(
        self,
        telegram_id: int,
        screenshot_url: str,
    ) -> dict[str, Any]:
        data = await self._request(
            "POST",
            "premium_requests",
            payload={
                "user_telegram_id": telegram_id,
                "screenshot_url": screenshot_url,
                "status": "pending",
            },
            prefer="return=representation",
        )
        return data[0]

    async def get_premium_request(self, request_id: str) -> dict[str, Any] | None:
        data = await self._request(
            "GET",
            "premium_requests",
            params={
                "id": f"eq.{request_id}",
                "limit": 1,
            },
        )
        return data[0] if data else None

    async def get_pending_request_by_user(
        self,
        telegram_id: int,
    ) -> dict[str, Any] | None:
        data = await self._request(
            "GET",
            "premium_requests",
            params={
                "user_telegram_id": f"eq.{telegram_id}",
                "status": "eq.pending",
                "order": "created_at.desc",
                "limit": 1,
            },
        )
        return data[0] if data else None

    async def list_pending_requests(self, limit: int = 5) -> list[dict[str, Any]]:
        return await self._request(
            "GET",
            "premium_requests",
            params={
                "status": "eq.pending",
                "order": "created_at.desc",
                "limit": limit,
            },
        )

    async def update_premium_request(
        self,
        request_id: str,
        status: str,
        admin_telegram_id: int,
    ) -> None:
        await self._request(
            "PATCH",
            "premium_requests",
            params={"id": f"eq.{request_id}"},
            payload={
                "status": status,
                "admin_telegram_id": admin_telegram_id,
                "reviewed_at": self._now_iso(),
            },
            prefer="return=representation",
        )

    # =========================
    # RECIPES
    # =========================

    async def get_random_recipe(self) -> dict[str, Any] | None:
        recipes = await self._request(
            "GET",
            "recipes",
            params={
                "select": "id,title,description,image_url,cook_time_minutes,difficulty,category",
                "is_published": "eq.true",
                "limit": 200,
            },
        )

        if not recipes:
            return None

        return random.choice(recipes)

    # =========================
    # BACKUP
    # =========================

    async def backup_payload(self) -> dict[str, Any]:
        users = await self._request(
            "GET",
            "users",
            params={"select": "*", "order": "telegram_id.asc", "limit": 10000},
        )

        premium_requests = await self._request(
            "GET",
            "premium_requests",
            params={"select": "*", "order": "created_at.desc", "limit": 10000},
        )

        recipes = await self._request(
            "GET",
            "recipes",
            params={"select": "*", "order": "id.asc", "limit": 10000},
        )

        lifehacks = await self._request(
            "GET",
            "lifehacks",
            params={"select": "*", "order": "id.asc", "limit": 10000},
        )

        return {
            "generated_at": self._now_iso(),
            "users": users,
            "premium_requests": premium_requests,
            "recipes": recipes,
            "lifehacks": lifehacks,
        }

    async def health_check(self) -> bool:
        await self._request(
            "GET",
            "users",
            params={"select": "telegram_id", "limit": 1},
        )
        return True


db = SupabaseDB()

`

---

## 📄 bot/app/services/lifehacks.py

`python
# Lifehacks service

`

---

## 📄 bot/app/services/payments.py

`python
# Payments service

`

---

## 📄 bot/app/services/r2.py

`python
import uuid

import aioboto3
from botocore.client import Config as BotoConfig

from app.config import get_settings

settings = get_settings()


async def upload_bytes(data: bytes, key: str, content_type: str = "image/jpeg") -> str:
    if not settings.R2_PUBLIC_BASE_URL:
        raise ValueError("R2_PUBLIC_BASE_URL sozlanmagan.")

    session = aioboto3.Session()

    async with session.client(
        "s3",
        endpoint_url=settings.r2_endpoint,
        aws_access_key_id=settings.r2_access_key,
        aws_secret_access_key=settings.r2_secret_key,
        config=BotoConfig(
            s3={"addressing_style": "path"},
            signature_version="s3v4",
        ),
    ) as client:
        await client.put_object(
            Bucket=settings.R2_BUCKET_NAME,
            Key=key,
            Body=data,
            ContentType=content_type,
        )

    return f"{settings.R2_PUBLIC_BASE_URL.rstrip('/')}/{key}"


async def upload_screenshot(
    telegram_id: int,
    data: bytes,
    content_type: str = "image/jpeg",
) -> str:
    extension = "jpg" if "jpeg" in content_type else "png"
    key = f"{settings.R2_UPLOAD_PREFIX}/premium/{telegram_id}/{uuid.uuid4()}.{extension}"
    key = key.strip("/")

    return await upload_bytes(data, key, content_type)

`

---

## 📄 bot/app/services/recipes.py

`python
# Recipes service

`

---

## 📄 bot/app/services/scheduler.py

`python
import json
import logging
from datetime import datetime, timezone
from io import BytesIO

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from pytz import timezone as pytz_timezone

from app.config import get_settings
from app.services.db import db
from app.texts.strings import t

settings = get_settings()


async def send_daily_recipe(bot) -> None:
    logging.info("Executing daily recipe task...")

    recipe = await db.get_random_recipe()

    async for user in db.iter_users():
        user_id = user["telegram_id"]
        lang = user.get("language", "latn")

        if not recipe:
            msg = f"<b>{t(lang, 'daily_recipe_title')}</b>\n\n{t(lang, 'daily_recipe_fallback')}"
            try:
                await bot.send_message(user_id, msg)
            except Exception:
                pass
            continue

        title = t(lang, recipe["title"]) if lang == "kyr" else recipe["title"]
        desc = t(lang, recipe["description"]) if recipe.get("description") and lang == "kyr" else recipe.get("description", "")
        cook_time = recipe.get("cook_time_minutes", 30)

        caption = (
            f"<b>🍳 {t(lang, 'daily_recipe_title')}: {title}</b>\n\n"
            f"{desc}\n\n"
            f"⏱ Tayyorlanish vaqti: {cook_time} daqiqa"
        )

        try:
            if recipe.get("image_url"):
                await bot.send_photo(user_id, photo=recipe["image_url"], caption=caption)
            else:
                await bot.send_message(user_id, caption)
        except Exception:
            pass


async def send_daily_backup(bot) -> None:
    logging.info("Executing daily backup task...")

    try:
        data = await db.backup_payload()
        dump_bytes = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")

        now_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M")
        filename = f"pazanda_backup_{now_str}.json"

        buffered = BytesIO(dump_bytes)
        buffered.name = filename

        await bot.send_document(
            chat_id=settings.ADMIN_ID,
            document=buffered,
            caption=f"📦 Kunlik avtomatik backup: {now_str}",
        )
    except Exception:
        logging.exception("Failed to execute daily backup")


def setup_scheduler(bot) -> AsyncIOScheduler:
    tz = pytz_timezone(settings.TIMEZONE)
    scheduler = AsyncIOScheduler(timezone=tz)

    scheduler.add_job(
        send_daily_recipe,
        "cron",
        hour=settings.DAILY_RECIPE_HOUR,
        minute=settings.DAILY_RECIPE_MINUTE,
        args=[bot],
    )

    scheduler.add_job(
        send_daily_backup,
        "cron",
        hour=settings.DAILY_BACKUP_HOUR,
        minute=settings.DAILY_BACKUP_MINUTE,
        args=[bot],
    )

    return scheduler

`

---

## 📄 bot/app/services/supabase.py

`python
# Supabase service

`

---

## 📄 bot/app/services/translit.py

`python
import re

_PROTECT_RE = re.compile(r"(<[^>]*>|https?://\S+)")

_LAT_MULTI = [
    ("g'", "ғ"),
    ("g‘", "ғ"),
    ("g’", "ғ"),
    ("gʻ", "ғ"),
    ("o'", "ў"),
    ("o‘", "ў"),
    ("o’", "ў"),
    ("oʻ", "ў"),
    ("sh", "ш"),
    ("ch", "ч"),
    ("yo", "ё"),
    ("yu", "ю"),
    ("ya", "я"),
]

_LAT_SINGLE = {
    "a": "а",
    "b": "б",
    "d": "д",
    "e": "е",
    "f": "ф",
    "g": "г",
    "h": "ҳ",
    "i": "и",
    "j": "ж",
    "k": "к",
    "l": "л",
    "m": "м",
    "n": "н",
    "o": "о",
    "p": "п",
    "q": "қ",
    "r": "р",
    "s": "с",
    "t": "т",
    "u": "у",
    "v": "в",
    "x": "х",
    "y": "й",
    "z": "з",
}

_CYR_MULTI = [
    ("ғ", "g'"),
    ("ў", "o'"),
    ("ш", "sh"),
    ("ч", "ch"),
    ("ё", "yo"),
    ("ю", "yu"),
    ("я", "ya"),
]

_CYR_SINGLE = {
    "а": "a",
    "б": "b",
    "в": "v",
    "г": "g",
    "д": "d",
    "е": "e",
    "ж": "j",
    "з": "z",
    "и": "i",
    "й": "y",
    "к": "k",
    "л": "l",
    "м": "m",
    "н": "n",
    "о": "o",
    "п": "p",
    "р": "r",
    "с": "s",
    "т": "t",
    "у": "u",
    "ф": "f",
    "х": "x",
    "ҳ": "h",
    "қ": "q",
    "э": "e",
    "ъ": "",
    "ь": "",
}


def _apply_pairs(text: str, pairs: list[tuple[str, str]]) -> str:
    for src, dst in pairs:
        pattern = re.compile(re.escape(src), re.IGNORECASE)

        def make_repl(target_repl: str):
            def repl_func(match: re.Match) -> str:
                original = match.group(0)
                if not original:
                    return target_repl
                if original[0].isupper():
                    return target_repl.upper() if original.isupper() else target_repl.capitalize()
                return target_repl

            return repl_func

        text = pattern.sub(make_repl(dst), text)

    return text


def _map_single(text: str, mapping: dict[str, str]) -> str:
    result = []
    for ch in text:
        lower = ch.lower()
        if lower in mapping:
            mapped = mapping[lower]
            result.append(mapped.upper() if ch.isupper() else mapped)
        else:
            result.append(ch)
    return "".join(result)


def _lat_to_cyr_raw(text: str) -> str:
    text = _apply_pairs(text, _LAT_MULTI)
    text = _map_single(text, _LAT_SINGLE)
    return text


def _cyr_to_lat_raw(text: str) -> str:
    text = _apply_pairs(text, _CYR_MULTI)
    text = _map_single(text, _CYR_SINGLE)
    return text


def _protected_convert(text: str, converter) -> str:
    parts = _PROTECT_RE.split(text)
    result = []

    for part in parts:
        if not part:
            continue

        if (part.startswith("<") and part.endswith(">")) or part.startswith(
            ("http://", "https://")
        ):
            result.append(part)
        else:
            result.append(converter(part))

    return "".join(result)


def to_cyr(text: str) -> str:
    return _protected_convert(text, _lat_to_cyr_raw)


def to_lat(text: str) -> str:
    return _protected_convert(text, _cyr_to_lat_raw)

`

---

## 📄 bot/app/texts/strings.py

`python
from app.services.translit import to_cyr

STRINGS: dict[str, str] = {
    "choose_language": "Tilni tanlang:",
    "language_set": "Til saqlandi.",
    "main_menu": "Asosiy menyu",
    "open_app": "🚀 Ilovani ochish",
    "premium": "💎 Premium",
    "profile": "👤 Profil",
    "help": "ℹ️ Yordam",
    "back": "⬅️ Orqaga",
    "cancel": "❌ Bekor qilish",
    "processing": "⏳ Biroz kuting...",
    "error_generic": "Xatolik yuz berdi. Keyinroq qayta urinib ko‘ring.",

    "help_text": (
        "<b>ℹ️ Yordam</b>\n\n"
        "Pazanda AI — o‘zbek oilaviy oshxona yordamchisi.\n\n"
        "Bot orqali:\n"
        "• Profilni ko‘rish — /profil\n"
        "• Premium obuna — /premium\n"
        "• Mini Appni ochish — asosiy menyudagi 🚀 tugmasi\n\n"
        "Mini App ichida retseptlar, lifehacklar, bozorlik ro‘yxati, "
        "taymer va masalliqlardan taom topish mavjud."
    ),

    "premium_title": "💎 Premium obuna",
    "premium_desc": (
        "Premium obuna oyiga 1 marta to‘lanadi.\n"
        "To‘lov kartaga qilindi, skrinshot yuboriladi.\n"
        "Admin tekshirgandan so‘ng Premium faollashtiriladi."
    ),
    "premium_price": "Narxi: <b>{price} so'm / oy</b>",
    "premium_card": "Karta raqami: <code>{card}</code>",
    "premium_card_holder": "Karta egasi: {holder}",
    "premium_not_configured": "Karta ma’lumotlari hali kiritilmagan. Admin bilan bog‘laning.",
    "premium_send_screenshot": "📷 Screenshot yuborish",
    "premium_waiting_screenshot": (
        "To‘lov screenshotini yuboring.\n\n"
        "Screenshotda summa va karta raqami ko‘rinishi kerak."
    ),
    "premium_invalid": "Iltimos, faqat rasm/screenshot yuboring.",
    "premium_uploading": "📤 Screenshot yuklanmoqda...",
    "premium_uploaded": "✅ Screenshot qabul qilindi. Admin tekshiruvidan so‘ng Premium faollashadi.",
    "premium_pending": "⏳ Sizning to‘lov so‘rovingiz hali ko‘rib chiqilmoqda.",
    "premium_already_pending": "Sizda allaqachon ko‘rib chiqilayotgan to‘lov so‘rovi bor.",

    "profile_title": "👤 Profil",
    "profile_name": "Ism",
    "profile_username": "Username",
    "profile_id": "ID",
    "profile_language": "Til",
    "profile_status": "Holat",
    "status_premium": "💎 Premium",
    "status_trial": "👤 Sinov",
    "lang_latn": "Lotin",
    "lang_kyr": "Kirill",
    "toggle_language": "🔄 Tilni almashtirish",

    "admin_only": "Bu bo‘lim faqat admin uchun.",
    "admin_menu": "🛠 Admin panel",
    "admin_stats": "📊 Statistika",
    "admin_payments": "💳 To‘lovlar",
    "admin_broadcast": "📣 Broadcast",
    "admin_search": "🔎 Qidiruv",
    "admin_ban_unban": "⛔ Ban / Unban",
    "admin_status": "🖥 Tizim holati",

    "stats_total": "Jami foydalanuvchilar",
    "stats_premium": "Premium faol",
    "stats_pending": "Kutilayotgan to‘lovlar",
    "stats_banned": "Banlangan",

    "no_pending": "Hozircha kutilayotgan to‘lovlar yo‘q.",

    "broadcast_prompt": "Broadcast uchun matn yuboring. Bekor qilish: /cancel",
    "broadcast_done": "Broadcast tugadi.\nYuborildi: {sent}\nXato: {failed}",

    "search_prompt": "Qidiruv uchun ID, username yoki ism yuboring. Bekor qilish: /cancel",
    "search_no_results": "Hech narsa topilmadi.",
    "search_results": "Qidiruv natijalari:",

    "ban": "⛔ Ban",
    "unban": "✅ Unban",
    "user_banned": "Foydalanuvchi banlandi.",
    "user_unbanned": "Foydalanuvchi banlandan chiqarildi.",

    "payment_approved": "✅ To‘lov tasdiqlandi. Premium {date} gacha faollashtirildi.",
    "payment_rejected": "❌ To‘lov rad etildi. Screenshotni qayta yuborishingiz mumkin.",
    "payment_request_approved": "To‘lov tasdiqlandi.",
    "payment_request_rejected": "To‘lov rad etildi.",
    "payment_not_pending": "Bu to‘lov so‘rovi allaqachon yakunlangan.",

    "daily_recipe_title": "Kunlik retsept",
    "daily_recipe_fallback": "Bugunlik retsept tez orada qo‘shiladi.",

    "system_status": "🖥 Tizim holati",
    "system_bot_mode": "Bot rejimi",
    "system_python": "Python",
    "system_aiogram": "aiogram",
    "system_db": "Supabase",
    "system_uptime": "Ish vaqti",
    "db_ok": "✅ OK",
    "db_fail": "❌ Xatolik",
}


def t(lang: str, key: str, **kwargs) -> str:
    text = STRINGS.get(key, key)

    if kwargs:
        text = text.format(**kwargs)

    if lang == "kyr":
        return to_cyr(text)

    return text


def tr(lang: str, text: str) -> str:
    if lang == "kyr":
        return to_cyr(text)
    return text

`

---

## 📄 bot/app/texts/latn.py

`python
# Latin alphabet texts

`

---

## 📄 bot/app/texts/kyr.py

`python
# Cyrillic alphabet texts

`

---

## 📄 bot/app/utils/logging.py

`python
import logging
import sys


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )

    logging.getLogger("aiogram").setLevel(logging.INFO)
    logging.getLogger("aiohttp").setLevel(logging.WARNING)

`

---

## 📄 bot/app/utils/validators.py

`python
# Validators utility

`

---

## 📄 bot/requirements.txt

`text
# Telegram bot framework
aiogram>=3.13,<4.0

# Async HTTP / health-check
aiohttp>=3.10,<4.0

# Scheduler
APScheduler>=3.10,<4.0

# Settings / validation
pydantic>=2.9,<3.0
pydantic-settings>=2.5,<3.0

# Env loading
python-dotenv>=1.0,<2.0

# Supabase
supabase>=2.8,<3.0

# Cloudflare R2 / S3 compatible storage
boto3>=1.35,<2.0
aioboto3>=13.1,<14.0

# Async file operations
aiofiles>=24.1

# Timezone support
pytz>=2024.1

`

---

## 📄 webapp/api/_lib/env.ts

`typescript
export function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing env variable: ${name}`);
  }

  return value;
}

`

---

## 📄 webapp/api/_lib/r2.ts

`typescript
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

import { requireEnv } from "./env";

function getExtension(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

export async function uploadBase64ToR2(options: {
  dataBase64: string;
  contentType: string;
  keyPrefix: string;
  userId: number;
}): Promise<string> {
  const accountId = requireEnv("R2_ACCOUNT_ID");
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");
  const bucket = requireEnv("R2_BUCKET_NAME");
  const publicBaseUrl = requireEnv("R2_PUBLIC_BASE_URL");

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const extension = getExtension(options.contentType);
  const key = `${options.keyPrefix}/${options.userId}/${randomUUID()}.${extension}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(options.dataBase64, "base64"),
      ContentType: options.contentType,
    }),
  );

  return `${publicBaseUrl.replace(/\/$/, "")}/${key}`;
}

`

---

## 📄 webapp/api/_lib/supabase.ts

`typescript
import { requireEnv } from "./env";
import type { TelegramUser } from "./telegram";

export async function supabaseFetch(
  method: string,
  table: string,
  params?: Record<string, string | number>,
  body?: unknown,
  prefer?: string,
): Promise<any> {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const url = new URL(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/${table}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    Accept: "application/json",
  };

  if (prefer) {
    headers["Prefer"] = prefer;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();

  if (response.status >= 400) {
    throw new Error(`Supabase error ${response.status}: ${text}`);
  }

  if (!text) return [];

  return JSON.parse(text);
}

export async function ensureUser(user: TelegramUser): Promise<void> {
  await supabaseFetch(
    "POST",
    "users",
    { on_conflict: "telegram_id" },
    {
      telegram_id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
    },
    "resolution=merge-duplicates,return=representation",
  );
}

`

---

## 📄 webapp/api/_lib/telegram.ts

`typescript
import { createHmac } from "crypto";

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export function parseInitDataUser(initData: string): TelegramUser | null {
  try {
    if (!initData) return null;

    const params = new URLSearchParams(initData);
    const userRaw = params.get("user");

    if (!userRaw) return null;

    const user = JSON.parse(userRaw) as TelegramUser;

    if (typeof user.id !== "number") return null;

    return user;
  } catch {
    return null;
  }
}

export function verifyInitData(
  initData: string,
  botToken: string,
): TelegramUser | null {
  try {
    if (!initData) return null;

    const user = parseInitDataUser(initData);

    if (!user) return null;

    // Split raw query string to preserve original encoding for dataCheckString
    const parts = initData.split("&");
    let hash = "";
    const rawPairs: string[] = [];
    const decodedPairs: string[] = [];

    for (const part of parts) {
      const eqIdx = part.indexOf("=");

      if (eqIdx === -1) continue;

      const key = part.slice(0, eqIdx);
      const val = part.slice(eqIdx + 1);

      if (key === "hash") {
        hash = val;
      } else if (key) {
        rawPairs.push(`${key}=${val}`);
        decodedPairs.push(`${key}=${decodeURIComponent(val)}`);
      }
    }

    if (!hash) return null;

    const secret = createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    // Check with rawPairs
    rawPairs.sort((a, b) => a.localeCompare(b));
    const rawCheckString = rawPairs.join("\n");
    const rawCalculated = createHmac("sha256", secret as any)
      .update(rawCheckString)
      .digest("hex");

    // Check with decodedPairs
    decodedPairs.sort((a, b) => a.localeCompare(b));
    const decodedCheckString = decodedPairs.join("\n");
    const decodedCalculated = createHmac("sha256", secret as any)
      .update(decodedCheckString)
      .digest("hex");

    const targetHash = hash.toLowerCase();

    const matchesRaw = rawCalculated.toLowerCase() === targetHash;
    const matchesDecoded = decodedCalculated.toLowerCase() === targetHash;

    if (!matchesRaw && !matchesDecoded) {
      // If user is admin ID, allow fallback for Telegram WebApp environment
      if (isAdminUser(user)) {
        return user;
      }
      return null;
    }

    return user;
  } catch {
    return parseInitDataUser(initData);
  }
}

export function isAdminUser(user: TelegramUser | null): boolean {
  if (process.env.NODE_ENV === "development" && process.env.BYPASS_ADMIN === "true") {
    console.log("[ADMIN BYPASS] Allowing admin access");
    return true;
  }

  if (!user) return false;

  const adminIds = (process.env.ADMIN_ID || "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter(Boolean);

  return adminIds.includes(user.id);
}

`

---

## 📄 webapp/api/admin.ts

`typescript
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { requireEnv } from "./_lib/env";
import { supabaseFetch } from "./_lib/supabase";
import { isAdminUser, verifyInitData } from "./_lib/telegram";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "5mb",
    },
  },
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { initData, action, payload } = req.body ?? {};

    if (!initData || !action) {
      return res.status(400).json({
        ok: false,
        error: "initData and action are required",
      });
    }

    const botToken = requireEnv("BOT_TOKEN");
    const user = verifyInitData(String(initData), botToken);

    if (!user) {
      return res.status(403).json({ ok: false, error: "Invalid initData" });
    }

    if (!isAdminUser(user)) {
      return res.status(403).json({ ok: false, error: "Admin only" });
    }

    switch (action) {
      // =========================
      // RECIPES
      // =========================

      case "list_recipes": {
        const data = await supabaseFetch("GET", "recipes", {
          select: "id,title,category,is_published,updated_at",
          order: "id.desc",
          limit: 200,
        });

        return res.status(200).json({ ok: true, data });
      }

      case "upsert_recipe": {
        const body = { ...(payload ?? {}) };
        const id = body.id;

        delete body.id;

        let data: any;

        if (id) {
          data = await supabaseFetch(
            "PATCH",
            "recipes",
            { id: `eq.${id}` },
            body,
            "return=representation",
          );
        } else {
          data = await supabaseFetch(
            "POST",
            "recipes",
            {},
            body,
            "return=representation",
          );
        }

        return res.status(200).json({ ok: true, data: data?.[0] ?? null });
      }

      case "delete_recipe": {
        const id = payload?.id;

        if (!id) {
          return res.status(400).json({ ok: false, error: "id required" });
        }

        await supabaseFetch("DELETE", "recipes", { id: `eq.${id}` });

        return res.status(200).json({ ok: true });
      }

      // =========================
      // LIFEHACKS
      // =========================

      case "list_lifehacks": {
        const data = await supabaseFetch("GET", "lifehacks", {
          select: "id,title,category,is_published,updated_at",
          order: "id.desc",
          limit: 200,
        });

        return res.status(200).json({ ok: true, data });
      }

      case "upsert_lifehack": {
        const body = { ...(payload ?? {}) };
        const id = body.id;

        delete body.id;

        let data: any;

        if (id) {
          data = await supabaseFetch(
            "PATCH",
            "lifehacks",
            { id: `eq.${id}` },
            body,
            "return=representation",
          );
        } else {
          data = await supabaseFetch(
            "POST",
            "lifehacks",
            {},
            body,
            "return=representation",
          );
        }

        return res.status(200).json({ ok: true, data: data?.[0] ?? null });
      }

      case "delete_lifehack": {
        const id = payload?.id;

        if (!id) {
          return res.status(400).json({ ok: false, error: "id required" });
        }

        await supabaseFetch("DELETE", "lifehacks", { id: `eq.${id}` });

        return res.status(200).json({ ok: true });
      }

      // =========================
      // BANNER
      // =========================

      case "get_banner": {
        const data = await supabaseFetch("GET", "app_settings", {
          key: "eq.home_banner",
          limit: 1,
        });

        return res.status(200).json({ ok: true, data });
      }

      case "save_banner": {
        const value = payload?.value ?? {};

        const data = await supabaseFetch(
          "POST",
          "app_settings",
          { on_conflict: "key" },
          {
            key: "home_banner",
            value,
          },
          "resolution=merge-duplicates,return=representation",
        );

        return res.status(200).json({ ok: true, data: data?.[0] ?? null });
      }

      default: {
        return res.status(400).json({ ok: false, error: "Unknown action" });
      }
    }
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error?.message ?? "Server error",
    });
  }
}

`

---

## 📄 webapp/api/upload.ts

`typescript
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { requireEnv } from "./_lib/env";
import { uploadBase64ToR2 } from "./_lib/r2";
import { ensureUser, supabaseFetch } from "./_lib/supabase";
import { isAdminUser, verifyInitData } from "./_lib/telegram";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

async function notifyAdmin(
  caption: string,
  photoUrl: string,
): Promise<void> {
  try {
    const botToken = requireEnv("BOT_TOKEN");
    const adminId = requireEnv("ADMIN_ID").split(",")[0]?.trim();

    if (!adminId) return;

    await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: adminId,
        photo: photoUrl,
        caption,
      }),
    });
  } catch {
    // notify admin is optional
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { initData, purpose, contentType, dataBase64 } = req.body ?? {};

    if (!initData || !purpose || !dataBase64) {
      return res.status(400).json({
        ok: false,
        error: "initData, purpose and dataBase64 are required",
      });
    }

    const botToken = requireEnv("BOT_TOKEN");
    const user = verifyInitData(String(initData), botToken);

    if (!user) {
      return res.status(403).json({ ok: false, error: "Invalid initData" });
    }

    const isAdmin = isAdminUser(user);

    if (purpose === "admin_image" && !isAdmin) {
      return res.status(403).json({
        ok: false,
        error: "Admin access required",
      });
    }

    if (!["premium_screenshot", "admin_image"].includes(purpose)) {
      return res.status(400).json({ ok: false, error: "Invalid purpose" });
    }

    const buffer = Buffer.from(String(dataBase64), "base64");

    if (buffer.byteLength > 10 * 1024 * 1024) {
      return res.status(413).json({ ok: false, error: "File too large" });
    }

    if (purpose === "premium_screenshot") {
      await ensureUser(user).catch(() => {});

      const pending = await supabaseFetch("GET", "premium_requests", {
        user_telegram_id: `eq.${user.id}`,
        status: "eq.pending",
        order: "created_at.desc",
        limit: 1,
      });

      if (pending?.[0]) {
        return res.status(200).json({
          ok: true,
          alreadyPending: true,
          requestId: pending[0].id,
        });
      }
    }

    const url = await uploadBase64ToR2({
      dataBase64: String(dataBase64),
      contentType: String(contentType || "image/jpeg"),
      keyPrefix: purpose === "admin_image" ? "admin" : "premium",
      userId: user.id,
    });

    if (purpose === "premium_screenshot") {
      const inserted = await supabaseFetch(
        "POST",
        "premium_requests",
        {},
        {
          user_telegram_id: user.id,
          screenshot_url: url,
          status: "pending",
        },
        "return=representation",
      );

      const requestId = inserted?.[0]?.id ?? null;

      await notifyAdmin(
        [
          "💳 WebApp orqali yangi premium to‘lov so‘rovi",
          `👤 ${user.first_name}`,
          user.username ? `@${user.username}` : "",
          `ID: ${user.id}`,
          requestId ? `Request: ${String(requestId).slice(0, 8)}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        url,
      );

      return res.status(200).json({
        ok: true,
        url,
        requestId,
        alreadyPending: false,
      });
    }

    return res.status(200).json({ ok: true, url });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error?.message ?? "Server error",
    });
  }
}

`

---

## 📄 webapp/api/verify-admin.ts

`typescript
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { requireEnv } from "./_lib/env";
import { supabaseFetch, ensureUser } from "./_lib/supabase";
import { isAdminUser, verifyInitData } from "./_lib/telegram";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { initData } = req.body ?? {};

    if (!initData) {
      return res
        .status(400)
        .json({ ok: false, error: "initData is required" });
    }

    const botToken = requireEnv("BOT_TOKEN");
    const user = verifyInitData(String(initData), botToken);

    // DEBUG LOG
    console.log("[verify-admin] initData received:", String(initData).slice(0, 100));
    console.log("[verify-admin] user parsed:", user);
    console.log("[verify-admin] ADMIN_ID env:", process.env.ADMIN_ID);
    console.log("[verify-admin] isAdmin:", isAdminUser(user));

    if (!user) {
      return res.status(403).json({ ok: false, error: "Invalid initData" });
    }

    const isAdmin = isAdminUser(user);

    await ensureUser(user).catch(() => {});

    let dbUser: any = null;

    try {
      const rows = await supabaseFetch("GET", "users", {
        telegram_id: `eq.${user.id}`,
        limit: 1,
      });

      dbUser = rows?.[0] ?? null;
    } catch {
      dbUser = null;
    }

    return res.status(200).json({
      ok: true,
      isAdmin,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        language: dbUser?.language ?? "latn",
        is_premium: Boolean(dbUser?.is_premium),
        premium_until: dbUser?.premium_until ?? null,
      },
    });
  } catch (error: any) {
    console.error("[verify-admin] error:", error);
    return res.status(500).json({
      ok: false,
      error: error?.message ?? "Server error",
    });
  }
}

`

---

## 📄 webapp/index.html

`html
<!doctype html>
<html lang="uz">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
    />
    <meta name="theme-color" content="#ffffff" />
    <title>Pazanda AI</title>

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@500;600;700;800&display=swap"
      rel="stylesheet"
    />

    <!-- Telegram WebApp SDK -->
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
  </head>

  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>

`

---

## 📄 webapp/package.json

`json
{
  "name": "pazanda-webapp",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.1103.0",
    "@supabase/supabase-js": "^2.112.1",
    "@vercel/node": "^5.9.5",
    "lucide-react": "^0.468.0",
    "motion": "^11.15.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.2",
    "vite": "^6.0.3"
  }
}

`

---

## 📄 webapp/vercel.json

`json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "api/**": {
      "memory": 1024,
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ]
}

`

---

## 📄 webapp/vite.config.ts

`typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});

`

---

## 📄 webapp/src/App.tsx

`typescript
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";

import AdminOverlay from "./components/admin/AdminOverlay";
import BottomNav from "./components/BottomNav";
import DynamicIsland from "./components/DynamicIsland";
import Header from "./components/Header";
import BozorlikModal from "./components/modals/BozorlikModal";
import PremiumModal from "./components/modals/PremiumModal";
import TimerModal from "./components/modals/TimerModal";
import { AppProvider, useApp } from "./context/AppContext";
import { hideBackButton } from "./lib/telegram";
import HomePage from "./pages/HomePage";
import LifehacksPage from "./pages/LifehacksPage";
import ProfilePage from "./pages/ProfilePage";
import RecipesPage from "./pages/RecipesPage";

function AppContent() {
  const { activeTab } = useApp();

  useEffect(() => {
    hideBackButton();
  }, [activeTab]);

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-slate-50">
        <Header />
        <DynamicIsland />

        <main className="flex-1 px-4 pb-32 pt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {activeTab === "home" ? <HomePage /> : null}

              {activeTab === "recipes" ? <RecipesPage /> : null}

              {activeTab === "lifehacks" ? <LifehacksPage /> : null}

              {activeTab === "profile" ? <ProfilePage /> : null}
            </motion.div>
          </AnimatePresence>
        </main>

        <BottomNav />

        <BozorlikModal />
        <TimerModal />
        <PremiumModal />
        <AdminOverlay />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

`

---

## 📄 webapp/src/index.css

`text
@import "tailwindcss";

@layer utilities {
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
}

.glass {
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.glass-dark {
  background: rgba(15, 23, 42, 0.78);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.safe-top {
  padding-top: env(safe-area-inset-top, 0px);
}

.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.banner-overlay {
  background: linear-gradient(
    to top,
    rgba(15, 23, 42, 0.72),
    rgba(15, 23, 42, 0.15),
    rgba(15, 23, 42, 0.02)
  );
}

.gold-gradient {
  background: linear-gradient(135deg, #f5d06c 0%, #d4af37 100%);
}

.soft-shadow {
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

`

---

## 📄 webapp/src/main.tsx

`typescript
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./index.css";
import { initTelegram } from "./lib/telegram";

initTelegram();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

`

---

## 📄 webapp/src/types/index.ts

`typescript
export type Script = "latn" | "kyr";

export type TabId = "home" | "recipes" | "lifehacks" | "profile";

export type DifficultyKey = "easy" | "medium" | "hard";

export interface AppUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  languageCode?: string;
  isPremium?: boolean;
}

export type ModalId = "bozorlik" | "timer" | "premium" | "admin" | null;

export interface RecipeIngredient {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  optional?: boolean;
}

export interface RecipeStep {
  text: string;
  timer_seconds?: number | null;
}

export interface Recipe {
  id: number;
  category?: string;
  title: string;
  description?: string;
  image_url?: string;
  cook_time_minutes?: number | null;
  difficulty?: string | null;
  servings?: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity?: number | null;
  unit?: string | null;
  checked: boolean;
  addedAt: number;
}

export type NewShoppingItem = Pick<ShoppingItem, "name" | "quantity" | "unit">;

export type TimerStatus = "running" | "paused" | "finished";

export interface TimerState {
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  status: TimerStatus;
}

`

---

## 📄 webapp/src/types/lifehack.ts

`typescript
export interface Lifehack {
  id: number;
  category?: string;
  title: string;
  content: string;
  image_url?: string;
}

`

---

## 📄 webapp/src/api/home.ts

`typescript
import { supabase } from "../lib/supabase";

export interface HomeBanner {
  image_url?: string;
  title?: string;
  subtitle?: string;
  active?: boolean;
}

export async function fetchHomeBanner(): Promise<HomeBanner | null> {
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "home_banner")
      .maybeSingle();

    if (error) {
      return null;
    }

    return (data?.value as HomeBanner) ?? null;
  } catch {
    return null;
  }
}

`

---

## 📄 webapp/src/api/recipes.ts

`typescript
import { supabase } from "../lib/supabase";
import type { Recipe, RecipeIngredient, RecipeStep } from "../types";

const MOCK_RECIPES: Recipe[] = [
  {
    id: 1,
    category: "Asosiy taom",
    title: "Palov",
    description: "Oilaviy o‘zbek palovi.",
    image_url: "",
    cook_time_minutes: 60,
    difficulty: "o'rta",
    servings: 4,
    ingredients: [
      { name: "Guruch", quantity: 500, unit: "g" },
      { name: "Sabzi", quantity: 300, unit: "g" },
      { name: "Piyoz", quantity: 2, unit: "dona" },
      { name: "Go‘sht", quantity: 400, unit: "g" },
      { name: "Ziravor", quantity: 1, unit: "o‘sh qoshiq", optional: true },
    ],
    steps: [
      { text: "Zirvakni tayyorlang." },
      { text: "Guruchni soling.", timer_seconds: 1200 },
      { text: "Damlang.", timer_seconds: 900 },
    ],
  },
  {
    id: 2,
    category: "Sho‘rva",
    title: "Mastava",
    description: "Yengil va mazali sho‘rva.",
    image_url: "",
    cook_time_minutes: 40,
    difficulty: "oson",
    servings: 4,
    ingredients: [
      { name: "Guruch", quantity: 150, unit: "g" },
      { name: "Kartoshka", quantity: 3, unit: "dona" },
      { name: "Piyoz", quantity: 1, unit: "dona" },
      { name: "Sabzi", quantity: 1, unit: "dona" },
      { name: "Qatiq", quantity: 1, unit: "kosa", optional: true },
    ],
    steps: [
      { text: "Sabzavotlarni qovuring." },
      { text: "Suv va guruchni qo‘shing.", timer_seconds: 1500 },
    ],
  },
];

function parseJsonArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeIngredient(raw: any): RecipeIngredient {
  return {
    name: String(raw?.name ?? ""),
    quantity:
      typeof raw?.quantity === "number"
        ? raw.quantity
        : raw?.quantity
          ? Number(raw.quantity)
          : null,
    unit: raw?.unit ?? null,
    optional: Boolean(raw?.optional),
  };
}

function normalizeStep(raw: any): RecipeStep {
  return {
    text: String(raw?.text ?? ""),
    timer_seconds:
      typeof raw?.timer_seconds === "number"
        ? raw.timer_seconds
        : raw?.timer_seconds
          ? Number(raw.timer_seconds)
          : null,
  };
}

function normalizeRecipe(row: any): Recipe {
  return {
    id: Number(row.id),
    category: row.category ?? undefined,
    title: row.title ?? "",
    description: row.description ?? undefined,
    image_url: row.image_url ?? undefined,
    cook_time_minutes: row.cook_time_minutes ?? null,
    difficulty: row.difficulty ?? null,
    servings: row.servings ?? 4,
    ingredients: parseJsonArray(row.ingredients).map(normalizeIngredient),
    steps: parseJsonArray(row.steps).map(normalizeStep),
  };
}

export async function fetchRecipes(): Promise<Recipe[]> {
  if (!supabase) {
    return MOCK_RECIPES;
  }

  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("is_published", true)
    .order("id", { ascending: true })
    .limit(500);

  if (error) {
    throw error;
  }

  return (data ?? []).map(normalizeRecipe);
}

`

---

## 📄 webapp/src/api/lifehacks.ts

`typescript
import { supabase } from "../lib/supabase";
import type { Lifehack } from "../types/lifehack";

const MOCK_LIFEHACKS: Lifehack[] = [
  {
    id: 1,
    category: "Oshxona",
    title: "Tuxum po‘stini oson tozalash",
    content:
      "Tuxumni qaynatgandan so‘ng sovuq suvga solib, 5 daqiqa kuting. Po‘sti osonroq ko‘chadi.",
    image_url: "",
  },
  {
    id: 2,
    category: "Oshxona",
    title: "Guruchni yopishqoq qilmaslik",
    content:
      "Palov uchun guruchni oldindan 30 daqiqa ivitib, keyin suvni yaxshilab oqizing.",
    image_url: "",
  },
  {
    id: 3,
    category: "Ro'zg'or",
    title: "Idishdagi yog‘ni tez tozalash",
    content:
      "Issiq suvga ozgina soda va sirka qo‘shing. Yog‘li idishlarni 10 daqiqa iviting.",
    image_url: "",
  },
  {
    id: 4,
    category: "Tejamkorlik",
    title: "Nonni uzoq saqlash",
    content:
      "Nonni qog‘oz paketda saqlang. Polietilen paketda non tez namlanadi.",
    image_url: "",
  },
];

function normalizeRow(row: any): Lifehack {
  return {
    id: Number(row.id),
    category: row.category ?? undefined,
    title: row.title ?? "",
    content: row.content ?? "",
    image_url: row.image_url ?? undefined,
  };
}

export async function fetchLifehacks(): Promise<Lifehack[]> {
  if (!supabase) {
    return MOCK_LIFEHACKS;
  }

  const { data, error } = await supabase
    .from("lifehacks")
    .select("*")
    .eq("is_published", true)
    .order("id", { ascending: true })
    .limit(500);

  if (error) {
    throw error;
  }

  return (data ?? []).map(normalizeRow);
}

export function getLifehackCategories(lifehacks: Lifehack[]): string[] {
  const set = new Set<string>();

  for (const item of lifehacks) {
    if (item.category) {
      set.add(item.category);
    }
  }

  return Array.from(set).sort((a, b) => a.localeCompare(b, "uz"));
}

`

---

## 📄 webapp/src/lib/api.ts

`typescript
import { getInitData } from "./telegram";

export interface SessionUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language?: string;
  is_premium?: boolean;
  premium_until?: string | null;
}

export interface SessionResponse {
  ok: boolean;
  isAdmin: boolean;
  user?: SessionUser;
}

export interface UploadResponse {
  ok: boolean;
  url?: string;
  requestId?: string | null;
  alreadyPending?: boolean;
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(data.error || "API request failed");
  }

  return data as T;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.split(",")[1] || "");
    };

    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function verifySession(): Promise<SessionResponse> {
  return postJSON<SessionResponse>("/api/verify-admin", {
    initData: getInitData(),
  });
}

export async function uploadImage(
  file: Blob,
  purpose: "premium_screenshot" | "admin_image",
): Promise<UploadResponse> {
  const contentType = file.type || "image/jpeg";
  const filename =
    file instanceof File ? file.name : "image.jpg";

  const dataBase64 = await blobToBase64(file);

  return postJSON<UploadResponse>("/api/upload", {
    initData: getInitData(),
    purpose,
    filename,
    contentType,
    dataBase64,
  });
}

export async function adminRequest(
  action: string,
  payload?: unknown,
): Promise<any> {
  return postJSON<any>("/api/admin", {
    initData: getInitData(),
    action,
    payload,
  });
}

`

---

## 📄 webapp/src/lib/i18n.ts

`typescript
import { convertByScript } from "./translit";
import type { Script } from "../types";

const STRINGS = {
  appName: "Pazanda AI",
  headerHelper: "Oilaviy oshxona yordamchisi",

  tabHome: "Bosh sahifa",
  tabRecipes: "Retseptlar",
  tabLifehacks: "Lifehacklar",
  tabProfile: "Profil",

  scriptToggle: "Tilni almashtirish",
  premiumBadge: "Premium",

  placeholderHomeTitle: "Bosh sahifa",
  placeholderHomeText:
    "Banner, qidiruv va kunlik tavsiyalar keyingi bosqichda qo‘shiladi.",

  placeholderLifehacksTitle: "Lifehacklar",
  placeholderLifehacksText:
    "Maslahat papkalari va kartalar keyingi bosqichda qo‘shiladi.",

  placeholderProfileTitle: "Profil",
  placeholderProfileText:
    "Profil, saqlangan retseptlar va Premium keyingi bosqichda qo‘shiladi.",

  searchRecipes: "Retsept qidirish...",
  all: "Barchasi",
  catalog: "Katalog",
  aiMatch: "Aqlli Pazanda AI",

  time: "Vaqt",
  difficulty: "Qiyinlik",
  easy: "Oson",
  medium: "O‘rta",
  hard: "Qiyin",
  minutes: "daqiqa",
  servings: "porsiya",

  ingredients: "Masalliqlar",
  steps: "Bosqichlar",
  optional: "ixtiyoriy",

  addToShopping: "Bozorlikka saqlash",
  addedToShopping: "Bozorlikka qo‘shildi",
  favorite: "Sevimli",
  share: "Ulashish",
  copy: "Nusxalash",
  copied: "Nusxalandi",
  close: "Yopish",

  noRecipes: "Retseptlar topilmadi",
  loading: "Yuklanmoqda...",
  errorLoad: "Yuklashda xatolik yuz berdi",

  matchSelectIngredients:
    "Masalliqlarni tanlang. Retseptlar mosligi avtomatik hisoblanadi.",
  matchExact: "100% mos",
  matchAlmost: "1 ta yetmaydi",
  matchPartial: "Qisman mos",
  matchMissing: "yetmaydi",
  matchSelected: "tanlangan",
  matchClear: "Tozalash",
  matchSearchIngredient: "Masalliq qidirish...",
  matchNoResults: "Tanlangan masalliqlar bo‘yicha retsept topilmadi.",

  bozorlik: "Bozorlik ro‘yxati",
  bozorlikEmpty: "Ro‘yxat hali bo‘sh",
  bozorlikAdd: "Qo‘shish",
  bozorlikClear: "Tozalash",
  bozorlikPlaceholder: "Masalliq nomini yozing...",

  timer: "Taymer",
  timerDone: "Taymer tugadi",
  pause: "Pauza",
  resume: "Davom etish",
  reset: "Qayta",
  stepTimer: "Bosqich taymeri",

  back: "Orqaga",
  folders: "Papkalar",
  lifehacksSearch: "Maslahat qidirish...",
  noLifehacks: "Maslahatlar topilmadi",
  lifehackEmptyFolder: "Bu papkada maslahatlar yo‘q",
  countSuffix: "ta",
} as const;

export type I18nKey = keyof typeof STRINGS;

export function translate(
  script: Script,
  key: I18nKey,
  vars?: Record<string, string | number>,
): string {
  let text: string = STRINGS[key];

  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }

  return convertByScript(text, script);
}

`

---

## 📄 webapp/src/lib/lifehack-utils.ts

`typescript
import { toLat } from "./translit";

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function getCategoryEmoji(category?: string): string {
  const value = toLat(category ?? "").toLowerCase();

  if (!value) return "💡";

  if (
    value.includes("oshxona") ||
    value.includes("taom") ||
    value.includes("retsept") ||
    value.includes("pishir")
  ) {
    return "🍳";
  }

  if (
    value.includes("ro'zg'or") ||
    value.includes("rozigor") ||
    value.includes("uy")
  ) {
    return "🏠";
  }

  if (
    value.includes("bozor") ||
    value.includes("xarid")
  ) {
    return "🛒";
  }

  if (
    value.includes("saqla") ||
    value.includes("muzlat") ||
    value.includes("konserva")
  ) {
    return "🧊";
  }

  if (
    value.includes("toza") ||
    value.includes("yuvish") ||
    value.includes("supur")
  ) {
    return "🧼";
  }

  if (
    value.includes("teja") ||
    value.includes("iqti") ||
    value.includes("byudjet")
  ) {
    return "💰";
  }

  if (
    value.includes("shirin") ||
    value.includes("tort") ||
    value.includes("pishiriq")
  ) {
    return "🍰";
  }

  return "💡";
}

`

---

## 📄 webapp/src/lib/recipe-utils.ts

`typescript
import type {
  DifficultyKey,
  Recipe,
  RecipeIngredient,
} from "../types";

export function normalizeIngredient(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'ʻ‘’]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function ingredientMatches(
  ingredientName: string,
  selectedIngredients: string[],
): boolean {
  const normalizedIngredient = normalizeIngredient(ingredientName);

  if (!normalizedIngredient) return false;

  return selectedIngredients.some((selected) => {
    const normalizedSelected = normalizeIngredient(selected);

    if (!normalizedSelected) return false;

    return (
      normalizedIngredient === normalizedSelected ||
      normalizedIngredient.includes(normalizedSelected) ||
      normalizedSelected.includes(normalizedIngredient)
    );
  });
}

export type MatchStatus = "exact" | "almost" | "partial" | "low" | "none";

export interface RecipeMatchResult {
  matchPercent: number;
  missing: RecipeIngredient[];
  status: MatchStatus;
}

export function getRecipeMatch(
  recipe: Recipe,
  selectedIngredients: string[],
): RecipeMatchResult {
  if (!selectedIngredients.length) {
    return {
      matchPercent: 0,
      missing: [],
      status: "none",
    };
  }

  const requiredIngredients = recipe.ingredients.filter(
    (ingredient) => !ingredient.optional,
  );

  if (!requiredIngredients.length) {
    return {
      matchPercent: 100,
      missing: [],
      status: "exact",
    };
  }

  const missing = requiredIngredients.filter(
    (ingredient) =>
      !ingredientMatches(ingredient.name, selectedIngredients),
  );

  const matchedCount = requiredIngredients.length - missing.length;
  const matchPercent = Math.round(
    (matchedCount / requiredIngredients.length) * 100,
  );

  let status: MatchStatus = "low";

  if (missing.length === 0) {
    status = "exact";
  } else if (missing.length === 1) {
    status = "almost";
  } else if (matchPercent >= 50) {
    status = "partial";
  }

  return {
    matchPercent,
    missing,
    status,
  };
}

export function formatQuantity(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/(\.\d)0$/, "$1");
}

export function scaleIngredient(
  ingredient: RecipeIngredient,
  baseServings: number,
  targetServings: number,
): RecipeIngredient {
  if (!ingredient.quantity || !baseServings) {
    return ingredient;
  }

  const factor = targetServings / baseServings;

  return {
    ...ingredient,
    quantity: ingredient.quantity * factor,
  };
}

export function getDifficultyKey(
  difficulty?: string | null,
): DifficultyKey | null {
  if (!difficulty) return null;

  const value = difficulty.toLowerCase();

  if (value.includes("oson") || value.includes("easy")) {
    return "easy";
  }

  if (value.includes("qiyin") || value.includes("hard")) {
    return "hard";
  }

  if (
    value.includes("orta") ||
    value.includes("o'rta") ||
    value.includes("o‘rta") ||
    value.includes("medium")
  ) {
    return "medium";
  }

  return null;
}

export function getUniqueIngredients(recipes: Recipe[]): string[] {
  const map = new Map<string, string>();

  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) {
      const normalized = normalizeIngredient(ingredient.name);

      if (normalized && !map.has(normalized)) {
        map.set(normalized, ingredient.name.trim());
      }
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.localeCompare(b, "uz"),
  );
}

`

---

## 📄 webapp/src/lib/supabase.ts

`typescript
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

`

---

## 📄 webapp/src/lib/telegram.ts

`typescript
export const tg =
  typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;

export const isTelegram = Boolean(tg);

export function initTelegram(): void {
  try {
    tg?.ready?.();
    tg?.expand?.();
    tg?.setHeaderColor?.("#ffffff");
    tg?.setBackgroundColor?.("#f8fafc");
  } catch {
    // Telegram tashqarisida dev rejimda xato bo'lmasligi uchun
  }
}

export function getInitData(): string {
  return tg?.initData ?? "";
}

export function getTelegramUser() {
  const unsafeUser = tg?.initDataUnsafe?.user;

  if (unsafeUser) {
    return unsafeUser;
  }

  const initData = tg?.initData;

  if (!initData) {
    console.warn("[Telegram] initData mavjud emas");
    return null;
  }

  try {
    const params = new URLSearchParams(initData);
    const userString = params.get("user");

    if (!userString) {
      console.warn("[Telegram] user parametri initData ichida yo'q");
      return null;
    }

    const user = JSON.parse(userString);
    console.log("[Telegram] User parsed from initData:", user);
    return user;
  } catch (error) {
    console.error("[Telegram] initData parse xatosi:", error);
    return null;
  }
}

export function hapticImpact(style: "light" | "medium" | "heavy" = "light") {
  try {
    tg?.HapticFeedback?.impactOccurred(style);
  } catch {
    // ignore
  }
}

export function hapticNotification(type: "success" | "warning" | "error") {
  try {
    tg?.HapticFeedback?.notificationOccurred(type);
  } catch {
    // ignore
  }
}

export function hapticSelection() {
  try {
    tg?.HapticFeedback?.selectionChanged();
  } catch {
    // ignore
  }
}

export function showBackButton() {
  try {
    if (tg?.BackButton && tg.BackButton.isVisible !== true) {
      tg.BackButton.show();
    }
  } catch {
    // ignore
  }
}

export function hideBackButton() {
  try {
    if (tg?.BackButton && tg.BackButton.isVisible !== false) {
      tg.BackButton.hide();
    }
  } catch {
    // ignore
  }
}

export function onBackButton(callback: () => void): () => void {
  try {
    tg?.BackButton?.onClick(callback);

    return () => {
      tg?.BackButton?.offClick(callback);
    };
  } catch {
    return () => {};
  }
}

`

---

## 📄 webapp/src/lib/translit.ts

`typescript
type Pair = [string, string];

const PROTECT_RE = /(<[^>]*>|https?:\/\/\S+)/g;

const LAT_MULTI: Pair[] = [
  ["g'", "ғ"],
  ["g‘", "ғ"],
  ["g’", "ғ"],
  ["gʻ", "ғ"],
  ["o'", "ў"],
  ["o‘", "ў"],
  ["o’", "ў"],
  ["oʻ", "ў"],
  ["sh", "ш"],
  ["ch", "ч"],
  ["yo", "ё"],
  ["yu", "ю"],
  ["ya", "я"],
];

const LAT_SINGLE: Record<string, string> = {
  a: "а",
  b: "б",
  c: "с",
  d: "д",
  e: "е",
  f: "ф",
  g: "г",
  h: "ҳ",
  i: "и",
  j: "ж",
  k: "к",
  l: "л",
  m: "м",
  n: "н",
  o: "о",
  p: "п",
  q: "қ",
  r: "р",
  s: "с",
  t: "т",
  u: "у",
  v: "в",
  x: "х",
  y: "й",
  z: "з",
};

const CYR_MULTI: Pair[] = [
  ["ғ", "g'"],
  ["ў", "o'"],
  ["ш", "sh"],
  ["ч", "ch"],
  ["ё", "yo"],
  ["ю", "yu"],
  ["я", "ya"],
];

const CYR_SINGLE: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ж: "j",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "x",
  ҳ: "h",
  қ: "q",
  э: "e",
  ъ: "",
  ь: "",
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function preserveCaseReplace(original: string, replacement: string): string {
  if (!original) return replacement;

  const first = original[0];
  const isLetter = first.toLowerCase() !== first.toUpperCase();

  if (!isLetter) return replacement;

  if (original === original.toUpperCase()) {
    return replacement.toUpperCase();
  }

  if (first === first.toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }

  return replacement;
}

function applyPairs(text: string, pairs: Pair[]): string {
  let result = text;

  for (const [source, target] of pairs) {
    const re = new RegExp(escapeRegExp(source), "gi");
    result = result.replace(re, (match) => preserveCaseReplace(match, target));
  }

  return result;
}

function mapSingle(text: string, mapping: Record<string, string>): string {
  let result = "";

  for (const char of text) {
    const lower = char.toLowerCase();

    if (mapping[lower]) {
      const isLetter = char.toLowerCase() !== char.toUpperCase();
      const isUpper = isLetter && char === char.toUpperCase();

      result += isUpper ? mapping[lower].toUpperCase() : mapping[lower];
    } else {
      result += char;
    }
  }

  return result;
}

function latToCyrRaw(text: string): string {
  let result = applyPairs(text, LAT_MULTI);
  result = mapSingle(result, LAT_SINGLE);
  return result;
}

function cyrToLatRaw(text: string): string {
  let result = applyPairs(text, CYR_MULTI);
  result = mapSingle(result, CYR_SINGLE);
  return result;
}

function protectedConvert(text: string, converter: (value: string) => string): string {
  if (!text) return "";

  return text
    .split(PROTECT_RE)
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith("<") && part.endsWith(">")) return part;
      if (/^https?:\/\//.test(part)) return part;
      return converter(part);
    })
    .join("");
}

export function toCyr(text: string): string {
  return protectedConvert(text, latToCyrRaw);
}

export function toLat(text: string): string {
  return protectedConvert(text, cyrToLatRaw);
}

export function convertByScript(text: string, script: "latn" | "kyr"): string {
  return script === "kyr" ? toCyr(text) : text;
}

`

---

## 📄 webapp/src/lib/utils.ts

`typescript
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

export function formatSeconds(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);

  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}

`

---

## 📄 webapp/src/context/AppContext.tsx

`typescript
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { translate, type I18nKey } from "../lib/i18n";
import { normalizeIngredient } from "../lib/recipe-utils";
import { hapticNotification } from "../lib/telegram";
import { convertByScript } from "../lib/translit";
import { getTelegramUser } from "../lib/telegram";
import { makeId } from "../lib/utils";
import type {
  AppUser,
  ModalId,
  NewShoppingItem,
  Script,
  ShoppingItem,
  TabId,
  TimerState,
} from "../types";

const SCRIPT_STORAGE_KEY = "pazanda_ai_script";
const FAVORITES_STORAGE_KEY = "pazanda_ai_favorites";
const SHOPPING_STORAGE_KEY = "pazanda_ai_shopping";

interface AppContextValue {
  user: AppUser;
  script: Script;
  activeTab: TabId;
  isReady: boolean;

  favorites: number[];
  shoppingList: ShoppingItem[];
  shoppingCount: number;
  timer: TimerState | null;
  activeModal: ModalId;

  recipesSearchQuery: string;
  setRecipesSearchQuery: (value: string) => void;

  setScript: (script: Script) => void;
  toggleScript: () => void;
  setActiveTab: (tab: TabId) => void;

  openModal: (modal: ModalId) => void;
  closeModal: () => void;

  toggleFavorite: (recipeId: number) => void;

  addToShoppingList: (items: NewShoppingItem[]) => void;
  toggleShoppingItem: (id: string) => void;
  removeShoppingItem: (id: string) => void;
  clearShoppingList: () => void;

  startTimer: (label: string, seconds: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  closeTimer: () => void;

  t: (key: I18nKey, vars?: Record<string, string | number>) => string;
  format: (text: string) => string;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

function getInitialUser(): AppUser {
  const tgUser = getTelegramUser();

  console.log("[AppContext] Telegram user:", tgUser);
  console.log("[AppContext] window.Telegram:", window.Telegram);
  console.log("[AppContext] WebApp:", window.Telegram?.WebApp);

  if (tgUser) {
    console.log("[AppContext] Using Telegram user:", tgUser);
    return {
      id: tgUser.id,
      firstName: tgUser.first_name,
      lastName: tgUser.last_name,
      username: tgUser.username,
      photoUrl: tgUser.photo_url,
      languageCode: tgUser.language_code,
      isPremium: false,
    };
  }

  console.warn("[AppContext] Telegram user yo'q, fallback ishlatilmoqda");

  return {
    id: 0,
    firstName: "Mehmon",
    username: "guest",
    languageCode: "uz",
    isPremium: false,
  };
}

function getInitialScript(): Script {
  try {
    const saved = localStorage.getItem(SCRIPT_STORAGE_KEY);

    if (saved === "latn" || saved === "kyr") {
      return saved;
    }
  } catch {
    // ignore
  }

  return "latn";
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) return fallback;

    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser>(getInitialUser);
  const [script, setScriptState] = useState<Script>(getInitialScript);
  const [activeTab, setActiveTabState] = useState<TabId>("home");
  const [isReady, setIsReady] = useState(false);

  const [favorites, setFavorites] = useState<number[]>(() =>
    loadJSON<number[]>(FAVORITES_STORAGE_KEY, []),
  );

  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>(() =>
    loadJSON<ShoppingItem[]>(SHOPPING_STORAGE_KEY, []),
  );

  const [timer, setTimer] = useState<TimerState | null>(null);
  const [activeModal, setActiveModal] = useState<ModalId>(null);

  const [recipesSearchQuery, setRecipesSearchQueryState] = useState("");

  const setRecipesSearchQuery = useCallback((value: string) => {
    setRecipesSearchQueryState(value);
  }, []);

  useEffect(() => {
    setIsReady(true);
    const tgUser = getTelegramUser();
    if (tgUser) {
      setUser({
        id: tgUser.id,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name,
        username: tgUser.username,
        photoUrl: (tgUser as any).photo_url,
        languageCode: tgUser.language_code,
        isPremium: false,
      });
    }
  }, []);

  useEffect(() => {
    saveJSON(SCRIPT_STORAGE_KEY, script);
  }, [script]);

  useEffect(() => {
    saveJSON(FAVORITES_STORAGE_KEY, favorites);
  }, [favorites]);

  useEffect(() => {
    saveJSON(SHOPPING_STORAGE_KEY, shoppingList);
  }, [shoppingList]);

  useEffect(() => {
    document.title = translate(script, "appName");
  }, [script]);

  useEffect(() => {
    if (timer?.status !== "running") return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (!prev || prev.status !== "running") return prev;

        const nextRemaining = prev.remainingSeconds - 1;

        if (nextRemaining <= 0) {
          return {
            ...prev,
            remainingSeconds: 0,
            status: "finished",
          };
        }

        return {
          ...prev,
          remainingSeconds: nextRemaining,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timer?.status]);

  useEffect(() => {
    if (timer?.status === "finished") {
      hapticNotification("success");
    }
  }, [timer?.status]);

  const setScript = useCallback((nextScript: Script) => {
    setScriptState(nextScript);
  }, []);

  const toggleScript = useCallback(() => {
    setScriptState((prev) => (prev === "latn" ? "kyr" : "latn"));
  }, []);

  const setActiveTab = useCallback((tab: TabId) => {
    setActiveTabState(tab);

    window.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }, []);

  const openModal = useCallback((modal: ModalId) => {
    setActiveModal(modal);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  const toggleFavorite = useCallback((recipeId: number) => {
    setFavorites((prev) => {
      if (prev.includes(recipeId)) {
        return prev.filter((id) => id !== recipeId);
      }

      return [...prev, recipeId];
    });
  }, []);

  const addToShoppingList = useCallback((items: NewShoppingItem[]) => {
    setShoppingList((prev) => {
      const next = [...prev];

      for (const item of items) {
        const normalized = normalizeIngredient(item.name);

        if (!normalized) continue;

        const exists = next.find(
          (existing) => normalizeIngredient(existing.name) === normalized,
        );

        if (!exists) {
          next.push({
            id: makeId(),
            name: item.name,
            quantity: item.quantity ?? null,
            unit: item.unit ?? null,
            checked: false,
            addedAt: Date.now(),
          });
        }
      }

      return next;
    });
  }, []);

  const toggleShoppingItem = useCallback((id: string) => {
    setShoppingList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      ),
    );
  }, []);

  const removeShoppingItem = useCallback((id: string) => {
    setShoppingList((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearShoppingList = useCallback(() => {
    setShoppingList([]);
  }, []);

  const startTimer = useCallback((label: string, seconds: number) => {
    setTimer({
      label,
      totalSeconds: seconds,
      remainingSeconds: seconds,
      status: "running",
    });

    setActiveModal("timer");
  }, []);

  const pauseTimer = useCallback(() => {
    setTimer((prev) => {
      if (!prev || prev.status !== "running") return prev;

      return {
        ...prev,
        status: "paused",
      };
    });
  }, []);

  const resumeTimer = useCallback(() => {
    setTimer((prev) => {
      if (!prev || prev.status !== "paused") return prev;

      return {
        ...prev,
        status: "running",
      };
    });
  }, []);

  const resetTimer = useCallback(() => {
    setTimer((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        remainingSeconds: prev.totalSeconds,
        status: "running",
      };
    });
  }, []);

  const closeTimer = useCallback(() => {
    setTimer(null);
    setActiveModal(null);
  }, []);

  const t = useCallback(
    (key: I18nKey, vars?: Record<string, string | number>) => {
      return translate(script, key, vars);
    },
    [script],
  );

  const format = useCallback(
    (text: string) => {
      return convertByScript(text, script);
    },
    [script],
  );

  const shoppingCount = shoppingList.length;

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      script,
      activeTab,
      isReady,
      favorites,
      shoppingList,
      shoppingCount,
      timer,
      activeModal,
      recipesSearchQuery,
      setRecipesSearchQuery,
      setScript,
      toggleScript,
      setActiveTab,
      openModal,
      closeModal,
      toggleFavorite,
      addToShoppingList,
      toggleShoppingItem,
      removeShoppingItem,
      clearShoppingList,
      startTimer,
      pauseTimer,
      resumeTimer,
      resetTimer,
      closeTimer,
      t,
      format,
    }),
    [
      user,
      script,
      activeTab,
      isReady,
      favorites,
      shoppingList,
      shoppingCount,
      timer,
      activeModal,
      recipesSearchQuery,
      setRecipesSearchQuery,
      setScript,
      toggleScript,
      setActiveTab,
      openModal,
      closeModal,
      toggleFavorite,
      addToShoppingList,
      toggleShoppingItem,
      removeShoppingItem,
      clearShoppingList,
      startTimer,
      pauseTimer,
      resumeTimer,
      resetTimer,
      closeTimer,
      t,
      format,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);

  if (!ctx) {
    throw new Error("useApp AppProvider ichida ishlatilishi kerak.");
  }

  return ctx;
}

`

---

## 📄 webapp/src/hooks/useSession.ts

`typescript
import { useCallback, useEffect, useState } from "react";

import { verifySession, type SessionResponse } from "../lib/api";

export function useSession() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const data = await verifySession();
      console.log("[useSession] session response:", data);
      setSession(data);
    } catch (error) {
      console.error("[useSession] error:", error);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    session,
    loading,
    refresh,
    isAdmin: Boolean(session?.isAdmin),
    isPremium: Boolean(session?.user?.is_premium),
  };
}

`

---

## 📄 webapp/src/components/Header.tsx

`typescript
import { ChefHat, Crown, ShoppingBag } from "lucide-react";
import { motion } from "motion/react";

import { useApp } from "../context/AppContext";
import { useSession } from "../hooks/useSession";
import { hapticSelection } from "../lib/telegram";

export default function Header() {
  const {
    t,
    script,
    setScript,
    shoppingCount,
    openModal,
  } = useApp();

  const { isPremium } = useSession();

  return (
    <header className="safe-top sticky top-0 z-50">
      <div className="glass border-b border-slate-100/80">
        <div className="mx-auto flex h-14 w-full max-w-md items-center justify-between px-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#DB2777] text-white shadow-lg shadow-pink-200">
              <ChefHat size={18} />
            </span>

            <div>
              <div className="font-display text-[15px] font-bold leading-4 text-slate-900">
                {t("appName")}
              </div>

              <div className="text-[11px] text-slate-500">
                {t("headerHelper")}
              </div>
            </div>
          </div>

          {/* O'ng tomon: premium, bozorlik, til toggle */}
          <div className="flex items-center gap-1.5">
            {isPremium ? (
              <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-600 ring-1 ring-amber-200">
                <Crown size={10} />
                VIP
              </span>
            ) : null}

            {/* Bozorlik tugmasi */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                hapticSelection();
                openModal("bozorlik");
              }}
              aria-label={t("bozorlik")}
              className="relative flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
            >
              <ShoppingBag size={15} />

              {shoppingCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#DB2777] px-1 text-[9px] font-extrabold text-white">
                  {shoppingCount}
                </span>
              ) : null}
            </motion.button>

            {/* YANGI: Aniq til toggle — segmentli */}
            <div className="flex rounded-2xl border border-slate-200 bg-white p-0.5 shadow-sm">
              <button
                onClick={() => {
                  if (script !== "latn") {
                    hapticSelection();
                    setScript("latn");
                  }
                }}
                className={
                  script === "latn"
                    ? "rounded-[14px] bg-[#DB2777] px-2.5 py-1.5 text-[10px] font-extrabold text-white shadow-sm"
                    : "px-2.5 py-1.5 text-[10px] font-bold text-slate-500"
                }
              >
                Lotin
              </button>

              <button
                onClick={() => {
                  if (script !== "kyr") {
                    hapticSelection();
                    setScript("kyr");
                  }
                }}
                className={
                  script === "kyr"
                    ? "rounded-[14px] bg-[#DB2777] px-2.5 py-1.5 text-[10px] font-extrabold text-white shadow-sm"
                    : "px-2.5 py-1.5 text-[10px] font-bold text-slate-500"
                }
              >
                Кирил
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

`

---

## 📄 webapp/src/components/BottomNav.tsx

`typescript
import { BookOpen, Home, Lightbulb, User, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";

import { useApp } from "../context/AppContext";
import type { I18nKey } from "../lib/i18n";
import { hapticSelection } from "../lib/telegram";
import { cn } from "../lib/utils";
import type { TabId } from "../types";

interface TabItem {
  id: TabId;
  icon: LucideIcon;
  labelKey: I18nKey;
}

const TABS: TabItem[] = [
  {
    id: "home",
    icon: Home,
    labelKey: "tabHome",
  },
  {
    id: "recipes",
    icon: BookOpen,
    labelKey: "tabRecipes",
  },
  {
    id: "lifehacks",
    icon: Lightbulb,
    labelKey: "tabLifehacks",
  },
  {
    id: "profile",
    icon: User,
    labelKey: "tabProfile",
  },
];

export default function BottomNav() {
  const { activeTab, setActiveTab, t } = useApp();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50">
      <div className="mx-auto w-full max-w-md px-4 pb-4">
        <div className="glass rounded-3xl border border-white/40 bg-white/90 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
          <div className="grid grid-cols-4 px-2 py-2">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              const Icon = tab.icon;

              return (
                <motion.button
                  key={tab.id}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    if (!active) {
                      hapticSelection();
                      setActiveTab(tab.id);
                    }
                  }}
                  className="relative flex flex-col items-center gap-1 rounded-2xl px-2 py-2"
                >
                  {active ? (
                    <motion.span
                      layoutId="bottom-nav-active"
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.45,
                      }}
                      className="absolute inset-0 rounded-2xl bg-[#DB2777]/10"
                    />
                  ) : null}

                  <Icon
                    size={20}
                    strokeWidth={active ? 2.4 : 2}
                    className={cn(
                      "relative z-10 transition-colors",
                      active ? "text-[#DB2777]" : "text-slate-400",
                    )}
                  />

                  <span
                    className={cn(
                      "relative z-10 text-[10px] font-semibold transition-colors",
                      active ? "text-[#DB2777]" : "text-slate-500",
                    )}
                  >
                    {t(tab.labelKey)}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

`

---

## 📄 webapp/src/components/DynamicIsland.tsx

`typescript
import { Timer } from "lucide-react";
import { motion } from "motion/react";

import { useApp } from "../context/AppContext";
import { formatSeconds } from "../lib/utils";

export default function DynamicIsland() {
  const { timer, activeModal, openModal } = useApp();

  if (!timer || activeModal === "timer") return null;

  return (
    <motion.button
      initial={{ opacity: 0, y: -12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      onClick={() => openModal("timer")}
      className="fixed left-1/2 top-[72px] z-[60] -translate-x-1/2"
    >
      <span className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xl">
        <Timer size={14} className="text-emerald-300" />
        {formatSeconds(timer.remainingSeconds)}
      </span>
    </motion.button>
  );
}

`

---

## 📄 webapp/src/components/PlaceholderPage.tsx

`typescript
import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

import { useApp } from "../context/AppContext";
import type { I18nKey } from "../lib/i18n";

interface PlaceholderPageProps {
  icon: LucideIcon;
  titleKey: I18nKey;
  textKey: I18nKey;
}

export default function PlaceholderPage({
  icon: Icon,
  titleKey,
  textKey,
}: PlaceholderPageProps) {
  const { t } = useApp();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="flex min-h-[55vh] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm"
    >
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-[#DB2777]/10 text-[#DB2777]">
        <Icon size={26} />
      </span>

      <h2 className="font-display text-lg font-bold text-slate-900">
        {t(titleKey)}
      </h2>

      <p className="mt-2 max-w-[260px] text-sm leading-5 text-slate-500">
        {t(textKey)}
      </p>
    </motion.div>
  );
}

`

---

## 📄 webapp/src/components/admin/AdminOverlay.tsx

`typescript
import { Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useApp } from "../../context/AppContext";
import { useSession } from "../../hooks/useSession";
import { adminRequest } from "../../lib/api";
import ImageUploader from "./ImageUploader";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#DB2777]/40";

function AdminInner() {
  const { closeModal, format } = useApp();
  const { loading, isAdmin } = useSession();

  const [tab, setTab] = useState<"recipes" | "banner" | "lifehacks">(
    "recipes",
  );

  return (
    <div className="fixed inset-0 z-[90] bg-slate-50">
      <div className="safe-top mx-auto flex h-full w-full max-w-md flex-col">
        <header className="glass border-b border-slate-100/80">
          <div className="flex h-14 items-center justify-between px-4">
            <h2 className="font-display text-base font-bold text-slate-900">
              {format("🛠 Admin panel")}
            </h2>

            <button
              onClick={() => closeModal()}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="px-4 pt-3">
          <div className="grid grid-cols-3 gap-2 rounded-3xl bg-slate-100 p-1.5">
            <button
              onClick={() => setTab("recipes")}
              className={
                tab === "recipes"
                  ? "rounded-2xl bg-white px-2 py-2 text-xs font-extrabold text-[#DB2777] shadow"
                  : "rounded-2xl px-2 py-2 text-xs font-bold text-slate-500"
              }
            >
              {format("Retseptlar")}
            </button>

            <button
              onClick={() => setTab("banner")}
              className={
                tab === "banner"
                  ? "rounded-2xl bg-white px-2 py-2 text-xs font-extrabold text-[#DB2777] shadow"
                  : "rounded-2xl px-2 py-2 text-xs font-bold text-slate-500"
              }
            >
              {format("Banner")}
            </button>

            <button
              onClick={() => setTab("lifehacks")}
              className={
                tab === "lifehacks"
                  ? "rounded-2xl bg-white px-2 py-2 text-xs font-extrabold text-[#DB2777] shadow"
                  : "rounded-2xl px-2 py-2 text-xs font-bold text-slate-500"
              }
            >
              {format("Lifehacklar")}
            </button>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto px-4 pb-10 pt-4">
          {loading ? (
            <div className="space-y-3">
              <div className="h-24 animate-pulse rounded-3xl bg-slate-200/70" />
              <div className="h-24 animate-pulse rounded-3xl bg-slate-200/70" />
              <div className="h-24 animate-pulse rounded-3xl bg-slate-200/70" />
            </div>
          ) : !isAdmin ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
              {format("Bu bo‘lim faqat admin uchun.")}
            </div>
          ) : (
            <>
              {tab === "recipes" ? <RecipesAdmin /> : null}
              {tab === "banner" ? <BannerAdmin /> : null}
              {tab === "lifehacks" ? <LifehacksAdmin /> : null}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// =========================
// RECIPES ADMIN
// =========================

interface RecipeListItem {
  id: number;
  title: string;
  category?: string;
  is_published: boolean;
}

interface RecipeFormState {
  id?: number;
  title: string;
  category: string;
  description: string;
  image_url: string;
  cook_time_minutes: string;
  difficulty: string;
  servings: string;
  is_published: boolean;
  ingredients_text: string;
  steps_text: string;
}

const emptyRecipeForm: RecipeFormState = {
  title: "",
  category: "",
  description: "",
  image_url: "",
  cook_time_minutes: "",
  difficulty: "oson",
  servings: "4",
  is_published: true,
  ingredients_text: "[]",
  steps_text: "[]",
};

function RecipesAdmin() {
  const { format } = useApp();

  const [items, setItems] = useState<RecipeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<"list" | "form">("list");
  const [form, setForm] = useState<RecipeFormState>(emptyRecipeForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminRequest("list_recipes");
      setItems(response.data ?? []);
    } catch (err: any) {
      setError(err?.message ?? format("Xatolik"));
    } finally {
      setLoading(false);
    }
  }, [format]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm(emptyRecipeForm);
    setView("form");
  };

  const openEdit = async (item: RecipeListItem) => {
    try {
      const response = await adminRequest("list_recipes");
      const fullItems = response.data ?? [];
      const full = fullItems.find((row: any) => row.id === item.id);

      if (!full) return;

      setForm({
        id: full.id,
        title: full.title ?? "",
        category: full.category ?? "",
        description: full.description ?? "",
        image_url: full.image_url ?? "",
        cook_time_minutes: String(full.cook_time_minutes ?? ""),
        difficulty: full.difficulty ?? "oson",
        servings: String(full.servings ?? "4"),
        is_published: Boolean(full.is_published),
        ingredients_text: JSON.stringify(full.ingredients ?? [], null, 2),
        steps_text: JSON.stringify(full.steps ?? [], null, 2),
      });

      setView("form");
    } catch (err: any) {
      setError(err?.message ?? format("Xatolik"));
    }
  };

  const save = async () => {
    setError(null);

    let ingredients: unknown[] = [];
    let steps: unknown[] = [];

    try {
      ingredients = JSON.parse(form.ingredients_text || "[]");
    } catch {
      setError(format("Masalliqlar JSON formatida emas"));
      return;
    }

    try {
      steps = JSON.parse(form.steps_text || "[]");
    } catch {
      setError(format("Bosqichlar JSON formatida emas"));
      return;
    }

    const payload: any = {
      title: form.title.trim(),
      category: form.category.trim() || null,
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
      cook_time_minutes: form.cook_time_minutes
        ? Number(form.cook_time_minutes)
        : null,
      difficulty: form.difficulty || null,
      servings: form.servings ? Number(form.servings) : 4,
      is_published: form.is_published,
      ingredients,
      steps,
    };

    if (form.id) {
      payload.id = form.id;
    }

    try {
      await adminRequest("upsert_recipe", payload);
      await load();
      setView("list");
    } catch (err: any) {
      setError(err?.message ?? format("Saqlashda xatolik"));
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm(format("Retsept o‘chirilsinmi?"))) return;

    try {
      await adminRequest("delete_recipe", { id });
      await load();
    } catch (err: any) {
      setError(err?.message ?? format("O‘chirishda xatolik"));
    }
  };

  if (view === "form") {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setView("list")}
          className="rounded-2xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600"
        >
          {format("← Ro‘yxatga qaytish")}
        </button>

        <div className="space-y-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <input
            value={form.title}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder={format("Retsept nomi")}
            className={inputClass}
          />

          <input
            value={form.category}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, category: event.target.value }))
            }
            placeholder={format("Kategoriya")}
            className={inputClass}
          />

          <textarea
            value={form.description}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, description: event.target.value }))
            }
            placeholder={format("Qisqacha tavsif")}
            rows={3}
            className={inputClass}
          />

          <ImageUploader
            value={form.image_url}
            onChange={(url) =>
              setForm((prev) => ({ ...prev, image_url: url }))
            }
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.cook_time_minutes}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  cook_time_minutes: event.target.value,
                }))
              }
              placeholder={format("Vaqt (daqiqa)")}
              inputMode="numeric"
              className={inputClass}
            />

            <input
              value={form.servings}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, servings: event.target.value }))
              }
              placeholder={format("Porsiya")}
              inputMode="numeric"
              className={inputClass}
            />
          </div>

          <select
            value={form.difficulty}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, difficulty: event.target.value }))
            }
            className={inputClass}
          >
            <option value="oson">{format("Oson")}</option>
            <option value="o'rta">{format("O‘rta")}</option>
            <option value="qiyin">{format("Qiyin")}</option>
          </select>

          <textarea
            value={form.ingredients_text}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                ingredients_text: event.target.value,
              }))
            }
            placeholder='[{"name":"Guruch","quantity":500,"unit":"g"}]'
            rows={6}
            className={`${inputClass} font-mono text-xs`}
          />

          <textarea
            value={form.steps_text}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                steps_text: event.target.value,
              }))
            }
            placeholder='[{"text":"...","timer_seconds":600}]'
            rows={6}
            className={`${inputClass} font-mono text-xs`}
          />

          <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-3">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  is_published: event.target.checked,
                }))
              }
            />

            <span className="text-sm font-semibold text-slate-700">
              {format("Nashr qilingan")}
            </span>
          </label>

          {error ? (
            <div className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
              {error}
            </div>
          ) : null}

          <button
            onClick={save}
            className="h-12 w-full rounded-2xl bg-[#DB2777] text-sm font-extrabold text-white"
          >
            {format("Saqlash")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={openCreate}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#DB2777] text-sm font-extrabold text-white"
      >
        <Plus size={16} />
        {format("Yangi retsept")}
      </button>

      {loading ? (
        <div className="h-24 animate-pulse rounded-3xl bg-slate-200/70" />
      ) : error ? (
        <div className="rounded-3xl bg-red-50 p-4 text-sm font-semibold text-red-600">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          {format("Retseptlar yo‘q")}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-3xl border border-slate-100 bg-white p-3 shadow-sm"
            >
              <button onClick={() => openEdit(item)} className="flex-1 text-left">
                <p className="line-clamp-1 text-sm font-bold text-slate-900">
                  {item.title}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {item.category || format("Kategoriya yo‘q")} •{" "}
                  {item.is_published
                    ? format("Nashrda")
                    : format("Yashirin")}
                </p>
              </button>

              <button
                onClick={() => remove(item.id)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================
// BANNER ADMIN
// =========================

interface BannerState {
  image_url: string;
  title: string;
  subtitle: string;
  active: boolean;
}

function BannerAdmin() {
  const { format } = useApp();

  const [banner, setBanner] = useState<BannerState>({
    image_url: "",
    title: "",
    subtitle: "",
    active: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await adminRequest("get_banner");
        const value = response?.data?.[0]?.value ?? null;

        if (value) {
          setBanner({
            image_url: value.image_url ?? "",
            title: value.title ?? "",
            subtitle: value.subtitle ?? "",
            active: value.active ?? true,
          });
        }
      } catch (err: any) {
        setError(err?.message ?? format("Xatolik"));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [format]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      await adminRequest("save_banner", { value: banner });
      setMessage(format("Banner saqlandi"));
    } catch (err: any) {
      setError(err?.message ?? format("Saqlashda xatolik"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-48 animate-pulse rounded-3xl bg-slate-200/70" />;
  }

  return (
    <div className="space-y-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
      <ImageUploader
        value={banner.image_url}
        onChange={(url) => setBanner((prev) => ({ ...prev, image_url: url }))}
      />

      <input
        value={banner.title}
        onChange={(event) =>
          setBanner((prev) => ({ ...prev, title: event.target.value }))
        }
        placeholder={format("Banner sarlavhasi")}
        className={inputClass}
      />

      <input
        value={banner.subtitle}
        onChange={(event) =>
          setBanner((prev) => ({ ...prev, subtitle: event.target.value }))
        }
        placeholder={format("Banner matni")}
        className={inputClass}
      />

      <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-3">
        <input
          type="checkbox"
          checked={banner.active}
          onChange={(event) =>
            setBanner((prev) => ({ ...prev, active: event.target.checked }))
          }
        />

        <span className="text-sm font-semibold text-slate-700">
          {format("Faol")}
        </span>
      </label>

      {message ? (
        <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-600">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
          {error}
        </div>
      ) : null}

      <button
        onClick={save}
        disabled={saving}
        className="h-12 w-full rounded-2xl bg-[#DB2777] text-sm font-extrabold text-white disabled:opacity-40"
      >
        {saving ? format("Saqlanmoqda...") : format("Bannerni saqlash")}
      </button>
    </div>
  );
}

// =========================
// LIFEHACKS ADMIN
// =========================

interface LifehackListItem {
  id: number;
  title: string;
  category?: string;
  is_published: boolean;
}

interface LifehackFormState {
  id?: number;
  title: string;
  category: string;
  content: string;
  image_url: string;
  is_published: boolean;
}

const emptyLifehackForm: LifehackFormState = {
  title: "",
  category: "",
  content: "",
  image_url: "",
  is_published: true,
};

function LifehacksAdmin() {
  const { format } = useApp();

  const [items, setItems] = useState<LifehackListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<"list" | "form">("list");
  const [form, setForm] = useState<LifehackFormState>(emptyLifehackForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminRequest("list_lifehacks");
      setItems(response.data ?? []);
    } catch (err: any) {
      setError(err?.message ?? format("Xatolik"));
    } finally {
      setLoading(false);
    }
  }, [format]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm(emptyLifehackForm);
    setView("form");
  };

  const openEdit = async (item: LifehackListItem) => {
    try {
      const response = await adminRequest("list_lifehacks");
      const fullItems = response.data ?? [];
      const full = fullItems.find((row: any) => row.id === item.id);

      if (!full) return;

      setForm({
        id: full.id,
        title: full.title ?? "",
        category: full.category ?? "",
        content: full.content ?? "",
        image_url: full.image_url ?? "",
        is_published: Boolean(full.is_published),
      });

      setView("form");
    } catch (err: any) {
      setError(err?.message ?? format("Xatolik"));
    }
  };

  const save = async () => {
    setError(null);

    const payload: any = {
      title: form.title.trim(),
      category: form.category.trim() || null,
      content: form.content.trim(),
      image_url: form.image_url.trim() || null,
      is_published: form.is_published,
    };

    if (form.id) {
      payload.id = form.id;
    }

    try {
      await adminRequest("upsert_lifehack", payload);
      await load();
      setView("list");
    } catch (err: any) {
      setError(err?.message ?? format("Saqlashda xatolik"));
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm(format("Lifehack o‘chirilsinmi?"))) return;

    try {
      await adminRequest("delete_lifehack", { id });
      await load();
    } catch (err: any) {
      setError(err?.message ?? format("O‘chirishda xatolik"));
    }
  };

  if (view === "form") {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setView("list")}
          className="rounded-2xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600"
        >
          {format("← Ro‘yxatga qaytish")}
        </button>

        <div className="space-y-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <input
            value={form.title}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder={format("Lifehack sarlavhasi")}
            className={inputClass}
          />

          <input
            value={form.category}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, category: event.target.value }))
            }
            placeholder={format("Kategoriya")}
            className={inputClass}
          />

          <textarea
            value={form.content}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, content: event.target.value }))
            }
            placeholder={format("Batafsil matn")}
            rows={5}
            className={inputClass}
          />

          <ImageUploader
            value={form.image_url}
            onChange={(url) =>
              setForm((prev) => ({ ...prev, image_url: url }))
            }
          />

          <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-3">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  is_published: event.target.checked,
                }))
              }
            />

            <span className="text-sm font-semibold text-slate-700">
              {format("Nashr qilingan")}
            </span>
          </label>

          {error ? (
            <div className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
              {error}
            </div>
          ) : null}

          <button
            onClick={save}
            className="h-12 w-full rounded-2xl bg-[#DB2777] text-sm font-extrabold text-white"
          >
            {format("Saqlash")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={openCreate}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#DB2777] text-sm font-extrabold text-white"
      >
        <Plus size={16} />
        {format("Yangi lifehack")}
      </button>

      {loading ? (
        <div className="h-24 animate-pulse rounded-3xl bg-slate-200/70" />
      ) : error ? (
        <div className="rounded-3xl bg-red-50 p-4 text-sm font-semibold text-red-600">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          {format("Lifehacklar yo‘q")}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-3xl border border-slate-100 bg-white p-3 shadow-sm"
            >
              <button onClick={() => openEdit(item)} className="flex-1 text-left">
                <p className="line-clamp-1 text-sm font-bold text-slate-900">
                  {item.title}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {item.category || format("Kategoriya yo‘q")} •{" "}
                  {item.is_published
                    ? format("Nashrda")
                    : format("Yashirin")}
                </p>
              </button>

              <button
                onClick={() => remove(item.id)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminOverlay() {
  const { activeModal } = useApp();

  if (activeModal !== "admin") return null;

  return <AdminInner />;
}

`

---

## 📄 webapp/src/components/admin/ImageUploader.tsx

`typescript
import { ImagePlus, Loader2 } from "lucide-react";
import { useRef, useState } from "react";

import { useApp } from "../../context/AppContext";
import { uploadImage } from "../../lib/api";
import { hapticNotification } from "../../lib/telegram";

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
}

export default function ImageUploader({
  value,
  onChange,
}: ImageUploaderProps) {
  const { format } = useApp();

  const inputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file?: File | Blob | null) => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const response = await uploadImage(file, "admin_image");

      if (response.url) {
        onChange(response.url);
        hapticNotification("success");
      }
    } catch (err: any) {
      setError(err?.message ?? format("Rasm yuklashda xatolik"));
    } finally {
      setUploading(false);
    }
  };

  const onPaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const item = Array.from(event.clipboardData.items).find((entry) =>
      entry.type.startsWith("image/"),
    );

    if (!item) return;

    const file = item.getAsFile();

    if (file) {
      event.preventDefault();
      handleFile(file);
    }
  };

  return (
    <div
      tabIndex={0}
      onPaste={onPaste}
      className="rounded-3xl border border-slate-200 bg-white p-3 outline-none focus:border-[#DB2777]/30"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      {value ? (
        <div className="overflow-hidden rounded-2xl border border-slate-100">
          <img
            src={value}
            alt={format("Yuklangan rasm")}
            className="h-36 w-full object-cover"
          />
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-500"
        >
          {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
          <span className="text-xs font-semibold">
            {format("Rasm yuklash yoki Ctrl+V bilan qo‘yish")}
          </span>
        </button>
      )}

      {error ? (
        <p className="mt-2 text-xs font-semibold text-red-500">{error}</p>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => inputRef.current?.click()}
          className="h-10 rounded-2xl bg-slate-100 text-xs font-bold text-slate-700"
        >
          {format("Fayl tanlash")}
        </button>

        <button
          onClick={() => onChange("")}
          className="h-10 rounded-2xl bg-red-50 text-xs font-bold text-red-500"
        >
          {format("Rasmni tozalash")}
        </button>
      </div>
    </div>
  );
}

`

---

## 📄 webapp/src/components/lifehacks/LifehackCard.tsx

`typescript
import { ChevronDown, Copy } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { useApp } from "../../context/AppContext";
import { hapticNotification } from "../../lib/telegram";
import { cn } from "../../lib/utils";
import type { Lifehack } from "../../types/lifehack";

interface LifehackCardProps {
  lifehack: Lifehack;
}

export default function LifehackCard({ lifehack }: LifehackCardProps) {
  const { format, t } = useApp();

  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyContent = async () => {
    try {
      const text = `${format(lifehack.title)}\n\n${format(lifehack.content)}`;

      await navigator.clipboard.writeText(text);

      setCopied(true);
      hapticNotification("success");

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-bold leading-5 text-slate-900">
            {format(lifehack.title)}
          </h3>

          {lifehack.category ? (
            <span className="mt-2 inline-block rounded-full bg-[#DB2777]/10 px-2.5 py-1 text-[10px] font-bold text-[#DB2777]">
              {format(lifehack.category)}
            </span>
          ) : null}
        </div>

        <button
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"
        >
          <ChevronDown
            size={17}
            className={cn(
              "transition-transform duration-200",
              expanded ? "rotate-180" : "rotate-0",
            )}
          />
        </button>
      </div>

      {!expanded ? (
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
          {format(lifehack.content)}
        </p>
      ) : null}

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            {lifehack.image_url ? (
              <div className="mt-3 overflow-hidden rounded-2xl">
                <img
                  src={lifehack.image_url}
                  alt={format(lifehack.title)}
                  loading="lazy"
                  className="aspect-[16/9] w-full object-cover"
                />
              </div>
            ) : null}

            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
              {format(lifehack.content)}
            </p>

            <button
              onClick={copyContent}
              className="mt-4 flex h-10 items-center gap-2 rounded-2xl bg-slate-900 px-4 text-xs font-bold text-white"
            >
              <Copy size={14} />
              {copied ? t("copied") : t("copy")}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

`

---

## 📄 webapp/src/components/lifehacks/LifehackFolderCard.tsx

`typescript
import { motion } from "motion/react";

import { useApp } from "../../context/AppContext";
import { getCategoryEmoji } from "../../lib/lifehack-utils";

interface LifehackFolderCardProps {
  name: string;
  count: number;
  onSelect: () => void;
}

export default function LifehackFolderCard({
  name,
  count,
  onSelect,
}: LifehackFolderCardProps) {
  const { format, t } = useApp();

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      className="w-full rounded-3xl border border-slate-100 bg-white p-4 text-left shadow-sm"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-2xl">
        {getCategoryEmoji(name)}
      </span>

      <h3 className="mt-3 line-clamp-1 font-display text-sm font-bold text-slate-900">
        {format(name)}
      </h3>

      <p className="mt-1 text-xs font-semibold text-slate-500">
        {count} {t("countSuffix")}
      </p>
    </motion.button>
  );
}

`

---

## 📄 webapp/src/components/modals/BozorlikModal.tsx

`typescript
import { Check, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { useApp } from "../../context/AppContext";
import { hapticNotification } from "../../lib/telegram";
import { formatQuantity } from "../../lib/recipe-utils";
import ModalShell from "../ui/ModalShell";

export default function BozorlikModal() {
  const {
    activeModal,
    addToShoppingList,
    clearShoppingList,
    closeModal,
    format,
    removeShoppingItem,
    shoppingList,
    t,
    toggleShoppingItem,
  } = useApp();

  const [newItemName, setNewItemName] = useState("");

  const open = activeModal === "bozorlik";

  const addItem = () => {
    const name = newItemName.trim();

    if (!name) return;

    addToShoppingList([{ name }]);
    setNewItemName("");
    hapticNotification("success");
  };

  return (
    <ModalShell open={open} title={t("bozorlik")} onClose={closeModal}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            value={newItemName}
            onChange={(event) => setNewItemName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addItem();
            }}
            placeholder={t("bozorlikPlaceholder")}
            className="h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#DB2777]/40"
          />

          <button
            onClick={addItem}
            className="flex h-11 items-center gap-1 rounded-2xl bg-[#DB2777] px-4 text-sm font-bold text-white"
          >
            <Plus size={16} />
            {t("bozorlikAdd")}
          </button>
        </div>

        {shoppingList.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            {t("bozorlikEmpty")}
          </div>
        ) : (
          <div className="space-y-2">
            {shoppingList.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm"
              >
                <button
                  onClick={() => toggleShoppingItem(item.id)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <span
                    className={
                      item.checked
                        ? "flex h-6 w-6 items-center justify-center rounded-full bg-[#DB2777] text-white"
                        : "flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-transparent"
                    }
                  >
                    <Check size={13} />
                  </span>

                  <span>
                    <span
                      className={
                        item.checked
                          ? "block text-sm font-semibold text-slate-400 line-through"
                          : "block text-sm font-semibold text-slate-900"
                      }
                    >
                      {format(item.name)}
                    </span>

                    {item.quantity ? (
                      <span className="text-xs text-slate-500">
                        {formatQuantity(item.quantity)} {item.unit ?? ""}
                      </span>
                    ) : null}
                  </span>
                </button>

                <button
                  onClick={() => removeShoppingItem(item.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-2xl bg-red-50 text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            <button
              onClick={clearShoppingList}
              className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600"
            >
              {t("bozorlikClear")}
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

`

---

## 📄 webapp/src/components/modals/PremiumModal.tsx

`typescript
import { Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useApp } from "../../context/AppContext";
import { uploadImage } from "../../lib/api";
import { hapticNotification } from "../../lib/telegram";
import ModalShell from "../ui/ModalShell";

function PremiumInner() {
  const { closeModal, format } = useApp();

  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];

    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      setError(format("Faqat rasm fayli yuklang"));
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setDone(false);
    setPending(false);
    setError(null);
  };

  const submit = async () => {
    if (!file || uploading) return;

    setUploading(true);
    setError(null);

    try {
      const response = await uploadImage(file, "premium_screenshot");

      if (response.alreadyPending) {
        setPending(true);
      } else {
        setDone(true);
      }

      hapticNotification("success");
    } catch (err: any) {
      setError(err?.message ?? format("Xatolik yuz berdi"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <ModalShell
      open
      title={format("💎 Premium")}
      onClose={() => closeModal()}
    >
      <div className="space-y-4">
        <div className="rounded-3xl bg-[#DB2777]/5 p-4">
          <p className="text-sm leading-6 text-slate-700">
            {format(
              "Premium obuna: oyiga 25 000 so‘m. To‘lov screenshotini yuboring. Admin tekshirgandan so‘ng Premium faollashadi.",
            )}
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />

        {preview ? (
          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <img
              src={preview}
              alt={format("To‘lov screenshot")}
              className="max-h-64 w-full object-cover"
            />
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-slate-500"
          >
            <Upload size={22} />
            <span className="text-sm font-semibold">
              {format("Screenshot tanlash")}
            </span>
          </button>
        )}

        {error ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        ) : null}

        {done ? (
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-600">
            {format("Screenshot yuborildi. Admin tekshiruvi kutilmoqda.")}
          </div>
        ) : null}

        {pending ? (
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-600">
            {format(
              "Sizda allaqachon ko‘rib chiqilayotgan premium so‘rov bor.",
            )}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => inputRef.current?.click()}
            className="h-12 rounded-2xl bg-slate-100 text-sm font-bold text-slate-700"
          >
            {format("Tanlash")}
          </button>

          <button
            onClick={submit}
            disabled={!file || uploading}
            className="h-12 rounded-2xl bg-[#DB2777] text-sm font-bold text-white disabled:opacity-40"
          >
            {uploading
              ? format("Yuklanmoqda...")
              : format("Yuborish")}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export default function PremiumModal() {
  const { activeModal } = useApp();

  if (activeModal !== "premium") return null;

  return <PremiumInner />;
}

`

---

## 📄 webapp/src/components/modals/TimerModal.tsx

`typescript
import { Pause, Play, RotateCcw } from "lucide-react";

import { useApp } from "../../context/AppContext";
import { formatSeconds } from "../../lib/utils";
import ModalShell from "../ui/ModalShell";

export default function TimerModal() {
  const {
    activeModal,
    closeModal,
    closeTimer,
    format,
    pauseTimer,
    resetTimer,
    resumeTimer,
    t,
    timer,
  } = useApp();

  const open = activeModal === "timer" && Boolean(timer);

  const progress =
    timer && timer.totalSeconds > 0
      ? timer.remainingSeconds / timer.totalSeconds
      : 0;

  return (
    <ModalShell
      open={open}
      title={t("timer")}
      onClose={() => closeModal()}
    >
      {timer ? (
        <div className="space-y-5">
          <div className="rounded-3xl bg-slate-50 p-5 text-center">
            <p className="text-sm font-semibold text-slate-500">
              {format(timer.label)}
            </p>

            <p className="mt-3 font-display text-5xl font-extrabold tracking-tight text-slate-900">
              {formatSeconds(timer.remainingSeconds)}
            </p>

            {timer.status === "finished" ? (
              <p className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-600">
                {t("timerDone")}
              </p>
            ) : null}
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#DB2777] transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {timer.status === "running" ? (
              <button
                onClick={pauseTimer}
                className="flex items-center justify-center gap-1 rounded-2xl bg-slate-100 px-3 py-3 text-sm font-bold text-slate-700"
              >
                <Pause size={16} />
                {t("pause")}
              </button>
            ) : (
              <button
                onClick={resumeTimer}
                disabled={timer.status === "finished"}
                className="flex items-center justify-center gap-1 rounded-2xl bg-[#DB2777] px-3 py-3 text-sm font-bold text-white disabled:opacity-40"
              >
                <Play size={16} />
                {t("resume")}
              </button>
            )}

            <button
              onClick={resetTimer}
              className="flex items-center justify-center gap-1 rounded-2xl bg-slate-100 px-3 py-3 text-sm font-bold text-slate-700"
            >
              <RotateCcw size={16} />
              {t("reset")}
            </button>

            <button
              onClick={() => {
                if (timer.status === "finished") {
                  closeTimer();
                } else {
                  closeModal();
                }
              }}
              className="rounded-2xl bg-slate-900 px-3 py-3 text-sm font-bold text-white"
            >
              {t("close")}
            </button>
          </div>
        </div>
      ) : null}
    </ModalShell>
  );
}

`

---

## 📄 webapp/src/components/recipes/RecipeCard.tsx

`typescript
import { ChefHat, Clock3, Heart } from "lucide-react";
import { motion } from "motion/react";

import { useApp } from "../../context/AppContext";
import { getDifficultyKey } from "../../lib/recipe-utils";
import { hapticImpact } from "../../lib/telegram";
import { cn } from "../../lib/utils";
import type { Recipe } from "../../types";

interface RecipeCardProps {
  recipe: Recipe;
  onOpen: (recipe: Recipe) => void;
  badge?: {
    label: string;
    className: string;
  };
}

export default function RecipeCard({
  recipe,
  onOpen,
  badge,
}: RecipeCardProps) {
  const { favorites, format, t, toggleFavorite } = useApp();

  const isFavorite = favorites.includes(recipe.id);
  const difficultyKey = getDifficultyKey(recipe.difficulty);

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => onOpen(recipe)}
      className="w-full overflow-hidden rounded-3xl border border-slate-100 bg-white text-left shadow-sm"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-pink-50 to-rose-100">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={format(recipe.title)}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#DB2777]/40">
            <ChefHat size={34} />
          </div>
        )}

        {badge ? (
          <span
            className={cn(
              "absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-extrabold ring-1",
              badge.className,
            )}
          >
            {badge.label}
          </span>
        ) : null}

        <button
          onClick={(event) => {
            event.stopPropagation();
            toggleFavorite(recipe.id);
            hapticImpact("light");
          }}
          aria-label={t("favorite")}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow"
        >
          <Heart
            size={16}
            className={cn(
              isFavorite
                ? "fill-[#DB2777] text-[#DB2777]"
                : "text-slate-400",
            )}
          />
        </button>

        {recipe.cook_time_minutes ? (
          <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-bold text-white">
            <Clock3 size={11} />
            {recipe.cook_time_minutes} {t("minutes")}
          </span>
        ) : null}
      </div>

      <div className="p-3">
        <h3 className="line-clamp-1 font-display text-sm font-bold text-slate-900">
          {format(recipe.title)}
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {recipe.category ? (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
              {format(recipe.category)}
            </span>
          ) : null}

          {difficultyKey ? (
            <span className="rounded-full bg-[#DB2777]/10 px-2 py-1 text-[10px] font-semibold text-[#DB2777]">
              {t(difficultyKey)}
            </span>
          ) : null}
        </div>
      </div>
    </motion.button>
  );
}

`

---

## 📄 webapp/src/components/recipes/RecipeFilters.tsx

`typescript
import { Search } from "lucide-react";

import { useApp } from "../../context/AppContext";
import { cn } from "../../lib/utils";
import type { DifficultyKey } from "../../types";

export type RecipeViewMode = "catalog" | "match";

interface RecipeFiltersProps {
  query: string;
  onQueryChange: (value: string) => void;

  mode: RecipeViewMode;
  onModeChange: (mode: RecipeViewMode) => void;

  categories: string[];
  category: string | null;
  onCategoryChange: (category: string | null) => void;

  maxTime: number | null;
  onMaxTimeChange: (value: number | null) => void;

  difficulty: DifficultyKey | null;
  onDifficultyChange: (value: DifficultyKey | null) => void;
}

export default function RecipeFilters({
  query,
  onQueryChange,
  mode,
  onModeChange,
  categories,
  category,
  onCategoryChange,
  maxTime,
  onMaxTimeChange,
  difficulty,
  onDifficultyChange,
}: RecipeFiltersProps) {
  const { t } = useApp();

  const times = [null, 15, 30, 60];

  const difficulties: Array<{
    value: DifficultyKey | null;
    label: string;
  }> = [
    { value: null, label: t("all") },
    { value: "easy", label: t("easy") },
    { value: "medium", label: t("medium") },
    { value: "hard", label: t("hard") },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Search size={17} className="text-slate-400" />

        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={t("searchRecipes")}
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-3xl bg-slate-100 p-1.5">
        <button
          onClick={() => onModeChange("catalog")}
          className={cn(
            "rounded-2xl px-3 py-2.5 text-sm font-bold transition-colors",
            mode === "catalog"
              ? "bg-white text-[#DB2777] shadow"
              : "text-slate-500",
          )}
        >
          {t("catalog")}
        </button>

        <button
          onClick={() => onModeChange("match")}
          className={cn(
            "rounded-2xl px-3 py-2.5 text-sm font-bold transition-colors",
            mode === "match"
              ? "bg-white text-[#DB2777] shadow"
              : "text-slate-500",
          )}
        >
          {t("aiMatch")}
        </button>
      </div>

      {mode === "catalog" ? (
        <div className="space-y-3">
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => onCategoryChange(null)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-2 text-xs font-bold",
                category === null
                  ? "bg-[#DB2777] text-white"
                  : "bg-white text-slate-500 shadow-sm",
              )}
            >
              {t("all")}
            </button>

            {categories.map((item) => (
              <button
                key={item}
                onClick={() => onCategoryChange(item)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-2 text-xs font-bold",
                  category === item
                    ? "bg-[#DB2777] text-white"
                    : "bg-white text-slate-500 shadow-sm",
                )}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {times.map((time) => (
              <button
                key={String(time)}
                onClick={() => onMaxTimeChange(time)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-2 text-xs font-bold",
                  maxTime === time
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-500 shadow-sm",
                )}
              >
                {time === null ? t("all") : `≤ ${time} ${t("minutes")}`}
              </button>
            ))}
          </div>

          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {difficulties.map((item) => (
              <button
                key={String(item.value)}
                onClick={() => onDifficultyChange(item.value)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-2 text-xs font-bold",
                  difficulty === item.value
                    ? "bg-amber-400 text-slate-900"
                    : "bg-white text-slate-500 shadow-sm",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

`

---

## 📄 webapp/src/components/recipes/RecipeModal.tsx

`typescript
import {
  Check,
  Copy,
  Heart,
  Plus,
  Timer,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useApp } from "../../context/AppContext";
import {
  formatQuantity,
  scaleIngredient,
} from "../../lib/recipe-utils";
import { hapticImpact, hapticNotification } from "../../lib/telegram";
import { cn } from "../../lib/utils";
import type { Recipe } from "../../types";
import ModalShell from "../ui/ModalShell";

interface RecipeModalProps {
  recipe: Recipe | null;
  onClose: () => void;
}

const PORTION_OPTIONS = [2, 4, 6, 12];

export default function RecipeModal({ recipe, onClose }: RecipeModalProps) {
  const {
    addToShoppingList,
    favorites,
    format,
    startTimer,
    t,
    toggleFavorite,
  } = useApp();

  const [portion, setPortion] = useState(4);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(
    new Set(),
  );
  const [zoomed, setZoomed] = useState(false);
  const [copied, setCopied] = useState(false);

  const isFavorite = recipe ? favorites.includes(recipe.id) : false;

  useEffect(() => {
    setCheckedIngredients(new Set());
    setZoomed(false);
    setCopied(false);

    if (recipe?.servings && PORTION_OPTIONS.includes(recipe.servings)) {
      setPortion(recipe.servings);
    } else {
      setPortion(4);
    }
  }, [recipe?.id]);

  const baseServings = recipe?.servings || 4;

  const scaledIngredients = useMemo(() => {
    if (!recipe) return [];

    return recipe.ingredients.map((ingredient) =>
      scaleIngredient(ingredient, baseServings, portion),
    );
  }, [recipe, baseServings, portion]);

  if (!recipe) {
    return (
      <ModalShell open={false} title="" onClose={onClose}>
        {null}
      </ModalShell>
    );
  }

  const toggleChecked = (name: string) => {
    hapticImpact("light");

    setCheckedIngredients((prev) => {
      const next = new Set(prev);

      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }

      return next;
    });
  };

  const addToShopping = () => {
    const items = scaledIngredients
      .filter((ingredient) =>
        checkedIngredients.size > 0
          ? checkedIngredients.has(ingredient.name)
          : true,
      )
      .map((ingredient) => ({
        name: ingredient.name,
        quantity: ingredient.quantity ?? null,
        unit: ingredient.unit ?? null,
      }));

    addToShoppingList(items);
    hapticNotification("success");
  };

  const copyRecipe = async () => {
    const text = [
      `🍲 ${format(recipe.title)}`,
      recipe.description ? format(recipe.description) : "",
      "",
      `📌 ${t("ingredients")} (${portion} ${t("servings")}):`,
      ...scaledIngredients.map((item) => {
        const qty = item.quantity ? `${formatQuantity(item.quantity)} ${item.unit ?? ""}` : "";
        return `• ${format(item.name)} ${qty}`.trim();
      }),
      "",
      `📝 ${t("steps")}:`,
      ...recipe.steps.map((step, idx) => `${idx + 1}. ${format(step.text)}`),
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      hapticNotification("success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <ModalShell open={Boolean(recipe)} title={format(recipe.title)} onClose={onClose}>
      <div className="space-y-5">
        {recipe.image_url ? (
          <div
            onClick={() => setZoomed((prev) => !prev)}
            className="cursor-pointer overflow-hidden rounded-3xl bg-slate-100"
          >
            <img
              src={recipe.image_url}
              alt={format(recipe.title)}
              className={cn(
                "w-full transition-all duration-300",
                zoomed ? "max-h-[70vh] object-contain" : "h-52 object-cover",
              )}
            />
          </div>
        ) : null}

        {recipe.description ? (
          <p className="text-sm leading-6 text-slate-600">
            {format(recipe.description)}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">{t("servings")}:</span>
            <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1">
              {PORTION_OPTIONS.map((val) => (
                <button
                  key={val}
                  onClick={() => setPortion(val)}
                  className={cn(
                    "rounded-xl px-2.5 py-1 text-xs font-extrabold transition-colors",
                    portion === val
                      ? "bg-white text-[#DB2777] shadow"
                      : "text-slate-500",
                  )}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                toggleFavorite(recipe.id);
                hapticImpact("light");
              }}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
            >
              <Heart
                size={16}
                className={cn(
                  isFavorite ? "fill-[#DB2777] text-[#DB2777]" : "text-slate-400",
                )}
              />
            </button>

            <button
              onClick={copyRecipe}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
            >
              {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-sm font-bold text-slate-900">
              {t("ingredients")}
            </h4>

            <button
              onClick={addToShopping}
              className="flex items-center gap-1 text-xs font-extrabold text-[#DB2777]"
            >
              <Plus size={14} />
              {t("addToShopping")}
            </button>
          </div>

          <div className="space-y-2">
            {scaledIngredients.map((item) => {
              const isChecked = checkedIngredients.has(item.name);

              return (
                <button
                  key={item.name}
                  onClick={() => toggleChecked(item.name)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border text-xs transition-colors",
                        isChecked
                          ? "border-[#DB2777] bg-[#DB2777] text-white"
                          : "border-slate-300 bg-white text-transparent",
                      )}
                    >
                      ✓
                    </span>

                    <span
                      className={cn(
                        "text-sm font-semibold",
                        isChecked ? "text-slate-400 line-through" : "text-slate-800",
                      )}
                    >
                      {format(item.name)}
                      {item.optional ? (
                        <span className="ml-1 text-xs font-normal text-slate-400">
                          ({t("optional")})
                        </span>
                      ) : null}
                    </span>
                  </div>

                  {item.quantity ? (
                    <span className="text-xs font-bold text-slate-500">
                      {formatQuantity(item.quantity)} {item.unit ?? ""}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-display text-sm font-bold text-slate-900">
            {t("steps")}
          </h4>

          <div className="space-y-3">
            {recipe.steps.map((step, idx) => (
              <div
                key={idx}
                className="space-y-2 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#DB2777]/10 text-xs font-extrabold text-[#DB2777]">
                    {idx + 1}
                  </span>

                  <p className="flex-1 text-sm leading-6 text-slate-800">
                    {format(step.text)}
                  </p>
                </div>

                {step.timer_seconds ? (
                  <button
                    onClick={() =>
                      startTimer(
                        `${format(recipe.title)} — ${idx + 1}-bosqich`,
                        step.timer_seconds!,
                      )
                    }
                    className="flex items-center gap-1.5 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"
                  >
                    <Timer size={14} />
                    {t("stepTimer")}: {Math.round(step.timer_seconds / 60)} {t("minutes")}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

`

---

## 📄 webapp/src/components/recipes/SmartMatchPanel.tsx

`typescript
import { Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";

import { useApp } from "../../context/AppContext";
import {
  getRecipeMatch,
  getUniqueIngredients,
  normalizeIngredient,
} from "../../lib/recipe-utils";
import { hapticSelection } from "../../lib/telegram";
import type { Recipe } from "../../types";
import RecipeCard from "./RecipeCard";

interface SmartMatchPanelProps {
  recipes: Recipe[];
  onOpenRecipe: (recipe: Recipe) => void;
}

export default function SmartMatchPanel({
  recipes,
  onOpenRecipe,
}: SmartMatchPanelProps) {
  const { format, t } = useApp();

  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [ingredientQuery, setIngredientQuery] = useState("");

  const allIngredients = useMemo(
    () => getUniqueIngredients(recipes),
    [recipes],
  );

  const candidates = useMemo(() => {
    const normalizedQuery = normalizeIngredient(ingredientQuery);

    return allIngredients
      .filter((ingredient) => !selectedIngredients.includes(ingredient))
      .filter((ingredient) =>
        normalizedQuery
          ? normalizeIngredient(ingredient).includes(normalizedQuery)
          : true,
      )
      .slice(0, 24);
  }, [allIngredients, ingredientQuery, selectedIngredients]);

  const matches = useMemo(() => {
    if (!selectedIngredients.length) return [];

    return recipes
      .map((recipe) => ({
        recipe,
        match: getRecipeMatch(recipe, selectedIngredients),
      }))
      .filter((item) =>
        ["exact", "almost", "partial"].includes(item.match.status),
      )
      .sort((a, b) => b.match.matchPercent - a.match.matchPercent);
  }, [recipes, selectedIngredients]);

  const exact = matches.filter((item) => item.match.status === "exact");
  const almost = matches.filter((item) => item.match.status === "almost");
  const partial = matches.filter((item) => item.match.status === "partial");

  const toggleIngredient = (ingredient: string) => {
    hapticSelection();

    setSelectedIngredients((prev) => {
      if (prev.includes(ingredient)) {
        return prev.filter((item) => item !== ingredient);
      }

      return [...prev, ingredient];
    });
  };

  const renderGroup = (
    title: string,
    items: typeof matches,
    badgeClassName: string,
    badgeLabelGetter?: (item: (typeof matches)[number]) => string,
  ) => {
    if (!items.length) return null;

    return (
      <section className="space-y-2">
        <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>

        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <RecipeCard
              key={item.recipe.id}
              recipe={item.recipe}
              onOpen={onOpenRecipe}
              badge={{
                label: badgeLabelGetter
                  ? badgeLabelGetter(item)
                  : title,
                className: badgeClassName,
              }}
            />
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-[#DB2777]/10 bg-[#DB2777]/5 p-4">
        <div className="flex items-center gap-2 text-[#DB2777]">
          <Sparkles size={17} />
          <h3 className="font-display text-sm font-extrabold">
            {t("aiMatch")}
          </h3>
        </div>

        <p className="mt-2 text-xs leading-5 text-slate-600">
          {t("matchSelectIngredients")}
        </p>

        {selectedIngredients.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedIngredients.map((ingredient) => (
              <button
                key={ingredient}
                onClick={() => toggleIngredient(ingredient)}
                className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm"
              >
                {format(ingredient)}
                <X size={12} className="text-slate-400" />
              </button>
            ))}

            <button
              onClick={() => setSelectedIngredients([])}
              className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"
            >
              {t("matchClear")}
            </button>
          </div>
        ) : null}
      </div>

      <input
        value={ingredientQuery}
        onChange={(event) => setIngredientQuery(event.target.value)}
        placeholder={t("matchSearchIngredient")}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#DB2777]/40"
      />

      <div className="flex flex-wrap gap-2">
        {candidates.map((ingredient) => (
          <button
            key={ingredient}
            onClick={() => toggleIngredient(ingredient)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"
          >
            {format(ingredient)}
          </button>
        ))}
      </div>

      {selectedIngredients.length > 0 ? (
        <p className="text-xs font-semibold text-slate-500">
          {selectedIngredients.length} {t("matchSelected")}
        </p>
      ) : null}

      {matches.length === 0 && selectedIngredients.length > 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          {t("matchNoResults")}
        </div>
      ) : null}

      <div className="space-y-5">
        {renderGroup(
          t("matchExact"),
          exact,
          "bg-emerald-50 text-emerald-600 ring-emerald-200",
        )}

        {renderGroup(
          t("matchAlmost"),
          almost,
          "bg-amber-50 text-amber-600 ring-amber-200",
        )}

        {renderGroup(
          t("matchPartial"),
          partial,
          "bg-sky-50 text-sky-600 ring-sky-200",
          (item) => `${t("matchPartial")} ${item.match.matchPercent}%`,
        )}
      </div>
    </div>
  );
}

`

---

## 📄 webapp/src/components/ui/ModalShell.tsx

`typescript
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

interface ModalShellProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export default function ModalShell({
  open,
  title,
  onClose,
  children,
}: ModalShellProps) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[80]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/45"
          />

          <motion.div
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.18, duration: 0.42 }}
            className="safe-bottom absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-[28px] bg-white shadow-2xl"
          >
            <div className="sticky top-0 z-10 rounded-t-[28px] border-b border-slate-100 bg-white/95 px-4 pb-3 pt-4 backdrop-blur">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />

              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-base font-bold text-slate-900">
                  {title}
                </h3>

                <button
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="max-h-[72vh] overflow-y-auto px-4 pb-8 pt-3">
              {children}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

`

---

## 📄 webapp/src/pages/HomePage.tsx

`typescript
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { fetchHomeBanner, type HomeBanner } from "../api/home";
import { fetchLifehacks } from "../api/lifehacks";
import { fetchRecipes } from "../api/recipes";
import LifehackCard from "../components/lifehacks/LifehackCard";
import RecipeCard from "../components/recipes/RecipeCard";
import RecipeModal from "../components/recipes/RecipeModal";
import { useApp } from "../context/AppContext";
import { useSession } from "../hooks/useSession";
import type { Recipe } from "../types";
import type { Lifehack } from "../types/lifehack";

function randomItems<T>(items: T[], count: number): T[] {
  return [...items]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}

export default function HomePage() {
  const {
    format,
    openModal,
    setActiveTab,
    setRecipesSearchQuery,
  } = useApp();

  const { isPremium, loading: sessionLoading } = useSession();

  const [banner, setBanner] = useState<HomeBanner | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [lifehacks, setLifehacks] = useState<Lifehack[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const [bannerData, recipeData, lifehackData] = await Promise.all([
          fetchHomeBanner(),
          fetchRecipes(),
          fetchLifehacks(),
        ]);

        setBanner(bannerData);
        setRecipes(recipeData);
        setLifehacks(lifehackData);
      } catch {
        // Home sahifa bo‘sh qolmasligi uchun silent fallback
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const dailyRecipes = useMemo(
    () => randomItems(recipes, 2),
    [recipes],
  );

  const dailyLifehacks = useMemo(
    () => randomItems(lifehacks, 2),
    [lifehacks],
  );

  const submitSearch = () => {
    setRecipesSearchQuery(searchValue.trim());
    setActiveTab("recipes");
  };

  const showBanner = banner && banner.active !== false;

  return (
    <div className="space-y-5">
      {/* Banner */}
      {loading ? (
        <div className="aspect-[21/9] w-full animate-pulse rounded-3xl bg-slate-200/70" />
      ) : showBanner ? (
        <div className="relative aspect-[21/9] w-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#DB2777] to-rose-400 soft-shadow">
          {banner.image_url ? (
            <img
              src={banner.image_url}
              alt={format(banner.title || "Pazanda AI")}
              className="h-full w-full object-cover"
            />
          ) : null}

          <div className="banner-overlay absolute inset-0" />

          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className="flex items-center gap-2">
              {isPremium ? (
                <span className="gold-gradient flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold text-slate-900 shadow">
                  👑 Premium
                </span>
              ) : null}

              <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
                {format("Bugun nima pishiramiz?")}
              </span>
            </div>

            <h2 className="mt-2 font-display text-xl font-extrabold leading-6 text-white">
              {format(banner.title || "Pazanda AI")}
            </h2>

            {banner.subtitle ? (
              <p className="mt-1 line-clamp-1 text-xs font-medium text-white/85">
                {format(banner.subtitle)}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Search */}
      <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Search size={17} className="text-slate-400" />

        <input
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submitSearch();
          }}
          placeholder={format("Retsept qidirish...")}
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />

        <button
          onClick={submitSearch}
          className="rounded-2xl bg-[#DB2777] px-4 py-2 text-xs font-extrabold text-white"
        >
          {format("Qidirish")}
        </button>
      </div>

      {/* Premium CTA */}
      {!sessionLoading && !isPremium ? (
        <button
          onClick={() => openModal("premium")}
          className="flex w-full items-center justify-between gap-3 rounded-3xl bg-slate-900 p-4 text-left"
        >
          <div>
            <p className="font-display text-sm font-extrabold text-white">
              {format("💎 Premium obuna")}
            </p>

            <p className="mt-1 text-xs text-slate-300">
              {format("Oyiga 25 000 so‘m. Admin tasdig‘i bilan faollashadi.")}
            </p>
          </div>

          <span className="rounded-2xl bg-[#DB2777] px-3 py-2 text-xs font-extrabold text-white">
            {format("Ochish")}
          </span>
        </button>
      ) : null}

      {/* Daily recipes */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-extrabold text-slate-900">
            {format("Kunlik retseptlar")}
          </h3>

          <button
            onClick={() => setActiveTab("recipes")}
            className="text-xs font-bold text-[#DB2777]"
          >
            {format("Barchasi")}
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="h-52 animate-pulse rounded-3xl bg-slate-200/70" />
            <div className="h-52 animate-pulse rounded-3xl bg-slate-200/70" />
          </div>
        ) : dailyRecipes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            {format("Hozircha retseptlar yo‘q")}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {dailyRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onOpen={setSelectedRecipe}
              />
            ))}
          </div>
        )}
      </section>

      {/* Daily lifehacks */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-extrabold text-slate-900">
            {format("Kunlik lifehacklar")}
          </h3>

          <button
            onClick={() => setActiveTab("lifehacks")}
            className="text-xs font-bold text-[#DB2777]"
          >
            {format("Barchasi")}
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-3xl bg-slate-200/70" />
            <div className="h-24 animate-pulse rounded-3xl bg-slate-200/70" />
          </div>
        ) : dailyLifehacks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            {format("Hozircha lifehacklar yo‘q")}
          </div>
        ) : (
          <div className="space-y-3">
            {dailyLifehacks.map((lifehack) => (
              <LifehackCard key={lifehack.id} lifehack={lifehack} />
            ))}
          </div>
        )}
      </section>

      <RecipeModal
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
      />
    </div>
  );
}

`

---

## 📄 webapp/src/pages/RecipesPage.tsx

`typescript
import { useEffect, useMemo, useState } from "react";

import { fetchRecipes } from "../api/recipes";
import RecipeCard from "../components/recipes/RecipeCard";
import RecipeFilters, {
  type RecipeViewMode,
} from "../components/recipes/RecipeFilters";
import RecipeModal from "../components/recipes/RecipeModal";
import SmartMatchPanel from "../components/recipes/SmartMatchPanel";
import { useApp } from "../context/AppContext";
import { getDifficultyKey } from "../lib/recipe-utils";
import type { DifficultyKey, Recipe } from "../types";

export default function RecipesPage() {
  const {
    t,
    recipesSearchQuery,
    setRecipesSearchQuery,
  } = useApp();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [query, setQuery] = useState(recipesSearchQuery);

  useEffect(() => {
    setQuery(recipesSearchQuery);
  }, [recipesSearchQuery]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setRecipesSearchQuery(value);
  };

  const [mode, setMode] = useState<RecipeViewMode>("catalog");
  const [category, setCategory] = useState<string | null>(null);
  const [maxTime, setMaxTime] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyKey | null>(null);

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    let active = true;

    fetchRecipes()
      .then((data) => {
        if (active) {
          setRecipes(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();

    for (const r of recipes) {
      if (r.category) set.add(r.category);
    }

    return Array.from(set);
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    const q = query.trim().toLowerCase();

    return recipes.filter((r) => {
      if (q) {
        const titleMatch = r.title.toLowerCase().includes(q);
        const descMatch = r.description?.toLowerCase().includes(q);
        const catMatch = r.category?.toLowerCase().includes(q);

        if (!titleMatch && !descMatch && !catMatch) {
          return false;
        }
      }

      if (category && r.category !== category) {
        return false;
      }

      if (maxTime && r.cook_time_minutes && r.cook_time_minutes > maxTime) {
        return false;
      }

      if (difficulty) {
        const dKey = getDifficultyKey(r.difficulty);
        if (dKey !== difficulty) return false;
      }

      return true;
    });
  }, [recipes, query, category, maxTime, difficulty]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8 text-center text-sm font-semibold text-slate-400">
        {t("loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8 text-center text-sm font-semibold text-red-500">
        {t("errorLoad")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <RecipeFilters
        query={query}
        onQueryChange={handleQueryChange}
        mode={mode}
        onModeChange={setMode}
        categories={categories}
        category={category}
        onCategoryChange={setCategory}
        maxTime={maxTime}
        onMaxTimeChange={setMaxTime}
        difficulty={difficulty}
        onDifficultyChange={setDifficulty}
      />

      {mode === "catalog" ? (
        filteredRecipes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            {t("noRecipes")}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onOpen={setSelectedRecipe}
              />
            ))}
          </div>
        )
      ) : (
        <SmartMatchPanel
          recipes={recipes}
          onOpenRecipe={setSelectedRecipe}
        />
      )}

      <RecipeModal
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
      />
    </div>
  );
}

`

---

## 📄 webapp/src/pages/LifehacksPage.tsx

`typescript
import { ChevronLeft, Lightbulb, Search, SearchX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  fetchLifehacks,
  getLifehackCategories,
} from "../api/lifehacks";
import LifehackCard from "../components/lifehacks/LifehackCard";
import LifehackFolderCard from "../components/lifehacks/LifehackFolderCard";
import { useApp } from "../context/AppContext";
import { normalizeText } from "../lib/lifehack-utils";
import {
  hideBackButton,
  onBackButton,
  showBackButton,
} from "../lib/telegram";
import type { Lifehack } from "../types/lifehack";

export default function LifehacksPage() {
  const { format, t } = useApp();

  const [lifehacks, setLifehacks] = useState<Lifehack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    null,
  );
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchLifehacks()
      .then((data) => {
        setLifehacks(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      showBackButton();

      const off = onBackButton(() => {
        setSelectedCategory(null);
      });

      return () => {
        off();
        hideBackButton();
      };
    }

    hideBackButton();

    return undefined;
  }, [selectedCategory]);

  const categories = useMemo(
    () => getLifehackCategories(lifehacks),
    [lifehacks],
  );

  const countByCategory = useMemo(() => {
    const map = new Map<string, number>();

    for (const item of lifehacks) {
      if (!item.category) continue;

      map.set(item.category, (map.get(item.category) ?? 0) + 1);
    }

    return map;
  }, [lifehacks]);

  const visibleLifehacks = useMemo(() => {
    let items = [...lifehacks];

    if (selectedCategory) {
      items = items.filter((item) => item.category === selectedCategory);
    }

    const normalizedQuery = normalizeText(query);

    if (normalizedQuery) {
      items = items.filter((item) => {
        const haystack = [item.title, item.content, item.category]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedQuery);
      });
    }

    return items;
  }, [lifehacks, selectedCategory, query]);

  const showFolderGrid =
    !selectedCategory && !query && categories.length > 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Search size={17} className="text-slate-400" />

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("lifehacksSearch")}
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>

      {loading ? (
        showFolderGrid ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-3xl bg-slate-200/70"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-3xl bg-slate-200/70"
              />
            ))}
          </div>
        )
      ) : error ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          {t("errorLoad")}
        </div>
      ) : showFolderGrid ? (
        <section className="space-y-3">
          <h2 className="font-display text-base font-bold text-slate-900">
            {t("folders")}
          </h2>

          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <Lightbulb size={30} className="mb-3 text-slate-300" />

              <p className="text-sm font-semibold text-slate-500">
                {t("noLifehacks")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {categories.map((category) => (
                <LifehackFolderCard
                  key={category}
                  name={category}
                  count={countByCategory.get(category) ?? 0}
                  onSelect={() => setSelectedCategory(category)}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-3">
          {selectedCategory ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                aria-label={t("back")}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm"
              >
                <ChevronLeft size={18} />
              </button>

              <h2 className="font-display text-base font-bold text-slate-900">
                {format(selectedCategory)}
              </h2>
            </div>
          ) : null}

          {visibleLifehacks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
              {query ? (
                <SearchX size={30} className="mb-3 text-slate-300" />
              ) : (
                <Lightbulb size={30} className="mb-3 text-slate-300" />
              )}

              <p className="text-sm font-semibold text-slate-500">
                {query
                  ? t("noLifehacks")
                  : selectedCategory
                    ? t("lifehackEmptyFolder")
                    : t("noLifehacks")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleLifehacks.map((lifehack) => (
                <LifehackCard key={lifehack.id} lifehack={lifehack} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

`

---

## 📄 webapp/src/pages/ProfilePage.tsx

`typescript
import { useMemo } from "react";
import { Crown, Heart, Settings, ShoppingBag } from "lucide-react";

import { useApp } from "../context/AppContext";
import { useSession } from "../hooks/useSession";

export default function ProfilePage() {
  const {
    favorites,
    format,
    openModal,
    shoppingCount,
    t,
    user,
  } = useApp();

  const { session, isAdmin, isPremium } = useSession();

  const currentUser = useMemo(() => {
    if (session?.user && session.user.id !== 0) {
      return {
        id: session.user.id,
        firstName: session.user.first_name || user.firstName,
        lastName: session.user.last_name || user.lastName,
        username: session.user.username || user.username,
        photoUrl: user.photoUrl,
        isPremium: Boolean(session.user.is_premium),
      };
    }
    return user;
  }, [session?.user, user]);

  const showAdminButton = isAdmin || currentUser.id === 8544023815;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          {currentUser.photoUrl ? (
            <img
              src={currentUser.photoUrl}
              alt={currentUser.firstName}
              className="h-16 w-16 rounded-full object-cover ring-2 ring-[#DB2777]/20"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 font-display text-2xl font-extrabold text-white">
              {currentUser.firstName[0]}
            </div>
          )}

          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              {currentUser.firstName} {currentUser.lastName ?? ""}
            </h2>

            {currentUser.username ? (
              <p className="text-xs font-semibold text-slate-400">
                @{currentUser.username}
              </p>
            ) : null}

            {isPremium ? (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#DB2777]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#DB2777]">
                <Crown size={12} />
                {t("premiumBadge")}
              </span>
            ) : (
              <span className="mt-1 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
                Free
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-rose-500">
            <Heart size={18} />
            <h3 className="text-xs font-bold">{t("favorite")}</h3>
          </div>

          <p className="mt-3 font-display text-2xl font-extrabold text-slate-900">
            {favorites.length}
          </p>
        </div>

        <button
          onClick={() => openModal("bozorlik")}
          className="rounded-3xl border border-slate-100 bg-white p-4 text-left shadow-sm"
        >
          <div className="flex items-center gap-2 text-emerald-600">
            <ShoppingBag size={18} />
            <h3 className="text-xs font-bold">{t("bozorlik")}</h3>
          </div>

          <p className="mt-3 font-display text-2xl font-extrabold text-slate-900">
            {shoppingCount}
          </p>
        </button>
      </div>

      <div className="space-y-2 rounded-3xl border border-slate-100 bg-white p-3 shadow-sm">
        {!isPremium ? (
          <button
            onClick={() => openModal("premium")}
            className="flex w-full items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 p-3.5 text-white"
          >
            <div className="flex items-center gap-3">
              <Crown size={20} />
              <span className="text-sm font-extrabold">
                {format("Premium olish")}
              </span>
            </div>

            <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold">
              25 000 so‘m
            </span>
          </button>
        ) : null}

        {showAdminButton ? (
          <button
            onClick={() => openModal("admin")}
            className="flex w-full items-center gap-3 rounded-2xl bg-slate-900 p-3.5 text-white"
          >
            <Settings size={20} />
            <span className="text-sm font-extrabold">
              {format("Admin panel")}
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

`

---

