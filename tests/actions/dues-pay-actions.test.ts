import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeState {
  allowAttempt: boolean;
  rpcCalls: { fn: string; args: Record<string, unknown> }[];
  rpcResponses: Record<string, { data?: unknown; error?: { message: string } | null }>;
  uploadedFiles: { path: string; buffer: Buffer; contentType?: string }[];
  removedFiles: string[][];
}

const state: FakeState = {
  allowAttempt: true,
  rpcCalls: [],
  rpcResponses: {},
  uploadedFiles: [],
  removedFiles: [],
};

vi.mock("@/src/lib/dues/dues-pay-server", () => ({
  allowPayAttempt: async () => state.allowAttempt,
}));

vi.mock("@/src/lib/supabase/service-role", () => ({
  createAdminClient: () => ({
    rpc: async (fn: string, args: Record<string, unknown>) => {
      state.rpcCalls.push({ fn, args });
      const resp = state.rpcResponses[fn];
      return resp || { data: null, error: null };
    },
    storage: {
      from: () => ({
        upload: async (path: string, buffer: Buffer, options?: { contentType?: string }) => {
          state.uploadedFiles.push({ path, buffer, contentType: options?.contentType });
          return { error: null };
        },
        remove: async (paths: string[]) => {
          state.removedFiles.push(paths);
          return { error: null };
        },
      }),
    },
  }),
}));

const { submitDuesPayment } = await import("@/src/app/pay/[token]/actions");

const VALID_TOKEN = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const ORG_ID = "org-1111-2222";
const PERIOD_ID = "period-3333-4444";

function createMockFormData(overrides: {
  email?: string;
  referenceNo?: string;
  file?: File | null;
  language?: string;
} = {}): FormData {
  const fd = new FormData();
  fd.append("email", overrides.email ?? "student@school.edu");
  fd.append("referenceNo", overrides.referenceNo ?? "GCASH-9876543210");
  fd.append("language", overrides.language ?? "en");

  if (overrides.file !== null) {
    const pngMagic = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const defaultFile =
      overrides.file ?? new File([pngMagic], "receipt.png", { type: "image/png" });
    fd.append("screenshot", defaultFile);
  }

  return fd;
}

beforeEach(() => {
  state.allowAttempt = true;
  state.rpcCalls = [];
  state.uploadedFiles = [];
  state.removedFiles = [];
  state.rpcResponses = {
    get_dues_pay_info: {
      data: [
        {
          org_id: ORG_ID,
          org_name: "Apex Society",
          period_id: PERIOD_ID,
          period_name: "Sem Dues 2026",
          amount: 250.0,
          due_on: "2026-12-15",
          pay_link_active: true,
          period_status: "open",
        },
      ],
      error: null,
    },
    submit_dues_payment: {
      data: "payment-uuid-1234",
      error: null,
    },
  };
});

