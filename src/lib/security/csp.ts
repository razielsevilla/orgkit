/**
 * Content-Security-Policy and HSTS for every response (set in next.config.ts).
 *
 * Kept free of imports and of `server-only` so next.config.ts and the node:test
 * header tests can load it directly.
 *
 * Why a static header and not a per-request nonce: the app uses cacheComponents and
 * partialPrefetching, and the Next docs say a nonce-based CSP cannot work with
 * partial prerendering (node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md).
 * So scripts and styles allow 'unsafe-inline' (Next injects inline bootstrap scripts
 * and styles), and the policy earns its keep everywhere else: no script, style, font or
 * frame from another origin, no plugins, no <base> hijack, no off-site form posts, and
 * fetch/XHR/WebSocket only to our own origin and Supabase.
 * A later step could drop 'unsafe-inline' for scripts with experimental SRI.
 */

/** Set to true once staging shows zero CSP violations in the browser console. */
export const CSP_ENFORCED = false;

export const CSP_HEADER_NAME = CSP_ENFORCED
  ? "Content-Security-Policy"
  : "Content-Security-Policy-Report-Only";

/** The host part of the Supabase URL, or null when it is missing or malformed. */
function supabaseOrigin(rawUrl: string | undefined): URL | null {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

export interface CspOptions {
  /** NEXT_PUBLIC_SUPABASE_URL: the browser talks to it (auth) and loads signed storage URLs from it */
  supabaseUrl?: string;
  /** React needs eval in development only */
  isDev?: boolean;
}

/** One plain line, as a header value must be */
export function buildCsp({ supabaseUrl, isDev = false }: CspOptions = {}): string {
  const supabase = supabaseOrigin(supabaseUrl);
  const supabaseHttp = supabase ? [supabase.origin] : [];
  const supabaseWs = supabase
    ? [`${supabase.protocol === "https:" ? "wss:" : "ws:"}//${supabase.host}`]
    : [];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    // Payment screenshots are shown through signed Supabase storage URLs
    "img-src": ["'self'", "blob:", "data:", ...supabaseHttp],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...supabaseHttp, ...supabaseWs, ...(isDev ? ["ws:", "http:"] : [])],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    ...(isDev ? {} : { "upgrade-insecure-requests": [] }),
  };

  return Object.entries(directives)
    .map(([name, values]) => [name, ...values].join(" "))
    .join("; ");
}

/** One year. No `preload`: add it only once the domain is confirmed HTTPS-only. */
export const HSTS_VALUE = "max-age=31536000; includeSubDomains";
