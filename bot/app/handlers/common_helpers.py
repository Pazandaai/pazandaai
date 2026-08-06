import logging
import time
from aiogram.types import CallbackQuery, Message, User

from app.config import get_settings
from app.services.db import db

settings = get_settings()

_LANG_CACHE: dict[int, tuple[float, str]] = {}


def is_admin(user_id: int) -> bool:
    return user_id == settings.ADMIN_ID


async def get_lang(user_id: int) -> str:
    now = time.monotonic()
    cached = _LANG_CACHE.get(user_id)
    if cached and now - cached[0] < 60:
        return cached[1]
    try:
        user = await db.get_user(user_id)
        lang = user.get("language", "latn") if user else "latn"
    except Exception as e:
        logging.warning(f"get_lang fallback error: {e}")
        lang = "latn"
    _LANG_CACHE[user_id] = (now, lang)
    return lang


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
