/**
 * Env kalitlarni FAQAT Vercel environment variables dan o'qiydi.
 * Kod ichida hardcoded kalit YO'Q (xavfsizlik talabi).
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env variable: ${name}`);
  }
  return value.replace(/^\uFEFF/, "").trim();
}

export function getEnv(name: string): string | null {
  const value = process.env[name];
  if (!value) return null;
  return value.replace(/^\uFEFF/, "").trim();
}
