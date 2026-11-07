import { vi } from "vitest";

// connection() only works inside a Next.js request. Server Actions call it
// through getSessionUser(), so outside a request it would throw and every
// action would fall into its generic "failed" result. Tests have no request, so
// it resolves immediately here. NextResponse and the rest stay real.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}));
