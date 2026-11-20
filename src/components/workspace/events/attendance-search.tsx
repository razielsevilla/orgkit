"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2, Search, UserPlus, X } from "lucide-react";
import { searchAttendeeCandidatesAction } from "@/src/app/(workspace)/attendance-actions";
import { ATTENDANCE_MESSAGES, type AttendeeCandidate } from "@/src/lib/events/attendance-state";
import { normalizeSearchTerm } from "@/src/lib/members/member-search";
import { FIELD_RADIUS } from "@/src/components/workspace/members/member-table-layout";

const SEARCH_DEBOUNCE_MS = 250;

interface AttendanceSearchProps {
  orgId: string;
  eventId: string;
  /** Members already on the list, so a result never offers someone who is present */
  presentIds: ReadonlySet<string>;
  onAdd: (candidate: AttendeeCandidate) => void;
}

/** Search the active roster and add a member by hand */
export function AttendanceSearch({ orgId, eventId, presentIds, onAdd }: AttendanceSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AttendeeCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const latestRequest = useRef(0);

  const term = normalizeSearchTerm(query);

  useEffect(() => {
    const request = ++latestRequest.current;
    if (!term) return;

    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const res = await searchAttendeeCandidatesAction(orgId, eventId, term);
        if (request !== latestRequest.current) return;
        if (res.success && res.data) setResults(res.data);
        else setSearchError(res.errorMessage || ATTENDANCE_MESSAGES.searchFailed);
      } catch {
        if (request === latestRequest.current) setSearchError(ATTENDANCE_MESSAGES.searchFailed);
      } finally {
        if (request === latestRequest.current) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [term, orgId, eventId]);

  const visible = term ? results.filter((r) => !presentIds.has(r.id)) : [];

  function clear() {
    setQuery("");
    setResults([]);
    setSearchError(null);
    setSearching(false);
    inputRef.current?.focus();
  }

  function add(candidate: AttendeeCandidate) {
    onAdd(candidate);
    clear();
  }

  return (
    <div>
      <div style={{ position: "relative" }}>
        <Search
          size={16}
          aria-hidden="true"
          style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Add member: search by name or email"
          aria-label="Add member: search by name or email"
          autoComplete="off"
          style={{
            width: "100%",
            height: 42,
            boxSizing: "border-box",
            paddingLeft: 38,
            paddingRight: 38,
            borderRadius: FIELD_RADIUS,
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-line)",
            color: "var(--color-ink)",
            fontSize: 13.5,
            outline: "none",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--color-accent)";
            e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--color-accent) 15%, transparent)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--color-line)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              borderRadius: "50%",
              background: "transparent",
              color: "var(--color-muted)",
              cursor: "pointer",
            }}
          >
            <X size={15} aria-hidden="true" />
          </button>
        )}
      </div>

      {term && (
        <div
          style={{
            marginTop: 8,
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-line)",
            borderRadius: FIELD_RADIUS,
            overflow: "hidden",
          }}
        >
          {searching && visible.length === 0 ? (
            <div role="status" style={noteStyle}>
              <Loader2 size={14} aria-hidden="true" style={{ animation: "spin 1s linear infinite" }} />
              <span>Searching...</span>
            </div>
          ) : searchError ? (
            <div role="alert" style={{ ...noteStyle, color: "var(--color-danger-strong)" }}>
              {searchError}
            </div>
          ) : visible.length === 0 ? (
            <div role="status" style={noteStyle}>
              No active members to add match &ldquo;{term}&rdquo;.
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {visible.map((candidate, i) => (
                <li
                  key={candidate.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    borderTop: i === 0 ? "none" : "1px solid var(--color-line)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div title={candidate.fullName} style={{ ...ellipsis, fontSize: 14, fontWeight: 600, color: "var(--color-ink)" }}>
                      {candidate.fullName}
                    </div>
                    <div title={candidate.email} style={{ ...ellipsis, fontSize: 12.5, color: "var(--color-muted-strong)" }}>
                      {candidate.email}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => add(candidate)}
                    aria-label={`Add member ${candidate.fullName}`}
                    className="orgkit-btn-accent"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      flexShrink: 0,
                      minHeight: 36,
                      padding: "0 14px",
                      borderRadius: 9999,
                      border: "none",
                      backgroundColor: "var(--color-accent)",
                      color: "#FFFFFF",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    <UserPlus size={14} aria-hidden="true" />
                    <span>Add member</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

const noteStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "14px",
  fontSize: 13.5,
  color: "var(--color-muted-strong)",
};

const ellipsis: React.CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
