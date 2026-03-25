# Coding Conventions

**Analysis Date:** 2026-03-25

## Naming Patterns

**Files:**
- Page components: `page.tsx` (Next.js App Router convention)
- Layout components: `layout.tsx`
- Server actions: `actions.ts` — co-located with the page that uses them
- Route handlers: `route.ts` under `src/app/api/`
- UI components: `kebab-case.tsx` (e.g., `alert-dialog.tsx`, `dropdown-menu.tsx`)
- Layout components: `kebab-case.tsx` (e.g., `main-layout.tsx`)
- Lib utilities: `kebab-case.ts` (e.g., `design-files-utils.ts`, `utils-server.ts`)
- Type files: `kebab-case.ts` (e.g., `database-extensions.ts`)
- Private directories: `_lib/`, `_components/` prefix for route-scoped shared code

**Functions:**
- Use `camelCase` for all functions: `fetchLabProducts`, `updateLabProduct`, `normalizeIngredientCode`
- Server actions: verb-first naming — `fetchPifProducts`, `updatePifProduct`, `loginWithGoogle`
- Helper/utility functions: descriptive camelCase — `getClaudeClient`, `extractToolUseResult`, `getSupabase`
- React components: `PascalCase` — `MainLayout`, `QueryProvider`, `PlaceholderPage`, `DocumentModal`
- Custom hooks: `use` prefix — `useUser`

**Variables:**
- `camelCase` for local variables and state: `sidebarOpen`, `queryClient`, `bomItems`
- `UPPER_SNAKE_CASE` for constants: `PAGE_SIZE`, `DEFAULT_PAGE_SIZE`, `SELECT_COLUMNS`, `CLAUDE_MODEL`, `DOC_CATEGORIES`, `REPORT_TYPES`
- `UPPER_SNAKE_CASE` for whitelists/sets: `EDITABLE_FIELDS`, `DOC_URL_FIELDS`

**Types:**
- `PascalCase` for interfaces and types: `LabProductDetail`, `PifProduct`, `UserData`, `AppRole`
- Result types: `{Domain}Result` pattern — `LabProductListResult`, `UpdateLabProductResult`, `PifProductListResult`
- Input types: `{Action}Input` pattern — `UpdateLabProductInput`, `UpdatePifProductInput`
- Props interfaces: `{Component}Props` pattern — `MainLayoutProps`, `PlaceholderPageProps`, `UserProviderProps`

## Code Style

**Formatting:**
- No Prettier config detected — relies on editor defaults
- Single quotes for string literals in TypeScript (consistent across all files)
- No semicolons at end of statements (except in JSX return expressions where mixed)
- 2-space indentation throughout
- Trailing commas in arrays and object literals

**Linting:**
- ESLint 9 flat config at `eslint.config.mjs`
- Extends: `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`
- No custom rules added — uses Next.js defaults
- Occasional `// eslint-disable-next-line @typescript-eslint/no-explicit-any` for Supabase type workarounds

**TypeScript:**
- `strict: true` in `tsconfig.json`
- Non-null assertion `!` used for env vars: `process.env.NEXT_PUBLIC_SUPABASE_URL!`
- Type assertions with `as unknown as` for Supabase query results: `(data ?? []) as unknown as PifProduct[]`
- Explicit return types on server action functions: `Promise<LabProductListResult>`
- Generic Database type parameter on Supabase clients: `createServerClient<Database>(...)`

## Import Organization

**Order:**
1. External packages (`next`, `react`, `@tanstack/react-query`, `lucide-react`)
2. Internal aliases (`@/components/ui/...`, `@/lib/...`, `@/providers/...`)
3. Relative imports (`./actions`, `./_lib/utils`)

**Path Aliases:**
- `@/*` → `./src/*` (defined in `tsconfig.json`)
- Used consistently: `@/components/ui/card`, `@/lib/supabase/server`, `@/providers/user-provider`

**Patterns:**
- Named imports preferred over default imports (except for Next.js pages)
- Destructured imports from barrel files: `import { Card, CardContent, CardHeader } from "@/components/ui/card"`
- Icon imports from lucide-react are destructured: `import { Search, Loader2, ChevronLeft } from 'lucide-react'`

## Error Handling

**Server Actions (`actions.ts`):**
- Return result objects instead of throwing: `{ success: boolean; error?: string }`
- Log errors with `console.error` before returning: `console.error('fetchLabProducts error:', error)`
- Return safe defaults on error: `{ products: [], total: 0 }`
- Input validation with whitelist Sets: `EDITABLE_FIELDS.has(input.field)`
- Korean error messages for user-facing errors: `'수정할 수 없는 필드입니다'`

