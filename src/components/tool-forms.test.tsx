import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToolOutput } from "./tool-forms";

const writeText = vi.fn();

beforeEach(() => {
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});

describe("ToolOutput — shared output surface used by ~30 tools", () => {
  it("renders the label and the value the user can read", async () => {
    render(
      <TooltipProvider>
        <ToolOutput
          id="out"
          label="JSON Output"
          value={'{"a":1}'}
          filename="data.json"
          mimeType="application/json"
        />
      </TooltipProvider>,
    );

    expect(screen.getByText("JSON Output")).toBeInTheDocument();
    await waitFor(() => {
      expect(document.body.textContent).toContain('"a":1');
    });
  });

  it("shows the filename in the code block header", async () => {
    render(
      <TooltipProvider>
        <ToolOutput
          label="Output"
          value="x"
          filename="result.yaml"
          mimeType="text/yaml"
        />
      </TooltipProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText("result.yaml")).toBeInTheDocument();
    });
  });

  it("derives the download button label from the file extension", () => {
    render(
      <TooltipProvider>
        <ToolOutput
          label="Output"
          value="x"
          filename="result.yaml"
          mimeType="text/yaml"
        />
      </TooltipProvider>,
    );
    expect(
      screen.getByRole("button", { name: "Download YAML" }),
    ).toBeInTheDocument();
  });

  it("triggers a download with the expected filename when clicked", () => {
    const clickSpy = vi.fn();
    // jsdom won't navigate; capture the synthetic anchor click.
    const anchorFactory = document.createElement.bind(document);
    const created: HTMLAnchorElement[] = [];
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = anchorFactory(tag);
      if (tag === "a") {
        created.push(el as HTMLAnchorElement);
        (el as HTMLAnchorElement).click = clickSpy;
      }
      return el as never;
    });

    render(
      <TooltipProvider>
        <ToolOutput
          label="Output"
          value="hello"
          filename="out.txt"
          mimeType="text/plain"
        />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Download TXT" }));

    expect(clickSpy).toHaveBeenCalled();
    const anchor = created.at(-1)!;
    expect(anchor.download).toBe("out.txt");
    expect(anchor.href).toContain("blob:");

    vi.restoreAllMocks();
  });

  it("copies the raw value (not the rendered markup) to the clipboard", async () => {
    render(
      <TooltipProvider>
        <ToolOutput
          label="Output"
          value={"plain value with, commas"}
          filename="out.txt"
          mimeType="text/plain"
        />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("plain value with, commas");
    });
  });

  it("renders HTML output as highlighted text, never as live markup (XSS)", async () => {
    const payload = '<img src=x onerror="alert(1)"><script>bad()</script>';
    const { container } = render(
      <TooltipProvider>
        <ToolOutput
          label="HTML Output"
          value={payload}
          filename="page.html"
          mimeType="text/html"
        />
      </TooltipProvider>,
    );

    await waitFor(
      () => {
        expect(container.textContent).toContain("onerror=");
      },
      { timeout: 4000 },
    );
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(
      container.querySelector('script:not([type="application/json"])'),
    ).not.toBeInTheDocument();
  });
});
