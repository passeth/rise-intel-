'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  Folder,
  File,
  FileImage,
  FileText,
  FileSpreadsheet,
  Pen,
  ArrowLeft,
  Download,
  Upload,
  Eye,
  X,
  Loader2,
  AlertCircle,
  ChevronRight,
  FolderOpen,
  HardDrive,
  FolderPlus,
  Pencil,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  isDatePrefixedFolder,
  findLatestVersionFolder,
  generateVersionFolderName,
} from '@/lib/design-files-utils'

const UniverXlsxEditor = dynamic(
  () => import('@/components/univer-xlsx-editor'),
  { ssr: false }
)

interface FileEntry {
  name: string
  type: 'file' | 'folder'
  size: number | null
  modified: string | null
  category: 'image' | 'pdf' | 'document' | 'spreadsheet' | 'design' | 'other' | null
  previewable: boolean
}

interface BrowseResponse {
  productFolder: string | null
  currentPath: string
  items: FileEntry[]
  error?: string
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return '—'
  return new Date(isoDate).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function getFileIcon(entry: FileEntry) {
  if (entry.type === 'folder') return <Folder size={18} className="text-amber-500" />

  switch (entry.category) {
    case 'image': return <FileImage size={18} className="text-emerald-500" />
    case 'pdf': return <FileText size={18} className="text-red-500" />
    case 'document': return <FileText size={18} className="text-blue-500" />
    case 'spreadsheet': return <FileSpreadsheet size={18} className="text-green-600" />
    case 'design': return <Pen size={18} className="text-purple-500" />
    default: return <File size={18} className="text-slate-400" />
  }
}

export default function SubsidiaryMaterialsPage() {
  const { productCode } = useParams<{ productCode: string }>()
  const decodedProductCode = decodeURIComponent(productCode)
  const queryClient = useQueryClient()

  const [pathStack, setPathStack] = useState<string[]>([])
  const [previewFile, setPreviewFile] = useState<string | null>(null)
  const [previewName, setPreviewName] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [editingXlsx, setEditingXlsx] = useState<{ filepath: string; filename: string } | null>(null)
  const [creatingVersion, setCreatingVersion] = useState(false)
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentSubpath = pathStack.join('/')

  const { data, isLoading, error } = useQuery<BrowseResponse>({
    queryKey: ['design-files', decodedProductCode, currentSubpath],
    queryFn: async () => {
      const params = new URLSearchParams({ productCode: decodedProductCode })
      if (currentSubpath) params.set('subpath', currentSubpath)
      const res = await fetch(`/api/design-files/browse?${params}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      return res.json()
    },
  })

  const navigateInto = useCallback((folderName: string) => {
    setPathStack((prev) => [...prev, folderName])
  }, [])

  const navigateBack = useCallback(() => {
    setPathStack((prev) => prev.slice(0, -1))
  }, [])

  const navigateToBreadcrumb = useCallback((index: number) => {
    setPathStack((prev) => prev.slice(0, index))
  }, [])

  const buildFilePath = useCallback(
    (fileName: string) => {
      return currentSubpath ? `${currentSubpath}/${fileName}` : fileName
    },
    [currentSubpath]
  )

  const handleDownload = useCallback(
    (fileName: string) => {
      const filepath = buildFilePath(fileName)
      const params = new URLSearchParams({
        productCode: decodedProductCode,
        filepath,
      })
      window.open(`/api/design-files/download?${params}`, '_blank')
    },
    [decodedProductCode, buildFilePath]
  )

  const handlePreview = useCallback(
    (fileName: string) => {
      const filepath = buildFilePath(fileName)
      const params = new URLSearchParams({
        productCode: decodedProductCode,
        filepath,
      })
      setPreviewFile(`/api/design-files/preview?${params}`)
      setPreviewName(fileName)
    },
    [decodedProductCode, buildFilePath]
  )

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return

      setUploading(true)
      try {
        for (const file of Array.from(files)) {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('productCode', decodedProductCode)
          if (currentSubpath) formData.append('subpath', currentSubpath)

          const res = await fetch('/api/design-files/upload', {
            method: 'POST',
            body: formData,
          })

          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            throw new Error(body.error || `Upload failed: ${file.name}`)
          }
        }

        queryClient.invalidateQueries({
          queryKey: ['design-files', decodedProductCode, currentSubpath],
        })
      } catch (err) {
        alert(err instanceof Error ? err.message : '업로드 실패')
      } finally {
        setUploading(false)
      }
    },
    [decodedProductCode, currentSubpath, queryClient]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      handleUpload(e.dataTransfer.files)
    },
    [handleUpload]
  )

  const handleEditXlsx = useCallback(
    (fileName: string) => {
      const fp = buildFilePath(fileName)
      setEditingXlsx({ filepath: fp, filename: fileName })
    },
    [buildFilePath]
  )

  const handleCreateNewOrder = useCallback(async () => {
    setCreatingVersion(true)
    try {
      const createRes = await fetch('/api/design-files/create-version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productCode: decodedProductCode, subpath: currentSubpath }),
      })

      const createData = await createRes.json()
      if (!createRes.ok) {
        throw new Error(createData.error || '폴더 생성 실패')
      }

      const { folderName, latestFolder } = createData
      const sourceSubpath = `${currentSubpath}/${latestFolder}`
      const targetSubpath = `${currentSubpath}/${folderName}`

      const copyRes = await fetch('/api/design-files/copy-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productCode: decodedProductCode,
          sourceSubpath,
          targetSubpath,
        }),
      })

      const copyData = await copyRes.json()
      if (!copyRes.ok) {
        throw new Error(copyData.error || '파일 복사 실패')
      }

      queryClient.invalidateQueries({
        queryKey: ['design-files', decodedProductCode, currentSubpath],
      })

      setPathStack((prev) => [...prev, folderName])
      toast.success(`새 발주 폴더가 생성되었습니다 (${copyData.copied.length}개 파일 복사)`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '새 발주 폴더 생성 실패')
    } finally {
      setCreatingVersion(false)
      setShowNewOrderDialog(false)
    }
  }, [decodedProductCode, currentSubpath, queryClient])

  const items = data?.items ?? []
  const productFolder = data?.productFolder ?? null

  const canCreateNewOrder = useMemo(() => {
    if (pathStack.length !== 1) return false
    return items.some((item) => item.type === 'folder' && isDatePrefixedFolder(item.name))
  }, [pathStack.length, items])

  const newOrderFolderName = useMemo(() => {
    if (!canCreateNewOrder) return null
    const latest = findLatestVersionFolder(items)
    return latest ? generateVersionFolderName(latest.name) : null
  }, [canCreateNewOrder, items])

  if (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    const isNotFound = errMsg.includes('찾을 수 없습니다') || errMsg.includes('not found')

    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400">
        <AlertCircle size={48} className="mb-4 opacity-30" />
        <p className="text-sm mb-2">
          {isNotFound
            ? `${decodedProductCode}에 해당하는 디자인 폴더가 없습니다.`
            : `오류: ${errMsg}`}
        </p>
        {isNotFound && (
          <p className="text-xs text-slate-300">
            Dropbox에 {decodedProductCode}_품목명 폴더가 존재하는지 확인해주세요.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <HardDrive size={20} className="text-amber-500" />
            부자재 스펙 & 아트웍
          </h2>
          {productFolder && (
            <p className="text-xs text-slate-400 mt-0.5 font-mono">{productFolder}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canCreateNewOrder && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewOrderDialog(true)}
              disabled={creatingVersion}
              className="gap-1.5"
            >
              {creatingVersion ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <FolderPlus size={14} />
              )}
              새 발주 폴더 생성
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-1.5"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            파일 업로드
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
        <button
          onClick={() => navigateToBreadcrumb(0)}
          className="hover:text-slate-800 font-medium flex items-center gap-1"
        >
          <FolderOpen size={14} className="text-amber-500" />
          루트
        </button>
        {pathStack.map((segment, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight size={12} className="text-slate-300" />
            <button
              onClick={() => navigateToBreadcrumb(i + 1)}
              className={`hover:text-slate-800 ${
                i === pathStack.length - 1 ? 'text-slate-800 font-medium' : ''
              }`}
            >
              {segment}
            </button>
          </span>
        ))}
      </div>

      {/* Back Button */}
      {pathStack.length > 0 && (
        <button
          onClick={navigateBack}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={14} />
          상위 폴더
        </button>
      )}

      {/* File List */}
      <div
        className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-colors ${
          dragOver ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-slate-300" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Folder size={48} className="mb-3 opacity-20" />
            <p className="text-sm">빈 폴더입니다</p>
            <p className="text-xs mt-1">파일을 드래그 앤 드롭하여 업로드할 수 있습니다</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left px-4 py-2.5 w-10"></th>
                <th className="text-left px-2 py-2.5">이름</th>
                <th className="text-right px-4 py-2.5 w-24">크기</th>
                <th className="text-right px-4 py-2.5 w-28">수정일</th>
                <th className="text-center px-4 py-2.5 w-24">작업</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.name}
                  className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors group"
                >
                  <td className="px-4 py-2.5">{getFileIcon(item)}</td>
                  <td className="px-2 py-2.5">
                    {item.type === 'folder' ? (
                      <button
                        onClick={() => navigateInto(item.name)}
                        className="text-slate-700 font-medium hover:text-amber-600 hover:underline text-left"
                      >
                        {item.name}
                      </button>
                    ) : item.category === 'spreadsheet' ? (
                      <button
                        onClick={() => handleEditXlsx(item.name)}
                        className="text-slate-700 hover:text-green-600 hover:underline text-left cursor-pointer"
                        title="클릭하여 편집"
                      >
                        {item.name}
                      </button>
                    ) : (
                      <button
                        onClick={() => item.previewable ? handlePreview(item.name) : handleDownload(item.name)}
                        className="text-slate-700 hover:text-blue-600 hover:underline text-left cursor-pointer"
                        title={item.previewable ? '클릭하여 미리보기' : '클릭하여 다운로드'}
                      >
                        {item.name}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs text-slate-400 font-mono">
                    {item.type === 'file' ? formatFileSize(item.size) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs text-slate-400">
                    {item.type === 'file' ? formatDate(item.modified) : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    {item.type === 'file' && (
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.category === 'spreadsheet' && (
                          <button
                            onClick={() => handleEditXlsx(item.name)}
                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-green-600"
                            title="편집"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {item.previewable && (
                          <button
                            onClick={() => handlePreview(item.name)}
                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-blue-600"
                            title="미리보기"
                          >
                            <Eye size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDownload(item.name)}
                          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-emerald-600"
                          title="다운로드"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {dragOver && (
          <div className="absolute inset-0 bg-amber-50/80 flex items-center justify-center rounded-xl border-2 border-dashed border-amber-400 pointer-events-none">
            <div className="text-center">
              <Upload size={32} className="mx-auto mb-2 text-amber-500" />
              <p className="text-sm font-medium text-amber-700">파일을 놓아서 업로드</p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
          <Loader2 size={16} className="animate-spin" />
          업로드 중...
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-8"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700 truncate flex-1 mr-4">
                {previewName}
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const filepath = buildFilePath(previewName)
                    const params = new URLSearchParams({
                      productCode: decodedProductCode,
                      filepath,
                    })
                    window.open(`/api/design-files/download?${params}`, '_blank')
                  }}
                  className="gap-1.5"
                >
                  <Download size={14} />
                  다운로드
                </Button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-slate-50 flex items-center justify-center p-4">
              {previewName.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewFile}
                  alt={previewName}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm"
                />
              ) : (
                <iframe
                  src={previewFile}
                  className="w-full h-[70vh] rounded-lg border border-slate-200 bg-white"
                  title={previewName}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Order Confirmation Dialog */}
      {showNewOrderDialog && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-8"
          onClick={() => setShowNewOrderDialog(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-800 mb-2">
              새 발주 폴더 생성
            </h3>
            <p className="text-sm text-slate-600 mb-1">
              최신 폴더의 파일을 복사하여 새 발주 폴더를 생성합니다.
            </p>
            <div className="bg-slate-50 rounded-lg px-3 py-2 mb-4 border border-slate-100">
              <p className="text-xs text-slate-400 mb-0.5">생성될 폴더명</p>
              <p className="text-sm font-mono font-medium text-slate-700">
                {newOrderFolderName}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewOrderDialog(false)}
                disabled={creatingVersion}
              >
                취소
              </Button>
              <Button
                size="sm"
                onClick={handleCreateNewOrder}
                disabled={creatingVersion}
                className="gap-1.5"
              >
                {creatingVersion && <Loader2 size={14} className="animate-spin" />}
                생성
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Univer XLSX Editor */}
      <UniverXlsxEditor
        open={!!editingXlsx}
        onOpenChange={(open) => {
          if (!open) setEditingXlsx(null)
        }}
        productCode={decodedProductCode}
        filepath={editingXlsx?.filepath ?? ''}
        filename={editingXlsx?.filename ?? ''}
        onSaved={() => {
          queryClient.invalidateQueries({
            queryKey: ['design-files', decodedProductCode, currentSubpath],
          })
        }}
      />
    </div>
  )
}