**API Routes (`route.ts`):**
- Try-catch at top level wrapping entire handler
- Return `NextResponse.json({ error: '...' }, { status: 4xx/5xx })` on failure
- Validate required fields early: `if (!productCode) return NextResponse.json({ error: '...' }, { status: 400 })`
- Log errors with `console.error` before returning error response

**Client Components:**
- Error state typically not displayed — data fetching via `useQuery` with `onError` not configured
- Auth errors handled by redirect: `redirect('/login?message=...')`
- Empty `catch` blocks in non-critical paths (e.g., cookie setting in SSR)

**Supabase Error Pattern:**
```typescript
const { data, error } = await supabase.from('table').select('*')
if (error) {
  console.error('descriptive context:', error)
  return { success: false, error: error.message }
}
```

## Logging

**Framework:** `console.error` / `console.log` (no structured logging library)

**Patterns:**
- `console.error('contextLabel:', error)` for error logging in server actions and API routes
- No info/debug level logging in production code
- Korean comments used alongside English error context labels

## Comments

**When to Comment:**
- Korean inline comments for business logic: `// 원료코드 정규화: MXD-0002A-1 → MXD-0002`
- Korean section headers: `// ── Document category config ──`, `// ── Step 1: Create placeholder report row ──`
- English JSDoc for exported utility functions: `/** POST /api/research-reports/generate */`
- `@deprecated` annotations used: `/** @deprecated Use getServerUser() instead */`
- Korean comments for config explanations: `// 항상 stale로 처리하여 invalidateQueries 시 즉시 refetch`

**JSDoc/TSDoc:**
- Minimal usage — primarily on API route handlers and key exported functions
- `@deprecated` tag used for backward-compatible code

## Function Design

**Size:** Most functions under 50 lines. Larger page components (200-400 lines) contain inline sub-components.

**Parameters:**
- Default parameter values used: `search: string = '', page: number = 1`
- Props destructured in function signature: `({ children, initialUser }: UserProviderProps)`
- Optional fields use `?` suffix in interfaces

**Return Values:**
- Server actions return typed result objects: `Promise<{ products: T[], total: number }>`
- Mutation actions return `{ success: boolean; error?: string }`
- Utility functions return direct values
- Async functions always return Promises with explicit types

## Module Design

**Exports:**
- Named exports throughout: `export function`, `export interface`, `export async function`
- Default exports only for Next.js page/layout components: `export default function LabHomePage()`
- No re-exports except in barrel files

**Barrel Files:**
- `src/components/layout/index.ts` — barrel for layout components
- Not used elsewhere — direct imports from specific files preferred

## State Management

**Server State:**
- TanStack Query (`@tanstack/react-query`) for server state in client components
- `staleTime: 0`, `gcTime: 5 minutes`, `refetchOnWindowFocus: false`
- Server actions called directly from `useQuery`

**Client State:**
- `useState` for local component state (search, pagination, modals)
- React Context (`UserProvider`) for global auth state
- Zustand listed as dependency but usage pattern TBD
- `useCallback` for memoized handler functions in providers

**Form State:**
- `react-hook-form` + `zod` for form validation (dependencies present)
- `@hookform/resolvers` for zod integration

## Data Fetching Patterns

**Server Actions (Primary pattern):**
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'

export async function fetchSomething(search: string = '', page: number = 1): Promise<ResultType> {
  const supabase = await createClient()
  // ... query with pagination
  const { data, count, error } = await query.range(from, to)
  if (error) {
    console.error('context:', error)
    return { items: [], total: 0 }
  }
  return { items: (data ?? []) as unknown as ItemType[], total: count ?? 0 }
}
```

**Client-side consumption:**
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['domain', search, page],
  queryFn: () => fetchSomething(search, page),
})
```

**API Routes (for heavy/streaming operations):**
- Used for AI generation, file processing, batch operations
- `POST` method with JSON body
- `NextResponse.json()` for responses

## Supabase Type Workarounds

- Generated types at `src/types/supabase.ts` (6,912 lines, auto-generated)
- Extension types at `src/types/database-extensions.ts` for tables not in generated types
- `as unknown as T[]` casts for query results when Supabase types don't match
- `from('table_name' as 'known_table')` cast for untyped tables: `from('role_permissions' as 'user_roles')`
- `getTypedTable<T>()` helper for dynamic table access

---

*Convention analysis: 2026-03-25*
