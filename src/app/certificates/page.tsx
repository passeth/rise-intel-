'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { loadKoreanFont } from '@/lib/pdf/fonts'
import { toast } from 'sonner'
import {
  fetchCertificates,
  fetchProductsForSelect,
  fetchQcSpecsTemplate,
  generateCertificateNo,
  createCertificate,
  updateCertificate,
  updateCertificatePdfUrl,
  type TestCertificate,
  type CertificateResult,
  type SortField,
  type SortDirection,
} from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Plus, Download, FileText, Search, Eye, X, Printer, Trash2, Pencil, Save, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

const QC_TYPES = ['반제품', '완제품', '영문'] as const
type QcType = (typeof QC_TYPES)[number]

const PAGE_SIZE = 50

// Generate year options from 2020 to current year
function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear()
  const years: number[] = []
  for (let y = currentYear; y >= 2020; y--) {
    years.push(y)
  }
  return years
}

export default function CertificatesPage() {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<QcType>('반제품')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [year, setYear] = useState<number | null>(null)
  const queryClient = useQueryClient()

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [activeTab, search, year, sortField, sortDir])

  const { data: certData, isLoading } = useQuery({
    queryKey: ['certificates', activeTab, search, page, sortField, sortDir, year],
    queryFn: () =>
      fetchCertificates({
        search: search || undefined,
        qcType: activeTab,
        page,
        pageSize: PAGE_SIZE,
        sortField,
        sortDir,
        year,
      }),
  })

  const certificates = certData?.certificates ?? []
  const totalCount = certData?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  return (
    <div className="space-y-4 max-w-screen-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800">시험 성적서</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="gap-1 bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Plus size={14} /> 새 성적서 발급
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[760px] max-w-[760px] sm:max-w-[760px] max-h-[95vh] overflow-y-auto p-0" showCloseButton={false} aria-describedby={undefined}>
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle className="text-sm font-medium text-slate-700">시험 성적서 발급</DialogTitle>
            </DialogHeader>
            <CertificateForm
              onComplete={() => {
                setDialogOpen(false)
                queryClient.invalidateQueries({ queryKey: ['certificates'] })
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as QcType)}>
        <div className="flex items-center justify-between gap-4">
          <TabsList className="h-9">
            <TabsTrigger value="반제품" className="text-sm px-4">
              반제품
            </TabsTrigger>
            <TabsTrigger value="완제품" className="text-sm px-4">
              완제품
            </TabsTrigger>
            <TabsTrigger value="영문" className="text-sm px-4">
              영문
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 flex-1 justify-end">
            <Select
              value={year?.toString() ?? 'all'}
              onValueChange={(v) => setYear(v === 'all' ? null : Number(v))}
            >
              <SelectTrigger className="h-8 w-[110px] text-sm">
                <SelectValue placeholder="연도" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 연도</SelectItem>
                {getYearOptions().map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}년
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative max-w-sm flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                placeholder="성적서번호, LOT, 제품코드 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-4">
          <CertificateTable
            certificates={certificates}
            isLoading={isLoading}
            qcType={activeTab}
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
          />

          {/* Pagination */}
          {totalCount > 0 && (
            <div className="flex items-center justify-between mt-3 text-sm text-slate-600">
              <div>
                총 <span className="font-medium text-slate-800">{totalCount.toLocaleString()}</span>건
                {totalPages > 1 && (
                  <span className="ml-1">
                    ({page}/{totalPages} 페이지)
                  </span>
                )}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={page <= 1}
                    onClick={() => setPage(1)}
                  >
                    <ChevronsLeft size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={14} />
                  </Button>

                  {/* Page numbers */}
                  {(() => {
                    const pages: number[] = []
                    const start = Math.max(1, page - 2)
                    const end = Math.min(totalPages, page + 2)
                    for (let i = start; i <= end; i++) pages.push(i)
                    return pages.map((p) => (
                      <Button
                        key={p}
                        variant={p === page ? 'default' : 'outline'}
                        size="sm"
                        className={`h-7 min-w-[28px] px-2 text-xs ${p === page ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    ))
                  })()}

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={page >= totalPages}
                    onClick={() => setPage(totalPages)}
                  >
                    <ChevronsRight size={14} />
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface CertificateViewModalProps {
  isOpen: boolean
  onClose: () => void
  certificate: TestCertificate | null
}

function CertificateViewModal({ isOpen, onClose, certificate }: CertificateViewModalProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const queryClient = useQueryClient()
  
  const [editData, setEditData] = useState({
    lot_no: '',
    manufacture_date: '',
    manufacture_qty: '',
    requester: '',
    sample_collection_date: '',
    sample_quantity: '',
    sample_collector: '',
    receiver: '',
    test_date: '',
    judgment_date: '',
    tester: '',
    approver: '',
    overall_judgment: '',
    results: [] as CertificateResult[],
  })

  const startEditing = () => {
    if (certificate) {
      setEditData({
        lot_no: certificate.lot_no || '',
        manufacture_date: certificate.manufacture_date || '',
        manufacture_qty: certificate.manufacture_qty || '',
        requester: certificate.requester || '',
        sample_collection_date: certificate.sample_collection_date || '',
        sample_quantity: certificate.sample_quantity || '',
        sample_collector: certificate.sample_collector || '',
        receiver: certificate.receiver || '',
        test_date: certificate.test_date || '',
        judgment_date: certificate.judgment_date || '',
        tester: certificate.tester || '',
        approver: certificate.approver || '',
        overall_judgment: certificate.overall_judgment || '적합',
        results: certificate.results?.map(r => ({ ...r })) || [],
      })
      setIsEditing(true)
    }
  }

  const cancelEditing = () => {
    setIsEditing(false)
  }

  const handleEditChange = (field: string, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }))
  }

  const handleResultChange = (index: number, field: keyof CertificateResult, value: string) => {
    setEditData(prev => ({
      ...prev,
      results: prev.results.map((r, i) => i === index ? { ...r, [field]: value } : r)
    }))
  }

  const addEditResult = () => {
    setEditData(prev => ({
      ...prev,
      results: [...prev.results, {
        test_item: '',
        specification: '',
        result: '',
        judgment: '적합',
        test_date: editData.test_date,
        tester: editData.tester,
      }]
    }))
  }

  const removeEditResult = (index: number) => {
    setEditData(prev => ({
      ...prev,
      results: prev.results.filter((_, i) => i !== index)
    }))
  }

  const handleSave = async () => {
    if (!certificate) return
    setIsSaving(true)
    try {
      const overallJudgment = editData.results.every(r => r.judgment === '적합') ? '적합' : '부적합'
      const { success, error } = await updateCertificate(certificate.id, {
        ...editData,
        overall_judgment: overallJudgment,
      })
      if (error) {
        toast.error('저장 실패: ' + error)
        return
      }
      queryClient.invalidateQueries({ queryKey: ['certificates'] })
      toast.success('저장되었습니다')
      setIsEditing(false)
    } catch (err) {
      console.error('Save error:', err)
      toast.error('저장 중 오류가 발생했습니다')
    } finally {
      setIsSaving(false)
    }
  }
  
  if (!certificate) return null

  const isEnglish = certificate.qc_type === '영문'
  const displayData = isEditing ? editData : {
    lot_no: certificate.lot_no || '',
    manufacture_date: certificate.manufacture_date || '',
    manufacture_qty: certificate.manufacture_qty || '',
    requester: certificate.requester || '',
    sample_collection_date: certificate.sample_collection_date || '',
    sample_quantity: certificate.sample_quantity || '',
    sample_collector: certificate.sample_collector || '',
    receiver: certificate.receiver || '',
    test_date: certificate.test_date || '',
    judgment_date: certificate.judgment_date || '',
    tester: certificate.tester || '',
    approver: certificate.approver || '',
    overall_judgment: certificate.overall_judgment || '',
    results: certificate.results || [],
  }
  const results = displayData.results

  const handleDownloadPdf = async () => {
    setIsGenerating(true)
    try {
      const pdfBlob = await generatePdf({
        certificate,
        results,
        qcType: certificate.qc_type || '반제품',
        productName: certificate.product_name || '',
      })
      
      const supabase = createClient()
      const fileName = `${certificate.certificate_no}.pdf`
      const filePath = `certificates/${fileName}`

      const { error: uploadErr } = await supabase.storage
        .from('documents')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        })

      if (uploadErr) {
        console.error('Upload error:', uploadErr)
        toast.error('PDF 업로드 실패: ' + uploadErr.message)
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
      
      queryClient.invalidateQueries({ queryKey: ['certificates'] })
      toast.success('PDF 저장 및 다운로드 완료')
    } catch (error) {
      console.error('PDF generation error:', error)
      toast.error('PDF 생성 실패')
    } finally {
      setIsGenerating(false)
    }
  }

  if (isEnglish) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[760px] max-w-[760px] sm:max-w-[760px] max-h-[95vh] overflow-y-auto p-0 print:max-w-none print:max-h-none print:overflow-visible print:w-auto" showCloseButton={false} aria-describedby={undefined}>
        <div className="sticky top-0 z-10 flex justify-between items-center px-4 py-2 bg-slate-50 border-b print:hidden">
          <DialogTitle className="text-sm font-medium text-slate-700">Certificate Preview</DialogTitle>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="default" size="sm" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Save size={14} className="mr-1" />}
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={cancelEditing} disabled={isSaving}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={startEditing}>
                    <Pencil size={14} className="mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={isGenerating}>
                    {isGenerating ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Download size={14} className="mr-1" />}
                    {isGenerating ? 'Generating...' : 'PDF'}
                  </Button>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X size={14} />
              </Button>
            </div>
          </div>

          <div className="flex justify-center p-2 bg-slate-100 print:p-0 print:bg-white">
            <div 
              className="bg-white shadow-lg print:shadow-none w-full print:w-[210mm]"
              style={{ padding: '32px 24px', minHeight: '900px' }}
            >
              <h1 className="text-xl font-bold text-center mb-12">
                TECHNICAL SPECIFICATIONS
              </h1>
              
              <p className="text-sm text-slate-700 mb-6">
                We Hereby Certify the Following Specifications :
              </p>

              <div className="space-y-2 text-sm mb-6">
                <p>
                  <span className="font-semibold">PRODUCT NAME :</span>{' '}
                  {certificate.product_name || certificate.product_code}
                </p>
                <p>
                  <span className="font-semibold">REFERENCES :</span> {certificate.product_code}
                  <span className="ml-12 font-semibold">LOT :</span> {certificate.lot_no || '—'}
                  <span className="ml-12 font-semibold">DATE :</span> {certificate.test_date}
                </p>
                <p>
                  <span className="font-semibold">Certificate No :</span> {certificate.certificate_no}
                </p>
              </div>

              <table className="w-full text-sm border-collapse mb-8">
                <thead>
                  <tr>
                    <th className="border border-slate-400 px-3 py-2 text-center font-semibold bg-slate-100 w-[28%]">
                      TESTS
                    </th>
                    <th className="border border-slate-400 px-3 py-2 text-center font-semibold bg-slate-100">
                      SPECIFICATIONS
                    </th>
                    <th className="border border-slate-400 px-3 py-2 text-center font-semibold bg-slate-100 w-[28%]">
                      RESULT
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i}>
                      <td className="border border-slate-400 px-3 py-2">{r.test_item}</td>
                      <td className="border border-slate-400 px-3 py-2">{r.specification || '—'}</td>
                      <td className="border border-slate-400 px-3 py-2">{r.result || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex items-center gap-4 text-base mb-16">
                <span className="font-semibold">CONCLUSION :</span>
                <span className={`text-lg font-bold ${certificate.overall_judgment === '적합' ? 'text-green-700' : 'text-red-700'}`}>
                  {certificate.overall_judgment === '적합' ? 'ACCEPTED' : 'REJECTED'}
                </span>
              </div>

              <div className="flex justify-end gap-16 text-sm mt-24">
                <div className="text-center">
                  <p className="mb-6">Prepared by:</p>
                  <div className="border-b border-slate-500 w-32 mb-1"></div>
                  <p className="text-slate-600 min-h-[20px]">{certificate.tester || ''}</p>
                </div>
                <div className="text-center">
                  <p className="mb-6">Approved by:</p>
                  <div className="border-b border-slate-500 w-32 mb-1"></div>
                  <p className="text-slate-600 min-h-[20px]">{certificate.approver || ''}</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[760px] max-w-[760px] sm:max-w-[760px] max-h-[95vh] overflow-y-auto p-0 print:max-w-none print:max-h-none print:overflow-visible print:w-auto" showCloseButton={false} aria-describedby={undefined}>
        <div className="sticky top-0 z-10 flex justify-between items-center px-4 py-2 bg-slate-50 border-b print:hidden">
          <DialogTitle className="text-sm font-medium text-slate-700">성적서 미리보기</DialogTitle>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="default" size="sm" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Save size={14} className="mr-1" />}
                  {isSaving ? '저장 중...' : '저장'}
                </Button>
                <Button variant="outline" size="sm" onClick={cancelEditing} disabled={isSaving}>
                  취소
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={startEditing}>
                  <Pencil size={14} className="mr-1" /> 수정
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={isGenerating}>
                  {isGenerating ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Download size={14} className="mr-1" />}
                  {isGenerating ? '생성 중...' : 'PDF'}
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X size={14} />
            </Button>
          </div>
        </div>

        <div className="flex justify-center p-2 bg-slate-100 print:p-0 print:bg-white">
          <div 
            className="bg-white shadow-lg print:shadow-none w-full print:w-[210mm]"
            style={{ padding: '20px 24px', minHeight: '900px' }}
          >
            {(() => {
              const isHanjaepum = certificate.qc_type === '반제품'
              const title = isHanjaepum ? '반제품 시험의뢰 및 성적서' : '완제품 시험의뢰 및 성적서'
              const deptLabel = isHanjaepum ? '제조부서' : '생산 부서'
              const qtyLabel = isHanjaepum ? '제조량(KG)' : '생산량(EA)'
              const dateLabel = isHanjaepum ? '제조일' : '생산일'
              const locationLabel = isHanjaepum ? '반제품 보관실' : '완제품 보관실'
              const sampleQty = isHanjaepum ? '500 g' : '100ml/3 ea'
              const defaultTeam = isHanjaepum ? '생산 1팀' : '생산 2팀'
              const docNo = isHanjaepum ? 'EVS-F913-02' : 'EVS-F903-01'
              
              return (
                <>
                  <div className="h-[70px] mb-4">
                    <table className="border-collapse text-[11px] float-right" style={{ width: '150px' }}>
                      <tbody>
                        <tr>
                          <th rowSpan={2} className="border border-black px-2 py-1 bg-gray-100 font-bold text-center align-middle" style={{ width: '30px' }}>
                            결<br/>재
                          </th>
                          <th className="border border-black px-2 py-1 bg-gray-100 font-bold text-center" style={{ width: '60px' }}>담당</th>
                          <th className="border border-black px-2 py-1 bg-gray-100 font-bold text-center" style={{ width: '60px' }}>팀장</th>
                        </tr>
                        <tr>
                          <td className="border border-black px-2 text-center" style={{ height: '40px' }}>
                            {isEditing ? (
                              <Input value={displayData.tester} onChange={(e) => handleEditChange('tester', e.target.value)} className="h-5 text-[10px] text-center" />
                            ) : displayData.tester}
                          </td>
                          <td className="border border-black px-2 text-center" style={{ height: '40px' }}>
                            {isEditing ? (
                              <Input value={displayData.approver} onChange={(e) => handleEditChange('approver', e.target.value)} className="h-5 text-[10px] text-center" />
                            ) : displayData.approver}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <h1 className="text-center text-xl font-bold tracking-wider mb-6 underline underline-offset-4">
                    {title}
                  </h1>

                  <table className="w-full border-collapse text-[11px] mb-2">
                    <colgroup>
                      <col style={{ width: '5%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '33%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '38%' }} />
                    </colgroup>
                    <tbody>
                      <tr>
                        <th rowSpan={4} className="border border-black px-1 py-1 bg-gray-100 font-bold text-center align-middle" style={{ writingMode: 'vertical-lr' }}>
                          시험의뢰
                        </th>
                        <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">제품명</th>
                        <td colSpan={3} className="border border-black px-2 py-1.5 text-left">
                          {certificate.product_code} {certificate.product_name || ''}
                        </td>
                      </tr>
                      <tr>
                        <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">LOT NO.</th>
                        <td className="border border-black px-2 py-1.5 text-center">
                          {isEditing ? (
                            <Input value={displayData.lot_no} onChange={(e) => handleEditChange('lot_no', e.target.value)} className="h-5 text-[10px] text-center" />
                          ) : displayData.lot_no}
                        </td>
                        <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">{deptLabel}</th>
                        <td className="border border-black px-2 py-1.5 text-center">{defaultTeam}</td>
                      </tr>
                      <tr>
                        <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">{qtyLabel}</th>
                        <td className="border border-black px-2 py-1.5 text-center">
                          {isEditing ? (
                            <Input value={displayData.manufacture_qty} onChange={(e) => handleEditChange('manufacture_qty', e.target.value)} className="h-5 text-[10px] text-center" />
                          ) : displayData.manufacture_qty}
                        </td>
                        <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">{dateLabel}</th>
                        <td className="border border-black px-2 py-1.5 text-center">
                          {isEditing ? (
                            <Input type="date" value={displayData.manufacture_date} onChange={(e) => handleEditChange('manufacture_date', e.target.value)} className="h-5 text-[10px]" />
                          ) : displayData.manufacture_date}
                        </td>
                      </tr>
                      <tr>
                        <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">의뢰부서</th>
                        <td className="border border-black px-2 py-1.5 text-center">{defaultTeam}</td>
                        <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">의뢰자</th>
                        <td className="border border-black px-2 py-1.5 text-center">
                          {isEditing ? (
                            <Input value={displayData.requester} onChange={(e) => handleEditChange('requester', e.target.value)} className="h-5 text-[10px] text-center" />
                          ) : displayData.requester}
                        </td>
                      </tr>
                      <tr>
                        <th rowSpan={3} className="border border-black px-1 py-1 bg-gray-100 font-bold text-center align-middle" style={{ writingMode: 'vertical-lr' }}>
                          검체정보
                        </th>
                        <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">검체 채취일</th>
                        <td className="border border-black px-2 py-1.5 text-center">
                          {isEditing ? (
                            <Input type="date" value={displayData.sample_collection_date} onChange={(e) => handleEditChange('sample_collection_date', e.target.value)} className="h-5 text-[10px]" />
                          ) : displayData.sample_collection_date || displayData.test_date}
                        </td>
                        <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">검체채취량</th>
                        <td className="border border-black px-2 py-1.5 text-center">
                          {isEditing ? (
                            <Input value={displayData.sample_quantity || sampleQty} onChange={(e) => handleEditChange('sample_quantity', e.target.value)} className="h-5 text-[10px] text-center" />
                          ) : displayData.sample_quantity || sampleQty}
                        </td>
                      </tr>
                      <tr>
                        <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">채취자</th>
                        <td className="border border-black px-2 py-1.5 text-center">
                          {isEditing ? (
                            <Input value={displayData.sample_collector} onChange={(e) => handleEditChange('sample_collector', e.target.value)} className="h-5 text-[10px] text-center" />
                          ) : displayData.sample_collector || displayData.tester}
                        </td>
                        <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">채취 장소</th>
                        <td className="border border-black px-2 py-1.5 text-center">{locationLabel}</td>
                      </tr>
                      <tr>
                        <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">채취 방법</th>
                        <td className="border border-black px-2 py-1.5 text-center">랜덤</td>
                        <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">접수자</th>
                        <td className="border border-black px-2 py-1.5 text-center">
                          {isEditing ? (
                            <Input value={displayData.receiver} onChange={(e) => handleEditChange('receiver', e.target.value)} className="h-5 text-[10px] text-center" />
                          ) : displayData.receiver || displayData.tester}
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
                        <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">시험항목</th>
                        <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">시험기준</th>
                        <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">시험결과</th>
                        <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">시험 일자</th>
                        <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">판정</th>
                        <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">시험자</th>
                        {isEditing && <th className="border border-black px-1 py-2 bg-gray-100"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r, i) => (
                        <tr key={i}>
                          <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">
                            {isEditing ? (
                              <Input value={r.test_item} onChange={(e) => handleResultChange(i, 'test_item', e.target.value)} className="h-5 text-[10px]" />
                            ) : r.test_item}
                          </th>
                          <td className="border border-black px-2 py-1.5 text-center">
                            {isEditing ? (
                              <Input value={r.specification || ''} onChange={(e) => handleResultChange(i, 'specification', e.target.value)} className="h-5 text-[10px]" />
                            ) : r.specification || ''}
                          </td>
                          <td className="border border-black px-2 py-1.5 text-center">
                            {isEditing ? (
                              <Input value={r.result || ''} onChange={(e) => handleResultChange(i, 'result', e.target.value)} className="h-5 text-[10px]" />
                            ) : r.result || ''}
                          </td>
                          <td className="border border-black px-2 py-1.5 text-center">
                            {isEditing ? (
                              <Input type="date" value={r.test_date || displayData.test_date} onChange={(e) => handleResultChange(i, 'test_date', e.target.value)} className="h-5 text-[10px]" />
                            ) : r.test_date || displayData.test_date}
                          </td>
                          <td className={`border border-black px-2 py-1.5 text-center ${r.judgment === '적합' ? 'text-green-700' : 'text-red-700'}`}>
                            {isEditing ? (
                              <Select value={r.judgment} onValueChange={(v) => handleResultChange(i, 'judgment', v)}>
                                <SelectTrigger className="h-5 text-[10px] w-14 mx-auto">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="적합">적합</SelectItem>
                                  <SelectItem value="부적합">부적합</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (r.judgment === '적합' ? '적' : '부')}
                          </td>
                          <td className="border border-black px-2 py-1.5 text-center">
                            {isEditing ? (
                              <Input value={r.tester || ''} onChange={(e) => handleResultChange(i, 'tester', e.target.value)} className="h-5 text-[10px]" />
                            ) : r.tester || displayData.tester}
                          </td>
                          {isEditing && (
                            <td className="border border-black px-1 py-1.5 text-center">
                              <Button variant="ghost" size="sm" onClick={() => removeEditResult(i)} className="h-5 w-5 p-0 text-red-500">
                                <Trash2 size={12} />
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {isEditing && (
                    <div className="mb-2">
                      <Button variant="outline" size="sm" onClick={addEditResult} className="gap-1 text-xs">
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
                        <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">판정일</th>
                        <td className="border border-black px-2 py-1.5 text-center">
                          {isEditing ? (
                            <Input type="date" value={displayData.judgment_date || displayData.test_date} onChange={(e) => handleEditChange('judgment_date', e.target.value)} className="h-5 text-[10px]" />
                          ) : displayData.judgment_date || displayData.test_date}
                        </td>
                        <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">판정자</th>
                        <td className="border border-black px-2 py-1.5 text-center">{displayData.approver}</td>
                      </tr>
                      <tr>
                        <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">판정 결과</th>
                        <td colSpan={3} className={`border border-black px-2 py-1.5 text-center font-bold ${(isEditing ? editData.results.every(r => r.judgment === '적합') : certificate.overall_judgment === '적합') ? 'text-green-700' : 'text-red-700'}`}>
                          {isEditing ? (editData.results.every(r => r.judgment === '적합') ? '적합' : '부적합') : certificate.overall_judgment}
                        </td>
                      </tr>
                      <tr>
                        <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">결과 통지서 접수자</th>
                        <td className="border border-black px-2 py-1.5 text-center"></td>
                        <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">출하승인 접수자</th>
                        <td className="border border-black px-2 py-1.5 text-center"></td>
                      </tr>
                      <tr>
                        <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">비고</th>
                        <td colSpan={3} className="border border-black px-2 py-1.5" style={{ height: '50px' }}></td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="text-[11px] text-gray-500 text-right mt-4">
                    {docNo} (2019.08.13. Rev.0) (주)에바스코스메틱
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface CertificateTableProps {
  certificates: TestCertificate[]
  isLoading: boolean
  qcType: QcType
  sortField: SortField
  sortDir: SortDirection
  onSort: (field: SortField) => void
}

function SortIcon({ field, currentField, currentDir }: { field: SortField; currentField: SortField; currentDir: SortDirection }) {
  if (field !== currentField) {
    return <ChevronsUpDown size={12} className="text-slate-300" />
  }
  return currentDir === 'asc' ? <ChevronUp size={12} className="text-amber-600" /> : <ChevronDown size={12} className="text-amber-600" />
}

function CertificateTable({ certificates, isLoading, qcType, sortField, sortDir, onSort }: CertificateTableProps) {
  const [selectedCertificate, setSelectedCertificate] = useState<TestCertificate | null>(null)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const isEnglish = qcType === '영문'

  return (
    <>
    <CertificateViewModal
      isOpen={!!selectedCertificate}
      onClose={() => setSelectedCertificate(null)}
      certificate={selectedCertificate}
    />
    
    <Dialog open={!!pdfPreviewUrl} onOpenChange={() => setPdfPreviewUrl(null)}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[95vw] h-[95vh] p-0" showCloseButton={false} aria-describedby={undefined}>
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center px-4 py-2 bg-slate-50 border-b">
            <DialogTitle className="text-sm font-medium text-slate-700">
              {isEnglish ? 'PDF Preview' : 'PDF 미리보기'}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={() => setPdfPreviewUrl(null)}>
              <X size={14} />
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            {pdfPreviewUrl && (
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th
              className="px-3 py-2 text-left font-medium text-slate-600 cursor-pointer hover:bg-slate-100 select-none"
              onClick={() => onSort('certificate_no')}
            >
              <span className="inline-flex items-center gap-1">
                {isEnglish ? 'Certificate No' : '성적서번호'}
                <SortIcon field="certificate_no" currentField={sortField} currentDir={sortDir} />
              </span>
            </th>
            <th
              className="px-3 py-2 text-left font-medium text-slate-600 cursor-pointer hover:bg-slate-100 select-none"
              onClick={() => onSort('product_code')}
            >
              <span className="inline-flex items-center gap-1">
                {isEnglish ? 'Product Code' : '제품코드'}
                <SortIcon field="product_code" currentField={sortField} currentDir={sortDir} />
              </span>
            </th>
            <th className="px-3 py-2 text-left font-medium text-slate-600">
              {isEnglish ? 'Product Name' : '제품명'}
            </th>
            <th
              className="px-3 py-2 text-left font-medium text-slate-600 cursor-pointer hover:bg-slate-100 select-none"
              onClick={() => onSort('lot_no')}
            >
              <span className="inline-flex items-center gap-1">
                LOT No
                <SortIcon field="lot_no" currentField={sortField} currentDir={sortDir} />
              </span>
            </th>
            <th
              className="px-3 py-2 text-center font-medium text-slate-600 cursor-pointer hover:bg-slate-100 select-none"
              onClick={() => onSort('test_date')}
            >
              <span className="inline-flex items-center gap-1 justify-center">
                {isEnglish ? 'Test Date' : '시험일'}
                <SortIcon field="test_date" currentField={sortField} currentDir={sortDir} />
              </span>
            </th>
            <th
              className="px-3 py-2 text-center font-medium text-slate-600 cursor-pointer hover:bg-slate-100 select-none"
              onClick={() => onSort('overall_judgment')}
            >
              <span className="inline-flex items-center gap-1 justify-center">
                {isEnglish ? 'Result' : '판정'}
                <SortIcon field="overall_judgment" currentField={sortField} currentDir={sortDir} />
              </span>
            </th>
            <th className="px-3 py-2 text-center font-medium text-slate-600">
              PDF
            </th>
            <th
              className="px-3 py-2 text-center font-medium text-slate-600 cursor-pointer hover:bg-slate-100 select-none"
              onClick={() => onSort('created_at')}
            >
              <span className="inline-flex items-center gap-1 justify-center">
                {isEnglish ? 'Issue Date' : '발급일'}
                <SortIcon field="created_at" currentField={sortField} currentDir={sortDir} />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={8} className="py-12 text-center">
                <Loader2
                  size={20}
                  className="animate-spin text-amber-500 mx-auto"
                />
              </td>
            </tr>
          ) : certificates.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                className="py-12 text-center text-slate-400 text-sm"
              >
                {isEnglish ? 'No certificates issued' : '발급된 성적서가 없습니다'}
              </td>
            </tr>
          ) : (
            certificates.map((cert) => (
              <tr
                key={cert.id}
                className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                onClick={() => setSelectedCertificate(cert)}
              >
                <td className="px-3 py-2 font-mono text-xs text-slate-700">
                  {cert.certificate_no}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-slate-600">
                  {cert.product_code}
                </td>
                <td className="px-3 py-2 text-slate-700">
                  {cert.product_name || '—'}
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {cert.lot_no || '—'}
                </td>
                <td className="px-3 py-2 text-center text-slate-600">
                  {cert.test_date}
                </td>
                <td className="px-3 py-2 text-center">
                  <Badge
                    variant={
                      cert.overall_judgment === '적합'
                        ? 'default'
                        : 'destructive'
                    }
                    className={
                      cert.overall_judgment === '적합'
                        ? 'bg-green-100 text-green-800 hover:bg-green-100'
                        : ''
                    }
                  >
                    {isEnglish
                      ? cert.overall_judgment === '적합'
                        ? 'ACCEPTED'
                        : 'REJECTED'
                      : cert.overall_judgment}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-center">
                  {cert.pdf_url ? (
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setPdfPreviewUrl(cert.pdf_url)
                        }}
                        className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                        title={isEnglish ? 'Preview' : '미리보기'}
                      >
                        <Eye size={14} />
                      </button>
                      <a
                        href={cert.pdf_url}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 text-slate-500 hover:bg-slate-100 rounded"
                        title={isEnglish ? 'Download' : '다운로드'}
                      >
                        <Download size={14} />
                      </a>
                    </div>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center text-xs text-slate-500">
                  {cert.created_at?.slice(0, 10)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
    </>
  )
}

/* ─── Certificate Create Form ─── */

interface CertificateFormProps {
  onComplete: () => void
}

function CertificateForm({ onComplete }: CertificateFormProps) {
  const [step, setStep] = useState(1)
  const [productCode, setProductCode] = useState('')
  const [qcType, setQcType] = useState<QcType>('반제품')
  const [certificateNo, setCertificateNo] = useState('')
  const [lotNo, setLotNo] = useState('')
  const [testDate, setTestDate] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [manufactureDate, setManufactureDate] = useState('')
  const [manufactureQty, setManufactureQty] = useState('')
  const [requester, setRequester] = useState('')
  const [sampleCollectionDate, setSampleCollectionDate] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [sampleQuantity, setSampleQuantity] = useState('')
  const [sampleCollector, setSampleCollector] = useState('')
  const [receiver, setReceiver] = useState('')
  const [judgmentDate, setJudgmentDate] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [tester, setTester] = useState('')
  const [approver, setApprover] = useState('')
  const [results, setResults] = useState<CertificateResult[]>([])
  const [products, setProducts] = useState<
    { product_code: string; korean_name: string | null }[]
  >([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [loadingSpecs, setLoadingSpecs] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Load products on mount
  useEffect(() => {
    setLoadingProducts(true)
    fetchProductsForSelect().then((r) => {
      setProducts(r.products)
      setLoadingProducts(false)
    })
  }, [])

  // Generate certificate number
  useEffect(() => {
    generateCertificateNo().then(setCertificateNo)
  }, [])

  // Load specs template when product and type selected
  const loadTemplate = async () => {
    if (!productCode) {
      toast.error('제품을 선택해주세요')
      return
    }
    setLoadingSpecs(true)
    try {
      const { specs, error } = await fetchQcSpecsTemplate(productCode, qcType)
      if (error) {
        toast.error(error)
        return
      }
      setResults(
        specs.map((s) => {
          const item = s.test_item.trim()
          let defaultResult = 'PASS'
          if (/미생물/.test(item)) defaultResult = '불검출'
          else if (/안정성/.test(item)) defaultResult = '적합'
          return {
            test_item: s.test_item,
            specification: s.specification,
            result: defaultResult,
            judgment: '적합',
            test_date: new Date().toISOString().slice(0, 10),
            tester: '',
          }
        })
      )
      setStep(2)
    } catch {
      toast.error('시험기준 로드 실패')
    } finally {
      setLoadingSpecs(false)
    }
  }

  const overallJudgment = results.every((r) => r.judgment === '적합')
    ? '적합'
    : '부적합'

  const handleResultChange = (
    index: number,
    field: keyof CertificateResult,
    value: string
  ) => {
    setResults((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    )
  }

  const addResult = () => {
    setResults((prev) => [
      ...prev,
      {
        test_item: '',
        specification: '',
        result: '',
        judgment: '적합',
        test_date: new Date().toISOString().slice(0, 10),
        tester: tester,
      },
    ])
  }

  const removeResult = (index: number) => {
    setResults((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (results.some((r) => !r.result)) {
      toast.error('모든 시험 결과를 입력해주세요')
      return
    }

    setSubmitting(true)
    try {
      // 1. Create certificate record
      const { certificate, error } = await createCertificate({
        product_code: productCode,
        qc_type: qcType,
        certificate_no: certificateNo,
        lot_no: lotNo || undefined,
        test_date: testDate,
        manufacture_date: manufactureDate || undefined,
        manufacture_qty: manufactureQty || undefined,
        requester: requester || undefined,
        sample_collection_date: sampleCollectionDate || undefined,
        sample_quantity: sampleQuantity || undefined,
        sample_collector: sampleCollector || undefined,
        receiver: receiver || undefined,
        judgment_date: judgmentDate || undefined,
        tester: tester || undefined,
        approver: approver || undefined,
        overall_judgment: overallJudgment,
        results,
      })

      if (error || !certificate) {
        toast.error(error || '저장 실패')
        return
      }

      toast.success('성적서가 저장되었습니다')

      // 2. Generate PDF (non-blocking — don't prevent Step 3 on failure)
      try {
        const productName =
          products.find((p) => p.product_code === productCode)?.korean_name ?? ''
        const pdfBlob = await generatePdf({
          certificate: { ...certificate, product_name: productName },
          results,
          qcType,
          productName,
        })

        // 3. Upload to Supabase Storage
        const supabase = createClient()
        const fileName = `${certificateNo}.pdf`
        const filePath = `certificates/${fileName}`

        const { error: uploadErr } = await supabase.storage
          .from('documents')
          .upload(filePath, pdfBlob, {
            contentType: 'application/pdf',
            upsert: true,
          })

        if (uploadErr) {
          console.error('Upload error:', uploadErr)
          toast.error('PDF 업로드 실패: ' + uploadErr.message)
        } else {
          const { data: urlData } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath)

          await updateCertificatePdfUrl(certificate.id, urlData.publicUrl)

          const blobUrl = URL.createObjectURL(pdfBlob)
          setPreviewUrl(blobUrl)
          toast.success('PDF 생성 완료')
        }
      } catch (pdfErr) {
        console.error('PDF generation/upload error:', pdfErr)
        toast.error('PDF 생성 실패 (성적서는 저장됨)')
      }

      setStep(3)
    } catch (err) {
      console.error('Submit error:', err)
      toast.error('성적서 발급 중 오류가 발생했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  // Step 1: Select product and type
  if (step === 1) {
    return (
      <div className="px-6 pb-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">제품 선택</label>
            {loadingProducts ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 size={14} className="animate-spin" /> 로딩 중...
              </div>
            ) : (
              <Select value={productCode} onValueChange={setProductCode}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="제품을 선택하세요" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {products.map((p) => (
                    <SelectItem key={p.product_code} value={p.product_code}>
                      {p.korean_name || p.product_code} ({p.product_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">성적서 유형</label>
            <Select value={qcType} onValueChange={(v) => setQcType(v as QcType)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QC_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">성적서 번호</label>
          <Input
            value={certificateNo}
            onChange={(e) => setCertificateNo(e.target.value)}
            className="h-9 font-mono"
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={loadTemplate} disabled={!productCode || loadingSpecs} className="gap-1">
            {loadingSpecs ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            시험기준 불러오기
          </Button>
        </div>
      </div>
    )
  }

  // Step 2: Fill in results (document format matching preview)
  if (step === 2) {
    const productName = products.find((p) => p.product_code === productCode)?.korean_name || ''

    // English document format
    if (qcType === '영문') {
      return (
        <div>
          <div className="flex justify-center p-2 bg-slate-100">
            <div className="bg-white shadow-lg w-full" style={{ padding: '32px 24px', minHeight: '700px' }}>
              <h1 className="text-xl font-bold text-center mb-12">TECHNICAL SPECIFICATIONS</h1>
              <p className="text-sm text-slate-700 mb-6">We Hereby Certify the Following Specifications :</p>

              <div className="space-y-3 text-sm mb-6">
                <div className="flex items-center gap-2">
                  <span className="font-semibold whitespace-nowrap">PRODUCT NAME :</span>
                  <span>{productName || productCode}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">REFERENCES :</span> <span>{productCode}</span>
                  <span className="ml-8 font-semibold">LOT :</span>
                  <Input value={lotNo} onChange={(e) => setLotNo(e.target.value)} className="h-5 text-[10px] w-[120px]" />
                  <span className="ml-8 font-semibold">DATE :</span>
                  <Input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} className="h-5 text-[10px] w-[140px]" />
                </div>
                <p><span className="font-semibold">Certificate No :</span> {certificateNo}</p>
              </div>

              <table className="w-full text-sm border-collapse mb-4">
                <thead>
                  <tr>
                    <th className="border border-slate-400 px-3 py-2 text-center font-semibold bg-slate-100 w-[28%]">TESTS</th>
                    <th className="border border-slate-400 px-3 py-2 text-center font-semibold bg-slate-100">SPECIFICATIONS</th>
                    <th className="border border-slate-400 px-3 py-2 text-center font-semibold bg-slate-100 w-[28%]">RESULT</th>
                    <th className="border border-slate-400 px-1 py-2 bg-slate-100 w-[32px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i}>
                      <td className="border border-slate-400 px-2 py-1.5">
                        <Input value={r.test_item} onChange={(e) => handleResultChange(i, 'test_item', e.target.value)} className="h-5 text-[10px]" />
                      </td>
                      <td className="border border-slate-400 px-2 py-1.5">
                        <Input value={r.specification || ''} onChange={(e) => handleResultChange(i, 'specification', e.target.value)} className="h-5 text-[10px]" />
                      </td>
                      <td className="border border-slate-400 px-2 py-1.5">
                        <Input value={r.result || ''} onChange={(e) => handleResultChange(i, 'result', e.target.value)} className="h-5 text-[10px]" />
                      </td>
                      <td className="border border-slate-400 px-1 py-1.5 text-center">
                        <Button variant="ghost" size="sm" onClick={() => removeResult(i)} className="h-5 w-5 p-0 text-red-500"><Trash2 size={12} /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mb-6">
                <Button variant="outline" size="sm" onClick={addResult} className="gap-1 text-xs">
                  <Plus size={12} /> Add Test Item
                </Button>
              </div>

              <div className="flex items-center gap-4 text-base mb-12">
                <span className="font-semibold">CONCLUSION :</span>
                <span className={`text-lg font-bold ${overallJudgment === '적합' ? 'text-green-700' : 'text-red-700'}`}>
                  {overallJudgment === '적합' ? 'ACCEPTED' : 'REJECTED'}
                </span>
              </div>

              <div className="flex justify-end gap-16 text-sm mt-12">
                <div className="text-center">
                  <p className="mb-2">Prepared by:</p>
                  <Input value={tester} onChange={(e) => setTester(e.target.value)} className="h-5 text-[10px] text-center w-32" placeholder="Name" />
                </div>
                <div className="text-center">
                  <p className="mb-2">Approved by:</p>
                  <Input value={approver} onChange={(e) => setApprover(e.target.value)} className="h-5 text-[10px] text-center w-32" placeholder="Name" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-between p-4">
            <Button variant="outline" onClick={() => setStep(1)}>← 이전</Button>
            <Button onClick={handleSubmit} disabled={submitting || results.length === 0} className="gap-1 bg-amber-500 hover:bg-amber-600">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              저장 및 PDF 발급
            </Button>
          </div>
        </div>
      )
    }

    // Korean document format (반제품/완제품)
    const isHanjaepum = qcType === '반제품'
    const title = isHanjaepum ? '반제품 시험의뢰 및 성적서' : '완제품 시험의뢰 및 성적서'
    const deptLabel = isHanjaepum ? '제조부서' : '생산 부서'
    const qtyLabel = isHanjaepum ? '제조량(KG)' : '생산량(EA)'
    const dateLabel = isHanjaepum ? '제조일' : '생산일'
    const locationLabel = isHanjaepum ? '반제품 보관실' : '완제품 보관실'
    const sampleQtyDefault = isHanjaepum ? '500 g' : '100ml/3 ea'
    const defaultTeam = isHanjaepum ? '생산 1팀' : '생산 2팀'
    const docNo = isHanjaepum ? 'EVS-F913-02' : 'EVS-F903-01'

    return (
      <div>
        <div className="flex justify-center p-2 bg-slate-100">
          <div className="bg-white shadow-lg w-full" style={{ padding: '20px 24px', minHeight: '700px' }}>

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
                      <Input value={tester} onChange={(e) => setTester(e.target.value)} className="h-5 text-[10px] text-center" />
                    </td>
                    <td className="border border-black px-2 text-center" style={{ height: '40px' }}>
                      <Input value={approver} onChange={(e) => setApprover(e.target.value)} className="h-5 text-[10px] text-center" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Title */}
            <h1 className="text-center text-xl font-bold tracking-wider mb-6 underline underline-offset-4">{title}</h1>

            {/* 시험의뢰 + 검체정보 */}
            <table className="w-full border-collapse text-[11px] mb-2">
              <colgroup>
                <col style={{ width: '5%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '33%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '38%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <th rowSpan={4} className="border border-black px-1 py-1 bg-gray-100 font-bold text-center align-middle" style={{ writingMode: 'vertical-lr' }}>시험의뢰</th>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">제품명</th>
                  <td colSpan={3} className="border border-black px-2 py-1.5 text-left">{productCode} {productName}</td>
                </tr>
                <tr>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">LOT NO.</th>
                  <td className="border border-black px-2 py-1.5 text-center">
                    <Input value={lotNo} onChange={(e) => setLotNo(e.target.value)} className="h-5 text-[10px] text-center" />
                  </td>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">{deptLabel}</th>
                  <td className="border border-black px-2 py-1.5 text-center">{defaultTeam}</td>
                </tr>
                <tr>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">{qtyLabel}</th>
                  <td className="border border-black px-2 py-1.5 text-center">
                    <Input value={manufactureQty} onChange={(e) => setManufactureQty(e.target.value)} className="h-5 text-[10px] text-center" />
                  </td>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">{dateLabel}</th>
                  <td className="border border-black px-2 py-1.5 text-center">
                    <Input type="date" value={manufactureDate} onChange={(e) => setManufactureDate(e.target.value)} className="h-5 text-[10px]" />
                  </td>
                </tr>
                <tr>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">의뢰부서</th>
                  <td className="border border-black px-2 py-1.5 text-center">{defaultTeam}</td>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">의뢰자</th>
                  <td className="border border-black px-2 py-1.5 text-center">
                    <Input value={requester} onChange={(e) => setRequester(e.target.value)} className="h-5 text-[10px] text-center" />
                  </td>
                </tr>
                <tr>
                  <th rowSpan={3} className="border border-black px-1 py-1 bg-gray-100 font-bold text-center align-middle" style={{ writingMode: 'vertical-lr' }}>검체정보</th>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">검체 채취일</th>
                  <td className="border border-black px-2 py-1.5 text-center">
                    <Input type="date" value={sampleCollectionDate} onChange={(e) => setSampleCollectionDate(e.target.value)} className="h-5 text-[10px]" />
                  </td>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">검체채취량</th>
                  <td className="border border-black px-2 py-1.5 text-center">
                    <Input value={sampleQuantity || sampleQtyDefault} onChange={(e) => setSampleQuantity(e.target.value)} className="h-5 text-[10px] text-center" />
                  </td>
                </tr>
                <tr>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">채취자</th>
                  <td className="border border-black px-2 py-1.5 text-center">
                    <Input value={sampleCollector} onChange={(e) => setSampleCollector(e.target.value)} className="h-5 text-[10px] text-center" />
                  </td>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">채취 장소</th>
                  <td className="border border-black px-2 py-1.5 text-center">{locationLabel}</td>
                </tr>
                <tr>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">채취 방법</th>
                  <td className="border border-black px-2 py-1.5 text-center">랜덤</td>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">접수자</th>
                  <td className="border border-black px-2 py-1.5 text-center">
                    <Input value={receiver} onChange={(e) => setReceiver(e.target.value)} className="h-5 text-[10px] text-center" />
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Results table */}
            <table className="w-full border-collapse text-[11px] mt-4 mb-2">
              <colgroup>
                <col style={{ width: '13%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '5%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">시험항목</th>
                  <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">시험기준</th>
                  <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">시험결과</th>
                  <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">시험 일자</th>
                  <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">판정</th>
                  <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">시험자</th>
                  <th className="border border-black px-1 py-2 bg-gray-100"></th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">
                      <Input value={r.test_item} onChange={(e) => handleResultChange(i, 'test_item', e.target.value)} className="h-5 text-[10px]" />
                    </th>
                    <td className="border border-black px-2 py-1.5 text-center">
                      <Input value={r.specification || ''} onChange={(e) => handleResultChange(i, 'specification', e.target.value)} className="h-5 text-[10px]" />
                    </td>
                    <td className="border border-black px-2 py-1.5 text-center">
                      <Input value={r.result || ''} onChange={(e) => handleResultChange(i, 'result', e.target.value)} className="h-5 text-[10px]" />
                    </td>
                    <td className="border border-black px-2 py-1.5 text-center">
                      <Input type="date" value={r.test_date || testDate} onChange={(e) => handleResultChange(i, 'test_date', e.target.value)} className="h-5 text-[10px]" />
                    </td>
                    <td className="border border-black px-2 py-1.5 text-center">
                      <Select value={r.judgment} onValueChange={(v) => handleResultChange(i, 'judgment', v)}>
                        <SelectTrigger className="h-5 text-[10px] w-14 mx-auto"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="적합">적합</SelectItem>
                          <SelectItem value="부적합">부적합</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="border border-black px-2 py-1.5 text-center">
                      <Input value={r.tester || ''} onChange={(e) => handleResultChange(i, 'tester', e.target.value)} className="h-5 text-[10px]" />
                    </td>
                    <td className="border border-black px-1 py-1.5 text-center">
                      <Button variant="ghost" size="sm" onClick={() => removeResult(i)} className="h-5 w-5 p-0 text-red-500"><Trash2 size={12} /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mb-2">
              <Button variant="outline" size="sm" onClick={addResult} className="gap-1 text-xs">
                <Plus size={12} /> 시험항목 추가
              </Button>
            </div>

            {/* 판정 table */}
            <table className="w-full border-collapse text-[11px] mt-4">
              <colgroup>
                <col style={{ width: '15%' }} />
                <col style={{ width: '35%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '35%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">판정일</th>
                  <td className="border border-black px-2 py-1.5 text-center">
                    <Input type="date" value={judgmentDate} onChange={(e) => setJudgmentDate(e.target.value)} className="h-5 text-[10px]" />
                  </td>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">판정자</th>
                  <td className="border border-black px-2 py-1.5 text-center">{approver}</td>
                </tr>
                <tr>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">판정 결과</th>
                  <td colSpan={3} className={`border border-black px-2 py-1.5 text-center font-bold ${overallJudgment === '적합' ? 'text-green-700' : 'text-red-700'}`}>
                    {overallJudgment}
                  </td>
                </tr>
                <tr>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">결과 통지서 접수자</th>
                  <td className="border border-black px-2 py-1.5 text-center"></td>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center whitespace-nowrap">출하승인 접수자</th>
                  <td className="border border-black px-2 py-1.5 text-center"></td>
                </tr>
                <tr>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">비고</th>
                  <td colSpan={3} className="border border-black px-2 py-1.5" style={{ height: '50px' }}></td>
                </tr>
              </tbody>
            </table>

            <div className="text-[11px] text-gray-500 text-right mt-4">
              {docNo} (2019.08.13. Rev.0) (주)에바스코스메틱
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-between p-4">
          <Button variant="outline" onClick={() => setStep(1)}>← 이전</Button>
          <Button onClick={handleSubmit} disabled={submitting || results.length === 0} className="gap-1 bg-amber-500 hover:bg-amber-600">
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            저장 및 PDF 발급
          </Button>
        </div>
      </div>
    )
  }

  // Step 3: Done + Preview
  return (
    <div className="px-6 pb-6 space-y-4">
      <div className="text-center py-4">
        <div className="text-green-600 text-lg font-bold mb-2">
          ✓ 성적서가 발급되었습니다
        </div>
        <p className="text-sm text-slate-500">
          {certificateNo} · {qcType}
        </p>
      </div>

      {previewUrl && (
        <div className="border rounded-lg overflow-hidden">
          <iframe
            src={previewUrl}
            title="PDF Preview"
            className="w-full h-[500px]"
          />
        </div>
      )}

      <div className="flex justify-center gap-2 pt-2">
        {previewUrl && (
          <Button variant="outline" asChild>
            <a href={previewUrl} download={`${certificateNo}.pdf`}>
              <Download size={14} className="mr-1" /> PDF 다운로드
            </a>
          </Button>
        )}
        <Button onClick={onComplete}>닫기</Button>
      </div>
    </div>
  )
}

/* ─── PDF Generation ─── */

async function generatePdf({
  certificate,
  results,
  qcType,
  productName,
}: {
  certificate: TestCertificate
  results: CertificateResult[]
  qcType: string
  productName: string
}): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  await loadKoreanFont(doc)
  doc.setFont('NanumGothic', 'normal')

  const pageWidth = doc.internal.pageSize.getWidth()

  if (qcType === '영문') {
    // English layout
    doc.setFontSize(16)
    doc.text('TECHNICAL SPECIFICATIONS', pageWidth / 2, 25, {
      align: 'center',
    })

    doc.setFontSize(9)
    doc.text(
      'We Hereby Certify the Following Specifications :',
      14,
      38
    )

    doc.setFontSize(10)
    doc.text(`PRODUCT NAME : ${productName || certificate.product_code}`, 14, 48)
    doc.text(
      `REFERENCES : ${certificate.product_code}    LOT : ${certificate.lot_no || '—'}    DATE : ${certificate.test_date}`,
      14,
      55
    )
    doc.text(
      `Certificate No : ${certificate.certificate_no}`,
      14,
      62
    )

    autoTable(doc, {
      startY: 70,
      head: [['TESTS', 'SPECIFICATIONS', 'RESULT']],
      body: results.map((r) => [r.test_item, r.specification || '—', r.result || '—']),
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3, font: 'NanumGothic', textColor: [0, 0, 0] },
      headStyles: {
        fillColor: [238, 238, 238],
        textColor: [0, 0, 0],
        fontStyle: 'normal',
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 50 },
      },
    })

    const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 150

    doc.setFontSize(12)
    doc.text('CONCLUSION', 14, finalY + 15)
    doc.setFontSize(14)
    doc.text(
      certificate.overall_judgment === '적합' ? 'ACCEPTED' : 'REJECTED',
      60,
      finalY + 15
    )

    doc.setFontSize(9)
    doc.text('Prepared by: ________________', pageWidth - 90, finalY + 35)
    doc.text('Approved by: ________________', pageWidth - 90, finalY + 45)
    if (certificate.tester) doc.text(certificate.tester, pageWidth - 50, finalY + 35, { align: 'center' })
    if (certificate.approver) doc.text(certificate.approver, pageWidth - 50, finalY + 45, { align: 'center' })
  } else {
    const isHanjaepum = qcType === '반제품'
    const title = isHanjaepum ? '반제품 시험의뢰 및 성적서' : '완제품 시험의뢰 및 성적서'
    const deptLabel = isHanjaepum ? '제조부서' : '생산 부서'
    const qtyLabel = isHanjaepum ? '제조량(KG)' : '생산량(EA)'
    const dateLabel = isHanjaepum ? '제조일' : '생산일'
    const locationLabel = isHanjaepum ? '반제품 보관실' : '완제품 보관실'
    const sampleQty = isHanjaepum ? '500 g' : '100ml/3 ea'
    const defaultTeam = isHanjaepum ? '생산 1팀' : '생산 2팀'
    const docNo = isHanjaepum ? 'EVS-F913-02' : 'EVS-F903-01'

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
          { content: '시\n험\n의\n뢰', rowSpan: 4, styles: { fillColor: [245, 245, 245], halign: 'center', valign: 'middle', fontStyle: 'bold', cellWidth: 9 } },
          { content: '제품명', styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold', cellWidth: 20 } },
          { content: `${certificate.product_code} ${productName || ''}`, colSpan: 3, styles: { halign: 'left' } },
        ],
        [
          { content: 'LOT NO.', styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' } },
          { content: certificate.lot_no || '', styles: { halign: 'center' } },
          { content: deptLabel, styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' } },
          { content: defaultTeam, styles: { halign: 'center' } },
        ],
        [
          { content: qtyLabel, styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' } },
          { content: '', styles: { halign: 'center' } },
          { content: dateLabel, styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' } },
          { content: certificate.manufacture_date || '', styles: { halign: 'center' } },
        ],
        [
          { content: '의뢰부서', styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' } },
          { content: defaultTeam, styles: { halign: 'center' } },
          { content: '의뢰자', styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' } },
          { content: '', styles: { halign: 'center' } },
        ],
        [
          { content: '검\n체\n정\n보', rowSpan: 3, styles: { fillColor: [245, 245, 245], halign: 'center', valign: 'middle', fontStyle: 'bold', cellWidth: 9 } },
          { content: '검체 채취일', styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' } },
          { content: certificate.test_date || '', styles: { halign: 'center' } },
          { content: '검체채취량', styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' } },
          { content: sampleQty, styles: { halign: 'center' } },
        ],
        [
          { content: '채취자', styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' } },
          { content: certificate.tester || '', styles: { halign: 'center' } },
          { content: '채취 장소', styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' } },
          { content: locationLabel, styles: { halign: 'center' } },
        ],
        [
          { content: '채취 방법', styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' } },
          { content: '랜덤', styles: { halign: 'center' } },
          { content: '접수자', styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' } },
          { content: certificate.tester || '', styles: { halign: 'center' } },
        ],
      ],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, font: 'NanumGothic', textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1 },
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? y + 10

    y += 3
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['시험항목', '시험기준', '시험결과', '시험 일자', '판정', '시험자']],
      body: results.map((r) => [
        r.test_item,
        r.specification || '',
        r.result || '',
        certificate.test_date || '',
        '적/부',
        certificate.tester || '',
      ]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, font: 'NanumGothic', textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1 },
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
          { content: '판정일', styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' } },
          { content: certificate.test_date || '', styles: { halign: 'center' } },
          { content: '판정자', styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' } },
          { content: certificate.approver || '', styles: { halign: 'center' } },
        ],
        [
          { content: '판정 결과', styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' } },
          { content: certificate.overall_judgment, colSpan: 3, styles: { halign: 'center', fontStyle: 'bold' } },
        ],
        [
          { content: '결과 통지서 접수자', styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' } },
          { content: '', styles: { halign: 'center' } },
          { content: '출하승인 접수자', styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' } },
          { content: '', styles: { halign: 'center' } },
        ],
        [
          { content: '비고', styles: { fillColor: [245, 245, 245], halign: 'center', fontStyle: 'bold' } },
          { content: '', colSpan: 3, styles: { halign: 'center', minCellHeight: 12 } },
        ],
      ],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, font: 'NanumGothic', textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1 },
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? y + 10

    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(`${docNo} (2019.08.13. Rev.0) (주)에바스코스메틱`, pageWidth - margin, y + 6, { align: 'right' })
    doc.setTextColor(0, 0, 0)
  }

  return doc.output('blob')
}
