import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getEnv } from "./_lib/env.js";
import { guardPublic } from "./_lib/guard.js";
import { supabaseFetch } from "./_lib/supabase.js";
import { isAdminUser } from "./_lib/telegram.js";

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

// ===================== GROQ KEY POOL — TEZ ROTATSIYA =====================
interface KeyState { key: string; cooldownUntil: number; fails: number; }
let pool: KeyState[] | null = null;
let rr = -1;

function getPool(): KeyState[] {
  if (pool && pool.length > 0) return pool;
  const raw =
    process.env.GROQ_API_KEYS ||
    process.env.GROQ_API_KEY ||
    getEnv("GROQ_API_KEYS") ||
    getEnv("GROQ_API_KEY") ||
    "";
  pool = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((key) => ({ key, cooldownUntil: 0, fails: 0 }));
  return pool;
}

function pickKey(exclude: Set<string>): string | null {
  const p = getPool();
  if (!p.length) return null;
  const now = Date.now();
  for (let i = 0; i < p.length; i++) {
    rr = (rr + 1) % p.length;
    const k = p[rr];
    if (exclude.has(k.key) || k.cooldownUntil > now) continue;
    return k.key;
  }
  return null; // hammasi cooldown'da
}

function markResult(key: string, status: number, retryAfterSec?: number) {
  const k = getPool().find((x) => x.key === key);
  if (!k) return;
  const now = Date.now();
  if (status === 200) { k.cooldownUntil = 0; k.fails = 0; return; }
  if (status === 429) { // limit — darhol boshqa kalitga o'tamiz
    const wait = retryAfterSec ? retryAfterSec * 1000 : 30_000;
    k.cooldownUntil = now + Math.min(wait, 120_000);
    k.fails++;
  } else if (status === 401 || status === 403) {
    k.cooldownUntil = now + 3_600_000; // nosoz kalit — 1 soat
  } else if (status >= 500) {
    k.cooldownUntil = now + 20_000;
  }
}

const SYSTEM_PROMPT = `Sen "Pazanda AI" — o'zbek oilaviy oshxonasining professional yordamchisan.
QOIDALAR:
1. Faqat oshxona mavzusida: retsept, masalliq, texnika, saqlash, parhez. Boshqa mavzuda: "Kechirasiz, men faqat oshxona bo'yicha yordam beraman 🙂"
2. Lotin o'zbek tilida, qisqa (120–180 so'z), do'stona, emoji bilan.
3. MA'LUMOT BAZASIdagi retseptni tavsiya qilsang — javob OXIRIDA har biri uchun aniq belgi qo'y: [[ID]] (masalan [[12]]). FAQAT bazadagi ID'larni ishlat, o'ylab topma.
4. Bazada mos retsept bo'lmasa — umumiy maslahat ber, belgi qo'yma.
5. Xavfsizlik: go'shtni to'liq pishirish, gigiena eslatmalari.`;

// ===================== RAG — BAZA KESH =====================
let recipesCache: { ts: number; rows: any[] } | null = null;
async function getRecipes(): Promise<any[]> {
  if (recipesCache && Date.now() - recipesCache.ts < 5 * 60_000) return recipesCache.rows;
  const rows = await supabaseFetch("GET", "recipes", {
    select: "id,title,category,description,ingredients,emoji,image_url",
    is_published: "eq.true", limit: 500,
  });
  recipesCache = { ts: Date.now(), rows: rows ?? [] };
  return recipesCache.rows;
}

function buildContext(question: string, rows: any[]) {
  const words = question.toLowerCase().split(/[^\p{L}\p{N}']+/u).filter((w) => w.length > 3);
  const scored = rows.map((r) => {
    const hay = `${r.title} ${r.category ?? ""} ${r.description ?? ""}`.toLowerCase();
    let s = 0;
    for (const w of words) if (hay.includes(w)) s += w.length > 5 ? 2 : 1;
    return { r, s };
  }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 4);
  const context = scored.map(({ r }) => {
    const ings = safeArr(r.ingredients).map((i: any) => i?.name).filter(Boolean).slice(0, 10).join(", ");
    return `[id:${r.id}] ${r.title} (${r.category ?? "-"}) — ${r.description ?? ""} Masalliqlar: ${ings}`;
  }).join("\n");
  return { context, candidates: scored.map((x) => x.r) };
}
function safeArr(v: unknown): any[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
}

// ===================== GROQ CHAQIRUV (failover) =====================
async function callGroq(messages: { role: string; content: string }[]): Promise<string> {
  const p = getPool();
  if (!p.length) throw new Error("GROQ_API_KEYS sozlanmagan");
  const tried = new Set<string>();
  let lastStatus = 0;
  for (let attempt = 0; attempt < Math.min(p.length, 6); attempt++) {
    const key = pickKey(tried);
    if (!key) break;
    tried.add(key);
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: getEnv("GROQ_MODEL") || "llama-3.3-70b-versatile",
        temperature: 0.6, max_tokens: 900,
        messages,
      }),
    });
    markResult(key, res.status, Number(res.headers.get("retry-after")) || undefined);
    if (res.ok) {
      const json = await res.json();
      return String(json?.choices?.[0]?.message?.content ?? "");
    }
    lastStatus = res.status;
    if (res.status === 400) break; // so'rov xatosi — kalit almashtirish foydasiz
    // 429/5xx → loop davom etadi, KEYINGI KALIT (kutish yo'q!)
  }
  throw new Error(`Groq pool xatosi (${lastStatus || "no keys"})`);
}

