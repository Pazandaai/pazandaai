import { getInitData } from "./telegram";

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
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(data.error || "API request failed");
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
