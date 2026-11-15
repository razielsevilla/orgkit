/**
 * Email sender abstraction supporting Resend in production
 * and an in-memory Mock transport for automated tests and offline development.
 */

import { getResendFromEmail, isEmailConfigured } from "./env.ts";
import { getOptionalResendClient } from "./resend-client.ts";

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

    if (process.env.NODE_ENV !== "test") {
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
 * Defaults to MockEmailSender in test environment or when unconfigured, otherwise ResendEmailSender.
 */
export function getEmailSender(): EmailSender {
  if (activeSender) {
    return activeSender;
  }
  if (process.env.NODE_ENV === "test" || !isEmailConfigured()) {
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
