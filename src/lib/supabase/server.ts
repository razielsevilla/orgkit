import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SESSION_MAX_SECONDS } from "@/src/lib/session-config";

function getSupabaseUrl(): string {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing. Check your .env.local.");
  }
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url;
}

function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Check your .env.local.");
  }
  return key;
}

export async function createClient() {
  const cookieStore = await cookies();
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  return createServerClient(url, anonKey, {
    cookieOptions: {
      maxAge: SESSION_MAX_SECONDS,
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, {
              ...options,
              maxAge: options?.maxAge ?? SESSION_MAX_SECONDS,
              sameSite: (options?.sameSite as "lax" | "strict" | "none") ?? "lax",
              path: options?.path ?? "/",
            })
          );
        } catch {
          // The `setAll` method was called from a Server Component.
        }
      },
    },
  });
}
