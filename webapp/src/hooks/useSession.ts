import { useCallback, useEffect, useState } from "react";

import { verifySession, type SessionResponse } from "../lib/api";

export function useSession() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const data = await verifySession();
      setSession(data);
    } catch {
      setSession(null);
    } finally {
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
