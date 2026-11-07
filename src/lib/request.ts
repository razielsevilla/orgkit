import { headers } from "next/headers";

/**
 * The public address of the app, taken from the request headers and falling
 * back to NEXT_PUBLIC_SITE_URL. Used to build links that are shown to an admin.
 */
export async function getBaseUrl(): Promise<string> {
  try {
    const headerList = await headers();
    const host = headerList.get("x-forwarded-host") || headerList.get("host");
    const proto =
      headerList.get("x-forwarded-proto") ||
      (host?.includes("localhost") || host?.includes("127.0.0.1") ? "http" : "https");
    if (host) {
      return `${proto}://${host}`;
    }
  } catch {
    // Fallback if headers() is unavailable
  }
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
}

/**
 * The caller's IP address from the proxy headers, or "unknown" when there is
 * none. Used only to rate limit; callers should hash it before storing it.
 */
export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  return (
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    "unknown"
  );
}
