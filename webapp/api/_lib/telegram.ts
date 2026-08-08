import { createHmac, timingSafeEqual } from "crypto";

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export function parseInitDataUser(initData: string): TelegramUser | null {
  try {
    if (!initData) return null;
    const cleanData = String(initData).replace(/^\uFEFF/, "").trim();
    const params = new URLSearchParams(cleanData);
    const userRaw = params.get("user");
    if (!userRaw) return null;
    const user = JSON.parse(userRaw) as TelegramUser;
    if (typeof user.id !== "number") return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * Telegram initData ni HMAC-SHA256 bilan to'liq tekshiradi.
 * XAVFSIZLIK: hash mos kelmasa yoki xato bo'lsa — null (hech qanday fallback yo'q).
 */
export function verifyInitData(
  initData: string,
  botToken: string,
): TelegramUser | null {
  try {
    if (!initData || !botToken) return null;
    const cleanData = String(initData).replace(/^\uFEFF/, "").trim();
    const cleanToken = String(botToken).replace(/^\uFEFF/, "").trim();
    const params = new URLSearchParams(cleanData);
    const hash = params.get("hash");
    if (!hash) return null;

    params.delete("hash");
    const pairs: string[] = [];
    params.forEach((value, key) => {
      pairs.push(`${key}=${value}`);
    });
    pairs.sort();
    const dataCheckString = pairs.join("\n");

    const secretKey = createHmac("sha256", "WebAppData")
      .update(cleanToken)
      .digest();
    const calculatedHash = createHmac("sha256", secretKey as any)
      .update(dataCheckString)
      .digest("hex");

    const a = Buffer.from(calculatedHash, "hex");
    const b = Buffer.from(hash, "hex");
    if (
      a.length !== b.length ||
      !timingSafeEqual(a as unknown as Uint8Array, b as unknown as Uint8Array)
    ) {
      console.warn("[verify] HMAC mismatch — soxta initData rad etildi");
      return null;
    }

    const authDate = Number(params.get("auth_date"));
    if (!authDate || Date.now() / 1000 - authDate > 86_400) {
      console.warn("[verify] auth_date eskirgan — rad etildi");
      return null;
    }

    return parseInitDataUser(cleanData);
  } catch (err) {
    console.error("[verify] error:", err);
    return null;
  }
}

export function isAdminUser(user: TelegramUser | null): boolean {
  if (!user) return false;
  const adminIds = (process.env.ADMIN_ID || "")
    .replace(/^\uFEFF/, "")
    .split(",")
    .map((v) => Number(v.trim()))
    .filter(Boolean);
  return adminIds.includes(user.id);
}
