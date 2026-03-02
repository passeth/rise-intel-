'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { loadKoreanFont } from '@/lib/pdf/fonts'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Search, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ChevronUp, ChevronDown, ChevronsUpDown, X, Download, Pencil, Save, Plus, Trash2,
} from 'lucide-react'
import {
  fetchIngredientReceipts, fetchIngredientSpecs, fetchIngredientCertificate,
  createIngredientCertificate, updateIngredientCertificate,
  updateIngredientCertificatePdfUrl, generateIngredientCertificateNo,
  type IngredientReceipt, type IngredientSpec, type IngredientCertificate,
  type IngredientCertificateResult, type SortField, type SortDirection,
} from './actions'

const PAGE_SIZE = 50

function getYearOptions(): number[] {
  const current = new Date().getFullYear()
  const years: number[] = []
  for (let y = current; y >= 2020; y--) years.push(y)
  return years
}

// ── SortIcon ──
function SortIcon({ field, currentField, currentDir }: { field: SortField; currentField: SortField; currentDir: SortDirection }) {
  if (currentField !== field) return <ChevronsUpDown size={12} className="text-slate-300" />
  return currentDir === 'asc'
    ? <ChevronUp size={12} className="text-amber-600" />
    : <ChevronDown size={12} className="text-amber-600" />
}

// ── EditableCell ──
function EditableCell({ value, onChange, editing, type, className }: {
  value: string; onChange: (v: string) => void; editing: boolean; type?: string; className?: string
}) {
  if (!editing) return <span>{value}</span>
  return <Input value={value} onChange={(e) => onChange(e.target.value)} type={type} className={`h-5 text-[10px] ${className || ''}`} />
}

