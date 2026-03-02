'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useUser } from '@/providers/user-provider'
import { createClient } from '@/lib/supabase/client'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { loadKoreanFont } from '@/lib/pdf/fonts'
import { toast } from 'sonner'
import {
  fetchMeasurements,
  createMeasurement,
  updateMeasurement,
  deleteMeasurement,
  fetchCertificates as fetchWaterCertificates,
  generateCertificateNo,
  createCertificate,
  updateCertificate,
  deleteCertificate,
  updateCertificatePdfUrl,
  fetchMeasurementByDate,
  bulkCreateCertificates,
  fetchMeasurementsForChart,
  type WaterMeasurement,
  type WaterTestResult,
  type WaterCertificate,
  type ChartMeasurement,
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
import { Loader2, Plus, Download, FileText, Search, X, Pencil, Save, Trash2, ChevronLeft, ChevronRight, ImagePlus, BarChart3 } from 'lucide-react'
import { useRef } from 'react'

// ─────────────────────────────────────────────
// 12 GMP test items for purified water
// ─────────────────────────────────────────────
const DEFAULT_WATER_TEST_ITEMS: WaterTestResult[] = [
  { test_item: '성상', criteria: '무색투명액상, 무취, 무미', result: '적합', judgment: '적합', remarks: '일상점검' },
  { test_item: 'pH', criteria: '5.0 ~ 7.0', result: '', judgment: '적합', remarks: '일상점검' },
  { test_item: '염화물', criteria: '액이 변해선 안됨', result: '적합', judgment: '적합', remarks: '일상점검' },
  { test_item: '황산염', criteria: '액이 변해선 안됨', result: '적합', judgment: '적합', remarks: '일상점검' },
  { test_item: '중금속', criteria: '비교액보다 진해선 안됨', result: '적합', judgment: '적합', remarks: '일상점검' },
  { test_item: '잔류 염소', criteria: '색을 나타내선 안됨', result: '적합', judgment: '적합', remarks: '주 1회 점검' },
  { test_item: '암모니아', criteria: '액이 변해선 안됨', result: '적합', judgment: '적합', remarks: '주 1회 점검' },
  { test_item: '이산화탄소', criteria: '액이 변해선 안됨', result: '적합', judgment: '적합', remarks: '주 1회 점검' },
  { test_item: '칼륨', criteria: '액이 변해선 안됨', result: '적합', judgment: '적합', remarks: '주 1회 점검' },
  { test_item: '과망간산 칼륨환원성 물질', criteria: '홍색이 없어져선 안됨', result: '적합', judgment: '적합', remarks: '주 1회 점검' },
  { test_item: '증발 잔류물', criteria: '1mg 이하', result: '적합', judgment: '적합', remarks: '주 1회 점검' },
  { test_item: '미생물', criteria: '100 CFU/g 이하', result: '해당사항 없음', judgment: '적합', remarks: '주 1회 점검' },
]

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function currentYear() {
  return new Date().getFullYear()
}

function currentMonth() {
  return new Date().getMonth() + 1
}

function formatDate(d: string | null | undefined) {
  if (!d) return '-'
  return d.slice(0, 10)
}

function judgmentBadge(j: string | null | undefined) {
  if (!j) return <Badge variant="outline">-</Badge>
  const pass = j === '적합' || j === '합격함'
  return (
    <Badge className={pass ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}>
      {j}
    </Badge>
  )
}

// ─────────────────────────────────────────────
// Image Lightbox
// ─────────────────────────────────────────────
function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 cursor-pointer"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-slate-700 hover:bg-white"
        onClick={onClose}
      >
        <X size={18} />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-[90vw] max-h-[90vh] object-contain rounded shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

// ─────────────────────────────────────────────
// Clickable thumbnail helper
// ─────────────────────────────────────────────
function ClickableImage({
  src, alt, className,
}: {
  src: string; alt: string; className?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`${className || ''} cursor-pointer hover:opacity-80 transition-opacity`}
        onClick={() => setOpen(true)}
      />
      {open && <ImageLightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  )
}

// ─────────────────────────────────────────────
// PDF Generation
// ─────────────────────────────────────────────
async function generateWaterCertificatePdf(cert: WaterCertificate): Promise<Blob | null> {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    await loadKoreanFont(doc)
    doc.setFont('NanumGothic', 'normal')

    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20

    // ─── Approval box (top right) ───
    const boxX = pageWidth - margin - 50
    doc.setFontSize(8)
    doc.setLineWidth(0.3)
    // Outer structure
    doc.rect(boxX, 15, 10, 16) // 결재
    doc.rect(boxX + 10, 15, 20, 8) // 담당
    doc.rect(boxX + 30, 15, 20, 8) // 주무부
    doc.rect(boxX + 10, 23, 20, 8) // 담당 value
    doc.rect(boxX + 30, 23, 20, 8) // 주무부 value
    doc.text('결', boxX + 5, 21, { align: 'center' })
    doc.text('재', boxX + 5, 27, { align: 'center' })
    doc.text('담당', boxX + 20, 20, { align: 'center' })
    doc.text('주무부', boxX + 40, 20, { align: 'center' })

    // ─── Title ───
    doc.setFontSize(20)
    doc.setFont('NanumGothic', 'bold')
    const title = '정제수 시험 성적서'
    doc.text(title, pageWidth / 2, 50, { align: 'center' })
    // Underline
    const titleWidth = doc.getTextWidth(title)
    doc.setLineWidth(0.5)
    doc.line((pageWidth - titleWidth) / 2, 52, (pageWidth + titleWidth) / 2, 52)

    // ─── Date subtitle ───
    doc.setFont('NanumGothic', 'normal')
    doc.setFontSize(13)
    const testDate = cert.test_date || ''
    const [yyyy, mm, dd] = testDate.split('-')
    const dateTitle = `${yyyy}년 ${parseInt(mm)}월 ${parseInt(dd)}일`
    doc.text(dateTitle, pageWidth / 2, 62, { align: 'center' })

    // ─── Info table ───
    let y = 70
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      body: [
        [
          { content: '원료명', styles: { fillColor: [245, 245, 245], halign: 'center' as const, fontStyle: 'bold' as const } },
          { content: '정제수', styles: { halign: 'center' as const } },
          { content: '검체채취량', styles: { fillColor: [245, 245, 245], halign: 'center' as const, fontStyle: 'bold' as const } },
          { content: cert.sample_quantity || '200 g', styles: { halign: 'center' as const } },
        ],
        [
          { content: '시험일자', styles: { fillColor: [245, 245, 245], halign: 'center' as const, fontStyle: 'bold' as const } },
          { content: `${yyyy}.${parseInt(mm)}.${parseInt(dd)}`, styles: { halign: 'center' as const } },
          { content: '채취장소', styles: { fillColor: [245, 245, 245], halign: 'center' as const, fontStyle: 'bold' as const } },
          { content: cert.collection_location || '제조실', styles: { halign: 'center' as const } },
        ],
        [
          { content: '채취자', styles: { fillColor: [245, 245, 245], halign: 'center' as const, fontStyle: 'bold' as const } },
          { content: cert.collector_name || '이온유', styles: { halign: 'center' as const } },
          { content: '비고', styles: { fillColor: [245, 245, 245], halign: 'center' as const, fontStyle: 'bold' as const } },
          { content: cert.notes || '', styles: { halign: 'center' as const } },
        ],
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3, font: 'NanumGothic', textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2 },
      columnStyles: {
        0: { cellWidth: 25 },
        2: { cellWidth: 25 },
      },
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? y + 30

    // ─── Results table ───
    y += 3
    const results: WaterTestResult[] = cert.results ?? []
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['시험항목', '시험기준', '시험결과', '비고']],
      body: results.map((r) => [
        r.test_item,
        r.criteria,
        r.result || '',
        r.remarks || '',
      ]),
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3, font: 'NanumGothic', textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2 },
      headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 42 },
        1: { halign: 'center', cellWidth: 55 },
        2: { halign: 'center', cellWidth: 35 },
        3: { halign: 'center', cellWidth: 35 },
      },
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? y + 80

    // ─── Judgment table ───
    y += 5
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      body: [
        [
          { content: '판정', styles: { fillColor: [245, 245, 245], halign: 'center' as const, fontStyle: 'bold' as const } },
          { content: cert.overall_judgment === '합격함' ? '합격함' : '불합격', styles: { halign: 'center' as const, fontStyle: 'bold' as const } },
          { content: '판정자', styles: { fillColor: [245, 245, 245], halign: 'center' as const, fontStyle: 'bold' as const } },
          { content: cert.judge_name || '박성철', styles: { halign: 'center' as const } },
        ],
        [
          { content: '결과 통지서 접수자', styles: { fillColor: [245, 245, 245], halign: 'center' as const, fontStyle: 'bold' as const } },
          { content: '', colSpan: 3, styles: { halign: 'center' as const } },
        ],
        [
          { content: '비고', styles: { fillColor: [245, 245, 245], halign: 'center' as const, fontStyle: 'bold' as const } },
          { content: cert.notes || '', colSpan: 3, styles: { halign: 'left' as const, minCellHeight: 15 } },
        ],
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3, font: 'NanumGothic', textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2 },
      columnStyles: {
        0: { cellWidth: 25 },
        2: { cellWidth: 25 },
      },
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? y + 30

    // ─── Notes images ───
    if (cert.notes_images && cert.notes_images.length > 0) {
      y += 5
      const maxImgWidth = pageWidth - margin * 2
      const maxImgHeight = 80

      for (const imgUrl of cert.notes_images) {
        try {
          const response = await fetch(imgUrl)
          const blob = await response.blob()
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(blob)
          })

          // Get image dimensions
          const img = new Image()
          await new Promise<void>((resolve) => {
            img.onload = () => resolve()
            img.src = dataUrl
          })

          // Scale to fit
          let imgW = img.width * 0.264583 // px to mm
          let imgH = img.height * 0.264583
          if (imgW > maxImgWidth) {
            const ratio = maxImgWidth / imgW
            imgW = maxImgWidth
            imgH = imgH * ratio
          }
          if (imgH > maxImgHeight) {
            const ratio = maxImgHeight / imgH
            imgH = maxImgHeight
            imgW = imgW * ratio
          }

          // Check if we need a new page
          if (y + imgH + 10 > doc.internal.pageSize.getHeight() - 20) {
            doc.addPage()
            y = 20
          }

          doc.addImage(dataUrl, 'JPEG', margin, y, imgW, imgH)
          y += imgH + 3
        } catch {
          // Skip failed image
        }
      }
    }

    // ─── Footer ───
    y += 15
    // Check if footer needs new page
    if (y + 10 > doc.internal.pageSize.getHeight() - 10) {
      doc.addPage()
      y = 20
    }
    doc.setFontSize(10)
    doc.setFont('NanumGothic', 'bold')
    doc.text('(주)에바스코스메틱', pageWidth / 2, y, { align: 'center' })

    return doc.output('blob')
  } catch (err) {
    console.error('PDF generation error:', err)
    toast.error('PDF 생성 중 오류가 발생했습니다.')
    return null
  }
}

