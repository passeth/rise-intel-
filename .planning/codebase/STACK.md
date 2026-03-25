# Technology Stack

**Analysis Date:** 2026-03-25

## Languages

**Primary:**
- TypeScript ^5 - All application code (`src/**/*.ts`, `src/**/*.tsx`)

**Secondary:**
- SQL - Database migrations and scripts (`sql/`, `src/migrations/`)

## Runtime

**Environment:**
- Node.js (version not pinned — no `.nvmrc` or `.node-version` detected)
- React 19.2.3 (latest with RSC support)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.1.1 - App Router framework (`next.config.ts`)
  - React Strict Mode: disabled
  - Server Actions enabled with 100MB body size limit
  - Remote image patterns: Supabase Storage (`usvjbuudnofwhmclwhfl.supabase.co`)
- React 19.2.3 + React DOM 19.2.3

**UI:**
- shadcn/ui (new-york style, RSC-enabled) - `components.json`
  - Icon library: lucide-react ^0.562.0
  - Base color: neutral
  - CSS variables: enabled
- Radix UI primitives - alert-dialog, avatar, checkbox, dialog, dropdown-menu, label, popover, progress, select, separator, slot, switch, tabs, tooltip
- class-variance-authority ^0.7.1 - Variant styling
- cmdk ^1.1.1 - Command palette

**Styling:**
- Tailwind CSS v4 (`@tailwindcss/postcss` via `postcss.config.mjs`)
- tw-animate-css ^1.4.0 - Animation utilities
- tailwind-merge ^3.4.0 - Class merging
- clsx ^2.1.1 - Conditional classes

**State Management:**
- TanStack React Query ^5.90.16 - Server state (`src/providers/query-provider.tsx`)
  - staleTime: 0 (always stale, immediate refetch on invalidation)
  - gcTime: 5 minutes
  - refetchOnWindowFocus: disabled
- Zustand ^5.0.9 - Client state
- React Context - User auth state (`src/providers/user-provider.tsx`)

**Forms:**
- react-hook-form ^7.69.0
- @hookform/resolvers ^5.2.2
- Zod ^4.2.1 - Schema validation

**Build/Dev:**
- ESLint ^9 with eslint-config-next 16.1.1 (`eslint.config.mjs`)
  - Configs: core-web-vitals, typescript
- PostCSS with @tailwindcss/postcss plugin

## Key Dependencies

**Critical:**
- `@anthropic-ai/sdk` ^0.72.1 - Claude AI for research report generation (`src/lib/claude.ts`)
- `@supabase/supabase-js` ^2.89.0 - Database client
- `@supabase/ssr` ^0.8.0 - Server-side Supabase auth with cookie management
- `dropbox` ^10.34.0 - Dropbox Business API for design file management (`src/lib/dropbox/client.ts`)

**Document Generation:**
- `jspdf` ^3.0.4 + `jspdf-autotable` ^5.0.2 - PDF generation (`src/lib/pdf/`)
- `mammoth` ^1.12.0 - .docx file parsing
- `xlsx` ^0.18.5 - Excel spreadsheet processing
- `jszip` ^3.10.1 - ZIP file handling

**Spreadsheet:**
- `@univerjs/presets` ^0.18.0 + `@univerjs/preset-sheets-core` ^0.18.0 - In-browser spreadsheet editor
- `@mertdeveci55/univer-import-export` ^0.2.1 - UniverJS import/export
- `rxjs` ^7.8.2 - Required by UniverJS

**Content Rendering:**
- `react-markdown` ^10.1.0 + `remark-gfm` ^4.0.1 - Markdown rendering (AI reports)
- `next-themes` ^0.4.6 - Theme switching
- `react-day-picker` ^9.13.0 - Date picker
- `date-fns` ^4.1.0 - Date utilities
- `sonner` ^2.0.7 - Toast notifications (`src/components/ui/sonner`)

**Dev Only:**
- `agentation` ^2.3.3 - Browser annotation tool for AI-assisted development

## Configuration

**TypeScript:**
- Target: ES2017
- Module: ESNext with bundler resolution
- Strict mode: enabled
- Path alias: `@/*` → `./src/*` (`tsconfig.json`)
- JSX: react-jsx

**Environment:**
- `.env.local` - Local environment variables (gitignored)
- `.env.example` - Template with required variables
- Required vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`
- Optional vars: `DROPBOX_APP_KEY`, `DROPBOX_APP_SECRET`, `DROPBOX_REFRESH_TOKEN`, `DROPBOX_ROOT_NAMESPACE_ID`, `DROPBOX_BASE_FOLDER`

**Build:**
- `next.config.ts` - Next.js configuration
- `postcss.config.mjs` - PostCSS with Tailwind
- `components.json` - shadcn/ui configuration
- `eslint.config.mjs` - ESLint flat config

## Platform Requirements

**Development:**
- Node.js (recommend 20+)
- npm
- Supabase project access (shared with RISE MES)
- Anthropic API key for AI features
- Dropbox Business credentials for design file features

**Production:**
- Vercel (`.vercel/` directory present)
- Supabase hosted PostgreSQL
- Max server action duration: 60 seconds (for AI generation routes)

## Font Configuration

- Noto Sans KR (Google Fonts) - Primary UI font, loaded in `src/app/layout.tsx`
  - Weights: 400, 500, 600, 700
  - CSS variable: `--font-noto-sans-kr`
- NanumGothic - PDF generation font (`public/fonts/`)

---

*Stack analysis: 2026-03-25*
