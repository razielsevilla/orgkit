"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getExportCount } from "@/src/app/(workspace)/members-actions";
import {
  DEFAULT_EXPORT_FIELDS,
  DEFAULT_EXPORT_STATUSES,
  type ExportFieldKey,
  type ExportStatus,
} from "@/src/lib/members/member-export";
import { ROUTES, membersExportPath } from "@/src/lib/routes";

export const EXPORT_ERROR = "We couldn't make your file. Try again.";

/** Reads the file name the server chose, falling back to a generic one. */
function fileNameFrom(res: Response): string {
  const header = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(header);
  return match?.[1] ?? "members.csv";
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before freeing the file
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * State for the export dialog: what is chosen, how many members that means,
 * and the download itself. The file is read fully into memory in the browser
 * before it is saved, so a failure part-way never leaves a partial file.
 */
export function useMemberExport(orgId: string, onDone: () => void) {
  const [fields, setFields] = useState<ExportFieldKey[]>(DEFAULT_EXPORT_FIELDS);
  const [statuses, setStatuses] = useState<ExportStatus[]>(DEFAULT_EXPORT_STATUSES);
  const [count, setCount] = useState<number | null>(null);
  const [countFailed, setCountFailed] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const countRequest = useRef(0);
  const exportRequest = useRef<AbortController | null>(null);

  // Count again whenever the statuses change; only the latest answer is used
  useEffect(() => {
    const mine = ++countRequest.current;
    // Resetting while a new count loads is the intended behavior here
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCount(null);
    setCountFailed(false);
    if (statuses.length === 0) {
      setCount(0);
      return;
    }
    getExportCount(orgId, statuses).then((res) => {
      if (mine !== countRequest.current) return;
      if (res.success && res.data) setCount(res.data.count);
      else setCountFailed(true);
    });
  }, [orgId, statuses]);

  // Leaving the dialog abandons an export in flight
  useEffect(() => () => exportRequest.current?.abort(), []);

  const toggleField = useCallback((key: ExportFieldKey) => {
    setError(null);
    setFields((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }, []);

  const toggleStatus = useCallback((status: ExportStatus) => {
    setError(null);
    setStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  }, []);

  const noFields = fields.length === 0;
  const noMembers = !noFields && count === 0;
  const canDownload = !noFields && !isExporting && count !== null && count > 0;

  const download = useCallback(async () => {
    if (!canDownload) return;
    setIsExporting(true);
    setError(null);
    const controller = new AbortController();
    exportRequest.current = controller;

    try {
      const res = await fetch(membersExportPath(orgId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields, statuses }),
        signal: controller.signal,
      });

      // Signed out: the proxy redirects to sign-in, so send the person there
      if (res.status === 401 || (res.redirected && new URL(res.url).pathname === ROUTES.signIn)) {
        window.location.assign(ROUTES.signIn);
        return;
      }

      if (!res.ok) {
        let message = EXPORT_ERROR;
        try {
          const json = (await res.json()) as { message?: string };
          if (res.status === 422 && json.message) message = json.message;
        } catch {
          // keep the generic message
        }
        setError(message);
        return;
      }

      // Throws if the stream breaks part-way, so nothing is saved
      const blob = await res.blob();
      saveBlob(blob, fileNameFrom(res));
      onDone();
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      setError(EXPORT_ERROR);
    } finally {
      setIsExporting(false);
    }
  }, [canDownload, orgId, fields, statuses, onDone]);

  return {
    fields,
    statuses,
    count,
    countFailed,
    isExporting,
    error,
    noFields,
    noMembers,
    canDownload,
    toggleField,
    toggleStatus,
    download,
  };
}
