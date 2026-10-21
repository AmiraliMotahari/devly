/**
 * Vitest setup for the jsdom environment.
 *
 * IMPORTANT: this file must stay **synchronous**. A top-level `await` here
 * makes the module's evaluation async, and Vitest does not await it — the
 * code after the first `await` silently never runs (the jsdom shims below
 * never get installed and every test using them fails).
 *
 * The jest-dom matchers are registered on the `expect` instance that the
 * test files use. Importing "@testing-library/jest-dom/vitest" instead would
 * extend a *different* vitest instance (the package is externalized, so its
 * own "vitest" import resolves outside Vite's module graph) and the matchers
 * would never reach the tests.
 */
import { expect } from "vitest";
import * as jestDomMatchers from "@testing-library/jest-dom/matchers";

expect.extend(jestDomMatchers);

if (typeof globalThis.crypto === "undefined" || !globalThis.crypto.subtle) {
  // Web Crypto is needed by encrypted-archive unit tests. Node provides
  // webcrypto; jsdom does not implement it.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { webcrypto } = require("node:crypto") as typeof import("node:crypto");
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
}

if (typeof globalThis.TextEncoder === "undefined") {
  // jsdom implements TextEncoder/TextDecoder but not on the global in some
  // versions — guard rather than assume.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { TextEncoder, TextDecoder } = require("node:util") as typeof import("node:util");
  Object.assign(globalThis, { TextEncoder, TextDecoder });
}

// jsdom does not implement DataTransfer. A minimal shim sufficient for
// file-input change/drop tests: items.add(File) and a FileList-like view.
class DataTransferItemListShim {
  private files: File[] = [];
  add(file: File): void {
    this.files.push(file);
  }
  get length(): number {
    return this.files.length;
  }
  getFiles(): File[] {
    return this.files;
  }
}

class DataTransferShim {
  items = new DataTransferItemListShim();
  get files(): FileList {
    const files = this.items.getFiles();
    const list = files as unknown as FileList;
    Object.defineProperty(list, "length", { value: files.length });
    return list;
  }
}

if (typeof globalThis.DataTransfer === "undefined") {
  Object.defineProperty(globalThis, "DataTransfer", {
    value: DataTransferShim,
    configurable: true,
  });
}

// jsdom does not implement ResizeObserver (used by Radix Slider and the
// editor canvas viewport). Minimal observe/unobserve stub suffices.
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverShim {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  Object.defineProperty(globalThis, "ResizeObserver", {
    value: ResizeObserverShim,
    configurable: true,
  });
}
