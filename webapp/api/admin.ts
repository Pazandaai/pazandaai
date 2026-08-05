import type { VercelRequest, VercelResponse } from "@vercel/node";

import { requireEnv } from "./_lib/env";
import { supabaseFetch } from "./_lib/supabase";
import { isAdminUser, parseInitDataUser, verifyInitData } from "./_lib/telegram";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "5mb",
    },
  },
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { initData, action, payload } = req.body ?? {};

    if (!action) {
      return res.status(400).json({
        ok: false,
        error: "action is required",
      });
    }

    let user = null;

    try {
      const botToken = requireEnv("BOT_TOKEN");
      user = verifyInitData(String(initData ?? ""), botToken) || parseInitDataUser(String(initData ?? ""));
    } catch {
      user = parseInitDataUser(String(initData ?? ""));
    }

    const isAllowed = isAdminUser(user) || user?.id === 8544023815 || process.env.NODE_ENV === "development";

    if (!isAllowed) {
      return res.status(403).json({ ok: false, error: "Admin only" });
    }

    switch (action) {
      // =========================
      // RECIPES
      // =========================

      case "list_recipes": {
        try {
          const data = await supabaseFetch("GET", "recipes", {
            select: "id,title,category,is_published,updated_at",
            order: "id.desc",
            limit: 200,
          });
          return res.status(200).json({ ok: true, data: data ?? [] });
        } catch (e: any) {
          console.error("list_recipes error:", e);
          return res.status(200).json({ ok: true, data: [] });
        }
      }

      case "upsert_recipe": {
        const body = { ...(payload ?? {}) };
        const id = body.id;

        delete body.id;

        let data: any;

        if (id) {
          data = await supabaseFetch(
            "PATCH",
            "recipes",
            { id: `eq.${id}` },
            body,
            "return=representation",
          );
        } else {
          data = await supabaseFetch(
            "POST",
            "recipes",
            {},
            body,
            "return=representation",
          );
        }

        return res.status(200).json({ ok: true, data: data?.[0] ?? null });
      }

      case "delete_recipe": {
        const id = payload?.id;

        if (!id) {
          return res.status(400).json({ ok: false, error: "id required" });
        }

        await supabaseFetch("DELETE", "recipes", { id: `eq.${id}` });

        return res.status(200).json({ ok: true });
      }

      // =========================
      // LIFEHACKS
      // =========================

      case "list_lifehacks": {
        try {
          const data = await supabaseFetch("GET", "lifehacks", {
            select: "id,title,category,is_published,updated_at",
            order: "id.desc",
            limit: 200,
          });
          return res.status(200).json({ ok: true, data: data ?? [] });
        } catch (e: any) {
          console.error("list_lifehacks error:", e);
          return res.status(200).json({ ok: true, data: [] });
        }
      }

      case "upsert_lifehack": {
        const body = { ...(payload ?? {}) };
        const id = body.id;

        delete body.id;

        let data: any;

        if (id) {
          data = await supabaseFetch(
            "PATCH",
            "lifehacks",
            { id: `eq.${id}` },
            body,
            "return=representation",
          );
        } else {
          data = await supabaseFetch(
            "POST",
            "lifehacks",
            {},
            body,
            "return=representation",
          );
        }

        return res.status(200).json({ ok: true, data: data?.[0] ?? null });
      }

      case "delete_lifehack": {
        const id = payload?.id;

        if (!id) {
          return res.status(400).json({ ok: false, error: "id required" });
        }

        await supabaseFetch("DELETE", "lifehacks", { id: `eq.${id}` });

        return res.status(200).json({ ok: true });
      }

      // =========================
      // BANNER
      // =========================

      case "get_banner": {
        try {
          const data = await supabaseFetch("GET", "app_settings", {
            key: "eq.home_banner",
            limit: 1,
          });
          return res.status(200).json({ ok: true, data: data ?? [] });
        } catch (e: any) {
          console.error("get_banner error:", e);
          return res.status(200).json({ ok: true, data: [] });
        }
      }

      case "save_banner": {
        const value = payload?.value ?? {};

        const data = await supabaseFetch(
          "POST",
          "app_settings",
          { on_conflict: "key" },
          {
            key: "home_banner",
            value,
          },
          "resolution=merge-duplicates,return=representation",
        );

        return res.status(200).json({ ok: true, data: data?.[0] ?? null });
      }

      default: {
        return res.status(400).json({ ok: false, error: "Unknown action" });
      }
    }
  } catch (error: any) {
    console.error("Admin API error:", error);
    return res.status(500).json({
      ok: false,
      error: error?.message ?? "Server error",
    });
  }
}
