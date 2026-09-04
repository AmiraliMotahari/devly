---

# Canonical Devly TODO

I've reorganized everything into a structure I'd actually use for development.

---

# Phase 0 — Foundation & Engineering

These should happen **before adding a large number of new tools**.

### Architecture

* [ ] Rewrite **file architecture** from the ground up
* [ ] Rewrite **image architecture** from the ground up
* [ ] Rewrite **PDF architecture** from the ground up
* [ ] Establish shared processing pipeline/API for tools
* [ ] Standardize input/output interfaces
* [ ] Standardize validation with Zod
* [ ] Standardize error handling
* [ ] Standardize loading/progress states
* [ ] Standardize download/export behavior
* [ ] Standardize drag-and-drop/upload UX
* [ ] Create shared file-processing utilities
* [ ] Create shared image-processing utilities
* [ ] Create shared PDF-processing utilities

### Testing

* [x] Comprehensive unit tests with Vitest
* [x] Playwright E2E tests
* [x] Move all tests/E2E tests to `/tests`
* [ ] Increase coverage for shared utilities
* [ ] Add regression tests for file/PDF/image processing

### Infrastructure

* [ ] GitHub Actions CI
* [ ] Lint/typecheck/test/build pipeline
* [ ] Production build verification
* [ ] Dependency/unused package cleanup
* [ ] Update README
* [ ] Establish contribution/development documentation

### UX platform

* [x] Reusable copy button
* [x] Modern compact header
* [x] Themed code blocks
* [x] Improved command palette
* [x] Instant navigation/prefetching/cache-components
* [ ] Standardized tool page/shell architecture
* [ ] Standardized empty/loading/error/success states
* [ ] Keyboard accessibility review
* [ ] Mobile UX review

### Upload system

* [ ] Better upload/dropzone experience
* [ ] Evaluate `react-upload-zone`
* [ ] Client-side validation with Zod
* [ ] File-size/type validation
* [ ] Multiple file upload
* [ ] Upload progress
* [ ] Cancel/remove/retry
* [ ] Drag-and-drop everywhere

**Important:** `react-upload-zone` should be treated as an implementation option, not as a product feature.

---

# Phase 1 — Existing Tools: Finish & Polish

This is where I'd focus most of the immediate work.

## Color

* [x] Any color → any color
* [x] CSS variable batch conversion
* [ ] Color picker
* [ ] Random color generator
* [ ] Color palette generator
* [ ] Gradient generator
* [ ] Contrast checker improvements
* [ ] WCAG checker
* [ ] Color blindness simulator
* [ ] Tailwind color converter
* [ ] Color → Tailwind CSS
* [ ] Image color extractor
* [ ] Dominant color detector

---

# UUID / Security / Crypto

### UUID

* [x] UUID generator
* [x] Multiple UUID versions
* [x] UUID v1
* [x] UUID v3
* [x] UUID v4
* [x] UUID v5
* [x] UUID v6
* [x] UUID v7
* [ ] UUID decoding/inspection

### Hashing

* [x] Hash generator
* [x] MD5
* [x] SHA-1
* [x] SHA-256
* [x] SHA-512
* [x] HMAC

### Encryption

* [x] Text encryption/decryption
* [ ] File encryption/decryption
* [ ] RSA key generation
* [ ] Public/private key utilities
* [ ] JWT generator
* [ ] JWT inspector enhancements
* [ ] Random string generator
* [x] Password generator
* [ ] Password strength analyzer

---

# File Tools

## Archive

* [x] Create ZIP
* [x] Extract ZIP
* [x] Password ZIP
* [x] Extract encrypted ZIP
* [ ] Extract 7z
* [ ] Extract TAR
* [ ] Extract TAR.GZ
* [ ] Video compression
* [ ] Split large files
* [ ] Merge files
* [ ] Email optimization
* [ ] Web optimization

## File manipulation

* [x] File checksum
* [x] File metadata viewer
* [ ] Rename multiple files
* [ ] Change file extension
* [ ] Detect file type
* [ ] File comparison
* [ ] Binary/hex viewer
* [ ] File → Base64
* [ ] Base64 → file
* [ ] Data URL generator

