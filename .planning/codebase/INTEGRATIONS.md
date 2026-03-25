# External Integrations

**Analysis Date:** 2026-03-25

## APIs & External Services

**AI / LLM:**
- Anthropic Claude API - AI-powered research report generation
  - SDK: `@anthropic-ai/sdk` ^0.72.1
  - Client: `src/lib/claude.ts` (singleton pattern)
  - Model: `claude-sonnet-4-20250514` (hardcoded in `CLAUDE_MODEL` constant)
  - Auth: `ANTHROPIC_API_KEY` (server-side only, not `NEXT_PUBLIC_`)
  - API Route: `src/app/api/research-reports/generate/route.ts`
  - Max duration: 60 seconds
  - Features: tool use extraction (`extractToolUseResult`), text content extraction (`extractTextContent`)
  - Prompt builder: `src/app/ingredient-intelligence/_lib/report-prompts.ts`

**File Storage (External):**
- Dropbox Business API - Design file management (디자인 데이터)
  - SDK: `dropbox` ^10.34.0
  - Client: `src/lib/dropbox/client.ts` (singleton with OAuth refresh token)
  - Auth: OAuth2 with offline refresh token
  - Env vars: `DROPBOX_APP_KEY`, `DROPBOX_APP_SECRET`, `DROPBOX_REFRESH_TOKEN`, `DROPBOX_ROOT_NAMESPACE_ID`, `DROPBOX_BASE_FOLDER`
  - Team namespace support for shared workspace access
  - API Routes:
    - `src/app/api/design-files/browse/` - List files/folders
    - `src/app/api/design-files/copy-files/` - Copy files
    - `src/app/api/design-files/create-version/` - Version management
    - `src/app/api/design-files/download/` - File download
    - `src/app/api/design-files/preview/` - File preview
    - `src/app/api/design-files/save-xlsx/` - Save spreadsheets
    - `src/app/api/design-files/upload/` - File upload
  - Utilities: `src/lib/design-files.ts`, `src/lib/design-files-utils.ts`

## Data Storage

**Database:**
- Supabase PostgreSQL (hosted)
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Browser client: `src/lib/supabase/client.ts` (uses `createBrowserClient` from `@supabase/ssr`)
  - Server client: `src/lib/supabase/server.ts` (uses `createServerClient` with cookie management)
  - Middleware client: `src/lib/supabase/middleware.ts` (session refresh)
  - Typed with generated types: `src/types/supabase.ts`
  - Extended types: `src/types/database-extensions.ts`
  - Shared instance with RISE MES (risemes) — some tables are READ-ONLY
  - Migrations: `src/migrations/`, `sql/`

**File Storage (Supabase):**
- Supabase Storage - Product images and uploaded files
  - Remote pattern configured in `next.config.ts`: `usvjbuudnofwhmclwhfl.supabase.co/storage/v1/object/public/**`

**Caching:**
- TanStack Query client-side cache only (gcTime: 5 min)
- No server-side caching layer (Redis, etc.)

## Authentication & Identity

**Auth Provider:**
- Supabase Auth
  - Email/Password login: `src/app/login/actions.ts` → `signInWithPassword`
  - Google OAuth: `src/app/login/actions.ts` → `signInWithOAuth` (provider: 'google')
    - Options: `access_type: 'offline'`, `prompt: 'consent'`
  - OAuth callback: `src/app/auth/callback/route.ts` (code → session exchange)
  - Sign out: `src/app/auth/signout/`
  - Session management via middleware: `src/middleware.ts` → `src/lib/supabase/middleware.ts`

**Authorization (RBAC):**
- Custom role-based access control
  - Roles: `admin`, `production_manager`, `materials_manager`, `manufacturing_team`, `viewer`, `pending`
  - Role storage: `user_roles` table
  - Permissions: `role_permissions` table (resource-level CRUD: `can_view`, `can_create`, `can_edit`, `can_delete`)
  - Server-side: `getServerUser()` in `src/lib/supabase/server.ts`
  - Client-side: `UserProvider` in `src/providers/user-provider.tsx` with `hasPermission()`, `canAccess()`, `canEdit()`, `isAdmin` helpers

