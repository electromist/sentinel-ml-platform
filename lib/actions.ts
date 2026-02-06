"use server";

import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { encrypt, decrypt } from "./crypto";
import { currentUser } from "@clerk/nextjs/server";
import { getPresignedUploadUrl, getPresignedDownloadUrl } from "./r2";

// → AUTH FLOW: Verify Clerk user → sync to DB → return user with org
async function getAuthenticatedUser() {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  const email = user.emailAddresses[0].emailAddress;
  let dbUser = await prisma.user.findUnique({
    where: { email },
    include: { organization: true },
  });

  // → AUTO-ONBOARDING: Create org for new users
  if (!dbUser) {
    await prisma.organization.create({
      data: {
        name: `${user.firstName || "User"}'s Organization`,
        users: {
          create: {
            email,
            role: "ADMIN",
            password: "CLERK_MANAGED",
          },
        },
      },
    });

    dbUser = await prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });
  }

  return dbUser!;
}

export async function getCurrentOrgName() {
  const user = await getAuthenticatedUser();
  return user.organization.name;
}

// → SECRET CREATION FLOW: Form data → encrypt → store to DB → redirect
export async function createSecret(formData: FormData) {
  const user = await getAuthenticatedUser();
  const name = formData.get("keyName") as string;
  const value = formData.get("keyValue") as string;
  const ttlRaw = formData.get("ttlSeconds"); // <-- Read the timer

  if (!name || !value) throw new Error("Missing required fields");

  // Calculate Expiration
  let expiresAt: Date | undefined;
  if (ttlRaw) {
    const ttlSeconds = parseInt(ttlRaw.toString());
    if (ttlSeconds > 0) {
      const now = new Date();
      expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
    }
  }

  const { encryptedData, iv, authTag } = encrypt(value);

  await prisma.secret.create({
    data: {
      name,
      encryptedData,
      iv,
      authTag,
      organizationId: user.organizationId,
      expiresAt, // <-- Save it to DB
    },
  });

  redirect("/?secretStored=true");
}

// → SECRET RETRIEVAL FLOW: Fetch org secrets (metadata only, optimized select)
export async function getSecrets() {
  const user = await getAuthenticatedUser();
  return prisma.secret.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
    },
  });
}

// → SECRET REVEAL FLOW: Fetch → audit log → decrypt → return plaintext
export async function revealSecret(secretId: string) {
  const user = await getAuthenticatedUser();

  const secret = await prisma.secret.findUnique({
    where: { id: secretId, organizationId: user.organizationId },
  });

  if (!secret) return null;

  // → Audit trail for security monitoring
  await prisma.auditLog.create({
    data: {
      action: "SECRET_VIEW",
      entityId: secretId,
      organizationId: user.organizationId,
      ipAddress: "127.0.0.1",
      userAgent: "Server Action",
    },
  });

  try {
    return decrypt(secret.encryptedData, secret.iv, secret.authTag);
  } catch {
    return "Error: Decryption failed";
  }
}

// → AUDIT LOG RETRIEVAL FLOW: Fetch latest 10 logs for org
export async function getAuditLogs() {
  const user = await getAuthenticatedUser();
  return prisma.auditLog.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}

// → FILE UPLOAD PREPARATION FLOW: Generate presigned URL and storage key
export async function prepareFileUpload(filename: string, filetype: string) {
  await getAuthenticatedUser();
  if (!filename || !filetype) throw new Error("Filename and filetype required");
  return getPresignedUploadUrl(filename, filetype);
}

// → FILE METADATA STORAGE FLOW: Encrypt file key → calculate expiry → save to DB
export async function saveFileMetadata(
  filename: string,
  rawFileKeyBase64: string,
  fileIv: string,
  storageKey: string,
  filetype: string,
  size: number,
  ttlSeconds?: number,
) {
  const user = await getAuthenticatedUser();

  // → Double encryption: file key encrypted with server master key
  const { encryptedData, iv, authTag } = encrypt(rawFileKeyBase64);
  const encryptedFileKey = `${iv}:${authTag}:${encryptedData}`;

  const expiresAt =
    ttlSeconds && ttlSeconds > 0
      ? new Date(Date.now() + ttlSeconds * 1000)
      : undefined;

  await prisma.secureFile.create({
    data: {
      filename,
      filetype,
      size,
      storageKey,
      encryptedFileKey,
      iv: fileIv,
      organizationId: user.organizationId,
      expiresAt,
    },
  });

  return { success: true };
}

// → FILE LIST RETRIEVAL FLOW: Fetch file metadata (optimized select, no keys)
export async function getSecureFiles() {
  const user = await getAuthenticatedUser();
  return prisma.secureFile.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      filename: true,
      filetype: true,
      size: true,
      createdAt: true,
    },
  });
}

// → FILE DOWNLOAD PREPARATION FLOW: Fetch metadata → decrypt file key → generate download URL
export async function prepareFileDownload(fileId: string) {
  const user = await getAuthenticatedUser();

  const file = await prisma.secureFile.findUnique({
    where: {
      id: fileId,
      organizationId: user.organizationId,
    },
  });

  if (!file) throw new Error("File not found");

  // → Unpack and decrypt the file encryption key
  const [keyIv, authTag, encryptedFileKey] = file.encryptedFileKey.split(":");
  const decryptedFileKeyBase64 = decrypt(encryptedFileKey, keyIv, authTag);

  const downloadUrl = await getPresignedDownloadUrl(file.storageKey);

  return {
    downloadUrl,
    fileKey: decryptedFileKeyBase64,
    iv: file.iv,
    filename: file.filename,
  };
}
