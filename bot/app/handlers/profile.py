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
