import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

// → R2 CLIENT CONFIGURATION: Cloudflare R2 with S3-compatible API
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const URL_EXPIRY = 600;

// → UPLOAD FLOW: Generate presigned upload URL with unique storage key
export async function getPresignedUploadUrl(
  filename: string,
  filetype: string,
) {
  const storageKey = `${crypto.randomBytes(16).toString("hex")}-${filename}`;
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: storageKey,
    ContentType: filetype,
  });

  const signedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: URL_EXPIRY,
  });
  return { signedUrl, storageKey };
}

// → DOWNLOAD FLOW: Generate presigned download URL for existing file
export async function getPresignedDownloadUrl(storageKey: string) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: storageKey,
  });

  return getSignedUrl(s3Client, command, { expiresIn: URL_EXPIRY });
}

// → DELETE FLOW: Remove file from R2 storage
export async function deleteFileFromR2(storageKey: string) {
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: storageKey,
      }),
    );
    return true;
  } catch (error) {
    console.error(`R2 deletion failed: ${storageKey}`, error);
    return false;
  }
}
