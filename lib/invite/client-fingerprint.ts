const STORAGE_KEY = "cc_device_fp";

/** Stable anonymous device id for invite anti-abuse (client-side). */
export function getOrCreateDeviceFingerprint(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const fp = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, fp);
    return fp;
  } catch {
    return "anonymous";
  }
}

export const PENDING_INVITE_KEY = "cc_pending_invite";

export function stashPendingInviteCode(code: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PENDING_INVITE_KEY, code.trim().toUpperCase());
  } catch {
    /* ignore */
  }
}

export function readPendingInviteCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(PENDING_INVITE_KEY);
  } catch {
    return null;
  }
}

export function clearPendingInviteCode(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PENDING_INVITE_KEY);
  } catch {
    /* ignore */
  }
}
