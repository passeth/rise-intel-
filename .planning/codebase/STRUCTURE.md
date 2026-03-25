# Structure

## Directory Layout

```
rise-intel/
├── .planning/              # GSD planning documents
├── docs/                   # Project documentation
├── public/
│   └── fonts/              # Korean fonts (NanumGothic for PDF)
├── scripts/                # Utility scripts
├── sql/                    # SQL migrations and queries
├── src/
│   ├── app/                # Next.js App Router pages
│   │   ├── api/            # API route handlers
│   │   ├── auth/           # Auth callback routes
│   │   ├── certificates/   # 시험성적서
│   │   ├── ingredient-intelligence/  # 성분 인텔리전스
│   │   ├── ingredients/    # 원료관리
│   │   ├── login/          # Authentication page
│   │   ├── products/       # 제품표준서
│   │   ├── profile/        # User profile
│   │   ├── purified-water/ # 정제수 관리
│   │   ├── standards/      # 시험규격
│   │   ├── v2/             # Next-gen modules
│   │   │   ├── _components/  # Shared V2 components
│   │   │   ├── development/  # Development tools
│   │   │   ├── ingredients/  # V2 원료
│   │   │   ├── intel/        # Intelligence hub
│   │   │   │   ├── ingredients/
│   │   │   │   ├── news/
│   │   │   │   └── reports/
│   │   │   ├── pif/          # Product Information File
│   │   │   │   ├── [productCode]/
│   │   │   │   ├── cpnp/
│   │   │   │   ├── documents/
│   │   │   │   ├── manage/
│   │   │   │   └── new/
│   │   │   ├── qc/           # Quality Control
│   │   │   └── regulation/   # 규제 관리
│   │   ├── layout.tsx      # Root layout
│   │   ├── page.tsx        # Home dashboard
│   │   └── globals.css     # Global styles
│   ├── components/
│   │   ├── layout/         # App shell components
│   │   │   ├── header.tsx
│   │   │   ├── main-layout.tsx
│   │   │   ├── sidebar.tsx
│   │   │   └── index.ts
│   │   ├── ui/             # shadcn/ui components
│   │   ├── dev-tools.tsx   # Development tools overlay
│   │   └── univer-xlsx-editor.tsx  # Excel editor component
│   ├── lib/
│   │   ├── supabase/       # Supabase client setup
│   │   │   ├── client.ts   # Browser client
│   │   │   ├── server.ts   # Server client
│   │   │   └── middleware.ts # Auth middleware
│   │   ├── claude.ts       # Anthropic Claude AI client
│   │   ├── design-files.ts # Design file management
│   │   ├── design-files-utils.ts
│   │   ├── doc-gen/        # Document generation utilities
│   │   ├── dropbox/        # Dropbox integration
│   │   ├── msds/           # MSDS document handling
│   │   ├── pdf/            # PDF generation (jsPDF)
│   │   └── utils.ts        # Common utilities
│   ├── middleware.ts        # Next.js middleware (auth guard)
│   ├── migrations/          # DB migration files
│   ├── providers/
│   │   ├── query-provider.tsx  # TanStack Query
│   │   └── user-provider.tsx   # User context
│   └── types/               # TypeScript type definitions
├── next.config.ts
├── tailwind v4 (postcss.config.mjs)
├── tsconfig.json
├── components.json          # shadcn/ui config
├── package.json
└── opencode.json
```

## Key Locations

### Page Routes
- **V1 routes**: `src/app/{module}/page.tsx` — Original RISE MES pages
- **V2 routes**: `src/app/v2/{module}/page.tsx` — New generation pages
- **API routes**: `src/app/api/{service}/route.ts`

### Server Actions
- Co-located `actions.ts` files alongside page routes
- Pattern: `src/app/{module}/actions.ts` or `src/app/v2/{module}/actions.ts`

### Shared Components
- **App shell**: `src/components/layout/` (header, sidebar, main-layout)
- **UI primitives**: `src/components/ui/` (shadcn/ui)
- **V2 shared**: `src/app/v2/_components/`

### Data Layer
- **Supabase clients**: `src/lib/supabase/`
- **AI client**: `src/lib/claude.ts`
- **Utilities**: `src/lib/utils.ts`

### Co-located Libraries
- `src/app/ingredient-intelligence/_lib/` — Intelligence-specific utilities
- `src/app/v2/pif/` — PIF-specific actions and components

## Naming Conventions

### Files
- **Pages**: `page.tsx` (Next.js convention)
- **Layouts**: `layout.tsx`
- **Actions**: `actions.ts` (server actions)
- **Components**: `kebab-case.tsx` (e.g., `main-layout.tsx`)
- **Utilities**: `kebab-case.ts` (e.g., `design-files-utils.ts`)

### Directories
- **Route segments**: `kebab-case` (e.g., `ingredient-intelligence`)
- **Dynamic routes**: `[paramName]` (e.g., `[productCode]`, `[slug]`)
- **Private folders**: `_prefix` (e.g., `_components`, `_lib`)

### Database Tables
- **INTEL-owned**: `labdoc_*`, `lab_*`, `qc_*`, `vp_*` prefixes
- **Shared (read-only)**: `bom_master`, `rise_products`, `product_images`

## Configuration Files

| File | Purpose |
|---|---|
| `next.config.ts` | Next.js configuration |
| `tsconfig.json` | TypeScript with `@/` path alias |
| `postcss.config.mjs` | PostCSS (Tailwind v4) |
| `components.json` | shadcn/ui component config |
| `eslint.config.mjs` | ESLint configuration |
| `.mcp.json` | MCP server configuration |
| `opencode.json` | OpenCode configuration |
