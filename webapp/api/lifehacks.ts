import type { VercelRequest, VercelResponse } from "@vercel/node";
import { guardPublic } from "./_lib/guard.js";
import { supabaseFetch } from "./_lib/supabase.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const g = guardPublic(req);
  if (!g.ok) return res.status(g.status).json({ ok: false, error: g.error });

  try {
    const data = await supabaseFetch("GET", "lifehacks", {
      is_published: "eq.true",
      order: "id.asc",
      limit: 500,
    });

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600",
    );

    return res.status(200).json({ ok: true, data: data ?? [] });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error?.message ?? "Server error",
    });
  }
}