// ── Certificate Preview Modal ──
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
  const [certificate, setCertificate] = useState<IngredientCertificate | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const [editFields, setEditFields] = useState({
    tester: '', approver: '', test_date: '', judgment_date: '',
    overall_judgment: '적합', notes: '', lot_no: '', receipt_qty: '',
    supplier: '', test_no: '',
  })
  const [editResults, setEditResults] = useState<IngredientCertificateResult[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        if (receipt.has_certificate) {
          const { certificate: cert } = await fetchIngredientCertificate(receipt.id)
          if (cert) { setCertificate(cert); setMode('view') }
          else { await loadForIssue() }
        } else {
          await loadForIssue()
        }
      } catch { toast.error('데이터 로드 실패') }
      finally { setLoading(false) }
    }

    const loadForIssue = async () => {
      const fetchedSpecs = await fetchIngredientSpecs(receipt.ingredient_code)
      const certNo = await generateIngredientCertificateNo()
      const today = new Date().toISOString().slice(0, 10)
      setEditFields({
        tester: '', approver: '', test_date: today, judgment_date: today,
        overall_judgment: '적합', notes: '', lot_no: receipt.lot_no || '',
        receipt_qty: receipt.receipt_qty?.toString() || '',
        supplier: receipt.supplier || '', test_no: certNo,
      })
      setEditResults(fetchedSpecs.map((s) => {
        const item = s.spec_item.trim()
        let defaultResult = 'PASS'
        if (/미생물/.test(item)) defaultResult = '불검출'
        else if (/안정성/.test(item)) defaultResult = '적합'
        return { test_item: s.spec_item, specification: s.spec_standard || '', result: defaultResult, judgment: '적합', test_date: today, tester: '' }
      }))
      setMode('issue')
    }

    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt.id])

  const startEditing = () => {
    if (!certificate) return
    setEditFields({
      tester: certificate.tester || '', approver: certificate.approver || '',
      test_date: certificate.test_date || '', judgment_date: certificate.judgment_date || '',
      overall_judgment: certificate.overall_judgment || '적합', notes: certificate.notes || '',
      lot_no: certificate.lot_no || '', receipt_qty: certificate.receipt_qty?.toString() || '',
      supplier: certificate.supplier || '', test_no: certificate.test_no || '',
    })
    setEditResults(certificate.results.map((r) => ({ ...r })))
    setMode('edit')
  }

  const handleFieldChange = (field: string, value: string) => {
    setEditFields((prev) => ({ ...prev, [field]: value }))
  }

  const handleResultChange = (index: number, field: keyof IngredientCertificateResult, value: string) => {
    setEditResults((prev) => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  const addResult = () => {
    setEditResults((prev) => [...prev, { test_item: '', specification: '', result: 'PASS', judgment: '적합', test_date: editFields.test_date, tester: editFields.tester }])
  }

  const removeResult = (index: number) => {
    setEditResults((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSaveEdit = async () => {
    if (!certificate) return
    setIsSaving(true)
    try {
      const overallJudgment = editResults.every((r) => r.judgment === '적합') ? '적합' : '부적합'
      const { error } = await updateIngredientCertificate(certificate.id, {
        ...editFields, receipt_qty: editFields.receipt_qty ? Number(editFields.receipt_qty) : undefined,
        overall_judgment: overallJudgment, results: editResults,
      })
      if (error) { toast.error('저장 실패: ' + error); return }
      const { certificate: updated } = await fetchIngredientCertificate(receipt.id)
      if (updated) setCertificate(updated)
      onCertChanged(); toast.success('저장되었습니다'); setMode('view')
    } catch { toast.error('저장 중 오류가 발생했습니다') }
    finally { setIsSaving(false) }
  }

  const handleSaveIssue = async () => {
    if (editResults.some((r) => !r.result)) { toast.error('모든 시험 결과를 입력해주세요'); return }
    setIsSaving(true)
    try {
      const overallJudgment = editResults.every((r) => r.judgment === '적합') ? '적합' : '부적합'
      const { certificate: created, error } = await createIngredientCertificate({
        receipt_id: receipt.id, ingredient_code: receipt.ingredient_code, ingredient_name: receipt.ingredient_name,
        lot_no: editFields.lot_no || undefined, test_no: editFields.test_no || undefined,
        receipt_date: receipt.receipt_date || undefined, receipt_qty: editFields.receipt_qty ? Number(editFields.receipt_qty) : undefined,
        supplier: editFields.supplier || undefined, tester: editFields.tester || undefined,
        approver: editFields.approver || undefined, test_date: editFields.test_date || undefined,
        judgment_date: editFields.judgment_date || undefined, overall_judgment: overallJudgment,
        results: editResults, notes: editFields.notes || undefined,
      })
      if (error || !created) { toast.error(error || '저장 실패'); return }
      toast.success('성적서가 저장되었습니다')
      try {
        const pdfBlob = await generateIngredientPdf(created, editResults)
        const supabase = createClient()
        const fileName = `${editFields.test_no || created.id}.pdf`
        const filePath = `certificates/${fileName}`
        const { error: uploadErr } = await supabase.storage.from('documents').upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: true })
        if (uploadErr) { toast.error('PDF 업로드 실패: ' + uploadErr.message) }
        else {
          const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)
          await updateIngredientCertificatePdfUrl(created.id, urlData.publicUrl)
          const url = URL.createObjectURL(pdfBlob)
          const link = document.createElement('a'); link.href = url; link.download = fileName
          document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url)
          toast.success('PDF 생성 및 다운로드 완료')
        }
      } catch (pdfErr) { console.error('PDF generation error:', pdfErr); toast.error('PDF 생성 실패 (성적서는 저장됨)') }
      setCertificate(created); onCertChanged(); setMode('view')
    } catch { toast.error('성적서 발급 중 오류가 발생했습니다') }
    finally { setIsSaving(false) }
  }

  const handleDownloadPdf = async () => {
    if (!certificate) return
    setIsGenerating(true)
    try {
      const pdfBlob = await generateIngredientPdf(certificate, certificate.results)
      const supabase = createClient()
      const fileName = `${certificate.test_no || certificate.id}.pdf`
      const filePath = `certificates/${fileName}`
      const { error: uploadErr } = await supabase.storage.from('documents').upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: true })
      if (uploadErr) { toast.error('PDF 업로드 실패: ' + uploadErr.message); return }
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)
      await updateIngredientCertificatePdfUrl(certificate.id, urlData.publicUrl)
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a'); link.href = url; link.download = fileName
      document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url)
      onCertChanged(); toast.success('PDF 저장 및 다운로드 완료')
    } catch { toast.error('PDF 생성 실패') }
    finally { setIsGenerating(false) }
  }

  const isEditing = mode === 'edit' || mode === 'issue'
  const displayFields = isEditing ? editFields : {
    tester: certificate?.tester || '', approver: certificate?.approver || '',
    test_date: certificate?.test_date || '', judgment_date: certificate?.judgment_date || '',
    overall_judgment: certificate?.overall_judgment || '', notes: certificate?.notes || '',
    lot_no: certificate?.lot_no || receipt.lot_no || '',
    receipt_qty: certificate?.receipt_qty?.toString() || receipt.receipt_qty?.toString() || '',
    supplier: certificate?.supplier || receipt.supplier || '',
    test_no: certificate?.test_no || receipt.test_no || '',
  }
  const displayResults = isEditing ? editResults : (certificate?.results || [])
  const ingredientName = certificate?.ingredient_name || receipt.ingredient_name

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="w-[760px] max-w-[760px] sm:max-w-[760px] max-h-[95vh] overflow-y-auto p-0" showCloseButton={false} aria-describedby={undefined}>
        {/* Sticky toolbar */}
        <div className="sticky top-0 z-10 flex justify-between items-center px-4 py-2 bg-slate-50 border-b">
          <DialogHeader className="p-0">
            <DialogTitle className="text-sm font-medium text-slate-700">
              {mode === 'issue' ? '원자재 시험 성적서 발급' : '원자재 시험 기준 및 시험 성적서'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            {mode === 'view' && (
              <>
                <Button variant="outline" size="sm" onClick={startEditing}><Pencil size={14} className="mr-1" /> 수정</Button>
                <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={isGenerating}>
                  {isGenerating ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Download size={14} className="mr-1" />}
                  {isGenerating ? '생성 중...' : 'PDF'}
                </Button>
              </>
            )}
            {mode === 'edit' && (
              <>
                <Button variant="default" size="sm" onClick={handleSaveEdit} disabled={isSaving}>
                  {isSaving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Save size={14} className="mr-1" />}
                  {isSaving ? '저장 중...' : '저장'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setMode('view')} disabled={isSaving}>취소</Button>
              </>
            )}
            {mode === 'issue' && (
              <>
                <Button variant="default" size="sm" onClick={handleSaveIssue} disabled={isSaving} className="bg-amber-500 hover:bg-amber-600">
                  {isSaving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Save size={14} className="mr-1" />}
                  {isSaving ? '발급 중...' : '저장 및 PDF 발급'}
                </Button>
                <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>취소</Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}><X className="h-3.5 w-3.5" /></Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex justify-center p-2 bg-slate-100">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> 로딩 중...
            </div>
          ) : (
            <div className="bg-white shadow-lg w-full" style={{ padding: '20px 24px', minHeight: '900px' }}>
              {/* 결재 box */}
              <div className="h-[70px] mb-4">
                <table className="border-collapse text-[11px] float-right" style={{ width: '150px' }}>
                  <tbody>
                    <tr>
                      <th rowSpan={2} className="border border-black px-2 py-1 bg-gray-100 font-bold text-center align-middle" style={{ width: '30px' }}>결<br/>재</th>
                      <th className="border border-black px-2 py-1 bg-gray-100 font-bold text-center" style={{ width: '60px' }}>담당</th>
                      <th className="border border-black px-2 py-1 bg-gray-100 font-bold text-center" style={{ width: '60px' }}>팀장</th>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 text-center" style={{ height: '40px' }}>
                        <EditableCell value={displayFields.tester} onChange={(v) => handleFieldChange('tester', v)} editing={isEditing} className="text-center" />
                      </td>
                      <td className="border border-black px-2 text-center" style={{ height: '40px' }}>
                        <EditableCell value={displayFields.approver} onChange={(v) => handleFieldChange('approver', v)} editing={isEditing} className="text-center" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h1 className="text-center text-xl font-bold tracking-wider mb-6 underline underline-offset-4">원자재 시험 기준 및 시험 성적서</h1>

              {/* Info section */}
              <table className="w-full border-collapse text-[11px] mb-2">
                <colgroup>
                  <col style={{ width: '12%' }} /><col style={{ width: '28%' }} /><col style={{ width: '12%' }} />
                  <col style={{ width: '18%' }} /><col style={{ width: '12%' }} /><col style={{ width: '18%' }} />
                </colgroup>
                <tbody>
                  <tr>
                    <th rowSpan={2} className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">원료명</th>
                    <td rowSpan={2} className="border border-black px-2 py-1.5 text-center">{ingredientName}</td>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">규격</th>
                    <td className="border border-black px-2 py-1.5 text-center"></td>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">코드번호</th>
                    <td className="border border-black px-2 py-1.5 text-center">{receipt.ingredient_code}</td>
                  </tr>
                  <tr>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">입고량</th>
                    <td className="border border-black px-2 py-1.5 text-right pr-2">
                      <EditableCell value={displayFields.receipt_qty} onChange={(v) => handleFieldChange('receipt_qty', v)} editing={isEditing} className="text-right" />
                      {!isEditing && ' Kg'}
                    </td>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">시험번호</th>
                    <td className="border border-black px-2 py-1.5 text-center">
                      <EditableCell value={displayFields.test_no} onChange={(v) => handleFieldChange('test_no', v)} editing={isEditing} className="text-center" />
                    </td>
                  </tr>
                  <tr>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">제조원</th>
                    <td className="border border-black px-2 py-1.5 text-center">
                      <EditableCell value={displayFields.supplier} onChange={(v) => handleFieldChange('supplier', v)} editing={isEditing} className="text-center" />
                    </td>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">채취량</th>
                    <td className="border border-black px-2 py-1.5 text-center">50 g</td>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">입고일자</th>
                    <td className="border border-black px-2 py-1.5 text-center">{receipt.receipt_date}</td>
                  </tr>
                  <tr>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">납품처</th>
                    <td className="border border-black px-2 py-1.5 text-center">
                      <EditableCell value={displayFields.supplier} onChange={(v) => handleFieldChange('supplier', v)} editing={isEditing} className="text-center" />
                    </td>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">채취자</th>
                    <td className="border border-black px-2 py-1.5 text-center">
                      <EditableCell value={displayFields.tester} onChange={(v) => handleFieldChange('tester', v)} editing={isEditing} className="text-center" />
                    </td>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">채취일자</th>
                    <td className="border border-black px-2 py-1.5 text-center">
                      <EditableCell value={displayFields.test_date} onChange={(v) => handleFieldChange('test_date', v)} editing={isEditing} type="date" />
                    </td>
                  </tr>
                  <tr>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">채취방법</th>
                    <td className="border border-black px-2 py-1.5 text-center">무작위</td>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">채취장소</th>
                    <td className="border border-black px-2 py-1.5 text-center">원료실</td>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">시험자</th>
                    <td className="border border-black px-2 py-1.5 text-center">
                      <EditableCell value={displayFields.tester} onChange={(v) => handleFieldChange('tester', v)} editing={isEditing} className="text-center" />
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Test items table */}
              <table className="w-full border-collapse text-[11px] mt-4 mb-2">
                <colgroup>
                  <col style={{ width: isEditing ? '13%' : '15%' }} /><col style={{ width: isEditing ? '25%' : '30%' }} />
                  <col style={{ width: '15%' }} /><col style={{ width: '15%' }} />
                  <col style={{ width: '10%' }} /><col style={{ width: isEditing ? '12%' : '15%' }} />
                  {isEditing && <col style={{ width: '5%' }} />}
                </colgroup>
                <thead>
                  <tr>
                    <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">시험항목</th>
                    <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">시험기준</th>
                    <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">시험결과</th>
                    <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">적부판정</th>
                    <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">시험일자</th>
                    <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">시험자</th>
                    {isEditing && <th className="border border-black px-1 py-2 bg-gray-100"></th>}
                  </tr>
                </thead>
                <tbody>
                  {displayResults.length > 0 ? displayResults.map((r, i) => (
                    <tr key={i}>
                      <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">
                        {isEditing ? <Input value={r.test_item} onChange={(e) => handleResultChange(i, 'test_item', e.target.value)} className="h-5 text-[10px]" /> : r.test_item}
                      </th>
                      <td className="border border-black px-2 py-1.5 text-center">
                        {isEditing ? <Input value={r.specification || ''} onChange={(e) => handleResultChange(i, 'specification', e.target.value)} className="h-5 text-[10px]" /> : r.specification || ''}
                      </td>
                      <td className="border border-black px-2 py-1.5 text-center">
                        {isEditing ? <Input value={r.result || ''} onChange={(e) => handleResultChange(i, 'result', e.target.value)} className="h-5 text-[10px]" /> : r.result || ''}
                      </td>
                      <td className={`border border-black px-2 py-1.5 text-center ${r.judgment === '적합' ? 'text-green-700' : 'text-red-700'}`}>
                        {isEditing ? (
                          <Select value={r.judgment} onValueChange={(v) => handleResultChange(i, 'judgment', v)}>
                            <SelectTrigger className="h-5 text-[10px] w-14 mx-auto"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="적합">적합</SelectItem><SelectItem value="부적합">부적합</SelectItem></SelectContent>
                          </Select>
                        ) : (r.judgment === '적합' ? '적' : '부')}
                      </td>
                      <td className="border border-black px-2 py-1.5 text-center">
                        {isEditing ? <Input type="date" value={r.test_date || editFields.test_date} onChange={(e) => handleResultChange(i, 'test_date', e.target.value)} className="h-5 text-[10px]" /> : r.test_date || displayFields.test_date}
                      </td>
                      <td className="border border-black px-2 py-1.5 text-center">
                        {isEditing ? <Input value={r.tester || ''} onChange={(e) => handleResultChange(i, 'tester', e.target.value)} className="h-5 text-[10px]" /> : r.tester || displayFields.tester}
                      </td>
                      {isEditing && (
                        <td className="border border-black px-1 py-1.5 text-center">
                          <Button variant="ghost" size="sm" onClick={() => removeResult(i)} className="h-5 w-5 p-0 text-red-500"><Trash2 size={12} /></Button>
                        </td>
                      )}
                    </tr>
                  )) : (
                    <tr><td colSpan={isEditing ? 7 : 6} className="border border-black text-center py-6 text-slate-400">등록된 시험 항목이 없습니다.</td></tr>
                  )}
                  {!isEditing && displayResults.length > 0 && displayResults.length < 8 && Array.from({ length: 8 - displayResults.length }).map((_, i) => (
                    <tr key={`empty-${i}`}>
                      <th className="border border-black px-2 py-1.5 bg-gray-100 text-center">&nbsp;</th>
                      <td className="border border-black px-2 py-1.5 text-center"></td>
                      <td className="border border-black px-2 py-1.5 text-center"></td>
                      <td className="border border-black px-2 py-1.5 text-center"></td>
                      <td className="border border-black px-2 py-1.5 text-center"></td>
                      <td className="border border-black px-2 py-1.5 text-center"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {isEditing && (
                <div className="mb-2">
                  <Button variant="outline" size="sm" onClick={addResult} className="gap-1 text-xs"><Plus size={12} /> 시험항목 추가</Button>
                </div>
              )}

              {/* Judgment footer */}
              <table className="w-full border-collapse text-[11px] mt-4">
                <colgroup><col style={{ width: '15%' }} /><col style={{ width: '35%' }} /><col style={{ width: '15%' }} /><col style={{ width: '35%' }} /></colgroup>
                <tbody>
                  <tr>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">판정결과</th>
                    <td className={`border border-black px-2 py-1.5 text-center font-bold ${(isEditing ? editResults.every((r) => r.judgment === '적합') : certificate?.overall_judgment === '적합') ? 'text-green-700' : 'text-red-700'}`}>
                      {isEditing ? (editResults.every((r) => r.judgment === '적합') ? '적합' : '부적합') : (certificate?.overall_judgment || '')}
                    </td>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">판정일자</th>
                    <td className="border border-black px-2 py-1.5 text-center">
                      <EditableCell value={displayFields.judgment_date} onChange={(v) => handleFieldChange('judgment_date', v)} editing={isEditing} type="date" />
                    </td>
                  </tr>
                  <tr>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">판정자</th>
                    <td className="border border-black px-2 py-1.5 text-center">
                      <EditableCell value={displayFields.approver} onChange={(v) => handleFieldChange('approver', v)} editing={isEditing} className="text-center" />
                    </td>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">비고</th>
                    <td className="border border-black px-2 py-1.5" style={{ minHeight: '50px' }}>
                      <EditableCell value={displayFields.notes} onChange={(v) => handleFieldChange('notes', v)} editing={isEditing} />
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="text-[11px] text-gray-500 text-right mt-4">EVS-F914-01 (2019.08.13. Rev.0) (주)에바스코스메틱</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ──
export default function IngredientReceiptsPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>('receipt_date')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [year, setYear] = useState<number | null>(null)
  const [selectedReceipt, setSelectedReceipt] = useState<IngredientReceipt | null>(null)
  const queryClient = useQueryClient()

  const yearOptions = getYearOptions()

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1) }
    , 500)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading } = useQuery({
    queryKey: ['ingredient-receipts', debouncedSearch, page, sortField, sortDir, year],
    queryFn: () => fetchIngredientReceipts({ search: debouncedSearch, page, pageSize: PAGE_SIZE, sortField, sortDir, year }),
    placeholderData: (prev) => prev,
  })

  const receipts = data?.receipts ?? []
  const totalCount = data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')) }
    else { setSortField(field); setSortDir('asc') }
    setPage(1)
  }, [sortField])

  const handleCertChanged = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['ingredient-receipts'] })
  }, [queryClient])

  return (
    <div className="space-y-4 max-w-screen-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800">원료 입고 관리대장</h1>
        <div className="flex items-center gap-2">
          <Select value={year?.toString() ?? 'all'} onValueChange={(v) => { setYear(v === 'all' ? null : Number(v)); setPage(1) }}>
            <SelectTrigger className="h-8 w-[110px] text-sm"><SelectValue placeholder="연도" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 연도</SelectItem>
              {yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}년</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative max-w-sm flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="원료코드, 원료명, 공급처, 시험번호..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-2 text-left font-medium text-slate-600 cursor-pointer hover:bg-slate-100 select-none w-20" onClick={() => handleSort('receipt_date')}>
                <span className="inline-flex items-center gap-1">입고일 <SortIcon field="receipt_date" currentField={sortField} currentDir={sortDir} /></span>
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-600 cursor-pointer hover:bg-slate-100 select-none w-20" onClick={() => handleSort('ingredient_code')}>
                <span className="inline-flex items-center gap-1">원료코드 <SortIcon field="ingredient_code" currentField={sortField} currentDir={sortDir} /></span>
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-600 cursor-pointer hover:bg-slate-100 select-none min-w-[140px]" onClick={() => handleSort('ingredient_name')}>
                <span className="inline-flex items-center gap-1">원료명 <SortIcon field="ingredient_name" currentField={sortField} currentDir={sortDir} /></span>
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-600 w-20">Lot No</th>
              <th className="px-3 py-2 text-right font-medium text-slate-600 w-16">입고량</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600 cursor-pointer hover:bg-slate-100 select-none w-24" onClick={() => handleSort('supplier')}>
                <span className="inline-flex items-center gap-1">공급처 <SortIcon field="supplier" currentField={sortField} currentDir={sortDir} /></span>
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-600 w-16">COA</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600 cursor-pointer hover:bg-slate-100 select-none w-20" onClick={() => handleSort('test_no')}>
                <span className="inline-flex items-center gap-1">시험번호 <SortIcon field="test_no" currentField={sortField} currentDir={sortDir} /></span>
              </th>
              <th className="px-3 py-2 text-center font-medium text-slate-600 w-16">성적서</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && receipts.length === 0 ? (
              <tr><td colSpan={9} className="py-12 text-center"><Loader2 size={20} className="animate-spin text-amber-500 mx-auto" /></td></tr>
            ) : receipts.length === 0 ? (
              <tr><td colSpan={9} className="py-12 text-center text-slate-400 text-sm">검색 결과가 없습니다.</td></tr>
            ) : (
              receipts.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSelectedReceipt(r)}>
                  <td className="px-3 py-2 text-xs text-slate-600">{r.receipt_date}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.ingredient_code}</td>
                  <td className="px-3 py-2 text-xs text-slate-700 font-medium">{r.ingredient_name}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">{r.lot_no || <span className="text-slate-300">—</span>}</td>
                  <td className="px-3 py-2 text-xs text-slate-600 text-right font-mono">{r.receipt_qty != null ? r.receipt_qty.toLocaleString() : <span className="text-slate-300">—</span>}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">{r.supplier || <span className="text-slate-300">—</span>}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">{r.coa_reference || <span className="text-slate-300">—</span>}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.test_no || <span className="text-slate-300">—</span>}</td>
                  <td className="px-3 py-2 text-center">
                    {r.has_certificate
                      ? <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px] px-1.5">발급</Badge>
                      : <Badge variant="outline" className="text-slate-400 text-[10px] px-1.5">미발급</Badge>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between mt-3 text-sm text-slate-600">
          <div>총 <span className="font-medium text-slate-800">{totalCount.toLocaleString()}</span>건{totalPages > 1 && <span className="ml-1">({page}/{totalPages} 페이지)</span>}</div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => setPage(1)}><ChevronsLeft size={14} /></Button>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={14} /></Button>
              {(() => {
                const pages: number[] = []
                const start = Math.max(1, page - 2)
                const end = Math.min(totalPages, page + 2)
                for (let i = start; i <= end; i++) pages.push(i)
                return pages.map((p) => (
                  <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm"
                    className={`h-7 min-w-[28px] px-2 text-xs ${p === page ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}`}
                    onClick={() => setPage(p)}>{p}</Button>
                ))
              })()}
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><ChevronRight size={14} /></Button>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => setPage(totalPages)}><ChevronsRight size={14} /></Button>
            </div>
          )}
        </div>
      )}

      {/* Certificate Preview Modal */}
      {selectedReceipt && (
        <CertificatePreviewModal receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} onCertChanged={handleCertChanged} />
      )}
    </div>
  )
}

