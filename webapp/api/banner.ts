import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseFetch } from "./_lib/supabase.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const data = await supabaseFetch("GET", "app_settings", {
      key: "eq.home_banner",
      limit: 1,
    });

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=60",
    );

    return res.status(200).json({ ok: true, value: data?.[0]?.value ?? null });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: error?.message ?? "Server error",
    });
  }
}
