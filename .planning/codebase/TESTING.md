# Testing Patterns

**Analysis Date:** 2026-03-25

## Test Framework

**Runner:**
- **None configured** — no test framework is installed or configured
- No `jest`, `vitest`, `mocha`, or any test runner in `package.json` dependencies
- No test config files found (`jest.config.*`, `vitest.config.*`, etc.)
- No test scripts in `package.json` beyond `"lint": "eslint"`

**Run Commands:**
```bash
npm run lint          # ESLint only — no test command exists
npm run build         # Type checking via TypeScript compiler (strict mode)
```

## Test File Organization

**Location:**
- No test files exist in the codebase
- No `*.test.ts`, `*.test.tsx`, `*.spec.ts`, or `*.spec.tsx` files found
- No `__tests__/` directories
- No `tests/` or `test/` top-level directory

## Current Verification Strategy

In the absence of automated tests, the project relies on:

1. **TypeScript strict mode** (`tsconfig.json` → `strict: true`) for compile-time type safety
2. **ESLint** with `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript` for static analysis
3. **`npm run build`** as the primary validation — Next.js build catches type errors, missing imports, and SSR issues
4. **Manual testing** via `npm run dev` (development server)

## Recommendations for Adding Tests

If tests are to be introduced, the following patterns would align with the existing codebase:

### Recommended Framework

**Vitest** is recommended over Jest for this project because:
- Native ESM support (project uses ESM imports throughout)
- Next.js 16 compatibility
- Faster execution
- Compatible with React Testing Library

**Setup would require:**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

### Suggested Test Structure

Based on existing code organization:

```
src/
├── app/
│   ├── products/
│   │   ├── actions.ts              # Server actions
│   │   ├── actions.test.ts         # ← Test co-located with actions
│   │   └── page.tsx
│   └── api/
│       └── generate-docs/
│           ├── route.ts
│           └── route.test.ts       # ← Test co-located with route
├── lib/
│   ├── claude.ts
│   ├── claude.test.ts              # ← Test co-located with utility
│   └── doc-gen/
│       ├── transforms.ts
│       └── transforms.test.ts      # ← Test co-located with transforms
```

### Priority Test Targets

**High priority (business logic):**
- `src/app/products/[productCode]/docs/_lib/utils.ts` — BOM normalization, ingredient code parsing
- `src/lib/doc-gen/transforms.ts` — Document generation data transforms
- `src/lib/claude.ts` — Claude client helper functions (`extractToolUseResult`, `extractTextContent`)

**Medium priority (data access):**
- `src/app/products/actions.ts` — Product CRUD with field whitelisting
- `src/app/v2/ingredients/actions.ts` — Ingredient fetch with component joins
- `src/app/v2/pif/actions.ts` — PIF product operations

**Lower priority (integration):**
- `src/app/api/research-reports/generate/route.ts` — AI report generation pipeline
- `src/app/api/generate-docs/route.ts` — PDF/CSV document generation

### Suggested Mocking Patterns

**Supabase client mocking:**
```typescript
// Mock the server client factory
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
  })),
}))
```

**Claude AI mocking:**
```typescript
vi.mock('@/lib/claude', () => ({
  getClaudeClient: vi.fn(() => ({
    messages: {
      create: vi.fn().mockResolvedValue(mockResponse),
    },
  })),
  CLAUDE_MODEL: 'claude-sonnet-4-20250514',
  extractTextContent: vi.fn((resp) => 'mocked text'),
}))
```

### Pure Function Test Examples

Based on actual code in the codebase:

```typescript
// src/app/products/[productCode]/docs/_lib/utils.test.ts
import { describe, it, expect } from 'vitest'
import { normalizeIngredientCode } from './utils'

describe('normalizeIngredientCode', () => {
  it('strips suffix from compound codes', () => {
    expect(normalizeIngredientCode('MXD-0002A-1')).toBe('MXD-0002')
  })

  it('returns simple codes unchanged', () => {
    expect(normalizeIngredientCode('MXD-0002')).toBe('MXD-0002')
  })
})
```

```typescript
// src/lib/claude.test.ts
import { describe, it, expect } from 'vitest'
import { extractToolUseResult, extractTextContent } from './claude'

describe('extractTextContent', () => {
  it('joins text blocks from response', () => {
    const mockResponse = {
      content: [
        { type: 'text', text: 'Hello' },
        { type: 'text', text: 'World' },
      ],
    }
    expect(extractTextContent(mockResponse as any)).toBe('Hello\nWorld')
  })
})
```

## Coverage

**Requirements:** None enforced — no coverage tooling configured

**If introduced:**
```bash
npx vitest --coverage    # Would require @vitest/coverage-v8
```

## Test Types

**Unit Tests:**
- Not present. Would target: utility functions, data transforms, type guards, normalization logic

**Integration Tests:**
- Not present. Would target: server actions with mocked Supabase, API route handlers

**E2E Tests:**
- Not present. No Playwright or Cypress configured
- Would target: login flow, product listing with search/pagination, document generation

## CI/CD Integration

- No CI pipeline detected (no `.github/workflows/`, no `Jenkinsfile`, no `vercel.json` with build commands)
- Deployment appears to be via Vercel (`.vercel/` directory present)
- Vercel runs `npm run build` on deploy, which provides type checking as a gate

---

*Testing analysis: 2026-03-25*