## Universal file inspection

This should become one major feature rather than several unrelated tools:

### Universal File Analyzer

* [ ] Automatic file detection
* [ ] MIME/type detection
* [ ] Size information
* [ ] Dimensions
* [ ] Duration
* [ ] Codec
* [ ] Bitrate
* [ ] Metadata
* [ ] EXIF
* [ ] Hash/checksum
* [ ] Creation/modification information
* [ ] Suggested actions/tools based on file type

This could become one of Devly's strongest differentiators.

---

# Image Tools

## Existing

* [x] JPG ↔ PNG
* [x] JPG ↔ WebP
* [x] PNG ↔ WebP
* [x] Resize
* [x] Crop
* [x] Rotate
* [x] Flip
* [x] Compress
* [x] Blur
* [x] Grayscale
* [x] Watermark
* [x] Favicon generator
* [x] Social image optimizer

## Conversion

* [ ] AVIF
* [ ] HEIC → JPG
* [ ] SVG → PNG
* [ ] SVG → JPG
* [ ] GIF → video
* [ ] TIFF → JPG/PNG
* [ ] BMP → JPG/PNG
* [ ] WebP compression with `@jsquash/webp`

## Editing

* [ ] Advanced image editor
* [ ] Sharpen
* [ ] Background removal
* [ ] Text overlay
* [ ] Rounded corners
* [ ] Border generator
* [ ] Image splitter
* [ ] Image merger
* [ ] Collage maker

### Advanced editor decision

* [ ] Evaluate `filerobot-image-editor`

I'd make this **one advanced image editor**, rather than creating separate mini-tools for every editing operation.

---

# Image analysis

* [ ] Image metadata/EXIF viewer
* [ ] EXIF remover
* [ ] Color palette extractor
* [ ] Dominant color detector
* [ ] Image → ASCII
* [ ] Image comparison
* [ ] Before/after slider

---

# Image generators

* [x] Favicon generator
* [ ] App icon generator
* [ ] PWA icon generator
* [ ] Open Graph image generator
* [ ] Twitter/X card generator
* [ ] Screenshot resizer
* [ ] Passport/photo cropper

---

# Image optimization presets

Instead of creating separate tools:

### "Optimize Image For..."

* [ ] Website
* [ ] Email
* [ ] Instagram
* [ ] LinkedIn
* [ ] WhatsApp
* [ ] WordPress
* [ ] E-commerce

This should extend the existing image optimizer.

---

# PDF

This is the area where I strongly agree with your V1 decision:

> **PDF needs to be rewritten from the ground up.**

Do that before adding 20 more PDF features.

## Existing

* [x] Merge PDF
* [x] Split PDF
* [x] Compress PDF
* [x] Rotate PDF
* [x] Extract PDF images
* [x] PDF → images
* [x] PDF → text
* [x] Images → PDF

## Page manipulation

* [ ] Delete pages
* [ ] Reorder pages
* [ ] Extract pages
* [ ] Insert pages
* [ ] Duplicate pages
* [ ] Rotate individual pages

## Annotation/editing

* [ ] Add text
* [ ] Add signature
* [ ] Add watermark
* [ ] Annotate
* [ ] Highlight
* [ ] Draw
* [ ] Add page numbers
* [ ] Add headers/footers
* [ ] Fill PDF forms

## Conversion

* [ ] PDF → JPG
* [ ] PDF → PNG
* [ ] PDF → WebP
* [ ] PDF → HTML
* [ ] PDF → Markdown
* [ ] PDF → Word
* [ ] Word → PDF
* [ ] Excel → PDF
* [ ] PowerPoint → PDF

## Security

* [ ] Encrypt PDF
* [ ] Decrypt PDF
* [ ] Add password
* [ ] Remove password
* [ ] Remove metadata
* [ ] Redact PDF

---

# Documents

I would treat this as a separate processing subsystem.

## Conversion

* [ ] DOCX → PDF
* [ ] DOCX → HTML
* [ ] DOCX → Markdown
* [ ] DOCX → TXT
* [ ] Markdown → PDF
* [ ] HTML → PDF
* [ ] TXT → PDF
* [ ] RTF conversion
* [ ] ODT conversion
* [ ] EPUB conversion

