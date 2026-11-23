"use client";

import React, { useMemo, useState } from "react";
import { Search, FolderArchive } from "lucide-react";
import {
  DOCUMENT_CATEGORIES,
  type DocumentCategory,
} from "@/src/lib/documents/documents-validation";
import {
  getDocumentDownloadUrlAction,
  type WorkspaceDocument,
  type WorkspaceDocumentsData,
} from "@/src/app/(workspace)/documents-actions";
import { DocumentsStyles } from "./documents-styles";
import { DocumentsHeader } from "./documents-header";
import { DocumentsEmptyState } from "./documents-empty-state";
import { DocumentTable } from "./document-table";
import { DocumentMobileCard } from "./document-mobile-card";
import { AddFileDialog } from "./add-file-dialog";
import { AddLinkDialog } from "./add-link-dialog";
import { DeleteDocumentDialog } from "./delete-document-dialog";
import { FloatingIconsDecor } from "@/src/components/decor/floating-decor";

interface DocumentsClientProps {
  initialData: WorkspaceDocumentsData;
}

export function DocumentsClient({ initialData }: DocumentsClientProps) {
  const [documents, setDocuments] = useState<WorkspaceDocument[]>(initialData.documents);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedKind, setSelectedKind] = useState<string>("All");

  // Modals state
  const [isAddFileOpen, setIsAddFileOpen] = useState(false);
  const [isAddLinkOpen, setIsAddLinkOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<WorkspaceDocument | null>(null);

  // Download state
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Category filter
      if (selectedCategory !== "All" && doc.category !== selectedCategory) {
        return false;
      }
      // Kind filter
      if (selectedKind === "Files" && doc.kind !== "file") return false;
      if (selectedKind === "Links" && doc.kind !== "link") return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = doc.title.toLowerCase().includes(q);
        const matchCat = doc.category.toLowerCase().includes(q);
        const matchUrl = doc.url ? doc.url.toLowerCase().includes(q) : false;
        return matchTitle || matchCat || matchUrl;
      }

      return true;
    });
  }, [documents, selectedCategory, selectedKind, searchQuery]);

  const handleDownload = async (doc: WorkspaceDocument) => {
    if (doc.kind !== "file") return;
    setDownloadingId(doc.id);
    try {
      const res = await getDocumentDownloadUrlAction(initialData.orgId, doc.id);
      if (res.success && res.data?.signedUrl) {
        window.open(res.data.signedUrl, "_blank", "noopener,noreferrer");
      } else {
        alert(res.errorMessage || "Failed to download document.");
      }
    } catch {
      alert("Failed to download document.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDocumentAdded = (newDoc: WorkspaceDocument) => {
    setDocuments((prev) => [newDoc, ...prev]);
  };

  const handleDocumentDeleted = (deletedId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== deletedId));
  };

  const hasFiltersApplied =
    searchQuery.trim() !== "" || selectedCategory !== "All" || selectedKind !== "All";

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        padding: "36px clamp(16px, 4vw, 36px) 60px clamp(16px, 4vw, 36px)",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
      }}
    >
      <div
        className="orgkit-documents-shell"
        style={{
          width: "100%",
          maxWidth: 960,
          margin: "0 auto",
          position: "relative",
          animation: "cardPopout 0.45s cubic-bezier(0.16, 1.25, 0.38, 1) both",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <DocumentsStyles />

        {/* Header with Title and Add Action Buttons */}
        <DocumentsHeader
          orgName={initialData.orgName}
          totalDocuments={documents.length}
          onAddFile={() => setIsAddFileOpen(true)}
          onAddLink={() => setIsAddLinkOpen(true)}
        />

      {/* Filter and Search Bar */}
      {documents.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            {/* Search Input */}
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                flex: "1 1 240px",
                maxWidth: 360,
              }}
            >
              <Search
                size={16}
                color="var(--color-muted)"
                style={{ position: "absolute", left: 12, pointerEvents: "none" }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents or links..."
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 36px",
                  borderRadius: 12,
                  border: "1px solid var(--color-line)",
                  backgroundColor: "var(--color-surface)",
                  fontSize: 13.5,
                  color: "var(--color-ink)",
                  outline: "none",
                }}
              />
            </div>

            {/* Kind Switcher (All / Files / Links) */}
            <div
              style={{
                display: "inline-flex",
                backgroundColor: "var(--color-base)",
                padding: 3,
                borderRadius: 10,
                border: "1px solid var(--color-line)",
              }}
            >
              {["All", "Files", "Links"].map((kind) => {
                const isActive = selectedKind === kind;
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setSelectedKind(kind)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 7,
                      border: "none",
                      backgroundColor: isActive ? "var(--color-surface)" : "transparent",
                      color: isActive ? "var(--color-ink)" : "var(--color-muted-strong)",
                      fontSize: 12.5,
                      fontWeight: isActive ? 700 : 500,
                      cursor: "pointer",
                      boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {kind}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Tabs / Pills */}
          <div
            className="orgkit-documents-filter-bar"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
            }}
          >
            {["All", ...DOCUMENT_CATEGORIES].map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    border: `1px solid ${
                      isActive
                        ? "var(--color-accent)"
                        : "color-mix(in srgb, var(--color-line) 80%, transparent)"
                    }`,
                    backgroundColor: isActive
                      ? "color-mix(in srgb, var(--color-accent) 10%, transparent)"
                      : "var(--color-surface)",
                    color: isActive ? "var(--color-accent)" : "var(--color-muted-strong)",
                    fontSize: 12.5,
                    fontWeight: isActive ? 600 : 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Area: Empty State or Document List with Floating Decor */}
      <div style={{ position: "relative", width: "100%" }}>
        {/* Floating Icons Decor positioned behind the cards */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          <FloatingIconsDecor />
        </div>

        {/* Foreground Content & Cards */}
        <div style={{ position: "relative", zIndex: 2, width: "100%" }}>
          {documents.length === 0 ? (
            <DocumentsEmptyState
              onAddFile={() => setIsAddFileOpen(true)}
              onAddLink={() => setIsAddLinkOpen(true)}
            />
          ) : filteredDocuments.length === 0 ? (
            <DocumentsEmptyState
              isFiltered={true}
              onAddFile={() => setIsAddFileOpen(true)}
              onAddLink={() => setIsAddLinkOpen(true)}
              onClearFilter={() => {
                setSearchQuery("");
                setSelectedCategory("All");
                setSelectedKind("All");
              }}
            />
          ) : (
            <>
              {/* Desktop Table View */}
              <DocumentTable
                documents={filteredDocuments}
                onDownload={handleDownload}
                onDelete={(doc) => setDocToDelete(doc)}
                downloadingId={downloadingId}
              />

              {/* Mobile Cards View */}
              <div
                className="orgkit-documents-mobile-cards"
                style={{
                  display: "none",
                  flexDirection: "column",
                  gap: 12,
                  width: "100%",
                }}
              >
                {filteredDocuments.map((doc) => (
                  <DocumentMobileCard
                    key={doc.id}
                    document={doc}
                    onDownload={handleDownload}
                    onDelete={(d) => setDocToDelete(d)}
                    isDownloading={downloadingId === doc.id}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <AddFileDialog
        orgId={initialData.orgId}
        isOpen={isAddFileOpen}
        onClose={() => setIsAddFileOpen(false)}
        onSuccess={handleDocumentAdded}
      />

      <AddLinkDialog
        orgId={initialData.orgId}
        isOpen={isAddLinkOpen}
        onClose={() => setIsAddLinkOpen(false)}
        onSuccess={handleDocumentAdded}
      />

      <DeleteDocumentDialog
        orgId={initialData.orgId}
        document={docToDelete}
        isOpen={Boolean(docToDelete)}
        onClose={() => setDocToDelete(null)}
        onSuccess={handleDocumentDeleted}
      />
      </div>
    </div>
  );
}
