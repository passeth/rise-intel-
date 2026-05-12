import { NextRequest, NextResponse } from 'next/server'
import {
  getProductFolderPath,
  findProductFolder,
  resolveSubpath,
  listDirectory,
} from '@/lib/design-files'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const productCode = searchParams.get('productCode')
    const subpath = searchParams.get('subpath') || ''

    if (!productCode) {
      return NextResponse.json({ error: 'productCode is required' }, { status: 400 })
    }

    const productFolderPath = await getProductFolderPath(productCode)
    if (!productFolderPath) {
      return NextResponse.json({
        error: `${productCode}에 해당하는 디자인 폴더를 찾을 수 없습니다.`,
        productFolder: null,
        items: [],
      }, { status: 404 })
    }

    let targetPath = productFolderPath
    if (subpath) {
      const validated = resolveSubpath(productFolderPath, subpath)
      if (!validated) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
      }
      targetPath = validated
    }

    const items = await listDirectory(targetPath)
    const folderName = await findProductFolder(productCode)

    return NextResponse.json({
      productFolder: folderName,
      currentPath: subpath || '/',
      items,
    })
  } catch (err) {
    console.error('design-files/browse error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
