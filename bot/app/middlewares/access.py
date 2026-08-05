import time
from typing import Any, Awaitable, Callable

from aiogram import BaseMiddleware
from aiogram.types import CallbackQuery, Message, Update, User

from app.services.db import db


def extract_user(event: Any) -> User | None:
    if isinstance(event, Message):
        return event.from_user

    if isinstance(event, CallbackQuery):
        return event.from_user

    if isinstance(event, Update):
        if event.message:
            return event.message.from_user
        if event.edited_message:
            return event.edited_message.from_user
        if event.callback_query:
            return event.callback_query.from_user
        if event.inline_query:
            return event.inline_query.from_user

    return None


class BanMiddleware(BaseMiddleware):
    def __init__(self, ttl: int = 30) -> None:
        super().__init__()
        self.ttl = ttl
        self.cache: dict[int, tuple[float, bool]] = {}

    async def is_banned_cached(self, user_id: int) -> bool:
        now = time.monotonic()
        cached = self.cache.get(user_id)

        if cached and now - cached[0] < self.ttl:
            return cached[1]

        try:
            banned = await db.is_banned(user_id)
        except Exception:
            banned = False

        self.cache[user_id] = (now, banned)

        if len(self.cache) > 10000:
            self.cache = {
                key: value
                for key, value in self.cache.items()
                if now - value[0] < self.ttl
            }

        return banned

    async def __call__(
        self,
        handler: Callable[[Any, dict[str, Any]], Awaitable[Any]],
        event: Any,
        data: dict[str, Any],
    ) -> Any:
        user = extract_user(event)

        if user and await self.is_banned_cached(user.id):
            if isinstance(event, Message):
                await event.answer("Siz bloklangansiz.")
            elif isinstance(event, CallbackQuery):
                await event.answer("Siz bloklangansiz.")
            return

        return await handler(event, data)


class ThrottlingMiddleware(BaseMiddleware):
    def __init__(self, rate: float = 0.5) -> None:
        super().__init__()
        self.rate = rate
        self.last: dict[int, float] = {}

    async def __call__(
        self,
        handler: Callable[[Any, dict[str, Any]], Awaitable[Any]],
        event: Any,
        data: dict[str, Any],
    ) -> Any:
        user = extract_user(event)

        if not user:
            return await handler(event, data)

        now = time.monotonic()
        last = self.last.get(user.id)

        if last is not None and now - last < self.rate:
            if isinstance(event, CallbackQuery):
                await event.answer("⏱ Sekinroq yuboring.")
            return

        self.last[user.id] = now

        if len(self.last) > 10000:
            self.last = {
                key: value for key, value in self.last.items() if now - value < 10
            }

        return await handler(event, data)
