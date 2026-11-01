import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSessionExpired, SESSION_MAX_SECONDS } from "@/src/lib/session-config";

// Pages a signed-out visitor may open. Everything else needs a session.
const PUBLIC_PATHS = ["/", "/signin", "/register", "/privacy", "/terms"];

function isPublic(pathname: string) {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/")
  );
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
    {
      cookieOptions: {
        maxAge: SESSION_MAX_SECONDS,
        sameSite: "lax",
        path: "/",
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              maxAge: options?.maxAge ?? SESSION_MAX_SECONDS,
              sameSite: (options?.sameSite as "lax" | "strict" | "none") ?? "lax",
              path: options?.path ?? "/",
            })
          );
        },
      },
    }
  );

  // Validates the session with Supabase and refreshes it when needed
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Keep any refreshed or cleared session cookies on a redirect
  const redirectTo = (path: string) => {
    const redirectResponse = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  };

  if (user && isSessionExpired(user.last_sign_in_at)) {
    await supabase.auth.signOut();
    return redirectTo("/signin?error=session_expired");
  }

  if (!user && !isPublic(request.nextUrl.pathname)) {
    return redirectTo("/signin");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)"],
};
