import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getEnv } from "./_lib/env.js";
import { guardPublic } from "./_lib/guard.js";
import { supabaseFetch } from "./_lib/supabase.js";
import { isAdminUser } from "./_lib/telegram.js";

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

// ===================== GROQ KEY POOL =====================
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

  let best: KeyState | null = null;
  for (const k of p) {
    if (exclude.has(k.key)) continue;
    if (!best || k.cooldownUntil < best.cooldownUntil) {
      best = k;
    }
  }
  return best ? best.key : p[0].key;
}

function markResult(key: string, status: number, retryAfterSec?: number) {
  const k = getPool().find((x) => x.key === key);
  if (!k) return;
  const now = Date.now();
  if (status === 200) { k.cooldownUntil = 0; k.fails = 0; return; }
  if (status === 429) {
    const wait = retryAfterSec ? retryAfterSec * 1000 : 8_000;
    k.cooldownUntil = now + Math.min(wait, 30_000);
    k.fails++;
  } else if (status === 401 || status === 403) {
    k.cooldownUntil = now + 3_600_000;
  } else if (status >= 500) {
    k.cooldownUntil = now + 10_000;
  }
}

// ===================== SAVOL-JAVOB KESHI (Backend Cache) =====================
interface CacheEntry {
  ts: number;
  reply: string;
  recipes: any[];
  lifehacks: any[];
  model: string;
}
const queryCache = new Map<string, CacheEntry>();

