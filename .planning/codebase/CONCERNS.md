# Codebase Concerns

**Analysis Date:** 2025-03-25

## Tech Debt

**V1/V2 Route Duplication:**
- Issue: Complete parallel route trees exist for the same features. V1 routes (`/purified-water`, `/certificates`, `/ingredients`) are duplicated under `/v2/qc/purified-water`, `/v2/qc/certificates`, `/v2/ingredients` with similar page.tsx and actions.ts files.
- Files:
  - `src/app/purified-water/` (2029 lines page) ↔ `src/app/v2/qc/purified-water/` (810 lines page)
  - `src/app/certificates/` (1944 lines page) ↔ `src/app/v2/qc/certificates/` (2703 lines page)
  - `src/app/ingredients/` ↔ `src/app/v2/ingredients/`
  - `src/app/products/new/` (1486 lines) ↔ `src/app/v2/pif/new/` (1500 lines)
  - `src/app/products/new/actions.ts` (591 lines) ↔ `src/app/v2/pif/new/actions.ts` (591 lines)
- Impact: Double maintenance burden. Bug fixes must be applied in two places. Growing divergence risk between v1 and v2 implementations.
- Fix approach: Decide which version is canonical (likely v2), migrate remaining users, then remove v1 routes entirely. Extract shared logic into shared action/hook modules during migration.

**`fromTable` / `SupabaseAny` Type Safety Bypass:**
- Issue: 11 action files define a `SupabaseAny = any` type alias and a `fromTable()` helper function to bypass Supabase's typed client. This defeats TypeScript's compile-time safety for database operations.
- Files:
  - `src/app/ingredients/[ingredientCode]/actions.ts`
  - `src/app/purified-water/actions.ts`
  - `src/app/certificates/actions.ts`
  - `src/app/ingredients/receipts/actions.ts`
  - `src/app/v2/qc/purified-water/actions.ts`
  - `src/app/v2/qc/certificates/actions.ts`
  - `src/app/v2/ingredients/[ingredientCode]/actions.ts`
  - `src/app/v2/ingredients/actions.ts`
  - `src/app/v2/ingredients/new/actions.ts`
  - `src/app/v2/ingredients/receipts/actions.ts`
  - `src/app/products/[productCode]/docs/inci/actions.ts`
- Impact: No compile-time checking for table names, column names, or query shapes. Typos in table/column names only surface at runtime. Likely caused by tables missing from the generated `src/types/supabase.ts` types.
- Fix approach: Regenerate Supabase types to include all tables (especially `labdoc_*` and `lab_*` tables). Replace `fromTable()` calls with typed `supabase.from('table_name')` calls. Remove `SupabaseAny` aliases.

**Deprecated Code Still Present:**
- Issue: `getCurrentUser()` in `src/lib/supabase/server.ts` is marked `@deprecated` (line 105) in favor of `getServerUser()`, but is still exported. `MainLayout` in `src/components/layout/main-layout.tsx` has a deprecated `user` prop (line 13).
- Files: `src/lib/supabase/server.ts`, `src/components/layout/main-layout.tsx`
- Impact: Confusion about which function to use. The deprecated `getCurrentUser()` reads role from user_metadata (unreliable) while `getServerUser()` reads from `user_roles` table (correct).
- Fix approach: Search for any remaining usages of `getCurrentUser()`, migrate them to `getServerUser()`, then remove the deprecated function. Clean up the deprecated `user` prop from `MainLayout`.

**Excessive `console.log/error/warn` Statements:**
- Issue: 149 console statements across 51 files. No structured logging framework.
- Files: Heaviest offenders: `src/app/ingredients/[ingredientCode]/actions.ts` (26), `src/app/purified-water/page.tsx` (10), `src/app/v2/ingredients/receipts/actions.ts` (8)
- Impact: No log levels, no structured metadata, no ability to filter in production. Console output clutters browser DevTools and server logs without actionable context.
- Fix approach: For server-side code, introduce a lightweight logger wrapper. For client-side code, remove debug logs or gate behind `NODE_ENV` checks.

**Zod Validation Not Adopted:**
- Issue: Zod is installed as a dependency (`zod@^4.2.1`) but only used in one file (`src/app/v2/ingredients/new/page.tsx`). All other 28 server action files and 12 API routes perform manual validation or no validation.
- Files: All `actions.ts` files and `src/app/api/**/route.ts` files
- Impact: Inconsistent input validation. Server actions accept unvalidated input from the client.
- Fix approach: Adopt Zod schemas for server action inputs and API route request bodies. Start with the most critical mutation actions (create/update operations).

## Security Considerations

**API Routes Without Authentication:**
- Risk: All 7 design-file API routes (`src/app/api/design-files/*`) have zero authentication checks — no `auth.getUser()`, no `getServerUser()`, no Supabase client creation. Any client can upload, download, browse, copy, and modify design files.
- Files:
  - `src/app/api/design-files/upload/route.ts`
  - `src/app/api/design-files/download/route.ts`
  - `src/app/api/design-files/browse/route.ts`
  - `src/app/api/design-files/copy-files/route.ts`
  - `src/app/api/design-files/save-xlsx/route.ts`
  - `src/app/api/design-files/create-version/route.ts`
  - `src/app/api/design-files/preview/route.ts`
