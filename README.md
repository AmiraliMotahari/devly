# Devly

A browser-based collection of practical tools for working with files, images, PDFs, text, data, code, colors, and web content.

Devly is designed with a client-side-first approach, so many tools can process data directly in the browser without sending it to a backend. The project is still evolving, and some planned features may require additional libraries or external services.

[![Next.js 16.3.1](https://img.shields.io/badge/Next.js-16.3.1-black?logo=next.js)](https://nextjs.org/)
[![React 19.2.8](https://img.shields.io/badge/React-19.2.8-61dafb?logo=react)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind 4](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![pnpm](https://img.shields.io/badge/pnpm-10.15.1-orange?logo=pnpm)](https://pnpm.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

---

## Overview

Devly brings common utility tasks into one interface instead of requiring a separate website or application for each one.

Current tool categories include:

- Image tools
- PDF tools
- File and archive tools
- Developer tools
- Data converters
- Text utilities
- Color tools
- Web and QR tools
- Date and time utilities
- Unit converters

The project currently focuses on small, focused tools with consistent UI and reusable building blocks. More advanced file, image, PDF, offline, and AI functionality is planned.

---

## Current capabilities

Some of the currently implemented tools include:

| Category | Examples |
|---|---|
| Image | JPG/PNG/WebP conversion, resize, crop, rotate, flip, compression, filters, watermark, favicon generation |
| PDF | Merge, split, compression, rotation, PDF-to-image, PDF-to-text, image-to-PDF, image extraction |
| File | ZIP creation/extraction, encrypted ZIP, checksums, file metadata |
| Developer | JSON, YAML, XML, hashing, HMAC, UUID, JWT decoding, passwords, Base64, URL encoding, cron, base conversion |
| Data | CSV, JSON, XML, YAML, TOML and URL-query conversions |
| Text | Word/character counting, case conversion, slug generation, diff, line tools, find/replace, Markdown/HTML conversion |
| Color | Color conversion, CSS variable conversion, contrast checking |
| Web | QR code, barcodes, meta tags, robots.txt and sitemap generation |
| Date & Time | Timestamps, time zones, date differences, age calculation |
| Units | Common unit conversions |

This list describes the current direction of the project rather than promising that every format or edge case is supported.

For the wider backlog, see [`features.todo.md`](./features.todo.md).

---

## Design goals

### Client-side first

Where practical, processing happens in the browser. This is particularly useful for tools such as hashing, text transformation, color conversion, and many image/file operations.

The client-side approach is a design goal, not a blanket guarantee that every future feature will work without network access.

### Simple tools

Each tool should solve one problem clearly instead of turning every page into a large application.

### Consistent UX

Shared components are used for common interactions such as uploading files, copying results, displaying output, forms, tool layouts, and related-tool navigation.

### Reusable architecture

New tools should build on shared primitives and processing utilities rather than reimplementing the same behavior repeatedly.

### Privacy-conscious defaults

For tools that can operate locally, keeping processing in the browser can reduce the amount of data that needs to leave the user's device.

---

## Architecture

Devly uses a catalog-driven tool architecture.

Tool metadata is kept in `src/tools/definitions.ts`, which acts as the main source of truth for tool information used across the application.

```text
src/
├── app/                    # Next.js App Router
│   ├── tools/[slug]/       # Tool pages
│   ├── category/           # Category pages
│   ├── sitemap.ts          # Sitemap generation
│   ├── manifest.ts         # Web app manifest
│   └── ...
│
├── components/             # Shared UI and application components
│   ├── ui/                 # shadcn/ui components
│   ├── tool-loader.tsx     # Tool component registry
│   ├── command-palette/    # Command/search interface
│   ├── upload-zone/        # File upload UI
│   ├── tool-shell/         # Shared tool layout
│   ├── tool-forms/         # Form primitives
│   ├── result-panel/       # Result/output UI
│   ├── related-tools/      # Related tool links
│   ├── search/             # Search UI
│   └── ...
│
├── hooks/                  # Reusable React hooks
├── lib/                    # Shared utilities
│
├── tools/
│   ├── definitions.ts      # Tool metadata / source of truth
│   ├── search.ts           # Search-related logic
│   ├── image/              # Image tools
│   ├── pdf/                # PDF tools
│   ├── files/              # File/archive tools
│   ├── developer/          # Developer tools
│   ├── data/               # Data converters
│   ├── colors/             # Color tools
│   ├── text/               # Text tools
│   ├── web/                # Web/QR tools
│   ├── datetime/           # Date/time tools
│   └── converters/         # Unit converters
│
└── types/
    └── tool.ts             # Shared tool types
```

### Tool definition

Tools are described using a shared `ToolDefinition` model.

A definition contains information such as:

```ts
{
  id,
  slug,
  name,
  description,
  category,
  aliases,

  inputKind,
  outputKind,
  processingMode,

  supportsBatch,
  requiresAuthentication,

  acceptFileTypes,
  maxFileSizeMB,
  maxFiles,

  options,
  keywords,
  relatedToolSlugs,

  faq,
  howItWorks,

  available: true,
}
```

The exact shape may evolve as the tool system grows.

### Adding a tool

The general flow is:

```text
1. Add the tool definition
2. Create the tool component
3. Register the component
4. Run lint/tests
5. Verify the route and UX
```

See `AGENTS.md` for the current development guidelines.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.3.1 |
| Runtime | React 19.2.8 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Icons | lucide-react |
| PDF | pdf-lib + pdfjs-dist |
| Images | Browser Canvas APIs and related browser APIs |
| Barcodes | bwip-js |
| QR | qr-code-styling + qrcode |
| ZIP | JSZip + Pako |
| Cryptography | Web Crypto API |
| 3D | Three.js + @react-three/fiber |
| Theming | next-themes |
| Testing | Vitest + React Testing Library + Playwright |
| Linting | ESLint + eslint-config-next |

The stack may change as individual tools and the underlying processing architecture are improved.

---

## Project structure

Tool definitions and UI components are intentionally separated.

A tool generally consists of:

```text
Tool definition
      │
      ├── metadata
      ├── accepted input
      ├── options
      ├── related tools
      │
      └── UI component
             │
             ├── input
             ├── processing
             └── output
```

The goal is to keep the UI layer focused on interaction while reusable processing logic lives in appropriate utility modules.

---

## Development

### Requirements

- Node.js
- pnpm

### Setup

```bash
git clone <your-repo-url> devly
cd devly
pnpm install
```

Start the development server:

```bash
pnpm dev
```

Then open:

```text
http://localhost:3000
```

Create a production build with:

```bash
pnpm build
pnpm start
```

---

## Available scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start the development server |
| `pnpm build` | Create a production build |
| `pnpm start` | Run the production build |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run Vitest tests |
| `pnpm test:watch` | Run Vitest in watch mode |
| `pnpm test:coverage` | Generate test coverage |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm test:e2e:ui` | Open Playwright UI mode |
| `pnpm test:e2e:dev` | Run E2E tests against the development server |
| `pnpm analyze` | Analyze the production bundle |
| `pnpm debug` | Start with the Node inspector |

---

## Testing

Devly uses both unit/component tests and end-to-end tests.

```text
Unit / component tests
    Vitest
    React Testing Library

End-to-end tests
    Playwright
```

Typical commands:

```bash
pnpm test
pnpm test:e2e
```

The test suite is still being expanded, particularly around file processing and browser-specific behavior.

See `TESTING.md` for the project's testing conventions.

---

## Roadmap

The project is under active development. Planned work includes:

### Foundation

- Improve and simplify the file, image, and PDF processing architecture
- Expand shared validation and upload components
- Improve test organization and coverage
- Add CI/CD
- Remove unused dependencies
- Improve documentation

### More utility tools

- Additional image formats and editing capabilities
- More PDF editing and security operations
- Document format conversions
- Additional data converters
- Networking and regex utilities
- More generators
- Currency conversion
- Expanded unit conversion

### Higher-level workflows

- Universal file metadata and analysis
- File comparison
- Broader conversion workflows
- More batch-processing capabilities

### Offline / PWA

- PWA support
- Offline-capable tools
- Local-first processing where appropriate

### AI

Planned AI features include:

- AI-assisted chat
- Document and PDF summarization
- OCR and structured extraction
- Text rewriting and translation
- AI-assisted blog writing
- SEO analysis

These are roadmap items, not current capabilities.

See [`features.todo.md`](./features.todo.md) for the detailed backlog.

---

## Project principles

1. **Client-side first** — Prefer local processing when the browser can handle the task well.
2. **Reusable components** — Shared behavior should live in shared components or utilities.
3. **Focused tools** — Keep individual utilities understandable and useful.
4. **Progressive enhancement** — Add more capable processing without making simple tools unnecessarily complex.
5. **Accessibility** — Keyboard access, clear feedback, and readable interfaces matter.
6. **Maintainability** — Prefer simple architecture over clever abstractions.

---

## Contributing

Contributions are welcome.

Before adding a new tool, check whether an existing tool or shared processing utility can be extended instead of introducing duplicate functionality.

For project-specific development guidance, see:

- `AGENTS.md`
- `TESTING.md`
- `features.todo.md`

---

## License

MIT. See [`LICENSE`](./LICENSE).

---

<p align="center">
  Built with TypeScript, React, Next.js, and a collection of browser APIs and open-source libraries.
</p>
