/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchCpnpProductData } from '@/app/v2/pif/cpnp/data'
import type {
  CpnpDocumentResult,
  CpnpDocumentType,
  CpnpGenerationResponse,
  CpnpProductData,
  CpnpProductResult,
} from '@/app/v2/pif/cpnp/types'

const MAX_BATCH_SIZE = 50
const TEMPLATE_VERSION = 'finished-product-v1'

const VALID_DOCUMENT_TYPES: CpnpDocumentType[] = [
  'composition_formula',
  'single_formula',
  'allergen_list',
  'specification',
  'coa',
  'msds',
  'pet',
  'stability',
  'mlt',
]

const AUTO_GENERATABLE_TYPES = [
  'composition_formula',
  'single_formula',
  'allergen_list',
  'specification',
  'coa',
  'msds',
  'pet',
  'stability',
  'mlt',
] as const

const REUSABLE_ISSUED_TYPES = new Set<CpnpDocumentType>(['coa', 'msds'])

type AutoGeneratableDocumentType = (typeof AUTO_GENERATABLE_TYPES)[number]

type GeneratorFn = (
  data: CpnpProductData,
  options?: {
    issuedAt?: Date
  }
) => Promise<Blob>

type SupabaseUnknown = {
  from: (table: string) => any
  storage: any
}

type PackageRecord = {
  id: string | null
  packageNo: string | null
  documentCount: number
}

type LatestIssuedDocument = {
  id: string | null
  url: string
  generatedAt: string | null
}

const AUTO_GENERATABLE_TYPE_SET = new Set<CpnpDocumentType>(AUTO_GENERATABLE_TYPES)

function isAutoGeneratableType(type: CpnpDocumentType): type is AutoGeneratableDocumentType {
  return AUTO_GENERATABLE_TYPE_SET.has(type)
}

function isMissingOptionalTableError(error: { message?: string } | null | undefined): boolean {
  const message = error?.message ?? ''
  return (
    message.includes("Could not find the table 'public.cpnp_document_generations'") ||
    message.includes("Could not find the table 'public.cpnp_packages'") ||
    message.includes("Could not find the table 'public.cpnp_package_documents'") ||
    message.includes('schema cache')
  )
}

function formatKoreaDateForFileName(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value ?? '00'
  const month = parts.find((part) => part.type === 'month')?.value ?? '00'
  const day = parts.find((part) => part.type === 'day')?.value ?? '00'

  return `${year}${month}${day}`
}

function formatKoreaDateForIssue(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value ?? '0000'
  const month = parts.find((part) => part.type === 'month')?.value ?? '00'
  const day = parts.find((part) => part.type === 'day')?.value ?? '00'

  return `${year}-${month}-${day}`
}

function formatKoreaTimestampForPackage(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '00'

  return `${value('year')}${value('month')}${value('day')}-${value('hour')}${value('minute')}${value('second')}`
}

function sanitizePdfFileNamePart(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|#%{}^~[\]`]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/\.+$/g, '')
    .trim()
}

function buildCpnpPdfFileName(data: CpnpProductData, date: Date): string {
  const productCode = sanitizePdfFileNamePart(data.product.product_code || 'product')
  const productEnglishName = sanitizePdfFileNamePart(
    data.product.english_name || data.product.korean_name || data.product.product_code || 'product'
  )
  const yymmdd = formatKoreaDateForFileName(date)

  return `${productCode}_${productEnglishName}_${yymmdd}.pdf`
}

function buildPackageNo(date: Date): string {
  return `CPNP-${formatKoreaTimestampForPackage(date)}`
}

function buildTemplateKey(type: CpnpDocumentType): string {
  if (type === 'coa') return 'finished_product_coa'
  if (type === 'msds') return 'finished_product_msds'
  return `cpnp_${type}`
}

