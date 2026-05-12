import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import {
  getProductFolderPath,
  resolveSubpath,
  uploadFile,
} from '@/lib/design-files'

export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const productCode = formData.get('productCode') as string | null
    const filepath = formData.get('filepath') as string | null

    if (!file || !productCode || !filepath) {
      return NextResponse.json(
        { error: 'file, productCode, and filepath are required' },
        { status: 400 }
      )
    }

    const ext = path.extname(filepath).toLowerCase()
    if (ext !== '.xlsx' && ext !== '.xls') {
      return NextResponse.json(
        { error: 'Only .xlsx and .xls files can be saved' },
        { status: 400 }
      )
    }

    const productFolderPath = await getProductFolderPath(productCode)
    if (!productFolderPath) {
      return NextResponse.json({ error: 'Product folder not found' }, { status: 404 })
    }

    const validated = resolveSubpath(productFolderPath, filepath)
    if (!validated) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    await uploadFile(validated, buffer)

    return NextResponse.json({
      success: true,
      name: path.basename(filepath),
      size: buffer.length,
    })
  } catch (err) {
    console.error('design-files/save-xlsx error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
