import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireEnv } from "./_lib/env.js";
import { supabaseFetch } from "./_lib/supabase.js";
import { isAdminUser, verifyInitData } from "./_lib/telegram.js";

export const config = {
  api: { bodyParser: { sizeLimit: "5mb" } },
};

async function sendBroadcast(text: string): Promise<{ sent: number; failed: number }> {
  const botToken = requireEnv("BOT_TOKEN");
  let sent = 0;
  let failed = 0;
  let offset = 0;
  const limit = 500;
  while (true) {
    const users = await supabaseFetch("GET", "users", {
      select: "telegram_id,language",
      is_banned: "eq.false",
      order: "telegram_id.asc",
      limit,
      offset,
    });
    if (!users || users.length === 0) break;
    for (const u of users) {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: u.telegram_id, text }),
        });
        sent++;
      } catch {
        failed++;
      }
    }
    if (users.length < limit) break;
    offset += limit;
  }
  return { sent, failed };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  try {
    const { initData, action, payload } = req.body ?? {};
    if (!initData || !action) {
      return res.status(400).json({
        ok: false,
        error: "initData and action are required",
      });
    }
    const botToken = requireEnv("BOT_TOKEN");
    const user = verifyInitData(String(initData), botToken);
    if (!user) {
      return res.status(403).json({ ok: false, error: "Invalid initData" });
    }
    if (!isAdminUser(user)) {
      return res.status(403).json({ ok: false, error: "Admin only" });
    }

    switch (action) {
      // =====================
      // STATISTIKA
      // =====================
      case "stats": {
        const allUsers = await supabaseFetch("GET", "users", {
          select: "telegram_id,is_premium,is_banned",
          limit: 10000,
        }).catch(() => []);
        const allPending = await supabaseFetch("GET", "premium_requests", {
          select: "id",
          status: "eq.pending",
          limit: 10000,
        }).catch(() => []);
        const allRecipes = await supabaseFetch("GET", "recipes", {
          select: "id",
          limit: 10000,
        }).catch(() => []);
        const allLifehacks = await supabaseFetch("GET", "lifehacks", {
          select: "id",
          limit: 10000,
        }).catch(() => []);
        return res.status(200).json({
          ok: true,
          data: {
            total_users: allUsers.length,
            premium_users: allUsers.filter((u: any) => u.is_premium).length,
            banned_users: allUsers.filter((u: any) => u.is_banned).length,
            pending_payments: allPending.length,
            total_recipes: allRecipes.length,
            total_lifehacks: allLifehacks.length,
          },
        });
      }

      // =====================
      // FOYDALANUVCHILAR
      // =====================
      case "list_users": {
        const search = String(payload?.search ?? "").trim();
        const params: Record<string, string | number> = {
          select:
            "telegram_id,username,first_name,last_name,language,is_premium,is_banned,created_at",
          order: "created_at.desc",
          limit: 50,
        };
        if (search) {
          // ✅ TUZATISH: telegram_id.eq faqat RAQAM bo'lsa qo'shiladi
          const conds = [
            `username.ilike.*${search}*`,
            `first_name.ilike.*${search}*`,
          ];
          if (/^\d+$/.test(search)) conds.push(`telegram_id.eq.${search}`);
          params.or = `(${conds.join(",")})`;
        }
        const data = await supabaseFetch("GET", "users", params);
        return res.status(200).json({ ok: true, data });
      }

      case "toggle_ban": {
        const targetId = payload?.telegram_id;
        if (!targetId) {
          return res.status(400).json({ ok: false, error: "telegram_id required" });
        }
        const existing = await supabaseFetch("GET", "users", {
          telegram_id: `eq.${targetId}`,
          limit: 1,
        });
        const currentBan = existing?.[0]?.is_banned ?? false;
        await supabaseFetch(
          "PATCH",
          "users",
          { telegram_id: `eq.${targetId}` },
          { is_banned: !currentBan },
          "return=representation",
        );
        return res.status(200).json({ ok: true, banned: !currentBan });
      }

      case "grant_premium": {
        const targetId = payload?.telegram_id;
        const days = payload?.days ?? 30;
        if (!targetId) {
          return res.status(400).json({ ok: false, error: "telegram_id required" });
        }
        const until = new Date();
        until.setDate(until.getDate() + days);
        await supabaseFetch(
          "PATCH",
          "users",
          { telegram_id: `eq.${targetId}` },
          { is_premium: true, premium_until: until.toISOString() },
          "return=representation",
        );
        return res.status(200).json({ ok: true, until: until.toISOString() });
      }

      case "revoke_premium": {
        const targetId = payload?.telegram_id;
        if (!targetId) {
          return res.status(400).json({ ok: false, error: "telegram_id required" });
        }
        await supabaseFetch(
          "PATCH",
          "users",
          { telegram_id: `eq.${targetId}` },
          { is_premium: false, premium_until: null },
          "return=representation",
        );
        return res.status(200).json({ ok: true });
      }

      // =====================
      // TO'LOVLAR
      // =====================
      case "list_payments": {
        const status = payload?.status ?? "pending";
        const data = await supabaseFetch("GET", "premium_requests", {
          select: "id,user_telegram_id,screenshot_url,status,created_at,reviewed_at",
          status: `eq.${status}`,
          order: "created_at.desc",
          limit: 20,
        });
        return res.status(200).json({ ok: true, data });
      }

      case "approve_payment": {
        const requestId = payload?.request_id;
        if (!requestId) {
          return res.status(400).json({ ok: false, error: "request_id required" });
        }
        const requests = await supabaseFetch("GET", "premium_requests", {
          id: `eq.${requestId}`,
          limit: 1,
        });
        const request = requests?.[0];
        if (!request || request.status !== "pending") {
          return res.status(400).json({ ok: false, error: "Request not found or not pending" });
        }
        await supabaseFetch(
          "PATCH",
          "premium_requests",
          { id: `eq.${requestId}` },
          {
            status: "approved",
            admin_telegram_id: user.id,
            reviewed_at: new Date().toISOString(),
          },
        );
        const until = new Date();
        until.setDate(until.getDate() + 30);
        await supabaseFetch(
          "PATCH",
          "users",
          { telegram_id: `eq.${request.user_telegram_id}` },
          { is_premium: true, premium_until: until.toISOString() },
        );
        try {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: request.user_telegram_id,
              text: "✅ To'lov tasdiqlandi! Premium 30 kun faollashtirildi.",
            }),
          });
        } catch {}
        return res.status(200).json({ ok: true });
      }

      case "reject_payment": {
        const requestId = payload?.request_id;
        if (!requestId) {
          return res.status(400).json({ ok: false, error: "request_id required" });
        }
        const requests = await supabaseFetch("GET", "premium_requests", {
          id: `eq.${requestId}`,
          limit: 1,
        });
        const request = requests?.[0];
        if (!request || request.status !== "pending") {
          return res.status(400).json({ ok: false, error: "Request not found or not pending" });
        }
        await supabaseFetch(
          "PATCH",
          "premium_requests",
          { id: `eq.${requestId}` },
          {
            status: "rejected",
            admin_telegram_id: user.id,
            reviewed_at: new Date().toISOString(),
          },
        );
        try {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: request.user_telegram_id,
              text: "❌ To'lov rad etildi. Screenshotni qayta yuborishingiz mumkin.",
            }),
          });
        } catch {}
        return res.status(200).json({ ok: true });
      }

      // =====================
      // BROADCAST
      // =====================
      case "broadcast": {
        const text = payload?.text;
        if (!text) {
          return res.status(400).json({ ok: false, error: "text required" });
        }
        const result = await sendBroadcast(text);
        return res.status(200).json({ ok: true, ...result });
      }

      // =====================
      // RECIPES
      // =====================
      case "list_recipes": {
        const data = await supabaseFetch("GET", "recipes", {
          select: "id,title,category,is_published,updated_at",
          order: "id.desc",
          limit: 200,
        });
        return res.status(200).json({ ok: true, data });
      }

      // ✅ YANGI: to'liq retsept (tahrirlash uchun)
      case "get_recipe": {
        const id = payload?.id;
        if (!id) return res.status(400).json({ ok: false, error: "id required" });
        const data = await supabaseFetch("GET", "recipes", {
          id: `eq.${id}`,
          limit: 1,
        });
        return res.status(200).json({ ok: true, data: data?.[0] ?? null });
      }

      case "upsert_recipe": {
        const body = { ...(payload ?? {}) };
        const id = body.id;
        delete body.id;
        let data: any;
        if (id) {
          data = await supabaseFetch("PATCH", "recipes", { id: `eq.${id}` }, body, "return=representation");
        } else {
          data = await supabaseFetch("POST", "recipes", {}, body, "return=representation");
        }
        return res.status(200).json({ ok: true, data: data?.[0] ?? null });
      }

      case "delete_recipe": {
        const id = payload?.id;
        if (!id) return res.status(400).json({ ok: false, error: "id required" });
        await supabaseFetch("DELETE", "recipes", { id: `eq.${id}` });
        return res.status(200).json({ ok: true });
      }

      // =====================
      // LIFEHACKS
      // =====================
      case "list_lifehacks": {
        const data = await supabaseFetch("GET", "lifehacks", {
          select: "id,title,category,is_published,updated_at",
          order: "id.desc",
          limit: 200,
        });
        return res.status(200).json({ ok: true, data });
      }

      // ✅ YANGI: to'liq lifehack (tahrirlash uchun)
      case "get_lifehack": {
        const id = payload?.id;
        if (!id) return res.status(400).json({ ok: false, error: "id required" });
        const data = await supabaseFetch("GET", "lifehacks", {
          id: `eq.${id}`,
          limit: 1,
        });
        return res.status(200).json({ ok: true, data: data?.[0] ?? null });
      }

      case "upsert_lifehack": {
        const body = { ...(payload ?? {}) };
        const id = body.id;
        delete body.id;
        let data: any;
        if (id) {
          data = await supabaseFetch("PATCH", "lifehacks", { id: `eq.${id}` }, body, "return=representation");
        } else {
          data = await supabaseFetch("POST", "lifehacks", {}, body, "return=representation");
        }
        return res.status(200).json({ ok: true, data: data?.[0] ?? null });
      }

      case "delete_lifehack": {
        const id = payload?.id;
        if (!id) return res.status(400).json({ ok: false, error: "id required" });
        await supabaseFetch("DELETE", "lifehacks", { id: `eq.${id}` });
        return res.status(200).json({ ok: true });
      }

      // =====================
      // BANNER
      // =====================
      case "get_banner": {
        const data = await supabaseFetch("GET", "app_settings", {
          key: "eq.home_banner",
          limit: 1,
        });
        return res.status(200).json({ ok: true, data });
      }

      case "save_banner": {
        const value = payload?.value ?? {};
        const data = await supabaseFetch(
          "POST",
          "app_settings",
          { on_conflict: "key" },
          { key: "home_banner", value },
          "resolution=merge-duplicates,return=representation",
        );
        return res.status(200).json({ ok: true, data: data?.[0] ?? null });
      }

      default:
        return res.status(400).json({ ok: false, error: "Unknown action" });
    }
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error?.message ?? "Server error",
    });
  }
}
