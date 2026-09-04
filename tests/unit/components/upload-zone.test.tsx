import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { UploadZone, type UploadedFile } from "@/components/upload-zone";

function selectFiles(zoneLabel: string, files: File[]) {
  const zone = screen.getByRole("button", { name: zoneLabel });
  const input = zone.querySelector('input[type="file"]');
  expect(input).not.toBeNull();

  const dt = new DataTransfer();
  for (const file of files) dt.items.add(file);
  Object.defineProperty(input!, "files", {
    value: dt.files,
    configurable: true,
  });
  fireEvent.change(input!);
}

function dropFiles(zoneLabel: string, files: File[]) {
  const zone = screen.getByRole("button", { name: zoneLabel });
  const dt = new DataTransfer();
  for (const file of files) dt.items.add(file);
  fireEvent.drop(zone, { dataTransfer: dt });
}

/**
 * UploadZone is a controlled component — the parent owns the list.
 * This harness mirrors real usage (state + re-render on change).
 */
type HarnessProps = Partial<Omit<Parameters<typeof UploadZone>[0], "files" | "onFilesChange">> & {
  initial?: UploadedFile[];
};

function UploadZoneHarness(props: HarnessProps) {
  const { initial = [], ...rest } = props;
  const [files, setFiles] = useState<UploadedFile[]>(initial);
  return (
    <UploadZone
      {...(rest as Parameters<typeof UploadZone>[0])}
      files={files}
      onFilesChange={setFiles}
    />
  );
}

function setup(props: HarnessProps = {}) {
  render(<UploadZoneHarness {...props} />);
}

/** Number of file rows currently rendered (valid or invalid). */
/** Visible filenames rendered in the list, in order. */
const renderedNames = () =>
  Array.from(document.querySelectorAll(".truncate.text-sm")).map(
    (el) => el.textContent,
  );

const pngFile = () =>
  new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "photo.png", {
    type: "image/png",
  });

describe("UploadZone — selection", () => {
  it("accepts a valid file and shows its name and size", async () => {
    setup();
    selectFiles("Drop files here or click to browse", [pngFile()]);

    await waitFor(() => {
      expect(screen.getByText("photo.png")).toBeInTheDocument();
    });
    expect(screen.getByText("4 B")).toBeInTheDocument();
    // No error is shown for a valid file.
    expect(screen.queryByText(/Exceeds|Unsupported/)).not.toBeInTheDocument();
  });

  it("supports drag-and-drop onto the zone", async () => {
    setup();
    dropFiles("Drop files here or click to browse", [pngFile()]);
    await waitFor(() => {
      expect(screen.getByText("photo.png")).toBeInTheDocument();
    });
  });

  it("accepts Unicode filenames without mangling them", async () => {
    setup();
    selectFiles("Drop files here or click to browse", [
      new File(["x"], "照片 — résumé.pdf", { type: "application/pdf" }),
    ]);
    await waitFor(() => {
      expect(screen.getByText("照片 — résumé.pdf")).toBeInTheDocument();
    });
  });

  it("accepts filenames with spaces and special characters", async () => {
    setup();
    selectFiles("Drop files here or click to browse", [
      new File(["x"], "my report (final) #2.txt", { type: "text/plain" }),
    ]);
    await waitFor(() => {
      expect(screen.getByText("my report (final) #2.txt")).toBeInTheDocument();
    });
  });

  it("accepts an empty (zero-byte) file without error", async () => {
    setup();
    selectFiles("Drop files here or click to browse", [
      new File([], "empty.txt", { type: "text/plain" }),
    ]);
    await waitFor(() => {
      expect(screen.getByText("empty.txt")).toBeInTheDocument();
      expect(screen.getByText("0 B")).toBeInTheDocument();
    });
  });
});

describe("UploadZone — replacement and removal", () => {
  it("replaces the file in single mode when a new one is selected", async () => {
    setup();
    selectFiles("Drop files here or click to browse", [pngFile()]);
    await waitFor(() => screen.getByText("photo.png"));

    selectFiles("Drop files here or click to browse", [
      new File(["y"], "other.png", { type: "image/png" }),
    ]);
    await waitFor(() => {
      expect(screen.getByText("other.png")).toBeInTheDocument();
    });
    expect(screen.queryByText("photo.png")).not.toBeInTheDocument();
  });

  it("removes a file via the remove button", async () => {
    setup();
    selectFiles("Drop files here or click to browse", [pngFile()]);
    await waitFor(() => screen.getByText("photo.png"));

    fireEvent.click(screen.getByRole("button", { name: "Remove file" }));
    await waitFor(() => {
      expect(screen.queryByText("photo.png")).not.toBeInTheDocument();
    });
  });
});

