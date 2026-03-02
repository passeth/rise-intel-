'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { toast } from 'sonner'
import { loadKoreanFont } from '@/lib/pdf/fonts'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  X,
  Download,
  Pencil,
  Save,
  Plus,
  Trash2,
  Package,
} from 'lucide-react'
import {
  fetchReceipts,
  fetchCertificate,
  createCertificate,
  updateCertificate,
  updateCertificatePdfUrl,
  generateCertificateNo,
  syncPurchasesToReceipts,
  fetchReceiptCounts,
  type IngredientReceipt,
  type IngredientCertificate,
  type IngredientCertificateResult,
  type ReceiptSortField,
  type SortDirection,
  type CertStatus,
} from './actions'
import { fetchIngredientSpecs } from '../actions'

const PAGE_SIZE = 50

function getYearOptions(): number[] {
  const current = new Date().getFullYear()
  const years: number[] = []
  for (let y = current; y >= 2020; y--) years.push(y)
  return years
}

function SortIcon({
  field,
  currentField,
  currentDir,
}: {
  field: ReceiptSortField
  currentField: ReceiptSortField
  currentDir: SortDirection
}) {
  if (currentField !== field) {
    return <ChevronsUpDown size={12} className="text-[#999999]" />
  }
  return currentDir === 'asc' ? (
    <ChevronUp size={12} className="text-[#1A1A1A]" />
  ) : (
    <ChevronDown size={12} className="text-[#1A1A1A]" />
  )
}

function EditableCell({
  value,
  onChange,
  editing,
  type,
  className,
}: {
  value: string
  onChange: (value: string) => void
  editing: boolean
  type?: string
  className?: string
}) {
  if (!editing) return <span>{value}</span>

  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      type={type}
      className={`h-5 text-[10px] ${className ?? ''}`}
    />
  )
}

