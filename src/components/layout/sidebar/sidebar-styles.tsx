export function SidebarStyles() {
  return (
    <style>{`
        .orgkit-sidebar-toggle:hover {
          background-color: var(--color-base) !important;
          color: var(--color-muted) !important;
        }
        .orgkit-nav-btn:hover {
          background-color: var(--color-base) !important;
          color: var(--color-ink) !important;
        }
        .orgkit-nav-item:not(.active):hover {
          background-color: var(--color-base) !important;
          color: var(--color-ink) !important;
        }
        .orgkit-profile-row:hover {
          background-color: var(--color-danger-soft) !important;
        }
      `}</style>
  );
}