describe("submitDuesPayment", () => {
  it("refuses submission when rate limit is exceeded", async () => {
    state.allowAttempt = false;
    const res = await submitDuesPayment(VALID_TOKEN, { status: "idle" }, createMockFormData());
    expect(res.status).toBe("error");
    expect(res.formError).toContain("Too many attempts");
    expect(state.rpcCalls.length).toBe(0);
  });

  it("returns inactive status when token is malformed", async () => {
    const res = await submitDuesPayment("invalid-token", { status: "idle" }, createMockFormData());
    expect(res.status).toBe("inactive");
    expect(state.rpcCalls.length).toBe(0);
  });

  it("validates invalid email and short reference inline", async () => {
    const fd = createMockFormData({
      email: "bad-email",
      referenceNo: "12", // less than 4 chars
    });
    const res = await submitDuesPayment(VALID_TOKEN, { status: "idle" }, fd);
    expect(res.status).toBe("error");
    expect(res.emailError).toBeDefined();
    expect(res.referenceError).toBeDefined();
    expect(state.uploadedFiles.length).toBe(0);
  });

  it("validates missing or invalid file format", async () => {
    const fdNoFile = createMockFormData({ file: null });
    const resNoFile = await submitDuesPayment(VALID_TOKEN, { status: "idle" }, fdNoFile);
    expect(resNoFile.status).toBe("error");
    expect(resNoFile.screenshotError).toContain("screenshot");

    const pdfFile = new File(["dummy-pdf-content"], "document.pdf", { type: "application/pdf" });
    const fdPdf = createMockFormData({ file: pdfFile });
    const resPdf = await submitDuesPayment(VALID_TOKEN, { status: "idle" }, fdPdf);
    expect(resPdf.status).toBe("error");
    expect(resPdf.screenshotError).toContain("JPEG, PNG, or WebP");
    expect(state.uploadedFiles.length).toBe(0);

    // File renamed to .png but containing plain text / non-image bytes
    const fakePng = new File(["not an image, just text content pretending to be png"], "fake.png", { type: "image/png" });
    const fdFake = createMockFormData({ file: fakePng });
    const resFake = await submitDuesPayment(VALID_TOKEN, { status: "idle" }, fdFake);
    expect(resFake.status).toBe("error");
    expect(resFake.screenshotError).toContain("JPEG, PNG, or WebP");
    expect(state.uploadedFiles.length).toBe(0);
  });

  it("returns inactive if dues period is closed or link is paused", async () => {
    state.rpcResponses["get_dues_pay_info"] = {
      data: [
        {
          org_id: ORG_ID,
          org_name: "Apex Society",
          period_id: PERIOD_ID,
          period_name: "Sem Dues 2026",
          amount: 250.0,
          due_on: "2026-12-15",
          pay_link_active: false, // paused
          period_status: "open",
        },
      ],
      error: null,
    };
    const res = await submitDuesPayment(VALID_TOKEN, { status: "idle" }, createMockFormData());
    expect(res.status).toBe("inactive");
    expect(state.uploadedFiles.length).toBe(0);
  });

  it("successfully uploads screenshot and submits payment on valid inputs", async () => {
    const res = await submitDuesPayment(VALID_TOKEN, { status: "idle" }, createMockFormData());
    expect(res.status).toBe("success");
    expect(res.submittedData).toEqual({
      referenceNo: "GCASH-9876543210",
      amount: 250.0,
      orgName: "Apex Society",
      periodName: "Sem Dues 2026",
    });

    // Verify storage upload occurred
    expect(state.uploadedFiles.length).toBe(1);
    expect(state.uploadedFiles[0].path).toMatch(new RegExp(`^${ORG_ID}/`));
    expect(state.uploadedFiles[0].contentType).toBe("image/png");

    // Verify RPC call occurred
    const rpc = state.rpcCalls.find((c) => c.fn === "submit_dues_payment");
    expect(rpc).toBeDefined();
    expect(rpc?.args.p_email).toBe("student@school.edu");
    expect(rpc?.args.p_reference_no).toBe("GCASH-9876543210");
  });

  it("cleans up storage file if RPC fails with already_submitted", async () => {
    state.rpcResponses["submit_dues_payment"] = {
      data: null,
      error: { message: "error: already_submitted" },
    };
    const res = await submitDuesPayment(VALID_TOKEN, { status: "idle" }, createMockFormData());
    expect(res.status).toBe("error");
    expect(res.formError).toContain("already have a submitted or verified payment");

    // Storage file must be deleted to prevent orphans
    expect(state.removedFiles.length).toBe(1);
    expect(state.removedFiles[0][0]).toBe(state.uploadedFiles[0].path);
  });

  it("cleans up storage file if reference is already used", async () => {
    state.rpcResponses["submit_dues_payment"] = {
      data: null,
      error: { message: "error: reference_already_used" },
    };
    const res = await submitDuesPayment(VALID_TOKEN, { status: "idle" }, createMockFormData());
    expect(res.status).toBe("error");
    expect(res.formError).toContain("reference number has already been used");
    expect(state.removedFiles.length).toBe(1);
  });

  it("cleans up storage file if member is not eligible or not on active roster", async () => {
    state.rpcResponses["submit_dues_payment"] = {
      data: null,
      error: { message: "error: member_not_eligible" },
    };
    const res = await submitDuesPayment(VALID_TOKEN, { status: "idle" }, createMockFormData());
    expect(res.status).toBe("error");
    expect(res.formError).toContain("email was not found on the active member roster");
    expect(state.removedFiles.length).toBe(1);
  });
});
