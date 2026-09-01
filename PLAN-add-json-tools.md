# Plan: Add JSON Conversion Tools

## Overview

Add 9 new data conversion tools using the specified packages. All tools live in the `data` category, use `processingMode: "client"`, and have `inputKind/outputKind: "text"`. One existing tool (`xml-to-json`) is replaced with a new `xml-js` implementation.

**Existing tools to keep (no changes)**: `csv-to-json`, `json-to-csv` (papaparse), `json-to-yaml`, `yaml-to-json` (js-yaml), `csv-to-xml` (fast-xml-builder)

**Existing tool to replace**: `xml-to-json` (fast-xml-parser → `xml-js`)

## Tools to Add

| # | Slug | Library | Component | Description |
|---|---|---|---|---|
| 1 | `json-to-xml` | `xml-js` | `JsonToXmlTool` | Convert JSON to XML |
| 2 | `xml-to-json` | `xml-js` | `XmlToJsonTool` | Convert XML to JSON (replaces existing) |
| 3 | `json-to-toml` | `smol-toml` | `JsonToTomlTool` | Convert JSON to TOML |
| 4 | `toml-to-json` | `smol-toml` | `TomlToJsonTool` | Convert TOML to JSON |
| 5 | `json-to-url-query` | `qs` | `JsonToUrlQueryTool` | Convert JSON to URL query string |
| 6 | `url-query-to-json` | `qs` | `UrlQueryToJsonTool` | Convert URL query string to JSON |
| 7 | `json-to-typescript` | `quicktype-core` | `JsonToTypeScriptTool` | Generate TypeScript interfaces from JSON |
| 8 | `json-to-json-schema` | custom | `JsonToJsonSchemaTool` | Generate JSON Schema from JSON |
| 9 | `json-to-sql` | custom | `JsonToSqlTool` | Generate SQL CREATE + INSERT from JSON |

## Files to Create

```
src/tools/data/json-to-xml.tsx
src/tools/data/xml-to-json.tsx       (new implementation with xml-js)
src/tools/data/json-to-toml.tsx
src/tools/data/toml-to-json.tsx
src/tools/data/json-to-url-query.tsx
src/tools/data/url-query-to-json.tsx
src/tools/data/json-to-typescript.tsx
src/tools/data/json-to-json-schema.tsx
src/tools/data/json-to-sql.tsx
```

## Files to Modify

- `src/tools/definitions.ts` — add 9 definitions, remove old `xml-to-json` entry
- `src/components/tool-loader.tsx` — add 9 dynamic imports, remove old `xml-to-json` entry
- `package.json` — add `xml-js`, `smol-toml`, `qs`, `quicktype-core` (and `@types/qs` as dev)

## Files to Delete

```
src/tools/data/xml-to-json.tsx       (old fast-xml-parser version)
```

## Packages to Install

```bash
pnpm add xml-js smol-toml qs quicktype-core
pnpm add -D @types/qs
```

Note: `js-yaml` is already installed. `fast-xml-parser` and `fast-xml-builder` are installed but only `csv-to-xml` depends on them now.

## Per-Tool Implementation

### 1. json-to-xml / 2. xml-to-json (`xml-js`)

**`json-to-xml.tsx`**
- Use `js2xml(obj, { compact: true, spaces: 2, indentText: true })`
- Options:
  - `compact` (switch, default: true) — compact vs. full mode
  - `indentSize` (select: 2/4, default: 2) — indentation
  - `includeDeclaration` (switch, default: true) — `<?xml ...?>`
  - `rootElement` (text, default: "root") — wrapper element name

**`xml-to-json.tsx`** (replaces old file)
- Use `xml2js(str, { compact: true })`
- Options:
  - `compact` (switch, default: true)
  - `keepAttributes` (switch, default: false) — include `@_` attribute keys
  - `alwaysArray` (switch, default: false) — wrap children in arrays

### 3. json-to-toml / 4. toml-to-json (`smol-toml`)

**`json-to-toml.tsx`**
- Use `stringify(value)` from `smol-toml`
- Options:
  - `indentSize` (select: 2/4/tab, default: 2)
  - `inlineTables` (switch, default: true)

**`toml-to-json.tsx`**
- Use `parse(str)` from `smol-toml`
- Options:
  - `preserveOrder` (switch, default: true) — note: smol-toml always preserves order natively

### 5. json-to-url-query / 6. url-query-to-json (`qs`)

**`json-to-url-query.tsx`**
- Use `qs.stringify(obj)`
- Options:
  - `arrayFormat` (select: brackets/indices/repeat/comma, default: brackets)
  - `encodeValues` (switch, default: true)
  - `addPrefix` (switch, default: true) — prepend `?`

**`url-query-to-json.tsx`**
- Use `qs.parse(str)`
- Options:
  - `arrayFormat` (select: brackets/indices/repeat/comma, default: brackets)
  - `depth` (number, default: 5) — max nesting depth
  - `strictDepth` (switch, default: false)

### 7. json-to-typescript (`quicktype-core`)

- Use `quicktype({ inputData, inputFormat: 'json', lang: 'typescript', rendererOptions: { 'just-types': 'true' } })`
- Options:
  - `justTypes` (switch, default: true) — types only vs. full code
  - `density` (select: normal/compact, default: normal)

### 8. json-to-json-schema (custom)

Walk the JSON and infer a schema:
- Leaf inference → `string` / `number` / `integer` / `boolean` / `null`
- Objects → `properties` map + `required` list
- Arrays → `items: schemaOf(first item)` (homogeneous) or `oneOf` (mixed)
- Options:
  - `inferRequired` (switch, default: true)
  - `detectFormat` (switch, default: false) — set `format` for date/email/uri/uuid/ipv4
  - `addTitle` (switch, default: false) — use key as title

