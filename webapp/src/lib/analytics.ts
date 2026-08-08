import { API_BASE, tgHeaders } from "./api";

export function track(event: string, payload: Record<string, unknown> = {}) {
  try {
    fetch(`${API_BASE}/api/event`, {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        ...tgHeaders(),
      },
      body: JSON.stringify({ event, payload }),
    }).catch(() => {});
  } catch {
    // ignore tracking errors
  }
}