## Processing

* [ ] Text extraction
* [ ] Markdown formatter
* [ ] Markdown preview
* [ ] HTML cleaner

---

# Text Tools

## Existing

* [x] Word counter
* [x] Character counter
* [x] Sort lines
* [x] Remove duplicate lines
* [x] Whitespace cleaner
* [x] Find & replace
* [x] Text diff
* [x] Case converter
* [x] Slug generator
* [x] Lorem ipsum
* [x] Markdown → HTML
* [x] HTML → Markdown
* [x] HTML minifier
* [x] Encrypt text

## Add

* [ ] Line counter
* [ ] Reverse text
* [ ] CSV formatter
* [ ] SQL formatter
* [ ] CSS formatter
* [ ] JavaScript formatter
* [ ] Markdown formatter

## Encoding

* [x] Base64
* [x] URL encode/decode
* [x] HTML encode/decode
* [ ] Unicode converter
* [ ] UTF-8 tools
* [ ] Morse code
* [ ] ASCII tools

---

# Developer Tools

## JSON

* [x] JSON formatter
* [x] JSON validator
* [x] JSON minifier
* [x] JSON diff
* [x] JSON schema generator
* [ ] JSONPath tester

## Web

* [x] HTML minifier
* [ ] CSS minifier
* [ ] JavaScript minifier
* [ ] URL parser
* [ ] User-Agent parser
* [ ] HTTP header viewer
* [ ] MIME lookup
* [ ] HTTP status lookup

## XML/YAML

* [x] XML formatter
* [x] YAML formatter
* [x] XML → JSON
* [x] JSON → XML
* [x] YAML → JSON
* [x] JSON → YAML

## Developer utilities

* [x] Cron parser
* [x] Timestamp converter
* [x] Base converter

---

# Data Tools

Existing:

* [x] CSV → JSON
* [x] JSON → CSV
* [x] CSV → XML
* [x] JSON → SQL
* [x] JSON → TOML
* [x] TOML → JSON
* [x] JSON → URL Query
* [x] URL Query → JSON
* [x] JSON → JSON Schema

Add:

* [ ] Excel → CSV
* [ ] CSV → Excel
* [ ] CSV cleaner
* [ ] CSV splitter
* [ ] CSV merger
* [ ] TSV → CSV
* [ ] SQL → CSV
* [ ] SQL formatter
* [ ] Fake dataset generator
* [ ] Dataset sampler
* [ ] Duplicate row remover
* [ ] Column transformer

---

# Web Tools

Existing:

* [x] QR generator
* [x] Barcode generator
* [x] Meta tag generator
* [x] robots.txt generator
* [x] Sitemap generator

Add:

* [ ] Website screenshot
* [ ] HTML → screenshot
* [ ] URL → PDF
* [ ] URL → image
* [ ] UTM builder
* [ ] Open Graph generator
* [ ] manifest generator
* [ ] CSS gradient generator
* [ ] CSS shadow generator

---

# QR / Barcode

## QR

* [x] URL QR
* [x] Wi-Fi QR
* [x] vCard QR
* [x] Email QR
* [x] SMS QR
* [ ] QR reader
* [ ] Bitcoin/address QR

## Barcode

* [x] Barcode generator
* [x] EAN
* [x] UPC
* [x] Code 128
* [x] Data Matrix

For the barcode generator, I'd remove "partial" once support is properly validated and tested.

---

# Date & Time

Existing:

* [x] Unix timestamp conversion
* [x] Timestamp → date
* [x] Date → timestamp
* [x] Timezone converter
* [x] Date difference
* [x] Age calculator
* [x] Cron parser

Add:

* [ ] ISO 8601 converter
* [ ] Date calculator
* [ ] Business days calculator
* [ ] Cron generator
* [ ] Unix timestamp generator

---

# Math / Number

* [ ] Percentage calculator
* [ ] VAT calculator
* [ ] Compound interest
* [ ] Loan calculator
* [ ] Currency converter
* [ ] Binary calculator
* [ ] Scientific calculator
* [ ] Random number generator
* [ ] Prime checker
* [ ] Factorial
* [ ] GCD / LCM
* [x] Base converter
* [ ] Roman numeral converter

