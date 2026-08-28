# Project: devly

## Overview
**devly** is a Next.js application built with React 19, TypeScript, and Tailwind CSS. It follows a modern frontend architecture using shadcn UI components and Radix UI primitives.

## Architecture

### Core Layers

1. **App Layer (`src/app`)**
   - Main routing and page definitions
   - Layout management (`layout.tsx`)
   - Global styles and assets (`globals.css`)
   - Error handling (`error.tsx`, `global-error.tsx`)
   - Dynamic routes and categories

2. **Components (`src/components`)**
   - Reusable UI building blocks
   - Navigation and tooling components
   - Theme and provider wrappers
   - Upload zone and utility components

3. **Hooks (`src/hooks`)**
   - Custom hook implementations
   - Device detection (`use-mobile`)
   - Apple-specific logic (`use-isApple`)

4. **Lib (`src/lib`)**
   - Shared utilities and constants
   - Security-related file handling
   - Helper functions

### Technology Stack

- **Framework**: Next.js 16.3.1
- **Runtime**: React 19.2.8
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS + shadcn UI (Radix Nova)
- **Icons**: Lucide React
- **State Management**: Class-Variance-Authority (CVA)

### Key Features

- Full-stack-like experience with embedded tools
- Theme toggling and localization support
- File security module for safe file operations
- Custom hooks for cross-cutting concerns
- Component-driven architecture with clear separation of concerns

## Project Structure

```
src/
├── app/                 # Routing & page definitions
│   ├── about/          # About page
│   ├── category/       # Category listings
│   ├── error.tsx       # Error display
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   ├── manifest.ts     # Manifest data
│   ├── not-found.tsx   # 404 page
│   ├── opengraph-image.jpeg
│   ├── page.tsx        # Main landing page
│   └── privacy/        # Privacy-related components
├── components/          # Reusable UI components
│   ├── ui/             # Basic UI elements
│   ├── providers/      # Context providers
│   ├── result-panel/   # Result display
│   ├── site-footer/    # Footer components
│   ├── site-header/    # Header components
│   ├── theme-toggle/   # Theme switching
│   ├── tool-*          # Tooling interfaces
│   └── command-palette/ # Search/command palette
├── hooks/               # Custom hooks
│   ├── use-isApple.ts
│   └── use-mobile.ts
└── lib/                 # Shared utilities
    ├── constants.ts
    ├── file-security.ts
    └── utils.ts
```

## Development Setup

- **Package Manager**: pnpm v10.15.1
- **Build Command**: `pnpm build`
- **Dev Command**: `pnpm dev`
- **Linting**: `pnpm lint`
- **Type Checking**: Built-in via Next.js TS configuration

## Dependencies

Core dependencies include `@base-ui/react`, `class-variance-authority`, `cmdk`, `pdf-lib`, `qrcode`, `radix-ui`, and various Next.js ecosystem packages.

## Summary

devly is a modern, component-rich Next.js application designed for developer productivity with integrated tools, theme support, and secure file handling. The project follows a clean architectural pattern separating concerns between routing, presentation, and business logic.