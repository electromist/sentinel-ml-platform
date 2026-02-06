"use client";

import { useState } from "react";
import { revealSecret } from "@/lib/actions";

interface Secret {
  id: string;
  name: string;
}

// → SECRET ITEM COMPONENT: Individual secret row with toggle reveal
function SecretItem({ secret }: { secret: Secret }) {
  const [value, setValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleReveal = async () => {
    if (value) {
      setValue(null);
      return;
    }

    setLoading(true);
    const result = await revealSecret(secret.id);
    setValue(result);
    setLoading(false);
  };

  return (
    <li
      style={{
        marginBottom: "10px",
        padding: "5px",
        borderBottom: "1px dashed #666",
      }}
    >
      <strong>{secret.name}</strong>
      <button
        onClick={handleReveal}
        disabled={loading}
        style={{
          marginLeft: "10px",
          cursor: "pointer",
          opacity: loading ? 0.5 : 1,
        }}
      >
        {loading ? "Decrypting..." : value ? "Hide ❌" : "Reveal 👁️"}
      </button>
      {value && !loading && (
        <span
          style={{
            marginLeft: "10px",
            color: value.startsWith("Error") ? "red" : "green",
            fontWeight: "bold",
          }}
        >
          👉 {value}
        </span>
      )}
    </li>
  );
}

// → MAIN SECRET LIST: Render all secrets with isolated state
export default function SecretList({ secrets }: { secrets: Secret[] }) {
  return (
    <div
      style={{ marginTop: "20px", border: "1px solid #ccc", padding: "10px" }}
    >
      <h2>Secrets Vault 🔒</h2>
      <ul>
        {secrets.map((secret) => (
          <SecretItem key={secret.id} secret={secret} />
        ))}
      </ul>
      {secrets.length === 0 && <p>No secrets found.</p>}
    </div>
  );
}
