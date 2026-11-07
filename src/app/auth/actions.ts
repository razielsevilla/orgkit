"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { ROUTES } from "@/src/lib/routes";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(ROUTES.signIn);
}
