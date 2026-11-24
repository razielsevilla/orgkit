"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { HandoverStyles } from "./handover-styles";
import { HandoverHeader } from "./handover-header";
import { HandoverSectionCard } from "./handover-section-card";
import { HandoverLinkedDocuments } from "./handover-linked-documents";
import { HandoverFinalizeDialog, HandoverReopenDialog } from "./handover-finalize-dialog";
import { FloatingIconsDecor } from "@/src/components/decor/floating-decor";
import {
  HANDOVER_SECTION_DEFINITIONS,
  calculateGuideCompleteness,
} from "@/src/lib/handover/handover-helpers";
import type {
  HandoverGuide,
  HandoverSectionKey,
  HandoverSectionsData,
  LinkedDocumentItem,
} from "@/src/lib/handover/handover-types";
import {
  saveHandoverGuideAction,
  setHandoverStatusAction,
} from "@/src/app/(workspace)/handover-actions";
import { handoverGuidePath } from "@/src/lib/routes";

interface HandoverClientProps {
  initialGuide: HandoverGuide;
  availableDocuments: LinkedDocumentItem[];
  isAdmin: boolean;
}

export function HandoverClient({
  initialGuide,
  availableDocuments,
  isAdmin,
}: HandoverClientProps) {
  const router = useRouter();
  const [guide, setGuide] = useState<HandoverGuide>(initialGuide);
  const [sections, setSections] = useState<HandoverSectionsData>(initialGuide.sections);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [isFinalizeOpen, setIsFinalizeOpen] = useState(false);
  const [isReopenOpen, setIsReopenOpen] = useState(false);

  const isReadOnly = !guide.canEdit;
  const completeness = calculateGuideCompleteness(sections);

  // Autosave debouncing timer ref
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedSectionsRef = useRef<string>(JSON.stringify(initialGuide.sections));

  const performSave = useCallback(
    async (currentSections: HandoverSectionsData) => {
      if (isReadOnly) return;
      setSaveStatus("saving");

      try {
        const res = await saveHandoverGuideAction(guide.orgId, {
          guideId: guide.id || undefined,
          roleTitle: guide.roleTitle,
          termId: guide.termId,
          sections: currentSections,
        });

        if (res.success) {
          lastSavedSectionsRef.current = JSON.stringify(currentSections);
          setSaveStatus("saved");
          if (!guide.id && res.data?.guideId) {
            setGuide((prev) => ({ ...prev, id: res.data!.guideId }));
            router.replace(handoverGuidePath(guide.orgId, res.data.guideId));
          }
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
      }
    },
    [guide.orgId, guide.id, guide.roleTitle, guide.termId, isReadOnly, router]
  );

  // Trigger debounced autosave on section edit
  const handleSectionChange = (key: HandoverSectionKey, value: string) => {
    if (isReadOnly) return;
    const nextSections = { ...sections, [key]: value };
    setSections(nextSections);
    setSaveStatus("idle");

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      if (JSON.stringify(nextSections) !== lastSavedSectionsRef.current) {
        performSave(nextSections);
      }
    }, 1500);
  };

  // Manual save handler
  const handleSaveManual = async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    setIsSavingManual(true);
    await performSave(sections);
    setIsSavingManual(false);
  };

  // Attach document handler
  const handleAttachDocument = (docId: string) => {
    if (isReadOnly) return;
    const currentIds = sections.linked_document_ids || [];
    if (!currentIds.includes(docId)) {
      const nextIds = [...currentIds, docId];
      const nextSections = { ...sections, linked_document_ids: nextIds };
      setSections(nextSections);

      const attachedDoc = availableDocuments.find((d) => d.id === docId);
      if (attachedDoc) {
        setGuide((prev) => ({
          ...prev,
          linkedDocuments: [...prev.linkedDocuments, attachedDoc],
        }));
      }

      performSave(nextSections);
    }
  };

  // Detach document handler
  const handleDetachDocument = (docId: string) => {
    if (isReadOnly) return;
    const nextIds = (sections.linked_document_ids || []).filter((id) => id !== docId);
    const nextSections = { ...sections, linked_document_ids: nextIds };
    setSections(nextSections);

    setGuide((prev) => ({
      ...prev,
      linkedDocuments: prev.linkedDocuments.filter((d) => d.id !== docId),
    }));

    performSave(nextSections);
  };

  // Mark as ready confirmation
  const handleConfirmFinalize = async () => {
    if (!guide.id) {
      await performSave(sections);
    }
    const targetId = guide.id;
    if (!targetId) return;

    const res = await setHandoverStatusAction(guide.orgId, {
      guideId: targetId,
      status: "ready",
    });

    if (res.success) {
      setGuide((prev) => ({
        ...prev,
        status: "ready",
        canEdit: false,
        canFinalize: false,
        canReopen: isAdmin,
      }));
      router.refresh();
    }
  };

  // Reopen confirmation
  const handleConfirmReopen = async () => {
    if (!guide.id) return;
    const res = await setHandoverStatusAction(guide.orgId, {
      guideId: guide.id,
      status: "draft",
    });

    if (res.success) {
      setGuide((prev) => ({
        ...prev,
        status: "draft",
        canEdit: true,
        canFinalize: true,
        canReopen: false,
      }));
      router.refresh();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100%",
        padding: "clamp(24px, 2.5vw, 36px) clamp(16px, 2.5vw, 32px)",
        maxWidth: 920,
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <HandoverStyles />

      {/* Floating Decorative Icons for brand consistency */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <HandoverHeader
          guide={guide}
          completeness={completeness}
          saveStatus={saveStatus}
          isSavingManual={isSavingManual}
          onSaveManual={handleSaveManual}
          onOpenFinalize={() => setIsFinalizeOpen(true)}
          onOpenReopen={() => setIsReopenOpen(true)}
        />

        {/* Section Accordions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
          {HANDOVER_SECTION_DEFINITIONS.map((def, idx) => (
            <HandoverSectionCard
              key={def.key}
              definition={def}
              content={sections[def.key] || ""}
              isReadOnly={isReadOnly}
              onChange={(val) => handleSectionChange(def.key, val)}
              defaultExpanded={idx === 0 || Boolean(sections[def.key])}
            />
          ))}
        </div>

        {/* Attached Documents Section */}
        <HandoverLinkedDocuments
          orgId={guide.orgId}
          linkedDocuments={guide.linkedDocuments}
          availableDocuments={availableDocuments}
          isReadOnly={isReadOnly}
          onAttachDocument={handleAttachDocument}
          onDetachDocument={handleDetachDocument}
        />
      </div>

      {/* Dialogs */}
      <HandoverFinalizeDialog
        isOpen={isFinalizeOpen}
        onClose={() => setIsFinalizeOpen(false)}
        onConfirm={handleConfirmFinalize}
        roleTitle={guide.roleTitle}
      />

      <HandoverReopenDialog
        isOpen={isReopenOpen}
        onClose={() => setIsReopenOpen(false)}
        onConfirm={handleConfirmReopen}
        roleTitle={guide.roleTitle}
      />
    </div>
  );
}
