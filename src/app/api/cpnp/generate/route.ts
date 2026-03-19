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
] as const

type AutoGeneratableDocumentType = (typeof AUTO_GENERATABLE_TYPES)[number]

type GeneratorFn = (data: CpnpProductData) => Promise<Blob>

const AUTO_GENERATABLE_TYPE_SET = new Set<CpnpDocumentType>(AUTO_GENERATABLE_TYPES)

function isAutoGeneratableType(type: CpnpDocumentType): type is AutoGeneratableDocumentType {
  return AUTO_GENERATABLE_TYPE_SET.has(type)
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      productCodes?: unknown
      documents?: unknown
    }

    const productCodes = body.productCodes
    const documents = body.documents

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

    const { generateCompositionFormulaPdf } = await import(
      '@/lib/doc-gen/cpnp/pdf-composition-formula'
    )
    const { generateSingleFormulaPdf } = await import('@/lib/doc-gen/cpnp/pdf-single-formula')
    const { generateAllergenListPdf } = await import('@/lib/doc-gen/cpnp/pdf-allergen-list')
    const { generateSpecificationPdf } = await import('@/lib/doc-gen/cpnp/pdf-specification')
    const { generateCoaPdf } = await import('@/lib/doc-gen/cpnp/pdf-coa')

    const generators: Record<AutoGeneratableDocumentType, GeneratorFn> = {
      composition_formula: generateCompositionFormulaPdf,
      single_formula: generateSingleFormulaPdf,
      allergen_list: generateAllergenListPdf,
      specification: generateSpecificationPdf,
      coa: generateCoaPdf,
    }

    const supabase = await createClient()
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

    for (const rawProductCode of productCodes) {
      const productCode = rawProductCode.trim()

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

        const documentTasks = requestedTypes.map(async (type): Promise<CpnpDocumentResult> => {
          if (!isAutoGeneratableType(type)) {
            return {
              type,
              error: '이 서류 유형은 자동 생성을 지원하지 않습니다',
            }
          }

          const generator = generators[type]

          try {
            const timestamp = new Date().toISOString().replace(/:/g, '-')
            const filePath = `cpnp/${productCode}/${type}/${timestamp}.pdf`
            const pdfBlob = await generator(data)
            const url = await uploadFile(pdfBlob, filePath)

            const generatedAt = new Date().toISOString()
            const insertIntoUnknownTable = supabase.from as unknown as (table: string) => {
              insert: (
                values: Record<string, unknown>
              ) => Promise<{ error: { message: string } | null }>
            }
            const { error: dbError } = await insertIntoUnknownTable('cpnp_document_generations').insert({
              product_code: productCode,
              document_type: type,
              generated_at: generatedAt,
              pdf_url: url,
              status: 'generated',
              metadata: {
                product_name: productName,
              },
            })

            if (dbError) {
              throw new Error(`DB insert failed: ${dbError.message}`)
            }

            return {
              type,
              url,
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
