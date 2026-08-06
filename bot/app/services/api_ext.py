"""Bot API 10.1/10.2 yangi imkoniyatlari — avtomatik fallback bilan."""
import logging

log = logging.getLogger(__name__)


def has(bot, name: str) -> bool:
    return callable(getattr(bot, name, None))


async def send_recipe_message(
    bot,
    chat_id: int,
    caption: str,
    image_url: str | None,
    extra_photos: list | None = None,
) -> bool:
    """10.1 Rich Messages: kollaj qo'llansa rich, aks holda klassik."""
    if image_url and has(bot, "send_rich_message"):
        try:
            photos = [image_url] + (extra_photos or [])
            blocks = []
            if len(photos) >= 2:
                blocks = [
                    {
                        "type": "collage",
                        "items": [{"type": "photo", "url": u} for u in photos[:4]],
                    }
                ]
            await bot.send_rich_message(chat_id, text=caption, blocks=blocks)
            return True
        except Exception as e:
            log.warning("rich fallback: %s", e)
    try:
        if image_url:
            await bot.send_photo(chat_id, photo=image_url, caption=caption)
        else:
            await bot.send_message(chat_id, caption)
        return True
    except Exception:
        try:
            await bot.send_message(chat_id, caption, parse_mode=None)
            return True
        except Exception:
            return False


async def send_ephemeral(bot, chat_id: int, user_id: int, text: str) -> bool:
    """10.2 Ephemeral: guruhda faqat user ko'radi; qo'llanmasa oddiy."""
    try:
        await bot.send_message(chat_id, text, receiver_user_id=user_id)
        return True
    except TypeError:
        await bot.send_message(chat_id, text)
        return True
    except Exception as e:
        log.warning("ephemeral: %s", e)
        return False
