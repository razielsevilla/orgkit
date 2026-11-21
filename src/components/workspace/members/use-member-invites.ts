"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getMemberInvites, type MemberInvitesData } from "@/src/app/(workspace)/member-invites-actions";
import { appendNewById } from "@/src/lib/members/roster-state";
import { ROUTES } from "@/src/lib/routes";

/**
 * The Invited view's data: the first page, then more on request. Only the
 * latest request may write its result, so a slow answer never overwrites a
 * newer one.
 */
export function useMemberInvites(orgId: string, notify: (message: string) => void) {
  const router = useRouter();
  const [invites, setInvites] = useState<MemberInvitesData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    setIsLoading(true);
    setError(null);

    const res = await getMemberInvites(orgId);
    if (request !== latestRequest.current) return;

    if (res.success && res.data) {
      setInvites(res.data);
    } else if (res.error === "not_authenticated") {
      router.push(ROUTES.signIn);
      return;
    } else {
      setError(res.errorMessage || "We couldn't load the invitations. Try again.");
    }
    setIsLoading(false);
  }, [orgId, router]);

  async function loadMore() {
    if (!invites || isLoadingMore || !invites.hasMore) return;

    const request = ++latestRequest.current;
    setIsLoadingMore(true);

    const res = await getMemberInvites(orgId, { offset: invites.invites.length });
    if (request !== latestRequest.current) return;

    if (res.success && res.data) {
      const page = res.data;
      setInvites((prev) => ({ ...page, invites: appendNewById(prev?.invites ?? [], page.invites) }));
    } else {
      notify(res.errorMessage || "We couldn't load more invitations. Try again.");
    }
    setIsLoadingMore(false);
  }

  return { invites, isLoading, isLoadingMore, error, load, loadMore };
}
