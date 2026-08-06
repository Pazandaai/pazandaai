import { createHash, createHmac, randomUUID } from "crypto";
import { requireEnv } from "./env.js";

function hmac(key: Uint8Array | string, data: string): Uint8Array {
  return new Uint8Array(createHmac("sha256", key).update(data, "utf8").digest());
}

function sha256Hex(data: Uint8Array | string): string {
  return createHash("sha256", undefined).update(data).digest("hex");
}

function getExtension(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

export async function uploadBase64ToR2(options: {
  dataBase64: string;
  contentType: string;
  keyPrefix: string;
  userId: number;
}): Promise<string> {
  const accountId = requireEnv("R2_ACCOUNT_ID").replace(/^\uFEFF/, "").trim();
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID").replace(/^\uFEFF/, "").trim();
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY").replace(/^\uFEFF/, "").trim();
  const bucket = requireEnv("R2_BUCKET_NAME").replace(/^\uFEFF/, "").trim();
  let publicBaseUrl = requireEnv("R2_PUBLIC_BASE_URL").replace(/^\uFEFF/, "").trim();

  if (!publicBaseUrl.startsWith("http://") && !publicBaseUrl.startsWith("https://")) {
    publicBaseUrl = `https://${publicBaseUrl}`;
  }

  const rawBuffer = Buffer.from(options.dataBase64, "base64");
  const body = new Uint8Array(rawBuffer);
  const extension = getExtension(options.contentType);
  const key = `${options.keyPrefix}/${options.userId}/${randomUUID()}.${extension}`;

  const host = `${accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${bucket}/${key
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  const url = `https://${host}${canonicalUri}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body);

  const headers: Record<string, string> = {
    "content-type": options.contentType,
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };

  const signedHeaderNames = Object.keys(headers).sort();
  const signedHeaders = signedHeaderNames.join(";");
  const canonicalHeaders = signedHeaderNames
    .map((h) => `${h}:${headers[h].trim()}\n`)
    .join("");

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), "auto"), "s3"),
    "aws4_request",
  );

  const signature = createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      ...headers,
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    body: body as unknown as BodyInit,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`R2 upload xatosi ${response.status}: ${text.slice(0, 200)}`);
  }

  return `${publicBaseUrl.replace(/\/$/, "")}/${key}`;
}
