import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import {
  getProductFolderPath,
  resolveSubpath,
  getMimeType,
  downloadFile,
} from '@/lib/design-files'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const productCode = searchParams.get('productCode')
    const filepath = searchParams.get('filepath')

    if (!productCode || !filepath) {
      return NextResponse.json(
        { error: 'productCode and filepath are required' },
        { status: 400 }
      )
    }

    const productFolderPath = await getProductFolderPath(productCode)
    if (!productFolderPath) {
      return NextResponse.json({ error: 'Product folder not found' }, { status: 404 })
    }

    const validated = resolveSubpath(productFolderPath, filepath)
    if (!validated) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    const { buffer, size } = await downloadFile(validated)
    const filename = path.basename(validated)
    const mimeType = getMimeType(filename)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Content-Length': size.toString(),
      },
    })
  } catch (err) {
    console.error('design-files/download error:', err)
    const dropboxErr = err as { status?: number }
    if (dropboxErr.status === 409) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
