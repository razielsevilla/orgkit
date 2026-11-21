import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  chunkArray,
  delay,
  classifyReminderError,
  formatReminderErrorMessage,
} from "../../src/lib/dues/dues-reminders-batch.ts";

describe("Dues Reminders Batching and Error Classification", () => {
  describe("chunkArray", () => {
    it("splits items into evenly sized chunks with remainder", () => {
      const items = Array.from({ length: 65 }, (_, i) => i + 1);
      const chunks = chunkArray(items, 20);

      assert.equal(chunks.length, 4);
      assert.equal(chunks[0].length, 20);
      assert.equal(chunks[1].length, 20);
      assert.equal(chunks[2].length, 20);
      assert.equal(chunks[3].length, 5);
      assert.equal(chunks[0][0], 1);
      assert.equal(chunks[3][4], 65);
    });

    it("handles exact multiples without extra empty chunks", () => {
      const items = [1, 2, 3, 4, 5, 6];
      const chunks = chunkArray(items, 3);

      assert.equal(chunks.length, 2);
      assert.deepEqual(chunks[0], [1, 2, 3]);
      assert.deepEqual(chunks[1], [4, 5, 6]);
    });

    it("handles empty arrays", () => {
      const chunks = chunkArray([], 10);
      assert.deepEqual(chunks, []);
    });

    it("handles chunk size greater than item length", () => {
      const items = [1, 2, 3];
      const chunks = chunkArray(items, 50);
      assert.equal(chunks.length, 1);
      assert.deepEqual(chunks[0], [1, 2, 3]);
    });

    it("safely handles non-positive chunk size", () => {
      const items = [1, 2, 3];
      const chunks = chunkArray(items, 0);
      assert.equal(chunks.length, 1);
      assert.deepEqual(chunks[0], [1, 2, 3]);
    });
  });

  describe("delay", () => {
    it("resolves after the specified duration", async () => {
      const start = Date.now();
      await delay(50);
      const elapsed = Date.now() - start;
      assert.ok(elapsed >= 40, `Elapsed ${elapsed}ms should be at least 40ms`);
    });
  });

  describe("classifyReminderError", () => {
    it("classifies bounce errors as 'bounced'", () => {
      assert.equal(classifyReminderError("Email bounced by destination server"), "bounced");
      assert.equal(classifyReminderError("Recipient address does not exist"), "bounced");
      assert.equal(classifyReminderError("Invalid email address"), "bounced");
      assert.equal(classifyReminderError("Undeliverable mail"), "bounced");
    });

    it("classifies other errors as 'failed'", () => {
      assert.equal(classifyReminderError("Rate limit exceeded"), "failed");
      assert.equal(classifyReminderError("Network timeout connecting to Resend"), "failed");
      assert.equal(classifyReminderError(null), "failed");
      assert.equal(classifyReminderError(undefined), "failed");
    });
  });

  describe("formatReminderErrorMessage", () => {
    it("formats bounce errors cleanly", () => {
      assert.equal(
        formatReminderErrorMessage("Mailbox does not exist on domain"),
        "Email bounced (address not found)"
      );
    });

    it("formats rate limit errors cleanly", () => {
      assert.equal(
        formatReminderErrorMessage("HTTP 429: Too many requests, rate limit exceeded"),
        "Sending paused (rate limit reached, retry shortly)"
      );
    });

    it("formats API key errors cleanly", () => {
      assert.equal(
        formatReminderErrorMessage("Invalid api key provided"),
        "Email service configuration error"
      );
    });

    it("preserves specific unmapped errors as fallback", () => {
      assert.equal(
        formatReminderErrorMessage("Custom transport dropped connection"),
        "Custom transport dropped connection"
      );
      assert.equal(formatReminderErrorMessage(null), "Delivery failed");
    });
  });
});
