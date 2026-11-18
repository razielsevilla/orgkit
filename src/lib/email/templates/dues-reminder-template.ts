/**
 * Email template for P5: Payment Reminders.
 * Generates plain-text and responsive HTML emails with bilingual copy (English + Filipino polite line).
 */

export interface DuesReminderEmailParams {
  recipientName: string;
  recipientEmail: string;
  orgName: string;
  periodName: string;
  amount: number | string;
  dueOn: string;
  payUrl: string;
}

export function formatReminderPeso(amount: number | string): string {
  const num = typeof amount === "number" ? amount : parseFloat(amount);
  if (Number.isNaN(num)) return "₱0.00";
  return `₱${num.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatReminderDate(dateString: string): string {
  try {
    const parts = dateString.split("-").map(Number);
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(d);
    }
    return dateString;
  } catch {
    return dateString;
  }
}

export function buildDuesReminderSubject(params: {
  periodName: string;
  orgName: string;
}): string {
  return `Reminder: Dues for ${params.periodName} · ${params.orgName}`;
}

export function buildDuesReminderText(params: DuesReminderEmailParams): string {
  const formattedAmount = formatReminderPeso(params.amount);
  const formattedDate = formatReminderDate(params.dueOn);

  return [
    `Hi ${params.recipientName},`,
    "",
    `This is a friendly reminder from ${params.orgName} regarding your dues for ${params.periodName}.`,
    "",
    `Amount due: ${formattedAmount}`,
    `Due date: ${formattedDate}`,
    "",
    `Please complete your payment and submit your receipt using this link:`,
    params.payUrl,
    "",
    `Paalala lang po: Huwag kalimutang i-settle ang inyong dues bago ang takdang araw. Maraming salamat sa inyong suporta!`,
    "",
    `Best regards,`,
    params.orgName,
  ].join("\n");
}

export function buildDuesReminderHtml(params: DuesReminderEmailParams): string {
  const formattedAmount = formatReminderPeso(params.amount);
  const formattedDate = formatReminderDate(params.dueOn);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Reminder</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f9f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a2e26;">
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f7f9f8; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e1e9e5; box-shadow: 0 4px 12px rgba(26, 46, 38, 0.05); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; border-bottom: 1px solid #edf2f0; background: linear-gradient(135deg, #1c4b38 0%, #15382a 100%);">
              <div style="color: #98e4c1; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;">
                ${escapeHtml(params.orgName)}
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; line-height: 1.3;">
                Payment Reminder
              </h1>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #2d3748;">
                Hi <strong>${escapeHtml(params.recipientName)}</strong>,
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #4a5568;">
                This is a friendly reminder from <strong>${escapeHtml(params.orgName)}</strong> regarding your dues for <strong>${escapeHtml(params.periodName)}</strong>.
              </p>

              <!-- Payment Details Card -->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f3f8f5; border: 1px solid #dbeae2; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <div style="font-size: 13px; color: #4a5568; margin-bottom: 4px;">Amount Due</div>
                    <div style="font-size: 26px; font-weight: 700; color: #1c4b38; margin-bottom: 14px;">${formattedAmount}</div>
                    
                    <div style="font-size: 13px; color: #4a5568; margin-bottom: 4px;">Due Date</div>
                    <div style="font-size: 15px; font-weight: 600; color: #1a2e26;">${formattedDate}</div>
                  </td>
                </tr>
              </table>

              <!-- Call to Action Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${escapeHtml(params.payUrl)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #1c4b38; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 9999px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 4px rgba(28, 75, 56, 0.2);">
                  Pay Now &amp; Submit Receipt
                </a>
              </div>

              <!-- Filipino Courtesy Note -->
              <div style="background-color: #fafbfb; border-left: 3px solid #1c4b38; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-top: 24px;">
                <p style="margin: 0; font-size: 13.5px; line-height: 1.5; color: #5a6a62; font-style: italic;">
                  Paalala lang po: Huwag kalimutang i-settle ang inyong dues bago ang takdang araw. Maraming salamat sa inyong suporta!
                </p>
              </div>

              <!-- Fallback Link -->
              <p style="margin: 28px 0 0; font-size: 12px; line-height: 1.5; color: #718096; word-break: break-all;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${escapeHtml(params.payUrl)}" style="color: #1c4b38; text-decoration: underline;">${escapeHtml(params.payUrl)}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f7f9f8; border-top: 1px solid #edf2f0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #718096; line-height: 1.5;">
                Sent on behalf of ${escapeHtml(params.orgName)} via OrgKit.<br>
                You received this because you are an active member of this organization.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildDuesReminderEmail(params: DuesReminderEmailParams): {
  subject: string;
  text: string;
  html: string;
} {
  return {
    subject: buildDuesReminderSubject(params),
    text: buildDuesReminderText(params),
    html: buildDuesReminderHtml(params),
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
