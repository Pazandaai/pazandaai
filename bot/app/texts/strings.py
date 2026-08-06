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
    "user_unbanned": "Foydalanuvchi bandan chiqarildi.",

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
