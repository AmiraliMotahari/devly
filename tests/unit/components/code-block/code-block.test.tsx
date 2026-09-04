import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CodeBlock } from "@/components/code-block/code-block";
import { resolveLanguage } from "@/components/code-block/language";

// The app mounts TooltipProvider in layout.tsx; tests render in isolation.
function renderWithProviders(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

/** Shiki splits source into token spans, so match against whole-region text. */
function codeBlockText(container: HTMLElement): string {
  const region = container.querySelector('[data-slot="code-block"]');
  return region?.textContent ?? "";
}

// jsdom has no clipboard; the component awaits navigator.clipboard.writeText.
const writeText = vi.fn();

beforeEach(() => {
  writeText.mockReset();
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});

const sampleCode = `function greet(name) {\n  return "Hello, " + name;\n}\n`;

describe("CodeBlock — rendering", () => {
  it("renders the code content the user can read", async () => {
    const { container } = renderWithProviders(
      <CodeBlock code={sampleCode} language="javascript" />,
    );
    await waitFor(
      () => {
        // Shiki tokenizes into spans; match plain substrings that survive
        // tokenization (no quote chars, which end up in separate tokens).
        expect(codeBlockText(container)).toContain("greet");
        expect(codeBlockText(container)).toContain("Hello");
        expect(codeBlockText(container)).toContain("name");
      },
      { timeout: 4000 },
    );
  });

  it("shows the filename in the header when provided", async () => {
    renderWithProviders(<CodeBlock code={sampleCode} filename="greet.js" />);
    await waitFor(() => {
      expect(screen.getByText("greet.js")).toBeInTheDocument();
    });
  });

  it("shows the language label when no filename is given", async () => {
    renderWithProviders(<CodeBlock code={sampleCode} language="typescript" />);
    await waitFor(() => {
      expect(screen.getByText("TypeScript")).toBeInTheDocument();
    });
  });

  it("falls back gracefully for an unknown language", async () => {
    const { container } = renderWithProviders(
      <CodeBlock code="x = 1" language="not-a-lang" />,
    );
    await waitFor(
      () => {
        expect(codeBlockText(container)).toContain("x = 1");
      },
      { timeout: 4000 },
    );
  });

  it("renders highlighted lines without breaking output", async () => {
    const { container } = renderWithProviders(
      <CodeBlock code={"line1\nline2\nline3"} language="text" highlightLines={[2]} />,
    );
    await waitFor(() => {
      expect(codeBlockText(container)).toContain("line2");
    });
  });

  it("renders empty code without crashing", async () => {
    renderWithProviders(<CodeBlock code="" language="text" />);
    await waitFor(() => {
      expect(
        screen.getByRole("region", { name: "Code block" }),
      ).toBeInTheDocument();
    });
  });
});

describe("CodeBlock — line numbers toggle", () => {
  it("toggles line numbers via the header button (aria-pressed state)", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CodeBlock code={"a\nb\nc"} language="text" />);

    const toggle = screen.getByRole("button", { name: "Show line numbers" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Hide line numbers" }),
      ).toHaveAttribute("aria-pressed", "true");
    });
  });

  it("can start with line numbers on", async () => {
    renderWithProviders(<CodeBlock code={"a\nb"} language="text" showLineNumbers />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Hide line numbers" }),
      ).toBeInTheDocument();
    });
  });
});

describe("CodeBlock — copy", () => {
  it("copies the full code to the clipboard", async () => {
    // fireEvent instead of userEvent: the button sits inside a Radix
    // Tooltip trigger whose pointer-event handling interferes with
    // userEvent's pointer simulation in jsdom.
    const { fireEvent } = await import("@testing-library/react");
    renderWithProviders(<CodeBlock code={"copy me"} language="text" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Copy code to clipboard" }),
    );

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("copy me");
    });
  });

  it("can hide the copy button when configured", () => {
    renderWithProviders(
      <CodeBlock code="x" language="text" showCopyButton={false} />,
    );
    expect(
      screen.queryByRole("button", { name: "Copy code to clipboard" }),
    ).not.toBeInTheDocument();
  });
});

describe("CodeBlock — screen reader summary", () => {
  it("announces line count and highlight count in the block", async () => {
    const { container } = renderWithProviders(
      <CodeBlock code={"a\nb\nc"} language="text" highlightLines={[1]} />,
    );
    await waitFor(() => {
      const text = codeBlockText(container);
      expect(text).toMatch(/3\s*lines?/);
      expect(text).toMatch(/1\s*highlighted/);
    });
  });
});

describe("CodeBlock — XSS safety", () => {
  const payload = `<img src=x onerror="alert(1)"><script>alert(2)</script>`;

  it("renders HTML/JS payloads as inert text, not markup", async () => {
    const { container } = renderWithProviders(
      <CodeBlock code={payload} language="html" />,
    );

    await waitFor(
      () => {
        // The payload text is visible to the user...
        expect(codeBlockText(container)).toContain("onerror=");
      },
      { timeout: 4000 },
    );
    // ...but no img/script elements were created from it.
    expect(document.querySelector("img")).not.toBeInTheDocument();
    expect(
      document.querySelector('script:not([type="application/json"])'),
    ).not.toBeInTheDocument();
  });
});

describe("CodeBlock — language resolution contract", () => {
  it("never passes an unknown language to the highlighter", () => {
    expect(resolveLanguage("javascript")).toBe("javascript");
    expect(resolveLanguage("totally-unknown")).toBe("text");
  });
});