function normalizeQuery(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SYSTEM_PROMPT = `Sen "Pazanda AI" — o'zbek milliy va oilaviy oshxonasining professional oshpaz yordamchisan.
MUHIM QOIDALAR:
1. RETSEPT TAVSIYASI:
- Agar foydalanuvchi biror taom tayyorlash yoki retsept haqida so'rasa: TAOM TAYYORLASH BOSQICHLARI VA MASALLIQLARNI MATNDA YOZIB O'TIRMA!
- Shunchaki: "Ushbu taomni tayyorlash bo'yicha bizning to'liq retseptimiz tayyor! Quyidagi tugma orqali bosqichma-bosqich ko'rishingiz mumkin." deb 1-2 jumlada do'stona ayting va javob oxirida [[RECIPE:ID]] belgisini qo'ying.
2. LIFEHACK VA OSHXONA SIRLARI:
- Ushbu taomga oid yoki foydali oshxona sirlari (go'shtni yumshatish, qovurish, saqlash, hid ketkazish) bo'lsa: "💡 Foydali maslahat: [qisqa 1 jumla sir]" deb eslatib o'ting va javob oxirida [[LIFEHACK:ID]] belgisini qo'ying.
3. USLUB:
- O'zbek lotin tilida, juda ma'noli, chiroyli, do'stona, qisqa (40–70 so'z), o'rinli emoji bilan yozing.
4. FAQAT bazadagi ID'larni qo'ying. O'ylab topilgan soxta retsept/ID ishlatma.
5. Oshxonadan tashqari mavzularda: "Kechirasiz, men faqat pazandachilik va oshxona bo'yicha yordam bera olaman 🙂"`;

// ===================== RAG KESH (RETSEPTLAR & LIFEHACKLAR) =====================
let recipesCache: { ts: number; rows: any[] } | null = null;
async function getRecipes(): Promise<any[]> {
  if (recipesCache && Date.now() - recipesCache.ts < 5 * 60_000) return recipesCache.rows;
  const rows = await supabaseFetch("GET", "recipes", {
    select: "id,title,category,description,ingredients,image_url",
    is_published: "eq.true", limit: 500,
  }).catch(() => []);
  recipesCache = { ts: Date.now(), rows: rows ?? [] };
  return recipesCache.rows;
}

let lifehacksCache: { ts: number; rows: any[] } | null = null;
async function getLifehacks(): Promise<any[]> {
  if (lifehacksCache && Date.now() - lifehacksCache.ts < 5 * 60_000) return lifehacksCache.rows;
  const rows = await supabaseFetch("GET", "lifehacks", {
    select: "id,title,category,content,image_url",
    is_published: "eq.true", limit: 500,
  }).catch(() => []);
  lifehacksCache = { ts: Date.now(), rows: rows ?? [] };
  return lifehacksCache.rows;
}

function buildContext(question: string, recipes: any[], lifehacks: any[]) {
  const words = question.toLowerCase().split(/[^\p{L}\p{N}']+/u).filter((w) => w.length > 2);
  
  const scoredRecipes = recipes.map((r) => {
    const hay = `${r.title} ${r.category ?? ""} ${r.description ?? ""}`.toLowerCase();
    let s = 0;
    for (const w of words) if (hay.includes(w)) s += w.length > 4 ? 2 : 1;
    return { r, s };
  }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3);

  const scoredLifehacks = lifehacks.map((lh) => {
    const hay = `${lh.title} ${lh.category ?? ""} ${lh.content ?? ""}`.toLowerCase();
    let s = 0;
    for (const w of words) if (hay.includes(w)) s += w.length > 4 ? 2 : 1;
    return { lh, s };
  }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3);

  const recipeText = scoredRecipes.map(({ r }) => {
    return `[RECIPE:${r.id}] ${r.title} (${r.category ?? "-"})`;
  }).join("\n");

  const lifehackText = scoredLifehacks.map(({ lh }) => {
    const shortContent = String(lh.content ?? "").slice(0, 100);
    return `[LIFEHACK:${lh.id}] ${lh.title} (${lh.category ?? "-"}): ${shortContent}`;
  }).join("\n");

  let context = "";
  if (recipeText) context += `RETSEPTLAR BAZASI:\n${recipeText}\n\n`;
  if (lifehackText) context += `LIFEHACKLAR BAZASI:\n${lifehackText}`;

  return {
    context,
    candidateRecipes: scoredRecipes.map((x) => x.r),
    candidateLifehacks: scoredLifehacks.map((x) => x.lh),
  };
}

// ===================== GROQ CHAQIRUV =====================
async function callGroq(messages: { role: string; content: string }[]): Promise<{ content: string; modelUsed: string }> {
  const p = getPool();
  if (!p.length) throw new Error("GROQ_API_KEYS sozlanmagan");

  const primaryModel = getEnv("GROQ_MODEL") || "llama-3.3-70b-versatile";
  const modelsToTry = [primaryModel];
  if (!modelsToTry.includes("llama-3.3-70b-versatile")) modelsToTry.push("llama-3.3-70b-versatile");
  if (!modelsToTry.includes("llama-3.1-8b-instant")) modelsToTry.push("llama-3.1-8b-instant");
  if (!modelsToTry.includes("openai/gpt-oss-120b")) modelsToTry.push("openai/gpt-oss-120b");

  let lastStatus = 0;
  let lastErrText = "";

  for (const model of modelsToTry) {
    const tried = new Set<string>();
    for (let attempt = 0; attempt < Math.min(p.length, 4); attempt++) {
      const key = pickKey(tried);
      if (!key) break;
      tried.add(key);

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          temperature: 0.5,
          max_tokens: 350,
          messages,
        }),
      });

      markResult(key, res.status, Number(res.headers.get("retry-after")) || undefined);

      if (res.ok) {
        const json = await res.json();
        const content = String(json?.choices?.[0]?.message?.content ?? "");
        return { content, modelUsed: model };
      }

      lastStatus = res.status;
      lastErrText = await res.text().catch(() => "");
      console.error(`[Groq] ${model} key failed (${res.status}): ${lastErrText}`);

      if (res.status === 400) break;
    }
  }

  throw new Error(`Groq pool xatosi (${lastStatus || "no keys"}): ${lastErrText.slice(0, 100)}`);
}

