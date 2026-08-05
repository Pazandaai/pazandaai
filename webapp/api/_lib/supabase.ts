import { requireEnv } from "./env.js";
import type { TelegramUser } from "./telegram.js";

export async function supabaseFetch(
  method: string,
  table: string,
  params?: Record<string, string | number>,
  body?: unknown,
  prefer?: string,
): Promise<any> {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const url = new URL(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/${table}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    Accept: "application/json",
  };

  if (prefer) {
    headers["Prefer"] = prefer;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();

  if (response.status >= 400) {
    throw new Error(`Supabase error ${response.status}: ${text}`);
  }

  if (!text) return [];

  return JSON.parse(text);
}

export async function ensureUser(user: TelegramUser): Promise<void> {
  await supabaseFetch(
    "POST",
    "users",
    { on_conflict: "telegram_id" },
    {
      telegram_id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
    },
    "resolution=merge-duplicates,return=representation",
  );
}
