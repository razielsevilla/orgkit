import { createClient } from "@/src/lib/supabase/server";

/**
 * The Supabase client for the current request together with its signed-in
 * user, or null when nobody is signed in. getUser() asks Supabase to validate
 * the session, so the user is never taken from an unchecked cookie.
 */
export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}
