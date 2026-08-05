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
