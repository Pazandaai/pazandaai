import json
import logging
from datetime import datetime, timezone
from io import BytesIO

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from pytz import timezone as pytz_timezone

from app.config import get_settings
from app.services.db import db
from app.texts.strings import t

settings = get_settings()


async def send_daily_recipe(bot) -> None:
    logging.info("Executing daily recipe task...")

    recipe = await db.get_random_recipe()

    async for user in db.iter_users():
        user_id = user["telegram_id"]
        lang = user.get("language", "latn")

        if not recipe:
            msg = f"<b>{t(lang, 'daily_recipe_title')}</b>\n\n{t(lang, 'daily_recipe_fallback')}"
            try:
                await bot.send_message(user_id, msg)
            except Exception:
                pass
            continue

        title = t(lang, recipe["title"]) if lang == "kyr" else recipe["title"]
        desc = t(lang, recipe["description"]) if recipe.get("description") and lang == "kyr" else recipe.get("description", "")
        cook_time = recipe.get("cook_time_minutes", 30)

        caption = (
            f"<b>🍳 {t(lang, 'daily_recipe_title')}: {title}</b>\n\n"
            f"{desc}\n\n"
            f"⏱ Tayyorlanish vaqti: {cook_time} daqiqa"
        )

        try:
            if recipe.get("image_url"):
                await bot.send_photo(user_id, photo=recipe["image_url"], caption=caption)
            else:
                await bot.send_message(user_id, caption)
        except Exception:
            pass


async def send_daily_backup(bot) -> None:
    logging.info("Executing daily backup task...")

    try:
        data = await db.backup_payload()
        dump_bytes = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")

        now_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M")
        filename = f"pazanda_backup_{now_str}.json"

        buffered = BytesIO(dump_bytes)
        buffered.name = filename

        await bot.send_document(
            chat_id=settings.ADMIN_ID,
            document=buffered,
            caption=f"📦 Kunlik avtomatik backup: {now_str}",
        )
    except Exception:
        logging.exception("Failed to execute daily backup")


def setup_scheduler(bot) -> AsyncIOScheduler:
    tz = pytz_timezone(settings.TIMEZONE)
    scheduler = AsyncIOScheduler(timezone=tz)

    scheduler.add_job(
        send_daily_recipe,
        "cron",
        hour=settings.DAILY_RECIPE_HOUR,
        minute=settings.DAILY_RECIPE_MINUTE,
        args=[bot],
    )

    scheduler.add_job(
        send_daily_backup,
        "cron",
        hour=settings.DAILY_BACKUP_HOUR,
        minute=settings.DAILY_BACKUP_MINUTE,
        args=[bot],
    )

    return scheduler
