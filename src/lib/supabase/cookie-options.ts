import type { CookieOptions } from "@supabase/ssr";
import { SESSION_MAX_SECONDS } from "@/src/lib/auth/session-config";

/** Default options for the Supabase session cookie. */
export const SESSION_COOKIE_OPTIONS = {
  maxAge: SESSION_MAX_SECONDS,
  sameSite: "lax",
  path: "/",
} as const;

/**
 * Fills in the session defaults for any option Supabase leaves out, so every
 * session cookie lasts the same time whether it is set by the proxy, a server
 * component or a route.
 */
export function withSessionDefaults(options?: CookieOptions): CookieOptions {
  return {
    ...options,
    maxAge: options?.maxAge ?? SESSION_COOKIE_OPTIONS.maxAge,
    sameSite: (options?.sameSite as "lax" | "strict" | "none") ?? SESSION_COOKIE_OPTIONS.sameSite,
    path: options?.path ?? SESSION_COOKIE_OPTIONS.path,
  };
}
