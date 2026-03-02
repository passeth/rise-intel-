'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { loadKoreanFont } from '@/lib/pdf/fonts'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ChevronLeft,
  FileText,
  FlaskConical,
  History,
  Download,
  ExternalLink,
  Loader2,
  Pencil,
  Save,
  Plus,
  Trash2,
  X,
  Upload,
} from 'lucide-react'
import {
  fetchIngredientDetail,
  fetchIngredientComponents,
  fetchIngredientSpecs,
} from '../actions'
import { fetchIngredientReceiptsByCode, appendDocumentUrl, removeDocumentUrl, type IngredientReceiptRow, type DocCategory } from './actions'
import {
  fetchCertificate,
  createCertificate,
  updateCertificate,
  updateCertificatePdfUrl,
  generateCertificateNo,
  type IngredientCertificate,
  type IngredientCertificateResult,
} from '../receipts/actions'

type ExtendedReceipt = IngredientReceiptRow & {
  ingredient_code: string
  ingredient_name: string
}

function EditableCell({
  value,
  onChange,
  editing,
  type,
  className,
}: {
  value: string
  onChange: (v: string) => void
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
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? y + 10

  y += 3
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['시험항목', '시험기준', '시험결과', '적부판정', '시험일자', '시험자']],
    body: results.map((r) => [
      r.test_item,
      r.specification || '',
      r.result || '',
      r.judgment === '적합' ? '적' : '부',
      r.test_date || certificate.test_date || '',
      r.tester || certificate.tester || '',
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
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? y + 10

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
        { content: certificate.notes || '', styles: { halign: 'center', minCellHeight: 12 } },
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
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? y + 10

  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text('EVS-F914-01 (2019.08.13. Rev.0) (주)에바스코스메틱', pageWidth - margin, y + 6, {
    align: 'right',
  })
  doc.setTextColor(0, 0, 0)

  return doc.output('blob')
}

function CertificatePreviewModal({
  receipt,
  onClose,
  onCertChanged,
}: {
  receipt: ExtendedReceipt
  onClose: () => void
  onCertChanged: () => void
}) {
  const [mode, setMode] = useState<'view' | 'edit' | 'issue'>('view')
  const [loading, setLoading] = useState(true)
  const [certificate, setCertificate] = useState<IngredientCertificate | null>(null)
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

  const loadForIssue = useCallback(async () => {
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
      lot_no: receipt.lot_no || '',
      receipt_qty: receipt.receipt_qty?.toString() || '',
      supplier: receipt.supplier || '',
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
          specification: spec.spec_standard || '',
          result: defaultResult,
          judgment: '적합',
          test_date: today,
          tester: '',
        }
      })
    )

    setMode('issue')
  }, [receipt.ingredient_code, receipt.lot_no, receipt.receipt_qty, receipt.supplier])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (receipt.has_certificate) {
        const { certificate: existing } = await fetchCertificate(receipt.id)
        if (existing) {
          setCertificate(existing)
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
  }, [receipt.has_certificate, receipt.id, loadForIssue])

  useEffect(() => {
    load()
  }, [load])

  const startEditing = () => {
    if (!certificate) return

    setEditFields({
      tester: certificate.tester || '',
      approver: certificate.approver || '',
      test_date: certificate.test_date || '',
      judgment_date: certificate.judgment_date || '',
      overall_judgment: certificate.overall_judgment || '적합',
      notes: certificate.notes || '',
      lot_no: certificate.lot_no || '',
      receipt_qty: certificate.receipt_qty?.toString() || '',
      supplier: certificate.supplier || '',
      test_no: certificate.test_no || '',
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
      prev.map((result, i) => (i === index ? { ...result, [field]: value } : result))
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
    setEditResults((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSaveEdit = async () => {
    if (!certificate) return

    setIsSaving(true)
    try {
      const overallJudgment = editResults.every((result) => result.judgment === '적합')
        ? '적합'
        : '부적합'

      const { error } = await updateCertificate(certificate.id, {
        ...editFields,
        receipt_qty: editFields.receipt_qty ? Number(editFields.receipt_qty) : undefined,
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
      const overallJudgment = editResults.every((result) => result.judgment === '적합')
        ? '적합'
        : '부적합'

      const { certificate: created, error } = await createCertificate({
        receipt_id: receipt.id,
        ingredient_code: receipt.ingredient_code,
        ingredient_name: receipt.ingredient_name,
        lot_no: editFields.lot_no || undefined,
        test_no: editFields.test_no || undefined,
        receipt_date: receipt.receipt_date || undefined,
        receipt_qty: editFields.receipt_qty ? Number(editFields.receipt_qty) : undefined,
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
          .upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: true })

        if (uploadError) {
          toast.error(`PDF 업로드 실패: ${uploadError.message}`)
        } else {
          const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)
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
        .upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: true })

      if (uploadError) {
        toast.error(`PDF 업로드 실패: ${uploadError.message}`)
        return
      }

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)
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
        tester: certificate?.tester || '',
        approver: certificate?.approver || '',
        test_date: certificate?.test_date || '',
        judgment_date: certificate?.judgment_date || '',
        overall_judgment: certificate?.overall_judgment || '',
        notes: certificate?.notes || '',
        lot_no: certificate?.lot_no || receipt.lot_no || '',
        receipt_qty:
          certificate?.receipt_qty?.toString() || receipt.receipt_qty?.toString() || '',
        supplier: certificate?.supplier || receipt.supplier || '',
        test_no: certificate?.test_no || receipt.test_no || '',
      }
  const displayResults = isEditing ? editResults : certificate?.results || []
  const ingredientName = certificate?.ingredient_name || receipt.ingredient_name

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent
        className="w-[760px] max-w-[760px] sm:max-w-[760px] max-h-[95vh] overflow-y-auto p-0 border-[#E5E5E5]"
        showCloseButton={false}
        aria-describedby={undefined}
      >
        <div className="sticky top-0 z-10 flex justify-between items-center px-4 py-2 bg-[#F9F9F9] border-b border-[#E5E5E5]">
          <DialogHeader className="p-0">
            <DialogTitle className="text-sm font-medium text-[#666666]">
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
                <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={isGenerating}>
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
                <Button variant="outline" size="sm" onClick={() => setMode('view')} disabled={isSaving}>
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
            <div className="bg-white shadow-lg w-full" style={{ padding: '20px 24px', minHeight: '900px' }}>
              <div className="h-[70px] mb-4">
                <table className="border-collapse text-[11px] float-right" style={{ width: '150px' }}>
                  <tbody>
                    <tr>
                      <th
                        rowSpan={2}
                        className="border border-black px-2 py-1 bg-[#F9F9F9] font-bold text-center align-middle"
                        style={{ width: '30px' }}
                      >
                        결
                        <br />재
                      </th>
                      <th
                        className="border border-black px-2 py-1 bg-[#F9F9F9] font-bold text-center"
                        style={{ width: '60px' }}
                      >
                        담당
                      </th>
                      <th
                        className="border border-black px-2 py-1 bg-[#F9F9F9] font-bold text-center"
                        style={{ width: '60px' }}
                      >
                        팀장
                      </th>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 text-center" style={{ height: '40px' }}>
                        <EditableCell
                          value={displayFields.tester}
                          onChange={(v) => handleFieldChange('tester', v)}
                          editing={isEditing}
                          className="text-center"
                        />
                      </td>
                      <td className="border border-black px-2 text-center" style={{ height: '40px' }}>
                        <EditableCell
                          value={displayFields.approver}
                          onChange={(v) => handleFieldChange('approver', v)}
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
                      className="border border-black px-2 py-1.5 bg-[#F9F9F9] font-bold text-center whitespace-nowrap"
                    >
                      원료명
                    </th>
                    <td rowSpan={2} className="border border-black px-2 py-1.5 text-center">
                      {ingredientName}
                    </td>
                    <th className="border border-black px-2 py-1.5 bg-[#F9F9F9] font-bold text-center whitespace-nowrap">
                      규격
                    </th>
                    <td className="border border-black px-2 py-1.5 text-center">장원기(ICID)</td>
                    <th className="border border-black px-2 py-1.5 bg-[#F9F9F9] font-bold text-center whitespace-nowrap">
                      코드번호
                    </th>
                    <td className="border border-black px-2 py-1.5 text-center">{receipt.ingredient_code}</td>
                  </tr>
                  <tr>
                    <th className="border border-black px-2 py-1.5 bg-[#F9F9F9] font-bold text-center whitespace-nowrap">
                      입고량
                    </th>
                    <td className="border border-black px-2 py-1.5 text-right pr-2">
                      <EditableCell
                        value={displayFields.receipt_qty}
                        onChange={(v) => handleFieldChange('receipt_qty', v)}
                        editing={isEditing}
                        className="text-right"
                      />
                      {!isEditing && ' Kg'}
                    </td>
                    <th className="border border-black px-2 py-1.5 bg-[#F9F9F9] font-bold text-center whitespace-nowrap">
                      시험번호
                    </th>
                    <td className="border border-black px-2 py-1.5 text-center">
                      <EditableCell
                        value={displayFields.test_no}
                        onChange={(v) => handleFieldChange('test_no', v)}
                        editing={isEditing}
                        className="text-center"
                      />
                    </td>
                  </tr>
                  <tr>
                    <th className="border border-black px-2 py-1.5 bg-[#F9F9F9] font-bold text-center whitespace-nowrap">
                      제조원
                    </th>
                    <td className="border border-black px-2 py-1.5 text-center">
                      <EditableCell
                        value={displayFields.supplier}
                        onChange={(v) => handleFieldChange('supplier', v)}
                        editing={isEditing}
                        className="text-center"
                      />
                    </td>
                    <th className="border border-black px-2 py-1.5 bg-[#F9F9F9] font-bold text-center whitespace-nowrap">
                      채취량
                    </th>
                    <td className="border border-black px-2 py-1.5 text-center">50 g</td>
                    <th className="border border-black px-2 py-1.5 bg-[#F9F9F9] font-bold text-center whitespace-nowrap">
                      입고일자
                    </th>
                    <td className="border border-black px-2 py-1.5 text-center">{receipt.receipt_date}</td>
                  </tr>
                  <tr>
                    <th className="border border-black px-2 py-1.5 bg-[#F9F9F9] font-bold text-center whitespace-nowrap">
                      납품처
                    </th>
                    <td className="border border-black px-2 py-1.5 text-center">
                      <EditableCell
                        value={displayFields.supplier}
                        onChange={(v) => handleFieldChange('supplier', v)}
                        editing={isEditing}
                        className="text-center"
                      />
                    </td>
                    <th className="border border-black px-2 py-1.5 bg-[#F9F9F9] font-bold text-center whitespace-nowrap">
                      채취자
                    </th>
                    <td className="border border-black px-2 py-1.5 text-center">
                      <EditableCell
                        value={displayFields.tester}
                        onChange={(v) => handleFieldChange('tester', v)}
                        editing={isEditing}
                        className="text-center"
                      />
                    </td>
                    <th className="border border-black px-2 py-1.5 bg-[#F9F9F9] font-bold text-center whitespace-nowrap">
                      채취일자
                    </th>
                    <td className="border border-black px-2 py-1.5 text-center">
                      <EditableCell
                        value={displayFields.test_date}
                        onChange={(v) => handleFieldChange('test_date', v)}
                        editing={isEditing}
                        type="date"
                      />
                    </td>
                  </tr>
                  <tr>
                    <th className="border border-black px-2 py-1.5 bg-[#F9F9F9] font-bold text-center whitespace-nowrap">
                      채취방법
                    </th>
                    <td className="border border-black px-2 py-1.5 text-center">무작위</td>
                    <th className="border border-black px-2 py-1.5 bg-[#F9F9F9] font-bold text-center whitespace-nowrap">
                      채취장소
                    </th>
                    <td className="border border-black px-2 py-1.5 text-center">원료실</td>
                    <th className="border border-black px-2 py-1.5 bg-[#F9F9F9] font-bold text-center whitespace-nowrap">
                      시험자
                    </th>
                    <td className="border border-black px-2 py-1.5 text-center">
                      <EditableCell
                        value={displayFields.tester}
                        onChange={(v) => handleFieldChange('tester', v)}
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
                    <th className="border border-black px-2 py-2 bg-[#F9F9F9] font-bold text-center">시험항목</th>
                    <th className="border border-black px-2 py-2 bg-[#F9F9F9] font-bold text-center">시험기준</th>
                    <th className="border border-black px-2 py-2 bg-[#F9F9F9] font-bold text-center">시험결과</th>
                    <th className="border border-black px-2 py-2 bg-[#F9F9F9] font-bold text-center">적부판정</th>
                    <th className="border border-black px-2 py-2 bg-[#F9F9F9] font-bold text-center">시험일자</th>
                    <th className="border border-black px-2 py-2 bg-[#F9F9F9] font-bold text-center">시험자</th>
                    {isEditing && <th className="border border-black px-1 py-2 bg-[#F9F9F9]" />}
                  </tr>
                </thead>
                <tbody>
                  {displayResults.length > 0 ? (
                    displayResults.map((result, i) => (
                      <tr key={i}>
                        <th className="border border-black px-2 py-1.5 bg-[#F9F9F9] font-bold text-center">
                          {isEditing ? (
                            <Input
                              value={result.test_item}
                              onChange={(e) => handleResultChange(i, 'test_item', e.target.value)}
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
                              onChange={(e) => handleResultChange(i, 'specification', e.target.value)}
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
                              onChange={(e) => handleResultChange(i, 'result', e.target.value)}
                              className="h-5 text-[10px]"
                            />
                          ) : (
                            result.result || ''
                          )}
                        </td>
                        <td
                          className={`border border-black px-2 py-1.5 text-center ${
                            result.judgment === '적합' ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {isEditing ? (
                            <Select
                              value={result.judgment}
                              onValueChange={(value) => handleResultChange(i, 'judgment', value)}
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
                              onChange={(e) => handleResultChange(i, 'test_date', e.target.value)}
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
                              onChange={(e) => handleResultChange(i, 'tester', e.target.value)}
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
                              onClick={() => removeResult(i)}
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
                      <td colSpan={isEditing ? 7 : 6} className="border border-black text-center py-6 text-[#999999]">
                        등록된 시험 항목이 없습니다.
                      </td>
                    </tr>
                  )}
                  {!isEditing &&
                    displayResults.length > 0 &&
                    displayResults.length < 8 &&
                    Array.from({ length: 8 - displayResults.length }).map((_, i) => (
                      <tr key={`empty-${i}`}>
                        <th className="border border-black px-2 py-1.5 bg-[#F9F9F9] text-center">&nbsp;</th>
                        <td className="border border-black px-2 py-1.5 text-center" />
                        <td className="border border-black px-2 py-1.5 text-center" />
                        <td className="border border-black px-2 py-1.5 text-center" />
                        <td className="border border-black px-2 py-1.5 text-center" />
                        <td className="border border-black px-2 py-1.5 text-center" />
                      </tr>
                    ))}
                </tbody>
              </table>

              {isEditing && (
                <div className="mb-2">
                  <Button variant="outline" size="sm" onClick={addResult} className="gap-1 text-xs">
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
                    <th className="border border-black px-2 py-1.5 bg-[#F9F9F9] font-bold text-center">판정결과</th>
                    <td
                      className={`border border-black px-2 py-1.5 text-center font-bold ${
                        (isEditing
                          ? editResults.every((result) => result.judgment === '적합')
                          : certificate?.overall_judgment === '적합')
                          ? 'text-emerald-700'
                          : 'text-red-700'
                      }`}
                    >
                      {isEditing
                        ? editResults.every((result) => result.judgment === '적합')
                          ? '적합'
                          : '부적합'
                        : certificate?.overall_judgment || ''}
                    </td>
                    <th className="border border-black px-2 py-1.5 bg-[#F9F9F9] font-bold text-center">판정일자</th>
                    <td className="border border-black px-2 py-1.5 text-center">
                      <EditableCell
                        value={displayFields.judgment_date}
                        onChange={(v) => handleFieldChange('judgment_date', v)}
                        editing={isEditing}
                        type="date"
                      />
                    </td>
                  </tr>
                  <tr>
                    <th className="border border-black px-2 py-1.5 bg-[#F9F9F9] font-bold text-center">판정자</th>
                    <td className="border border-black px-2 py-1.5 text-center">
                      <EditableCell
                        value={displayFields.approver}
                        onChange={(v) => handleFieldChange('approver', v)}
                        editing={isEditing}
                        className="text-center"
                      />
                    </td>
                    <th className="border border-black px-2 py-1.5 bg-[#F9F9F9] font-bold text-center">비고</th>
                    <td className="border border-black px-2 py-1.5" style={{ minHeight: '50px' }}>
                      <EditableCell
                        value={displayFields.notes}
                        onChange={(v) => handleFieldChange('notes', v)}
                        editing={isEditing}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="text-[11px] text-[#999999] text-right mt-4">
                EVS-F914-01 (2019.08.13. Rev.0) (주)에바스코스메틱
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function extractDateFromUrl(url: string): string | null {
  try {
    const fileName = decodeURIComponent(url.split('/').pop() || '')
    const match = fileName.match(/^(\d{4}-\d{2}-\d{2})_/)
    if (match) return match[1]
    return null
  } catch {
    return null
  }
}

function displayFileName(url: string): string {
  const raw = decodeURIComponent(url.split('/').pop() || 'document')
  const stripped = raw.replace(/^\d{4}-\d{2}-\d{2}_/, '')
  return stripped
}

function DocumentList({
  docs,
  onDelete,
}: {
  docs: string[]
  onDelete?: (url: string) => void
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const previewFileName = previewUrl
    ? displayFileName(previewUrl)
    : ''
  if (docs.length === 0) {
    return (
      <div className="text-sm text-[#999999] py-8 text-center bg-[#F9F9F9] rounded-md border border-[#E5E5E5]">
        등록된 문서가 없습니다.
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {docs.map((url, idx) => {
          const fileName = displayFileName(url)
          const uploadDate = extractDateFromUrl(url)
          return (
            <div
              key={idx}
              className="border border-[#E5E5E5] rounded-lg p-3 bg-white flex items-center justify-between shadow-sm hover:border-[#999999] transition-colors cursor-pointer"
              onClick={() => setPreviewUrl(url)}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="bg-[#F9F9F9] text-[#666666] p-1.5 rounded border border-[#E5E5E5]">
                  <FileText size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate text-[#1A1A1A]" title={fileName}>
                    {fileName}
                  </div>
                  <div className="text-[10px] text-[#999999] flex items-center gap-1.5">
                    PDF
                    {uploadDate && (
                      <>
                        <span className="text-[#E5E5E5]">·</span>
                        <span>{uploadDate}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-[#999999] hover:text-red-500 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(url)
                    }}
                  >
                    <Trash2 size={13} />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-[#999999] hover:text-[#1A1A1A] flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    window.open(url, '_blank')
                  }}
                >
                  <ExternalLink size={13} />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
      <Dialog
        open={!!previewUrl}
        onOpenChange={(open) => {
          if (!open) setPreviewUrl(null)
        }}
      >
        <DialogContent
          className="max-w-[95vw] sm:max-w-[95vw] w-[95vw] h-[90vh] p-0 flex flex-col border border-[#E5E5E5]"
          showCloseButton={false}
          aria-describedby={undefined}
        >
          <DialogHeader className="px-4 py-3 border-b border-[#E5E5E5] bg-[#F9F9F9] flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm font-medium truncate pr-4 text-[#1A1A1A]">
                {previewFileName}
              </DialogTitle>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button variant="ghost" size="sm" className="h-8 text-xs text-[#666666] hover:text-[#1A1A1A]" asChild>
                  <a href={previewUrl || ''} download>
                    <Download size={14} className="mr-1" /> 다운로드
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-[#666666] hover:text-[#1A1A1A]"
                  onClick={() => previewUrl && window.open(previewUrl, '_blank')}
                >
                  <ExternalLink size={14} className="mr-1" /> 새창
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[#999999] hover:text-[#1A1A1A]"
                  onClick={() => setPreviewUrl(null)}
                >
                  <X size={16} />
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {previewUrl && <iframe src={previewUrl} className="w-full h-full border-0" title={previewFileName} />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function V2IngredientDetailPage() {
  const params = useParams()
  const rawCode = params.ingredientCode as string
  const ingredientCode = decodeURIComponent(rawCode)
  const queryClient = useQueryClient()

  const [selectedReceipt, setSelectedReceipt] = useState<ExtendedReceipt | null>(null)
  const [uploadDocType, setUploadDocType] = useState<DocCategory>('coa_urls')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['v2-ingredient-detail', ingredientCode],
    queryFn: () => fetchIngredientDetail(ingredientCode),
  })

  const { data: components, isLoading: componentsLoading } = useQuery({
    queryKey: ['v2-ingredient-components', ingredientCode],
    queryFn: () => fetchIngredientComponents(ingredientCode),
  })

  const { data: receipts, isLoading: receiptsLoading } = useQuery({
    queryKey: ['v2-ingredient-receipts', ingredientCode],
    queryFn: () => fetchIngredientReceiptsByCode(ingredientCode),
  })

  const isLoading = detailLoading || componentsLoading || receiptsLoading

  const handleCertChanged = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['v2-ingredient-receipts', ingredientCode] })
  }, [queryClient, ingredientCode])

  const handleDocUpload = async (file: File) => {
    if (!detail) return
    setIsUploading(true)
    try {
      const supabase = createClient()
      const today = new Date().toISOString().slice(0, 10)
      const typeFolder = uploadDocType.replace('_urls', '')
      const storagePath = `ingredients/${ingredientCode}/${typeFolder}/${today}_${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, { contentType: file.type, upsert: true })
      if (uploadError) {
        toast.error(`업로드 실패: ${uploadError.message}`)
        return
      }
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(storagePath)
      const { error } = await appendDocumentUrl(ingredientCode, uploadDocType, urlData.publicUrl)
      if (error) {
        toast.error(`저장 실패: ${error}`)
        return
      }
      queryClient.invalidateQueries({ queryKey: ['v2-ingredient-detail', ingredientCode] })
      toast.success('문서가 업로드되었습니다')
    } catch {
      toast.error('업로드 중 오류 발생')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDocDelete = async (docType: DocCategory, url: string) => {
    if (!confirm('이 문서를 삭제하시겠습니까?')) return
    const { error } = await removeDocumentUrl(ingredientCode, docType, url)
    if (error) {
      toast.error(`삭제 실패: ${error}`)
      return
    }
    queryClient.invalidateQueries({ queryKey: ['v2-ingredient-detail', ingredientCode] })
    toast.success('문서가 삭제되었습니다')
  }

  const openCertificate = (receipt: IngredientReceiptRow) => {
    if (!detail) return

    const extendedReceipt: ExtendedReceipt = {
      ...receipt,
      ingredient_code: detail.ingredient_code,
      ingredient_name: detail.ingredient_name,
    }
    setSelectedReceipt(extendedReceipt)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-[1200px] px-4 py-20 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#666666]" />
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="container mx-auto max-w-[1200px] px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-[#1A1A1A]">원료 정보를 찾을 수 없습니다.</h2>
        <Link href="/v2/ingredients" className="text-[#666666] hover:text-[#1A1A1A] hover:underline mt-4 inline-block">
          목록으로 돌아가기
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-[1200px] px-4 py-6 text-[#1A1A1A]">
      <div className="mb-6">
        <Link href="/v2/ingredients" className="inline-flex items-center text-sm text-[#666666] hover:text-[#1A1A1A] mb-3 transition-colors">
          <ChevronLeft size={16} className="mr-1" /> 원료 관리
        </Link>

        <div className="bg-[#F9F9F9] rounded-xl p-6 border border-[#E5E5E5]">
          <div className="flex items-start justify-between gap-4 flex-col md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-lg text-[#666666] font-medium tracking-tight">
                  {detail.ingredient_code}
                </span>
                <span className="text-[10px] font-semibold bg-[#1A1A1A] text-white px-2 py-0.5 rounded-full tracking-wider">
                  원료
                </span>
              </div>
              <h1 className="text-2xl font-bold text-[#1A1A1A]">{detail.ingredient_name}</h1>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="bg-white border-[#E5E5E5] text-[#666666] font-normal px-3 py-1">
                제조사: {detail.manufacturer || '-'}
              </Badge>
              <Badge variant="outline" className="bg-white border-[#E5E5E5] text-[#666666] font-normal px-3 py-1">
                원산지: {detail.origin_country || '-'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1">
          <Card className="border-[#E5E5E5] shadow-sm h-full">
            <CardHeader className="pb-3 border-b border-[#E5E5E5] bg-[#F9F9F9]">
              <CardTitle className="text-sm font-bold flex items-center justify-between text-[#1A1A1A]">
                <span className="flex items-center gap-2">
                  <FlaskConical size={16} className="text-[#666666]" /> 성분 조성
                </span>
                <Badge className="bg-[#1A1A1A] text-white hover:bg-[#1A1A1A] border-0">
                  {components?.length || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F9F9F9] hover:bg-[#F9F9F9]">
                    <TableHead className="w-[40px] text-[11px] h-9 text-[#666666]">#</TableHead>
                    <TableHead className="text-[11px] h-9 text-[#666666]">성분명 (INCI)</TableHead>
                    <TableHead className="text-[11px] h-9 text-right text-[#666666]">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!components || components.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-[#999999] text-xs">
                        등록된 성분 정보가 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    components.map((comp, idx) => (
                      <TableRow key={comp.id} className="hover:bg-[#F9F9F9]">
                        <TableCell className="text-[11px] py-2 text-[#666666]">{idx + 1}</TableCell>
                        <TableCell className="text-[11px] py-2">
                          <div className="font-medium text-[#1A1A1A]">{comp.inci_name_en || '-'}</div>
                          <div className="text-[#666666] text-[10px]">{comp.inci_name_kr || '-'}</div>
                          <div className="text-[#999999] text-[10px] mt-0.5">CAS: {comp.cas_number || '-'}</div>
                        </TableCell>
                        <TableCell className="text-[11px] py-2 text-right font-mono text-[#1A1A1A]">
                          {comp.composition_ratio != null ? `${comp.composition_ratio}%` : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="border-[#E5E5E5] shadow-sm h-full">
            <CardHeader className="pb-3 border-b border-[#E5E5E5] bg-[#F9F9F9]">
              <CardTitle className="text-sm font-bold flex items-center justify-between text-[#1A1A1A]">
                <span className="flex items-center gap-2">
                  <FileText size={16} className="text-[#666666]" /> 관련 문서
                </span>
                <div className="flex items-center gap-2">
                  <Select value={uploadDocType} onValueChange={(v) => setUploadDocType(v as DocCategory)}>
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coa_urls">업체성적서</SelectItem>
                      <SelectItem value="composition_urls">Composition</SelectItem>
                      <SelectItem value="msds_en_urls">MSDS EN</SelectItem>
                      <SelectItem value="msds_kr_urls">MSDS KR</SelectItem>
                      <SelectItem value="fragrance_urls">향료자료</SelectItem>
                      <SelectItem value="other_urls">기타</SelectItem>
                    </SelectContent>
                  </Select>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleDocUpload(file)
                      e.target.value = ''
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {isUploading ? '업로드 중...' : '업로드'}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Tabs defaultValue="coa" className="w-full">
                <TabsList className="w-full justify-start bg-[#F9F9F9] p-1 mb-4 h-auto flex-wrap">
                  <TabsTrigger value="coa" className="text-xs px-3 py-1.5 h-8">
                    업체성적서{' '}
                    <span className="ml-1.5 bg-[#E5E5E5] text-[#666666] text-[10px] px-1 rounded-sm">
                      {detail.coa_urls.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="comp" className="text-xs px-3 py-1.5 h-8">
                    Composition{' '}
                    <span className="ml-1.5 bg-[#E5E5E5] text-[#666666] text-[10px] px-1 rounded-sm">
                      {detail.composition_urls.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="msds-en" className="text-xs px-3 py-1.5 h-8">
                    MSDS EN{' '}
                    <span className="ml-1.5 bg-[#E5E5E5] text-[#666666] text-[10px] px-1 rounded-sm">
                      {detail.msds_en_urls.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="msds-kr" className="text-xs px-3 py-1.5 h-8">
                    MSDS KR{' '}
                    <span className="ml-1.5 bg-[#E5E5E5] text-[#666666] text-[10px] px-1 rounded-sm">
                      {detail.msds_kr_urls.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="fragrance" className="text-xs px-3 py-1.5 h-8">
                    향료자료{' '}
                    <span className="ml-1.5 bg-[#E5E5E5] text-[#666666] text-[10px] px-1 rounded-sm">
                      {detail.fragrance_urls.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="others" className="text-xs px-3 py-1.5 h-8">
                    기타{' '}
                    <span className="ml-1.5 bg-[#E5E5E5] text-[#666666] text-[10px] px-1 rounded-sm">
                      {detail.other_urls.length}
                    </span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="coa">
                  <DocumentList docs={detail.coa_urls} onDelete={(url) => handleDocDelete('coa_urls', url)} />
                </TabsContent>
                <TabsContent value="comp">
                  <DocumentList docs={detail.composition_urls} onDelete={(url) => handleDocDelete('composition_urls', url)} />
                </TabsContent>
                <TabsContent value="msds-en">
                  <DocumentList docs={detail.msds_en_urls} onDelete={(url) => handleDocDelete('msds_en_urls', url)} />
                </TabsContent>
                <TabsContent value="msds-kr">
                  <DocumentList docs={detail.msds_kr_urls} onDelete={(url) => handleDocDelete('msds_kr_urls', url)} />
                </TabsContent>
                <TabsContent value="fragrance">
                  <DocumentList docs={detail.fragrance_urls} onDelete={(url) => handleDocDelete('fragrance_urls', url)} />
                </TabsContent>
                <TabsContent value="others">
                  <DocumentList docs={detail.other_urls} onDelete={(url) => handleDocDelete('other_urls', url)} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-[#E5E5E5] shadow-sm mb-10">
        <CardHeader className="pb-3 border-b border-[#E5E5E5] bg-[#F9F9F9]">
          <CardTitle className="text-sm font-bold flex items-center justify-between text-[#1A1A1A]">
            <span className="flex items-center gap-2">
              <History size={16} className="text-[#666666]" /> 입고 및 성적서 내역
            </span>
            <Badge className="bg-[#F9F9F9] text-[#666666] hover:bg-[#F9F9F9] border border-[#E5E5E5]">
              {receipts?.length || 0}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9F9F9] hover:bg-[#F9F9F9]">
                <TableHead className="text-xs w-[120px] text-[#666666]">입고일</TableHead>
                <TableHead className="text-xs w-[120px] text-[#666666]">LOT No</TableHead>
                <TableHead className="text-xs w-[100px] text-right text-[#666666]">입고량</TableHead>
                <TableHead className="text-xs text-[#666666]">납품처</TableHead>
                <TableHead className="text-xs w-[140px] text-[#666666]">시험번호</TableHead>
                <TableHead className="text-xs w-[100px] text-center text-[#666666]">성적서 상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!receipts || receipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-[#999999] text-sm">
                    입고 내역이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                receipts.map((receipt) => (
                  <TableRow
                    key={receipt.id}
                    className="cursor-pointer hover:bg-[#F9F9F9] transition-colors"
                    onClick={() => openCertificate(receipt)}
                  >
                    <TableCell className="text-xs text-[#666666]">{receipt.receipt_date}</TableCell>
                    <TableCell className="text-xs font-medium text-[#1A1A1A]">{receipt.lot_no || '-'}</TableCell>
                    <TableCell className="text-xs font-mono text-right text-[#1A1A1A]">
                      {receipt.receipt_qty ? receipt.receipt_qty.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-xs text-[#666666]">{receipt.supplier || '-'}</TableCell>
                    <TableCell className="text-xs font-mono text-[#666666]">{receipt.test_no || '-'}</TableCell>
                    <TableCell className="text-center py-2">
                      {receipt.has_certificate ? (
                        <Badge className="bg-[#1A1A1A] text-white hover:bg-[#1A1A1A] text-[10px] px-2 py-0.5 border-0 shadow-none font-normal">
                          발급완료
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[#999999] bg-[#F9F9F9] border-[#E5E5E5] text-[10px] px-2 py-0.5 font-normal"
                        >
                          미발급
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
