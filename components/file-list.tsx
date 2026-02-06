"use client";

import { useState } from "react";
import { prepareFileDownload } from "@/lib/actions";

type SecureFile = {
  id: string;
  filename: string;
  filetype: string;
  size: number;
  createdAt: Date;
};

// → UTILITY: Convert Base64 to ArrayBuffer for decryption
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// → FILE LIST: Download and decrypt files client-side
export function FileList({ files }: { files: SecureFile[] }) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (fileId: string) => {
    setDownloading(fileId);
    try {
      // → STEP 1: Get download URL and decryption key from server
      const { downloadUrl, fileKey, iv, filename } =
        await prepareFileDownload(fileId);

      // → STEP 2: Download encrypted file from R2
      const response = await fetch(downloadUrl);
      const encryptedFileBuffer = await response.arrayBuffer();

      // → STEP 3: Import file key for decryption
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        base64ToArrayBuffer(fileKey),
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"],
      );

      // → STEP 4: Decrypt file content
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: base64ToArrayBuffer(iv) },
        cryptoKey,
        encryptedFileBuffer,
      );

      // → STEP 5: Trigger browser download
      const blob = new Blob([decryptedBuffer]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download file");
    } finally {
      setDownloading(null);
    }
  };

  if (files.length === 0) {
    return (
      <div className="p-4 border rounded-lg bg-zinc-900/50 my-4">
        <p className="text-zinc-400">No files uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-zinc-900/50 my-4">
      <h3 className="text-lg font-semibold mb-2">Your Encrypted Files</h3>
      <div className="space-y-2">
        {files.map((file) => (
          <div
            key={file.id}
            className="p-3 bg-zinc-800/50 rounded flex justify-between items-center"
          >
            <div>
              <p className="font-medium">{file.filename}</p>
              <p className="text-sm text-zinc-400">
                {file.filetype} • {(file.size / 1024).toFixed(2)} KB •{" "}
                {new Date(file.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => handleDownload(file.id)}
              disabled={downloading === file.id}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
            >
              {downloading === file.id ? "Downloading..." : "Download"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
