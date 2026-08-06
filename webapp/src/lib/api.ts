import { getInitData } from "./telegram";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined" && window.location.hostname.includes("localhost")
    ? "https://pazandaai.vercel.app"
    : "")
).replace(/\/$/, "");

export interface SessionUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language?: string;
  is_premium?: boolean;
  premium_until?: string | null;
}

export interface SessionResponse {
  ok: boolean;
  isAdmin: boolean;
  user?: SessionUser;
}

export interface UploadResponse {
  ok: boolean;
  url?: string;
  requestId?: string | null;
  alreadyPending?: boolean;
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const url = `${API_BASE}${path}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    throw new Error(
      `API JSON qaytarmadi (${response.status}). ` +
      `Lokal test uchun VITE_API_BASE_URL yoki vercel dev ishlatib ko'ring.`
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(data.error || `API error: ${response.status}`);
  }

  return data as T;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.split(",")[1] || "");
    };

    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function verifySession(): Promise<SessionResponse> {
  return postJSON<SessionResponse>("/api/verify-admin", {
    initData: getInitData(),
  });
}

export async function uploadImage(
  file: Blob,
  purpose: "premium_screenshot" | "admin_image",
): Promise<UploadResponse> {
  const contentType = file.type || "image/jpeg";
  const filename =
    file instanceof File ? file.name : "image.jpg";

  const dataBase64 = await blobToBase64(file);

  return postJSON<UploadResponse>("/api/upload", {
    initData: getInitData(),
    purpose,
    filename,
    contentType,
    dataBase64,
  });
}

export async function adminRequest(
  action: string,
  payload?: unknown,
): Promise<any> {
  return postJSON<any>("/api/admin", {
    initData: getInitData(),
    action,
    payload,
  });
}
