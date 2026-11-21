import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getServiceRoleKey, getSupabaseUrl } from "@/src/lib/supabase/env";

/**
 * Supabase client with the service-role key, which bypasses row level security.
 * Server only: the import above makes the build fail if a client component
 * ever pulls this file in, so the key cannot reach the browser.
 */
export function createAdminClient() {
  return createSupabaseClient(getSupabaseUrl(), getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
