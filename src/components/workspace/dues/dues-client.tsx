"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Link as LinkIcon, SlidersHorizontal, Lock } from "lucide-react";
import type { DuesPeriod } from "@/src/app/(workspace)/dues-actions";
import {
  createDuesPeriod,
  updateDuesPeriod,
  closeDuesPeriod,
  getDuesDashboardData,
} from "@/src/app/(workspace)/dues-actions";
import type { DuesDashboardData, DuesStatusFilter } from "@/src/lib/dues/dues-dashboard";
import { DUES_PAGE_SIZE } from "@/src/lib/dues/dues-dashboard";
import { DuesHeader } from "./dues-header";
import { DuesEmptyState } from "./dues-empty-state";
import { DuesPeriodDialog } from "./dues-period-dialog";
import { ClosePeriodDialog } from "./close-period-dialog";
import { DuesPayLinkDialog } from "./dues-pay-link-dialog";
import { DuesReviewDialog } from "./dues-review-dialog";
import { DuesPeriodPicker } from "./dues-period-picker";
import { DuesSummaryTiles } from "./dues-summary-tiles";
import { DuesSearchFilter } from "./dues-search-filter";
import { DuesMemberTable } from "./dues-member-table";
import { DuesMemberMobileCard } from "./dues-member-mobile-card";
import { DuesMemberPager } from "./dues-member-pager";
import { DuesDashboardSkeleton } from "./dues-dashboard-skeleton";
import { DuesDashboardError } from "./dues-dashboard-error";
import { DuesDashboardEmpty } from "./dues-dashboard-empty";
import { FloatingIconsDecor } from "@/src/components/decor/floating-decor";

interface DuesClientProps {
  rawId: string;
  initialPeriods: DuesPeriod[];
  initialDashboardData?: DuesDashboardData | null;
  siteUrl?: string | null;
}

