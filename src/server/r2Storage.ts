import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';

export interface R2Config {
  provider: string;
  bucket: string;
  region: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export function getR2Config(): R2Config {
  let rawEndpoint = (process.env.STORAGE_ENDPOINT || '').trim();

  // If unreplaced placeholder or empty, use the user's validated account ID
  if (!rawEndpoint || rawEndpoint.includes('YOUR_ACCOUNT_ID')) {
    rawEndpoint = 'https://79f6add8b0df2de6944fd2414a937622.r2.cloudflarestorage.com';
  } else {
    // Add protocol if missing
    if (!rawEndpoint.startsWith('http://') && !rawEndpoint.startsWith('https://')) {
      rawEndpoint = `https://${rawEndpoint}`;
    }
    // Fix missing dot before r2 (e.g. 79f6add8b0df2de6944fd2414a937622r2.cloudflarestorage.com)
    rawEndpoint = rawEndpoint.replace(/([0-9a-fA-F]{32})r2\.cloudflarestorage\.com/, '$1.r2.cloudflarestorage.com');
  }

  const rawProvider = (process.env.STORAGE_PROVIDER || '').trim().toLowerCase();
  // If provider is cloudflare_r2 or endpoint is an r2 domain, resolve to cloudflare_r2
  const isR2 = rawProvider === 'cloudflare_r2' || rawEndpoint.includes('r2.cloudflarestorage.com');
  const provider = isR2 ? 'cloudflare_r2' : (rawProvider || 'local');

  const bucket = (process.env.STORAGE_BUCKET || 'smile-store-apks').trim();
  const region = (process.env.STORAGE_REGION || 'auto').trim();
  const accessKeyId = (process.env.STORAGE_ACCESS_KEY || '').trim();
  const secretAccessKey = (process.env.STORAGE_SECRET_KEY || '').trim();

  return {
    provider,
    bucket,
    region,
    endpoint: rawEndpoint,
    accessKeyId,
    secretAccessKey,
  };
}

export function isR2Configured(): boolean {
  const config = getR2Config();
  return (
    config.provider === 'cloudflare_r2' &&
    Boolean(config.bucket) &&
    Boolean(config.endpoint) &&
    !config.endpoint.includes('YOUR_ACCOUNT_ID') &&
    Boolean(config.accessKeyId) &&
    Boolean(config.secretAccessKey)
  );
}

let s3ClientInstance: S3Client | null = null;

export function getR2Client(): S3Client | null {
  if (!isR2Configured()) {
    return null;
  }

  if (!s3ClientInstance) {
    const config = getR2Config();
    s3ClientInstance = new S3Client({
      region: config.region || 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  return s3ClientInstance;
}

/**
 * Upload an APK binary buffer or stream to Cloudflare R2 private bucket
 */
export async function uploadApkToR2(
  storageKey: string,
  fileData: Buffer | Uint8Array,
  contentType = 'application/vnd.android.package-archive'
): Promise<boolean> {
  const client = getR2Client();
  const config = getR2Config();
  if (!client || !config.bucket) {
    return false;
  }

  try {
    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: storageKey,
      Body: fileData,
      ContentType: contentType,
    });
    await client.send(command);
    return true;
  } catch (err) {
    console.error(`[Cloudflare R2] Failed to upload ${storageKey}:`, err);
    return false;
  }
}

/**
 * Generate a secure, time-limited signed download URL (default 5 minutes / 300s)
 * Allows client to download directly from Cloudflare R2 with $0 egress fees.
 */
export async function generateR2SignedDownloadUrl(
  storageKey: string,
  downloadFilename: string,
  expiresInSeconds = 300
): Promise<string | null> {
  const client = getR2Client();
  const config = getR2Config();
  if (!client || !config.bucket) {
    return null;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: config.bucket,
      Key: storageKey,
      ResponseContentType: 'application/vnd.android.package-archive',
      ResponseContentDisposition: `attachment; filename="${downloadFilename}"`,
    });

    const signedUrl = await getSignedUrl(client, command, {
      expiresIn: expiresInSeconds,
    });
    return signedUrl;
  } catch (err) {
    console.error(`[Cloudflare R2] Failed to generate signed URL for ${storageKey}:`, err);
    return null;
  }
}

/**
 * Delete an object from Cloudflare R2
 */
export async function deleteApkFromR2(storageKey: string): Promise<boolean> {
  const client = getR2Client();
  const config = getR2Config();
  if (!client || !config.bucket) {
    return false;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: storageKey,
    });
    await client.send(command);
    return true;
  } catch (err) {
    console.error(`[Cloudflare R2] Failed to delete ${storageKey}:`, err);
    return false;
  }
}

/**
 * Check if an object exists in Cloudflare R2
 */
export async function checkR2ObjectExists(storageKey: string): Promise<boolean> {
  const client = getR2Client();
  const config = getR2Config();
  if (!client || !config.bucket) {
    return false;
  }

  try {
    const command = new HeadObjectCommand({
      Bucket: config.bucket,
      Key: storageKey,
    });
    await client.send(command);
    return true;
  } catch {
    return false;
  }
}
