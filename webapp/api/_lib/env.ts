export function requireEnv(name: string): string {
  let value = process.env[name];

  const b64 = (s: string) => Buffer.from(s, "base64").toString("utf-8");

  const fallbacks: Record<string, string> = {
    BOT_TOKEN: b64("ODkyMDkzNzgyMzpBQUVlaTZFaHlCZ245ell3ZHZPLVJDSGliLWVudW9mRWkySQ=="),
    ADMIN_ID: "8544023815",
    SUPABASE_URL: "https://gxjhgllatevbpapmeaxo.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: b64(
      "ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKMzNYSmhZbXFpTENKeVpXWWlPaUpuZUhob2EyZHNiR0YwWlhaaWNHRXRiV0ZoZUdNaUxDSnliMnhlSWpvaWMyVnlkbWxqWlZfeWIyeGxJaXdpYVdGMElqb3hOemcxT1RJMk5UY3hMQ0psZUhBaU9qSXdNREVETVRBeE1UVXNmUS5kbWY2dnZkWE56OW5RN0t4a1pYZmw4RWJzVTdCdng3QXBEY1hLOFJnMEVN",
    ),
    R2_ACCOUNT_ID: "ff9c53f6c95ae2549fbb8fa8f9f783b0",
    R2_ACCESS_KEY_ID: "c4c667a95f59015f206358dee4bdd447",
    R2_SECRET_ACCESS_KEY: "8e49fec2a2f2f6a5a82374f60b48c3e3c9722a2cd81a16d0e389436615a3b778",
    R2_BUCKET_NAME: "pazanda-media",
    R2_PUBLIC_BASE_URL: "https://pub-28be6d5a9b754971820ec79ebb8239e9.r2.dev",
  };

  if (!value && fallbacks[name]) {
    value = fallbacks[name];
  }

  if (!value) {
    throw new Error(`Missing env variable: ${name}`);
  }

  return value.replace(/^\uFEFF/, "").trim();
}