describe("UploadZone — multiple mode", () => {
  it("accumulates files in multiple mode", async () => {
    setup({ multiple: true });
    selectFiles("Drop files here or click to browse", [
      pngFile(),
      new File(["y"], "b.png", { type: "image/png" }),
    ]);
    await waitFor(() => {
      expect(renderedNames()).toEqual(["photo.png", "b.png"]);
    });
  });

  it("caps the list at maxFiles (boundary)", async () => {
    setup({ multiple: true, maxFiles: 2 });
    selectFiles("Drop files here or click to browse", [
      pngFile(),
      new File(["y"], "b.png", { type: "image/png" }),
      new File(["z"], "c.png", { type: "image/png" }),
    ]);
    await waitFor(() => {
      expect(renderedNames()).toEqual(["photo.png", "b.png"]);
    });
  });
});

describe("UploadZone — validation", () => {
  it("rejects a file above the size limit with a visible reason", async () => {
    setup({ maxFileSizeMB: 1 });
    const big = new File([new Uint8Array(2 * 1024 * 1024)], "big.png", {
      type: "image/png",
    });
    selectFiles("Drop files here or click to browse", [big]);

    await waitFor(() => {
      expect(screen.getByText(/Exceeds 1 MB limit/)).toBeInTheDocument();
    });
    // The invalid file still appears in the list so the user sees why.
    expect(screen.getByText("big.png")).toBeInTheDocument();
  });

  it("rejects unsupported MIME types when accept is set", async () => {
    setup({ accept: "application/pdf" });
    selectFiles("Drop files here or click to browse", [pngFile()]);

    await waitFor(() => {
      expect(
        screen.getByText(/Unsupported type \(image\/png\)/),
      ).toBeInTheDocument();
    });
  });

  it("accepts extension patterns in accept (e.g. .csv)", async () => {
    setup({ accept: ".csv,.json" });
    selectFiles("Drop files here or click to browse", [
      new File(["a,b\n1,2"], "data.csv", { type: "text/csv" }),
    ]);
    await waitFor(() => {
      expect(screen.getByText("data.csv")).toBeInTheDocument();
      expect(
        screen.queryByText(/Unsupported type/),
      ).not.toBeInTheDocument();
    });
  });

  it("accepts wildcard MIME groups (image/*)", async () => {
    setup({ accept: "image/*", multiple: true });
    selectFiles("Drop files here or click to browse", [
      new File(["x"], "photo.png", { type: "image/png" }),
      new File(["x"], "photo.jpg", { type: "image/jpeg" }),
    ]);
    await waitFor(() => {
      expect(screen.queryByText(/Unsupported/)).not.toBeInTheDocument();
      expect(renderedNames()).toEqual(["photo.png", "photo.jpg"]);
    });
  });

  it("boundary: a file exactly at the size limit is valid", async () => {
    setup({ maxFileSizeMB: 1 });
    const exact = new File([new Uint8Array(1024 * 1024)], "exact.png", {
      type: "image/png",
    });
    selectFiles("Drop files here or click to browse", [exact]);
    await waitFor(() => {
      expect(screen.getByText("exact.png")).toBeInTheDocument();
    });
    expect(screen.queryByText(/Exceeds/)).not.toBeInTheDocument();
  });
});

describe("UploadZone — accessibility", () => {
  it("the drop zone is keyboard operable (focusable, Enter handled)", () => {
    setup();
    const zone = screen.getByRole("button", { name: "Drop files here or click to browse" });
    expect(zone).toHaveAttribute("tabindex", "0");
    // Enter opens the picker; in jsdom the OS dialog can't appear, but the
    // handler must run without crashing.
    fireEvent.keyDown(zone, { key: "Enter" });
    expect(zone).toBeInTheDocument();
  });

  it("supports a custom accessible label", () => {
    render(<UploadZoneHarness label="Upload a PDF" />);
    expect(
      screen.getByRole("button", { name: "Upload a PDF" }),
    ).toBeInTheDocument();
  });
});
