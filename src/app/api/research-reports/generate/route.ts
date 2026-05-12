import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClaudeClient, CLAUDE_MODEL, extractTextContent } from '@/lib/claude'
import { buildReportPrompt, type IngredientContext } from '@/app/ingredient-intelligence/_lib/report-prompts'
import { getReportTypeConfig } from '@/app/ingredient-intelligence/_lib/report-types'

// Allow up to 60 seconds for AI generation
export const maxDuration = 60

interface GenerateRequest {
  reportType: string
  inciNameNormalized: string
  subjectName?: string
  secondIngredient?: string // For compatibility checks
  // Formula analysis fields
  subjectType?: 'ingredient' | 'product' | 'formula'
  formulaIngredients?: string[] // For formula_analysis
}

/**
 * POST /api/research-reports/generate
 * 
 * Gathers DB context for the ingredient → builds prompt → calls Claude → saves report to DB.
 * Returns the saved report row.
 */
export async function POST(request: Request) {
  const startTime = Date.now()

  try {
    const body: GenerateRequest = await request.json()
    const { reportType, inciNameNormalized, subjectName, secondIngredient, subjectType, formulaIngredients } = body

    if (!reportType || !inciNameNormalized) {
      return NextResponse.json({ error: 'reportType and inciNameNormalized are required' }, { status: 400 })
    }

    const supabase = await createClient()

    // ── Step 1: Create placeholder report row (status: 'generating') ──
    const reportConfig = getReportTypeConfig(reportType)
    const reportTitle = `${reportConfig?.labelKr || reportType} — ${subjectName || inciNameNormalized}`

    const effectiveSubjectType = subjectType || 'ingredient'

    const { data: reportRow, error: insertError } = await supabase
      .from('lab_research_reports')
      .insert({
        subject_type: effectiveSubjectType,
        subject_identifier: inciNameNormalized,
        subject_name: subjectName || inciNameNormalized,
        report_type: reportType,
        report_title: reportTitle,
        report_status: 'generating',
        related_ingredients: secondIngredient ? [inciNameNormalized, secondIngredient] : (formulaIngredients || [inciNameNormalized]),
      })
      .select('id')
      .single()

    if (insertError || !reportRow) {
      console.error('Failed to create report row:', insertError)
      return NextResponse.json({ error: 'Failed to create report entry' }, { status: 500 })
    }

    const reportId = reportRow.id

    // ── Step 2: Gather DB context ──
    // For formula_analysis, context is the ingredient list itself, not a single ingredient lookup
    const ctx = reportType === 'formula_analysis'
      ? buildFormulaContext(subjectName || inciNameNormalized)
      : await gatherIngredientContext(supabase, inciNameNormalized)

    // ── Step 3: Build prompt and call Claude ──
    const { system, user } = buildReportPrompt(reportType, ctx, secondIngredient, formulaIngredients)

    const claude = getClaudeClient()
    const aiResponse = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: user }],
    })

    const markdown = extractTextContent(aiResponse)

    // Extract summary (first 200 chars of markdown)
    const summaryText = markdown.replace(/^#+\s*/gm, '').replace(/\*\*/g, '').substring(0, 200).trim()

    const generationTimeMs = Date.now() - startTime

    // ── Step 4: Update report with results ──
    const { error: updateError } = await supabase
      .from('lab_research_reports')
      .update({
        report_status: 'completed',
        report_markdown: markdown,
        report_summary: summaryText,
        report_content: JSON.parse(JSON.stringify({ raw_response: aiResponse.content })),
        model_used: CLAUDE_MODEL,
        skills_used: reportConfig ? [reportConfig.id] : [],
        input_context: { system: system.substring(0, 500), user_prompt_length: user.length },
        token_usage: { input_tokens: aiResponse.usage?.input_tokens, output_tokens: aiResponse.usage?.output_tokens },
        generation_time_ms: generationTimeMs,
      })
      .eq('id', reportId)

    if (updateError) {
      console.error('Failed to update report:', updateError)
      return NextResponse.json({ error: 'Report generated but failed to save' }, { status: 500 })
    }

    // ── Step 5: Return the completed report ──
    const { data: finalReport } = await supabase
      .from('lab_research_reports')
      .select('*')
      .eq('id', reportId)
      .single()

    return NextResponse.json({ success: true, report: finalReport })
  } catch (error) {
    console.error('Report generation error:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error during report generation' },
      { status: 500 }
    )
  }
}

// ── Helper: Build minimal context for formula analysis (no single-ingredient DB lookup) ──

function buildFormulaContext(subjectName: string): IngredientContext {
  return {
    inci_name: subjectName,
    korean_name: null,
    rating: null,
    functions: null,
    quick_facts: null,
    details: null,
    efficacy_kr: null,
    key_mechanisms: null,
    clinical_studies_summary: null,
    inci_definition: null,
    cosing_cas_number: null,
    skin_benefits: null,
    mfds_registered: null,
    mfds_restricted: null,
    regulations: [],
    internal_usage: [],
    market_product_count: 0,
    top_brands: [],
  }
}

// ── Helper: Gather all available DB context for an ingredient ──

