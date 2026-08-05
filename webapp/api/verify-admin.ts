import type { VercelRequest, VercelResponse } from "@vercel/node";

import { requireEnv } from "./_lib/env";
import { supabaseFetch, ensureUser } from "./_lib/supabase";
import { isAdminUser, verifyInitData } from "./_lib/telegram";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { initData } = req.body ?? {};

    if (!initData) {
      return res
        .status(400)
        .json({ ok: false, error: "initData is required" });
    }

    const botToken = requireEnv("BOT_TOKEN");
    const user = verifyInitData(String(initData), botToken);

    // DEBUG LOG
    console.log("[verify-admin] initData received:", String(initData).slice(0, 100));
    console.log("[verify-admin] user parsed:", user);
    console.log("[verify-admin] ADMIN_ID env:", process.env.ADMIN_ID);
    console.log("[verify-admin] isAdmin:", isAdminUser(user));

    if (!user) {
      return res.status(403).json({ ok: false, error: "Invalid initData" });
    }

    const isAdmin = isAdminUser(user);

    await ensureUser(user).catch(() => {});

    let dbUser: any = null;

    try {
      const rows = await supabaseFetch("GET", "users", {
        telegram_id: `eq.${user.id}`,
        limit: 1,
      });

      dbUser = rows?.[0] ?? null;
    } catch {
      dbUser = null;
    }

    return res.status(200).json({
      ok: true,
      isAdmin,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        language: dbUser?.language ?? "latn",
        is_premium: Boolean(dbUser?.is_premium),
        premium_until: dbUser?.premium_until ?? null,
      },
    });
  } catch (error: any) {
    console.error("[verify-admin] error:", error);
    return res.status(500).json({
      ok: false,
      error: error?.message ?? "Server error",
    });
  }
}
