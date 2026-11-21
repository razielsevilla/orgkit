import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeState {
  allowAttempt: boolean;
  rpcCalls: { fn: string; args: Record<string, unknown> }[];
  rpcResponses: Record<string, { data?: unknown; error?: { message: string } | null }>;
  uploadedFiles: { path: string; buffer: Buffer; contentType?: string }[];
  removedFiles: string[][];
  /** What the fake storage answers to remove(): defaults to success */
  removeError: { message: string } | null;
  removeThrows: boolean;
}

const state: FakeState = {
  allowAttempt: true,
  rpcCalls: [],
  rpcResponses: {},
  uploadedFiles: [],
  removedFiles: [],
  removeError: null,
  removeThrows: false,
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
          if (state.removeThrows) throw new Error("storage unreachable");
          return { error: state.removeError };
        },
      }),
    },
  }),
}));

const { submitDuesPayment } = await import("../../src/app/pay/[token]/actions");
const { DUES_PAY_MESSAGES } = await import("@/src/lib/dues/dues-pay");

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
  state.removeError = null;
  state.removeThrows = false;
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

  it("logs an unexpected database error without the member's email, and shows only the generic message", async () => {
    state.rpcResponses["submit_dues_payment"] = {
      data: null,
      error: {
        message: "duplicate key value violates unique constraint",
        // Postgres puts the offending row in details
        details: "Key (email_key)=(student@school.edu) already exists.",
        code: "23505",
      } as { message: string },
    };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await submitDuesPayment(VALID_TOKEN, { status: "idle" }, createMockFormData());

      expect(res.status).toBe("error");
      expect(res.formError).toBeDefined();
      expect(res.formError).not.toContain("duplicate key");
      expect(state.removedFiles.length).toBe(1);

      const lines = spy.mock.calls.map(([line]) => String(line));
      expect(lines).toHaveLength(1);
      expect(JSON.parse(lines[0])).toMatchObject({
        level: "error",
        event: "rpc.call_failed",
        context: {
          rpc: "submit_dues_payment",
          orgId: ORG_ID,
          periodId: PERIOD_ID,
          error: { code: "23505" },
        },
      });
      expect(lines[0]).not.toContain("student@school.edu");
      // nor the pay token the request was made with
      expect(lines[0]).not.toContain(VALID_TOKEN);
    } finally {
      spy.mockRestore();
    }
  });
});

