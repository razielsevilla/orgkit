import { NextResponse } from "next/server";
import { setPendingInviteCookie } from "@/src/lib/auth/session-invite";
import { isValidInviteToken } from "@/src/lib/invites/tokens";

interface RouteContext {
  params: Promise<{ token: string }>;
}

/**
 * The invite page cannot set cookies while it renders, so the cookie that
 * remembers the invite across Google sign-in is set here instead.
 *
 * POST: called by the "Continue with Google" button right before sign-in.
 */
export async function POST(_request: Request, { params }: RouteContext) {
  const { token } = await params;
  if (!isValidInviteToken(token)) {
    return new NextResponse(null, { status: 400 });
  }

  await setPendingInviteCookie(token);
  return new NextResponse(null, { status: 204 });
}

/**
 * GET: for a signed-in visitor who has not agreed to the privacy notice yet.
 * Remembers the invite, then sends them to the consent screen.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const { token } = await params;
  const requestUrl = new URL(request.url);

  if (!isValidInviteToken(token)) {
    return NextResponse.redirect(new URL("/signin", requestUrl.origin));
  }

  await setPendingInviteCookie(token);
  return NextResponse.redirect(new URL("/consent", requestUrl.origin));
}
