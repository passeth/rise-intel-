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
  type CertificateResultsRow,
  type PetCertificateResult,
  type StabilityCertificateResult,
  type MltCertificateResult,
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
import { Loader2, Plus, Download, FileText, Search, Eye, X, Pencil, Save, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Trash2 } from 'lucide-react'

const QC_TYPES = ['반제품', '완제품', '영문', 'pet', 'stability', 'mlt'] as const
type QcType = (typeof QC_TYPES)[number]

const BASIC_QC_TYPES = ['반제품', '완제품', '영문'] as const

const QC_TYPE_LABEL: Record<QcType, string> = {
  반제품: '반제품',
  완제품: '완제품',
  영문: '영문',
  pet: 'PET',
  stability: 'Stability',
  mlt: 'MLT',
}

const PAGE_SIZE = 50

function isBasicQcType(qcType: string): qcType is (typeof BASIC_QC_TYPES)[number] {
  return BASIC_QC_TYPES.includes(qcType as (typeof BASIC_QC_TYPES)[number])
}

function isPetQcType(qcType: string): qcType is 'pet' {
  return qcType === 'pet'
}

function isStabilityQcType(qcType: string): qcType is 'stability' {
  return qcType === 'stability'
}

function isMltQcType(qcType: string): qcType is 'mlt' {
  return qcType === 'mlt'
}

function createPetDefaultRows(): PetCertificateResult[] {
  return [
    {
      organism: 'S. aureus',
      atcc: 'ATCC 6538',
      initial_count: '',
      log_reduction_d7: '',
      log_reduction_d14: '',
      log_reduction_d28: '',
      conclusion: '',
    },
    {
      organism: 'P. aeruginosa',
      atcc: 'ATCC 9027',
      initial_count: '',
      log_reduction_d7: '',
      log_reduction_d14: '',
      log_reduction_d28: '',
      conclusion: '',
    },
    {
      organism: 'E. coli',
      atcc: 'ATCC 8739',
      initial_count: '',
      log_reduction_d7: '',
      log_reduction_d14: '',
      log_reduction_d28: '',
      conclusion: '',
    },
    {
      organism: 'C. albicans',
      atcc: 'ATCC 10231',
      initial_count: '',
      log_reduction_d7: '',
      log_reduction_d14: '',
      log_reduction_d28: '',
      conclusion: '',
    },
    {
      organism: 'A. brasiliensis',
      atcc: 'ATCC 16404',
      initial_count: '',
      log_reduction_d7: '',
      log_reduction_d14: '',
      log_reduction_d28: '',
      conclusion: '',
    },
  ]
}

function createStabilityDefaultRows(): StabilityCertificateResult[] {
  const temperatures = ['4°C', '25°C / 60% RH', '45°C / 75% RH']
  const parameters = ['Appearance', 'Color', 'Odour', 'pH', 'Viscosity']
  return temperatures.flatMap((temperature) =>
    parameters.map((parameter) => ({
      parameter,
      temperature,
      day_0: '',
      day_14: '',
      month_1: '',
      month_2: '',
      month_3: '',
    }))
  )
}

function createMltDefaultRows(): MltCertificateResult[] {
  return [
    {
      test_item: 'Total Aerobic Microbial Count',
      specification: '<= 1,000 CFU/g(ml)',
      result: '',
    },
    {
      test_item: 'Total Combined Yeasts & Molds Count',
      specification: '<= 100 CFU/g(ml)',
      result: '',
    },
    {
      test_item: 'Escherichia coli',
      specification: 'Not Detected in 1g(ml)',
      result: '',
    },
    {
      test_item: 'Pseudomonas aeruginosa',
      specification: 'Not Detected in 1g(ml)',
      result: '',
    },
    {
      test_item: 'Staphylococcus aureus',
      specification: 'Not Detected in 1g(ml)',
      result: '',
    },
    {
      test_item: 'Candida albicans',
      specification: 'Not Detected in 1g(ml)',
      result: '',
    },
  ]
}

type CertificateNotesMetadata = {
  lab_no?: string
  criteria?: string
  test_start_date?: string
  test_end_date?: string
  method?: string
  specifications?: string
}

