import { describe, expect, it } from "vitest";
import {
  csvToArray,
  escapeCsvValue,
  flattenObject,
  jsonArrayToCsv,
  normalizeSeparator,
} from "@/tools/data/lib";

describe("normalizeSeparator", () => {
  it("maps 'tab' to a tab character", () => {
    expect(normalizeSeparator("tab")).toBe("\t");
  });

  it("passes through other separators unchanged", () => {
    expect(normalizeSeparator(",")).toBe(",");
    expect(normalizeSeparator(";")).toBe(";");
    expect(normalizeSeparator("|")).toBe("|");
  });
});

describe("csvToArray", () => {
  it("parses a simple CSV with headers into keyed objects", () => {
    const rows = csvToArray("name,age\nAlice,30\nBob,25");
    expect(rows).toEqual([
      { name: "Alice", age: "30" },
      { name: "Bob", age: "25" },
    ]);
  });

  it("normalizes header names to snake_case", () => {
    const rows = csvToArray("First Name,Last Name\nAda,Lovelace");
    expect(rows[0]).toEqual({ first_name: "Ada", last_name: "Lovelace" });
  });

  it("handles CRLF line endings", () => {
    const rows = csvToArray("a,b\r\n1,2\r\n");
    expect(rows).toEqual([{ a: "1", b: "2" }]);
  });

  it("ignores blank lines", () => {
    const rows = csvToArray("a,b\n\n1,2\n\n");
    expect(rows).toEqual([{ a: "1", b: "2" }]);
  });

  it("returns [] for empty input", () => {
    expect(csvToArray("")).toEqual([]);
    expect(csvToArray("\n\n")).toEqual([]);
  });

  it("respects custom separators", () => {
    const rows = csvToArray("a;b\n1;2", ";");
    expect(rows).toEqual([{ a: "1", b: "2" }]);
  });

  it("supports headerless mode with generated column names", () => {
    const rows = csvToArray("1,2\n3,4", ",", false);
    expect(rows).toEqual([
      { col1: "1", col2: "2" },
      { col1: "3", col2: "4" },
    ]);
  });

  it("pads missing trailing values with empty strings", () => {
    const rows = csvToArray("a,b,c\n1,2");
    expect(rows[0]).toEqual({ a: "1", b: "2", c: "" });
  });

  it("unquotes quoted values", () => {
    const rows = csvToArray('name,city\n"Smith, John","NYC"');
    expect(rows[0]).toEqual({ name: "Smith, John", city: "NYC" });
  });

  it("preserves literal doubled quotes inside quoted values", () => {
    const rows = csvToArray('name\n"say ""hi"""');
    expect(rows[0]).toEqual({ name: 'say "hi"' });
  });
});

describe("escapeCsvValue", () => {
  it("leaves plain values unquoted", () => {
    expect(escapeCsvValue("hello", ",")).toBe("hello");
  });

  it("quotes values containing the separator", () => {
    expect(escapeCsvValue("a,b", ",")).toBe('"a,b"');
  });

  it("doubles embedded quotes", () => {
    expect(escapeCsvValue('say "hi"', ",")).toBe('"say ""hi"""');
  });

  it("quotes values with newlines", () => {
    expect(escapeCsvValue("line1\nline2", ",")).toBe('"line1\nline2"');
  });

  it("quotes empty string only when separator requires it? — no, empty stays empty", () => {
    expect(escapeCsvValue("", ",")).toBe("");
  });

  it("respects the active separator", () => {
    // A comma is fine in a semicolon-separated file
    expect(escapeCsvValue("a,b", ";")).toBe("a,b");
  });
});

describe("flattenObject", () => {
  it("flattens nested objects with dot notation", () => {
    expect(
      flattenObject({ user: { name: "Ada", meta: { age: 36 } } }),
    ).toEqual({ "user.name": "Ada", "user.meta.age": "36" });
  });

  it("stringifies arrays as JSON", () => {
    expect(flattenObject({ tags: ["a", "b"] })).toEqual({
      tags: '["a","b"]',
    });
  });

  it("renders null and undefined as empty strings", () => {
    expect(flattenObject({ a: null, b: undefined })).toEqual({
      a: "",
      b: "",
    });
  });

  it("stringifies primitives", () => {
    expect(flattenObject({ n: 1, b: true, s: "x" })).toEqual({
      n: "1",
      b: "true",
      s: "x",
    });
  });

  it("flattens empty objects to nothing", () => {
    expect(flattenObject({})).toEqual({});
  });
});

describe("jsonArrayToCsv", () => {
  it("converts a flat array of objects to CSV", () => {
    const csv = jsonArrayToCsv(
      [{ name: "Alice", age: 30 }],
      ",",
      false,
      true,
    );
    const [header, row] = csv.split("\n");
    expect(header).toBe("name,age");
    expect(row).toBe("Alice,30");
  });

  it("returns empty string for an empty array", () => {
    expect(jsonArrayToCsv([], ",", false, true)).toBe("");
  });

  it("uses union of keys across rows when consistentColumns is on", () => {
    const csv = jsonArrayToCsv(
      [
        { a: "1", b: "2" },
        { a: "3", c: "4" },
      ],
      ",",
      false,
      true,
    );
    const [header, row1, row2] = csv.split("\n");
    expect(header.split(",")).toEqual(["a", "b", "c"]);
    expect(row1).toBe("1,2,");
    expect(row2).toBe("3,,4");
  });

  it("uses first row keys when consistentColumns is off", () => {
    const csv = jsonArrayToCsv(
      [
        { a: "1", b: "2" },
        { a: "3", c: "4" },
      ],
      ",",
      false,
      false,
    );
    const [header] = csv.split("\n");
    expect(header.split(",")).toEqual(["a", "b"]);
  });

  it("flattens nested objects when flattenNested is on", () => {
    const csv = jsonArrayToCsv(
      [{ user: { name: "Ada" } }],
      ",",
      true,
      true,
    );
    expect(csv.split("\n")[0]).toBe("user.name");
    expect(csv.split("\n")[1]).toBe("Ada");
  });
});
