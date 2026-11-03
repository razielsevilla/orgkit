import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSessionExpired, SESSION_MAX_SECONDS } from "@/src/lib/session-config";
import { INVITE_COOKIE_NAME } from "@/src/lib/session-invite";
import { isValidInviteToken } from "@/src/lib/tokens";

// Pages a signed-out visitor may open. Everything else needs a session.
const PUBLIC_PATHS = ["/", "/signin", "/register", "/privacy", "/terms"];

function isPublic(pathname: string) {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/") ||
    // Member join links (A4): students open these with no account
    pathname.startsWith("/join/") ||
    pathname === "/invite" ||
    pathname.startsWith("/invite/")
  );
}

function rawPendingInviteCookie(request: NextRequest) {
  return request.cookies.has(INVITE_COOKIE_NAME);
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

  // If user is authenticated, enforce workspace assignment & 1 officer -> 1 org policy
  if (user) {
    const pathname = request.nextUrl.pathname;
    const rawPendingInvite = request.cookies.get(INVITE_COOKIE_NAME)?.value;
    const pendingInvite = isValidInviteToken(rawPendingInvite) ? rawPendingInvite : undefined;

    // Entry and create-workspace screens: an officer who already has an org goes
    // to it (one org per officer in v0.2); one without goes to the create screen.
    const isEntryOrCreate =
      pathname === "/" ||
      pathname === "/signin" ||
      pathname === "/register" ||
      pathname === "/orgs/new";

    if (isEntryOrCreate) {
      // As the signed-in officer, so row level security applies
      const { data: membership } = await supabase
        .from("org_officers")
        .select("org_id")
        .eq("officer_id", user.id)
        .order("joined_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (membership?.org_id) {
        return redirectTo(`/workspace/${membership.org_id}`);
      }

      // Ticket Conflict 5: An invitee has no org yet, so the invite must take priority over /orgs/new
      if (pendingInvite) {
        return redirectTo(`/invite/${pendingInvite}`);
      }

      if (pathname !== "/orgs/new") {
        return redirectTo("/orgs/new");
      }
    }
  }

  if (!user && !isPublic(request.nextUrl.pathname)) {
    return redirectTo("/signin");
  }

  // Once an officer is inside a workspace, the invite flow is over. Pages cannot
  // clear cookies while they render, so this is where the cookie is dropped.
  if (user && request.nextUrl.pathname.startsWith("/workspace/") && rawPendingInviteCookie(request)) {
    response.cookies.delete(INVITE_COOKIE_NAME);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)"],
};
