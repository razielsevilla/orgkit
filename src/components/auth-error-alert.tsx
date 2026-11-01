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
    default:
      return "Something went wrong. Please try again.";
  }
}

function ErrorTracker({
  manualError,
  align,
}: {
  manualError: string | null;
  align: "center" | "left";
}) {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const activeError = manualError || getErrorMessage(urlError);

  if (!activeError) return null;

  return (
    <div
      role="alert"
      style={{
        width: "100%",
        marginTop: "clamp(12px, 2vh, 20px)",
        padding: "10px 16px",
        borderRadius: 14,
        backgroundColor: "#FEF2F2",
        border: "1px solid #FCA5A5",
        color: "#991B1B",
        fontSize: "clamp(12.5px, 0.92vw, 14.5px)",
        lineHeight: 1.45,
        textAlign: align,
        fontWeight: 500,
        boxSizing: "border-box",
      }}
    >
      {activeError}
    </div>
  );
}

export function AuthErrorAlert({
  manualError,
  align = "center",
}: {
  manualError: string | null;
  align?: "center" | "left";
}) {
  return (
    <Suspense fallback={null}>
      <ErrorTracker manualError={manualError} align={align} />
    </Suspense>
  );
}

