import type { VercelRequest, VercelResponse } from "@vercel/node";
import { guardPublic } from "./_lib/guard.js";
import { supabaseFetch } from "./_lib/supabase.js";
import { isAdminUser } from "./_lib/telegram.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });
  const g = guardPublic(req);
  if (!g.ok) return res.status(g.status).json({ ok: false, error: g.error });
  try {
    const rows = await supabaseFetch("GET", "recipes", { is_published: "eq.true", order: "id.asc", limit: 500 });
    let isPremium = false, isAdmin = false;
    try {
      isAdmin = isAdminUser({ id: g.userId, first_name: "" });
      if (!isAdmin) {
        const u = await supabaseFetch("GET", "users", { telegram_id: `eq.${g.userId}`, select: "is_premium,premium_until", limit: 1 });
        const row = u?.[0];
        isPremium = Boolean(row?.is_premium) && (!row?.premium_until || new Date(row.premium_until).getTime() > Date.now());
      }
    } catch { /* xato = free rejim */ }
    const data = (rows ?? []).map((r: any) =>
      r.is_premium_only && !isPremium && !isAdmin ? { ...r, ingredients: [], steps: [], locked: true } : r);
    res.setHeader("Cache-Control", "private, max-age=60");
    return res.status(200).json({ ok: true, data });
  } catch (e: any) { return res.status(500).json({ ok: false, error: e?.message ?? "Server error" }); }
}
