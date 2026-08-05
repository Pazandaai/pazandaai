import asyncio
import logging
from aiohttp import web
from aiogram import Bot, Dispatcher

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

    if db_ok:
        return web.json_response({"status": "healthy", "database": "ok"})
    return web.json_response({"status": "unhealthy", "database": "error"}, status=500)


async def main() -> None:
    setup_logging()
    logging.info("Starting Pazanda AI Bot...")

    # Initialize Supabase DB session
    await db.init()

    bot = Bot(token=settings.token)
    dp = Dispatcher()

    # Register Middlewares
    dp.update.outer_middleware(BanMiddleware())
    if settings.ENABLE_THROTTLING:
        dp.message.middleware(ThrottlingMiddleware(rate=settings.THROTTLE_RATE))
        dp.callback_query.middleware(ThrottlingMiddleware(rate=settings.THROTTLE_RATE))

    # Register Routers
    dp.include_router(start.router)
    dp.include_router(profile.router)
    dp.include_router(premium.router)
    dp.include_router(admin.router)
    dp.include_router(common.router)

    # Initialize Scheduler
    scheduler = setup_scheduler(bot)
    scheduler.start()

    # Start Health Check Server
    app = web.Application()
    app.router.add_get("/health", health_check_handler)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", settings.PORT)
    await site.start()
    logging.info(f"Health check running on port {settings.PORT}")

    try:
        if settings.MODE == "polling":
            logging.info("Starting polling mode...")
            await dp.start_polling(bot)
        else:
            logging.info(f"Setting webhook to {settings.webhook_url}...")
            await bot.set_webhook(
                url=settings.webhook_url,
                secret_token=settings.WEBHOOK_SECRET.get_secret_value() if settings.WEBHOOK_SECRET else None,
            )
            # Webhook runner could be attached here if needed
            await dp.start_polling(bot)
    finally:
        scheduler.shutdown()
        await runner.cleanup()
        await db.close()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
