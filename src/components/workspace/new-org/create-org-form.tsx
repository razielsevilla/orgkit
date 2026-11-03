"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createWorkspace } from "@/src/app/(workspace)/actions";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/src/components/ui/card";
import { FloatingIconsDecor } from "@/src/components/decor/floating-decor";
import { ROUTES, workspacePath } from "@/src/lib/routes";

/** The "Set up your Organization" card: name and school fields and the create button. */
export function CreateOrgForm() {
  const router = useRouter();

  // Form field state for the workspace card
  const [orgName, setOrgName] = useState("");
  const [school, setSchool] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Blocks a second submit before state has re-rendered the disabled button
  const submittingRef = useRef(false);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setNameError(null);
    setSaveError(null);

    const cleanName = orgName.trim();
    if (!cleanName) {
      setNameError("Org name is required.");
      return;
    }
    if (cleanName.length < 2) {
      setNameError("Org name must be at least 2 characters.");
      return;
    }
    if (cleanName.length > 80) {
      setNameError("Org name cannot be longer than 80 characters.");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const res = await createWorkspace(cleanName, school);
      if (res.needsConsent) {
        router.push(ROUTES.consent);
        return;
      }
      if (res.success && res.orgId) {
        router.push(workspacePath(res.orgId));
        return;
      }
      if (res.existingOrgId) {
        router.push(workspacePath(res.existingOrgId));
        return;
      }
      submittingRef.current = false;
      if (res.fieldError) {
        setNameError(res.fieldError);
        setIsSubmitting(false);
        return;
      }
      if (res.error) {
        setSaveError(res.error);
        setIsSubmitting(false);
        return;
      }
    } catch {
      submittingRef.current = false;
      setSaveError("We couldn't create your workspace. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="orgkit-card-wrapper"
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 450,
        boxSizing: "border-box",
        animation: "cardPopout 0.45s cubic-bezier(0.16, 1.25, 0.38, 1) both",
      }}
    >
      {/* Reusable Floating Decor */}
      <FloatingIconsDecor />

      {/* Reusable Standalone Card Component */}
      <Card maxWidth={450} padding="32px 34px">
        <CardHeader style={{ marginBottom: 0 }}>
          <CardTitle style={{ fontSize: 26, marginBottom: 5 }}>
            Set up your Organization
          </CardTitle>
          <CardDescription style={{ fontSize: 14, marginBottom: 26 }}>
            Start by giving your organization a name.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleCreateSubmit} noValidate>
            {/* Field 1: Org name (required) */}
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="org-name"
                style={{
                  display: "block",
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "var(--color-ink)",
                  marginBottom: 7,
                }}
              >
                Organization Name
              </label>
              <input
                id="org-name"
                type="text"
                required
                value={orgName}
                onChange={(e) => {
                  setOrgName(e.target.value);
                  if (nameError) setNameError(null);
                  if (saveError) setSaveError(null);
                }}
                placeholder="e.g. Junior Marketing Association"
                className="orgkit-workspace-input"
                style={{
                  height: 46,
                  width: "100%",
                  borderRadius: 12,
                  border: nameError
                    ? "1px solid var(--color-danger)"
                    : "1px solid var(--color-line)",
                  backgroundColor: "var(--color-surface)",
                  padding: "0 14px",
                  fontSize: 14,
                  color: "var(--color-ink)",
                  boxSizing: "border-box",
                  outline: "none",
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                }}
              />
              {nameError && (
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--color-danger)",
                    fontWeight: 500,
                    margin: "6px 0 0 0",
                    textAlign: "left",
                  }}
                >
                  {nameError}
                </p>
              )}
            </div>

            {/* Field 2: School or community (Optional) */}
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 7,
                }}
              >
                <label
                  htmlFor="school-community"
                  style={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: "var(--color-ink)",
                  }}
                >
                  School or Community
                </label>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    borderRadius: 9999,
                    backgroundColor: "var(--color-base)",
                    padding: "2.5px 8px",
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--color-muted)",
                  }}
                >
                  Optional
                </span>
              </div>
              <input
                id="school-community"
                type="text"
                value={school}
                onChange={(e) => {
                  setSchool(e.target.value);
                  if (saveError) setSaveError(null);
                }}
                placeholder="e.g. Your school or community"
                className="orgkit-workspace-input"
                style={{
                  height: 46,
                  width: "100%",
                  borderRadius: 12,
                  border: "1px solid var(--color-line)",
                  backgroundColor: "var(--color-surface)",
                  padding: "0 14px",
                  fontSize: 14,
                  color: "var(--color-ink)",
                  boxSizing: "border-box",
                  outline: "none",
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                }}
              />
              <p
                style={{
                  fontSize: 11.5,
                  color: "var(--color-muted)",
                  margin: "7px 0 0 0",
                }}
              >
                Leave blank if your org isn&apos;t tied to one school.
              </p>
            </div>

            {/* Save Error Alert (Above Button) */}
            {saveError && (
              <div
                style={{
                  marginBottom: 16,
                  padding: "10px 14px",
                  borderRadius: 12,
                  backgroundColor: "color-mix(in srgb, var(--color-danger) 8%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--color-danger) 25%, transparent)",
                  color: "var(--color-danger)",
                  fontSize: 13,
                  fontWeight: 500,
                  textAlign: "left",
                }}
              >
                {saveError}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="orgkit-workspace-btn"
              style={{
                display: "flex",
                height: 46,
                width: "100%",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderRadius: 9999,
                backgroundColor: "var(--color-accent)",
                fontSize: 14.5,
                fontWeight: 600,
                color: "var(--color-on-accent)",
                border: "none",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.85 : 1,
                boxShadow: "0 2px 8px color-mix(in srgb, var(--color-accent) 20%, transparent)",
                transition: "all 0.15s ease",
              }}
            >
              {isSubmitting ? (
                <>
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      border: "2.5px solid rgba(255, 255, 255, 0.35)",
                      borderTopColor: "var(--color-surface)",
                      animation: "spin 0.6s linear infinite",
                    }}
                  />
                  <span>Creating…</span>
                </>
              ) : (
                "Create workspace"
              )}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
