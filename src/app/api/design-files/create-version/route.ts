import { NextRequest, NextResponse } from 'next/server'
import {
  getProductFolderPath,
  resolveSubpath,
  folderExists,
  listDirectory,
  findLatestVersionFolder,
  generateVersionFolderName,
  createFolder,
} from '@/lib/design-files'
import { joinDropboxPath } from '@/lib/dropbox/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productCode, subpath } = body as { productCode?: string; subpath?: string }

    if (!productCode || !subpath) {
      return NextResponse.json(
        { error: 'productCode and subpath are required' },
        { status: 400 }
      )
    }

    const productFolderPath = await getProductFolderPath(productCode)
    if (!productFolderPath) {
      return NextResponse.json({ error: 'Product folder not found' }, { status: 404 })
    }

    const subsidiaryPath = resolveSubpath(productFolderPath, subpath)
    if (!subsidiaryPath || !(await folderExists(subsidiaryPath))) {
      return NextResponse.json({ error: 'Subsidiary folder not found' }, { status: 404 })
    }

    const entries = await listDirectory(subsidiaryPath)
    const latest = findLatestVersionFolder(entries)
    if (!latest) {
      return NextResponse.json(
        { error: '이전 발주 폴더가 없습니다' },
        { status: 400 }
      )
    }

    const newFolderName = generateVersionFolderName(latest.name)
    const newFolderPath = joinDropboxPath(subsidiaryPath, newFolderName)

    if (await folderExists(newFolderPath)) {
      return NextResponse.json(
        { error: '오늘 날짜의 발주 폴더가 이미 존재합니다', folderName: newFolderName },
        { status: 409 }
      )
    }

    await createFolder(newFolderPath)

    return NextResponse.json({
      success: true,
      folderName: newFolderName,
      folderPath: `${subpath}/${newFolderName}`,
      latestFolder: latest.name,
    })
  } catch (err) {
    console.error('design-files/create-version error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
