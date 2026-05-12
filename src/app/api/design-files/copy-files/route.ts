import { NextRequest, NextResponse } from 'next/server'
import {
  getProductFolderPath,
  resolveSubpath,
  folderExists,
  copyDirectoryContents,
} from '@/lib/design-files'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productCode, sourceSubpath, targetSubpath } = body as {
      productCode?: string
      sourceSubpath?: string
      targetSubpath?: string
    }

    if (!productCode || !sourceSubpath || !targetSubpath) {
      return NextResponse.json(
        { error: 'productCode, sourceSubpath, and targetSubpath are required' },
        { status: 400 }
      )
    }

    const productFolderPath = await getProductFolderPath(productCode)
    if (!productFolderPath) {
      return NextResponse.json({ error: 'Product folder not found' }, { status: 404 })
    }

    const srcPath = resolveSubpath(productFolderPath, sourceSubpath)
    if (!srcPath || !(await folderExists(srcPath))) {
      return NextResponse.json({ error: 'Source folder not found' }, { status: 404 })
    }

    const destPath = resolveSubpath(productFolderPath, targetSubpath)
    if (!destPath || !(await folderExists(destPath))) {
      return NextResponse.json({ error: 'Target folder not found' }, { status: 404 })
    }

    const result = await copyDirectoryContents(srcPath, destPath)

    return NextResponse.json({
      success: true,
      copied: result.copied,
      errors: result.errors,
    })
  } catch (err) {
    console.error('design-files/copy-files error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
