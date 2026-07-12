/**
 * Safari-safe helpers for multipart uploads.
 * Unicode / CJK filenames can trigger WebKit FormData bugs.
 */

/** ASCII-safe filename for FormData; keeps extension. */
export function asciiSafeUploadName(originalName: string): string {
  const raw = (originalName || "upload").trim() || "upload";
  const lastDot = raw.lastIndexOf(".");
  const ext =
    lastDot > 0 && lastDot < raw.length - 1
      ? raw
          .slice(lastDot)
          .toLowerCase()
          .replace(/[^a-z0-9.]/g, "")
          .slice(0, 12)
      : "";
  const base = (lastDot > 0 ? raw.slice(0, lastDot) : raw)
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "document"}${ext || ".bin"}`;
}

/** Clone File with safe name for upload (original name sent separately). */
export function fileForUpload(file: File): { uploadFile: File; originalName: string } {
  const originalName = file.name || "document";
  const safe = asciiSafeUploadName(originalName);
  if (safe === originalName) {
    return { uploadFile: file, originalName };
  }
  const uploadFile = new File([file], safe, {
    type: file.type || "application/octet-stream",
    lastModified: file.lastModified,
  });
  return { uploadFile, originalName };
}

/** Parse JSON only when body exists; avoids Safari pattern error on empty responses. */
export async function readJsonSafe<T = unknown>(
  res: Response
): Promise<T | Record<string, never>> {
  if (res.status === 204 || res.status === 205) return {};
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      res.ok
        ? "Invalid server response"
        : `Request failed (${res.status})`
    );
  }
}
