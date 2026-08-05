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
