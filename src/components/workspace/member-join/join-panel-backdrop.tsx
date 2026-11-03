// Background concentric circles, same as the workspace home
export function JoinPanelBackdrop() {
  return (
    <>
      <div
        aria-hidden
        style={{ position: "absolute", top: 0, left: 0, width: 320, height: 320, pointerEvents: "none" }}
      >
        <svg viewBox="0 0 320 320" fill="none" style={{ width: "100%", height: "100%" }}>
          <circle cx="0" cy="0" r="240" fill="color-mix(in srgb, var(--color-accent) 5%, transparent)" />
          <circle cx="0" cy="0" r="180" stroke="color-mix(in srgb, var(--color-accent) 12%, transparent)" strokeWidth="1.2" />
          <circle cx="0" cy="0" r="300" stroke="color-mix(in srgb, var(--color-accent) 8%, transparent)" strokeWidth="1.2" />
        </svg>
      </div>
      <div
        aria-hidden
        style={{ position: "absolute", bottom: 0, right: 0, width: 380, height: 380, pointerEvents: "none" }}
      >
        <svg viewBox="0 0 380 380" fill="none" style={{ width: "100%", height: "100%" }}>
          <circle cx="380" cy="380" r="320" stroke="color-mix(in srgb, var(--color-accent) 12%, transparent)" strokeWidth="1.2" />
          <circle cx="380" cy="380" r="240" stroke="color-mix(in srgb, var(--color-accent) 10%, transparent)" strokeWidth="1.2" />
          <circle cx="380" cy="380" r="160" stroke="color-mix(in srgb, var(--color-accent) 8%, transparent)" strokeWidth="1.2" />
        </svg>
      </div>
    </>
  );
}