function buildSourceSnapshot(data: CpnpProductData, type: CpnpDocumentType) {
  const base = {
    product: data.product,
    inci: data.inci,
  }

  if (type === 'coa') {
    return {
      ...base,
      coaCertificate: data.coaCertificate,
      englishSpecs: data.englishSpecs,
      qcSpecs: data.qcSpecs,
    }
  }

  if (type === 'msds') {
    return {
      ...base,
      bom: data.bom,
      qcSpecs: data.qcSpecs,
      englishSpecs: data.englishSpecs,
    }
  }

  return {
    ...base,
    bom: data.bom,
    qcSpecs: data.qcSpecs,
    englishSpecs: data.englishSpecs,
    petCertificate: data.petCertificate,
    stabilityCertificate: data.stabilityCertificate,
    mltCertificate: data.mltCertificate,
  }
}

function hashSnapshot(snapshot: unknown): string {
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')
}

function getSourceCertificateId(data: CpnpProductData, type: CpnpDocumentType): string | null {
  if (type === 'coa') return data.coaCertificate?.id ?? null
  if (type === 'pet') return data.petCertificate?.id ?? null
  if (type === 'stability') return data.stabilityCertificate?.id ?? null
  if (type === 'mlt') return data.mltCertificate?.id ?? null
  return null
}

async function findLatestIssuedDocument(
  supabase: SupabaseUnknown,
  productCode: string,
  type: CpnpDocumentType,
  sourceHash: string
): Promise<LatestIssuedDocument | null> {
  const { data, error } = await supabase
    .from('cpnp_document_generations')
    .select('id, pdf_url, generated_at')
    .eq('product_code', productCode)
    .eq('document_type', type)
    .eq('source_hash', sourceHash)
    .in('status', ['generated', 'issued'])
    .not('pdf_url', 'is', null)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    if (isMissingOptionalTableError(error)) return null
    return null
  }

  const row = data as Record<string, unknown> | null
  const url = typeof row?.pdf_url === 'string' ? row.pdf_url : null
  if (!url) return null

  return {
    id: typeof row?.id === 'string' ? row.id : null,
    url,
    generatedAt: typeof row?.generated_at === 'string' ? row.generated_at : null,
  }
}

async function createPackage(
  supabase: SupabaseUnknown,
  packageNo: string,
  productCodes: string[],
  documentTypes: CpnpDocumentType[]
): Promise<PackageRecord | null> {
  const { data, error } = await supabase
    .from('cpnp_packages')
    .insert({
      package_no: packageNo,
      product_codes: productCodes,
      document_types: documentTypes,
      status: 'issued',
      metadata: {
        product_count: productCodes.length,
        document_count: productCodes.length * documentTypes.length,
      },
    })
    .select('id, package_no')
    .maybeSingle()

  if (error) {
    if (isMissingOptionalTableError(error)) return null
    return null
  }

  const row = data as Record<string, unknown> | null
  return {
    id: typeof row?.id === 'string' ? row.id : null,
    packageNo: typeof row?.package_no === 'string' ? row.package_no : packageNo,
    documentCount: 0,
  }
}

async function recordGeneration(
  supabase: SupabaseUnknown,
  values: Record<string, unknown>
): Promise<string | null> {
  const { data, error } = await supabase
    .from('cpnp_document_generations')
    .insert(values)
    .select('id')
    .maybeSingle()

  if (!error) {
    const row = data as Record<string, unknown> | null
    return typeof row?.id === 'string' ? row.id : null
  }

  if (isMissingOptionalTableError(error)) {
    return null
  }

  const legacyValues = {
    product_code: values.product_code,
    document_type: values.document_type,
    generated_at: values.generated_at,
    pdf_url: values.pdf_url,
    status: values.status,
    metadata: values.metadata,
  }

  const legacyResult = await supabase
    .from('cpnp_document_generations')
    .insert(legacyValues)
    .select('id')
    .maybeSingle()

  if (legacyResult.error) {
    if (isMissingOptionalTableError(legacyResult.error)) return null
    throw new Error(`DB insert failed: ${legacyResult.error.message}`)
  }

  const row = legacyResult.data as Record<string, unknown> | null
  return typeof row?.id === 'string' ? row.id : null
}

