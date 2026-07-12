/**
 * Privacy-safe contract fingerprint — SHA-256 of normalized text.
 * Works in browser (SubtleCrypto) and Node (crypto).
 */

export function normalizeContractText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
}

function bufferToHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Browser / edge: async SHA-256 hex. */
export async function hashContractText(text: string): Promise<string> {
  const normalized = normalizeContractText(text);
  const data = new TextEncoder().encode(normalized);
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", data);
    return bufferToHex(digest);
  }
  // Node fallback
  const { createHash } = await import("crypto");
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}
