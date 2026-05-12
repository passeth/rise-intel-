'use server'

import { createClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any
function fromTable(supabase: SupabaseAny, table: string) {
  return supabase.from(table)
}

export interface WaterMeasurement {
  id: string
  measurement_date: string
  measurement_time: string | null
  ph_value: number | null
  resistivity: number | null
  conductivity: number | null
  maintenance_note: string | null
  recorded_by: string | null
  created_at: string
  updated_at: string
}

export interface WaterTestResult {
  test_item: string
  criteria: string
  result: string
  judgment: string
  remarks?: string
}

export interface WaterCertificate {
  id: string
  certificate_no: string
  test_date: string
  results: WaterTestResult[]
  overall_judgment: string
  recorded_by: string | null
  collector_name: string | null
  sample_quantity: string | null
  collection_location: string | null
  judge_name: string | null
  notes: string | null
  notes_images: string[]
  pdf_url: string | null
  measurement_id: string | null
  created_at: string
  updated_at: string
}

export async function fetchMeasurements(params: {
  year?: number
  month?: number
  page?: number
  pageSize?: number
}) {
  const supabase = await createClient()
  const { year, month, page = 1, pageSize = 10 } = params

  try {
    // Build count query
    let countQuery = fromTable(supabase, 'qc_purified_water_measurements')
      .select('id', { count: 'exact', head: true })

    // Build data query
    let query = fromTable(supabase, 'qc_purified_water_measurements')
      .select('*')

    if (year) {
      const mm = month ? String(month).padStart(2, '0') : '01'
      const startDate = `${year}-${mm}-01`
      let endDate: string
      if (month) {
        // Calculate last day of the month correctly
        const lastDay = new Date(year, month, 0).getDate()
        endDate = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`
      } else {
        endDate = `${year}-12-31`
      }

      countQuery = countQuery.gte('measurement_date', startDate).lte('measurement_date', endDate)
      query = query.gte('measurement_date', startDate).lte('measurement_date', endDate)
    }

    const { count } = await countQuery
    const totalCount = count ?? 0

    query = query.order('measurement_date', { ascending: false })

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, error } = await query

    if (error) {
      return { measurements: [], totalCount: 0, error: error.message }
    }

    return {
      measurements: (data || []) as WaterMeasurement[],
      totalCount,
      error: null,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return { measurements: [], totalCount: 0, error: errorMessage }
  }
}

export async function createMeasurement(data: {
  measurement_date: string
  measurement_time?: string
  ph_value?: number
  resistivity?: number
  conductivity?: number
  maintenance_note?: string
  recorded_by?: string
}) {
  const supabase = await createClient()

  try {
    const { data: measurement, error } = await fromTable(
      supabase,
      'qc_purified_water_measurements'
    )
      .insert(data)
      .select()
      .single()

    if (error) {
      return { measurement: null, error: error.message }
    }

    return { measurement: measurement as WaterMeasurement }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return { measurement: null, error: errorMessage }
  }
}

export async function updateMeasurement(
  id: string,
  data: {
    ph_value?: number
    resistivity?: number
    conductivity?: number
    maintenance_note?: string
    recorded_by?: string
  }
) {
  const supabase = await createClient()

  try {
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    }

    const { error } = await fromTable(
      supabase,
      'qc_purified_water_measurements'
    )
      .update(updateData)
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

export async function deleteMeasurement(id: string) {
  const supabase = await createClient()

  try {
    const { error } = await fromTable(
      supabase,
      'qc_purified_water_measurements'
    )
      .delete()
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

export async function fetchCertificates(params: {
  year?: number
  page?: number
  pageSize?: number
}) {
  const supabase = await createClient()
  const { year, page = 1, pageSize = 10 } = params

  try {
    // Build count query
    let countQuery = fromTable(supabase, 'qc_purified_water_certificates')
      .select('id', { count: 'exact', head: true })

    // Build data query
    let query = fromTable(supabase, 'qc_purified_water_certificates')
      .select('*')

    if (year) {
      const startDate = `${year}-01-01`
      const endDate = `${year}-12-31`

      countQuery = countQuery.gte('test_date', startDate).lte('test_date', endDate)
      query = query.gte('test_date', startDate).lte('test_date', endDate)
    }

    const { count } = await countQuery
    const totalCount = count ?? 0

    query = query.order('test_date', { ascending: false })

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, error } = await query

    if (error) {
      return { certificates: [], totalCount: 0, error: error.message }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const certificates = (data || []).map((cert: any) => ({
      ...cert,
      results: (cert.results || []) as WaterTestResult[],
      notes_images: (cert.notes_images || []) as string[],
    })) as WaterCertificate[]

    return {
      certificates,
      totalCount,
      error: null,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return { certificates: [], totalCount: 0, error: errorMessage }
  }
}

export async function generateCertificateNo(): Promise<string> {
  const supabase = await createClient()

  try {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const prefix = `PW-${year}${month}${day}-`

    const { data, error } = await fromTable(
      supabase,
      'qc_purified_water_certificates'
    )
      .select('certificate_no')
      .like('certificate_no', prefix + '%')
      .order('certificate_no', { ascending: false })
      .limit(1)

    if (error) {
      throw error
    }

    let sequence = 1
    if (data && data.length > 0) {
      const lastNo = data[0].certificate_no
      const lastSeq = parseInt(lastNo.split('-')[2], 10)
      sequence = lastSeq + 1
    }

    const sequenceStr = String(sequence).padStart(3, '0')
    return `${prefix}${sequenceStr}`
  } catch {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `PW-${year}${month}${day}-001`
  }
}

export async function createCertificate(data: {
  certificate_no: string
  test_date: string
  results: WaterTestResult[]
  overall_judgment: string
  recorded_by?: string
  collector_name?: string
  sample_quantity?: string
  collection_location?: string
  judge_name?: string
  notes?: string
  notes_images?: string[]
  measurement_id?: string
}) {
  const supabase = await createClient()

  try {
    const { data: certificate, error } = await fromTable(
      supabase,
      'qc_purified_water_certificates'
    )
      .insert(data)
      .select()
      .single()

    if (error) {
      return { certificate: null, error: error.message }
    }

    return { certificate: certificate as WaterCertificate }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return { certificate: null, error: errorMessage }
  }
}

export async function updateCertificate(
  id: string,
  data: {
    results?: WaterTestResult[]
    overall_judgment?: string
    recorded_by?: string
    notes?: string
    notes_images?: string[]
  }
) {
  const supabase = await createClient()

  try {
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    }

    const { error } = await fromTable(
      supabase,
      'qc_purified_water_certificates'
    )
      .update(updateData)
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

export async function deleteCertificate(id: string) {
  const supabase = await createClient()

  try {
    const { error } = await fromTable(
      supabase,
      'qc_purified_water_certificates'
    )
      .delete()
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

export async function updateCertificatePdfUrl(id: string, pdfUrl: string) {
  const supabase = await createClient()

  try {
    const { error } = await fromTable(
      supabase,
      'qc_purified_water_certificates'
    )
      .update({
        pdf_url: pdfUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

export async function bulkCreateCertificates(params: {
  years: number[]
  defaultResults: WaterTestResult[]
  collector_name?: string
  sample_quantity?: string
  collection_location?: string
  judge_name?: string
  recorded_by?: string
}): Promise<{ created: number; skipped: number; errors: number; error?: string }> {
  const supabase = await createClient()

  try {
    // Fetch all measurements for the given years that don't have certificates yet
    let query = fromTable(supabase, 'qc_purified_water_measurements')
      .select('*')
      .order('measurement_date', { ascending: true })

    // Build year filter
    const orFilters = params.years.map((y) => {
      return `measurement_date.gte.${y}-01-01,measurement_date.lte.${y}-12-31`
    })
    if (orFilters.length === 1) {
      query = query.gte('measurement_date', `${params.years[0]}-01-01`).lte('measurement_date', `${params.years[0]}-12-31`)
    } else {
      // Multiple years: fetch all then filter
      const minYear = Math.min(...params.years)
      const maxYear = Math.max(...params.years)
      query = query.gte('measurement_date', `${minYear}-01-01`).lte('measurement_date', `${maxYear}-12-31`)
    }

    const { data: measurements, error: fetchErr } = await query

    if (fetchErr) {
      return { created: 0, skipped: 0, errors: 0, error: fetchErr.message }
    }

    if (!measurements || measurements.length === 0) {
      return { created: 0, skipped: 0, errors: 0, error: '해당 연도에 측정 데이터가 없습니다.' }
    }

    // Fetch existing certificates to skip duplicates (by measurement_id)
    const { data: existingCerts } = await fromTable(supabase, 'qc_purified_water_certificates')
      .select('measurement_id')
      .not('measurement_id', 'is', null)

    const existingMeasurementIds = new Set(
      (existingCerts || []).map((c: { measurement_id: string }) => c.measurement_id)
    )

    let created = 0
    let skipped = 0
    let errors = 0

    // Process in batches of 50
    const toInsert: Array<Record<string, unknown>> = []

    for (const m of measurements as WaterMeasurement[]) {
      // Skip if certificate already exists for this measurement
      if (existingMeasurementIds.has(m.id)) {
        skipped++
        continue
      }

      // Filter to only the requested years
      const mYear = new Date(m.measurement_date).getFullYear()
      if (!params.years.includes(mYear)) {
        continue
      }

      // Generate certificate_no: PW-YYYYMMDD-001
      const dateStr = m.measurement_date.replace(/-/g, '')
      const certNo = `PW-${dateStr}-001`

      // Auto-fill pH result from measurement
      const results = params.defaultResults.map((r) => {
        if (r.test_item === 'pH' && m.ph_value != null) {
          return { ...r, result: String(Number(m.ph_value).toFixed(2)) }
        }
        return { ...r }
      })

      toInsert.push({
        certificate_no: certNo,
        test_date: m.measurement_date,
        results,
        overall_judgment: '합격함',
        recorded_by: params.recorded_by || null,
        collector_name: params.collector_name || '이온유',
        sample_quantity: params.sample_quantity || '200 g',
        collection_location: params.collection_location || '제조실',
        judge_name: params.judge_name || '박성철',
        measurement_id: m.id,
      })
    }

    // Batch insert
    const batchSize = 50
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize)
      const { error: insertErr } = await fromTable(supabase, 'qc_purified_water_certificates')
        .insert(batch)

      if (insertErr) {
        console.error(`Batch ${Math.floor(i / batchSize) + 1} error:`, insertErr.message)
        errors += batch.length
      } else {
        created += batch.length
      }
    }

    return { created, skipped, errors }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return { created: 0, skipped: 0, errors: 0, error: errorMessage }
  }
}

export async function fetchMeasurementByDate(date: string) {
  const supabase = await createClient()

  try {
    const { data, error } = await fromTable(
      supabase,
      'qc_purified_water_measurements'
    )
      .select('*')
      .eq('measurement_date', date)
      .single()

    if (error && error.code !== 'PGRST116') {
      return { measurement: null, error: error.message }
    }

    return {
      measurement: (data || null) as WaterMeasurement | null,
      error: null,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return { measurement: null, error: errorMessage }
  }
}

export interface ChartMeasurement {
  measurement_date: string
  ph_value: number | null
  resistivity: number | null
  conductivity: number | null
}

export async function fetchMeasurementsForChart(params: {
  year: number
  month?: number
}): Promise<{ data: ChartMeasurement[]; error: string | null }> {
  const supabase = await createClient()
  const { year, month } = params

  try {
    let startDate: string
    let endDate: string

    if (month) {
      const mm = String(month).padStart(2, '0')
      startDate = `${year}-${mm}-01`
      const lastDay = new Date(year, month, 0).getDate()
      endDate = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`
    } else {
      startDate = `${year}-01-01`
      endDate = `${year}-12-31`
    }

    const { data, error } = await fromTable(supabase, 'qc_purified_water_measurements')
      .select('measurement_date, ph_value, resistivity, conductivity')
      .gte('measurement_date', startDate)
      .lte('measurement_date', endDate)
      .order('measurement_date', { ascending: true })

    if (error) {
      return { data: [], error: error.message }
    }

    return { data: (data || []) as ChartMeasurement[], error: null }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return { data: [], error: errorMessage }
  }
}
