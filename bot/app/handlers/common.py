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
