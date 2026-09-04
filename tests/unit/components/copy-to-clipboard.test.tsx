import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CopyToClipboard } from "@/components/copy-to-clipboard";

const writeText = vi.fn();

beforeEach(() => {
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});

function renderCopy(props: Parameters<typeof CopyToClipboard>[0]) {
  return render(
    <TooltipProvider>
      <CopyToClipboard {...props} />
    </TooltipProvider>,
  );
}

describe("CopyToClipboard — icon mode (default)", () => {
  it("exposes an accessible copy button", () => {
    renderCopy({ value: "hello" });
    expect(
      screen.getByRole("button", { name: "Copy to clipboard" }),
    ).toBeInTheDocument();
  });

  it("writes the value to the clipboard on click", async () => {
    renderCopy({ value: "hello world" });
    fireEvent.click(screen.getByRole("button", { name: "Copy to clipboard" }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("hello world");
    });
  });

  it("shows the copied confirmation state after a successful copy", async () => {
    renderCopy({ value: "x" });
    fireEvent.click(screen.getByRole("button", { name: "Copy to clipboard" }));
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Copied to clipboard" }),
      ).toBeInTheDocument();
    });
  });
});

describe("CopyToClipboard — labeled mode", () => {
  it("renders a visible custom label", () => {
    renderCopy({ value: "x", label: "Copy JSON", showLabel: true });
    expect(screen.getByRole("button", { name: "Copy JSON" })).toBeInTheDocument();
  });

  it("copies on click in labeled mode too", async () => {
    renderCopy({ value: "payload", showLabel: true });
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("payload");
    });
  });

  it("switches its label to Copied after copying", async () => {
    renderCopy({ value: "payload", showLabel: true });
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
    });
  });
});

describe("CopyToClipboard — failure handling", () => {
  it("shows a failure toast and resets state when the clipboard rejects", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    renderCopy({ value: "x" });

    fireEvent.click(screen.getByRole("button", { name: "Copy to clipboard" }));

    // Button must not get stuck in the "Copied" state on failure.
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Copy to clipboard" }),
      ).toBeInTheDocument();
    });
    // It stays functional for a retry after permissions are restored.
    writeText.mockResolvedValue(undefined);
    fireEvent.click(screen.getByRole("button", { name: "Copy to clipboard" }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(2);
    });
  });
});

describe("CopyToClipboard — repeated copies", () => {
  it("handles repeated clicks of changing values", async () => {
    const { rerender } = renderCopy({ value: "first" });
    const btn = screen.getByRole("button", { name: "Copy to clipboard" });

    fireEvent.click(btn);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("first"));

    rerender(
      <TooltipProvider>
        <CopyToClipboard value="second" />
      </TooltipProvider>,
    );
    fireEvent.click(btn);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("second"));
  });
});