// ===================== HANDLER =====================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const g = guardPublic(req);
    if (!g.ok) return res.status(g.status).json({ ok: false, error: g.error });
    const { limit } = await getLimits(g.userId);
    const rows = await supabaseFetch("GET", "ai_usage", {
      user_id: `eq.${g.userId}`, day: `eq.${todayStr()}`, select: "used", limit: 1,
    }).catch(() => []);
    return res.status(200).json({ ok: true, used: rows?.[0]?.used ?? 0, limit });
  }
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  const g = guardPublic(req);
  if (!g.ok) return res.status(g.status).json({ ok: false, error: g.error });

  const message = String(req.body?.message ?? "").trim();
  if (!message || message.length > 600) return res.status(400).json({ ok: false, error: "Xabar 1–600 belgi" });
  const history = (Array.isArray(req.body?.history) ? req.body.history : [])
    .filter((m: any) => m?.role === "user" || m?.role === "assistant").slice(-6);

  try {
    const { isAdmin, isPremium, limit } = await getLimits(g.userId);

    // 1) Kvota (admin — cheksiz)
    if (!isAdmin) {
      const c = await supabaseFetch("POST", "rpc/ai_try_consume", {}, { uid: g.userId, max_limit: limit }).catch(() => null);
      if (c) {
        const r0 = Array.isArray(c) ? c[0] : c;
        if (r0 && r0.ok === false) return res.status(429).json({ ok: false, error: "limit", used: r0?.used ?? limit, limit, isPremium });
      }
    }

    // 2) RAG kontekst
    const rows = await getRecipes();
    const { context, candidates } = buildContext(message, rows);

    // 3) Groq (kalit pool)
    let reply = "";
    try {
      reply = await callGroq([
        { role: "system", content: SYSTEM_PROMPT + (context ? `\n\nMA'LUMOT BAZASI:\n${context}` : "") },
        ...history,
        { role: "user", content: message },
      ]);
    } catch (e) {
      if (!isAdmin) await supabaseFetch("POST", "rpc/ai_refund", {}, { uid: g.userId }).catch(() => {});
      throw e;
    }

    // 4) [[ID]] belgilarni ajratib olish → tugmalar
    const valid = new Map<number, any>(rows.map((r) => [Number(r.id), r]));
    let ids = [...new Set((reply.match(/\[\[(\d+)\]\]/g) ?? []).map((m) => Number(m.replace(/\D/g, ""))))]
      .filter((id) => valid.has(id));
    if (!ids.length) { // fallback: sarlavha javobda tilga olinganmi
      const low = reply.toLowerCase();
      ids = candidates.filter((r) => low.includes(String(r.title).toLowerCase().slice(0, 18))).map((r) => Number(r.id));
    }
    const recipes = ids.slice(0, 3).map((id) => {
      const r = valid.get(id);
      return { id: r.id, title: r.title, emoji: r.emoji ?? null, image_url: r.image_url ?? null, category: r.category ?? null };
    });
    const cleanReply = reply.replace(/\[\[\d+\]\]/g, "").replace(/\[id:\d+\]/g, "").trim();

    const usedRows = await supabaseFetch("GET", "ai_usage", {
      user_id: `eq.${g.userId}`, day: `eq.${todayStr()}`, select: "used", limit: 1,
    }).catch(() => []);
    return res.status(200).json({ ok: true, reply: cleanReply, recipes, used: usedRows?.[0]?.used ?? 0, limit });
  } catch (e: any) {
    console.error("[ai-chat]", e);
    return res.status(500).json({ ok: false, error: e?.message ?? "AI xatosi" });
  }
}

function todayStr() { return new Date().toISOString().slice(0, 10); }
async function getLimits(userId: number) {
  const isAdmin = isAdminUser({ id: userId, first_name: "" } as any);
  let isPremium = false;
  if (!isAdmin) {
    const u = await supabaseFetch("GET", "users", {
      telegram_id: `eq.${userId}`, select: "is_premium,premium_until", limit: 1,
    }).catch(() => []);
    const row = u?.[0];
    isPremium = Boolean(row?.is_premium) && (!row?.premium_until || new Date(row.premium_until).getTime() > Date.now());
  }
  const free = Number(getEnv("AI_FREE_DAILY") ?? 5);
  const prem = Number(getEnv("AI_PREMIUM_DAILY") ?? 30);
  return { isAdmin, isPremium, limit: isAdmin ? 1_000_000 : isPremium ? prem : free };
}
