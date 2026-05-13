'use server'

import { createClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any
function fromTable(supabase: SupabaseAny, table: string) {
  return supabase.from(table)
}

export interface CosmeticIngredientRegistryRow {
  id: string
  source_no: number
  ingr_kor_name: string
  ingr_eng_name: string | null
  cas_no: string | null
  origin_major_kor_name: string | null
  ingr_synonym: string | null
  source_rownum: number | null
}

export interface CosmeticIngredientRegistryResult {
  rows: CosmeticIngredientRegistryRow[]
  total: number
}

const SELECT_COLUMNS = [
  'id',
  'source_no',
  'ingr_kor_name',
  'ingr_eng_name',
  'cas_no',
  'origin_major_kor_name',
  'ingr_synonym',
  'source_rownum',
].join(', ')

const DEFAULT_PAGE_SIZE = 50

function sanitizeSearch(value: string): string {
  return value.replace(/[%,]/g, ' ').replace(/\s+/g, ' ').trim()
}

export async function fetchCosmeticIngredientRegistry(
  search: string = '',
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE
): Promise<CosmeticIngredientRegistryResult> {
  const supabase = await createClient()
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = fromTable(supabase, 'cosmetic_ingredient_registry')
    .select(SELECT_COLUMNS, { count: 'exact' })

  const term = sanitizeSearch(search)
  if (term) {
    const pattern = `%${term}%`
    query = query.or(
      `ingr_kor_name.ilike.${pattern},ingr_eng_name.ilike.${pattern},cas_no.ilike.${pattern},ingr_synonym.ilike.${pattern}`
    )
  }

  const { data, count, error } = await query
    .order('source_no', { ascending: true })
    .range(from, to)

  if (error) {
    console.error('fetchCosmeticIngredientRegistry error:', error)
    return { rows: [], total: 0 }
  }

  return {
    rows: (data ?? []) as CosmeticIngredientRegistryRow[],
    total: count ?? 0,
  }
}
