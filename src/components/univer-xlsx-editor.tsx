'use client'

import { useEffect, useRef, useState } from 'react'
import { createUniver, LocaleType, merge } from '@univerjs/presets'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import sheetsCoreKoKR from '@univerjs/preset-sheets-core/locales/ko-KR'
import LuckyExcel from '@mertdeveci55/univer-import-export'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Loader2, Save, X } from 'lucide-react'

import '@univerjs/preset-sheets-core/lib/index.css'

interface UniverXlsxEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productCode: string
  filepath: string
  filename: string
  onSaved?: () => void
}

export default function UniverXlsxEditor({
  open,
  onOpenChange,
  productCode,
  filepath,
  filename,
  onSaved,
}: UniverXlsxEditorProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const univerAPIRef = useRef<ReturnType<typeof createUniver>['univerAPI'] | null>(null)

  useEffect(() => {
    if (!open) {
      univerAPIRef.current?.dispose()
      univerAPIRef.current = null
      return
    }

    const loadFile = async () => {
      if (!containerRef.current) return

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/design-files/download?productCode=${productCode}&filepath=${encodeURIComponent(filepath)}`
        )

        if (!response.ok) {
          throw new Error('파일을 불러올 수 없습니다.')
        }

        const blob = await response.blob()
        const file = new File([blob], filename, {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })

        LuckyExcel.transformExcelToUniver(
          file,
          (workbookData) => {
            if (!containerRef.current) return

            const { univerAPI } = createUniver({
              locale: LocaleType.KO_KR,
              locales: merge({}, sheetsCoreKoKR),
              presets: [
                UniverSheetsCorePreset({
                  container: containerRef.current,
                }),
              ],
            })

            univerAPIRef.current = univerAPI
            univerAPI.createWorkbook(workbookData)
            setLoading(false)
          },
          (err) => {
            console.error('Excel 변환 오류:', err)
            setError('Excel 파일을 변환하는 중 오류가 발생했습니다.')
            setLoading(false)
          }
        )
      } catch (err) {
        console.error('파일 로드 오류:', err)
        setError(err instanceof Error ? err.message : '파일을 불러오는 중 오류가 발생했습니다.')
        setLoading(false)
      }
    }

    loadFile()

    return () => {
      univerAPIRef.current?.dispose()
      univerAPIRef.current = null
    }
  }, [open, productCode, filepath, filename])

  const handleSave = async () => {
    if (!univerAPIRef.current) return

    setSaving(true)

    try {
      const workbook = univerAPIRef.current.getActiveWorkbook()
      if (!workbook) {
        throw new Error('활성 워크북이 없습니다.')
      }

      const snapshot = workbook.save()

      LuckyExcel.transformUniverToExcel({
        snapshot,
        fileName: filename,
        getBuffer: true,
        success: async (buffer) => {
          try {
            if (!buffer) {
              throw new Error('버퍼 생성 실패')
            }
            const file = new File([buffer], filename, {
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            })

            const formData = new FormData()
            formData.append('file', file)
            formData.append('productCode', productCode)
            formData.append('filepath', filepath)

            const response = await fetch('/api/design-files/save-xlsx', {
              method: 'PUT',
              body: formData,
            })

            if (!response.ok) {
              throw new Error('저장 실패')
            }

            toast.success('저장 완료')
            onSaved?.()
          } catch (err) {
            console.error('저장 오류:', err)
            toast.error('저장 실패')
          } finally {
            setSaving(false)
          }
        },
        error: (err) => {
          console.error('Excel 내보내기 오류:', err)
          toast.error('저장 실패')
          setSaving(false)
        },
      })
    } catch (err) {
      console.error('저장 오류:', err)
      toast.error('저장 실패')
      setSaving(false)
    }
  }

  const handleClose = () => {
    univerAPIRef.current?.dispose()
    univerAPIRef.current = null
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200">
        <span className="font-medium text-slate-900 truncate max-w-[60%]">{filename}</span>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saving || loading} size="sm">
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="size-4" />
                저장
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleClose} disabled={saving} size="sm">
            <X className="size-4" />
            닫기
          </Button>
        </div>
      </div>
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="flex items-center gap-2 text-slate-600">
              <Loader2 className="size-6 animate-spin" />
              <span>파일 불러오는 중...</span>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <Button variant="outline" onClick={handleClose}>
                닫기
              </Button>
            </div>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  )
}
