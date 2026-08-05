import type { VercelRequest, VercelResponse } from "@vercel/node";

import { requireEnv } from "./_lib/env";
import { uploadBase64ToR2 } from "./_lib/r2";
import { ensureUser, supabaseFetch } from "./_lib/supabase";
import { isAdminUser, verifyInitData } from "./_lib/telegram";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

async function notifyAdmin(
  caption: string,
  photoUrl: string,
): Promise<void> {
  try {
    const botToken = requireEnv("BOT_TOKEN");
    const adminId = requireEnv("ADMIN_ID").split(",")[0]?.trim();

    if (!adminId) return;

    await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: adminId,
        photo: photoUrl,
        caption,
      }),
    });
  } catch {
    // notify admin is optional
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { initData, purpose, contentType, dataBase64 } = req.body ?? {};

    if (!initData || !purpose || !dataBase64) {
      return res.status(400).json({
        ok: false,
        error: "initData, purpose and dataBase64 are required",
      });
    }

    const botToken = requireEnv("BOT_TOKEN");
    const user = verifyInitData(String(initData), botToken);

    if (!user) {
      return res.status(403).json({ ok: false, error: "Invalid initData" });
    }

    const isAdmin = isAdminUser(user);

    if (purpose === "admin_image" && !isAdmin) {
      return res.status(403).json({
        ok: false,
        error: "Admin access required",
      });
    }

    if (!["premium_screenshot", "admin_image"].includes(purpose)) {
      return res.status(400).json({ ok: false, error: "Invalid purpose" });
    }

    const buffer = Buffer.from(String(dataBase64), "base64");

    if (buffer.byteLength > 10 * 1024 * 1024) {
      return res.status(413).json({ ok: false, error: "File too large" });
    }

    if (purpose === "premium_screenshot") {
      await ensureUser(user).catch(() => {});

      const pending = await supabaseFetch("GET", "premium_requests", {
        user_telegram_id: `eq.${user.id}`,
        status: "eq.pending",
        order: "created_at.desc",
        limit: 1,
      });

      if (pending?.[0]) {
        return res.status(200).json({
          ok: true,
          alreadyPending: true,
          requestId: pending[0].id,
        });
      }
    }

    const url = await uploadBase64ToR2({
      dataBase64: String(dataBase64),
      contentType: String(contentType || "image/jpeg"),
      keyPrefix: purpose === "admin_image" ? "admin" : "premium",
      userId: user.id,
    });

    if (purpose === "premium_screenshot") {
      const inserted = await supabaseFetch(
        "POST",
        "premium_requests",
        {},
        {
          user_telegram_id: user.id,
          screenshot_url: url,
          status: "pending",
        },
        "return=representation",
      );

      const requestId = inserted?.[0]?.id ?? null;

      await notifyAdmin(
        [
          "💳 WebApp orqali yangi premium to‘lov so‘rovi",
          `👤 ${user.first_name}`,
          user.username ? `@${user.username}` : "",
          `ID: ${user.id}`,
          requestId ? `Request: ${String(requestId).slice(0, 8)}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        url,
      );

      return res.status(200).json({
        ok: true,
        url,
        requestId,
        alreadyPending: false,
      });
    }

    return res.status(200).json({ ok: true, url });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error?.message ?? "Server error",
    });
  }
}
