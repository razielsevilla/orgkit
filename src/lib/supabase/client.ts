import { createBrowserClient } from "@supabase/ssr";
import { SESSION_MAX_SECONDS } from "@/src/lib/session-config";

function getSupabaseUrl(): string {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is missing. Check your .env.local and make sure to restart 'npm run dev'."
    );
  }
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url;
}

function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Check your .env.local and make sure to restart 'npm run dev'."
    );
  }
  return key;
}

export function createClient() {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  return createBrowserClient(url, anonKey, {
    cookieOptions: {
      maxAge: SESSION_MAX_SECONDS,
      sameSite: "lax",
      path: "/",
    },
  });
}
