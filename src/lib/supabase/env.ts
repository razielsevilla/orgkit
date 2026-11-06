/**
 * Supabase settings read from the environment, checked once here so a missing
 * value fails with a clear message instead of an obscure error later.
 * Server only: the browser client reads its own NEXT_PUBLIC_ values directly.
 */

export function getSupabaseUrl(): string {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing. Check your .env.local.");
  }
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url;
}

export function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Check your .env.local.");
  }
  return key;
}

export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing. Check your .env.local.");
  }
  return key;
}