function parseCertificateNotes(notes: string | null | undefined): CertificateNotesMetadata {
  if (!notes) {
    return {}
  }
  try {
    const parsed: unknown = JSON.parse(notes)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }
    const safe = parsed as Record<string, unknown>
    const read = (key: string) =>
      typeof safe[key] === 'string' && safe[key]?.trim() ? safe[key].trim() : undefined
    return {
      lab_no: read('lab_no'),
      criteria: read('criteria'),
      test_start_date: read('test_start_date'),
      test_end_date: read('test_end_date'),
      method: read('method'),
      specifications: read('specifications'),
    }
  } catch {
    return {}
  }
}

function buildCertificateNotes(
  qcType: QcType,
  metadata: CertificateNotesMetadata
): string | undefined {
  if (isBasicQcType(qcType)) {
    return undefined
  }

  const notes: CertificateNotesMetadata = {}

  if (isPetQcType(qcType)) {
    if (metadata.lab_no) notes.lab_no = metadata.lab_no
    if (metadata.criteria) notes.criteria = metadata.criteria
    if (metadata.test_start_date) notes.test_start_date = metadata.test_start_date
    if (metadata.test_end_date) notes.test_end_date = metadata.test_end_date
  }

  if (isStabilityQcType(qcType)) {
    if (metadata.specifications) notes.specifications = metadata.specifications
  }

  if (isMltQcType(qcType)) {
    if (metadata.method) notes.method = metadata.method
    if (metadata.test_start_date) notes.test_start_date = metadata.test_start_date
    if (metadata.test_end_date) notes.test_end_date = metadata.test_end_date
  }

  if (Object.keys(notes).length === 0) {
    return undefined
  }
  return JSON.stringify(notes)
}

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
            <TabsTrigger value="pet" className="text-sm px-4">
              PET
            </TabsTrigger>
            <TabsTrigger value="stability" className="text-sm px-4">
              Stability
            </TabsTrigger>
            <TabsTrigger value="mlt" className="text-sm px-4">
              MLT
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
    lab_no: '',
    criteria: 'A',
    test_start_date: '',
    test_end_date: '',
    method: '',
    specifications: '',
    results: [] as CertificateResultsRow[],
  })

  const startEditing = () => {
    if (certificate) {
      const notesMetadata = parseCertificateNotes(certificate.notes)
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
        lab_no: notesMetadata.lab_no || '',
        criteria: notesMetadata.criteria || 'A',
        test_start_date: notesMetadata.test_start_date || '',
        test_end_date: notesMetadata.test_end_date || '',
        method: notesMetadata.method || '',
        specifications: notesMetadata.specifications || '',
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

  const handleResultChange = (index: number, field: string, value: string) => {
    setEditData(prev => ({
      ...prev,
      results: prev.results.map((r, i) => i === index ? { ...r, [field]: value } : r)
    }))
  }

  const addEditResult = () => {
    if (certificate?.qc_type === 'pet') {
      setEditData((prev) => ({
        ...prev,
        results: [
          ...prev.results,
          {
            organism: '',
            atcc: '',
            initial_count: '',
            log_reduction_d7: '',
            log_reduction_d14: '',
            log_reduction_d28: '',
            conclusion: '',
          },
        ],
      }))
      return
    }

    if (certificate?.qc_type === 'stability') {
      setEditData((prev) => ({
        ...prev,
        results: [
          ...prev.results,
          {
            parameter: '',
            temperature: '',
            day_0: '',
            day_14: '',
            month_1: '',
            month_2: '',
            month_3: '',
          },
        ],
      }))
      return
    }

    if (certificate?.qc_type === 'mlt') {
      setEditData((prev) => ({
        ...prev,
        results: [
          ...prev.results,
          {
            test_item: '',
            specification: '',
            result: '',
          },
        ],
      }))
      return
    }

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
      const overallJudgment = isBasicType
        ? (editData.results as CertificateResult[]).every((r) => r.judgment === '적합')
          ? '적합'
          : '부적합'
        : (editData.overall_judgment || '적합')
      const { success: _success, error } = await updateCertificate(certificate.id, {
        ...editData,
        overall_judgment: overallJudgment,
        notes: buildCertificateNotes(certificate.qc_type as QcType, {
          lab_no: editData.lab_no,
          criteria: editData.criteria,
          test_start_date: editData.test_start_date,
          test_end_date: editData.test_end_date,
          method: editData.method,
          specifications: editData.specifications,
        }),
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

  const isBasicType = isBasicQcType(certificate.qc_type)
  const isEnglish = certificate.qc_type === '영문'
  const isPet = isPetQcType(certificate.qc_type)
  const isStability = isStabilityQcType(certificate.qc_type)
  const isMlt = isMltQcType(certificate.qc_type)
  const notesMetadata = parseCertificateNotes(certificate.notes)
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
    lab_no: notesMetadata.lab_no || '',
    criteria: notesMetadata.criteria || 'A',
    test_start_date: notesMetadata.test_start_date || '',
    test_end_date: notesMetadata.test_end_date || '',
    method: notesMetadata.method || '',
    specifications: notesMetadata.specifications || '',
    results: certificate.results || [],
  }
  const results = displayData.results
  const standardResults = results as CertificateResult[]
  const petResults = results as PetCertificateResult[]
  const stabilityResults = results as StabilityCertificateResult[]
  const mltResults = results as MltCertificateResult[]

  const handleDownloadPdf = async () => {
    if (!isBasicType) {
      toast.info('PET/Stability/MLT는 PDF 자동 발급 대상이 아닙니다')
      return
    }
    setIsGenerating(true)
    try {
      const pdfBlob = await generatePdf({
        certificate,
        results: standardResults,
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

  if (!isBasicType) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[900px] max-w-[95vw] max-h-[95vh] overflow-y-auto p-0" showCloseButton={false} aria-describedby={undefined}>
          <div className="sticky top-0 z-10 flex justify-between items-center px-4 py-2 bg-slate-50 border-b">
            <DialogTitle className="text-sm font-medium text-slate-700">{QC_TYPE_LABEL[certificate.qc_type as QcType]} 성적 데이터</DialogTitle>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="default" size="sm" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Save size={14} className="mr-1" />}
                    {isSaving ? '저장 중...' : '저장'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={cancelEditing} disabled={isSaving}>취소</Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={startEditing}>
                  <Pencil size={14} className="mr-1" /> 수정
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}><X size={14} /></Button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div><span className="text-slate-500">제품</span><p className="font-medium">{certificate.product_name || certificate.product_code}</p></div>
              <div><span className="text-slate-500">LOT</span><p className="font-medium">{displayData.lot_no || '—'}</p></div>
              <div><span className="text-slate-500">시험일</span><p className="font-medium">{displayData.test_date || '—'}</p></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {isPet && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Lab No.</label>
                    {isEditing ? (
                      <Input value={displayData.lab_no} onChange={(e) => handleEditChange('lab_no', e.target.value)} className="h-8" />
                    ) : (
                      <p className="text-sm border rounded-md h-8 px-3 flex items-center">{displayData.lab_no || '—'}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Criteria</label>
                    {isEditing ? (
                      <Select value={displayData.criteria || 'A'} onValueChange={(v) => handleEditChange('criteria', v)}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm border rounded-md h-8 px-3 flex items-center">{displayData.criteria || 'A'}</p>
                    )}
                  </div>
                </>
              )}

              {(isPet || isMlt) && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">시험 시작일</label>
                    {isEditing ? (
                      <Input type="date" value={displayData.test_start_date} onChange={(e) => handleEditChange('test_start_date', e.target.value)} className="h-8" />
                    ) : (
                      <p className="text-sm border rounded-md h-8 px-3 flex items-center">{displayData.test_start_date || '—'}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">시험 종료일</label>
                    {isEditing ? (
                      <Input type="date" value={displayData.test_end_date} onChange={(e) => handleEditChange('test_end_date', e.target.value)} className="h-8" />
                    ) : (
                      <p className="text-sm border rounded-md h-8 px-3 flex items-center">{displayData.test_end_date || '—'}</p>
                    )}
                  </div>
                </>
              )}

              {isMlt && (
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-medium text-slate-600">시험 방법(Method)</label>
                  {isEditing ? (
                    <Input value={displayData.method} onChange={(e) => handleEditChange('method', e.target.value)} className="h-8" />
                  ) : (
                    <p className="text-sm border rounded-md h-8 px-3 flex items-center">{displayData.method || '—'}</p>
                  )}
                </div>
              )}

              {isStability && (
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-medium text-slate-600">기타 규격 메모</label>
                  {isEditing ? (
                    <Input value={displayData.specifications} onChange={(e) => handleEditChange('specifications', e.target.value)} className="h-8" />
                  ) : (
                    <p className="text-sm border rounded-md h-8 px-3 flex items-center">{displayData.specifications || '—'}</p>
                  )}
                </div>
              )}
            </div>

            {isPet && (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="border px-2 py-2 bg-slate-50">시험균주</th><th className="border px-2 py-2 bg-slate-50">ATCC</th><th className="border px-2 py-2 bg-slate-50">초기균수</th><th className="border px-2 py-2 bg-slate-50">D7</th><th className="border px-2 py-2 bg-slate-50">D14</th><th className="border px-2 py-2 bg-slate-50">D28</th><th className="border px-2 py-2 bg-slate-50">결론</th>{isEditing && <th className="border px-2 py-2 bg-slate-50 w-8"></th>}
                  </tr>
                </thead>
                <tbody>
                  {petResults.map((row, i) => (
                    <tr key={i}>
                      <td className="border p-1">{isEditing ? <Input value={row.organism} onChange={(e) => handleResultChange(i, 'organism', e.target.value)} className="h-7 text-xs" /> : row.organism || '—'}</td>
                      <td className="border p-1">{isEditing ? <Input value={row.atcc} onChange={(e) => handleResultChange(i, 'atcc', e.target.value)} className="h-7 text-xs" /> : row.atcc || '—'}</td>
                      <td className="border p-1">{isEditing ? <Input value={row.initial_count} onChange={(e) => handleResultChange(i, 'initial_count', e.target.value)} className="h-7 text-xs" /> : row.initial_count || '—'}</td>
                      <td className="border p-1">{isEditing ? <Input value={row.log_reduction_d7} onChange={(e) => handleResultChange(i, 'log_reduction_d7', e.target.value)} className="h-7 text-xs" /> : row.log_reduction_d7 || '—'}</td>
                      <td className="border p-1">{isEditing ? <Input value={row.log_reduction_d14} onChange={(e) => handleResultChange(i, 'log_reduction_d14', e.target.value)} className="h-7 text-xs" /> : row.log_reduction_d14 || '—'}</td>
                      <td className="border p-1">{isEditing ? <Input value={row.log_reduction_d28} onChange={(e) => handleResultChange(i, 'log_reduction_d28', e.target.value)} className="h-7 text-xs" /> : row.log_reduction_d28 || '—'}</td>
                      <td className="border p-1">{isEditing ? <Input value={row.conclusion} onChange={(e) => handleResultChange(i, 'conclusion', e.target.value)} className="h-7 text-xs" /> : row.conclusion || '—'}</td>
                      {isEditing && <td className="border p-1 text-center"><Button variant="ghost" size="sm" onClick={() => removeEditResult(i)} className="h-6 w-6 p-0 text-red-500"><Trash2 size={12} /></Button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {isStability && (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="border px-2 py-2 bg-slate-50">시험항목</th><th className="border px-2 py-2 bg-slate-50">보관조건</th><th className="border px-2 py-2 bg-slate-50">Day 0</th><th className="border px-2 py-2 bg-slate-50">Day 14</th><th className="border px-2 py-2 bg-slate-50">1개월</th><th className="border px-2 py-2 bg-slate-50">2개월</th><th className="border px-2 py-2 bg-slate-50">3개월</th>{isEditing && <th className="border px-2 py-2 bg-slate-50 w-8"></th>}
                  </tr>
                </thead>
                <tbody>
                  {stabilityResults.map((row, i) => (
                    <tr key={i}>
                      <td className="border p-1">{isEditing ? <Input value={row.parameter} onChange={(e) => handleResultChange(i, 'parameter', e.target.value)} className="h-7 text-xs" /> : row.parameter || '—'}</td>
                      <td className="border p-1">{isEditing ? <Input value={row.temperature} onChange={(e) => handleResultChange(i, 'temperature', e.target.value)} className="h-7 text-xs" /> : row.temperature || '—'}</td>
                      <td className="border p-1">{isEditing ? <Input value={row.day_0} onChange={(e) => handleResultChange(i, 'day_0', e.target.value)} className="h-7 text-xs" /> : row.day_0 || '—'}</td>
                      <td className="border p-1">{isEditing ? <Input value={row.day_14} onChange={(e) => handleResultChange(i, 'day_14', e.target.value)} className="h-7 text-xs" /> : row.day_14 || '—'}</td>
                      <td className="border p-1">{isEditing ? <Input value={row.month_1} onChange={(e) => handleResultChange(i, 'month_1', e.target.value)} className="h-7 text-xs" /> : row.month_1 || '—'}</td>
                      <td className="border p-1">{isEditing ? <Input value={row.month_2} onChange={(e) => handleResultChange(i, 'month_2', e.target.value)} className="h-7 text-xs" /> : row.month_2 || '—'}</td>
                      <td className="border p-1">{isEditing ? <Input value={row.month_3} onChange={(e) => handleResultChange(i, 'month_3', e.target.value)} className="h-7 text-xs" /> : row.month_3 || '—'}</td>
                      {isEditing && <td className="border p-1 text-center"><Button variant="ghost" size="sm" onClick={() => removeEditResult(i)} className="h-6 w-6 p-0 text-red-500"><Trash2 size={12} /></Button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {isMlt && (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="border px-2 py-2 bg-slate-50">시험항목</th><th className="border px-2 py-2 bg-slate-50">규격</th><th className="border px-2 py-2 bg-slate-50">결과</th>{isEditing && <th className="border px-2 py-2 bg-slate-50 w-8"></th>}
                  </tr>
                </thead>
                <tbody>
                  {mltResults.map((row, i) => (
                    <tr key={i}>
                      <td className="border p-1">{isEditing ? <Input value={row.test_item} onChange={(e) => handleResultChange(i, 'test_item', e.target.value)} className="h-7 text-xs" /> : row.test_item || '—'}</td>
                      <td className="border p-1">{isEditing ? <Input value={row.specification} onChange={(e) => handleResultChange(i, 'specification', e.target.value)} className="h-7 text-xs" /> : row.specification || '—'}</td>
                      <td className="border p-1">{isEditing ? <Input value={row.result} onChange={(e) => handleResultChange(i, 'result', e.target.value)} className="h-7 text-xs" /> : row.result || '—'}</td>
                      {isEditing && <td className="border p-1 text-center"><Button variant="ghost" size="sm" onClick={() => removeEditResult(i)} className="h-6 w-6 p-0 text-red-500"><Trash2 size={12} /></Button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {isEditing && (
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={addEditResult} className="gap-1 text-xs"><Plus size={12} /> 행 추가</Button>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-600">종합 판정</span>
                  <Select value={editData.overall_judgment || '적합'} onValueChange={(v) => handleEditChange('overall_judgment', v)}>
                    <SelectTrigger className="h-8 w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="적합">적합</SelectItem>
                      <SelectItem value="부적합">부적합</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
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
                  {standardResults.map((r, i) => (
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
                      {standardResults.map((r, i) => (
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
                        <td colSpan={3} className={`border border-black px-2 py-1.5 text-center font-bold ${(isEditing ? (editData.results as CertificateResult[]).every(r => r.judgment === '적합') : certificate.overall_judgment === '적합') ? 'text-green-700' : 'text-red-700'}`}>
                          {isEditing ? ((editData.results as CertificateResult[]).every(r => r.judgment === '적합') ? '적합' : '부적합') : certificate.overall_judgment}
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
  const [manualOverallJudgment, setManualOverallJudgment] = useState<'적합' | '부적합'>('적합')
  const [labNo, setLabNo] = useState('')
  const [criteria, setCriteria] = useState<'A' | 'B'>('A')
  const [testStartDate, setTestStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [testEndDate, setTestEndDate] = useState(new Date().toISOString().slice(0, 10))
  const [mltMethod, setMltMethod] = useState('')
  const [stabilitySpecifications, setStabilitySpecifications] = useState('')
  const [tester, setTester] = useState('')
  const [approver, setApprover] = useState('')
  const [results, setResults] = useState<CertificateResultsRow[]>([])
  const [products, setProducts] = useState<
    { product_code: string; korean_name: string | null }[]
  >([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [loadingSpecs, setLoadingSpecs] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const isBasicType = isBasicQcType(qcType)
  const isPetType = isPetQcType(qcType)
  const isStabilityType = isStabilityQcType(qcType)
  const isMltType = isMltQcType(qcType)
  const standardResults = results as CertificateResult[]
  const petResults = results as PetCertificateResult[]
  const stabilityResults = results as StabilityCertificateResult[]
  const mltResults = results as MltCertificateResult[]

  useEffect(() => {
    setLoadingProducts(true)
    fetchProductsForSelect().then((r) => {
      setProducts(r.products)
      setLoadingProducts(false)
    })
  }, [])

  useEffect(() => {
    generateCertificateNo().then(setCertificateNo)
  }, [])

  const loadTemplate = async () => {
    if (!productCode) {
      toast.error('제품을 선택해주세요')
      return
    }

    if (isPetType) {
      setResults(createPetDefaultRows())
      setStep(2)
      return
    }

    if (isStabilityType) {
      setResults(createStabilityDefaultRows())
      setStep(2)
      return
    }

    if (isMltType) {
      setResults(createMltDefaultRows())
      setStep(2)
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

  const overallJudgment = isBasicType
    ? standardResults.every((r) => r.judgment === '적합')
      ? '적합'
      : '부적합'
    : manualOverallJudgment

  const handleResultChange = (
    index: number,
    field: string,
    value: string
  ) => {
    setResults((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    )
  }

  const addResult = () => {
    if (isPetType) {
      setResults((prev) => [
        ...prev,
        {
          organism: '',
          atcc: '',
          initial_count: '',
          log_reduction_d7: '',
          log_reduction_d14: '',
          log_reduction_d28: '',
          conclusion: '',
        } as PetCertificateResult,
      ])
      return
    }

    if (isStabilityType) {
      setResults((prev) => [
        ...prev,
        {
          parameter: '',
          temperature: '',
          day_0: '',
          day_14: '',
          month_1: '',
          month_2: '',
          month_3: '',
        } as StabilityCertificateResult,
      ])
      return
    }

    if (isMltType) {
      setResults((prev) => [
        ...prev,
        {
          test_item: '',
          specification: '',
          result: '',
        } as MltCertificateResult,
      ])
      return
    }

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
    if (isBasicType && standardResults.some((r) => !r.result)) {
      toast.error('모든 시험 결과를 입력해주세요')
      return
    }

    if (isPetType && petResults.some((r) => !r.organism.trim())) {
      toast.error('PET 시험균주명을 입력해주세요')
      return
    }

    if (isMltType && mltResults.some((r) => !r.test_item.trim())) {
      toast.error('MLT 시험항목을 입력해주세요')
      return
    }

    setSubmitting(true)
    try {
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
        notes: buildCertificateNotes(qcType, {
          lab_no: labNo,
          criteria,
          test_start_date: testStartDate,
          test_end_date: testEndDate,
          method: mltMethod,
          specifications: stabilitySpecifications,
        }),
      })

      if (error || !certificate) {
        toast.error(error || '저장 실패')
        return
      }

      toast.success('성적서가 저장되었습니다')

      try {
        if (!isBasicType) {
          setStep(3)
          return
        }

        const productName =
          products.find((p) => p.product_code === productCode)?.korean_name ?? ''
        const pdfBlob = await generatePdf({
          certificate: { ...certificate, product_name: productName },
          results: standardResults,
          qcType,
          productName,
        })

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
                  <SelectItem key={t} value={t}>{QC_TYPE_LABEL[t]}</SelectItem>
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
          <Button onClick={loadTemplate} disabled={!productCode || loadingSpecs} className="gap-1 bg-amber-500 hover:bg-amber-600">
            {loadingSpecs ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            시험기준 불러오기
          </Button>
        </div>
      </div>
    )
  }

  if (step === 2) {
    const productName = products.find((p) => p.product_code === productCode)?.korean_name || ''

    if (!isBasicType) {
      return (
        <div className="space-y-4 p-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">{QC_TYPE_LABEL[qcType]} 시험 데이터 입력</h3>
              <p className="text-xs text-slate-500 mt-1">{productName || productCode} · {certificateNo}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">LOT No.</label>
                <Input value={lotNo} onChange={(e) => setLotNo(e.target.value)} className="h-8" placeholder="LOT 번호" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">시험일</label>
                <Input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} className="h-8" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">시험자</label>
                <Input value={tester} onChange={(e) => setTester(e.target.value)} className="h-8" placeholder="시험자" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">승인자</label>
                <Input value={approver} onChange={(e) => setApprover(e.target.value)} className="h-8" placeholder="승인자" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">종합 판정</label>
                <Select value={manualOverallJudgment} onValueChange={(v) => { if (v === '적합' || v === '부적합') setManualOverallJudgment(v) }}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="적합">적합</SelectItem>
                    <SelectItem value="부적합">부적합</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isPetType && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Lab No.</label>
                    <Input value={labNo} onChange={(e) => setLabNo(e.target.value)} className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Criteria</label>
                    <Select value={criteria} onValueChange={(v) => { if (v === 'A' || v === 'B') setCriteria(v) }}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {(isPetType || isMltType) && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">시험 시작일</label>
                    <Input type="date" value={testStartDate} onChange={(e) => setTestStartDate(e.target.value)} className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">시험 종료일</label>
                    <Input type="date" value={testEndDate} onChange={(e) => setTestEndDate(e.target.value)} className="h-8" />
                  </div>
                </>
              )}

              {isMltType && (
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-medium text-slate-600">시험 방법(Method)</label>
                  <Input value={mltMethod} onChange={(e) => setMltMethod(e.target.value)} className="h-8" />
                </div>
              )}

              {isStabilityType && (
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-medium text-slate-600">기타 규격 메모</label>
                  <Input value={stabilitySpecifications} onChange={(e) => setStabilitySpecifications(e.target.value)} className="h-8" />
                </div>
              )}
            </div>

            {isPetType && (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="border px-2 py-2 bg-slate-50">시험균주</th>
                    <th className="border px-2 py-2 bg-slate-50">ATCC</th>
                    <th className="border px-2 py-2 bg-slate-50">초기균수</th>
                    <th className="border px-2 py-2 bg-slate-50">D7 Log 감소</th>
                    <th className="border px-2 py-2 bg-slate-50">D14 Log 감소</th>
                    <th className="border px-2 py-2 bg-slate-50">D28 Log 감소</th>
                    <th className="border px-2 py-2 bg-slate-50">결론</th>
                    <th className="border px-2 py-2 bg-slate-50 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {petResults.map((row, i) => (
                    <tr key={i}>
                      <td className="border p-1"><Input value={row.organism} onChange={(e) => handleResultChange(i, 'organism', e.target.value)} className="h-7 text-xs" /></td>
                      <td className="border p-1"><Input value={row.atcc} onChange={(e) => handleResultChange(i, 'atcc', e.target.value)} className="h-7 text-xs" /></td>
                      <td className="border p-1"><Input value={row.initial_count} onChange={(e) => handleResultChange(i, 'initial_count', e.target.value)} className="h-7 text-xs" /></td>
                      <td className="border p-1"><Input value={row.log_reduction_d7} onChange={(e) => handleResultChange(i, 'log_reduction_d7', e.target.value)} className="h-7 text-xs" /></td>
                      <td className="border p-1"><Input value={row.log_reduction_d14} onChange={(e) => handleResultChange(i, 'log_reduction_d14', e.target.value)} className="h-7 text-xs" /></td>
                      <td className="border p-1"><Input value={row.log_reduction_d28} onChange={(e) => handleResultChange(i, 'log_reduction_d28', e.target.value)} className="h-7 text-xs" /></td>
                      <td className="border p-1"><Input value={row.conclusion} onChange={(e) => handleResultChange(i, 'conclusion', e.target.value)} className="h-7 text-xs" /></td>
                      <td className="border p-1 text-center"><Button variant="ghost" size="sm" onClick={() => removeResult(i)} className="h-6 w-6 p-0 text-red-500"><Trash2 size={12} /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {isStabilityType && (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="border px-2 py-2 bg-slate-50">시험항목</th>
                    <th className="border px-2 py-2 bg-slate-50">보관조건</th>
                    <th className="border px-2 py-2 bg-slate-50">Day 0</th>
                    <th className="border px-2 py-2 bg-slate-50">Day 14</th>
                    <th className="border px-2 py-2 bg-slate-50">1개월</th>
                    <th className="border px-2 py-2 bg-slate-50">2개월</th>
                    <th className="border px-2 py-2 bg-slate-50">3개월</th>
                    <th className="border px-2 py-2 bg-slate-50 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {stabilityResults.map((row, i) => (
                    <tr key={i}>
                      <td className="border p-1"><Input value={row.parameter} onChange={(e) => handleResultChange(i, 'parameter', e.target.value)} className="h-7 text-xs" /></td>
                      <td className="border p-1"><Input value={row.temperature} onChange={(e) => handleResultChange(i, 'temperature', e.target.value)} className="h-7 text-xs" /></td>
                      <td className="border p-1"><Input value={row.day_0} onChange={(e) => handleResultChange(i, 'day_0', e.target.value)} className="h-7 text-xs" /></td>
                      <td className="border p-1"><Input value={row.day_14} onChange={(e) => handleResultChange(i, 'day_14', e.target.value)} className="h-7 text-xs" /></td>
                      <td className="border p-1"><Input value={row.month_1} onChange={(e) => handleResultChange(i, 'month_1', e.target.value)} className="h-7 text-xs" /></td>
                      <td className="border p-1"><Input value={row.month_2} onChange={(e) => handleResultChange(i, 'month_2', e.target.value)} className="h-7 text-xs" /></td>
                      <td className="border p-1"><Input value={row.month_3} onChange={(e) => handleResultChange(i, 'month_3', e.target.value)} className="h-7 text-xs" /></td>
                      <td className="border p-1 text-center"><Button variant="ghost" size="sm" onClick={() => removeResult(i)} className="h-6 w-6 p-0 text-red-500"><Trash2 size={12} /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {isMltType && (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="border px-2 py-2 bg-slate-50">시험항목</th>
                    <th className="border px-2 py-2 bg-slate-50">규격</th>
                    <th className="border px-2 py-2 bg-slate-50">결과</th>
                    <th className="border px-2 py-2 bg-slate-50 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {mltResults.map((row, i) => (
                    <tr key={i}>
                      <td className="border p-1"><Input value={row.test_item} onChange={(e) => handleResultChange(i, 'test_item', e.target.value)} className="h-7 text-xs" /></td>
                      <td className="border p-1"><Input value={row.specification} onChange={(e) => handleResultChange(i, 'specification', e.target.value)} className="h-7 text-xs" /></td>
                      <td className="border p-1"><Input value={row.result} onChange={(e) => handleResultChange(i, 'result', e.target.value)} className="h-7 text-xs" /></td>
                      <td className="border p-1 text-center"><Button variant="ghost" size="sm" onClick={() => removeResult(i)} className="h-6 w-6 p-0 text-red-500"><Trash2 size={12} /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <Button variant="outline" size="sm" onClick={addResult} className="gap-1 text-xs w-fit">
              <Plus size={12} /> 행 추가
            </Button>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>← 이전</Button>
            <Button onClick={handleSubmit} disabled={submitting || results.length === 0} className="gap-1 bg-amber-500 hover:bg-amber-600">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              저장
            </Button>
          </div>
        </div>
      )
    }

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
                  {standardResults.map((r, i) => (
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

            <h1 className="text-center text-xl font-bold tracking-wider mb-6 underline underline-offset-4">{title}</h1>

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
                {standardResults.map((r, i) => (
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

  return (
    <div className="px-6 pb-6 space-y-4">
      <div className="text-center py-4">
        <div className="text-green-600 text-lg font-bold mb-2">
          {isBasicType ? '✓ 성적서가 발급되었습니다' : '✓ 시험 데이터가 저장되었습니다'}
        </div>
        <p className="text-sm text-slate-500">{certificateNo} · {QC_TYPE_LABEL[qcType]}</p>
        {!isBasicType && (
          <p className="text-xs text-slate-400 mt-1">PDF 발급은 CPNP 문서 생성 단계에서 진행됩니다.</p>
        )}
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
        <Button onClick={onComplete} className="bg-amber-500 hover:bg-amber-600 text-white">닫기</Button>
      </div>
    </div>
  )
}

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