---

# Unit Conversion

Rather than separate tools, I'd make one **Universal Unit Converter**.

### Categories

* [ ] Length
* [ ] Weight
* [ ] Temperature
* [ ] Data
* [ ] Network speed
* [ ] Area
* [ ] Volume
* [ ] Pressure
* [ ] Energy
* [ ] Power
* [ ] Speed
* [ ] Time
* [ ] Frequency

---

# Currency

* [ ] Currency converter
* [ ] Frankfurter API integration
* [ ] Multi-currency comparison
* [ ] Historical rates
* [ ] Favorite currencies
* [ ] Recent conversions

Crypto should remain separate unless you decide to add a market-data provider.

---

# File Comparison

* [x] Text diff
* [x] JSON diff
* [ ] CSV diff
* [ ] Image comparison
* [ ] PDF comparison
* [ ] Folder comparison
* [ ] Hash comparison

---

# Generators

Some of these duplicate existing categories and should ultimately live there.

* [x] UUID
* [x] Password
* [x] QR
* [x] Barcode
* [x] Lorem ipsum
* [ ] Username
* [ ] Random string
* [ ] Fake data
* [ ] JSON mock data
* [ ] CSV mock data
* [ ] SQL mock data
* [ ] Color palette
* [ ] Gradient
* [ ] CSS box shadow
* [ ] CSS border radius
* [ ] Regex generator
* [ ] Cron generator

---

# Networking

This is a strong future category.

* [ ] IP lookup
* [ ] IPv4 converter
* [ ] IPv6 converter
* [ ] CIDR calculator
* [ ] Subnet calculator
* [ ] DNS record lookup
* [ ] URL parser
* [ ] HTTP header viewer

---

# Git

Another clean standalone category.

* [ ] Gitignore generator
* [ ] Git command generator
* [ ] Git diff viewer
* [ ] Commit message generator

---

# Regex

Make this one unified Regex workspace:

* [ ] Regex tester
* [ ] Regex explanation
* [ ] Regex generator
* [ ] Regex escape/unescape

---

# SEO

Existing:

* [x] Meta tag generator
* [x] Sitemap generator
* [x] robots.txt generator

Add:

* [ ] Meta title checker
* [ ] Meta description checker
* [ ] Schema.org generator
* [ ] Open Graph preview
* [ ] SEO page analyzer
* [ ] Website SEO audit

---

# Universal Converter

This deserves special consideration.

Rather than literally supporting "everything → everything", I would build it as:

### Universal Converter

```text
Upload / paste input
        ↓
Detect format
        ↓
Show compatible conversions
        ↓
Choose output
        ↓
Configure options
        ↓
Convert
        ↓
Download
```

Features:

* [ ] Automatic format detection
* [ ] Supported output discovery
* [ ] Conversion graph
* [ ] Multi-file conversion
* [ ] Batch conversion
* [ ] Conversion options
* [ ] Download all
* [ ] Conversion history during session

This should sit **on top of** your individual conversion engines rather than replacing them.

---

# PWA

## V2

* [ ] Full PWA support
* [ ] Installable app
* [ ] App manifest
* [ ] Service worker
* [ ] Offline tool shell
* [ ] Offline-capable tools
* [ ] Cache static assets
* [ ] Offline queue
* [ ] Network status indicator

But I would change your "Use offline" item to:

> **Make eligible tools offline-capable**

Not every Devly feature will or should work offline.

Image manipulation, hashing, UUID, text processing, color conversion, many developer tools, etc. are excellent candidates.

Network-dependent tools such as currency rates, DNS lookup, URL screenshots, AI, etc. aren't.

---

# AI

I would **move all AI work after the non-AI utility platform is mature.**

## AI utilities

* [ ] PDF summarization
* [ ] Document summarization
* [ ] Structured-data extraction
* [ ] OCR
* [ ] Image → text
* [ ] PDF → structured JSON
* [ ] Alt-text generation
* [ ] Text rewriting
* [ ] Document translation
* [ ] Audio transcription
* [ ] Video transcription
* [ ] Caption generation
* [ ] Subtitle generation

