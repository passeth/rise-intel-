import path from 'path'
import { getDropboxClient, getBaseFolder, joinDropboxPath } from './dropbox/client'
import type { files } from 'dropbox'

export {
  isDatePrefixedFolder,
  findLatestVersionFolder,
  generateVersionFolderName,
} from './design-files-utils'

// ── Product Folder Matching ────────────────────────────────

export async function findProductFolder(productCode: string): Promise<string | null> {
  const dbx = getDropboxClient()
  const basePath = getBaseFolder()

  try {
    const res = await dbx.filesListFolder({ path: basePath })
    const match = res.result.entries.find(
      (e) => e['.tag'] === 'folder' && e.name.startsWith(productCode + '_')
    )
    return match ? match.name : null
  } catch (err) {
    const dropboxErr = err as { status?: number }
    if (dropboxErr.status === 409) return null
    throw err
  }
}

export async function getProductFolderPath(productCode: string): Promise<string | null> {
  const folderName = await findProductFolder(productCode)
  if (!folderName) return null
  return joinDropboxPath(getBaseFolder(), folderName)
}

// ── Path Validation ────────────────────────────────────────

export function resolveSubpath(basePath: string, subpath: string): string | null {
  const decoded = decodeURIComponent(subpath)
  if (decoded.includes('..')) return null
  return joinDropboxPath(basePath, decoded)
}

// ── File Type Helpers ──────────────────────────────────────

export type FileCategory = 'image' | 'pdf' | 'document' | 'spreadsheet' | 'design' | 'other'

const EXT_CATEGORY_MAP: Record<string, FileCategory> = {
  '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.gif': 'image',
  '.webp': 'image', '.bmp': 'image', '.svg': 'image',
  '.pdf': 'pdf',
  '.doc': 'document', '.docx': 'document', '.txt': 'document', '.rtf': 'document',
  '.hwp': 'document', '.hwpx': 'document',
  '.xls': 'spreadsheet', '.xlsx': 'spreadsheet', '.csv': 'spreadsheet',
  '.ai': 'design', '.psd': 'design', '.eps': 'design', '.indd': 'design',
  '.cdr': 'design', '.sketch': 'design', '.fig': 'design',
}

export function getFileCategory(filename: string): FileCategory {
  const ext = path.extname(filename).toLowerCase()
  return EXT_CATEGORY_MAP[ext] || 'other'
}

export type PreviewType = 'image' | 'pdf' | 'docx' | 'xlsx' | 'none'

export function getPreviewType(filename: string): PreviewType {
  const ext = path.extname(filename).toLowerCase()
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].includes(ext)) return 'image'
  if (['.pdf', '.ai', '.eps'].includes(ext)) return 'pdf'
  if (['.doc', '.docx'].includes(ext)) return 'docx'
  if (['.xls', '.xlsx'].includes(ext)) return 'xlsx'
  return 'none'
}

export function isPreviewable(filename: string): boolean {
  return getPreviewType(filename) !== 'none'
}

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv',
  '.txt': 'text/plain',
  '.rtf': 'application/rtf',
  '.ai': 'application/postscript',
  '.eps': 'application/postscript',
  '.psd': 'application/octet-stream',
}

export function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  return MIME_MAP[ext] || 'application/octet-stream'
}

// ── Directory Listing (Dropbox) ────────────────────────────

export interface FileEntry {
  name: string
  type: 'file' | 'folder'
  size: number | null
  modified: string | null
  category: FileCategory | null
  previewable: boolean
}

function toFileEntry(entry: files.MetadataReference): FileEntry | null {
  if (entry['.tag'] === 'folder') {
    return {
      name: entry.name,
      type: 'folder',
      size: null,
      modified: null,
      category: null,
      previewable: false,
    }
  }

  if (entry['.tag'] === 'file') {
    const fileMeta = entry as files.FileMetadataReference
    return {
      name: entry.name,
      type: 'file',
      size: fileMeta.size ?? null,
      modified: fileMeta.server_modified ?? null,
      category: getFileCategory(entry.name),
      previewable: isPreviewable(entry.name),
    }
  }

  return null
}

export async function listDirectory(dropboxPath: string): Promise<FileEntry[]> {
  const dbx = getDropboxClient()

  try {
    let entries: files.MetadataReference[] = []
    let res = await dbx.filesListFolder({ path: dropboxPath })
    entries = entries.concat(res.result.entries)

    while (res.result.has_more) {
      res = await dbx.filesListFolderContinue({ cursor: res.result.cursor })
      entries = entries.concat(res.result.entries)
    }

    const results: FileEntry[] = []
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const mapped = toFileEntry(entry)
      if (mapped) results.push(mapped)
    }

    results.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
      return a.name.localeCompare(b.name, 'ko')
    })

    return results
  } catch (err) {
    const dropboxErr = err as { status?: number }
    if (dropboxErr.status === 409) return []
    throw err
  }
}

// ── File Operations (Dropbox) ──────────────────────────────

export async function downloadFile(dropboxPath: string): Promise<{ buffer: Buffer; size: number }> {
  const dbx = getDropboxClient()
  const res = await dbx.filesDownload({ path: dropboxPath })
  const fileBlob = (res.result as files.FileMetadata & { fileBinary?: Buffer; fileBlob?: Blob }).fileBinary
    ?? (res.result as files.FileMetadata & { fileBlob?: Blob }).fileBlob

  let buffer: Buffer
  if (Buffer.isBuffer(fileBlob)) {
    buffer = fileBlob
  } else if (fileBlob instanceof Blob) {
    buffer = Buffer.from(await fileBlob.arrayBuffer())
  } else {
    throw new Error('Unexpected download response format')
  }

  return { buffer, size: buffer.length }
}

export async function uploadFile(
  dropboxPath: string,
  contents: Buffer
): Promise<files.FileMetadata> {
  const dbx = getDropboxClient()
  const res = await dbx.filesUpload({
    path: dropboxPath,
    mode: { '.tag': 'overwrite' },
    contents,
  })
  return res.result
}

export async function createFolder(dropboxPath: string): Promise<files.FolderMetadata> {
  const dbx = getDropboxClient()
  const res = await dbx.filesCreateFolderV2({ path: dropboxPath })
  return res.result.metadata
}

export async function copyFile(
  fromPath: string,
  toPath: string
): Promise<files.MetadataReference> {
  const dbx = getDropboxClient()
  const res = await dbx.filesCopyV2({
    from_path: fromPath,
    to_path: toPath,
  })
  return res.result.metadata
}

export async function folderExists(dropboxPath: string): Promise<boolean> {
  const dbx = getDropboxClient()
  try {
    const res = await dbx.filesGetMetadata({ path: dropboxPath })
    return res.result['.tag'] === 'folder'
  } catch (err) {
    const dropboxErr = err as { status?: number }
    if (dropboxErr.status === 409) return false
    throw err
  }
}

export async function copyDirectoryContents(
  srcDir: string,
  destDir: string
): Promise<{ copied: string[]; errors: string[] }> {
  const entries = await listDirectory(srcDir)
  const copied: string[] = []
  const errors: string[] = []

  for (const entry of entries) {
    if (entry.type !== 'file') continue
    try {
      await copyFile(
        joinDropboxPath(srcDir, entry.name),
        joinDropboxPath(destDir, entry.name)
      )
      copied.push(entry.name)
    } catch {
      errors.push(entry.name)
    }
  }

  return { copied, errors }
}

// ── Format Helpers ─────────────────────────────────────────

export function formatFileSize(bytes: number | null): string {
  if (bytes === null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
