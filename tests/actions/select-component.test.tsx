import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { Select } from "@/src/components/ui/select";

async function render(element: ReturnType<typeof createElement>): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return (await new Response(stream).text()).replace(/<!-- -->/g, "");
}

describe("Select component", () => {
  const options = [
    { value: "finance", label: "Finance" },
    { value: "legal", label: "Legal" },
    { value: "templates", label: "Templates" },
  ];

  it("renders trigger with currently selected label", async () => {
    const html = await render(
      createElement(Select, {
        id: "test-select",
        value: "finance",
        onChange: vi.fn(),
        options,
      })
    );

    expect(html).toContain("Finance");
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-haspopup="listbox"');
  });

  it("renders accessible synchronized hidden select with all options", async () => {
    const html = await render(
      createElement(Select, {
        id: "test-select",
        name: "testCategory",
        value: "templates",
        onChange: vi.fn(),
        options,
      })
    );

    expect(html).toContain('id="test-select"');
    expect(html).toContain('name="testCategory"');
    expect(html).toContain('<option value="finance">Finance</option>');
    expect(html).toContain('<option value="legal">Legal</option>');
    expect(html).toContain('<option value="templates" selected="">Templates</option>');
  });

  it("renders placeholder when value is empty", async () => {
    const html = await render(
      createElement(Select, {
        id: "test-select",
        value: "",
        onChange: vi.fn(),
        options,
        placeholder: "Choose a category...",
      })
    );

    expect(html).toContain("Choose a category...");
  });

  it("renders disabled state properly on trigger and hidden select", async () => {
    const html = await render(
      createElement(Select, {
        id: "test-select",
        value: "finance",
        onChange: vi.fn(),
        options,
        disabled: true,
      })
    );

    expect(html).toContain("disabled");
  });
});
