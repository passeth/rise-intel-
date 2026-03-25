# Architecture

## Overview

RISE INTEL is a **Next.js 16 App Router** application using **server-first architecture** with Supabase as the backend. It follows the standard Next.js file-based routing with Server Components as the default rendering strategy.

## Architectural Pattern

**Server-First Monolith** — pages are React Server Components that fetch data directly from Supabase. Client interactivity is added via `"use client"` components where needed.

### Layers

```
┌─────────────────────────────────────┐
│  Browser (Client Components)        │
│  - Interactive UI, forms, modals    │
│  - TanStack Query for client cache  │
├─────────────────────────────────────┤
│  Next.js App Router                 │
│  - Server Components (default)      │
│  - Server Actions (actions.ts)      │
│  - API Routes (src/app/api/)        │
├─────────────────────────────────────┤
│  Supabase Client Layer              │
│  - server.ts (SSR client)           │
│  - client.ts (browser client)       │
│  - middleware.ts (auth session)      │
├─────────────────────────────────────┤
│  Supabase (PostgreSQL + Auth)       │
│  - Shared with RISE MES (risemes)   │
│  - RLS policies for access control  │
└─────────────────────────────────────┘
```

## Data Flow

### Read Path (Server Components)
1. Page component (RSC) calls Supabase server client directly
2. Data fetched at request time (no caching layer)
3. HTML streamed to browser

### Write Path (Server Actions)
1. Form submission triggers `actions.ts` server action
2. Action calls Supabase server client to mutate data
3. `revalidatePath()` invalidates cached page data
4. Page re-renders with fresh data

### Client-Side Data (TanStack Query)
1. Some pages use `useQuery` hooks for client-side fetching
2. `QueryProvider` wraps the app in `src/providers/query-provider.tsx`
3. Used for interactive features needing real-time updates

## Authentication

- **Supabase Auth** with email/password and Google OAuth
- **Middleware** (`src/middleware.ts`) protects all routes except `/login`, `/auth/*`, `/api/*`
- `updateSession()` in `src/lib/supabase/middleware.ts` refreshes auth tokens on every request
- `UserProvider` in `src/providers/user-provider.tsx` provides user context to client components

## Entry Points

| Entry Point | Path | Purpose |
|---|---|---|
| Root layout | `src/app/layout.tsx` | Providers, MainLayout wrapper |
| Middleware | `src/middleware.ts` | Auth guard, session refresh |
| Home page | `src/app/page.tsx` | LAB dashboard |
| Login | `src/app/login/page.tsx` | Auth page |
| API routes | `src/app/api/` | CPNP, design-files, doc generation, research reports |

## Key Abstractions

### Supabase Clients (`src/lib/supabase/`)
- `server.ts` — Server-side client (cookies-based auth)
- `client.ts` — Browser-side client
- `middleware.ts` — Middleware client for session management

### Claude AI Integration (`src/lib/claude.ts`)
- AI client for research report generation
- Used by `src/app/api/research-reports/` API route

### PDF Generation (`src/lib/pdf/`)
- jsPDF-based document generation
- Korean font support (NanumGothic in `public/fonts/`)

### Design Files (`src/lib/design-files.ts`, `src/lib/design-files-utils.ts`)
- Integration with Dropbox-stored design data
- File path resolution via `DESIGN_DATA_BASE_PATH` env var

## V1 vs V2 Architecture

The codebase has two generations of routes:

- **V1** (`src/app/products/`, `src/app/ingredients/`, etc.) — Original routes from RISE MES migration
- **V2** (`src/app/v2/`) — Newer routes with improved structure, includes PIF, Intel, QC, Regulation modules

V2 uses a shared `_components/` directory and `_lib/` patterns for co-located utilities.

## Shared Database

RISE INTEL shares a Supabase instance with RISE MES (risemes). Tables prefixed with `labdoc_`, `lab_`, `qc_`, `vp_` are INTEL-owned. Tables like `bom_master`, `rise_products`, `product_images` are READ-ONLY from RISE MES.
