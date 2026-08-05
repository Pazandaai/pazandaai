import { createHmac, timingSafeEqual } from "crypto";

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export function verifyInitData(
  initData: string,
  botToken: string,
): TelegramUser | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");

    if (!hash) return null;

    params.delete("hash");

    const secret = createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    const entries = Array.from(params.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    const dataCheckString = entries
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const calculated = createHmac("sha256", secret as any)
      .update(dataCheckString)
      .digest("hex");

    const hashBuffer = Buffer.from(hash, "utf8");
    const calculatedBuffer = Buffer.from(calculated, "utf8");

    if (
      hashBuffer.length !== calculatedBuffer.length ||
      !timingSafeEqual(hashBuffer as any, calculatedBuffer as any)
    ) {
      return null;
    }

    const authDate = Number(params.get("auth_date") || 0);
    const now = Math.floor(Date.now() / 1000);

    if (authDate && now - authDate > 86400) {
      return null;
    }

    const userRaw = params.get("user");

    if (!userRaw) return null;

    const user = JSON.parse(userRaw) as TelegramUser;

    if (typeof user.id !== "number") return null;

    return user;
  } catch {
    return null;
  }
}

export function isAdminUser(user: TelegramUser | null): boolean {
  if (!user) return false;

  const adminIds = (process.env.ADMIN_ID || "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter(Boolean);

  return adminIds.includes(user.id);
}