async function gatherIngredientContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  inciNameNormalized: string
): Promise<IngredientContext> {
  // Parallel fetch all data sources
  const [matchResult, regulationsResult, internalResult, marketResult] = await Promise.all([
    // Bridge table + related data
    supabase
      .from('lab_inci_matches')
      .select('inci_name_normalized, korean_name, incidecoder_slug, vectors_ingredient_id, vp_ingredient_id, mfds_registered, mfds_restricted')
      .eq('inci_name_normalized', inciNameNormalized)
      .maybeSingle(),

    // Regulations
    supabase
      .from('lab_regulations')
      .select('regulation_source, regulation_type, max_concentration, conditions')
      .ilike('inci_name', inciNameNormalized)
      .limit(30),

    // Internal usage
    supabase
      .from('labdoc_ingredient_components')
      .select('ingredient_code, composition_ratio')
      .ilike('inci_name_en', inciNameNormalized),

    // Market stats (count)
    supabase
      .from('lab_ingredient_product')
      .select('product_slug', { count: 'exact', head: true })
      .eq('ingredient_slug', inciNameNormalized.toLowerCase().replace(/[^a-z0-9]+/g, '-')),
  ])

  const match = matchResult.data
  const ctx: IngredientContext = {
    inci_name: inciNameNormalized,
    korean_name: match?.korean_name ?? null,
    rating: null,
    functions: null,
    quick_facts: null,
    details: null,
    efficacy_kr: null,
    key_mechanisms: null,
    clinical_studies_summary: null,
    inci_definition: null,
    cosing_cas_number: null,
    skin_benefits: null,
    mfds_registered: match?.mfds_registered ?? null,
    mfds_restricted: match?.mfds_restricted ?? null,
    regulations: (regulationsResult.data ?? []).map((r) => ({
      source: r.regulation_source,
      type: r.regulation_type,
      max_concentration: r.max_concentration,
      conditions: r.conditions,
    })),
    internal_usage: [],
    market_product_count: marketResult.count ?? 0,
    top_brands: [],
  }

  // Fetch INCIDecoder data
  if (match?.incidecoder_slug) {
    const { data: inci } = await supabase
      .from('lab_ingredients')
      .select('name, rating, functions, quick_facts, details, cosing_cas_number')
      .eq('slug', match.incidecoder_slug)
      .maybeSingle()

    if (inci) {
      ctx.rating = inci.rating
      ctx.functions = inci.functions
      ctx.quick_facts = inci.quick_facts
      ctx.details = inci.details
      ctx.cosing_cas_number = inci.cosing_cas_number
    }

    // Top brands
    const { data: brandProducts } = await supabase
      .from('lab_ingredient_product')
      .select('product_slug')
      .eq('ingredient_slug', match.incidecoder_slug)
      .limit(200)

    if (brandProducts && brandProducts.length > 0) {
      const slugs = brandProducts.map((bp) => bp.product_slug)
      const { data: products } = await supabase
        .from('lab_products')
        .select('brand')
        .in('slug', slugs.slice(0, 100))

      if (products) {
        const brandCounts = new Map<string, number>()
        products.forEach((p) => {
          if (p.brand) brandCounts.set(p.brand, (brandCounts.get(p.brand) ?? 0) + 1)
        })
        ctx.top_brands = Array.from(brandCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([brand]) => brand)
      }
    }
  }

  // Fetch AI enriched data
  if (match?.vectors_ingredient_id) {
    const { data: vectors } = await supabase
      .from('vectors_ingredient')
      .select('efficacy_kr, key_mechanisms, clinical_studies_summary, inci_definition')
      .eq('id', match.vectors_ingredient_id)
      .maybeSingle()

    if (vectors) {
      ctx.efficacy_kr = vectors.efficacy_kr
      ctx.key_mechanisms = vectors.key_mechanisms
      ctx.clinical_studies_summary = vectors.clinical_studies_summary
      ctx.inci_definition = vectors.inci_definition
    }
  }

  // Fetch legacy data
  if (match?.vp_ingredient_id) {
    const { data: vp } = await supabase
      .from('vp_ingredient')
      .select('skin_benefits')
      .eq('id', match.vp_ingredient_id)
      .maybeSingle()

    if (vp) ctx.skin_benefits = vp.skin_benefits
  }

  // Internal usage with names
  if (internalResult.data && internalResult.data.length > 0) {
    const codes = [...new Set(internalResult.data.map((d) => d.ingredient_code))]
    const { data: ingredients } = await supabase
      .from('labdoc_ingredients')
      .select('ingredient_code, ingredient_name')
      .in('ingredient_code', codes)

    const nameMap = new Map<string, string>()
    ;(ingredients ?? []).forEach((i) => nameMap.set(i.ingredient_code, i.ingredient_name))

    ctx.internal_usage = internalResult.data.map((d) => ({
      ingredient_code: d.ingredient_code,
      ingredient_name: nameMap.get(d.ingredient_code) ?? d.ingredient_code,
      composition_ratio: d.composition_ratio ? Number(d.composition_ratio) : null,
    }))
  }

  return ctx
}
