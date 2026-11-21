import { GoogleLogo } from "@/src/components/auth/google-logo";

interface GoogleAuthButtonProps {
  /** "Sign in" or "Sign up": the button reads "<verb> with Google" */
  verb: string;
  loading: boolean;
  /** Draws the red error border (set by AuthErrorAlert) */
  hasError: boolean;
  onClick: () => void;
}

/**
 * The large "Sign in with Google" button on the sign-in and register cards.
 * Its look comes from the .orgkit-google-btn rules in AuthLayout.
 */
export function GoogleAuthButton({ verb, loading, hasError, onClick }: GoogleAuthButtonProps) {
  const label = `${verb} with Google`;

  return (
    <div
      style={{
        width: "100%",
        marginTop: "clamp(20px, 4.25vh, 40px)",
      }}
    >
      <button
        type="button"
        disabled={loading}
        onClick={onClick}
        className="orgkit-google-btn"
        data-error={hasError}
        aria-busy={loading}
        title={loading ? "Connecting to Google..." : label}
        style={{
          height: "clamp(52px, 7.65vh, 72px)",
          gap: "clamp(10px, 0.84vw, 14px)",
        }}
      >
        {loading ? (
          <svg
            className="orgkit-spinner"
            width={26}
            height={26}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" stroke="var(--color-line)" strokeWidth="3" />
            <path
              fill="var(--color-accent)"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <GoogleLogo size={36} />
        )}
        <span
          style={{
            fontSize: "clamp(17px, 1.44vw, 24px)",
            fontWeight: 500,
            color: "var(--color-ink)",
          }}
        >
          {loading ? "Signing in..." : label}
        </span>
      </button>
      <div className="sr-only" aria-live="polite">
        {loading ? "Connecting to Google, please wait..." : ""}
      </div>
    </div>
  );
}
