import asyncio
import logging

from aiohttp import web
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode

from app.config import get_settings
from app.handlers import admin, common, premium, profile, start
from app.middlewares import BanMiddleware, ThrottlingMiddleware
from app.services.db import db
from app.services.scheduler import setup_scheduler
from app.utils.logging import setup_logging

settings = get_settings()


async def health_check_handler(request: web.Request) -> web.Response:
    db_ok = False
    try:
        db_ok = await db.health_check()
    except Exception:
        pass
    return web.json_response(
        {
            "status": "healthy",
            "database": "ok" if db_ok else "connecting",
        },
        status=200,
    )


async def main() -> None:
    setup_logging()
    logging.info("Starting Pazanda AI Bot...")

    try:
        await db.connect()
    except Exception as e:
        logging.warning(f"Database init warning: {e}")

    bot = Bot(
        token=settings.token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = Dispatcher()

    dp.update.outer_middleware(BanMiddleware())
    if settings.ENABLE_THROTTLING:
        dp.message.middleware(ThrottlingMiddleware(rate=settings.THROTTLE_RATE))
        dp.callback_query.middleware(ThrottlingMiddleware(rate=settings.THROTTLE_RATE))

    dp.include_router(start.router)
    dp.include_router(profile.router)
    dp.include_router(premium.router)
    dp.include_router(admin.router)
    dp.include_router(common.router)

    scheduler = setup_scheduler(bot)
    scheduler.start()

    app = web.Application()
    app.router.add_get("/health", health_check_handler)
    app.router.add_get("/", health_check_handler)

    if settings.MODE == "webhook":
        from aiogram.webhook.aiohttp_server import (
            SimpleRequestHandler,
            setup_application,
        )

        webhook_handler = SimpleRequestHandler(
            dispatcher=dp,
            bot=bot,
            secret_token=settings.WEBHOOK_SECRET.get_secret_value()
            if settings.WEBHOOK_SECRET
            else None,
        )
        webhook_handler.register(app, path=settings.WEBHOOK_PATH)
        setup_application(app, dp, bot=bot)

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", settings.PORT)
    await site.start()
    logging.info(f"HTTP server running on port {settings.PORT}")

    try:
        if settings.MODE == "polling":
            logging.info("Clearing webhook & starting polling...")
            await bot.delete_webhook(drop_pending_updates=True)
            await dp.start_polling(bot)
        else:
            logging.info(f"Setting webhook to {settings.webhook_url}...")
            await bot.set_webhook(
                url=settings.webhook_url,
                secret_token=settings.WEBHOOK_SECRET.get_secret_value()
                if settings.WEBHOOK_SECRET
                else None,
            )
            await asyncio.Event().wait()
    finally:
        scheduler.shutdown()
        await runner.cleanup()
        await db.close()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
