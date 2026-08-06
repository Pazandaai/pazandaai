import { useCallback, useEffect, useState } from "react";
import { verifySession, type SessionResponse } from "../lib/api";

const CACHE_KEY = "pazanda_session_cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 daqiqa

// Bir nechta komponent bir vaqtda chaqirmasligi uchun in-flight deduplication
let pendingPromise: Promise<SessionResponse> | null = null;

function readCache(): SessionResponse | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || Date.now() - parsed.ts > CACHE_TTL) return null;
    return parsed.data as SessionResponse;
  } catch {
    return null;
  }
}

function writeCache(data: SessionResponse): void {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ts: Date.now(), data }),
    );
  } catch {
    // ignore
  }
}

export function useSession() {
  const [session, setSession] = useState<SessionResponse | null>(() =>
    readCache(),
  );
  const [loading, setLoading] = useState<boolean>(() => !readCache());

  const refresh = useCallback(async (force = false) => {
    if (!force) {
      const cached = readCache();
      if (cached) {
        setSession(cached);
        setLoading(false);
        return cached;
      }
    }

    setLoading(true);

    try {
      if (!pendingPromise) {
        pendingPromise = verifySession();
      }
      const data = await pendingPromise;
      writeCache(data);
      setSession(data);
      return data;
    } catch {
      setSession(null);
    } finally {
      pendingPromise = null;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    session,
    loading,
    refresh,
    isAdmin: Boolean(session?.isAdmin),
    isPremium: Boolean(session?.user?.is_premium),
  };
}
