import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

import { getEnv } from "@/lib/env";

const s3ClientCache = new Map<string, S3Client>();

function getS3Client(): S3Client {
  const env = getEnv();

  if (!s3ClientCache.has(env.S3_REGION)) {
    s3ClientCache.set(
      env.S3_REGION,
      new S3Client({
        region: env.S3_REGION,
      }),
    );
  }

  return s3ClientCache.get(env.S3_REGION)!;
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9.\-_]/g, "-").replace(/-{2,}/g, "-").toLowerCase();
}

export async function createPresignedPhotoUpload(params: {
  fileName: string;
  contentType: string;
}): Promise<{ key: string; uploadUrl: string }> {
  const env = getEnv();
  const datePrefix = new Date().toISOString().slice(0, 10);
  const key = `${env.S3_UPLOAD_PREFIX}/${datePrefix}/${randomUUID()}-${sanitizeFileName(params.fileName)}`;

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: params.contentType,
  });

  const uploadUrl = await getSignedUrl(getS3Client(), command, {
    expiresIn: 60 * 5,
  });

  return {
    key,
    uploadUrl,
  };
}

export async function createPresignedPhotoViewUrl(key: string, expiresIn = 60 * 10): Promise<string> {
  const env = getEnv();
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(getS3Client(), command, {
    expiresIn,
  });
}