---

# AI Chat

### AI Chat Box

* [ ] Shadcn-based chat UI
* [ ] Streaming responses
* [ ] Markdown rendering
* [ ] Code blocks
* [ ] Copy actions
* [ ] File attachments
* [ ] Context-aware tool integration

But don't make this simply a generic ChatGPT clone.

The better direction is:

> **AI that can operate on Devly tools/files.**

For example:

```text
Upload CSV
   ↓
AI understands it
   ↓
"Find duplicate rows"
   ↓
AI invokes CSV cleaner
```

That becomes much more valuable.

---

# AI Blog Writer

Your idea is actually stronger than a generic AI writer.

### Workflow

```text
User goal
   ↓
Ask questions
   ↓
Research
   ↓
Keyword analysis
   ↓
Search intent
   ↓
Outline
   ↓
Draft
   ↓
SEO optimization
   ↓
Fact/source review
   ↓
Export
```

Outputs:

* [ ] Markdown
* [ ] TXT
* [ ] HTML
* [ ] DOCX
* [ ] PDF

---

# AI SEO Analyzer

This should eventually become:

### Website SEO Auditor

* [ ] Crawl website
* [ ] Technical SEO analysis
* [ ] Meta analysis
* [ ] Heading analysis
* [ ] Internal links
* [ ] Images/alt text
* [ ] Sitemap
* [ ] robots.txt
* [ ] Schema
* [ ] Open Graph
* [ ] Performance signals
* [ ] Content analysis
* [ ] Recommendations
* [ ] Step-by-step fixes
* [ ] Priority/severity scoring

---

# OCR

I'd merge this into the AI/document subsystem instead of making it a disconnected category.

* [ ] Image → text
* [ ] PDF → text
* [ ] Receipt scanner
* [ ] Invoice extraction
* [ ] ID/document extraction
* [ ] Handwriting recognition
* [ ] Table extraction
* [ ] Screenshot → text

---

# E-books

Lower priority:

* [ ] EPUB → PDF
* [ ] EPUB → TXT
* [ ] EPUB → HTML
* [ ] PDF → EPUB
* [ ] MOBI → EPUB
* [ ] EPUB metadata extraction
* [ ] Cover extraction
* [ ] Metadata editor

---

# Recommended Roadmap

I would **not** implement these strictly in the order they appear in your original V1/V2/V3 list.

I'd use this:

## V1.0 — Foundation

```text
Architecture
Testing
CI/CD
Validation
Upload system
Shared components
File/image/PDF architecture
```

This is the prerequisite layer.

---

## V1.1 — Finish current tools

Prioritize:

```text
Color
UUID
Crypto
File
Image
PDF
Text
JSON/data
QR/barcode
Date/time
Developer tools
```

Finish the tools you already have before creating dozens of new ones.

---

## V1.2 — High-value additions

Then:

```text
Currency
Universal Unit Converter
Universal File Analyzer
File comparison
Image comparison
Networking tools
Regex workspace
Git utilities
Generators
```

These are relatively coherent with Devly's current identity.

---

## V1.3 — Universal workflows

This is where Devly becomes more than a collection of tiny utilities:

### Universal File Analyzer

```text
Upload file
→ Detect
→ Inspect
→ Recommended tools
→ Process
```

### Universal Converter

```text
Input
→ Detect
→ Compatible formats
→ Convert
```

### Universal Comparison

```text
Text
JSON
CSV
Image
PDF
Files
```

This is a much better product architecture than having 200 disconnected pages.

---

# V2 — Offline Devly

```text
PWA
Offline cache
Offline processing
Installability
Background processing
Local file workflows
```

The key goal should be:

> **Privacy-first, client-side utilities that continue working without an internet connection.**

This fits Devly extremely well.

---

# V3 — AI Devly

Then:

```text
AI Chat
AI File Assistant
AI OCR
AI Document Processing
AI Blog Writer
AI SEO Auditor
```

And eventually, the AI should be able to **invoke Devly's existing tools** rather than simply generate text.

---