/* ─── PDF Generation ─── */

async function generateIngredientPdf(certificate: IngredientCertificate, results: IngredientCertificateResult[]): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  await loadKoreanFont(doc)
  doc.setFont('NanumGothic', 'normal')
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20

  // 결재란
  const boxX = pageWidth - margin - 45
  doc.setFontSize(7)
  doc.rect(boxX, 15, 8, 12); doc.rect(boxX + 8, 15, 18, 6); doc.rect(boxX + 26, 15, 18, 6)
  doc.rect(boxX + 8, 21, 18, 6); doc.rect(boxX + 26, 21, 18, 6)
  doc.text('결', boxX + 4, 19, { align: 'center' }); doc.text('재', boxX + 4, 24, { align: 'center' })
  doc.text('담당', boxX + 17, 19, { align: 'center' }); doc.text('팀장', boxX + 35, 19, { align: 'center' })
  if (certificate.tester) doc.text(certificate.tester, boxX + 17, 25, { align: 'center' })
  if (certificate.approver) doc.text(certificate.approver, boxX + 35, 25, { align: 'center' })

  // Title
  doc.setFontSize(14)
  const title = '원자재 시험 기준 및 시험 성적서'
  doc.text(title, pageWidth / 2, 42, { align: 'center' })
  doc.setLineWidth(0.3)
  const titleWidth = doc.getTextWidth(title)
  doc.line((pageWidth - titleWidth) / 2, 44, (pageWidth + titleWidth) / 2, 44)

  // Info table
  let y = 50
  autoTable(doc, {
    startY: y, margin: { left: margin, right: margin },
    body: [
      [{ content: '원료명', styles: { fillColor: [245,245,245], halign: 'center', fontStyle: 'bold' } }, { content: certificate.ingredient_name || '', styles: { halign: 'center' } }, { content: '규격', styles: { fillColor: [245,245,245], halign: 'center', fontStyle: 'bold' } }, { content: '', styles: { halign: 'center' } }, { content: '코드번호', styles: { fillColor: [245,245,245], halign: 'center', fontStyle: 'bold' } }, { content: certificate.ingredient_code || '', styles: { halign: 'center' } }],
      [{ content: '입고량', styles: { fillColor: [245,245,245], halign: 'center', fontStyle: 'bold' } }, { content: certificate.receipt_qty ? `${certificate.receipt_qty} Kg` : '', styles: { halign: 'center' } }, { content: '시험번호', styles: { fillColor: [245,245,245], halign: 'center', fontStyle: 'bold' } }, { content: certificate.test_no || '', styles: { halign: 'center' } }, { content: '입고일자', styles: { fillColor: [245,245,245], halign: 'center', fontStyle: 'bold' } }, { content: certificate.receipt_date || '', styles: { halign: 'center' } }],
      [{ content: '제조원', styles: { fillColor: [245,245,245], halign: 'center', fontStyle: 'bold' } }, { content: certificate.supplier || '', styles: { halign: 'center' } }, { content: '채취량', styles: { fillColor: [245,245,245], halign: 'center', fontStyle: 'bold' } }, { content: '50 g', styles: { halign: 'center' } }, { content: '채취일자', styles: { fillColor: [245,245,245], halign: 'center', fontStyle: 'bold' } }, { content: certificate.test_date || '', styles: { halign: 'center' } }],
      [{ content: '납품처', styles: { fillColor: [245,245,245], halign: 'center', fontStyle: 'bold' } }, { content: certificate.supplier || '', styles: { halign: 'center' } }, { content: '채취자', styles: { fillColor: [245,245,245], halign: 'center', fontStyle: 'bold' } }, { content: certificate.tester || '', styles: { halign: 'center' } }, { content: '채취방법', styles: { fillColor: [245,245,245], halign: 'center', fontStyle: 'bold' } }, { content: '무작위', styles: { halign: 'center' } }],
      [{ content: '채취장소', styles: { fillColor: [245,245,245], halign: 'center', fontStyle: 'bold' } }, { content: '원료실', styles: { halign: 'center' } }, { content: '시험자', styles: { fillColor: [245,245,245], halign: 'center', fontStyle: 'bold' } }, { content: certificate.tester || '', styles: { halign: 'center' } }, { content: '', styles: { fillColor: [245,245,245] } }, { content: '' }],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, font: 'NanumGothic', textColor: [0,0,0], lineColor: [0,0,0], lineWidth: 0.1 },
  })
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? y + 10

  // Test items
  y += 3
  autoTable(doc, {
    startY: y, margin: { left: margin, right: margin },
    head: [['시험항목', '시험기준', '시험결과', '적부판정', '시험일자', '시험자']],
    body: results.map((r) => [r.test_item, r.specification || '', r.result || '', r.judgment === '적합' ? '적' : '부', r.test_date || certificate.test_date || '', r.tester || certificate.tester || '']),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, font: 'NanumGothic', textColor: [0,0,0], lineColor: [0,0,0], lineWidth: 0.1 },
    headStyles: { fillColor: [245,245,245], textColor: [0,0,0], fontStyle: 'bold', halign: 'center' },
    columnStyles: { 0: { halign: 'center', fontStyle: 'bold', fillColor: [245,245,245] }, 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' } },
  })
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? y + 10

  // Judgment footer
  y += 3
  autoTable(doc, {
    startY: y, margin: { left: margin, right: margin },
    body: [
      [{ content: '판정결과', styles: { fillColor: [245,245,245], halign: 'center', fontStyle: 'bold' } }, { content: certificate.overall_judgment || '', styles: { halign: 'center', fontStyle: 'bold' } }, { content: '판정일자', styles: { fillColor: [245,245,245], halign: 'center', fontStyle: 'bold' } }, { content: certificate.judgment_date || '', styles: { halign: 'center' } }],
      [{ content: '판정자', styles: { fillColor: [245,245,245], halign: 'center', fontStyle: 'bold' } }, { content: certificate.approver || '', styles: { halign: 'center' } }, { content: '비고', styles: { fillColor: [245,245,245], halign: 'center', fontStyle: 'bold' } }, { content: certificate.notes || '', styles: { halign: 'center', minCellHeight: 12 } }],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, font: 'NanumGothic', textColor: [0,0,0], lineColor: [0,0,0], lineWidth: 0.1 },
  })
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? y + 10

  doc.setFontSize(8); doc.setTextColor(100, 100, 100)
  doc.text('EVS-F914-01 (2019.08.13. Rev.0) (주)에바스코스메틱', pageWidth - margin, y + 6, { align: 'right' })
  doc.setTextColor(0, 0, 0)

  return doc.output('blob')
}
