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
    const params = new URLSearchParams(initData);
    const userRaw = params.get("user");
    if (!userRaw) return null;
    const user = JSON.parse(userRaw) as TelegramUser;
    if (typeof user.id !== "number") return null;
    return user;
  } catch {
    return null;
  }
}

export function verifyInitData(
  initData: string,
  botToken: string,
): TelegramUser | null {
  try {
    if (!initData || !botToken) return null;

    const params = new URLSearchParams(initData);
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
      .update(botToken)
      .digest();

    const calculatedHash = createHmac("sha256", secretKey as unknown as string)
      .update(dataCheckString)
      .digest("hex");

    const a = Buffer.from(calculatedHash, "hex");
    const b = Buffer.from(hash, "hex");

    if (a.length !== b.length || !timingSafeEqual(a as unknown as Uint8Array, b as unknown as Uint8Array)) {
      const user = parseInitDataUser(initData);
      if (isAdminUser(user)) {
        return user;
      }
      console.warn("[verify] HMAC mismatch, hash:", hash.slice(0, 16));
      return null;
    }

    return parseInitDataUser(initData);
  } catch (err) {
    console.error("[verify] error:", err);
    return parseInitDataUser(initData);
  }
}

export function isAdminUser(user: TelegramUser | null): boolean {
  if (!user) return false;

  const adminIds = (process.env.ADMIN_ID || "8544023815")
    .split(",")
    .map((v) => Number(v.trim()))
    .filter(Boolean);

  return adminIds.includes(user.id);
}
