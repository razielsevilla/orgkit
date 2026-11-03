import { cache } from "react";
import { createClient } from "@/src/lib/supabase/server";

/**
 * The Supabase client for the current request together with its signed-in
 * user, or null when nobody is signed in. getUser() asks Supabase to validate
 * the session, so the user is never taken from an unchecked cookie.
 *
 * Memoized for the length of one request: the layout gate and the page each
 * ask for the user, and without this every ask is its own round trip to
 * Supabase Auth. It lasts only as long as the request, so a removed or
 * signed-out officer is still caught on their very next one.
 */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});