async function addPackageDocument(
  supabase: SupabaseUnknown,
  packageRecord: PackageRecord | null,
  values: {
    generationId: string | null
    productCode: string
    documentType: CpnpDocumentType
    pdfUrl: string
    displayOrder: number
    reused: boolean
  }
): Promise<void> {
  if (!packageRecord?.id) return

  const { error } = await supabase.from('cpnp_package_documents').insert({
    package_id: packageRecord.id,
    document_generation_id: values.generationId,
    product_code: values.productCode,
    document_type: values.documentType,
    pdf_url: values.pdfUrl,
    display_order: values.displayOrder,
    status: 'included',
    metadata: {
      reused: values.reused,
      package_no: packageRecord.packageNo,
    },
  })

  if (!error) {
    packageRecord.documentCount += 1
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      productCodes?: unknown
      documents?: unknown
      reuseIssuedDocuments?: unknown
    }

    const productCodes = body.productCodes
    const documents = body.documents
    const reuseIssuedDocuments = body.reuseIssuedDocuments !== false

    if (!Array.isArray(productCodes) || productCodes.length === 0) {
      return NextResponse.json({ error: 'productCodes must be a non-empty array' }, { status: 400 })
    }

    if (productCodes.some((code) => typeof code !== 'string' || !code.trim())) {
      return NextResponse.json({ error: 'productCodes must contain non-empty strings only' }, { status: 400 })
    }

    if (productCodes.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Maximum ${MAX_BATCH_SIZE} products per batch` },
        { status: 400 }
      )
    }

    if (!Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json({ error: 'documents must be a non-empty array' }, { status: 400 })
    }

    if (documents.some((doc) => typeof doc !== 'string')) {
      return NextResponse.json({ error: 'documents must contain strings only' }, { status: 400 })
    }

    const requestedDocuments = documents as string[]
    const invalidDocumentType = requestedDocuments.find(
      (doc) => !VALID_DOCUMENT_TYPES.includes(doc as CpnpDocumentType)
    )

    if (invalidDocumentType) {
      return NextResponse.json(
        { error: `Invalid document type: ${invalidDocumentType}` },
        { status: 400 }
      )
    }

    const requestedTypes = requestedDocuments as CpnpDocumentType[]
    const normalizedProductCodes = productCodes.map((code) => code.trim())
    const packageNo = buildPackageNo(new Date())

    const { generateCompositionFormulaPdf } = await import(
      '@/lib/doc-gen/cpnp/pdf-composition-formula'
    )
    const { generateSingleFormulaPdf } = await import('@/lib/doc-gen/cpnp/pdf-single-formula')
    const { generateAllergenListPdf } = await import('@/lib/doc-gen/cpnp/pdf-allergen-list')
    const { generateSpecificationPdf } = await import('@/lib/doc-gen/cpnp/pdf-specification')
    const { generateCoaPdf } = await import('@/lib/doc-gen/cpnp/pdf-coa')
    const { generateMsdsPdf } = await import('@/lib/doc-gen/cpnp/pdf-msds')
    const { generatePetPdf } = await import('@/lib/doc-gen/cpnp/pdf-pet')
    const { generateStabilityPdf } = await import('@/lib/doc-gen/cpnp/pdf-stability')
    const { generateMltPdf } = await import('@/lib/doc-gen/cpnp/pdf-mlt')

    const generators: Record<AutoGeneratableDocumentType, GeneratorFn> = {
      composition_formula: generateCompositionFormulaPdf,
      single_formula: generateSingleFormulaPdf,
      allergen_list: generateAllergenListPdf,
      specification: generateSpecificationPdf,
      coa: generateCoaPdf,
      msds: generateMsdsPdf,
      pet: generatePetPdf,
      stability: generateStabilityPdf,
      mlt: generateMltPdf,
    }

    const supabase = (await createClient()) as unknown as SupabaseUnknown
    const packageRecord = await createPackage(supabase, packageNo, normalizedProductCodes, requestedTypes)
    const results: CpnpProductResult[] = []

    const uploadFile = async (blob: Blob, path: string): Promise<string> => {
      const buffer = Buffer.from(await blob.arrayBuffer())
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(path, buffer, { contentType: 'application/pdf', upsert: true })

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      const { data } = supabase.storage.from('documents').getPublicUrl(path)
      return data.publicUrl
    }

    for (const productCode of normalizedProductCodes) {
      try {
        const data = await fetchCpnpProductData(productCode)
        if (!data) {
          const missingDataDocuments: CpnpDocumentResult[] = requestedTypes.map((type) => ({
            type,
            error: '제품 데이터를 찾을 수 없습니다',
          }))

          results.push({
            productCode,
            productName: productCode,
            documents: missingDataDocuments,
          })
          continue
        }

        const productName = data.product.english_name || data.product.korean_name || productCode

        const documentTasks = requestedTypes.map(async (type, documentIndex): Promise<CpnpDocumentResult> => {
          if (!isAutoGeneratableType(type)) {
            return {
              type,
              error: '이 서류 유형은 자동 생성을 지원하지 않습니다',
            }
          }

          const generator = generators[type]

          try {
            const generatedAtDate = new Date()
            const generatedAt = generatedAtDate.toISOString()
            const issuedDate = formatKoreaDateForIssue(generatedAtDate)
            const sourceSnapshot = buildSourceSnapshot(data, type)
            const sourceHash = hashSnapshot(sourceSnapshot)

            if (reuseIssuedDocuments && REUSABLE_ISSUED_TYPES.has(type)) {
              const latestIssuedDocument = await findLatestIssuedDocument(
                supabase,
                productCode,
                type,
                sourceHash
              )

              if (latestIssuedDocument) {
                await addPackageDocument(supabase, packageRecord, {
                  generationId: latestIssuedDocument.id,
                  productCode,
                  documentType: type,
                  pdfUrl: latestIssuedDocument.url,
                  displayOrder: documentIndex,
                  reused: true,
                })

                return {
                  type,
                  url: latestIssuedDocument.url,
                  generationId: latestIssuedDocument.id,
                  reused: true,
                }
              }
            }

            const fileName = buildCpnpPdfFileName(data, generatedAtDate)
            const filePath = `cpnp/${productCode}/${type}/${fileName}`
            const pdfBlob = await generator(data, { issuedAt: generatedAtDate })
            const url = await uploadFile(pdfBlob, filePath)
            const metadata = {
              product_name: productName,
              package_no: packageRecord?.packageNo ?? packageNo,
              template_key: buildTemplateKey(type),
              template_version: TEMPLATE_VERSION,
              reused: false,
              issued_date: issuedDate,
            }

            const generationId = await recordGeneration(supabase, {
              product_code: productCode,
              document_type: type,
              generated_at: generatedAt,
              issued_date: issuedDate,
              pdf_url: url,
              storage_path: filePath,
              status: 'issued',
              template_key: buildTemplateKey(type),
              template_version: TEMPLATE_VERSION,
              source_certificate_id: getSourceCertificateId(data, type),
              source_hash: sourceHash,
              source_snapshot: sourceSnapshot,
              metadata,
            })

            await addPackageDocument(supabase, packageRecord, {
              generationId,
              productCode,
              documentType: type,
              pdfUrl: url,
              displayOrder: documentIndex,
              reused: false,
            })

            return {
              type,
              url,
              generationId,
              reused: false,
            }
          } catch (error) {
            return {
              type,
              error: error instanceof Error ? error.message : '문서 생성 중 알 수 없는 오류가 발생했습니다',
            }
          }
        })

        const documentResults = await Promise.all(documentTasks)

        results.push({
          productCode,
          productName,
          documents: documentResults,
        })
      } catch (error) {
        const failedDocuments: CpnpDocumentResult[] = requestedTypes.map((type) => ({
          type,
          error: error instanceof Error ? error.message : '제품 처리 중 알 수 없는 오류가 발생했습니다',
        }))

        results.push({
          productCode,
          productName: productCode,
          documents: failedDocuments,
        })
      }
    }

    const totalDocuments = results.reduce((sum, productResult) => sum + productResult.documents.length, 0)
    const successDocuments = results.reduce(
      (sum, productResult) =>
        sum + productResult.documents.filter((documentResult) => !documentResult.error && documentResult.url).length,
      0
    )

    const responseStatus: CpnpGenerationResponse['status'] =
      successDocuments === 0
        ? 'error'
        : successDocuments === totalDocuments
          ? 'success'
          : 'partial'

    const response: CpnpGenerationResponse = {
      status: responseStatus,
      results,
      package: packageRecord,
    }

    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        results: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
