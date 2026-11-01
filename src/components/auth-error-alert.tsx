"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export function getErrorMessage(errorParam: string | null): string | null {
  if (!errorParam) return null;
  switch (errorParam) {
    case "cancelled":
      return "Sign-in was cancelled. You can try again.";
    case "google_error":
      return "We couldn't reach Google. Please try again.";
    case "school_blocked":
      return "Your school account may not allow this app. Try a personal Google account, or ask your school's IT admin.";
    case "session_expired":
      return "Your session expired after 7 days. Please sign in again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export const AUTH_ERROR_MESSAGE_ID = "auth-error-message";

type AuthErrorRender = (hasError: boolean) => React.ReactNode;

// The error is shown to sighted users only as a red border on the control
// rendered by `children`; the message itself stays available to screen readers.
function ErrorTracker({
  manualError,
  children,
}: {
  manualError: string | null;
  children: AuthErrorRender;
}) {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const activeError = manualError || getErrorMessage(urlError);

  return (
    <>
      {activeError && (
        <div role="alert" id={AUTH_ERROR_MESSAGE_ID} className="sr-only">
          {activeError}
        </div>
      )}
      {children(!!activeError)}
    </>
  );
}

export function AuthErrorAlert({
  manualError,
  children,
}: {
  manualError: string | null;
  children: AuthErrorRender;
}) {
  return (
    <Suspense fallback={children(false)}>
      <ErrorTracker manualError={manualError}>{children}</ErrorTracker>
    </Suspense>
  );
}

