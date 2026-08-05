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

        content_type = getattr(message.photo[-1], "mime_type", None) or "image/jpeg"
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
