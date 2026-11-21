import { plusJakarta } from "@/src/lib/fonts";
import { Navbar, type OfficerProfile } from "@/src/components/layout/navbar";
import {
  Card,
  CardHeader,
  CardBadge,
  CardTitle,
  CardDescription,
} from "@/src/components/ui/card";
import { ZeroScrollLock } from "@/src/components/ui/zero-scroll-lock";
import { GoToWorkspaceButton } from "./go-to-workspace-button";
import { ROUTES } from "@/src/lib/routes";

interface WorkspaceNotFoundProps {
  officer: OfficerProfile | null;
  /** Where "Go to my workspace" leads: the officer's own org, or the create screen */
  workspaceHref: string;
}

/**
 * Shown for an org that doesn't exist or that the officer isn't a member of.
 * The wording is the same for both, so it never confirms that an org exists.
 */
export function WorkspaceNotFound({ officer, workspaceHref }: WorkspaceNotFoundProps) {
  return (
    <div
      className={plusJakarta.className}
      style={{
        height: "100vh",
        width: "100%",
        overflow: "hidden",
        position: "relative",
        margin: 0,
        padding: 0,
        backgroundColor: "var(--color-base)",
        color: "var(--color-ink)",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <ZeroScrollLock />

      <Navbar officer={officer} logoHref={ROUTES.home} />

      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          boxSizing: "border-box",
        }}
      >
        <Card maxWidth={380} padding="36px 32px">
          <CardHeader style={{ marginBottom: 20 }}>
            <CardBadge size={66}>
              <svg
                style={{
                  width: 28,
                  height: 28,
                  display: "block",
                  color: "var(--color-accent)",
                }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="1.85"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <circle cx="11.5" cy="14" r="2.25" />
                <path d="m13.2 15.7 2.3 2.3" />
              </svg>
            </CardBadge>
            <CardTitle style={{ fontSize: 28, marginBottom: 8 }}>
              We can’t find that page.
            </CardTitle>
            <CardDescription style={{ maxWidth: 300 }}>
              It may not exist, or you may not have access to it.
            </CardDescription>
          </CardHeader>
          <div style={{ textAlign: "center", width: "100%" }}>
            <GoToWorkspaceButton href={workspaceHref} />
          </div>
        </Card>
      </main>
    </div>
  );
}
