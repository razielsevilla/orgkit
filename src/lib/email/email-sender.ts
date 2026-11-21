/**
 * Email sender abstraction supporting Resend in production
 * and an in-memory Mock transport for automated tests and offline development.
 */

import { getResendFromEmail, isEmailConfigured } from "./env.ts";
import { getOptionalResendClient } from "./resend-client.ts";
import { logger } from "../logger.ts";

export interface SendEmailOptions {
  to: string;
  from?: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

export interface EmailSender {
  send(options: SendEmailOptions): Promise<SendEmailResult>;
}

export class MockEmailSender implements EmailSender {
  private sent: SendEmailOptions[] = [];
  private failForEmails: Set<string> = new Set();
  private defaultError = "Simulated delivery failure";

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    if (this.failForEmails.has(options.to.toLowerCase())) {
      return {
        success: false,
        error: this.defaultError,
      };
    }

    this.sent.push({ ...options });

    if (process.env.NODE_ENV === "production") {
      // Never print the recipient or the body in production: both are personal data
      // that would end up in the hosting provider's logs.
      logger.info("email.mock_dispatched", "Mock email dispatched (recipient and body withheld).");
    } else if (process.env.NODE_ENV !== "test") {
      // Local development only: show the whole message so it can be checked by eye.
      // Deliberately plain console output and not the logger, which would redact the
      // very thing this is for. It never runs in production or tests.
      console.log(`\n================== 📧 MOCK EMAIL DISPATCHED ==================`);
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`\n--- Plaintext Body ---\n${options.text}`);
      console.log(`==============================================================\n`);
    }

    return {
      success: true,
      id: `mock-email-${this.sent.length}-${Date.now()}`,
    };
  }

  getSentEmails(): SendEmailOptions[] {
    return [...this.sent];
  }

  setFailFor(emails: string[], errorMessage = "Simulated delivery failure"): void {
    this.failForEmails = new Set(emails.map((e) => e.toLowerCase()));
    this.defaultError = errorMessage;
  }

  clearFailures(): void {
    this.failForEmails.clear();
  }

  reset(): void {
    this.sent = [];
    this.failForEmails.clear();
  }
}

export class ResendEmailSender implements EmailSender {
  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    const client = getOptionalResendClient();
    if (!client) {
      // Checked here, when an email is actually sent, and not at import time, so a
      // build without the key still works. The caller gets a clear failure.
      logger.error("email.not_configured", "Email not sent: RESEND_API_KEY is not configured.", {
        variable: "RESEND_API_KEY",
      });
      return {
        success: false,
        error: "RESEND_API_KEY is not configured.",
      };
    }

    const fromAddress = options.from || getResendFromEmail();

    try {
      const response = await client.emails.send({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      if (response.error) {
        return {
          success: false,
          error: response.error.message || "Failed to send email via Resend",
        };
      }

      return {
        success: true,
        id: response.data?.id,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown email delivery error";
      return {
        success: false,
        error: message,
      };
    }
  }
}

let activeSender: EmailSender | null = null;
const mockSenderInstance = new MockEmailSender();

/**
 * Returns the currently active email sender.
 * Defaults to MockEmailSender in the test environment, and in development when no
 * RESEND_API_KEY is set. In production it is always ResendEmailSender: without a
 * key, its send() fails with a clear error instead of pretending the email went out.
 */
export function getEmailSender(): EmailSender {
  if (activeSender) {
    return activeSender;
  }
  const isProduction = process.env.NODE_ENV === "production";
  if (process.env.NODE_ENV === "test" || (!isEmailConfigured() && !isProduction)) {
    return mockSenderInstance;
  }
  return new ResendEmailSender();
}

/**
 * Overrides the active email sender (used in tests or custom transports).
 */
export function setEmailSender(sender: EmailSender | null): void {
  activeSender = sender;
}

/**
 * Returns the shared mock sender instance for test inspection.
 */
export function getMockEmailSender(): MockEmailSender {
  return mockSenderInstance;
}