function CertificatePreviewModal({
  receipt,
  onClose,
  onCertChanged,
}: {
  receipt: IngredientReceipt
  onClose: () => void
  onCertChanged: () => void
}) {
  const [mode, setMode] = useState<'view' | 'edit' | 'issue'>('view')
  const [loading, setLoading] = useState(true)
  const [certificate, setCertificate] =
    useState<IngredientCertificate | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const [editFields, setEditFields] = useState({
    tester: '',
    approver: '',
    test_date: '',
    judgment_date: '',
    overall_judgment: '적합',
    notes: '',
    lot_no: '',
    receipt_qty: '',
    supplier: '',
    test_no: '',
  })
  const [editResults, setEditResults] = useState<IngredientCertificateResult[]>([])

  useEffect(() => {
    const loadForIssue = async () => {
      const fetchedSpecs = await fetchIngredientSpecs(receipt.ingredient_code)
      const certNo = await generateCertificateNo()
      const today = new Date().toISOString().slice(0, 10)

      setEditFields({
        tester: '',
        approver: '',
        test_date: today,
        judgment_date: today,
        overall_judgment: '적합',
        notes: '',
        lot_no: receipt.lot_no ?? '',
        receipt_qty: receipt.receipt_qty?.toString() ?? '',
        supplier: receipt.supplier ?? '',
        test_no: certNo,
      })

      setEditResults(
        fetchedSpecs.map((spec) => {
          const item = spec.spec_item.trim()
          let defaultResult = 'PASS'
          if (/미생물/.test(item)) defaultResult = '불검출'
          else if (/안정성/.test(item)) defaultResult = '적합'
          return {
            test_item: spec.spec_item,
            specification: spec.spec_standard ?? '',
            result: defaultResult,
            judgment: '적합',
            test_date: today,
            tester: '',
          }
        })
      )
      setMode('issue')
    }

    const load = async () => {
      setLoading(true)
      try {
        if (receipt.has_certificate) {
          const { certificate: cert } = await fetchCertificate(receipt.id)
          if (cert) {
            setCertificate(cert)
            setMode('view')
          } else {
            await loadForIssue()
          }
        } else {
          await loadForIssue()
        }
      } catch {
        toast.error('데이터 로드 실패')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [receipt.id, receipt.ingredient_code, receipt.has_certificate, receipt.lot_no, receipt.receipt_qty, receipt.supplier])

  const startEditing = () => {
    if (!certificate) return
    setEditFields({
      tester: certificate.tester ?? '',
      approver: certificate.approver ?? '',
      test_date: certificate.test_date ?? '',
      judgment_date: certificate.judgment_date ?? '',
      overall_judgment: certificate.overall_judgment ?? '적합',
      notes: certificate.notes ?? '',
      lot_no: certificate.lot_no ?? '',
      receipt_qty: certificate.receipt_qty?.toString() ?? '',
      supplier: certificate.supplier ?? '',
      test_no: certificate.test_no ?? '',
    })
    setEditResults(certificate.results.map((result) => ({ ...result })))
    setMode('edit')
  }

  const handleFieldChange = (field: string, value: string) => {
    setEditFields((prev) => ({ ...prev, [field]: value }))
  }

  const handleResultChange = (
    index: number,
    field: keyof IngredientCertificateResult,
    value: string
  ) => {
    setEditResults((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      )
    )
  }

  const addResult = () => {
    setEditResults((prev) => [
      ...prev,
      {
        test_item: '',
        specification: '',
        result: 'PASS',
        judgment: '적합',
        test_date: editFields.test_date,
        tester: editFields.tester,
      },
    ])
  }

  const removeResult = (index: number) => {
    setEditResults((prev) => prev.filter((_, rowIndex) => rowIndex !== index))
  }

  const handleSaveEdit = async () => {
    if (!certificate) return
    setIsSaving(true)
    try {
      const overallJudgment = editResults.every((row) => row.judgment === '적합')
        ? '적합'
        : '부적합'

      const { error } = await updateCertificate(certificate.id, {
        ...editFields,
        receipt_qty: editFields.receipt_qty
          ? Number(editFields.receipt_qty)
          : undefined,
        overall_judgment: overallJudgment,
        results: editResults,
      })

      if (error) {
        toast.error(`저장 실패: ${error}`)
        return
      }

      const { certificate: updated } = await fetchCertificate(receipt.id)
      if (updated) setCertificate(updated)

      onCertChanged()
      toast.success('저장되었습니다')
      setMode('view')
    } catch {
      toast.error('저장 중 오류가 발생했습니다')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveIssue = async () => {
    if (editResults.some((result) => !result.result)) {
      toast.error('모든 시험 결과를 입력해주세요')
      return
    }

    setIsSaving(true)
    try {
      const overallJudgment = editResults.every((row) => row.judgment === '적합')
        ? '적합'
        : '부적합'

      const { certificate: created, error } = await createCertificate({
        receipt_id: receipt.id,
        ingredient_code: receipt.ingredient_code,
        ingredient_name: receipt.ingredient_name,
        lot_no: editFields.lot_no || undefined,
        test_no: editFields.test_no || undefined,
        receipt_date: receipt.receipt_date || undefined,
        receipt_qty: editFields.receipt_qty
          ? Number(editFields.receipt_qty)
          : undefined,
        supplier: editFields.supplier || undefined,
        tester: editFields.tester || undefined,
        approver: editFields.approver || undefined,
        test_date: editFields.test_date || undefined,
        judgment_date: editFields.judgment_date || undefined,
        overall_judgment: overallJudgment,
        results: editResults,
        notes: editFields.notes || undefined,
      })

      if (error || !created) {
        toast.error(error || '저장 실패')
        return
      }

      toast.success('성적서가 저장되었습니다')

      try {
        const pdfBlob = await generateIngredientPdf(created, editResults)
        const supabase = createClient()
        const fileName = `${editFields.test_no || created.id}.pdf`
        const filePath = `certificates/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, pdfBlob, {
            contentType: 'application/pdf',
            upsert: true,
          })

        if (uploadError) {
          toast.error(`PDF 업로드 실패: ${uploadError.message}`)
        } else {
          const { data: urlData } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath)

          await updateCertificatePdfUrl(created.id, urlData.publicUrl)

          const url = URL.createObjectURL(pdfBlob)
          const link = document.createElement('a')
          link.href = url
          link.download = fileName
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
          toast.success('PDF 생성 및 다운로드 완료')
        }
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError)
        toast.error('PDF 생성 실패 (성적서는 저장됨)')
      }

      setCertificate(created)
      onCertChanged()
      setMode('view')
    } catch {
      toast.error('성적서 발급 중 오류가 발생했습니다')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!certificate) return

    setIsGenerating(true)
    try {
      const pdfBlob = await generateIngredientPdf(certificate, certificate.results)
      const supabase = createClient()
      const fileName = `${certificate.test_no || certificate.id}.pdf`
      const filePath = `certificates/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        })

      if (uploadError) {
        toast.error(`PDF 업로드 실패: ${uploadError.message}`)
        return
      }

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      await updateCertificatePdfUrl(certificate.id, urlData.publicUrl)

      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      onCertChanged()
      toast.success('PDF 저장 및 다운로드 완료')
    } catch {
      toast.error('PDF 생성 실패')
    } finally {
      setIsGenerating(false)
    }
  }

  const isEditing = mode === 'edit' || mode === 'issue'

  const displayFields = isEditing
    ? editFields
    : {
        tester: certificate?.tester ?? '',
        approver: certificate?.approver ?? '',
        test_date: certificate?.test_date ?? '',
        judgment_date: certificate?.judgment_date ?? '',
        overall_judgment: certificate?.overall_judgment ?? '',
        notes: certificate?.notes ?? '',
        lot_no: certificate?.lot_no ?? receipt.lot_no ?? '',
        receipt_qty:
          certificate?.receipt_qty?.toString() ??
          receipt.receipt_qty?.toString() ??
          '',
        supplier: certificate?.supplier ?? receipt.supplier ?? '',
        test_no: certificate?.test_no ?? receipt.test_no ?? '',
      }

  const displayResults = isEditing ? editResults : (certificate?.results ?? [])
  const ingredientName = certificate?.ingredient_name ?? receipt.ingredient_name

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent
        className="w-[760px] max-w-[760px] sm:max-w-[760px] max-h-[95vh] overflow-y-auto p-0"
        showCloseButton={false}
        aria-describedby={undefined}
      >
        <div className="sticky top-0 z-10 flex justify-between items-center px-4 py-2 bg-[#F9F9F9] border-b border-[#E5E5E5]">
          <DialogHeader className="p-0">
            <DialogTitle className="text-sm font-medium text-[#1A1A1A]">
              {mode === 'issue'
                ? '원자재 시험 성적서 발급'
                : '원자재 시험 기준 및 시험 성적서'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-2">
            {mode === 'view' && (
              <>
                <Button variant="outline" size="sm" onClick={startEditing}>
                  <Pencil size={14} className="mr-1" /> 수정
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPdf}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 size={14} className="mr-1 animate-spin" />
                  ) : (
                    <Download size={14} className="mr-1" />
                  )}
                  {isGenerating ? '생성 중...' : 'PDF'}
                </Button>
              </>
            )}

            {mode === 'edit' && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="bg-[#1A1A1A] text-white hover:bg-[#333333]"
                >
                  {isSaving ? (
                    <Loader2 size={14} className="mr-1 animate-spin" />
                  ) : (
                    <Save size={14} className="mr-1" />
                  )}
                  {isSaving ? '저장 중...' : '저장'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMode('view')}
                  disabled={isSaving}
                >
                  취소
                </Button>
              </>
            )}

            {mode === 'issue' && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveIssue}
                  disabled={isSaving}
                  className="bg-[#1A1A1A] text-white hover:bg-[#333333]"
                >
                  {isSaving ? (
                    <Loader2 size={14} className="mr-1 animate-spin" />
                  ) : (
                    <Save size={14} className="mr-1" />
                  )}
                  {isSaving ? '발급 중...' : '저장 및 PDF 발급'}
                </Button>
                <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
                  취소
                </Button>
              </>
            )}

            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex justify-center p-2 bg-[#F9F9F9]">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-[#999999]">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> 로딩 중...
            </div>
          ) : (
            <div
              className="bg-white shadow-lg w-full"
              style={{ padding: '20px 24px', minHeight: '900px' }}
            >
              <div className="h-[70px] mb-4">
                <table
                  className="border-collapse text-[11px] float-right"
                  style={{ width: '150px' }}
                >
                  <tbody>
                    <tr>
                      <th
                        rowSpan={2}
                        className="border border-black px-2 py-1 bg-gray-100 font-bold text-center align-middle"
                        style={{ width: '30px' }}
                      >
                        결
                        <br />
                        재
                      </th>
                      <th
                        className="border border-black px-2 py-1 bg-gray-100 font-bold text-center"
                        style={{ width: '60px' }}
                      >
                        담당
                      </th>
                      <th
                        className="border border-black px-2 py-1 bg-gray-100 font-bold text-center"
                        style={{ width: '60px' }}
                      >
                        팀장
                      </th>
                    </tr>
                    <tr>
                      <td
                        className="border border-black px-2 text-center"
                        style={{ height: '40px' }}
                      >
                        <EditableCell
                          value={displayFields.tester}
                          onChange={(value) => handleFieldChange('tester', value)}
                          editing={isEditing}
                          className="text-center"
                        />
                      </td>
                      <td
                        className="border border-black px-2 text-center"
                        style={{ height: '40px' }}
                      >
                        <EditableCell
                          value={displayFields.approver}
                          onChange={(value) =>
                            handleFieldChange('approver', value)
                          }
                          editing={isEditing}
                          className="text-center"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h1 className="text-center text-xl font-bold tracking-wider mb-6 underline underline-offset-4">
                원자재 시험 기준 및 시험 성적서
              </h1>

              <table className="w-full border-collapse text-[11px] mb-2">
                <colgroup>
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '28%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '18%' }} />
                </colgroup>
                <tbody>
                  <tr>
                    <th
                      rowSpan={2}
                      className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap"
                    >
                      원료명
                    </th>
                    <td
                      rowSpan={2}
                      className="border border-black px-2 py-1.5 text-center"
                    >
                      {ingredientName}
                    </td>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">
                      규격
                    </th>
                    <td className="border border-black px-2 py-1.5 text-center">장원기(ICID)</td>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">
                      코드번호
                    </th>
                    <td className="border border-black px-2 py-1.5 text-center">
                      {receipt.ingredient_code}
                    </td>
                  </tr>
                  <tr>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">
                      입고량
                    </th>
                    <td className="border border-black px-2 py-1.5 text-right pr-2">
                      <EditableCell
                        value={displayFields.receipt_qty}
                        onChange={(value) =>
                          handleFieldChange('receipt_qty', value)
                        }
                        editing={isEditing}
                        className="text-right"
                      />
                      {!isEditing && ' Kg'}
                    </td>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">
                      시험번호
                    </th>
                    <td className="border border-black px-2 py-1.5 text-center">
                      <EditableCell
                        value={displayFields.test_no}
                        onChange={(value) => handleFieldChange('test_no', value)}
                        editing={isEditing}
                        className="text-center"
                      />
                    </td>
                  </tr>
                  <tr>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">
                      제조원
                    </th>
                    <td className="border border-black px-2 py-1.5 text-center">
                      <EditableCell
                        value={displayFields.supplier}
                        onChange={(value) => handleFieldChange('supplier', value)}
                        editing={isEditing}
                        className="text-center"
                      />
                    </td>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">
                      채취량
                    </th>
                    <td className="border border-black px-2 py-1.5 text-center">50 g</td>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">
                      입고일자
                    </th>
                    <td className="border border-black px-2 py-1.5 text-center">
                      {receipt.receipt_date}
                    </td>
                  </tr>
                  <tr>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">
                      납품처
                    </th>
                    <td className="border border-black px-2 py-1.5 text-center">
                      <EditableCell
                        value={displayFields.supplier}
                        onChange={(value) => handleFieldChange('supplier', value)}
                        editing={isEditing}
                        className="text-center"
                      />
                    </td>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">
                      채취자
                    </th>
                    <td className="border border-black px-2 py-1.5 text-center">
                      <EditableCell
                        value={displayFields.tester}
                        onChange={(value) => handleFieldChange('tester', value)}
                        editing={isEditing}
                        className="text-center"
                      />
                    </td>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">
                      채취일자
                    </th>
                    <td className="border border-black px-2 py-1.5 text-center">
                      <EditableCell
                        value={displayFields.test_date}
                        onChange={(value) => handleFieldChange('test_date', value)}
                        editing={isEditing}
                        type="date"
                      />
                    </td>
                  </tr>
                  <tr>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">
                      채취방법
                    </th>
                    <td className="border border-black px-2 py-1.5 text-center">무작위</td>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">
                      채취장소
                    </th>
                    <td className="border border-black px-2 py-1.5 text-center">원료실</td>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">
                      시험자
                    </th>
                    <td className="border border-black px-2 py-1.5 text-center">
                      <EditableCell
                        value={displayFields.tester}
                        onChange={(value) => handleFieldChange('tester', value)}
                        editing={isEditing}
                        className="text-center"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>

              <table className="w-full border-collapse text-[11px] mt-4 mb-2">
                <colgroup>
                  <col style={{ width: isEditing ? '13%' : '15%' }} />
                  <col style={{ width: isEditing ? '25%' : '30%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: isEditing ? '12%' : '15%' }} />
                  {isEditing && <col style={{ width: '5%' }} />}
                </colgroup>
                <thead>
                  <tr>
                    <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">
                      시험항목
                    </th>
                    <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">
                      시험기준
                    </th>
                    <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">
                      시험결과
                    </th>
                    <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">
                      적부판정
                    </th>
                    <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">
                      시험일자
                    </th>
                    <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">
                      시험자
                    </th>
                    {isEditing && (
                      <th className="border border-black px-1 py-2 bg-gray-100" />
                    )}
                  </tr>
                </thead>
                <tbody>
                  {displayResults.length > 0 ? (
                    displayResults.map((result, index) => (
                      <tr key={index}>
                        <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">
                          {isEditing ? (
                            <Input
                              value={result.test_item}
                              onChange={(e) =>
                                handleResultChange(index, 'test_item', e.target.value)
                              }
                              className="h-5 text-[10px]"
                            />
                          ) : (
                            result.test_item
                          )}
                        </th>
                        <td className="border border-black px-2 py-1.5 text-center">
                          {isEditing ? (
                            <Input
                              value={result.specification || ''}
                              onChange={(e) =>
                                handleResultChange(
                                  index,
                                  'specification',
                                  e.target.value
                                )
                              }
                              className="h-5 text-[10px]"
                            />
                          ) : (
                            result.specification || ''
                          )}
                        </td>
                        <td className="border border-black px-2 py-1.5 text-center">
                          {isEditing ? (
                            <Input
                              value={result.result || ''}
                              onChange={(e) =>
                                handleResultChange(index, 'result', e.target.value)
                              }
                              className="h-5 text-[10px]"
                            />
                          ) : (
                            result.result || ''
                          )}
                        </td>
                        <td
                          className={`border border-black px-2 py-1.5 text-center ${
                            result.judgment === '적합'
                              ? 'text-green-700'
                              : 'text-red-700'
                          }`}
                        >
                          {isEditing ? (
                            <Select
                              value={result.judgment}
                              onValueChange={(value) =>
                                handleResultChange(index, 'judgment', value)
                              }
                            >
                              <SelectTrigger className="h-5 text-[10px] w-14 mx-auto">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="적합">적합</SelectItem>
                                <SelectItem value="부적합">부적합</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : result.judgment === '적합' ? (
                            '적'
                          ) : (
                            '부'
                          )}
                        </td>
                        <td className="border border-black px-2 py-1.5 text-center">
                          {isEditing ? (
                            <Input
                              type="date"
                              value={result.test_date || editFields.test_date}
                              onChange={(e) =>
                                handleResultChange(index, 'test_date', e.target.value)
                              }
                              className="h-5 text-[10px]"
                            />
                          ) : (
                            result.test_date || displayFields.test_date
                          )}
                        </td>
                        <td className="border border-black px-2 py-1.5 text-center">
                          {isEditing ? (
                            <Input
                              value={result.tester || ''}
                              onChange={(e) =>
                                handleResultChange(index, 'tester', e.target.value)
                              }
                              className="h-5 text-[10px]"
                            />
                          ) : (
                            result.tester || displayFields.tester
                          )}
                        </td>
                        {isEditing && (
                          <td className="border border-black px-1 py-1.5 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeResult(index)}
                              className="h-5 w-5 p-0 text-red-500"
                            >
                              <Trash2 size={12} />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={isEditing ? 7 : 6}
                        className="border border-black text-center py-6 text-[#999999]"
                      >
                        등록된 시험 항목이 없습니다.
                      </td>
                    </tr>
                  )}

                  {!isEditing &&
                    displayResults.length > 0 &&
                    displayResults.length < 8 &&
                    Array.from({ length: 8 - displayResults.length }).map(
                      (_, index) => (
                        <tr key={`empty-${index}`}>
                          <th className="border border-black px-2 py-1.5 bg-gray-100 text-center">
                            &nbsp;
                          </th>
                          <td className="border border-black px-2 py-1.5 text-center" />
                          <td className="border border-black px-2 py-1.5 text-center" />
                          <td className="border border-black px-2 py-1.5 text-center" />
                          <td className="border border-black px-2 py-1.5 text-center" />
                          <td className="border border-black px-2 py-1.5 text-center" />
                        </tr>
                      )
                    )}
                </tbody>
              </table>

              {isEditing && (
                <div className="mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addResult}
                    className="gap-1 text-xs"
                  >
                    <Plus size={12} /> 시험항목 추가
                  </Button>
                </div>
              )}

              <table className="w-full border-collapse text-[11px] mt-4">
                <colgroup>
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '35%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '35%' }} />
                </colgroup>
                <tbody>
                  <tr>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">
                      판정결과
                    </th>
                    <td
                      className={`border border-black px-2 py-1.5 text-center font-bold ${
                        (isEditing
                          ? editResults.every((row) => row.judgment === '적합')
                          : certificate?.overall_judgment === '적합')
                          ? 'text-green-700'
                          : 'text-red-700'
                      }`}
                    >
                      {isEditing
                        ? editResults.every((row) => row.judgment === '적합')
                          ? '적합'
                          : '부적합'
                        : (certificate?.overall_judgment ?? '')}
                    </td>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">
                      판정일자
                    </th>
                    <td className="border border-black px-2 py-1.5 text-center">
                      <EditableCell
                        value={displayFields.judgment_date}
                        onChange={(value) =>
                          handleFieldChange('judgment_date', value)
                        }
                        editing={isEditing}
                        type="date"
                      />
                    </td>
                  </tr>
                  <tr>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">
                      판정자
                    </th>
                    <td className="border border-black px-2 py-1.5 text-center">
                      <EditableCell
                        value={displayFields.approver}
                        onChange={(value) => handleFieldChange('approver', value)}
                        editing={isEditing}
                        className="text-center"
                      />
                    </td>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">
                      비고
                    </th>
                    <td className="border border-black px-2 py-1.5 min-h-[50px]">
                      <EditableCell
                        value={displayFields.notes}
                        onChange={(value) => handleFieldChange('notes', value)}
                        editing={isEditing}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="text-[11px] text-gray-500 text-right mt-4">
                EVS-F914-01 (2019.08.13. Rev.0) (주)에바스코스메틱
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function V2IngredientsReceiptsPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<ReceiptSortField>('receipt_date')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [year, setYear] = useState<number | null>(null)
  const [selectedReceipt, setSelectedReceipt] = useState<IngredientReceipt | null>(
    null
  )
  const queryClient = useQueryClient()
  const [certStatus, setCertStatus] = useState<CertStatus>('all')


  const yearOptions = getYearOptions()

  const { data: syncResult } = useQuery({
    queryKey: ['v2-ingredient-receipts-sync'],
    queryFn: () => syncPurchasesToReceipts(),
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (!syncResult) return
    if (syncResult.error) {
      toast.error(`동기화 오류: ${syncResult.error}`)
      return
    }
    if (syncResult.synced > 0) {
      toast.success(`${syncResult.synced}건의 신규 입고 데이터가 동기화되었습니다`)
      queryClient.invalidateQueries({ queryKey: ['v2-ingredient-receipts'] })
      queryClient.invalidateQueries({ queryKey: ['v2-ingredient-receipt-counts'] })
    }
  }, [syncResult, queryClient])

  const { data: counts } = useQuery({
    queryKey: ['v2-ingredient-receipt-counts', search, year],
    queryFn: () => fetchReceiptCounts(search, year),
    placeholderData: (previousData) => previousData,
  })
  const { data, isLoading } = useQuery({
    queryKey: ['v2-ingredient-receipts', search, page, sortField, sortDir, year, certStatus],
    queryFn: () =>
      fetchReceipts(search, page, PAGE_SIZE, sortField, sortDir, year, certStatus),
    placeholderData: (previousData) => previousData,
  })

  const receipts = data?.receipts ?? []
  const totalCount = data?.totalCount ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const hasPrev = page > 1
  const hasNext = page < totalPages

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleSort = useCallback(
    (field: ReceiptSortField) => {
      if (sortField === field) {
        setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortField(field)
        setSortDir('asc')
      }
      setPage(1)
    },
    [sortField]
  )

  const handleCertChanged = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['v2-ingredient-receipts'] })
    queryClient.invalidateQueries({ queryKey: ['v2-ingredient-receipt-counts'] })
  }, [queryClient])

  const renderPagination = () => {
    const pages: number[] = []
    const maxVisible = 7
    let start = Math.max(1, page - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages, start + maxVisible - 1)

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }

    if (start > 1) {
      pages.push(1)
      if (start > 2) pages.push(-1)
    }

    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== totalPages) pages.push(i)
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push(-2)
      pages.push(totalPages)
    }

    return pages
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-semibold bg-[#1A1A1A] text-white px-2 py-0.5 rounded-full tracking-wider">
            원료
          </span>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">입고 관리대장</h1>
        </div>
        <p className="text-sm text-[#999999]">
          총 <span className="font-semibold text-[#666666]">{totalCount.toLocaleString()}</span>
          건
        </p>
      </div>

      <div className="bg-white p-4 rounded-xl border border-[#E5E5E5] flex gap-2 items-center mb-4">
        <Select
          value={year?.toString() ?? 'all'}
          onValueChange={(value) => {
            setYear(value === 'all' ? null : Number(value))
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="연도" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 연도</SelectItem>
            {yearOptions.map((yearOption) => (
              <SelectItem key={yearOption} value={String(yearOption)}>
                {yearOption}년
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999999]"
          />
          <Input
            placeholder="원료코드, 원료명, 공급처, 시험번호, LOT 검색..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-9"
          />
        </div>

        <Button
          onClick={handleSearch}
          className="bg-[#1A1A1A] text-white hover:bg-[#333333]"
        >
          검색
        </Button>
      </div>

      <div className="flex gap-1.5 mb-4">
        {([
          { value: 'all' as CertStatus, label: '전체', count: counts?.total },
          { value: 'pending' as CertStatus, label: '발급 대상', count: counts?.pending },
          { value: 'issued' as CertStatus, label: '발급 완료', count: counts?.issued },
        ]).map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setCertStatus(tab.value); setPage(1) }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              certStatus === tab.value
                ? 'bg-[#1A1A1A] text-white'
                : 'bg-white text-[#666666] border border-[#E5E5E5] hover:bg-[#F9F9F9]'
            }`}
          >
            {tab.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-sm ${
              certStatus === tab.value
                ? 'bg-white/20 text-white'
                : 'bg-[#E5E5E5] text-[#666666]'
            }`}>
              {tab.count?.toLocaleString() ?? '–'}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-sm overflow-hidden flex flex-col">
        {isLoading && receipts.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-[#999999]" />
          </div>
        ) : receipts.length === 0 ? (
          <div className="py-16 text-center">
            <Package size={48} className="mx-auto text-[#E5E5E5] mb-3" />
            <p className="text-[#999999] text-sm">
              {search ? '검색 결과가 없습니다' : '등록된 입고 이력이 없습니다'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table className="min-w-[1050px] border-collapse">
                <TableHeader className="bg-[#F9F9F9] sticky top-0 z-20">
                  <TableRow className="border-b border-[#E5E5E5]">
                    <TableHead
                      className="w-24 text-xs font-semibold text-[#666666] whitespace-nowrap cursor-pointer"
                      onClick={() => handleSort('receipt_date')}
                    >
                      <span className="inline-flex items-center gap-1">
                        입고일
                        <SortIcon
                          field="receipt_date"
                          currentField={sortField}
                          currentDir={sortDir}
                        />
                      </span>
                    </TableHead>
                    <TableHead
                      className="w-24 text-xs font-semibold text-[#666666] whitespace-nowrap cursor-pointer"
                      onClick={() => handleSort('ingredient_code')}
                    >
                      <span className="inline-flex items-center gap-1">
                        원료코드
                        <SortIcon
                          field="ingredient_code"
                          currentField={sortField}
                          currentDir={sortDir}
                        />
                      </span>
                    </TableHead>
                    <TableHead
                      className="min-w-[140px] text-xs font-semibold text-[#666666] whitespace-nowrap cursor-pointer"
                      onClick={() => handleSort('ingredient_name')}
                    >
                      <span className="inline-flex items-center gap-1">
                        원료명
                        <SortIcon
                          field="ingredient_name"
                          currentField={sortField}
                          currentDir={sortDir}
                        />
                      </span>
                    </TableHead>
                    <TableHead className="w-24 text-xs font-semibold text-[#666666] whitespace-nowrap">
                      Lot No
                    </TableHead>
                    <TableHead className="w-20 text-right text-xs font-semibold text-[#666666] whitespace-nowrap">
                      입고량
                    </TableHead>
                    <TableHead
                      className="w-24 text-xs font-semibold text-[#666666] whitespace-nowrap cursor-pointer"
                      onClick={() => handleSort('supplier')}
                    >
                      <span className="inline-flex items-center gap-1">
                        공급처
                        <SortIcon
                          field="supplier"
                          currentField={sortField}
                          currentDir={sortDir}
                        />
                      </span>
                    </TableHead>
                    <TableHead className="w-20 text-xs font-semibold text-[#666666] whitespace-nowrap">
                      COA
                    </TableHead>
                    <TableHead
                      className="w-24 text-xs font-semibold text-[#666666] whitespace-nowrap cursor-pointer"
                      onClick={() => handleSort('test_no')}
                    >
                      <span className="inline-flex items-center gap-1">
                        시험번호
                        <SortIcon
                          field="test_no"
                          currentField={sortField}
                          currentDir={sortDir}
                        />
                      </span>
                    </TableHead>
                    <TableHead className="w-16 text-center text-xs font-semibold text-[#666666] whitespace-nowrap">
                      성적서
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map((receiptItem) => (
                    <TableRow
                      key={receiptItem.id}
                      className="border-b border-[#E5E5E5] hover:bg-[#F9F9F9]/70 cursor-pointer"
                      onClick={() => setSelectedReceipt(receiptItem)}
                    >
                      <TableCell className="p-2 text-xs text-[#666666] w-24">
                        {receiptItem.receipt_date}
                      </TableCell>
                      <TableCell className="p-2 text-xs font-mono text-[#666666] w-24">
                        {receiptItem.ingredient_code}
                      </TableCell>
                      <TableCell className="p-2 text-xs text-[#1A1A1A] font-medium min-w-[140px]">
                        {receiptItem.ingredient_name}
                      </TableCell>
                      <TableCell className="p-2 text-xs text-[#666666] w-24">
                        {receiptItem.lot_no || <span className="text-[#E5E5E5]">—</span>}
                      </TableCell>
                      <TableCell className="p-2 text-xs text-[#666666] text-right font-mono w-20">
                        {receiptItem.receipt_qty != null ? (
                          receiptItem.receipt_qty.toLocaleString()
                        ) : (
                          <span className="text-[#E5E5E5]">—</span>
                        )}
                      </TableCell>
                      <TableCell className="p-2 text-xs text-[#666666] w-24">
                        {receiptItem.supplier || <span className="text-[#E5E5E5]">—</span>}
                      </TableCell>
                      <TableCell className="p-2 text-xs text-[#666666] w-20">
                        {receiptItem.coa_reference || (
                          <span className="text-[#E5E5E5]">—</span>
                        )}
                      </TableCell>
                      <TableCell className="p-2 text-xs font-mono text-[#666666] w-24">
                        {receiptItem.test_no || <span className="text-[#E5E5E5]">—</span>}
                      </TableCell>
                      <TableCell className="p-2 text-center w-16">
                        {receiptItem.has_certificate ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px] px-1.5">
                            발급
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[#999999] border-[#E5E5E5] text-[10px] px-1.5"
                          >
                            미발급
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E5E5] bg-[#F9F9F9]/50">
                <p className="text-xs text-[#999999]">
                  {((page - 1) * PAGE_SIZE + 1).toLocaleString()}–
                  {Math.min(page * PAGE_SIZE, totalCount).toLocaleString()} / 총{' '}
                  {totalCount.toLocaleString()}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPage((current) => current - 1)}
                    disabled={!hasPrev}
                    className="h-8 w-8"
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  {renderPagination().map((pageNumber, index) =>
                    pageNumber < 0 ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="px-1 text-xs text-[#999999]"
                      >
                        …
                      </span>
                    ) : (
                      <Button
                        key={pageNumber}
                        variant={pageNumber === page ? 'default' : 'ghost'}
                        size="icon"
                        onClick={() => setPage(pageNumber)}
                        className={`h-8 w-8 text-xs ${
                          pageNumber === page ? 'bg-[#1A1A1A] text-white' : ''
                        }`}
                      >
                        {pageNumber}
                      </Button>
                    )
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPage((current) => current + 1)}
                    disabled={!hasNext}
                    className="h-8 w-8"
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedReceipt && (
        <CertificatePreviewModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          onCertChanged={handleCertChanged}
        />
      )}
    </div>
  )
}

async function generateIngredientPdf(
  certificate: IngredientCertificate,
  results: IngredientCertificateResult[]
): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  await loadKoreanFont(doc)
  doc.setFont('NanumGothic', 'normal')

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20

  const boxX = pageWidth - margin - 45
  doc.setFontSize(7)
  doc.rect(boxX, 15, 8, 12)
  doc.rect(boxX + 8, 15, 18, 6)
  doc.rect(boxX + 26, 15, 18, 6)
  doc.rect(boxX + 8, 21, 18, 6)
  doc.rect(boxX + 26, 21, 18, 6)
  doc.text('결', boxX + 4, 19, { align: 'center' })
  doc.text('재', boxX + 4, 24, { align: 'center' })
  doc.text('담당', boxX + 17, 19, { align: 'center' })
  doc.text('팀장', boxX + 35, 19, { align: 'center' })
  if (certificate.tester) doc.text(certificate.tester, boxX + 17, 25, { align: 'center' })
  if (certificate.approver) doc.text(certificate.approver, boxX + 35, 25, { align: 'center' })

  doc.setFontSize(14)
  const title = '원자재 시험 기준 및 시험 성적서'
  doc.text(title, pageWidth / 2, 42, { align: 'center' })
  doc.setLineWidth(0.3)
  const titleWidth = doc.getTextWidth(title)
  doc.line((pageWidth - titleWidth) / 2, 44, (pageWidth + titleWidth) / 2, 44)

  let y = 50
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: [
      [
        {
          content: '원료명',
          styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' },
        },
        { content: certificate.ingredient_name || '', styles: { halign: 'center' } },
        {
          content: '규격',
          styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' },
        },
        { content: '장원기(ICID)', styles: { halign: 'center' } },
        {
          content: '코드번호',
          styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' },
        },
        { content: certificate.ingredient_code || '', styles: { halign: 'center' } },
      ],
      [
        {
          content: '입고량',
          styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' },
        },
        {
          content: certificate.receipt_qty ? `${certificate.receipt_qty} Kg` : '',
          styles: { halign: 'center' },
        },
        {
          content: '시험번호',
          styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' },
        },
        { content: certificate.test_no || '', styles: { halign: 'center' } },
        {
          content: '입고일자',
          styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' },
        },
        { content: certificate.receipt_date || '', styles: { halign: 'center' } },
      ],
      [
        {
          content: '제조원',
          styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' },
        },
        { content: certificate.supplier || '', styles: { halign: 'center' } },
        {
          content: '채취량',
          styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' },
        },
        { content: '50 g', styles: { halign: 'center' } },
        {
          content: '채취일자',
          styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' },
        },
        { content: certificate.test_date || '', styles: { halign: 'center' } },
      ],
      [
        {
          content: '납품처',
          styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' },
        },
        { content: certificate.supplier || '', styles: { halign: 'center' } },
        {
          content: '채취자',
          styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' },
        },
        { content: certificate.tester || '', styles: { halign: 'center' } },
        {
          content: '채취방법',
          styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' },
        },
        { content: '무작위', styles: { halign: 'center' } },
      ],
      [
        {
          content: '채취장소',
          styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' },
        },
        { content: '원료실', styles: { halign: 'center' } },
        {
          content: '시험자',
          styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' },
        },
        { content: certificate.tester || '', styles: { halign: 'center' } },
        { content: '', styles: { fillColor: [245, 245, 245] } },
        { content: '' },
      ],
    ],
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: 'NanumGothic',
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
    },
  })
  y =
    (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
      ?.finalY ??
    y + 10

  y += 3
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['시험항목', '시험기준', '시험결과', '적부판정', '시험일자', '시험자']],
    body: results.map((result) => [
      result.test_item,
      result.specification || '',
      result.result || '',
      result.judgment === '적합' ? '적' : '부',
      result.test_date || certificate.test_date || '',
      result.tester || certificate.tester || '',
    ]),
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: 'NanumGothic',
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold', fillColor: [245, 245, 245] },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' },
    },
  })
  y =
    (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
      ?.finalY ??
    y + 10

  y += 3
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: [
      [
        {
          content: '판정결과',
          styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' },
        },
        {
          content: certificate.overall_judgment || '',
          styles: { halign: 'center', fontStyle: 'bold' },
        },
        {
          content: '판정일자',
          styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' },
        },
        { content: certificate.judgment_date || '', styles: { halign: 'center' } },
      ],
      [
        {
          content: '판정자',
          styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' },
        },
        { content: certificate.approver || '', styles: { halign: 'center' } },
        {
          content: '비고',
          styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' },
        },
        {
          content: certificate.notes || '',
          styles: { halign: 'center', minCellHeight: 12 },
        },
      ],
    ],
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: 'NanumGothic',
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
    },
  })
  y =
    (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
      ?.finalY ??
    y + 10

  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text(
    'EVS-F914-01 (2019.08.13. Rev.0) (주)에바스코스메틱',
    pageWidth - margin,
    y + 6,
    { align: 'right' }
  )
  doc.setTextColor(0, 0, 0)

  return doc.output('blob')
}
