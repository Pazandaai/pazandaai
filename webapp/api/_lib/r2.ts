import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

import { requireEnv } from "./env.js";

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
  const accountId = requireEnv("R2_ACCOUNT_ID").trim();
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID").trim();
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY").trim();
  const bucket = requireEnv("R2_BUCKET_NAME").trim();
  let publicBaseUrl = requireEnv("R2_PUBLIC_BASE_URL").trim();

  if (!publicBaseUrl.startsWith("http://") && !publicBaseUrl.startsWith("https://")) {
    publicBaseUrl = `https://${publicBaseUrl}`;
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const extension = getExtension(options.contentType);
  const key = `${options.keyPrefix}/${options.userId}/${randomUUID()}.${extension}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(options.dataBase64, "base64"),
      ContentType: options.contentType,
    }),
  );

  return `${publicBaseUrl.replace(/\/$/, "")}/${key}`;
}
