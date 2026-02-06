"use client";

import { useState, useRef } from "react";
import { prepareFileUpload, saveFileMetadata } from "@/lib/actions";

// → UTILITY: Convert ArrayBuffer to Base64 for transmission
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const EXPIRATION_OPTIONS = [
  { label: "Never", value: 0 },
  { label: "1 Minute (Test)", value: 60 },
  { label: "1 Hour", value: 3600 },
  { label: "24 Hours", value: 86400 },
  { label: "7 Days", value: 604800 },
];

// → FILE UPLOADER: Client-side encryption before upload
export function FileUploader() {
  const [status, setStatus] = useState("Waiting...");
  const [ttl, setTtl] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileEncryptAndUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setStatus("No file selected!");
      return;
    }

    try {
      // → STEP 1: Generate unique encryption key for this file
      setStatus("Generating file key...");
      const fileKey = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"],
      );
      const fileKeyBuffer = await crypto.subtle.exportKey("raw", fileKey);

      // → STEP 2: Encrypt file content in browser
      setStatus("Encrypting file...");
      const fileContentBuffer = await file.arrayBuffer();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encryptedFileContent = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        fileKey,
        fileContentBuffer,
      );

      // → STEP 3: Get presigned upload URL
      setStatus("Preparing secure upload...");
      const { signedUrl, storageKey } = await prepareFileUpload(
        file.name,
        file.type,
      );

      // → STEP 4: Upload encrypted file to R2
      setStatus("Uploading...");
      const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        body: encryptedFileContent,
        headers: { "Content-Type": file.type },
      });

      if (!uploadResponse.ok) throw new Error("Upload failed");

      // → STEP 5: Save metadata with encrypted file key
      setStatus("Saving metadata...");
      const result = await saveFileMetadata(
        file.name,
        arrayBufferToBase64(fileKeyBuffer),
        arrayBufferToBase64(iv.buffer),
        storageKey,
        file.type,
        file.size,
        ttl,
      );

      if (result.success) {
        setStatus("✅ Upload Complete!");
        setTimeout(() => (window.location.href = "/?fileUploaded=true"), 1000);
      }
    } catch (error) {
      console.error(error);
      setStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  // → RENDER: File input + expiration selector + upload button
  return (
    <div className="p-4 border rounded-lg bg-zinc-900/50 my-4">
      <h3 className="text-lg font-semibold mb-2">Secure File Vault</h3>
      <p className="text-sm text-zinc-400 mb-4">
        Files are encrypted in your browser before being uploaded. The server
        never sees the unencrypted data.
      </p>

      <input
        type="file"
        ref={fileInputRef}
        className="mb-4 block w-full text-sm text-gray-500
        file:mr-4 file:py-2 file:px-4
        file:rounded-full file:border-0
        file:text-sm file:font-semibold
        file:bg-blue-50 file:text-blue-700
        hover:file:bg-blue-100"
      />

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Self-Destruct Timer:
        </label>
        <select
          value={ttl}
          onChange={(e) => setTtl(Number(e.target.value))}
          className="border border-zinc-700 bg-zinc-800 text-white rounded px-2 py-1 w-full max-w-xs"
        >
          {EXPIRATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleFileEncryptAndUpload}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full sm:w-auto"
      >
        Encrypt & Upload
      </button>
      <p className="text-sm mt-2 text-yellow-400">{status}</p>
    </div>
  );
}
