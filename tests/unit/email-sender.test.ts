import { describe, it, beforeEach, afterEach, mock as nodeMock } from "node:test";
import assert from "node:assert/strict";
import {
  MockEmailSender,
  getEmailSender,
  setEmailSender,
} from "../../src/lib/email/email-sender.ts";

describe("Email Sender and Mock Transport", () => {
  let mock: MockEmailSender;

  beforeEach(() => {
    mock = new MockEmailSender();
    setEmailSender(mock);
  });

  it("sends email successfully and stores it in memory", async () => {
    const sender = getEmailSender();
    const res = await sender.send({
      to: "student@school.edu",
      subject: "Test Subject",
      text: "Test Body",
    });

    assert.equal(res.success, true);
    assert.ok(res.id?.startsWith("mock-email-"));
    assert.equal(mock.getSentEmails().length, 1);
    assert.equal(mock.getSentEmails()[0].to, "student@school.edu");
  });

  it("simulates delivery failure for specific email addresses", async () => {
    mock.setFailFor(["bounced@school.edu"], "Mailbox does not exist");
    const sender = getEmailSender();

    const failedRes = await sender.send({
      to: "bounced@school.edu",
      subject: "Test Subject",
      text: "Test Body",
    });
    assert.equal(failedRes.success, false);
    assert.equal(failedRes.error, "Mailbox does not exist");

    const successRes = await sender.send({
      to: "valid@school.edu",
      subject: "Test Subject",
      text: "Test Body",
    });
    assert.equal(successRes.success, true);
  });

  it("clears failures when instructed", async () => {
    mock.setFailFor(["bounced@school.edu"]);
    mock.clearFailures();

    const sender = getEmailSender();
    const res = await sender.send({
      to: "bounced@school.edu",
      subject: "Retry Subject",
      text: "Retry Body",
    });
    assert.equal(res.success, true);
  });
});

describe("Email sender logging and selection by environment", () => {
  const env = process.env as Record<string, string | undefined>;
  const saved = { NODE_ENV: env.NODE_ENV, RESEND_API_KEY: env.RESEND_API_KEY };
  const RECIPIENT = "private.student@school.edu";
  const BODY = "Hi Private Student, you owe PHP 250 for the 1st sem dues.";
  let logged: string[];

  const message = { to: RECIPIENT, subject: "Dues reminder", text: BODY };

  beforeEach(() => {
    logged = [];
    const capture = (...args: unknown[]) => {
      logged.push(args.map(String).join(" "));
    };
    nodeMock.method(console, "log", capture);
    nodeMock.method(console, "info", capture);
    nodeMock.method(console, "warn", capture);
    nodeMock.method(console, "error", capture);
    setEmailSender(null);
  });

  afterEach(() => {
    nodeMock.restoreAll();
    setEmailSender(null);
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
  });

  it("mock sender never prints the recipient or body in production", async () => {
    env.NODE_ENV = "production";
    const sender = new MockEmailSender();

    const res = await sender.send(message);

    // Same result shape as always
    assert.equal(res.success, true);
    assert.ok(res.id?.startsWith("mock-email-"));
    assert.equal(sender.getSentEmails().length, 1);
    // Something is logged, but nothing personal
    assert.ok(logged.length > 0);
    const output = logged.join("\n");
    assert.ok(!output.includes(RECIPIENT), "recipient address leaked");
    assert.ok(!output.includes("Private Student"), "message body leaked");
    assert.ok(!output.includes(BODY), "message body leaked");
  });

  it("mock sender still shows the full message in development", async () => {
    env.NODE_ENV = "development";

    const res = await new MockEmailSender().send(message);

    assert.equal(res.success, true);
    const output = logged.join("\n");
    assert.ok(output.includes(RECIPIENT));
    assert.ok(output.includes(BODY));
  });

  it("mock sender prints nothing in the test environment", async () => {
    env.NODE_ENV = "test";

    await new MockEmailSender().send(message);

    assert.deepEqual(logged, []);
  });

  it("in production without RESEND_API_KEY, sending fails clearly and leaks nothing", async () => {
    env.NODE_ENV = "production";
    delete env.RESEND_API_KEY;

    // Choosing the sender must not throw: this is what keeps a build without the key working
    const sender = getEmailSender();
    const res = await sender.send(message);

    assert.equal(res.success, false);
    assert.match(res.error ?? "", /RESEND_API_KEY/);
    const output = logged.join("\n");
    assert.ok(output.includes("RESEND_API_KEY"));
    assert.ok(!output.includes(RECIPIENT));
    assert.ok(!output.includes(BODY));
  });

  it("in development without RESEND_API_KEY, the mock sender is used", async () => {
    env.NODE_ENV = "development";
    delete env.RESEND_API_KEY;

    const res = await getEmailSender().send(message);

    assert.equal(res.success, true);
    assert.ok(res.id?.startsWith("mock-email-"));
  });

  it("in the test environment the mock sender is used even with a key set", async () => {
    env.NODE_ENV = "test";
    env.RESEND_API_KEY = "re_test_placeholder";

    const res = await getEmailSender().send(message);

    assert.equal(res.success, true);
    assert.ok(res.id?.startsWith("mock-email-"));
  });
});
