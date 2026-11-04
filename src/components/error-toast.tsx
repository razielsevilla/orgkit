"use client";

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  createContext,
  useContext,
} from "react";
import { AlertCircle, X } from "lucide-react";

export type ErrorToastPosition = "bottom-right" | "bottom-left";

export interface ErrorToastProps {
  /** The error message to display. When null or empty, the toast is hidden. */
  message: string | null | undefined;
  /** Callback fired when the toast is dismissed by the user or timer. */
  onDismiss?: () => void;
  /** Toast placement on the screen. Defaults to "bottom-right". */
  position?: ErrorToastPosition;
  /** Milliseconds before auto-dismissing. Set to 0 to disable auto-dismiss. Default is 5000ms. */
  autoDismissMs?: number;
  /** Whether to trigger a subtle screen shake when an error appears. Default is true. */
  shake?: boolean;
  /** Optional title shown above the message. */
  title?: string;
}

/**
 * Triggers a subtle, haptic-like screen shake on document.body
 * while honoring accessibility reduced-motion preferences.
 */
function triggerScreenShake() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  // Respect reduced-motion preferences
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const body = document.body;
  body.classList.remove("orgkit-screen-shake");
  // Force reflow so animation restarts if triggered in rapid succession
  void body.offsetWidth;
  body.classList.add("orgkit-screen-shake");

  window.setTimeout(() => {
    body.classList.remove("orgkit-screen-shake");
  }, 450);
}

/**
 * Floating Error Toast Card.
 * Renders in the bottom corner of the viewport without pushing or distorting component layouts.
 * Features a subtle screen shake upon triggering and curved modern corners.
 */
export function ErrorToast({
  message,
  onDismiss,
  position = "bottom-right",
  autoDismissMs = 5000,
  shake = true,
  title,
}: ErrorToastProps) {
  const [visibleMessage, setVisibleMessage] = useState<string | null>(message || null);
  const [isExiting, setIsExiting] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const prevMessageRef = useRef<string | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleDismiss = useCallback(() => {
    clearTimer();
    setIsExiting(true);
    setTimeout(() => {
      setVisibleMessage(null);
      setIsExiting(false);
      onDismiss?.();
    }, 200);
  }, [clearTimer, onDismiss]);

  const startTimer = useCallback(() => {
    clearTimer();
    if (autoDismissMs > 0 && visibleMessage) {
      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, autoDismissMs);
    }
  }, [autoDismissMs, clearTimer, handleDismiss, visibleMessage]);

  useEffect(() => {
    if (message) {
      setVisibleMessage(message);
      setIsExiting(false);

      // Trigger slight screen shake if it's a new or updated error
      if (shake && message !== prevMessageRef.current) {
        triggerScreenShake();
      }
      prevMessageRef.current = message;
    } else {
      setVisibleMessage(null);
      prevMessageRef.current = null;
    }
  }, [message, shake]);

  useEffect(() => {
    if (visibleMessage) {
      startTimer();
    }
    return () => clearTimer();
  }, [visibleMessage, startTimer, clearTimer]);

  if (!visibleMessage) return null;

  const isBottomLeft = position === "bottom-left";

  return (
    <>
      <style>{`
        @keyframes orgkitScreenShake {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          15% { transform: translate(-3.5px, 1px) rotate(-0.15deg); }
          30% { transform: translate(3.5px, -1px) rotate(0.15deg); }
          45% { transform: translate(-2.5px, -0.5px) rotate(-0.1deg); }
          60% { transform: translate(2px, 0.5px) rotate(0.1deg); }
          75% { transform: translate(-1px, 0) rotate(0deg); }
        }

        body.orgkit-screen-shake {
          animation: orgkitScreenShake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }

        @keyframes orgkitToastSlideUp {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.96);
          }
          65% {
            opacity: 1;
            transform: translateY(-2px) scale(1.01);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes orgkitToastSlideDown {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(16px) scale(0.96);
          }
        }

        .orgkit-error-toast-enter {
          animation: orgkitToastSlideUp 0.28s cubic-bezier(0.16, 1.25, 0.38, 1) both;
        }

        .orgkit-error-toast-exit {
          animation: orgkitToastSlideDown 0.2s cubic-bezier(0.4, 0, 1, 1) both;
        }

        @media (prefers-reduced-motion: reduce) {
          body.orgkit-screen-shake {
            animation: none !important;
          }
          .orgkit-error-toast-enter,
          .orgkit-error-toast-exit {
            animation-duration: 0.01ms !important;
          }
        }
      `}</style>

      <div
        role="alert"
        aria-live="assertive"
        className={isExiting ? "orgkit-error-toast-exit" : "orgkit-error-toast-enter"}
        onMouseEnter={clearTimer}
        onMouseLeave={startTimer}
        style={{
          position: "fixed",
          bottom: 24,
          ...(isBottomLeft ? { left: 24 } : { right: 24 }),
          zIndex: 99999,
          width: "calc(100vw - 48px)",
          maxWidth: 420,
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-danger-line)",
          borderRadius: 16,
          boxShadow: "0 16px 40px -6px rgba(24, 24, 27, 0.14), 0 4px 12px -2px rgba(220, 38, 38, 0.10)",
          padding: "14px 16px",
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          boxSizing: "border-box",
          pointerEvents: "auto",
        }}
      >
        {/* Soft danger badge with alert icon */}
        <div
          style={{
            width: 32,
            height: 32,
            minWidth: 32,
            borderRadius: 10,
            backgroundColor: "var(--color-danger-soft)",
            color: "var(--color-danger)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: 1,
          }}
        >
          <AlertCircle size={18} strokeWidth={2.2} />
        </div>

        {/* Message content */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          {title && (
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--color-ink)",
                lineHeight: 1.3,
                letterSpacing: "-0.01em",
              }}
            >
              {title}
            </span>
          )}
          <span
            style={{
              fontSize: 13,
              lineHeight: 1.45,
              color: "var(--color-ink-soft)",
              wordBreak: "break-word",
            }}
          >
            {visibleMessage}
          </span>
        </div>

        {/* Dismiss button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss error"
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            border: "none",
            backgroundColor: "transparent",
            color: "var(--color-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            transition: "all 0.15s ease",
            padding: 0,
            marginTop: 2,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--color-base)";
            e.currentTarget.style.color = "var(--color-ink)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "var(--color-muted)";
          }}
        >
          <X size={15} strokeWidth={2} />
        </button>
      </div>
    </>
  );
}

// ─── Optional Context & Hook for Imperative Error Toasts ───────────────────

interface ErrorToastContextType {
  showError: (message: string, options?: Partial<ErrorToastProps>) => void;
  clearError: () => void;
}

const ErrorToastContext = createContext<ErrorToastContextType | null>(null);

export function ErrorToastProvider({ children }: { children: React.ReactNode }) {
  const [toastState, setToastState] = useState<{
    message: string | null;
    options?: Partial<ErrorToastProps>;
  }>({ message: null });

  const showError = useCallback((message: string, options?: Partial<ErrorToastProps>) => {
    setToastState({ message, options });
  }, []);

  const clearError = useCallback(() => {
    setToastState((prev) => (prev.message ? { ...prev, message: null } : prev));
  }, []);

  return (
    <ErrorToastContext.Provider value={{ showError, clearError }}>
      {children}
      <ErrorToast
        message={toastState.message}
        onDismiss={clearError}
        {...toastState.options}
      />
    </ErrorToastContext.Provider>
  );
}

export function useErrorToast() {
  const context = useContext(ErrorToastContext);
  if (!context) {
    throw new Error("useErrorToast must be used within an ErrorToastProvider");
  }
  return context;
}

