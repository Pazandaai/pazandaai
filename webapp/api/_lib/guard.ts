import type { VercelRequest } from "@vercel/node";
import { getEnv, requireEnv } from "./env.js";
import { parseInitDataUser, verifyInitData } from "./telegram.js";

const WINDOW_MS = 60_000;
const MAX_PER_MIN = 90;
const hits = new Map<string, number[]>();

function rateLimit(key: string): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length <= MAX_PER_MIN;
}

function hashIpToId(ip: string): number {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = (hash << 5) - hash + ip.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 999999;
}

export function guardPublic(req: VercelRequest):
  | { ok: true; userId: number }
  | { ok: false; status: number; error: string } {
  const initData =
    (req.headers["x-init-data"] as string) ||
    (req.query.initData as string) ||
    "";
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] ?? "anon";

  let userId: number | null = null;

  if (initData) {
    try {
      const botToken = getEnv("BOT_TOKEN") || requireEnv("BOT_TOKEN");
      const verified = verifyInitData(String(initData), botToken);
      if (verified) {
        userId = verified.id;
      } else {
        const parsed = parseInitDataUser(String(initData));
        if (parsed) userId = parsed.id;
      }
    } catch {
      const parsed = parseInitDataUser(String(initData));
      if (parsed) userId = parsed.id;
    }
  }

  if (!userId) {
    userId = hashIpToId(ip);
  }

  if (!rateLimit(`u:${userId}`) || !rateLimit(`ip:${ip}`)) {
    return { ok: false, status: 429, error: "Too many requests" };
  }
  return { ok: true, userId };
}
