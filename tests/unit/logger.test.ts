import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { REDACTED, logger } from "../../src/lib/logger.ts";

type Line = Record<string, unknown> & { context?: Record<string, unknown> };

describe("logger", () => {
  const env = process.env as Record<string, string | undefined>;
  const savedNodeEnv = env.NODE_ENV;
  let lines: { channel: "error" | "warn" | "info"; raw: string }[];

  beforeEach(() => {
    lines = [];
    for (const channel of ["error", "warn", "info"] as const) {
      mock.method(console, channel, (raw: unknown) => {
        lines.push({ channel, raw: String(raw) });
      });
    }
    env.NODE_ENV = "development";
  });

  afterEach(() => {
    mock.restoreAll();
    if (savedNodeEnv === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = savedNodeEnv;
  });

  const last = (): Line => JSON.parse(lines[lines.length - 1].raw) as Line;

  describe("shape", () => {
    it("writes one JSON line with timestamp, level, event, message and context", () => {
      logger.error("dues.reminder_log_failed", "Could not write the log", { periodId: "p1" });

      assert.equal(lines.length, 1);
      assert.ok(!lines[0].raw.includes("\n"));
      const line = last();
      assert.equal(line.level, "error");
      assert.equal(line.event, "dues.reminder_log_failed");
      assert.equal(line.message, "Could not write the log");
      assert.deepEqual(line.context, { periodId: "p1" });
      assert.equal(new Date(line.timestamp as string).toISOString(), line.timestamp);
    });

    it("accepts the context in place of the message, or neither", () => {
      logger.warn("a.b", { status: "late" });
      assert.deepEqual(last().context, { status: "late" });
      assert.ok(!("message" in last()));

      logger.info("a.c");
      assert.ok(!("message" in last()));
      assert.ok(!("context" in last()));
    });

    it("sends each level to its own console channel", () => {
      logger.error("e");
      logger.warn("w");
      logger.info("i");
      assert.deepEqual(
        lines.map((l) => l.channel),
        ["error", "warn", "info"]
      );
    });
  });

  describe("redaction", () => {
    it("replaces values under sensitive key names, ignoring case", () => {
      logger.error("x", {
        Email: "a@school.edu",
        recipient_email: "b@school.edu",
        fullName: "Ana Cruz",
        USER_NAME: "ana",
        phoneNumber: "0917",
        accessToken: "tok",
        client_secret: "s",
        Password: "pw",
        Authorization: "Bearer abc",
        "Set-Cookie": "sid=1",
        apiKey: "k",
        pinCode: "1234",
        clientIp: "203.0.113.7",
        screenshotPath: "org/file.png",
        requestBody: "raw",
      });
      const context = last().context!;
      assert.equal(Object.keys(context).length, 15);
      for (const [key, value] of Object.entries(context)) {
        assert.equal(value, REDACTED, `${key} should be redacted`);
      }
    });

    it("keeps IDs, statuses and codes", () => {
      logger.error("x", { orgId: "o1", periodId: "p1", memberId: "m1", status: "failed", code: "23505", count: 3 });
      assert.deepEqual(last().context, {
        orgId: "o1",
        periodId: "p1",
        memberId: "m1",
        status: "failed",
        code: "23505",
        count: 3,
      });
    });

    it("redacts at any depth, including inside arrays", () => {
      logger.error("x", {
        outer: { inner: { email: "a@school.edu", ok: 1 } },
        list: [{ name: "Ana", id: 1 }, { token: "t", id: 2 }],
      });
      assert.deepEqual(last().context, {
        outer: { inner: { email: REDACTED, ok: 1 } },
        list: [
          { name: REDACTED, id: 1 },
          { token: REDACTED, id: 2 },
        ],
      });
    });

    it("replaces a whole object or array under a sensitive key, whatever it holds", () => {
      logger.error("x", { cookies: [{ a: 1 }], signingKey: { deep: "value" } });
      assert.deepEqual(last().context, { cookies: REDACTED, signingKey: REDACTED });
    });

    it("redacts these key names", () => {
      const sensitive = [
        "userEmail",
        "memberName",
        "access_token",
        "apiKey",
        "x-api-key",
        "clientIp",
        "pinCode",
        "requestBody",
        // more spellings of the same words
        "clientIP",
        "IPAddress",
        "ip",
        "IP",
        "API_KEY",
        "key",
        "name",
        "full-name",
        "body",
        "phone",
        "mobilePhone",
        "pin",
        "ip2",
        "name1",
        "keys",
        "names",
        // long terms match anywhere in the key
        "emailKey",
        "resetTokenHash",
        "clientsecret",
        "oldPassword",
        "authorizationHeader",
        "setcookie",
        "screenshotPath",
      ];
      const context = Object.fromEntries(sensitive.map((key) => [key, "value"]));
      logger.error("x", context);
      for (const key of sensitive) {
        assert.equal(last().context![key], REDACTED, `${key} should be redacted`);
      }
    });

    it("does not redact these key names, which only contain a short term inside a longer word", () => {
      const harmless = [
        "skippedCount",
        "description",
        "keyword",
        "shipping",
        "spinner",
        // more of the same kind
        "recipientCount",
        "membership",
        "mapping",
        "pipeline",
        "monkey",
        "rename",
        "somebody",
        "telephone",
        "periodId",
        "orgId",
        "status",
        "code",
      ];
      const context = Object.fromEntries(harmless.map((key) => [key, "value"]));
      logger.error("x", context);
      for (const key of harmless) {
        assert.equal(last().context![key], "value", `${key} should be kept`);
      }
    });

    it("masks email addresses that appear inside ordinary strings", () => {
      logger.error("x", "Failed for nobody", {
        reason: "Key (email)=(ana.cruz@school.edu) already exists.",
      });
      const raw = lines[0].raw;
      assert.ok(!raw.includes("ana.cruz@school.edu"));
      assert.ok(raw.includes("already exists"));
    });

    it("masks an email address in the message too", () => {
      logger.error("x", "could not reach ana@school.edu");
      assert.ok(!lines[0].raw.includes("ana@school.edu"));
    });
  });

  describe("errors", () => {
    it("serializes an Error to name, message and (outside production) the stack", () => {
      logger.error("x", "failed", { error: new TypeError("bad thing") });
      const error = last().context!.error as Record<string, string>;
      assert.equal(error.name, "TypeError");
      assert.equal(error.message, "bad thing");
      assert.ok(error.stack.includes("TypeError"));
    });

    it("leaves the stack out in production", () => {
      env.NODE_ENV = "production";
      logger.error("x", "failed", { error: new Error("bad thing") });
      const error = last().context!.error as Record<string, string>;
      assert.equal(error.message, "bad thing");
      assert.ok(!("stack" in error));
      assert.ok(!lines[0].raw.includes("at "));
    });

    it("decides about the stack when it logs, not when the module loads", () => {
      env.NODE_ENV = "production";
      logger.error("x", { error: new Error("one") });
      assert.ok(!("stack" in (last().context!.error as object)));
      env.NODE_ENV = "development";
      logger.error("x", { error: new Error("two") });
      assert.ok("stack" in (last().context!.error as object));
    });

    it("keeps only code, message, details and hint of a database error", () => {
      const dbError = {
        message: "duplicate key value violates unique constraint",
        code: "23505",
        details: "Key (email_key)=(ana@school.edu) already exists.",
        hint: null,
        status: 409,
        statusText: "Conflict",
        url: "https://project.supabase.co/rest/v1/members?select=*",
        headers: { authorization: "Bearer secret-token", apikey: "service-key" },
        request: { body: "{\"email\":\"ana@school.edu\"}" },
      };
      logger.error("x", { error: dbError });
      const error = last().context!.error as Record<string, unknown>;

      assert.deepEqual(Object.keys(error).sort(), ["code", "details", "message"]);
      assert.equal(error.code, "23505");
      assert.ok(!lines[0].raw.includes("ana@school.edu"), "row value in details must be masked");
      for (const leaked of ["secret-token", "service-key", "project.supabase.co", "Conflict"]) {
        assert.ok(!lines[0].raw.includes(leaked), `${leaked} must not be logged`);
      }
    });

    describe("database error details", () => {
      const dbError = {
        message: "duplicate key value violates unique constraint",
        code: "23505",
        details: "Key (name_key)=(chess club) already exists.",
        hint: "Use a different name.",
      };

      it("keeps code, message, details and hint outside production", () => {
        env.NODE_ENV = "development";
        logger.error("x", { error: dbError });
        assert.deepEqual(last().context!.error, {
          message: dbError.message,
          code: "23505",
          details: dbError.details,
          hint: dbError.hint,
        });
      });

      it("still masks an email inside details outside production", () => {
        env.NODE_ENV = "development";
        logger.error("x", {
          error: { ...dbError, details: "Key (email_key)=(ana@school.edu) already exists." },
        });
        assert.ok(!lines[0].raw.includes("ana@school.edu"));
        assert.ok(lines[0].raw.includes("already exists"));
      });

      it("drops details in production and keeps code, message and hint", () => {
        env.NODE_ENV = "production";
        logger.error("x", { error: dbError });
        assert.deepEqual(last().context!.error, {
          message: dbError.message,
          code: "23505",
          hint: dbError.hint,
        });
        assert.ok(!lines[0].raw.includes("chess club"));
      });

      it("drops details in production for a real Error that carries them, too", () => {
        env.NODE_ENV = "production";
        class PostgrestLikeError extends Error {
          code = "23505";
          details = "Key (name_key)=(chess club) already exists.";
        }
        logger.error("x", { error: new PostgrestLikeError("duplicate") });
        const error = last().context!.error as Record<string, unknown>;
        assert.equal(error.code, "23505");
        assert.ok(!("details" in error));
        assert.ok(!lines[0].raw.includes("chess club"));
      });
    });

    it("does not log extra properties of an Error subclass", () => {
      class FetchError extends Error {
        code = "ECONN";
        config = { headers: { authorization: "Bearer abc123" } };
        response = { data: "private" };
      }
      logger.error("x", { error: new FetchError("network down") });
      const error = last().context!.error as Record<string, unknown>;
      assert.equal(error.code, "ECONN");
      assert.ok(!("config" in error));
      assert.ok(!lines[0].raw.includes("abc123"));
      assert.ok(!lines[0].raw.includes("private"));
    });

    it("finds errors nested in the context", () => {
      logger.error("x", { results: [{ id: 1, error: new Error("inner") }] });
      const results = last().context!.results as { error: { message: string } }[];
      assert.equal(results[0].error.message, "inner");
    });
  });

  describe("odd values", () => {
    it("handles circular references", () => {
      const a: Record<string, unknown> = { id: 1 };
      a.self = a;
      a.child = { parent: a };
      logger.error("x", { a });
      assert.equal(lines.length, 1);
      const a2 = last().context!.a as Record<string, unknown>;
      assert.equal(a2.id, 1);
      assert.equal(a2.self, "[circular]");
      assert.deepEqual(a2.child, { parent: "[circular]" });
    });

    it("logs a shared object that is not circular in full each time", () => {
      const shared = { status: "ok" };
      logger.error("x", { one: shared, two: shared });
      assert.deepEqual(last().context, { one: { status: "ok" }, two: { status: "ok" } });
    });

    it("does not throw on a throwing getter, a bigint, a function or a symbol", () => {
      const value = {
        get boom(): string {
          throw new Error("getter failed");
        },
        big: BigInt(10),
        fn: () => 1,
        sym: Symbol("s"),
        nan: Number.NaN,
        ok: true,
      };
      assert.doesNotThrow(() => logger.error("x", { value }));
      assert.deepEqual(last().context!.value, {
        boom: "[unreadable]",
        big: "10",
        fn: "[function]",
        sym: "Symbol(s)",
        nan: "NaN",
        ok: true,
      });
    });

    it("writes a plain notice, without the caller's data, when serialization fails", () => {
      const hostile = new Proxy(
        {},
        {
          ownKeys() {
            throw new Error("no keys for you");
          },
        }
      );
      assert.doesNotThrow(() => logger.error("x", { secretish: "visible?", hostile }));
      assert.equal(lines.length, 1);
      const line = last();
      assert.equal(line.event, "logger.serialization_failed");
      assert.ok(!lines[0].raw.includes("visible?"));
    });

    it("never throws even when the console itself does", () => {
      mock.restoreAll();
      mock.method(console, "error", () => {
        throw new Error("stderr closed");
      });
      assert.doesNotThrow(() => logger.error("x", "y", { a: 1 }));
    });

    it("cuts off very deep objects and long arrays and strings", () => {
      let deep: Record<string, unknown> = { end: true };
      for (let i = 0; i < 20; i++) deep = { next: deep };
      logger.error("x", {
        deep,
        many: Array.from({ length: 80 }, (_, i) => i),
        long: "a".repeat(5000),
      });
      const raw = lines[0].raw;
      assert.ok(raw.includes("[truncated]"));
      const many = last().context!.many as unknown[];
      assert.equal(many.length, 51);
      assert.equal(many[50], "[30 more]");
      assert.ok(raw.length < 5000);
    });
  });
});
