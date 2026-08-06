import type { VercelRequest } from "@vercel/node";
import { requireEnv } from "./env.js";
import { verifyInitData } from "./telegram.js";

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

export function guardPublic(req: VercelRequest):
  | { ok: true; userId: number }
  | { ok: false; status: number; error: string } {
  const initData =
    (req.headers["x-init-data"] as string) ||
    (req.query.initData as string) ||
    "";
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] ?? "anon";

  if (!initData) {
    return { ok: false, status: 403, error: "initData required" };
  }
  const user = verifyInitData(String(initData), requireEnv("BOT_TOKEN"));
  if (!user) {
    return { ok: false, status: 403, error: "Invalid initData" };
  }
  if (!rateLimit(`u:${user.id}`) || !rateLimit(`ip:${ip}`)) {
    return { ok: false, status: 429, error: "Too many requests" };
  }
  return { ok: true, userId: user.id };
}
