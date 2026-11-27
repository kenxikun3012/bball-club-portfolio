import { readEnv } from "@/lib/env";

const DEFAULT_UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";
const UPLOAD_TIMEOUT_MS = 15_000;

/** Uploads are available only when the server has an ImageKit key and URL endpoint. */
export function isImageKitConfigured(): boolean {
  return Boolean(readEnv("IMAGEKIT_PRIVATE_KEY") && readEnv("IMAGEKIT_URL_ENDPOINT"));
}

export class ImageKitError extends Error {}

/**
 * Sends one image to ImageKit from the server (the private key never reaches the browser)
 * and returns its public https URL. Throws `ImageKitError` for any failure; callers must not
 * forward the message to clients.
 */
export async function uploadToImageKit(
  bytes: Uint8Array,
  fileName: string,
  mime: string,
): Promise<string> {
  const privateKey = readEnv("IMAGEKIT_PRIVATE_KEY");
  const endpoint = readEnv("IMAGEKIT_URL_ENDPOINT")?.replace(/\/+$/, "");
  if (!privateKey || !endpoint) throw new ImageKitError("ImageKit is not configured");

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)], { type: mime }), fileName);
  form.append("fileName", fileName);
  form.append("folder", "/club");
  form.append("useUniqueFileName", "true");

  let response: Response;
  try {
    response = await fetch(readEnv("IMAGEKIT_UPLOAD_URL") ?? DEFAULT_UPLOAD_URL, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}` },
      body: form,
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });
  } catch (error) {
    throw new ImageKitError(`upload request failed: ${error instanceof Error ? error.name : "unknown"}`);
  }

  if (!response.ok) throw new ImageKitError(`ImageKit responded ${response.status}`);

  const json = (await response.json().catch(() => null)) as { url?: unknown } | null;
  const url = typeof json?.url === "string" ? json.url : "";
  // Only accept URLs under our own endpoint, so a bad upstream response cannot plant a foreign URL.
  if (!url.startsWith(`${endpoint}/`) || !/^https:\/\/[^\s]+$/.test(url.replace(/^http:\/\//, "https://"))) {
    throw new ImageKitError("ImageKit returned an unexpected URL");
  }
  return url;
}
