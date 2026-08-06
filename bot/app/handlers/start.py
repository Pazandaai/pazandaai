import logging
import time
from aiogram import F, Router
from aiogram.filters import CommandStart
from aiogram.types import CallbackQuery, Message

from app.config import get_settings
from app.handlers.common_helpers import ensure_user, get_lang, invalidate_lang_cache
from app.keyboards.inline import language_kb, main_menu_kb
from app.services.db import db
from app.texts.strings import t

settings = get_settings()
router = Router()

START_WINDOW = 120        # 2 daqiqa
START_MAX = 6             # 6 marta ketma-ket
START_BLOCK_SECONDS = 4 * 3600  # 4 soat

_start_log: dict[int, list[float]] = {}
_start_blocked: dict[int, float] = {}


def is_start_spam(user_id: int) -> bool:
    now = time.monotonic()
    until = _start_blocked.get(user_id)
    if until and now < until:
        return True
    log = [t_item for t_item in _start_log.get(user_id, []) if now - t_item < START_WINDOW]
    log.append(now)
    _start_log[user_id] = log
    if len(log) >= START_MAX:
        _start_blocked[user_id] = now + START_BLOCK_SECONDS
        _start_log[user_id] = []
        return True
    return False


@router.message(CommandStart())
async def start(message: Message) -> None:
    if is_start_spam(message.from_user.id):
        return

    try:
        existing = await db.get_user(message.from_user.id)
        user = await ensure_user(message.from_user)
        language = (user.get("language") if isinstance(user, dict) else None) or "latn"

        if existing is None:
            await message.answer(
                t(language, "choose_language"),
                reply_markup=language_kb(),
            )

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
            invalidate_lang_cache(callback.from_user.id)
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