# What I would remove from the TODO list

Several items shouldn't exist as independent TODOs.

### Don't track these as separate features

`HEX ↔ RGB`, `RGB ↔ HSL`, etc.

→ Track **Color Converter**

`JPG ↔ PNG`, `JPG ↔ WebP`, `PNG ↔ WebP`

→ Track **Image Converter**

`Wi-Fi QR`, `vCard QR`, `URL QR`, etc.

→ Track **QR Generator**

`EAN`, `UPC`, `Code 128`, etc.

→ Track **Barcode Generator**

`Unix timestamp`, `timestamp → date`, `date → timestamp`

→ Track **Date/Time Converter**

`Length`, `weight`, `temperature`, etc.

→ Track **Unit Converter**

`PDF → JPG`, `PDF → PNG`, `PDF → WebP`

→ Track **PDF → Image**

`Encrypt PDF`, `Decrypt PDF`, `Add password`, `Remove password`

→ Track **PDF Security**

This dramatically reduces the perceived size of the backlog.

---

# My priority ranking

From a senior product/engineering perspective:

| Priority | Area                        | Why                                 |
| -------- | --------------------------- | ----------------------------------- |
| P0       | File/Image/PDF architecture | Existing foundation needs to scale  |
| P0       | Validation/upload system    | Shared by many tools                |
| P0       | Tests + CI                  | Prevent regressions                 |
| P0       | Dependency cleanup          | Keeps project maintainable          |
| P1       | Finish existing tools       | Better ROI than adding more         |
| P1       | Universal File Analyzer     | Strong Devly differentiator         |
| P1       | Universal Unit Converter    | High utility                        |
| P1       | Currency                    | Very useful, relatively simple      |
| P1       | File comparison             | Natural extension                   |
| P1       | Networking/Regex/Git        | Strong developer audience           |
| P2       | Universal Converter         | Powerful but architecturally larger |
| P2       | Advanced image editor       | Useful but heavier dependency       |
| P2       | More document conversions   | Large scope                         |
| P2       | E-book tools                | Lower demand                        |
| P3       | PWA/offline                 | Excellent strategic direction       |
| P3       | AI utilities                | Valuable once platform is mature    |
| P3       | AI blog writer              | Complex                             |
| P3       | AI SEO analyzer             | Complex + infrastructure heavy      |

---

# One important architectural recommendation

I would structure Devly around **capabilities**, not individual pages:

```text
Devly
├── Core
│   ├── validation
│   ├── upload
│   ├── download
│   ├── clipboard
│   ├── workers
│   └── processing
│
├── File Engine
├── Image Engine
├── PDF Engine
├── Document Engine
├── Data Engine
├── Text Engine
├── Crypto Engine
│
└── Tools
    ├── image/
    ├── pdf/
    ├── files/
    ├── data/
    ├── developer/
    ├── text/
    ├── color/
    ├── web/
    └── generators/
```

Then tools become thin UI layers over reusable engines.

For example:

```text
compress-image
resize-image
convert-image
watermark-image
social-image-optimizer
```

can all share the same image engine.

Likewise:

```text
merge-pdf
split-pdf
rotate-pdf
compress-pdf
pdf-to-images
```

should share the PDF engine.

That architecture will matter **much more** than adding another 50 tools.

## Final recommendation

Your original **V1/V2/V3 roadmap is directionally good**, but the second list is better treated as the **feature inventory**. I would merge them into the hierarchy above and make the actual roadmap:

```text
V1
  Foundation
  Existing-tool completion
  File/Image/PDF rewrite
  Universal File Analyzer
  Universal Unit Converter
  Currency
  Comparison
  Developer/networking/regex tools

V2
  Universal Converter
  PWA
  Offline processing
  Local-first architecture

V3
  AI Chat
  AI File Assistant
  OCR
  AI Blog Writer
  AI SEO Auditor
```

The most important strategic change I'd make is **not trying to maximize the number of tools**. Build a strong processing engine underneath Devly and let many tools become small compositions of those engines. That will make the codebase substantially easier to maintain and will also make features like the Universal Converter, offline mode, batch processing, and AI integration much easier later.
