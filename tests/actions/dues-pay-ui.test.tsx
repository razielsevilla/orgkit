import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { PayForm } from "@/src/components/pay/pay-form";
import { PaySuccessView } from "@/src/components/pay/pay-success-view";
import { PayInactiveView } from "@/src/components/pay/pay-inactive-view";

async function render(element: ReturnType<typeof createElement>): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return (await new Response(stream).text()).replace(/<!-- -->/g, "");
}

describe("Pay Form & Results UI", () => {
  it("renders PayForm with period details, amount in pesos, and input fields", async () => {
    const html = await render(
      createElement(PayForm, {
        token: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        orgName: "Computer Science Society",
        periodName: "1st Sem Membership Dues",
        amount: 250.0,
        dueOn: "2026-12-15",
      })
    );

    expect(html).toContain("Computer Science Society");
    expect(html).toContain("1st Sem Membership Dues");
    expect(html).toContain("₱250.00");
    expect(html).toContain("Dec 15, 2026");
    expect(html).toContain("Roster email");
    expect(html).toContain("GCash reference number");
    expect(html).toContain("Payment screenshot");
    expect(html).toContain("Submit payment");
    expect(html).toContain("Your screenshot is stored securely");
  });

  it("renders PaySuccessView with submitted reference number and reassurance note", async () => {
    const html = await render(
      createElement(PaySuccessView, {
        language: "en",
        referenceNo: "GCASH-1234567890",
        amount: 350.0,
        orgName: "Engineering Guild",
        periodName: "Annual Dues",
      })
    );

    expect(html).toContain("Payment submitted!");
    expect(html).toContain("₱350.00");
    expect(html).toContain("GCASH-1234567890");
    expect(html).toContain("Engineering Guild");
    expect(html).toContain("Annual Dues");
    expect(html).toContain("An officer will review and verify your payment.");
  });

  it("renders PaySuccessView in Filipino", async () => {
    const html = await render(
      createElement(PaySuccessView, {
        language: "fil",
        referenceNo: "GCASH-1234567890",
        amount: 350.0,
        orgName: "Engineering Guild",
        periodName: "Annual Dues",
      })
    );

    expect(html).toContain("Na-submit na ang bayad!");
    expect(html).toContain("₱350.00");
    expect(html).toContain("Ibeberipika ito ng isang opisyal.");
  });

  it("renders PayInactiveView with link inactive message", async () => {
    const html = await render(
      createElement(PayInactiveView, {
        language: "en",
      })
    );

    expect(html).toContain("Payment link isn&#x27;t active");
    expect(html).toContain("This dues period is either closed or the payment link is paused");
  });
});