**Route Protection:**
- Middleware-level auth check (`src/middleware.ts`)
  - Protected: all routes except `/login`, `/auth/*`, `/api/*`
  - Unauthenticated users → redirect to `/login`
  - Authenticated users on `/login` → redirect to `/`

## Document Generation

**PDF Generation:**
- jsPDF + jspdf-autotable (server-side)
  - Font support: NanumGothic for Korean text (`public/fonts/`, `src/lib/pdf/fonts.ts`)
  - API Routes:
    - `src/app/api/generate-docs/route.ts` - Single document generation
    - `src/app/api/generate-docs/batch/` - Batch document generation
    - `src/app/api/generate-docs/download/` - Download generated docs

**CPNP Document Generation:**
- `src/app/api/cpnp/generate/route.ts` - EU CPNP compliance documents
  - Supported types: composition_formula, single_formula, allergen_list, specification, coa, msds, pet, stability, mlt
  - Batch processing up to 50 products
  - Data source: `src/app/v2/pif/cpnp/data.ts`

**MSDS Utilities:**
- `src/lib/msds/flammability.ts` - Flammability classification calculations

**File Parsing:**
- mammoth - .docx to HTML conversion
- xlsx - Excel file read/write
- jszip - ZIP archive handling

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Datadog, etc. detected)

**Logs:**
- `console.error` / `console.log` only
- No structured logging framework

## CI/CD & Deployment

**Hosting:**
- Vercel (`.vercel/` directory with `project.json`)
- Next.js optimized deployment

**CI Pipeline:**
- Not detected (no `.github/workflows/`, no `vercel.json` CI config)

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (public)
- `ANTHROPIC_API_KEY` - Claude AI API key (server-only)

**Optional env vars (Dropbox features):**
- `DROPBOX_APP_KEY` - Dropbox OAuth App Key
- `DROPBOX_APP_SECRET` - Dropbox OAuth App Secret
- `DROPBOX_REFRESH_TOKEN` - Offline refresh token (permanent)
- `DROPBOX_ROOT_NAMESPACE_ID` - Team root namespace ID (Dropbox Business)
- `DROPBOX_BASE_FOLDER` - Base folder path (e.g., `/RISE/100_DESIGN DATA`)

**Secrets location:**
- `.env.local` (gitignored)
- Vercel environment variables (production)

## Webhooks & Callbacks

**Incoming:**
- `src/app/auth/callback/route.ts` - Supabase OAuth callback (GET)
- `src/app/api/research-reports/generate/route.ts` - AI report generation (POST)
- `src/app/api/cpnp/generate/route.ts` - CPNP document generation (POST)
- `src/app/api/design-files/*` - Dropbox file operations (various)
- `src/app/api/generate-docs/*` - Document generation (various)

**Outgoing:**
- Claude API calls (from research report generation)
- Dropbox API calls (file browse/upload/download/copy)
- Supabase Auth OAuth redirect to Google

## Shared Database Tables

**READ-ONLY from RISE MES:**
- `bom_master` - Product ingredient BOM
- `rise_products` - Product existence verification
- `product_images` - Product image display

**INTEL-owned tables (grouped):**
- Product standards: `labdoc_products`, `labdoc_product_bom`, `labdoc_product_qc_specs`, `labdoc_product_english_specs`, `labdoc_product_inci`, `labdoc_product_subsidiary_materials`, `labdoc_product_work_specs`, `labdoc_product_revisions`
- Manufacturing: `labdoc_manufacturing_processes`, `labdoc_manufacturing_process_steps`
- Ingredients: `labdoc_ingredients`, `labdoc_ingredient_components`, `labdoc_ingredient_specs`, `labdoc_ingredient_receipts`, `labdoc_ingredient_certificates`
- Allergens: `labdoc_allergen_regulations`, `labdoc_fragrance_allergen_contents`
- Test certificates: `labdoc_test_certificates`, `labdoc_test_specs`
- Intelligence: `lab_inci_matches`, `lab_regulations`, `lab_ingredients`, `lab_products`, `lab_ingredient_product`, `lab_categories`, `lab_research_reports`
- QC: `qc_purified_water_measurements`, `qc_purified_water_certificates`
- Vector/AI: `vectors_ingredient`, `vp_ingredient`, `vp_formula`, `vp_formula_ingredients`
- Auth: `user_roles`, `role_permissions`

---

*Integration audit: 2026-03-25*
