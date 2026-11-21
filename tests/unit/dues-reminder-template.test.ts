import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatReminderPeso,
  formatReminderDate,
  buildDuesReminderSubject,
  buildDuesReminderText,
  buildDuesReminderHtml,
  buildDuesReminderEmail,
} from "../../src/lib/email/templates/dues-reminder-template.ts";

describe("Dues Reminder Email Template", () => {
  const sampleParams = {
    recipientName: "Maria Clara",
    recipientEmail: "maria@university.edu.ph",
    orgName: "Computer Society",
    periodName: "1st Sem Membership Dues 2026",
    amount: 250,
    dueOn: "2026-12-15",
    payUrl: "https://orgkit.ph/pay/abc-123-xyz",
  };

  describe("formatReminderPeso", () => {
    it("formats numbers with peso sign and two decimal places", () => {
      assert.equal(formatReminderPeso(250), "₱250.00");
      assert.equal(formatReminderPeso(1500.5), "₱1,500.50");
      assert.equal(formatReminderPeso("75.25"), "₱75.25");
    });

    it("handles invalid amounts gracefully", () => {
      assert.equal(formatReminderPeso("invalid"), "₱0.00");
    });
  });

  describe("formatReminderDate", () => {
    it("formats ISO date string to readable US date format", () => {
      assert.equal(formatReminderDate("2026-12-15"), "Dec 15, 2026");
      assert.equal(formatReminderDate("2026-01-05"), "Jan 5, 2026");
    });

    it("falls back to raw string on malformed date", () => {
      assert.equal(formatReminderDate("not-a-date"), "not-a-date");
    });
  });

  describe("buildDuesReminderSubject", () => {
    it("constructs expected subject line with period and org", () => {
      const subject = buildDuesReminderSubject({
        periodName: "Annual Dues",
        orgName: "Debate Club",
      });
      assert.equal(subject, "Reminder: Dues for Annual Dues · Debate Club");
    });
  });

  describe("buildDuesReminderText", () => {
    it("contains all required components per acceptance criteria", () => {
      const text = buildDuesReminderText(sampleParams);

      assert.ok(text.includes("Hi Maria Clara,"));
      assert.ok(text.includes("Computer Society"));
      assert.ok(text.includes("1st Sem Membership Dues 2026"));
      assert.ok(text.includes("₱250.00"));
      assert.ok(text.includes("Dec 15, 2026"));
      assert.ok(text.includes("https://orgkit.ph/pay/abc-123-xyz"));
      // Filipino line
      assert.ok(
        text.includes(
          "Paalala lang po: Huwag kalimutang i-settle ang inyong dues bago ang takdang araw."
        )
      );
    });
  });

  describe("buildDuesReminderHtml", () => {
    it("generates valid responsive HTML with CTA button and escaped entities", () => {
      const html = buildDuesReminderHtml({
        ...sampleParams,
        recipientName: "Maria <Admin> & Friends",
      });

      assert.ok(html.includes("<!DOCTYPE html>"));
      assert.ok(html.includes("Maria &lt;Admin&gt; &amp; Friends"));
      assert.ok(html.includes("href=\"https://orgkit.ph/pay/abc-123-xyz\""));
      assert.ok(html.includes("Pay Now &amp; Submit Receipt"));
      assert.ok(html.includes("₱250.00"));
      assert.ok(html.includes("Dec 15, 2026"));
      assert.ok(html.includes("Paalala lang po"));
    });
  });

  describe("buildDuesReminderEmail", () => {
    it("returns complete bundle with subject, text, and html", () => {
      const bundle = buildDuesReminderEmail(sampleParams);
      assert.ok(bundle.subject);
      assert.ok(bundle.text);
      assert.ok(bundle.html);
      assert.equal(bundle.subject, buildDuesReminderSubject(sampleParams));
    });
  });
});