describe("submitDuesPayment: database refusals", () => {
  const refuse = (message: string, extra: Record<string, unknown> = {}) => {
    state.rpcResponses["submit_dues_payment"] = {
      data: null,
      error: { message, ...extra } as { message: string },
    };
  };
  const submit = (language?: string) =>
    submitDuesPayment(VALID_TOKEN, { status: "idle" }, createMockFormData({ language }));
  const logged = (spy: { mock: { calls: unknown[][] } }) =>
    spy.mock.calls.map(([line]) => JSON.parse(String(line)));

  it("keeps the four named refusals exactly as they were, in both languages", async () => {
    for (const language of ["en", "fil"] as const) {
      const m = DUES_PAY_MESSAGES[language];
      refuse("already_submitted");
      expect(await submit(language)).toEqual({ status: "error", formError: m.alreadySubmitted });
      refuse("reference_already_used");
      expect(await submit(language)).toEqual({ status: "error", formError: m.referenceUsed });
      refuse("member_not_eligible");
      expect(await submit(language)).toEqual({ status: "error", formError: m.memberNotEligible });
      refuse("invalid_or_closed_period");
      expect(await submit(language)).toEqual({ status: "inactive" });
    }
  });

  it("answers a failure the database did not name with the generic save message, and logs it", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      refuse("invalid_reference_number");
      expect(await submit()).toEqual({ status: "error", formError: DUES_PAY_MESSAGES.en.saveFailed });
      const entries = logged(spy);
      expect(entries.map((e) => e.event)).toEqual(["rpc.call_failed"]);
      // the IDs of the org and period the submission was for, so the entry can be traced
      expect(entries[0].context).toMatchObject({ orgId: ORG_ID, periodId: PERIOD_ID });
    } finally {
      spy.mockRestore();
    }
  });

  describe("two submissions racing: the unique index stops the loser", () => {
    const violation = (index: string) =>
      refuse(`duplicate key value violates unique constraint "${index}"`, {
        code: "23505",
        details: "Key (period_id, member_id)=(p, m) already exists.",
      });

    it("one submission per member and period maps to already submitted", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        violation("dues_payments_active_member_period_idx");
        expect(await submit("en")).toEqual({
          status: "error",
          formError: DUES_PAY_MESSAGES.en.alreadySubmitted,
        });
        violation("dues_payments_active_member_period_idx");
        expect(await submit("fil")).toEqual({
          status: "error",
          formError: DUES_PAY_MESSAGES.fil.alreadySubmitted,
        });
        // it is a known outcome, not an unexpected failure
        expect(logged(spy)).toEqual([]);
        // and the uploaded screenshot was still removed
        expect(state.removedFiles).toHaveLength(2);
      } finally {
        spy.mockRestore();
      }
    });

    it("one payment per reference number maps to reference already used", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        violation("dues_payments_org_reference_key_idx");
        expect(await submit("en")).toEqual({
          status: "error",
          formError: DUES_PAY_MESSAGES.en.referenceUsed,
        });
        expect(logged(spy)).toEqual([]);
        expect(state.removedFiles).toHaveLength(1);
      } finally {
        spy.mockRestore();
      }
    });

    it("any other unique violation stays a generic failure and is logged", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        violation("some_other_unique_idx");
        expect(await submit()).toEqual({ status: "error", formError: DUES_PAY_MESSAGES.en.saveFailed });
        violation("dues_payments_pkey");
        expect(await submit()).toEqual({ status: "error", formError: DUES_PAY_MESSAGES.en.saveFailed });
        expect(logged(spy).map((e) => e.event)).toEqual(["rpc.call_failed", "rpc.call_failed"]);
      } finally {
        spy.mockRestore();
      }
    });

    it("does not map a message that only mentions an index name without being the violation", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        refuse("index dues_payments_active_member_period_idx is corrupted");
        expect(await submit()).toEqual({ status: "error", formError: DUES_PAY_MESSAGES.en.saveFailed });
        expect(logged(spy)).toHaveLength(1);
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe("removing the orphaned screenshot", () => {
    it("logs a failed removal with the path and IDs, and still shows the member the right message", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        state.removeError = { message: "bucket policy denied" };
        refuse("already_submitted");

        const res = await submit();

        expect(res).toEqual({ status: "error", formError: DUES_PAY_MESSAGES.en.alreadySubmitted });
        const entries = logged(spy);
        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({
          level: "error",
          event: "dues_pay.orphan_cleanup_failed",
          context: { orgId: ORG_ID, periodId: PERIOD_ID, error: { message: "bucket policy denied" } },
        });
        // the path is an org ID and a random ID: nothing about the member
        expect(entries[0].context.storagePath).toMatch(/^org-1111-2222\/[0-9a-f-]{36}\.png$/);
        const line = JSON.stringify(entries[0]);
        for (const personal of ["student@school.edu", "GCASH", "receipt.png", VALID_TOKEN]) {
          expect(line).not.toContain(personal);
        }
        // the path logged is the one that was uploaded and then asked to be removed
        expect(state.uploadedFiles[0].path).toBe(entries[0].context.storagePath);
        expect(state.removedFiles).toEqual([[entries[0].context.storagePath]]);
      } finally {
        spy.mockRestore();
      }
    });

    it("logs a removal that throws, and still shows the member the message for the real refusal", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        state.removeThrows = true;
        refuse("reference_already_used");

        const res = await submit();

        // before, a throwing cleanup replaced this with the generic message
        expect(res).toEqual({ status: "error", formError: DUES_PAY_MESSAGES.en.referenceUsed });
        const entries = logged(spy);
        expect(entries.map((e) => e.event)).toEqual(["dues_pay.orphan_cleanup_failed"]);
        expect(entries[0].context.error).toMatchObject({ name: "Error", message: "storage unreachable" });
      } finally {
        spy.mockRestore();
      }
    });

    it("logs nothing when the removal works", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        refuse("already_submitted");
        await submit();
        expect(logged(spy)).toEqual([]);
        expect(state.removedFiles).toHaveLength(1);
      } finally {
        spy.mockRestore();
      }
    });
  });
});
