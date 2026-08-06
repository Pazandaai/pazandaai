import { compressImage } from "./compress";
import { getInitData } from "./telegram";

const rawBase =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined" && window.location.hostname.includes("localhost")
    ? "https://pazandaai.vercel.app"
    : "");

export const API_BASE = rawBase.replace(/\/+$/, "").replace(/\/api$/, "");

export function tgHeaders(): Record<string, string> {
  return { "x-init-data": getInitData() };
}

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

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      `Serverga ulanib bo'lmadi: ${url}. ` +
      `Internet aloqasini va VITE_API_BASE_URL ni tekshiring.`,
    );
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const text = await response.text().catch(() => "");

    let hint = "";
    if (response.status === 404) {
      hint =
        "Manzil topilmadi. VITE_API_BASE_URL to'g'ri sozlanganmi? " +
        "Lokal test uchun 'npx vercel dev' ishlatib ko'ring.";
    } else if (response.status >= 500) {
      hint =
        "Server ichki xatosi. Vercel Function Logs ni tekshiring " +
        "(env kalitlar yo'q bo'lishi mumkin).";
    }

    throw new Error(
      `API JSON qaytarmadi (status ${response.status}). URL: ${url}. ${hint} ` +
      (text ? `Javob: ${text.slice(0, 150)}` : ""),
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(data.error || `API xatosi: ${response.status}`);
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
  // 1) Rasmni siqish — sifatni yo'qotmagan holda
  let blobToUpload: Blob = file;
  let contentType = file.type || "image/jpeg";

  try {
    const compressed = await compressImage(file, {
      maxWidth: 1600,
      maxHeight: 1600,
      quality: 0.85,
      mimeType: "image/jpeg",
    });

    blobToUpload = compressed.blob;
    contentType = compressed.blob.type || "image/jpeg";

    console.log(
      `[upload] Siqildi: ${(compressed.originalSize / 1024).toFixed(0)}KB → ` +
      `${(compressed.compressedSize / 1024).toFixed(0)}KB ` +
      `(${compressed.width}x${compressed.height})`,
    );
  } catch (err) {
    console.warn("[upload] Siqishda xato, asl rasm yuboriladi:", err);
  }

  // 2) Base64 ga o'girish
  const dataBase64 = await blobToBase64(blobToUpload);

  const filename = file instanceof File ? file.name : "image.jpg";

  // 3) Yuborish
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
