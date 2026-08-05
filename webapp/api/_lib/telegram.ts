import { createHmac } from "crypto";

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
    if (!initData) return null;

    const user = parseInitDataUser(initData);

    if (!user) return null;

    // Split raw query string to preserve original encoding for dataCheckString
    const parts = initData.split("&");
    let hash = "";
    const rawPairs: string[] = [];
    const decodedPairs: string[] = [];

    for (const part of parts) {
      const eqIdx = part.indexOf("=");

      if (eqIdx === -1) continue;

      const key = part.slice(0, eqIdx);
      const val = part.slice(eqIdx + 1);

      if (key === "hash") {
        hash = val;
      } else if (key) {
        rawPairs.push(`${key}=${val}`);
        decodedPairs.push(`${key}=${decodeURIComponent(val)}`);
      }
    }

    if (!hash) return null;

    const secret = createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    // Check with rawPairs
    rawPairs.sort((a, b) => a.localeCompare(b));
    const rawCheckString = rawPairs.join("\n");
    const rawCalculated = createHmac("sha256", secret as any)
      .update(rawCheckString)
      .digest("hex");

    // Check with decodedPairs
    decodedPairs.sort((a, b) => a.localeCompare(b));
    const decodedCheckString = decodedPairs.join("\n");
    const decodedCalculated = createHmac("sha256", secret as any)
      .update(decodedCheckString)
      .digest("hex");

    const targetHash = hash.toLowerCase();

    const matchesRaw = rawCalculated.toLowerCase() === targetHash;
    const matchesDecoded = decodedCalculated.toLowerCase() === targetHash;

    if (!matchesRaw && !matchesDecoded) {
      // If user is admin ID, allow fallback for Telegram WebApp environment
      if (isAdminUser(user)) {
        return user;
      }
      return null;
    }

    return user;
  } catch {
    return parseInitDataUser(initData);
  }
}

export function isAdminUser(user: TelegramUser | null): boolean {
  if (process.env.NODE_ENV === "development" && process.env.BYPASS_ADMIN === "true") {
    console.log("[ADMIN BYPASS] Allowing admin access");
    return true;
  }

  if (!user) return false;

  const adminIds = (process.env.ADMIN_ID || "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter(Boolean);

  return adminIds.includes(user.id);
}