### 9. json-to-sql (custom)

Input: JSON array of objects (or single object → wrap in array)
Output: `CREATE TABLE <name> (...)` + `INSERT INTO` per row
Type mapping:
- `string` → `TEXT`
- `integer` → `INTEGER`
- `number` → `NUMERIC`
- `boolean` → `BOOLEAN`
- `null` → `TEXT`
- nested object/array → `JSON`
- Options:
  - `dialect` (select: postgres/mysql/sqlite, default: postgres)
  - `tableName` (text, default: "my_table")
  - `includeDrop` (switch, default: false)
  - `includeCreate` (switch, default: true)
  - `batchInserts` (switch, default: false)

## Tool Definition Shape

Each definition follows `json-to-yaml` (line 1750 of `definitions.ts`):

```typescript
{
  id: "data-<slug>",
  slug: "<slug>",
  name: "<Name>",
  description: "...",
  category: "data",
  inputKind: "text",
  outputKind: "text",
  processingMode: "client",
  supportsBatch: false,
  requiresAuthentication: false,
  available: true,
  options: [...],
  keywords: [...],
  relatedToolSlugs: [...],
  faq: [{ question, answer }],
  howItWorks: ["..."],
}
```

## Component Shape

Each component follows the existing converter pattern (e.g., `JsonToYamlTool`):

```tsx
import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";

export function JsonToXmlTool({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  // ... option state

  const handleConvert = () => {
    try {
      setError("");
      // conversion logic
      setOutput(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "output.<ext>";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="tool-container space-y-4">
      {/* Input textarea */}
      {/* Options UI */}
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex gap-2">
        <Button onClick={handleConvert}>Convert</Button>
        {output && <Button onClick={handleDownload}>Download</Button>}
      </div>
      {/* Output pre */}
    </div>
  );
}
```

Note: Existing files use **named exports** (`export function`). Follow this convention.

## tool-loader.tsx Registration

```tsx
const TOOL_COMPONENTS: Record<string, React.ComponentType<{ tool: ToolDefinition }>> = {
  // ... existing entries ...
  "json-to-xml": dynamic(
    () => import("@/tools/data/json-to-xml").then(m => ({ default: m.JsonToXmlTool })),
    { loading },
  ),
  "xml-to-json": dynamic(
    () => import("@/tools/data/xml-to-json").then(m => ({ default: m.XmlToJsonTool })),
    { loading },
  ),
  "json-to-toml": dynamic(
    () => import("@/tools/data/json-to-toml").then(m => ({ default: m.JsonToTomlTool })),
    { loading },
  ),
  "toml-to-json": dynamic(
    () => import("@/tools/data/toml-to-json").then(m => ({ default: m.TomlToJsonTool })),
    { loading },
  ),
  "json-to-url-query": dynamic(
    () => import("@/tools/data/json-to-url-query").then(m => ({ default: m.JsonToUrlQueryTool })),
    { loading },
  ),
  "url-query-to-json": dynamic(
    () => import("@/tools/data/url-query-to-json").then(m => ({ default: m.UrlQueryToJsonTool })),
    { loading },
  ),
  "json-to-typescript": dynamic(
    () => import("@/tools/data/json-to-typescript").then(m => ({ default: m.JsonToTypeScriptTool })),
    { loading },
  ),
  "json-to-json-schema": dynamic(
    () => import("@/tools/data/json-to-json-schema").then(m => ({ default: m.JsonToJsonSchemaTool })),
    { loading },
  ),
  "json-to-sql": dynamic(
    () => import("@/tools/data/json-to-sql").then(m => ({ default: m.JsonToSqlTool })),
    { loading },
  ),
};
```

## Related Tool Links

Each tool should reference related tools via `relatedToolSlugs`:

| Tool | relatedToolSlugs |
|---|---|
| json-to-xml | `xml-to-json`, `json-to-csv`, `json-to-yaml` |
| xml-to-json | `json-to-xml`, `csv-to-json`, `yaml-to-json` |
| json-to-toml | `toml-to-json`, `json-to-yaml`, `json-to-csv` |
| toml-to-json | `json-to-toml`, `json-to-yaml`, `csv-to-json` |
| json-to-url-query | `url-query-to-json`, `json-to-xml` |
| url-query-to-json | `json-to-url-query`, `json-to-xml` |
| json-to-typescript | `json-to-json-schema`, `json-to-sql` |
| json-to-json-schema | `json-to-typescript`, `json-to-sql` |
| json-to-sql | `json-to-json-schema`, `json-to-typescript` |

## Execution Order

1. Install packages
2. Create all 9 component files
3. Add all 9 definitions to `definitions.ts`
4. Add all 9 registrations to `tool-loader.tsx`
5. Remove old `xml-to-json` definition, component, and registration
6. Run `pnpm lint` and fix any errors
7. Run `pnpm dev` and verify each tool renders at `/tools/<slug>`
8. Run `pnpm build` to confirm static params and sitemap

## Verification Commands

```bash
pnpm lint
pnpm dev
pnpm build
```

Then manually verify:
- `/tools/json-to-xml` renders and converts
- `/tools/xml-to-json` renders and converts
- `/tools/json-to-toml` renders and converts
- `/tools/toml-to-json` renders and converts
- `/tools/json-to-url-query` renders and converts
- `/tools/url-query-to-json` renders and converts
- `/tools/json-to-typescript` renders and generates types
- `/tools/json-to-json-schema` renders and generates schema
- `/tools/json-to-sql` renders and generates SQL
- Search finds all new tools
- Download button works on each tool