// ===================== HANDLER =====================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const g = guardPublic(req);
    if (!g.ok) return res.status(g.status).json({ ok: false, error: g.error });
    const { isAdmin, limit } = await getLimits(g.userId);
    const rows = await supabaseFetch("GET", "ai_usage", {
      user_id: `eq.${g.userId}`, day: `eq.${todayStr()}`, select: "used", limit: 1,
    }).catch(() => []);
    const used = rows?.[0]?.used ?? 0;
    return res.status(200).json({ ok: true, used, remaining: Math.max(0, limit - used), limit, isAdmin, model: getEnv("GROQ_MODEL") || "llama-3.3-70b-versatile" });
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

    // 1) Kvota
    if (!isAdmin) {
      const c = await supabaseFetch("POST", "rpc/ai_try_consume", {}, { uid: g.userId, max_limit: limit }).catch(() => null);
      if (c) {
        const r0 = Array.isArray(c) ? c[0] : c;
        if (r0 && r0.ok === false) return res.status(429).json({ ok: false, error: "limit", used: r0?.used ?? limit, remaining: 0, limit, isPremium, isAdmin });
      }
    }

    // 2) Backend Query Cache Tekshiruvi (Aynan bir xil savollar uchun tezkor kesh)
    const normKey = normalizeQuery(message);
    const cached = queryCache.get(normKey);
    if (cached && Date.now() - cached.ts < 24 * 3600_000) {
      const usedRows = await supabaseFetch("GET", "ai_usage", {
        user_id: `eq.${g.userId}`, day: `eq.${todayStr()}`, select: "used", limit: 1,
      }).catch(() => []);
      const used = usedRows?.[0]?.used ?? 0;
      return res.status(200).json({
        ok: true,
        reply: cached.reply,
        recipes: cached.recipes,
        lifehacks: cached.lifehacks,
        used,
        remaining: Math.max(0, limit - used),
        limit,
        isAdmin,
        model: cached.model,
      });
    }

    // 3) RAG kontekst (Retseptlar + Lifehacklar)
    const [recipeRows, lifehackRows] = await Promise.all([getRecipes(), getLifehacks()]);
    const { context, candidateRecipes, candidateLifehacks } = buildContext(message, recipeRows, lifehackRows);

    // 4) Groq AI Chaqiruv
    let replyObj = { content: "", modelUsed: "llama-3.3-70b-versatile" };
    try {
      replyObj = await callGroq([
        { role: "system", content: SYSTEM_PROMPT + (context ? `\n\nMA'LUMOT BAZASI:\n${context}` : "") },
        ...history,
        { role: "user", content: message },
      ]);
    } catch (e) {
      if (!isAdmin) await supabaseFetch("POST", "rpc/ai_refund", {}, { uid: g.userId }).catch(() => {});
      throw e;
    }

    const reply = replyObj.content;
    const modelUsed = replyObj.modelUsed;

    // 5) [[RECIPE:ID]] va [[LIFEHACK:ID]] belgilarni ajratib olish
    const validRecipes = new Map<number, any>(recipeRows.map((r) => [Number(r.id), r]));
    const validLifehacks = new Map<number, any>(lifehackRows.map((lh) => [Number(lh.id), lh]));

    let recipeIds = [...new Set((reply.match(/\[\[(?:RECIPE:)?(\d+)\]\]/g) ?? []).map((m) => Number(m.replace(/\D/g, ""))))]
      .filter((id) => validRecipes.has(id));
    
    let lifehackIds = [...new Set((reply.match(/\[\[LIFEHACK:(\d+)\]\]/g) ?? []).map((m) => Number(m.replace(/\D/g, ""))))]
      .filter((id) => validLifehacks.has(id));

    if (!recipeIds.length && !lifehackIds.length) {
      const low = reply.toLowerCase();
      recipeIds = candidateRecipes.filter((r) => low.includes(String(r.title).toLowerCase().slice(0, 18))).map((r) => Number(r.id));
      lifehackIds = candidateLifehacks.filter((lh) => low.includes(String(lh.title).toLowerCase().slice(0, 18))).map((lh) => Number(lh.id));
    }

    const recipes = recipeIds.slice(0, 3).map((id) => {
      const r = validRecipes.get(id);
      return { id: r.id, title: r.title, image_url: r.image_url ?? null, category: r.category ?? null };
    });

    const lifehacks = lifehackIds.slice(0, 3).map((id) => {
      const lh = validLifehacks.get(id);
      return { id: lh.id, title: lh.title, category: lh.category ?? null, content: lh.content ?? null, image_url: lh.image_url ?? null };
    });

    const cleanReply = reply
      .replace(/\[\[(?:RECIPE:)?\d+\]\]/g, "")
      .replace(/\[\[LIFEHACK:\d+\]\]/g, "")
      .replace(/\[(?:RECIPE|LIFEHACK):\d+\]/g, "")
      .trim();

    // Keshga saqlash (24 soat)
    if (cleanReply && normKey.length > 5) {
      queryCache.set(normKey, {
        ts: Date.now(),
        reply: cleanReply,
        recipes,
        lifehacks,
        model: modelUsed,
      });
      if (queryCache.size > 2000) queryCache.clear();
    }

    const usedRows = await supabaseFetch("GET", "ai_usage", {
      user_id: `eq.${g.userId}`, day: `eq.${todayStr()}`, select: "used", limit: 1,
    }).catch(() => []);
    const used = usedRows?.[0]?.used ?? 0;

    return res.status(200).json({
      ok: true,
      reply: cleanReply,
      recipes,
      lifehacks,
      used,
      remaining: Math.max(0, limit - used),
      limit,
      isAdmin,
      model: modelUsed,
    });
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
