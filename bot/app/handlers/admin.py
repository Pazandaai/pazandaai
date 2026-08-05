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
