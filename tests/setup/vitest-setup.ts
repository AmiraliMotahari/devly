import "@testing-library/jest-dom/vitest";

// jsdom lacks fetch-level primitives some libs expect; keep tests honest by
// only polyfilling what jsdom genuinely cannot provide.
if (typeof globalThis.crypto === "undefined" || !globalThis.crypto.subtle) {
  // Web Crypto is needed by encrypted-archive unit tests. Node provides
  // webcrypto; jsdom does not implement it.
  const { webcrypto } = await import("node:crypto");
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
}

// jsdom implements TextEncoder/TextDecoder but not on the global in some
// versions — guard rather than assume.
if (typeof globalThis.TextEncoder === "undefined") {
  const { TextEncoder, TextDecoder } = await import("node:util");
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
