import json
import random
from datetime import datetime, timezone
from typing import Any, AsyncIterator

import aiohttp

from app.config import get_settings

settings = get_settings()


class SupabaseDB:
    def __init__(self) -> None:
        self.base_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1"
        self._session: aiohttp.ClientSession | None = None

    async def init(self) -> None:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                headers={
                    "apikey": settings.supabase_service_key,
                    "Authorization": f"Bearer {settings.supabase_service_key}",
                }
            )

    connect = init

    async def close(self) -> None:
        if self._session and not self._session.closed:
            await self._session.close()

    async def _request(
        self,
        method: str,
        table: str,
        params: dict[str, Any] | None = None,
        payload: dict[str, Any] | list[dict[str, Any]] | None = None,
        prefer: str | None = None,
    ) -> Any:
        await self.init()

        url = f"{self.base_url}/{table}"
        headers = {"Accept": "application/json"}

        if prefer:
            headers["Prefer"] = prefer

        async with self._session.request(
            method,
            url,
            params=params,
            json=payload,
            headers=headers,
        ) as resp:
            text = await resp.text()

            if resp.status >= 400:
                raise RuntimeError(f"Supabase error {resp.status}: {text}")

            if resp.status == 204 or not text:
                return []

            return json.loads(text)

    async def _count(self, table: str, params: dict[str, Any] | None = None) -> int:
        await self.init()

        url = f"{self.base_url}/{table}"
        query = {"select": "*", "limit": 0}

        if params:
            query.update(params)

        headers = {
            "Accept": "application/json",
            "Prefer": "count=exact",
        }

        async with self._session.get(url, params=query, headers=headers) as resp:
            if resp.status >= 400:
                text = await resp.text()
                raise RuntimeError(f"Supabase count error {resp.status}: {text}")

            content_range = resp.headers.get("Content-Range", "")
            total = content_range.split("/")[-1]

            return int(total) if total.isdigit() else 0

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    # =========================
    # USERS
    # =========================

    async def get_user(self, telegram_id: int) -> dict[str, Any] | None:
        data = await self._request(
            "GET",
            "users",
            params={
                "telegram_id": f"eq.{telegram_id}",
                "limit": 1,
            },
        )
        return data[0] if data else None

    async def sync_user(
        self,
        telegram_id: int,
        first_name: str | None = None,
        last_name: str | None = None,
        username: str | None = None,
    ) -> dict[str, Any]:
        existing = await self.get_user(telegram_id)

        payload: dict[str, Any] = {"telegram_id": telegram_id}

        if first_name is not None:
            payload["first_name"] = first_name
        if last_name is not None:
            payload["last_name"] = last_name
        if username is not None:
            payload["username"] = username

        if existing:
            patch_payload = {
                key: value for key, value in payload.items() if key != "telegram_id"
            }
            patch_payload["updated_at"] = self._now_iso()

            data = await self._request(
                "PATCH",
                "users",
                params={"telegram_id": f"eq.{telegram_id}"},
                payload=patch_payload,
                prefer="return=representation",
            )
            return data[0] if data else existing

        payload["language"] = payload.get("language", "latn")
        payload["updated_at"] = self._now_iso()

        data = await self._request(
            "POST",
            "users",
            payload=payload,
            prefer="return=representation",
        )
        return data[0]

    async def set_language(self, telegram_id: int, language: str) -> None:
        await self._request(
            "PATCH",
            "users",
            params={"telegram_id": f"eq.{telegram_id}"},
            payload={"language": language, "updated_at": self._now_iso()},
            prefer="return=representation",
        )

    async def set_banned(self, telegram_id: int, banned: bool) -> None:
        await self._request(
            "PATCH",
            "users",
            params={"telegram_id": f"eq.{telegram_id}"},
            payload={"is_banned": banned, "updated_at": self._now_iso()},
            prefer="return=representation",
        )

    async def is_banned(self, telegram_id: int) -> bool:
        data = await self._request(
            "GET",
            "users",
            params={
                "select": "is_banned",
                "telegram_id": f"eq.{telegram_id}",
                "limit": 1,
            },
        )
        return bool(data and data[0].get("is_banned"))

    async def ensure_premium_status(self, user: dict[str, Any]) -> dict[str, Any]:
        if not user:
            return user

        if user.get("is_premium") and user.get("premium_until"):
            try:
                premium_until = datetime.fromisoformat(user["premium_until"])
                if premium_until.tzinfo is None:
                    premium_until = premium_until.replace(tzinfo=timezone.utc)
            except ValueError:
                premium_until = None

            if premium_until and premium_until < datetime.now(timezone.utc):
                updated = await self._request(
                    "PATCH",
                    "users",
                    params={"telegram_id": f"eq.{user['telegram_id']}"},
                    payload={"is_premium": False, "updated_at": self._now_iso()},
                    prefer="return=representation",
                )
                if updated:
                    return updated[0]

        return user

    async def set_premium(self, telegram_id: int, until: datetime) -> None:
        await self._request(
            "PATCH",
            "users",
            params={"telegram_id": f"eq.{telegram_id}"},
            payload={
                "is_premium": True,
                "premium_until": until.isoformat(),
                "updated_at": self._now_iso(),
            },
            prefer="return=representation",
        )

    async def search_users(self, query: str) -> list[dict[str, Any]]:
        query = query.strip().lstrip("@")
        query = query.replace(",", " ").replace("(", " ").replace(")", " ").strip()

        if not query:
            return []

        if query.isdigit():
            params = {
                "or": f"(telegram_id.eq.{query})",
                "limit": 10,
            }
        else:
            safe = f"*{query}*"
            params = {
                "or": f"(username.ilike.{safe},first_name.ilike.{safe})",
                "limit": 10,
            }

        return await self._request("GET", "users", params=params)

    async def iter_users(self) -> AsyncIterator[dict[str, Any]]:
        offset = 0
        limit = 500

        while True:
            data = await self._request(
                "GET",
                "users",
                params={
                    "select": "telegram_id,language",
                    "is_banned": "eq.false",
                    "order": "telegram_id.asc",
                    "limit": limit,
                    "offset": offset,
                },
            )

            if not data:
                break

            for row in data:
                yield row

            if len(data) < limit:
                break

            offset += limit

    # =========================
    # STATS
    # =========================

    async def count_users(self) -> int:
        return await self._count("users")

    async def count_banned(self) -> int:
        return await self._count("users", {"is_banned": "eq.true"})

    async def count_premium_active(self) -> int:
        return await self._count(
            "users",
            {
                "is_premium": "eq.true",
                "premium_until": f"gte.{self._now_iso()}",
            },
        )

    async def count_pending_requests(self) -> int:
        return await self._count("premium_requests", {"status": "eq.pending"})

    # =========================
    # PREMIUM REQUESTS
    # =========================

    async def create_premium_request(
        self,
        telegram_id: int,
        screenshot_url: str,
    ) -> dict[str, Any]:
        data = await self._request(
            "POST",
            "premium_requests",
            payload={
                "user_telegram_id": telegram_id,
                "screenshot_url": screenshot_url,
                "status": "pending",
            },
            prefer="return=representation",
        )
        return data[0]

    async def get_premium_request(self, request_id: str) -> dict[str, Any] | None:
        data = await self._request(
            "GET",
            "premium_requests",
            params={
                "id": f"eq.{request_id}",
                "limit": 1,
            },
        )
        return data[0] if data else None

    async def get_pending_request_by_user(
        self,
        telegram_id: int,
    ) -> dict[str, Any] | None:
        data = await self._request(
            "GET",
            "premium_requests",
            params={
                "user_telegram_id": f"eq.{telegram_id}",
                "status": "eq.pending",
                "order": "created_at.desc",
                "limit": 1,
            },
        )
        return data[0] if data else None

    async def list_pending_requests(self, limit: int = 5) -> list[dict[str, Any]]:
        return await self._request(
            "GET",
            "premium_requests",
            params={
                "status": "eq.pending",
                "order": "created_at.desc",
                "limit": limit,
            },
        )

    async def update_premium_request(
        self,
        request_id: str,
        status: str,
        admin_telegram_id: int,
    ) -> None:
        await self._request(
            "PATCH",
            "premium_requests",
            params={"id": f"eq.{request_id}"},
            payload={
                "status": status,
                "admin_telegram_id": admin_telegram_id,
                "reviewed_at": self._now_iso(),
            },
            prefer="return=representation",
        )

    # =========================
    # RECIPES
    # =========================

    async def get_random_recipe(self) -> dict[str, Any] | None:
        recipes = await self._request(
            "GET",
            "recipes",
            params={
                "select": "id,title,description,image_url,cook_time_minutes,difficulty,category",
                "is_published": "eq.true",
                "limit": 200,
            },
        )

        if not recipes:
            return None

        return random.choice(recipes)

    # =========================
    # BACKUP
    # =========================

    async def backup_payload(self) -> dict[str, Any]:
        users = await self._request(
            "GET",
            "users",
            params={"select": "*", "order": "telegram_id.asc", "limit": 10000},
        )

        premium_requests = await self._request(
            "GET",
            "premium_requests",
            params={"select": "*", "order": "created_at.desc", "limit": 10000},
        )

        recipes = await self._request(
            "GET",
            "recipes",
            params={"select": "*", "order": "id.asc", "limit": 10000},
        )

        lifehacks = await self._request(
            "GET",
            "lifehacks",
            params={"select": "*", "order": "id.asc", "limit": 10000},
        )

        return {
            "generated_at": self._now_iso(),
            "users": users,
            "premium_requests": premium_requests,
            "recipes": recipes,
            "lifehacks": lifehacks,
        }

    async def health_check(self) -> bool:
        await self._request(
            "GET",
            "users",
            params={"select": "telegram_id", "limit": 1},
        )
        return True


db = SupabaseDB()
