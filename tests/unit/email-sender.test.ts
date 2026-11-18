import { describe, it, beforeEach } from "node:test";
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
