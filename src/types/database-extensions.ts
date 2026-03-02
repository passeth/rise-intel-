import { SupabaseClient } from '@supabase/supabase-js'

export interface RiseErpInventory {
  product_code: string
  warehouse_code: string
  warehouse_name: string
  product_name: string
  spec: string | null
  qty: number
  updated_at: string
}

export interface RiseProductionPlanView {
  id: string
  product_id: string
  product_code: string
  work_type: string
  planned_qty: number
  completed_qty: number
  first_planned_date: string | null
  status: string
  notes: string | null
}

type AnySupabase = SupabaseClient<Record<string, unknown>>

export function getTypedTable<T>(
  supabase: SupabaseClient<unknown>,
  tableName: string
) {
  return (supabase as AnySupabase).from(tableName) as unknown as ReturnType<
    SupabaseClient<{ public: { Tables: { [K in typeof tableName]: { Row: T } } } }>['from']
  >
}