// ─────────────────────────────────────────────
// Measurements Section
// ─────────────────────────────────────────────
function MeasurementsSection({
  year,
  month,
}: {
  year: number
  month: number
}) {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const PAGE_SIZE = 20

  // Create form state
  const [createForm, setCreateForm] = useState({
    measurement_date: todayStr(),
    measurement_time: '08:30',
    ph_value: '',
    resistivity: '',
    conductivity: '',
    maintenance_note: '',
    recorded_by: '',
  })

  // Edit form state
  const [editForm, setEditForm] = useState({
    measurement_date: '',
    measurement_time: '',
    ph_value: '',
    resistivity: '',
    conductivity: '',
    maintenance_note: '',
    recorded_by: '',
  })

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [year, month])

  const { data, isLoading } = useQuery({
    queryKey: ['water-measurements', year, month, page],
    queryFn: () => fetchMeasurements({ year, month, page, pageSize: PAGE_SIZE }),
  })

  const measurements = data?.measurements ?? []
  const totalCount = data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // Reset create form
  const resetCreateForm = useCallback(() => {
    setCreateForm({
      measurement_date: todayStr(),
      measurement_time: '08:30',
      ph_value: '',
      resistivity: '',
      conductivity: '',
      maintenance_note: '',
      recorded_by: '',
    })
  }, [])

  // Handle create
  async function handleCreate() {
    if (!createForm.measurement_date) {
      toast.error('측정일을 입력해주세요.')
      return
    }
    setSaving(true)
    try {
      const result = await createMeasurement({
        measurement_date: createForm.measurement_date,
        measurement_time: createForm.measurement_time || undefined,
        ph_value: createForm.ph_value ? parseFloat(createForm.ph_value) : undefined,
        resistivity: createForm.resistivity ? parseFloat(createForm.resistivity) : undefined,
        conductivity: createForm.conductivity ? parseFloat(createForm.conductivity) : undefined,
        maintenance_note: createForm.maintenance_note || undefined,
        recorded_by: createForm.recorded_by || undefined,
      })
      if (result.error) {
        toast.error(`등록 실패: ${result.error}`)
        return
      }
      toast.success('측정 기록이 등록되었습니다.')
      setShowCreate(false)
      resetCreateForm()
      queryClient.invalidateQueries({ queryKey: ['water-measurements'] })
    } catch (err) {
      console.error(err)
      toast.error('측정 기록 등록 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // Start editing
  function startEdit(m: WaterMeasurement) {
    setEditingId(m.id)
    setEditForm({
      measurement_date: m.measurement_date ?? '',
      measurement_time: m.measurement_time ?? '',
      ph_value: m.ph_value != null ? String(m.ph_value) : '',
      resistivity: m.resistivity != null ? String(m.resistivity) : '',
      conductivity: m.conductivity != null ? String(m.conductivity) : '',
      maintenance_note: m.maintenance_note ?? '',
      recorded_by: m.recorded_by ?? '',
    })
  }

  // Handle update
  async function handleUpdate() {
    if (!editingId) return
    setSaving(true)
    try {
      const result = await updateMeasurement(editingId, {
        ph_value: editForm.ph_value ? parseFloat(editForm.ph_value) : undefined,
        resistivity: editForm.resistivity ? parseFloat(editForm.resistivity) : undefined,
        conductivity: editForm.conductivity ? parseFloat(editForm.conductivity) : undefined,
        maintenance_note: editForm.maintenance_note || undefined,
        recorded_by: editForm.recorded_by || undefined,
      })
      if (result.error) {
        toast.error(`수정 실패: ${result.error}`)
        return
      }
      toast.success('측정 기록이 수정되었습니다.')
      setEditingId(null)
      queryClient.invalidateQueries({ queryKey: ['water-measurements'] })
    } catch (err) {
      console.error(err)
      toast.error('측정 기록 수정 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // Handle delete
  async function handleDelete(id: string) {
    if (!window.confirm('이 측정 기록을 삭제하시겠습니까?')) return
    try {
      const result = await deleteMeasurement(id)
      if (result.error) {
        toast.error(`삭제 실패: ${result.error}`)
        return
      }
      toast.success('측정 기록이 삭제되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['water-measurements'] })
    } catch (err) {
      console.error(err)
      toast.error('측정 기록 삭제 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {year}년 {month}월 측정 기록
          {!isLoading && <span className="ml-1.5 text-slate-400">({totalCount}건)</span>}
        </p>
        <Dialog open={showCreate} onOpenChange={(open) => {
          setShowCreate(open)
          if (!open) resetCreateForm()
        }}>
          <DialogTrigger asChild>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
              <Plus size={16} />
              새 측정 기록
            </Button>
          </DialogTrigger>
          <DialogContent
            className="max-w-lg"
            showCloseButton={false}
            aria-describedby={undefined}
          >
            <DialogHeader>
              <DialogTitle>새 측정 기록</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {/* Date & Time row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">측정일</label>
                  <Input
                    type="date"
                    value={createForm.measurement_date}
                    onChange={(e) => setCreateForm((p) => ({ ...p, measurement_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">측정시간</label>
                  <Input
                    type="time"
                    value={createForm.measurement_time}
                    onChange={(e) => setCreateForm((p) => ({ ...p, measurement_time: e.target.value }))}
                  />
                </div>
              </div>

              {/* pH, Resistivity, Conductivity */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">pH</label>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="예: 6.500"
                    value={createForm.ph_value}
                    onChange={(e) => setCreateForm((p) => ({ ...p, ph_value: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">비저항 (MΩ·cm)</label>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="예: 1.200"
                    value={createForm.resistivity}
                    onChange={(e) => setCreateForm((p) => ({ ...p, resistivity: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">전기전도도 (μS/cm)</label>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="예: 0.830"
                    value={createForm.conductivity}
                    onChange={(e) => setCreateForm((p) => ({ ...p, conductivity: e.target.value }))}
                  />
                </div>
              </div>

              {/* Note & Recorded by */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">비고</label>
                  <Input
                    placeholder="특이사항 입력"
                    value={createForm.maintenance_note}
                    onChange={(e) => setCreateForm((p) => ({ ...p, maintenance_note: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">기록자</label>
                  <Input
                    placeholder="이름 입력"
                    value={createForm.recorded_by}
                    onChange={(e) => setCreateForm((p) => ({ ...p, recorded_by: e.target.value }))}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreate(false)
                    resetCreateForm()
                  }}
                >
                  취소
                </Button>
                <Button
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={handleCreate}
                  disabled={saving}
                >
                  {saving ? <Loader2 size={16} className="animate-spin mr-1" /> : null}
                  등록
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-2 text-left font-medium text-slate-600">날짜</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">시간</th>
              <th className="px-3 py-2 text-right font-medium text-slate-600">pH</th>
              <th className="px-3 py-2 text-right font-medium text-slate-600">비저항(MΩ·cm)</th>
              <th className="px-3 py-2 text-right font-medium text-slate-600">전기전도도(μS/cm)</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">비고</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">기록자</th>
              <th className="px-3 py-2 text-center font-medium text-slate-600 w-24">작업</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <Loader2 size={20} className="animate-spin text-amber-500 mx-auto" />
                </td>
              </tr>
            ) : measurements.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                  측정 기록이 없습니다.
                </td>
              </tr>
            ) : (
              measurements.map((m: WaterMeasurement) => {
                const isEditing = editingId === m.id

                if (isEditing) {
                  return (
                    <tr key={m.id} className="border-b border-slate-100 bg-amber-50/40">
                      <td className="px-3 py-1.5">
                        <Input
                          type="date"
                          className="h-8 text-sm"
                          value={editForm.measurement_date}
                          onChange={(e) => setEditForm((p) => ({ ...p, measurement_date: e.target.value }))}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          type="time"
                          className="h-8 text-sm"
                          value={editForm.measurement_time}
                          onChange={(e) => setEditForm((p) => ({ ...p, measurement_time: e.target.value }))}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          type="number"
                          step="0.001"
                          className="h-8 text-sm text-right"
                          value={editForm.ph_value}
                          onChange={(e) => setEditForm((p) => ({ ...p, ph_value: e.target.value }))}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          type="number"
                          step="0.001"
                          className="h-8 text-sm text-right"
                          value={editForm.resistivity}
                          onChange={(e) => setEditForm((p) => ({ ...p, resistivity: e.target.value }))}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          type="number"
                          step="0.001"
                          className="h-8 text-sm text-right"
                          value={editForm.conductivity}
                          onChange={(e) => setEditForm((p) => ({ ...p, conductivity: e.target.value }))}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          className="h-8 text-sm"
                          value={editForm.maintenance_note}
                          onChange={(e) => setEditForm((p) => ({ ...p, maintenance_note: e.target.value }))}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          className="h-8 text-sm"
                          value={editForm.recorded_by}
                          onChange={(e) => setEditForm((p) => ({ ...p, recorded_by: e.target.value }))}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={handleUpdate}
                            disabled={saving}
                          >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-slate-400 hover:text-slate-600"
                            onClick={() => setEditingId(null)}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-700">{formatDate(m.measurement_date)}</td>
                    <td className="px-3 py-2 text-slate-600">{m.measurement_time ?? '-'}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-700">
                      {m.ph_value != null ? Number(m.ph_value).toFixed(3) : '-'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-700">
                      {m.resistivity != null ? Number(m.resistivity).toFixed(3) : '-'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-700">
                      {m.conductivity != null ? Number(m.conductivity).toFixed(3) : '-'}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{m.maintenance_note || '-'}</td>
                    <td className="px-3 py-2 text-slate-600">{m.recorded_by || '-'}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                          onClick={() => startEdit(m)}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(m.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="gap-1"
          >
            <ChevronLeft size={14} />
            이전
          </Button>
          <span className="text-sm text-slate-500 px-3">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="gap-1"
          >
            다음
            <ChevronRight size={14} />
          </Button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Certificate Creation Dialog
// ─────────────────────────────────────────────
function CertificateCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: () => void
}) {
  const { user } = useUser()
  const [saving, setSaving] = useState(false)
  const [certNo, setCertNo] = useState('')
  const [testDate, setTestDate] = useState(todayStr())
  const [collectorName, setCollectorName] = useState('이온유')
  const [sampleQuantity, setSampleQuantity] = useState('200 g')
  const [collectionLocation, setCollectionLocation] = useState('제조실')
  const [judgeName, setJudgeName] = useState('박성철')
  const [results, setResults] = useState<WaterTestResult[]>(
    DEFAULT_WATER_TEST_ITEMS.map((item) => ({ ...item }))
  )
  const [notesText, setNotesText] = useState('')
  const [notesImages, setNotesImages] = useState<string[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [loadingMeasurement, setLoadingMeasurement] = useState(false)

  // Generate certificate number on open
  useEffect(() => {
    if (open) {
      generateCertificateNo().then((no) => setCertNo(no)).catch(() => {
        setCertNo('')
        toast.error('성적서번호 생성에 실패했습니다.')
      })
      // Reset form
      setTestDate(todayStr())
      setCollectorName('이온유')
      setSampleQuantity('200 g')
      setCollectionLocation('제조실')
      setJudgeName('박성철')
      setResults(DEFAULT_WATER_TEST_ITEMS.map((item) => ({ ...item })))
      setNotesText('')
      setNotesImages([])
    }
  }, [open])

  // Auto-fill pH when test_date changes
  useEffect(() => {
    if (!testDate || !open) return

    let cancelled = false
    setLoadingMeasurement(true)

    fetchMeasurementByDate(testDate)
      .then((res) => {
        if (cancelled) return
        const measurement = res.measurement
        if (measurement && measurement.ph_value != null) {
          setResults((prev) =>
            prev.map((r) =>
              r.test_item === 'pH'
                ? { ...r, result: String(Number(measurement.ph_value).toFixed(3)) }
                : r
            )
          )
          toast.success(`${testDate} 측정 pH 값을 자동 입력했습니다.`)
        }
      })
      .catch(() => {
        // No measurement found — silently ignore
      })
      .finally(() => {
        if (!cancelled) setLoadingMeasurement(false)
      })

    return () => {
      cancelled = true
    }
  }, [testDate, open])

  // Compute overall judgment
  const overallJudgment: string = results.every((r) => r.judgment === '적합')
    ? '합격함'
    : '불합격'

  // Update a result field
  function updateResult(index: number, field: 'result' | 'judgment', value: string) {
    setResults((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    )
  }

  // Handle image upload
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingImage(true)
    try {
      const supabase = createClient()
      const newUrls: string[] = []

      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name}은(는) 이미지 파일이 아닙니다.`)
          continue
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} 파일이 5MB를 초과합니다.`)
          continue
        }

        const ext = file.name.split('.').pop() || 'jpg'
        const fileName = `purified-water/notes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file, { contentType: file.type, upsert: false })

        if (uploadError) {
          toast.error(`${file.name} 업로드 실패: ${uploadError.message}`)
          continue
        }

        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName)
        if (urlData?.publicUrl) {
          newUrls.push(urlData.publicUrl)
        }
      }

      if (newUrls.length > 0) {
        setNotesImages((prev) => [...prev, ...newUrls])
        toast.success(`${newUrls.length}개 이미지가 업로드되었습니다.`)
      }
    } catch (err) {
      console.error(err)
      toast.error('이미지 업로드 중 오류가 발생했습니다.')
    } finally {
      setUploadingImage(false)
      // Reset input
      e.target.value = ''
    }
  }

  // Remove uploaded image
  function removeImage(index: number) {
    setNotesImages((prev) => prev.filter((_, i) => i !== index))
  }

  // Handle submit
  async function handleSubmit() {
    if (!certNo) {
      toast.error('성적서번호가 생성되지 않았습니다.')
      return
    }
    if (!testDate) {
      toast.error('시험일을 입력해주세요.')
      return
    }

    setSaving(true)
    try {
      const res = await createCertificate({
        certificate_no: certNo,
        test_date: testDate,
        results,
        overall_judgment: overallJudgment,
        recorded_by: user?.name || undefined,
        collector_name: collectorName || undefined,
        sample_quantity: sampleQuantity || undefined,
        collection_location: collectionLocation || undefined,
        judge_name: judgeName || undefined,
        notes: notesText || undefined,
        notes_images: notesImages.length > 0 ? notesImages : undefined,
      })
      if (res.error) {
        toast.error(`발급 실패: ${res.error}`)
        return
      }
      toast.success('성적서가 발급되었습니다.')
      onOpenChange(false)
      onCreated()
    } catch (err) {
      console.error(err)
      toast.error('성적서 발급 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // Derive date display values
  const [yyyy, mm, dd] = (testDate || '').split('-')
  const dateTitle = yyyy ? `${yyyy}년 ${parseInt(mm)}월 ${parseInt(dd)}일` : ''
  const dateShort = yyyy ? `${yyyy}.${parseInt(mm)}.${parseInt(dd)}` : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[760px] max-w-[760px] sm:max-w-[760px] max-h-[95vh] overflow-y-auto p-0"
        showCloseButton={false}
        aria-describedby={undefined}
      >
        {/* Toolbar */}
        <div className="sticky top-0 z-10 flex justify-between items-center px-4 py-2 bg-slate-50 border-b">
          <DialogTitle className="text-sm font-medium text-slate-700">새 성적서 발급</DialogTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Plus size={14} className="mr-1" />}
              {saving ? '발급 중...' : '발급'}
            </Button>
          </div>
        </div>

        {/* A4-like document layout — matches CertificateViewDialog */}
        <div className="flex justify-center p-2 bg-slate-100">
          <div className="bg-white shadow-lg w-full" style={{ padding: '20mm', minHeight: '900px', fontFamily: 'Malgun Gothic, Dotum, sans-serif' }}>
            {/* Approval box */}
            <div style={{ width: '100%', height: '80px' }}>
              <table className="border-collapse text-[11px] float-right" style={{ width: '200px' }}>
                <tbody>
                  <tr>
                    <th rowSpan={2} className="border border-black px-2 py-1 bg-gray-100 font-bold text-center align-middle" style={{ width: '30px' }}>결<br/>재</th>
                    <th className="border border-black px-2 py-1 bg-gray-100 font-bold text-center" style={{ width: '60px' }}>담당</th>
                    <th className="border border-black px-2 py-1 bg-gray-100 font-bold text-center" style={{ width: '60px' }}>주무부</th>
                  </tr>
                  <tr>
                    <td className="border border-black px-2 text-center" style={{ height: '40px' }}></td>
                    <td className="border border-black px-2 text-center" style={{ height: '40px' }}></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Title */}
            <h1 className="text-center text-[22px] font-bold tracking-wider mb-2 underline underline-offset-4">정제수 시험 성적서</h1>

            {/* Date subtitle — editable */}
            <div className="text-center mb-6 flex items-center justify-center gap-2">
              {dateTitle ? (
                <span className="text-[14px] font-bold">{dateTitle}</span>
              ) : (
                <span className="text-[14px] text-slate-400">시험일을 선택하세요</span>
              )}
              <Input
                type="date"
                className="h-7 w-36 text-xs border-amber-300 focus:border-amber-500"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
              />
              {loadingMeasurement && (
                <Loader2 size={14} className="animate-spin text-amber-500" />
              )}
            </div>

            {/* Info table */}
            <table className="w-full border-collapse text-[11px] mb-4">
              <colgroup>
                <col style={{ width: '15%' }} />
                <col style={{ width: '35%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '35%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">원료명</th>
                  <td className="border border-black px-2 py-1.5 text-center">정제수</td>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">검체채취량</th>
                  <td className="border border-black p-0">
                    <input
                      className="w-full h-full px-2 py-1.5 text-center text-[11px] border-0 outline-none bg-transparent focus:bg-amber-50"
                      value={sampleQuantity}
                      onChange={(e) => setSampleQuantity(e.target.value)}
                    />
                  </td>
                </tr>
                <tr>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">시험일자</th>
                  <td className="border border-black px-2 py-1.5 text-center">{dateShort || '-'}</td>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">채취장소</th>
                  <td className="border border-black p-0">
                    <input
                      className="w-full h-full px-2 py-1.5 text-center text-[11px] border-0 outline-none bg-transparent focus:bg-amber-50"
                      value={collectionLocation}
                      onChange={(e) => setCollectionLocation(e.target.value)}
                    />
                  </td>
                </tr>
                <tr>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">채취자</th>
                  <td className="border border-black p-0">
                    <input
                      className="w-full h-full px-2 py-1.5 text-center text-[11px] border-0 outline-none bg-transparent focus:bg-amber-50"
                      value={collectorName}
                      onChange={(e) => setCollectorName(e.target.value)}
                    />
                  </td>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">비고</th>
                  <td className="border border-black px-2 py-1.5 text-center"></td>
                </tr>
              </tbody>
            </table>

            {/* Results table */}
            <table className="w-full border-collapse text-[11px] mb-4">
              <colgroup>
                <col style={{ width: '25%' }} />
                <col style={{ width: '30%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">시험항목</th>
                  <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">시험기준</th>
                  <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">시험결과</th>
                  <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">비고</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">{r.test_item}</th>
                    <td className="border border-black px-2 py-1.5 text-center">{r.criteria}</td>
                    <td className="border border-black p-0">
                      <input
                        className="w-full h-full px-2 py-1.5 text-center text-[11px] border-0 outline-none bg-transparent focus:bg-amber-50"
                        placeholder="결과 입력"
                        value={r.result}
                        onChange={(e) => updateResult(i, 'result', e.target.value)}
                      />
                    </td>
                    <td className="border border-black px-2 py-1.5 text-center">{r.remarks || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Judgment table */}
            <table className="w-full border-collapse text-[11px] mt-5">
              <colgroup>
                <col style={{ width: '15%' }} />
                <col style={{ width: '35%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '35%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">판정</th>
                  <td className="border border-black px-2 py-1.5 text-center font-bold">{overallJudgment}</td>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">판정자</th>
                  <td className="border border-black p-0">
                    <input
                      className="w-full h-full px-2 py-1.5 text-center text-[11px] border-0 outline-none bg-transparent focus:bg-amber-50"
                      value={judgeName}
                      onChange={(e) => setJudgeName(e.target.value)}
                    />
                  </td>
                </tr>
                <tr>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">결과 통지서 접수자</th>
                  <td colSpan={3} className="border border-black px-2 py-1.5 text-center"></td>
                </tr>
                <tr>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center align-top">비고</th>
                  <td colSpan={3} className="border border-black p-2" style={{ minHeight: '60px' }}>
                    <textarea
                      className="w-full text-[11px] border-0 outline-none bg-transparent focus:bg-amber-50 resize-none min-h-[40px]"
                      placeholder="비고 입력"
                      rows={2}
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                    />
                    {/* Uploaded images */}
                    {notesImages.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {notesImages.map((url, idx) => (
                          <div key={idx} className="relative group">
                            <ClickableImage
                              src={url}
                              alt={`첨부 ${idx + 1}`}
                              className="w-24 h-24 object-cover rounded border border-gray-300"
                            />
                            <button
                              type="button"
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeImage(idx)}
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Upload button */}
                    <div className="mt-2">
                      <label className="inline-flex items-center gap-1 px-2 py-1 text-[10px] text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded cursor-pointer transition-colors">
                        {uploadingImage ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <ImagePlus size={12} />
                        )}
                        {uploadingImage ? '업로드 중...' : '사진 첨부'}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                        />
                      </label>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Footer */}
            <div className="text-center text-[11px] font-bold mt-8">(주)에바스코스메틱</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────
// Certificate View Dialog
// ─────────────────────────────────────────────
function CertificateViewDialog({
  cert,
  open,
  onOpenChange,
}: {
  cert: WaterCertificate | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [isGenerating, setIsGenerating] = useState(false)
  const queryClient = useQueryClient()

  if (!cert) return null

  const results: WaterTestResult[] = cert.results ?? []
  const [yyyy, mm, dd] = (cert.test_date || '').split('-')
  const dateTitle = yyyy ? `${yyyy}년 ${parseInt(mm)}월 ${parseInt(dd)}일` : '-'
  const dateShort = yyyy ? `${yyyy}.${parseInt(mm)}.${parseInt(dd)}` : '-'

  async function handlePdfDownload() {
    setIsGenerating(true)
    try {
      const blob = await generateWaterCertificatePdf(cert!)
      if (!blob) return

      const supabase = createClient()
      const fileName = `purified-water/${cert!.certificate_no}.pdf`
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, blob, { contentType: 'application/pdf', upsert: true })

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName)
        if (urlData?.publicUrl) {
          await updateCertificatePdfUrl(cert!.id, urlData.publicUrl)
        }
      }

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `정제수_성적서_${cert!.certificate_no}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('PDF가 다운로드되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['water-certificates'] })
    } catch (err) {
      console.error(err)
      toast.error('PDF 생성 중 오류가 발생했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[760px] max-w-[760px] sm:max-w-[760px] max-h-[95vh] overflow-y-auto p-0"
        showCloseButton={false}
        aria-describedby={undefined}
      >
        {/* Toolbar */}
        <div className="sticky top-0 z-10 flex justify-between items-center px-4 py-2 bg-slate-50 border-b">
          <DialogTitle className="text-sm font-medium text-slate-700">성적서 미리보기</DialogTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePdfDownload} disabled={isGenerating}>
              {isGenerating ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Download size={14} className="mr-1" />}
              {isGenerating ? '생성 중...' : 'PDF'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X size={14} />
            </Button>
          </div>
        </div>

        {/* A4-like preview matching report.html */}
        <div className="flex justify-center p-2 bg-slate-100">
          <div className="bg-white shadow-lg w-full" style={{ padding: '20mm', minHeight: '900px', fontFamily: 'Malgun Gothic, Dotum, sans-serif' }}>
            {/* Approval box */}
            <div style={{ width: '100%', height: '80px' }}>
              <table className="border-collapse text-[11px] float-right" style={{ width: '200px' }}>
                <tbody>
                  <tr>
                    <th rowSpan={2} className="border border-black px-2 py-1 bg-gray-100 font-bold text-center align-middle" style={{ width: '30px' }}>결<br/>재</th>
                    <th className="border border-black px-2 py-1 bg-gray-100 font-bold text-center" style={{ width: '60px' }}>담당</th>
                    <th className="border border-black px-2 py-1 bg-gray-100 font-bold text-center" style={{ width: '60px' }}>주무부</th>
                  </tr>
                  <tr>
                    <td className="border border-black px-2 text-center" style={{ height: '40px' }}></td>
                    <td className="border border-black px-2 text-center" style={{ height: '40px' }}></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Title */}
            <h1 className="text-center text-[22px] font-bold tracking-wider mb-2 underline underline-offset-4">정제수 시험 성적서</h1>
            <div className="text-center text-[14px] font-bold mb-6">{dateTitle}</div>

            {/* Info table */}
            <table className="w-full border-collapse text-[11px] mb-4">
              <colgroup>
                <col style={{ width: '15%' }} />
                <col style={{ width: '35%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '35%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">원료명</th>
                  <td className="border border-black px-2 py-1.5 text-center">정제수</td>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">검체채취량</th>
                  <td className="border border-black px-2 py-1.5 text-center">{cert.sample_quantity || '200 g'}</td>
                </tr>
                <tr>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">시험일자</th>
                  <td className="border border-black px-2 py-1.5 text-center">{dateShort}</td>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">채취장소</th>
                  <td className="border border-black px-2 py-1.5 text-center">{cert.collection_location || '제조실'}</td>
                </tr>
                <tr>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">채취자</th>
                  <td className="border border-black px-2 py-1.5 text-center">{cert.collector_name || '이온유'}</td>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">비고</th>
                  <td className="border border-black px-2 py-1.5 text-center">{cert.notes || ''}</td>
                </tr>
              </tbody>
            </table>

            {/* Results table */}
            <table className="w-full border-collapse text-[11px] mb-4">
              <colgroup>
                <col style={{ width: '25%' }} />
                <col style={{ width: '35%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">시험항목</th>
                  <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">시험기준</th>
                  <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">시험결과</th>
                  <th className="border border-black px-2 py-2 bg-gray-100 font-bold text-center">비고</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}>
                    <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">{r.test_item}</th>
                    <td className="border border-black px-2 py-1.5 text-center">{r.criteria}</td>
                    <td className="border border-black px-2 py-1.5 text-center">{r.result || ''}</td>
                    <td className="border border-black px-2 py-1.5 text-center">{r.remarks || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Judgment table */}
            <table className="w-full border-collapse text-[11px] mt-5">
              <colgroup>
                <col style={{ width: '15%' }} />
                <col style={{ width: '35%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '35%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">판정</th>
                  <td className="border border-black px-2 py-1.5 text-center font-bold">{cert.overall_judgment}</td>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">판정자</th>
                  <td className="border border-black px-2 py-1.5 text-center">{cert.judge_name || '박성철'}</td>
                </tr>
                <tr>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center">결과 통지서 접수자</th>
                  <td colSpan={3} className="border border-black px-2 py-1.5 text-center"></td>
                </tr>
                <tr>
                  <th className="border border-black px-2 py-1.5 bg-gray-100 font-bold text-center align-top">비고</th>
                  <td colSpan={3} className="border border-black p-2" style={{ minHeight: '60px' }}>
                    {cert.notes && (
                      <div className="text-[11px] whitespace-pre-wrap mb-2">{cert.notes}</div>
                    )}
                    {cert.notes_images && cert.notes_images.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {cert.notes_images.map((url, idx) => (
                          <ClickableImage
                            key={idx}
                            src={url}
                            alt={`첨부 ${idx + 1}`}
                            className="max-w-[200px] max-h-[150px] object-contain rounded border border-gray-300"
                          />
                        ))}
                      </div>
                    )}
                    {!cert.notes && (!cert.notes_images || cert.notes_images.length === 0) && (
                      <div style={{ height: '40px' }} />
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Footer */}
            <div className="text-center text-[11px] font-bold mt-8">(주)에바스코스메틱</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────
// Certificates Section
// ─────────────────────────────────────────────
function CertificatesSection({ year }: { year: number }) {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [viewCert, setViewCert] = useState<WaterCertificate | null>(null)
  const [showView, setShowView] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [bulkCreating, setBulkCreating] = useState(false)
  const PAGE_SIZE = 20

  // Reset page when year changes
  useEffect(() => {
    setPage(1)
  }, [year])

  const { data, isLoading } = useQuery({
    queryKey: ['water-certificates', year, page],
    queryFn: () => fetchWaterCertificates({ year, page, pageSize: PAGE_SIZE }),
  })

  const certificates = data?.certificates ?? []
  const totalCount = data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // Handle PDF download
  async function handleDownloadPdf(cert: WaterCertificate) {
    setDownloadingId(cert.id)
    try {
      const blob = await generateWaterCertificatePdf(cert)
      if (!blob) return

      // Upload to Supabase storage
      const supabase = createClient()
      const fileName = `purified-water/${cert.certificate_no}.pdf`
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, blob, { contentType: 'application/pdf', upsert: true })

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName)
        if (urlData?.publicUrl) {
          await updateCertificatePdfUrl(cert.id, urlData.publicUrl)
        }
      }

      // Download
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `정제수_성적서_${cert.certificate_no}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('PDF가 다운로드되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['water-certificates'] })
    } catch (err) {
      console.error(err)
      toast.error('PDF 다운로드 중 오류가 발생했습니다.')
    } finally {
      setDownloadingId(null)
    }
  }

  // Open view dialog
  function handleView(cert: WaterCertificate) {
    setViewCert(cert)
    setShowView(true)
  }

  // Handle delete certificate
  async function handleDeleteCert(id: string) {
    if (!window.confirm('이 성적서를 삭제하시겠습니까?')) return
    try {
      const result = await deleteCertificate(id)
      if (result.error) {
        toast.error(`삭제 실패: ${result.error}`)
        return
      }
      toast.success('성적서가 삭제되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['water-certificates'] })
    } catch (err) {
      console.error(err)
      toast.error('성적서 삭제 중 오류가 발생했습니다.')
    }
  }

  // On certificate created
  function handleCreated() {
    queryClient.invalidateQueries({ queryKey: ['water-certificates'] })
  }

  // Bulk create certificates
  async function handleBulkCreate() {
    if (!window.confirm(`${year}년 측정 데이터를 기반으로 성적서를 일괄 생성하시겠습니까?\n이미 발급된 측정건은 건너뜁니다.`)) return

    setBulkCreating(true)
    try {
      const res = await bulkCreateCertificates({
        years: [year],
        defaultResults: DEFAULT_WATER_TEST_ITEMS.map((item) => ({ ...item })),
        collector_name: '이온유',
        sample_quantity: '200 g',
        collection_location: '제조실',
        judge_name: '박성철',
      })

      if (res.error) {
        toast.error(`일괄 생성 실패: ${res.error}`)
        return
      }
      toast.success(`일괄 생성 완료: ${res.created}건 생성, ${res.skipped}건 건너뜀, ${res.errors}건 오류`)
      queryClient.invalidateQueries({ queryKey: ['water-certificates'] })
    } catch (err) {
      console.error(err)
      toast.error('일괄 생성 중 오류가 발생했습니다.')
    } finally {
      setBulkCreating(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {year}년 성적서 목록
          {!isLoading && <span className="ml-1.5 text-slate-400">({totalCount}건)</span>}
        </p>
        <div className="flex gap-2">
          <Button
            className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={16} />
            새 성적서 발급
          </Button>
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={handleBulkCreate}
            disabled={bulkCreating}
          >
            {bulkCreating ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            일괄 생성
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-2 text-left font-medium text-slate-600">성적서번호</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">시험일</th>
              <th className="px-3 py-2 text-center font-medium text-slate-600">판정</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">채취자</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">판정자</th>
              <th className="px-3 py-2 text-center font-medium text-slate-600">PDF</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">발급일</th>
              <th className="px-3 py-2 text-center font-medium text-slate-600 w-16">삭제</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <Loader2 size={20} className="animate-spin text-amber-500 mx-auto" />
                </td>
              </tr>
            ) : certificates.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                  발급된 성적서가 없습니다.
                </td>
              </tr>
            ) : (
              certificates.map((cert: WaterCertificate) => (
                <tr key={cert.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <button
                      className="text-amber-600 hover:text-amber-700 hover:underline font-medium"
                      onClick={() => handleView(cert)}
                    >
                      {cert.certificate_no ?? '-'}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{formatDate(cert.test_date)}</td>
                  <td className="px-3 py-2 text-center">{judgmentBadge(cert.overall_judgment)}</td>
                  <td className="px-3 py-2 text-slate-600">{cert.collector_name || '-'}</td>
                  <td className="px-3 py-2 text-slate-600">{cert.judge_name || '-'}</td>
                  <td className="px-3 py-2 text-center">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                      onClick={() => handleDownloadPdf(cert)}
                      disabled={downloadingId === cert.id}
                    >
                      {downloadingId === cert.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Download size={14} />
                      )}
                    </Button>
                  </td>
                  <td className="px-3 py-2 text-slate-500 text-xs">
                    {formatDate(cert.created_at)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDeleteCert(cert.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="gap-1"
          >
            <ChevronLeft size={14} />
            이전
          </Button>
          <span className="text-sm text-slate-500 px-3">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="gap-1"
          >
            다음
            <ChevronRight size={14} />
          </Button>
        </div>
      )}

      {/* Create Dialog */}
      <CertificateCreateDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={handleCreated}
      />

      {/* View Dialog */}
      <CertificateViewDialog
        cert={viewCert}
        open={showView}
        onOpenChange={setShowView}
      />
    </div>
  )
}

// ─────────────────────────────────────────────
// Analysis Charts Section
// ─────────────────────────────────────────────
function WaterChart({
  title,
  data,
  isLoading,
}: {
  title: string
  data: ChartMeasurement[]
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">{title}</h3>
        <div className="h-[280px] flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-amber-500" />
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">{title}</h3>
        <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">
          측정 데이터가 없습니다.
        </div>
      </div>
    )
  }

  const phValues = data.filter((d) => d.ph_value != null).map((d) => Number(d.ph_value))
  const resValues = data.filter((d) => d.resistivity != null).map((d) => Number(d.resistivity))
  const conValues = data.filter((d) => d.conductivity != null).map((d) => Number(d.conductivity))
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

  const recentRows = [...data].slice(-12).reverse()

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        <span className="text-xs text-slate-400">{data.length}건</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-[10px] text-amber-700">pH 평균</p>
          <p className="text-sm font-semibold text-amber-800">{avg(phValues).toFixed(3)}</p>
          <p className="text-[10px] text-amber-600">기준 5.0~7.0</p>
        </div>
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
          <p className="text-[10px] text-blue-700">비저항 평균</p>
          <p className="text-sm font-semibold text-blue-800">{avg(resValues).toFixed(3)}</p>
          <p className="text-[10px] text-blue-600">MΩ·cm</p>
        </div>
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
          <p className="text-[10px] text-emerald-700">전기전도도 평균</p>
          <p className="text-sm font-semibold text-emerald-800">{avg(conValues).toFixed(3)}</p>
          <p className="text-[10px] text-emerald-600">μS/cm</p>
        </div>
      </div>

      <div className="border border-slate-200 rounded-md overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-2 py-1.5 text-left font-medium text-slate-600">날짜</th>
              <th className="px-2 py-1.5 text-right font-medium text-slate-600">pH</th>
              <th className="px-2 py-1.5 text-right font-medium text-slate-600">비저항</th>
              <th className="px-2 py-1.5 text-right font-medium text-slate-600">전기전도도</th>
            </tr>
          </thead>
          <tbody>
            {recentRows.map((row, idx) => (
              <tr key={`${row.measurement_date}-${idx}`} className="border-b border-slate-100 last:border-b-0">
                <td className="px-2 py-1.5 text-slate-600">{row.measurement_date}</td>
                <td className="px-2 py-1.5 text-right font-mono text-slate-700">{row.ph_value != null ? Number(row.ph_value).toFixed(3) : '-'}</td>
                <td className="px-2 py-1.5 text-right font-mono text-slate-700">{row.resistivity != null ? Number(row.resistivity).toFixed(3) : '-'}</td>
                <td className="px-2 py-1.5 text-right font-mono text-slate-700">{row.conductivity != null ? Number(row.conductivity).toFixed(3) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AnalysisSection({ year, month }: { year: number; month: number }) {
  const { data: monthlyData, isLoading: monthlyLoading } = useQuery({
    queryKey: ['water-chart-monthly', year, month],
    queryFn: () => fetchMeasurementsForChart({ year, month }),
  })

  const { data: yearlyData, isLoading: yearlyLoading } = useQuery({
    queryKey: ['water-chart-yearly', year],
    queryFn: () => fetchMeasurementsForChart({ year }),
  })

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        {year}년 {month}월 / 연간 측정 데이터 분석
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WaterChart
          title={`${year}년 ${month}월 (월간)`}
          data={monthlyData?.data ?? []}
          isLoading={monthlyLoading}
        />
        <WaterChart
          title={`${year}년 (연간)`}
          data={yearlyData?.data ?? []}
          isLoading={yearlyLoading}
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function PurifiedWaterPage() {
  const [activeTab, setActiveTab] = useState('measurements')

  // Measurement filters
  const [measYear, setMeasYear] = useState(currentYear())
  const [measMonth, setMeasMonth] = useState(currentMonth())

  // Certificate filter
  const [certYear, setCertYear] = useState(currentYear())

  // Analysis filter
  const [analysisYear, setAnalysisYear] = useState(currentYear())
  const [analysisMonth, setAnalysisMonth] = useState(currentMonth())

  const yearOptions = Array.from({ length: currentYear() - 2012 }, (_, i) => currentYear() - i)
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div className="space-y-4 max-w-screen-xl">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-amber-500 rounded-full" />
          <h1 className="text-xl font-bold text-slate-800">정제수 관리</h1>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="measurements" className="gap-1.5">
              <Search size={14} />
              측정 기록
            </TabsTrigger>
            <TabsTrigger value="certificates" className="gap-1.5">
              <FileText size={14} />
              성적서
            </TabsTrigger>
            <TabsTrigger value="analysis" className="gap-1.5">
              <BarChart3 size={14} />
              분석
            </TabsTrigger>
          </TabsList>

          {/* Filters per tab */}
          {activeTab === 'measurements' && (
            <div className="flex items-center gap-2">
              <Select
                value={String(measYear)}
                onValueChange={(v) => setMeasYear(Number(v))}
              >
                <SelectTrigger className="w-28 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}년
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(measMonth)}
                onValueChange={(v) => setMeasMonth(Number(v))}
              >
                <SelectTrigger className="w-24 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m}월
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {activeTab === 'certificates' && (
            <div className="flex items-center gap-2">
              <Select
                value={String(certYear)}
                onValueChange={(v) => setCertYear(Number(v))}
              >
                <SelectTrigger className="w-28 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}년
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="flex items-center gap-2">
              <Select
                value={String(analysisYear)}
                onValueChange={(v) => setAnalysisYear(Number(v))}
              >
                <SelectTrigger className="w-28 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}년
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(analysisMonth)}
                onValueChange={(v) => setAnalysisMonth(Number(v))}
              >
                <SelectTrigger className="w-24 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m}월
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <TabsContent value="measurements" className="mt-4">
          <MeasurementsSection year={measYear} month={measMonth} />
        </TabsContent>

        <TabsContent value="certificates" className="mt-4">
          <CertificatesSection year={certYear} />
        </TabsContent>

        <TabsContent value="analysis" className="mt-4">
          <AnalysisSection year={analysisYear} month={analysisMonth} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
