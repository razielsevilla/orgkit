"use client";

import React, { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  Calendar,
  Camera,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Lock,
  Upload,
  X,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/src/components/ui/card";
import {
  DUES_PAY_MESSAGES,
  MAX_SCREENSHOT_BYTES,
  ALLOWED_IMAGE_TYPES,
  type AllowedImageType,
  type DuesPayLanguage,
} from "@/src/lib/dues/dues-pay";
import { submitDuesPayment, type PayState } from "@/src/app/pay/[token]/actions";
import { formatDueDate, formatPesos } from "@/src/components/workspace/dues/dues-table";
import { PayInactiveView } from "./pay-inactive-view";
import { PaySuccessView } from "./pay-success-view";

const INITIAL_STATE: PayState = { status: "idle" };

interface PayFormProps {
  token: string;
  orgName: string;
  periodName: string;
  amount: number;
  dueOn: string;
}

export function PayForm({
  token,
  orgName,
  periodName,
  amount,
  dueOn,
}: PayFormProps) {
  const [state, formAction, pending] = useActionState(
    submitDuesPayment.bind(null, token),
    INITIAL_STATE
  );

  const [language, setLanguage] = useState<DuesPayLanguage>("en");
  const [email, setEmail] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const copy = DUES_PAY_MESSAGES[language];

  // Update object URL for image preview and clean up memory on unmount/change
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const files = e.target.files;
    if (!files || files.length === 0) {
      setSelectedFile(null);
      return;
    }
    const file = files[0];
    if (file.size > MAX_SCREENSHOT_BYTES) {
      setFileError(copy.screenshotTooLarge);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as AllowedImageType)) {
      setFileError(copy.screenshotInvalidType);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (state.status === "inactive") {
    return <PayInactiveView language={language} />;
  }

  if (state.status === "success" && state.submittedData) {
    return (
      <PaySuccessView
        language={language}
        referenceNo={state.submittedData.referenceNo}
        amount={state.submittedData.amount}
        orgName={state.submittedData.orgName}
        periodName={state.submittedData.periodName}
      />
    );
  }

  return (
    <Card
      maxWidth={460}
      padding="clamp(26px, 3.8vw, 36px) clamp(22px, 3vw, 32px)"
    >
      <form
        action={formAction}
        noValidate
        style={{ display: "flex", flexDirection: "column", gap: 18 }}
      >
        <input type="hidden" name="language" value={language} />

        <style>{`
          .pf-input:focus {
            outline: none;
            border-color: var(--color-accent) !important;
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 12%, transparent) !important;
          }
          .pf-submit:hover:not(:disabled) {
            background-color: var(--color-accent-strong) !important;
            box-shadow: 0 4px 14px color-mix(in srgb, var(--color-accent) 30%, transparent) !important;
          }
          .pf-dropzone:hover {
            border-color: var(--color-accent) !important;
            background-color: color-mix(in srgb, var(--color-accent) 4%, transparent) !important;
          }
        `}</style>

        {/* Top Header: Logo & Language Toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 2,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <Image
              src="/orgkit-text-logo.png"
              alt="OrgKit"
              width={112}
              height={34}
              priority
              style={{
                height: 28,
                width: "auto",
                display: "block",
                userSelect: "none",
              }}
            />
          </div>

          <div
            role="radiogroup"
            aria-label="Language"
            style={{
              display: "inline-flex",
              borderRadius: 999,
              padding: 3,
              backgroundColor: "var(--color-base)",
              border: "1px solid var(--color-line)",
            }}
          >
            {(["en", "fil"] as const).map((lang) => {
              const active = language === lang;
              return (
                <button
                  key={lang}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setLanguage(lang)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: active ? 700 : 500,
                    color: active ? "var(--color-ink)" : "var(--color-muted)",
                    backgroundColor: active ? "var(--color-surface)" : "transparent",
                    border: "none",
                    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {lang === "en" ? "EN" : "FIL"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Period details summary card */}
        <div
          style={{
            borderRadius: 14,
            border: "1px solid var(--color-line)",
            backgroundColor: "var(--color-base)",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "var(--color-muted)",
                  display: "block",
                  marginBottom: 2,
                }}
              >
                {orgName}
              </span>
              <h1
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--color-ink)",
                  margin: 0,
                  lineHeight: 1.25,
                }}
              >
                {periodName}
              </h1>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 11, color: "var(--color-muted)", display: "block" }}>
                {copy.amountLabel}
              </span>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "var(--color-accent-strong, var(--color-ink))",
                }}
              >
                {formatPesos(amount)}
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12.5,
              color: "var(--color-muted-strong)",
              borderTop: "1px solid var(--color-line)",
              paddingTop: 8,
            }}
          >
            <Calendar size={13} color="var(--color-muted)" />
            <span>
              {copy.dueOnLabel} {formatDueDate(dueOn)}
            </span>
          </div>
        </div>

        {/* Form-level error banner */}
        {state.formError && (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              padding: "11px 14px",
              backgroundColor: "color-mix(in srgb, var(--color-danger) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--color-danger) 25%, transparent)",
              borderRadius: 10,
              color: "var(--color-danger-strong)",
              fontSize: 13,
              lineHeight: 1.45,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{state.formError}</span>
          </div>
        )}

        {/* 1. Roster Email Field */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label
            htmlFor="pay-email"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--color-ink)",
            }}
          >
            {copy.emailLabel} <span style={{ color: "var(--color-danger)" }}>*</span>
          </label>
          <input
            id="pay-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={copy.emailPlaceholder}
            className="pf-input"
            style={{
              width: "100%",
              height: 42,
              padding: "0 12px",
              borderRadius: 10,
              border: `1px solid ${state.emailError ? "var(--color-danger)" : "var(--color-line)"}`,
              backgroundColor: "var(--color-surface)",
              fontSize: 14,
              color: "var(--color-ink)",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
          {state.emailError ? (
            <span role="alert" style={{ fontSize: 12, color: "var(--color-danger)" }}>
              {state.emailError}
            </span>
          ) : (
            <span style={{ fontSize: 11.5, color: "var(--color-muted)" }}>
              {copy.emailHint}
            </span>
          )}
        </div>

        {/* 2. GCash Reference Number Field */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label
            htmlFor="pay-reference"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--color-ink)",
            }}
          >
            {copy.referenceLabel} <span style={{ color: "var(--color-danger)" }}>*</span>
          </label>
          <input
            id="pay-reference"
            name="referenceNo"
            type="text"
            required
            value={referenceNo}
            onChange={(e) => setReferenceNo(e.target.value)}
            placeholder={copy.referencePlaceholder}
            className="pf-input"
            style={{
              width: "100%",
              height: 42,
              padding: "0 12px",
              borderRadius: 10,
              border: `1px solid ${state.referenceError ? "var(--color-danger)" : "var(--color-line)"}`,
              backgroundColor: "var(--color-surface)",
              fontSize: 14,
              color: "var(--color-ink)",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
          {state.referenceError ? (
            <span role="alert" style={{ fontSize: 12, color: "var(--color-danger)" }}>
              {state.referenceError}
            </span>
          ) : (
            <span style={{ fontSize: 11.5, color: "var(--color-muted)" }}>
              {copy.referenceHint}
            </span>
          )}
        </div>

        {/* 3. Screenshot Upload Field */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label
            htmlFor="pay-screenshot"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--color-ink)",
            }}
          >
            {copy.screenshotLabel} <span style={{ color: "var(--color-danger)" }}>*</span>
          </label>

          <input
            id="pay-screenshot"
            name="screenshot"
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          {!selectedFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="pf-dropzone"
              style={{
                borderRadius: 12,
                border: `1.5px dashed ${
                  state.screenshotError || fileError
                    ? "var(--color-danger)"
                    : "var(--color-line)"
                }`,
                backgroundColor: "var(--color-base)",
                padding: "20px 16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.15s ease",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-line)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--color-accent)",
                }}
              >
                <Camera size={20} />
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--color-ink)",
                }}
              >
                {copy.screenshotSelect}
              </span>
              <span style={{ fontSize: 11.5, color: "var(--color-muted)" }}>
                {copy.screenshotHint}
              </span>
            </div>
          ) : (
            /* Selected File Preview Box */
            <div
              style={{
                borderRadius: 12,
                border: "1px solid var(--color-line)",
                backgroundColor: "var(--color-base)",
                padding: "12px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Selected payment receipt preview"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 8,
                    objectFit: "cover",
                    border: "1px solid var(--color-line)",
                    flexShrink: 0,
                  }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--color-ink)",
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedFile.name}
                </span>
                <span style={{ fontSize: 11.5, color: "var(--color-muted)" }}>
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                aria-label="Remove screenshot"
                style={{
                  height: 32,
                  width: 32,
                  borderRadius: "50%",
                  border: "1px solid var(--color-line)",
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-muted-strong)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <X size={15} />
              </button>
            </div>
          )}

          {fileError ? (
            <span role="alert" style={{ fontSize: 12, color: "var(--color-danger)" }}>
              {fileError}
            </span>
          ) : state.screenshotError ? (
            <span role="alert" style={{ fontSize: 12, color: "var(--color-danger)" }}>
              {state.screenshotError}
            </span>
          ) : null}
        </div>

        {/* Privacy Note */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "10px 12px",
            borderRadius: 10,
            backgroundColor: "color-mix(in srgb, var(--color-base) 60%, transparent)",
            border: "1px solid var(--color-line)",
            fontSize: 12,
            color: "var(--color-muted-strong)",
            lineHeight: 1.4,
          }}
        >
          <Lock size={14} style={{ flexShrink: 0, marginTop: 2, color: "var(--color-muted)" }} />
          <span>{copy.privacyNotice}</span>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={pending}
          className="pf-submit"
          style={{
            width: "100%",
            height: 44,
            borderRadius: 12,
            backgroundColor: "var(--color-accent)",
            border: "none",
            color: "#ffffff",
            fontSize: 14.5,
            fontWeight: 700,
            cursor: pending ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginTop: 4,
            transition: "all 0.15s ease",
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>{copy.submitting}</span>
            </>
          ) : (
            <span>{copy.submit}</span>
          )}
        </button>
      </form>
    </Card>
  );
}
