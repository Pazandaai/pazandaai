import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireEnv } from "./_lib/env.js";
import { uploadBase64ToR2 } from "./_lib/r2.js";
import { ensureUser, supabaseFetch } from "./_lib/supabase.js";
import { isAdminUser, verifyInitData } from "./_lib/telegram.js";

export const config = {
  api: {
    bodyParser: { sizeLimit: "4mb" },
  },
};

const REQUIRED_ENV = [
  "BOT_TOKEN",
  "ADMIN_ID",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_BASE_URL",
];

async function notifyAdmin(caption: string, photoUrl: string): Promise<void> {
  try {
    const botToken = requireEnv("BOT_TOKEN");
    const adminId = requireEnv("ADMIN_ID").split(",")[0]?.trim();
    if (!adminId) return;

    await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: adminId, photo: photoUrl, caption }),
    });
  } catch {
    // optional
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
    // 1) Env kalitlarni OLDINDAN tekshirish — aniq JSON xato
    const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      return res.status(500).json({
        ok: false,
        error: `Vercel env kalitlar yo‘q: ${missing.join(", ")}. Settings → Environment Variables da qo‘shing.`,
      });
    }

    const { initData, purpose, contentType, dataBase64 } = req.body ?? {};

    if (!initData || !purpose || !dataBase64) {
      return res.status(400).json({
        ok: false,
        error: "initData, purpose va dataBase64 majburiy",
      });
    }

    // 2) Hajm tekshiruvi (4MB dan katta bo‘lsa — siqish kerak)
    const buffer = Buffer.from(String(dataBase64), "base64");
    if (buffer.byteLength > 4 * 1024 * 1024) {
      return res.status(413).json({
        ok: false,
        error: "Rasm juda katta. Iltimos kichikroq rasm yuboring.",
      });
    }

    const botToken = requireEnv("BOT_TOKEN");
    const user = verifyInitData(String(initData), botToken);

    if (!user) {
      return res.status(403).json({ ok: false, error: "Invalid initData" });
    }

    const isAdmin = isAdminUser(user);

    if (purpose === "admin_image" && !isAdmin) {
      return res.status(403).json({ ok: false, error: "Admin access required" });
    }

    if (!["premium_screenshot", "admin_image"].includes(purpose)) {
      return res.status(400).json({ ok: false, error: "Invalid purpose" });
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
    console.error("[upload] error:", error);
    return res.status(500).json({
      ok: false,
      error: error?.message ?? "Server error",
    });
  }
}
