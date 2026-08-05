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
