import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import {
  getProductFolderPath,
  resolveSubpath,
  getMimeType,
  isPreviewable,
  getPreviewType,
  downloadFile,
} from '@/lib/design-files'

function wrapHtml(title: string, bodyContent: string, extraStyles = ''): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1a1a1a; padding: 32px; background: #fff; line-height: 1.6; }
  h1,h2,h3,h4,h5,h6 { margin: 1em 0 0.5em; }
  p { margin: 0.5em 0; }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 13px; }
  th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
  th { background: #f8fafc; font-weight: 600; color: #475569; white-space: nowrap; }
  tr:hover td { background: #f8fafc; }
  td { color: #334155; }
  ${extraStyles}
</style>
</head>
<body>${bodyContent}</body>
</html>`
}

async function convertDocxToHtml(buffer: Buffer, filename: string): Promise<string> {
  const result = await mammoth.convertToHtml({ buffer })
  return wrapHtml(filename, result.value)
}

function convertXlsxToHtml(buffer: Buffer, filename: string): string {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheets: string[] = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const html = XLSX.utils.sheet_to_html(sheet, { editable: false })
    const sheetTitle = workbook.SheetNames.length > 1
      ? `<h2 style="margin: 24px 0 12px; font-size: 16px; color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">${sheetName}</h2>`
      : ''
    sheets.push(sheetTitle + html)
  }

  return wrapHtml(filename, sheets.join(''))
}

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

    const filename = path.basename(validated)
    if (!isPreviewable(filename)) {
      return NextResponse.json(
        { error: 'This file type does not support preview' },
        { status: 400 }
      )
    }

    const { buffer, size } = await downloadFile(validated)
    const previewType = getPreviewType(filename)

    switch (previewType) {
      case 'docx': {
        const html = await convertDocxToHtml(buffer, filename)
        return new NextResponse(html, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        })
      }

      case 'xlsx': {
        const html = convertXlsxToHtml(buffer, filename)
        return new NextResponse(html, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        })
      }

      case 'pdf': {
        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
            'Content-Length': size.toString(),
            'Cache-Control': 'public, max-age=3600',
          },
        })
      }

      case 'image':
      default: {
        const mimeType = getMimeType(filename)
        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            'Content-Type': mimeType,
            'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
            'Content-Length': size.toString(),
            'Cache-Control': 'public, max-age=3600',
          },
        })
      }
    }
  } catch (err) {
    console.error('design-files/preview error:', err)
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