- Current mitigation: Middleware redirects unauthenticated users from non-`/api` routes to `/login`, but the middleware explicitly **excludes** `/api` routes from protection (line 43 of `src/lib/supabase/middleware.ts`: `!request.nextUrl.pathname.startsWith('/api')`).
- Recommendations: Add `auth.getUser()` checks to every API route handler, or create a shared auth middleware wrapper for API routes.

**Server Actions Without Auth Checks:**
- Risk: Of 28 server action files, only `src/app/profile/actions.ts` calls `auth.getUser()`. All other server actions rely solely on the Supabase client's RLS policies for authorization. If RLS is misconfigured or missing on any table, data is exposed.
- Files: All `actions.ts` files except `src/app/profile/actions.ts`
- Current mitigation: Supabase RLS (if properly configured on all tables). Middleware protects page access but not direct server action invocation.
- Recommendations: Add auth checks at the top of server actions that perform mutations (create, update, delete). At minimum, verify the user is authenticated before proceeding.

**Non-Null Assertion on Environment Variables:**
- Risk: Environment variables accessed with `!` (non-null assertion) throughout the Supabase client setup. If vars are missing, the app crashes with an unhelpful error at runtime.
- Files: `src/lib/supabase/server.ts` (lines 34-35), `src/lib/supabase/client.ts` (lines 6-7), `src/lib/supabase/middleware.ts` (lines 10-11)
- Current mitigation: `.env.example` documents required vars.
- Recommendations: Add startup validation that checks required env vars exist and fails with a clear error message.

**No Rate Limiting on AI Generation Endpoint:**
- Risk: `src/app/api/research-reports/generate/route.ts` calls the Claude API with no rate limiting. Each request costs real money (API tokens). A malicious or buggy client could trigger unlimited AI generations.
- Files: `src/app/api/research-reports/generate/route.ts`
- Current mitigation: None.
- Recommendations: Add rate limiting (per-user or per-IP). Consider a queue-based approach for generation requests.

## Performance Bottlenecks

**Monolithic Page Components:**
- Problem: Several page.tsx files are extremely large single-component files containing all state, handlers, UI rendering, dialogs, and PDF generation in one component.
- Files:
  - `src/app/v2/qc/certificates/page.tsx` — 2703 lines
  - `src/app/purified-water/page.tsx` — 2029 lines
  - `src/app/certificates/page.tsx` — 1944 lines
  - `src/app/v2/ingredients/receipts/page.tsx` — 1693 lines
  - `src/app/v2/ingredients/[ingredientCode]/page.tsx` — 1632 lines
  - `src/app/v2/pif/new/page.tsx` — 1500 lines
  - `src/app/products/new/page.tsx` — 1486 lines
- Cause: All logic lives in a single `'use client'` component. No extraction of sub-components, hooks, or data-fetching layers.
- Improvement path: Extract dialog components, form sections, and table renderers into separate files. Move state management into custom hooks. This will also improve re-render performance since React won't re-render the entire 2000+ line component tree on every state change.

**Client-Side PDF Generation with Font Loading:**
- Problem: PDF generation happens client-side using jsPDF with Korean font loading. Each PDF generation loads font data into memory.
- Files: `src/lib/pdf/fonts.ts`, used across certificates, purified-water, and ingredient pages.
- Cause: Korean font (NanumGothic) must be embedded in jsPDF for proper rendering.
- Improvement path: Consider server-side PDF generation to avoid sending font data to the client. Cache the font loading result to avoid repeated base64 decoding.

**Sequential Database Queries in AI Report Generation:**
- Problem: `gatherIngredientContext()` in `src/app/api/research-reports/generate/route.ts` runs initial parallel queries, but then runs 3 sequential follow-up queries (INCIDecoder data, brand products, AI enriched data) that could be parallelized.
- Files: `src/app/api/research-reports/generate/route.ts` (lines 217-302)
- Cause: Follow-up queries depend on the first result but not on each other.
- Improvement path: Run the 3 follow-up queries in parallel with `Promise.all()` after the initial match is resolved.

## Fragile Areas

**Supabase Type Generation:**
- Files: `src/types/supabase.ts` (6912 lines)
- Why fragile: The generated types don't cover all tables (hence the `fromTable` workaround across 11 files). When new tables are added to the database, this file must be regenerated, and any `fromTable` usage won't benefit from the update.
- Safe modification: Regenerate with `npx supabase gen types typescript`. Then replace `fromTable()` calls with typed `.from()` calls.
- Test coverage: None — type mismatches only surface at runtime.

**Shared Supabase Instance (risemes):**
- Files: All database operations across the app
- Why fragile: rise-intel shares the same Supabase instance with risemes (RISE MES). Schema changes in one project can break the other. The `bom_master`, `rise_products`, and `product_images` tables are documented as READ-ONLY shared tables, but nothing enforces this at the code level.
- Safe modification: Always check both projects before modifying shared tables. Consider read-only database roles.
- Test coverage: None.

## Test Coverage Gaps

**No Tests Exist:**
- What's not tested: The entire codebase — zero test files found (no `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` files).
- Files: All `src/` files
- Risk: Any change to business logic (ingredient calculations, certificate generation, regulatory checks, PDF formatting) can break silently. Server actions performing database mutations have no safety net.
- Priority: High — Start with server action integration tests for critical flows: certificate creation, ingredient management, and purified water measurements. Then add unit tests for pure logic in `src/lib/` utilities.

---

*Concerns audit: 2025-03-25*
