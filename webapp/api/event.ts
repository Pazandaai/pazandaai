import type { VercelRequest, VercelResponse } from "@vercel/node";
import { guardPublic } from "./_lib/guard.js";
import { supabaseFetch } from "./_lib/supabase.js";

const ALLOWED = new Set([
  "open_recipe",
  "open_lifehack",
  "add_shopping",
  "start_match",
  "share_recipe",
  "copy_recipe",
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const g = guardPublic(req);
  if (!g.ok) return res.status(g.status).json({ ok: false, error: g.error });

  const { event, payload } = req.body ?? {};
  if (!ALLOWED.has(String(event))) {
    return res.status(400).json({ ok: false, error: "unknown event" });
  }

  await supabaseFetch(
    "POST",
    "events",
    {},
    { user_id: g.userId, event: String(event), payload: payload ?? {} },
    "return=minimal",
  ).catch(() => {});

  return res.status(200).json({ ok: true });
}
