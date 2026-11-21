"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type AuthErrorRender = (hasError: boolean) => React.ReactNode;

function ErrorTracker({
  manualError,
  children,
}: {
  manualError: string | null;
  children: AuthErrorRender;
}) {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const hasError = Boolean(manualError || urlError);

  return <>{children(hasError)}</>;
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
