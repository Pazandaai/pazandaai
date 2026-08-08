import { API_BASE, tgHeaders } from "./api";

export interface AIRecipeRef {
  id: number;
  title: string;
  emoji?: string | null;
  image_url?: string | null;
  category?: string | null;
}

export interface AILifehackRef {
  id: number;
  title: string;
  category?: string | null;
  content?: string | null;
  image_url?: string | null;
}

export interface AIReply {
  ok: boolean;
  reply?: string;
  recipes?: AIRecipeRef[];
  lifehacks?: AILifehackRef[];
  used?: number;
  remaining?: number;
  limit?: number;
  error?: string;
  isPremium?: boolean;
  isAdmin?: boolean;
  model?: string;
}

export async function askAI(
  message: string,
  history: { role: string; content: string }[],
): Promise<AIReply> {
  const r = await fetch(`${API_BASE}/api/ai-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...tgHeaders() },
    body: JSON.stringify({ message, history }),
  });
  return r.json();
}

export async function getAIQuota(): Promise<{ used: number; remaining: number; limit: number; isAdmin?: boolean; model?: string } | null> {
  try {
    const r = await fetch(`${API_BASE}/api/ai-chat`, { headers: tgHeaders() });
    const j = await r.json();
    return j?.ok
      ? {
          used: j.used,
          remaining: j.remaining ?? Math.max(0, j.limit - j.used),
          limit: j.limit,
          isAdmin: j.isAdmin,
          model: j.model,
        }
      : null;
  } catch {
    return null;
  }
}