export function DuesClient({
  rawId,
  initialPeriods,
  initialDashboardData = null,
  siteUrl,
}: DuesClientProps) {
  const [periods, setPeriods] = useState<DuesPeriod[]>(initialPeriods);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(
    initialDashboardData?.period.id ||
      initialPeriods.find((p) => p.status === "open")?.id ||
      initialPeriods[0]?.id ||
      ""
  );

  // Dashboard state
  const [dashboardData, setDashboardData] = useState<DuesDashboardData | null>(
    initialDashboardData
  );
  const [isLoadingDashboard, setIsLoadingDashboard] = useState<boolean>(
    Boolean(initialPeriods.length && !initialDashboardData)
  );
  const [isPaging, setIsPaging] = useState<boolean>(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Filter & Pagination state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<DuesStatusFilter>("all");
  const [page, setPage] = useState<number>(1);

  // Dialogs state
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<DuesPeriod | null>(null);
  const [closingPeriod, setClosingPeriod] = useState<DuesPeriod | null>(null);
  const [payLinkPeriod, setPayLinkPeriod] = useState<DuesPeriod | null>(null);
  const [reviewPeriod, setReviewPeriod] = useState<DuesPeriod | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);

  const openCount = periods.filter((p) => p.status === "open").length;
  const currentSelectedPeriod = periods.find((p) => p.id === selectedPeriodId) || periods[0];

  const reqIdRef = useRef(0);

  // Fetch dashboard data
  const fetchDashboard = useCallback(
    async (targetPage = page, isPageChange = false) => {
      if (!selectedPeriodId) return;

      const reqId = ++reqIdRef.current;
      if (isPageChange) {
        setIsPaging(true);
      } else {
        setIsLoadingDashboard(true);
      }
      setDashboardError(null);

      const res = await getDuesDashboardData(rawId, {
        periodId: selectedPeriodId,
        search: searchQuery,
        status: statusFilter,
        page: targetPage,
        pageSize: DUES_PAGE_SIZE,
      });

      if (reqId !== reqIdRef.current) return;

      setIsLoadingDashboard(false);
      setIsPaging(false);

      if (res.success && res.data) {
        setDashboardData(res.data);
      } else {
        setDashboardError(res.errorMessage || "Failed to load dashboard data.");
      }
    },
    [rawId, selectedPeriodId, searchQuery, statusFilter, page]
  );

  const isFirstMountRef = useRef(Boolean(initialDashboardData));

  // Initial and reactive load on filter / search / period changes
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    if (selectedPeriodId) {
      fetchDashboard(page, false);
    }
  }, [selectedPeriodId, searchQuery, statusFilter, page, fetchDashboard]);

  // Handle period switch
  const handleSelectPeriod = (newPeriodId: string) => {
    setSelectedPeriodId(newPeriodId);
    setSearchQuery("");
    setStatusFilter("all");
    setPage(1);
  };

  // Handle status tab click from summary tiles or tabs
  const handleStatusChange = (newStatus: DuesStatusFilter) => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  // Handle search query change
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleLinkUpdated = (
    periodId: string,
    payToken: string | null,
    payLinkActive: boolean
  ) => {
    setPeriods((prev) =>
      prev.map((p) =>
        p.id === periodId
          ? {
              ...p,
              payToken,
              payLinkActive,
              updatedAt: new Date().toISOString(),
            }
          : p
      )
    );
    if (payLinkPeriod && payLinkPeriod.id === periodId) {
      setPayLinkPeriod((prev) =>
        prev ? { ...prev, payToken, payLinkActive } : null
      );
    }
  };

  const handleCreateSave = async (input: {
    name: string;
    amount: number;
    dueOn: string;
  }) => {
    setToastError(null);
    const res = await createDuesPeriod(rawId, input);
    if (res.success && res.data) {
      const newPeriod: DuesPeriod = {
        id: res.data.id,
        orgId: rawId,
        name: input.name,
        amount: input.amount,
        dueOn: input.dueOn,
        status: "open",
        paymentCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setPeriods((prev) => [newPeriod, ...prev]);
      setSelectedPeriodId(newPeriod.id);
      return { success: true };
    }
    return {
      success: false,
      errorMessage: res.errorMessage || "Failed to create dues period.",
    };
  };

  const handleEditSave = async (input: {
    name: string;
    amount: number;
    dueOn: string;
  }) => {
    if (!editingPeriod) return { success: false };
    setToastError(null);

    const res = await updateDuesPeriod(rawId, editingPeriod.id, input);
    if (res.success) {
      setPeriods((prev) =>
        prev.map((p) =>
          p.id === editingPeriod.id
            ? {
                ...p,
                name: input.name,
                amount: input.amount,
                dueOn: input.dueOn,
                updatedAt: new Date().toISOString(),
              }
            : p
        )
      );
      fetchDashboard(page, false);
      return { success: true };
    }
    return {
      success: false,
      errorMessage: res.errorMessage || "Failed to update dues period.",
    };
  };

  const handleConfirmClose = async (periodId: string) => {
    setToastError(null);
    const res = await closeDuesPeriod(rawId, periodId);
    if (res.success) {
      setPeriods((prev) =>
        prev.map((p) =>
          p.id === periodId
            ? { ...p, status: "closed", updatedAt: new Date().toISOString() }
            : p
        )
      );
      fetchDashboard(page, false);
      return { success: true };
    }
    return {
      success: false,
      errorMessage: res.errorMessage || "Failed to close dues period.",
    };
  };

  // When returning from review queue dialog, refresh dashboard
  const handleReviewClose = () => {
    setReviewPeriod(null);
    fetchDashboard(page, false);
  };

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
      <style>{`
        .orgkit-dues-desktop {
          display: block !important;
          width: 100%;
        }
        .orgkit-dues-mobile {
          display: none !important;
          width: 100%;
        }
        @media (max-width: 640px) {
          .orgkit-dues-desktop {
            display: none !important;
          }
          .orgkit-dues-mobile {
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
          }
        }
      `}</style>

      <div
        className="orgkit-dues-shell"
        style={{
          width: "100%",
          maxWidth: 960,
          margin: "0 auto",
          position: "relative",
          animation: "cardPopout 0.45s cubic-bezier(0.16, 1.25, 0.38, 1) both",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <DuesHeader
          totalCount={periods.length}
          openCount={openCount}
          onCreatePeriod={() => setIsNewDialogOpen(true)}
        />

        {toastError && (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              backgroundColor: "color-mix(in srgb, var(--color-danger) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--color-danger) 25%, transparent)",
              borderRadius: 10,
              color: "var(--color-danger-strong)",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{toastError}</span>
          </div>
        )}

        {/* ── Content Container with Floating Background Decor ── */}
        <div style={{ position: "relative", width: "100%" }}>
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 0,
            }}
          >
            <FloatingIconsDecor />
          </div>

          <div style={{ position: "relative", zIndex: 2, width: "100%" }}>
            {periods.length === 0 ? (
              <DuesEmptyState onCreatePeriod={() => setIsNewDialogOpen(true)} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Period Picker & Period Management Bar */}
                <DuesPeriodPicker
                  periods={periods}
                  selectedPeriodId={selectedPeriodId}
                  onSelectPeriod={handleSelectPeriod}
                  onCreatePeriod={() => setIsNewDialogOpen(true)}
                  disabled={isLoadingDashboard}
                />

                {/* Period Quick Action Toolbar */}
                {currentSelectedPeriod && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      flexWrap: "wrap",
                      gap: 10,
                      marginTop: -4,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setPayLinkPeriod(currentSelectedPeriod)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        height: 36,
                        padding: "0 16px",
                        borderRadius: 9999,
                        backgroundColor: "var(--color-surface)",
                        border: "1px solid var(--color-line)",
                        color: "var(--color-ink)",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        boxShadow: "0 1px 3px rgba(24, 24, 27, 0.04)",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(24, 24, 27, 0.08)";
                        e.currentTarget.style.borderColor = "var(--color-line-strong)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "none";
                        e.currentTarget.style.boxShadow = "0 1px 3px rgba(24, 24, 27, 0.04)";
                        e.currentTarget.style.borderColor = "var(--color-line)";
                      }}
                    >
                      <LinkIcon size={14} strokeWidth={2} />
                      Pay Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingPeriod(currentSelectedPeriod)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        height: 36,
                        padding: "0 16px",
                        borderRadius: 9999,
                        backgroundColor: "var(--color-surface)",
                        border: "1px solid var(--color-line)",
                        color: "var(--color-ink)",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        boxShadow: "0 1px 3px rgba(24, 24, 27, 0.04)",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(24, 24, 27, 0.08)";
                        e.currentTarget.style.borderColor = "var(--color-line-strong)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "none";
                        e.currentTarget.style.boxShadow = "0 1px 3px rgba(24, 24, 27, 0.04)";
                        e.currentTarget.style.borderColor = "var(--color-line)";
                      }}
                    >
                      <SlidersHorizontal size={14} strokeWidth={2} />
                      Edit
                    </button>
                    {currentSelectedPeriod.status === "open" && (
                      <button
                        type="button"
                        onClick={() => setClosingPeriod(currentSelectedPeriod)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          height: 36,
                          padding: "0 16px",
                          borderRadius: 9999,
                          backgroundColor: "var(--color-danger-soft)",
                          border: "1px solid var(--color-danger-line)",
                          color: "var(--color-danger-strong)",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          boxShadow: "0 1px 3px rgba(220, 38, 38, 0.06)",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(220, 38, 38, 0.15)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "none";
                          e.currentTarget.style.boxShadow = "0 1px 3px rgba(220, 38, 38, 0.06)";
                        }}
                      >
                        <Lock size={14} strokeWidth={2} />
                        Close Period
                      </button>
                    )}
                  </div>
                )}

                {/* Error State with Retry */}
                {dashboardError && (
                  <DuesDashboardError
                    message={dashboardError}
                    onRetry={() => fetchDashboard(page, false)}
                    isRetrying={isLoadingDashboard}
                  />
                )}

                {/* Loading Skeleton */}
                {isLoadingDashboard && !dashboardData && (
                  <DuesDashboardSkeleton rowCount={5} />
                )}

                {/* Loaded Dashboard Content */}
                {dashboardData && !dashboardError && (
                  <div id="dues-members-panel">
                    {/* Summary Tiles */}
                    <DuesSummaryTiles
                      summary={dashboardData.summary}
                      activeStatusFilter={statusFilter}
                      onSelectStatusFilter={handleStatusChange}
                      onOpenReviewQueue={() => setReviewPeriod(currentSelectedPeriod)}
                    />

                    {/* Status Tabs and Search Filter */}
                    <DuesSearchFilter
                      searchQuery={searchQuery}
                      onSearchChange={handleSearchChange}
                      statusFilter={statusFilter}
                      onStatusChange={handleStatusChange}
                      summary={dashboardData.summary}
                      disabled={isLoadingDashboard || isPaging}
                    />

                    {/* Member Records List */}
                    {dashboardData.summary.activeMemberCount === 0 &&
                    dashboardData.summary.totalMemberCount === 0 ? (
                      <div
                        style={{
                          width: "100%",
                          backgroundColor: "var(--color-surface)",
                          border: "1px solid var(--color-line)",
                          borderRadius: 14,
                          overflow: "hidden",
                        }}
                      >
                        <DuesDashboardEmpty type="no_members" />
                      </div>
                    ) : (
                      <>
                        {/* Desktop Table */}
                        <div className="orgkit-dues-desktop">
                          <DuesMemberTable
                            members={dashboardData.members}
                            page={dashboardData.pagination.page}
                            pageSize={dashboardData.pagination.pageSize}
                            totalMatching={dashboardData.pagination.totalMatching}
                            totalPages={dashboardData.pagination.totalPages}
                            onPageChange={handlePageChange}
                            isPaging={isPaging}
                            searchQuery={searchQuery}
                            onClearFilters={() => {
                              setSearchQuery("");
                              setStatusFilter("all");
                              setPage(1);
                            }}
                          />
                        </div>

                        {/* Mobile Cards (360px viewport optimized) */}
                        <div className="orgkit-dues-mobile">
                          {dashboardData.members.length === 0 ? (
                            <div
                              style={{
                                width: "100%",
                                backgroundColor: "var(--color-surface)",
                                border: "1px solid var(--color-line)",
                                borderRadius: 14,
                                overflow: "hidden",
                              }}
                            >
                              <DuesDashboardEmpty
                                type="no_results"
                                searchQuery={searchQuery}
                                onClearFilters={() => {
                                  setSearchQuery("");
                                  setStatusFilter("all");
                                  setPage(1);
                                }}
                              />
                            </div>
                          ) : (
                            <>
                              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {dashboardData.members.map((member) => (
                                  <DuesMemberMobileCard
                                    key={member.memberId}
                                    member={member}
                                  />
                                ))}
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: 12,
                                  marginTop: 8,
                                  padding: "14px 16px",
                                  backgroundColor: "var(--color-surface)",
                                  border: "1px solid var(--color-line)",
                                  borderRadius: 12,
                                }}
                              >
                                <span style={{ fontSize: 13, color: "var(--color-muted)" }}>
                                  Page {dashboardData.pagination.page} of{" "}
                                  {Math.max(1, dashboardData.pagination.totalPages)} (
                                  {dashboardData.pagination.totalMatching} matching)
                                </span>
                                <DuesMemberPager
                                  page={dashboardData.pagination.page}
                                  totalPages={dashboardData.pagination.totalPages}
                                  onPageChange={handlePageChange}
                                  disabled={isPaging}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Period Dialog */}
      <DuesPeriodDialog
        isOpen={isNewDialogOpen}
        onClose={() => setIsNewDialogOpen(false)}
        onSave={handleCreateSave}
      />

      {/* Edit Period Dialog */}
      <DuesPeriodDialog
        isOpen={Boolean(editingPeriod)}
        period={editingPeriod}
        onClose={() => setEditingPeriod(null)}
        onSave={handleEditSave}
      />

      {/* Close Period Confirmation Dialog */}
      <ClosePeriodDialog
        isOpen={Boolean(closingPeriod)}
        period={closingPeriod}
        onClose={() => setClosingPeriod(null)}
        onConfirmClose={handleConfirmClose}
      />

      {/* Payment Link Settings Dialog */}
      <DuesPayLinkDialog
        isOpen={Boolean(payLinkPeriod)}
        period={payLinkPeriod}
        siteUrl={siteUrl ?? null}
        orgId={rawId}
        onClose={() => setPayLinkPeriod(null)}
        onLinkUpdated={handleLinkUpdated}
      />

      {/* Payment Review Queue Dialog with Live Sync */}
      <DuesReviewDialog
        isOpen={Boolean(reviewPeriod)}
        period={reviewPeriod}
        orgId={rawId}
        onClose={handleReviewClose}
        onReviewed={() => fetchDashboard(page, false)}
      />
    </div>
  );
}
