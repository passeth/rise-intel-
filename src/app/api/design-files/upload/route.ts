import { NextRequest, NextResponse } from 'next/server'
import {
  getProductFolderPath,
  resolveSubpath,
  uploadFile,
} from '@/lib/design-files'
import { joinDropboxPath } from '@/lib/dropbox/client'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const productCode = formData.get('productCode') as string | null
    const subpath = formData.get('subpath') as string | ''

    if (!file || !productCode) {
      return NextResponse.json(
        { error: 'file and productCode are required' },
        { status: 400 }
      )
    }

    const productFolderPath = await getProductFolderPath(productCode)
    if (!productFolderPath) {
      return NextResponse.json({ error: 'Product folder not found' }, { status: 404 })
    }

    let targetDir = productFolderPath
    if (subpath) {
      const validated = resolveSubpath(productFolderPath, subpath)
      if (!validated) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
      }
      targetDir = validated
    }

    const targetPath = joinDropboxPath(targetDir, file.name)
    const buffer = Buffer.from(await file.arrayBuffer())
    await uploadFile(targetPath, buffer)

    return NextResponse.json({
      success: true,
      name: file.name,
      size: file.size,
    })
  } catch (err) {
    console.error('design-files/upload error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
