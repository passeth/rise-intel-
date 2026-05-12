'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
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
  fetchCertificates,
  generateCertificateNo,
  createCertificate,
  updateCertificate,
  deleteCertificate,
  updateCertificatePdfUrl,
  fetchMeasurementByDate,
  fetchMeasurementsForChart,
  bulkCreateCertificates,
  type WaterTestResult,
  type WaterCertificate,
  type ChartMeasurement,
} from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react'

const DEFAULT_WATER_TEST_ITEMS: WaterTestResult[] = [
  { test_item: '성상', criteria: '무색투명액상, 무취, 무미', result: '적합', judgment: '적합', remarks: '일상점검' },
  { test_item: 'pH', criteria: '5.0 ~ 7.0', result: '', judgment: '적합', remarks: '일상점검' },
  { test_item: '염화물', criteria: '액이 변해선 안됨', result: '적합', judgment: '적합', remarks: '일상점검' },
  { test_item: '황산염', criteria: '액이 변해선 안됨', result: '적합', judgment: '적합', remarks: '일상점검' },
  { test_item: '중금속', criteria: '비교액보다 진해선 안됨', result: '적합', judgment: '적합', remarks: '일상점검' },
  { test_item: '잔류염소', criteria: '색을 나타내선 안됨', result: '적합', judgment: '적합', remarks: '주 1회 점검' },
  { test_item: '암모니아', criteria: '액이 변해선 안됨', result: '적합', judgment: '적합', remarks: '주 1회 점검' },
  { test_item: '이산화탄소', criteria: '액이 변해선 안됨', result: '적합', judgment: '적합', remarks: '주 1회 점검' },
  { test_item: '칼륨', criteria: '액이 변해선 안됨', result: '적합', judgment: '적합', remarks: '주 1회 점검' },
  { test_item: '과망간산칼륨환원성물질', criteria: '홍색이 없어져선 안됨', result: '적합', judgment: '적합', remarks: '주 1회 점검' },
  { test_item: '증발잔류물', criteria: '1mg 이하', result: '적합', judgment: '적합', remarks: '주 1회 점검' },
  { test_item: '미생물', criteria: '100 CFU/g 이하', result: '해당사항 없음', judgment: '적합', remarks: '주 1회 점검' },
]

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

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70" onClick={onClose}>
      <button className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/90 grid place-items-center" onClick={onClose}>
        <X size={16} />
      </button>
      <Image
        src={src}
        alt={alt}
        width={1200}
        height={900}
        unoptimized
        className="max-w-[90vw] max-h-[90vh] rounded object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

function ClickableImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Image
        src={src}
        alt={alt}
        width={200}
        height={200}
        unoptimized
        className={`${className || ''} cursor-pointer`}
        onClick={() => setOpen(true)}
      />
      {open ? <ImageLightbox src={src} alt={alt} onClose={() => setOpen(false)} /> : null}
    </>
  )
}

async function generateWaterCertificatePdf(cert: WaterCertificate): Promise<Blob | null> {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    await loadKoreanFont(doc)
    doc.setFont('NanumGothic', 'normal')

    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20

    const boxX = pageWidth - margin - 50
    doc.setFontSize(8)
    doc.setLineWidth(0.3)
    doc.rect(boxX, 15, 10, 16)
    doc.rect(boxX + 10, 15, 20, 8)
    doc.rect(boxX + 30, 15, 20, 8)
    doc.rect(boxX + 10, 23, 20, 8)
    doc.rect(boxX + 30, 23, 20, 8)
    doc.text('결', boxX + 5, 21, { align: 'center' })
    doc.text('재', boxX + 5, 27, { align: 'center' })
    doc.text('담당', boxX + 20, 20, { align: 'center' })
    doc.text('주무부', boxX + 40, 20, { align: 'center' })

    doc.setFontSize(20)
    doc.setFont('NanumGothic', 'bold')
    const title = '정제수 시험 성적서'
    doc.text(title, pageWidth / 2, 50, { align: 'center' })
    const titleWidth = doc.getTextWidth(title)
    doc.setLineWidth(0.5)
    doc.line((pageWidth - titleWidth) / 2, 52, (pageWidth + titleWidth) / 2, 52)

    doc.setFont('NanumGothic', 'normal')
    doc.setFontSize(13)
    const [yyyy, mm, dd] = (cert.test_date || '').split('-')
    doc.text(`${yyyy}년 ${Number.parseInt(mm, 10)}월 ${Number.parseInt(dd, 10)}일`, pageWidth / 2, 62, { align: 'center' })

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
          { content: `${yyyy}.${Number.parseInt(mm, 10)}.${Number.parseInt(dd, 10)}`, styles: { halign: 'center' as const } },
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
      columnStyles: { 0: { cellWidth: 25 }, 2: { cellWidth: 25 } },
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? y + 30

    y += 3
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['시험항목', '시험기준', '시험결과', '비고']],
      body: (cert.results || []).map((r) => [r.test_item, r.criteria, r.result || '', r.remarks || '']),
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
        [{ content: '결과 통지서 접수자', styles: { fillColor: [245, 245, 245], halign: 'center' as const, fontStyle: 'bold' as const } }, { content: '', colSpan: 3, styles: { halign: 'center' as const } }],
        [{ content: '비고', styles: { fillColor: [245, 245, 245], halign: 'center' as const, fontStyle: 'bold' as const } }, { content: cert.notes || '', colSpan: 3, styles: { halign: 'left' as const, minCellHeight: 15 } }],
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3, font: 'NanumGothic', textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2 },
      columnStyles: { 0: { cellWidth: 25 }, 2: { cellWidth: 25 } },
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? y + 30

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
          const img = new window.Image()
          await new Promise<void>((resolve) => {
            img.onload = () => resolve()
            img.src = dataUrl
          })
          let imgW = img.width * 0.264583
          let imgH = img.height * 0.264583
          if (imgW > maxImgWidth) {
            const ratio = maxImgWidth / imgW
            imgW = maxImgWidth
            imgH *= ratio
          }
          if (imgH > maxImgHeight) {
            const ratio = maxImgHeight / imgH
            imgH = maxImgHeight
            imgW *= ratio
          }
          if (y + imgH + 10 > doc.internal.pageSize.getHeight() - 20) {
            doc.addPage()
            y = 20
          }
          doc.addImage(dataUrl, 'JPEG', margin, y, imgW, imgH)
          y += imgH + 3
        } catch {
          continue
        }
      }
    }

    y += 15
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

function uploadImages(setter: React.Dispatch<React.SetStateAction<string[]>>) {
  return async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const supabase = createClient()
    const urls: string[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > 5 * 1024 * 1024) continue
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = `purified-water/notes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error } = await supabase.storage.from('documents').upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      })
      if (error) continue
      const { data } = supabase.storage.from('documents').getPublicUrl(fileName)
      if (data?.publicUrl) urls.push(data.publicUrl)
    }
    if (urls.length > 0) setter((prev) => [...prev, ...urls])
    e.target.value = ''
  }
}

function MiniLineChart({ title, data, loading }: { title: string; data: ChartMeasurement[]; loading: boolean }) {
  if (loading) {
    return <div className="h-[260px] rounded-lg border border-slate-200 bg-white grid place-items-center"><Loader2 className="animate-spin text-amber-500" /></div>
  }
  if (data.length === 0) {
    return <div className="h-[260px] rounded-lg border border-slate-200 bg-white grid place-items-center text-slate-400 text-sm">데이터 없음</div>
  }

  const width = 680
  const height = 240
  const padX = 36
  const padY = 20
  const values = data.flatMap((d) => [d.ph_value, d.resistivity, d.conductivity]).filter((v): v is number => v != null).map((v) => Number(v))
  const minY = Math.min(...values) - 0.2
  const maxY = Math.max(...values) + 0.2
  const span = maxY - minY || 1

  const build = (metric: 'ph_value' | 'resistivity' | 'conductivity') => {
    const points = data
      .map((d, i) => {
        const v = metric === 'ph_value' ? d.ph_value : metric === 'resistivity' ? d.resistivity : d.conductivity
        if (v == null) return null
        const x = padX + (data.length <= 1 ? (width - padX * 2) / 2 : (i / (data.length - 1)) * (width - padX * 2))
        const y = padY + ((maxY - Number(v)) / span) * (height - padY * 2)
        return `${x},${y}`
      })
      .filter(Boolean)
    return points.join(' ')
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <div className="text-[11px] text-slate-500 flex gap-3">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />pH</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />비저항</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />전기전도도</span>
        </div>
      </div>
      <div className="overflow-x-auto border border-slate-200 rounded">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[640px] h-[220px] bg-gradient-to-b from-slate-50 to-white">
          <polyline points={build('ph_value')} fill="none" stroke="#f59e0b" strokeWidth="2.2" />
          <polyline points={build('resistivity')} fill="none" stroke="#3b82f6" strokeWidth="2.2" />
          <polyline points={build('conductivity')} fill="none" stroke="#10b981" strokeWidth="2.2" />
        </svg>
      </div>
    </div>
  )
}

function MeasurementsSection({ year, month }: { year: number; month: number }) {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const pageSize = 20

  const [createForm, setCreateForm] = useState({ measurement_date: todayStr(), measurement_time: '08:30', ph_value: '', resistivity: '', conductivity: '', maintenance_note: '', recorded_by: '' })
  const [editForm, setEditForm] = useState({ ph_value: '', resistivity: '', conductivity: '', maintenance_note: '', recorded_by: '' })

  useEffect(() => setPage(1), [year, month])

  const { data, isLoading } = useQuery({ queryKey: ['v2-water-measurements', year, month, page], queryFn: () => fetchMeasurements({ year, month, page, pageSize }) })
  const { data: monthly, isLoading: monthlyLoading } = useQuery({ queryKey: ['v2-water-chart-monthly', year, month], queryFn: () => fetchMeasurementsForChart({ year, month }) })
  const { data: yearly, isLoading: yearlyLoading } = useQuery({ queryKey: ['v2-water-chart-yearly', year], queryFn: () => fetchMeasurementsForChart({ year }) })

  const measurements = data?.measurements ?? []
  const totalCount = data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  async function handleCreate() {
    if (!createForm.measurement_date) return toast.error('측정일을 입력해주세요.')
    setSaving(true)
    try {
      const res = await createMeasurement({
        measurement_date: createForm.measurement_date,
        measurement_time: createForm.measurement_time || undefined,
        ph_value: createForm.ph_value ? Number.parseFloat(createForm.ph_value) : undefined,
        resistivity: createForm.resistivity ? Number.parseFloat(createForm.resistivity) : undefined,
        conductivity: createForm.conductivity ? Number.parseFloat(createForm.conductivity) : undefined,
        maintenance_note: createForm.maintenance_note || undefined,
        recorded_by: createForm.recorded_by || undefined,
      })
      if (res.error) return toast.error(`등록 실패: ${res.error}`)
      setShowCreate(false)
      queryClient.invalidateQueries({ queryKey: ['v2-water-measurements'] })
      queryClient.invalidateQueries({ queryKey: ['v2-water-chart'] })
      toast.success('측정 기록이 등록되었습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate() {
    if (!editingId) return
    setSaving(true)
    try {
      const res = await updateMeasurement(editingId, {
        ph_value: editForm.ph_value ? Number.parseFloat(editForm.ph_value) : undefined,
        resistivity: editForm.resistivity ? Number.parseFloat(editForm.resistivity) : undefined,
        conductivity: editForm.conductivity ? Number.parseFloat(editForm.conductivity) : undefined,
        maintenance_note: editForm.maintenance_note || undefined,
        recorded_by: editForm.recorded_by || undefined,
      })
      if (res.error) return toast.error(`수정 실패: ${res.error}`)
      setEditingId(null)
      queryClient.invalidateQueries({ queryKey: ['v2-water-measurements'] })
      queryClient.invalidateQueries({ queryKey: ['v2-water-chart'] })
      toast.success('측정 기록이 수정되었습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('이 측정 기록을 삭제하시겠습니까?')) return
    const res = await deleteMeasurement(id)
    if (res.error) return toast.error(`삭제 실패: ${res.error}`)
    queryClient.invalidateQueries({ queryKey: ['v2-water-measurements'] })
    queryClient.invalidateQueries({ queryKey: ['v2-water-chart'] })
    toast.success('측정 기록이 삭제되었습니다.')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{year}년 {month}월 측정 기록 {!isLoading ? <span className="text-slate-400">({totalCount}건)</span> : null}</p>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5"><Plus size={16} />새 측정 기록</Button></DialogTrigger>
          <DialogContent className="max-w-lg" showCloseButton={false} aria-describedby={undefined}>
            <DialogHeader><DialogTitle>새 측정 기록</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={createForm.measurement_date} onChange={(e) => setCreateForm((p) => ({ ...p, measurement_date: e.target.value }))} />
                <Input type="time" value={createForm.measurement_time} onChange={(e) => setCreateForm((p) => ({ ...p, measurement_time: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input type="number" step="0.001" placeholder="pH" value={createForm.ph_value} onChange={(e) => setCreateForm((p) => ({ ...p, ph_value: e.target.value }))} />
                <Input type="number" step="0.001" placeholder="비저항" value={createForm.resistivity} onChange={(e) => setCreateForm((p) => ({ ...p, resistivity: e.target.value }))} />
                <Input type="number" step="0.001" placeholder="전기전도도" value={createForm.conductivity} onChange={(e) => setCreateForm((p) => ({ ...p, conductivity: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="비고" value={createForm.maintenance_note} onChange={(e) => setCreateForm((p) => ({ ...p, maintenance_note: e.target.value }))} />
                <Input placeholder="기록자" value={createForm.recorded_by} onChange={(e) => setCreateForm((p) => ({ ...p, recorded_by: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreate(false)}>취소</Button>
                <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={handleCreate}>{saving ? <Loader2 className="animate-spin mr-1" size={14} /> : null}등록</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 border-b border-slate-200"><th className="px-3 py-2 text-left">날짜</th><th className="px-3 py-2 text-left">시간</th><th className="px-3 py-2 text-right">pH</th><th className="px-3 py-2 text-right">비저항</th><th className="px-3 py-2 text-right">전기전도도</th><th className="px-3 py-2 text-left">비고</th><th className="px-3 py-2 text-left">기록자</th><th className="px-3 py-2 text-center">작업</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={8} className="py-12 text-center"><Loader2 className="animate-spin text-amber-500 mx-auto" /></td></tr> : null}
            {!isLoading && measurements.length === 0 ? <tr><td colSpan={8} className="py-12 text-center text-slate-400">측정 기록이 없습니다.</td></tr> : null}
            {!isLoading && measurements.map((m) => {
              const isEditing = editingId === m.id
              if (isEditing) {
                return (
                  <tr key={m.id} className="border-b border-slate-100 bg-amber-50/40">
                    <td className="px-3 py-2">{formatDate(m.measurement_date)}</td>
                    <td className="px-3 py-2">{m.measurement_time || '-'}</td>
                    <td className="px-3 py-1"><Input type="number" step="0.001" className="h-8 text-right" value={editForm.ph_value} onChange={(e) => setEditForm((p) => ({ ...p, ph_value: e.target.value }))} /></td>
                    <td className="px-3 py-1"><Input type="number" step="0.001" className="h-8 text-right" value={editForm.resistivity} onChange={(e) => setEditForm((p) => ({ ...p, resistivity: e.target.value }))} /></td>
                    <td className="px-3 py-1"><Input type="number" step="0.001" className="h-8 text-right" value={editForm.conductivity} onChange={(e) => setEditForm((p) => ({ ...p, conductivity: e.target.value }))} /></td>
                    <td className="px-3 py-1"><Input className="h-8" value={editForm.maintenance_note} onChange={(e) => setEditForm((p) => ({ ...p, maintenance_note: e.target.value }))} /></td>
                    <td className="px-3 py-1"><Input className="h-8" value={editForm.recorded_by} onChange={(e) => setEditForm((p) => ({ ...p, recorded_by: e.target.value }))} /></td>
                    <td className="px-3 py-1 text-center"><div className="flex justify-center gap-1"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleUpdate}>{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}</Button><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}><X size={14} /></Button></div></td>
                  </tr>
                )
              }
              return (
                <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2">{formatDate(m.measurement_date)}</td>
                  <td className="px-3 py-2">{m.measurement_time || '-'}</td>
                  <td className="px-3 py-2 text-right">{m.ph_value != null ? Number(m.ph_value).toFixed(3) : '-'}</td>
                  <td className="px-3 py-2 text-right">{m.resistivity != null ? Number(m.resistivity).toFixed(3) : '-'}</td>
                  <td className="px-3 py-2 text-right">{m.conductivity != null ? Number(m.conductivity).toFixed(3) : '-'}</td>
                  <td className="px-3 py-2">{m.maintenance_note || '-'}</td>
                  <td className="px-3 py-2">{m.recorded_by || '-'}</td>
                  <td className="px-3 py-2 text-center"><div className="flex justify-center gap-1"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(m.id); setEditForm({ ph_value: m.ph_value != null ? String(m.ph_value) : '', resistivity: m.resistivity != null ? String(m.resistivity) : '', conductivity: m.conductivity != null ? String(m.conductivity) : '', maintenance_note: m.maintenance_note || '', recorded_by: m.recorded_by || '' }) }}><Pencil size={14} /></Button><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(m.id)}><Trash2 size={14} /></Button></div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? <div className="flex justify-center gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={14} />이전</Button><span className="text-sm px-2">{page} / {totalPages}</span><Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>다음<ChevronRight size={14} /></Button></div> : null}

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-slate-700"><BarChart3 size={16} className="text-amber-500" /><p className="text-sm font-semibold">트렌드</p></div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <MiniLineChart title={`${year}년 ${month}월`} data={monthly?.data ?? []} loading={monthlyLoading} />
          <MiniLineChart title={`${year}년 연간`} data={yearly?.data ?? []} loading={yearlyLoading} />
        </div>
      </div>
    </div>
  )
}

function CertificateCreateDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const { user } = useUser()
  const [saving, setSaving] = useState(false)
  const [certNo, setCertNo] = useState('')
  const [testDate, setTestDate] = useState(todayStr())
  const [collectorName, setCollectorName] = useState('이온유')
  const [sampleQuantity, setSampleQuantity] = useState('200 g')
  const [collectionLocation, setCollectionLocation] = useState('제조실')
  const [judgeName, setJudgeName] = useState('박성철')
  const [results, setResults] = useState<WaterTestResult[]>(DEFAULT_WATER_TEST_ITEMS.map((i) => ({ ...i })))
  const [notesText, setNotesText] = useState('')
  const [notesImages, setNotesImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!open) return
    generateCertificateNo().then(setCertNo).catch(() => setCertNo(''))
    setResults(DEFAULT_WATER_TEST_ITEMS.map((i) => ({ ...i })))
    setNotesText('')
    setNotesImages([])
  }, [open])

  useEffect(() => {
    if (!open || !testDate) return
    fetchMeasurementByDate(testDate).then((res) => {
      if (res.measurement?.ph_value == null) return
      setResults((prev) => prev.map((r) => r.test_item === 'pH' ? { ...r, result: String(Number(res.measurement?.ph_value).toFixed(3)) } : r))
    })
  }, [open, testDate])

  const overallJudgment = useMemo(() => results.every((r) => r.judgment === '적합') ? '합격함' : '불합격', [results])
  const onUpload = uploadImages(setNotesImages)

  async function submit() {
    if (!certNo || !testDate) return toast.error('성적서번호/시험일을 확인해주세요.')
    setSaving(true)
    try {
      const res = await createCertificate({
        certificate_no: certNo,
        test_date: testDate,
        results,
        overall_judgment: overallJudgment,
        recorded_by: user?.name || undefined,
        collector_name: collectorName,
        sample_quantity: sampleQuantity,
        collection_location: collectionLocation,
        judge_name: judgeName,
        notes: notesText || undefined,
        notes_images: notesImages.length ? notesImages : undefined,
      })
      if (res.error) return toast.error(`발급 실패: ${res.error}`)
      toast.success('성적서가 발급되었습니다.')
      onOpenChange(false)
      onCreated()
    } finally {
      setSaving(false)
    }
  }

  const [yyyy, mm, dd] = (testDate || '').split('-')
  const dateTitle = yyyy ? `${yyyy}년 ${Number.parseInt(mm, 10)}월 ${Number.parseInt(dd, 10)}일` : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[760px] max-w-[760px] sm:max-w-[760px] max-h-[95vh] overflow-y-auto p-0" showCloseButton={false} aria-describedby={undefined}>
        <div className="sticky top-0 z-10 flex justify-between items-center px-4 py-2 bg-slate-50 border-b"><DialogTitle className="text-sm">새 성적서 발급</DialogTitle><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>취소</Button><Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={submit}>{saving ? <Loader2 size={14} className="animate-spin mr-1" /> : <Plus size={14} className="mr-1" />}발급</Button></div></div>
        <div className="flex justify-center p-2 bg-slate-100"><div className="bg-white shadow-lg w-full" style={{ padding: '20mm', minHeight: '900px', fontFamily: 'Malgun Gothic, Dotum, sans-serif' }}>
          <h1 className="text-center text-[22px] font-bold tracking-wider mb-2 underline underline-offset-4">정제수 시험 성적서</h1>
          <div className="text-center mb-6 flex items-center justify-center gap-2"><span className="text-[14px] font-bold">{dateTitle || '시험일 선택'}</span><Input type="date" className="h-7 w-36 text-xs" value={testDate} onChange={(e) => setTestDate(e.target.value)} /></div>
          <table className="w-full border-collapse text-[11px] mb-4"><tbody>
            <tr><th className="border border-black px-2 py-1.5 bg-gray-100">원료명</th><td className="border border-black px-2 py-1.5 text-center">정제수</td><th className="border border-black px-2 py-1.5 bg-gray-100">검체채취량</th><td className="border border-black p-0"><input className="w-full px-2 py-1.5 text-center text-[11px] border-0 outline-none" value={sampleQuantity} onChange={(e) => setSampleQuantity(e.target.value)} /></td></tr>
            <tr><th className="border border-black px-2 py-1.5 bg-gray-100">시험일자</th><td className="border border-black px-2 py-1.5 text-center">{yyyy ? `${yyyy}.${Number.parseInt(mm, 10)}.${Number.parseInt(dd, 10)}` : '-'}</td><th className="border border-black px-2 py-1.5 bg-gray-100">채취장소</th><td className="border border-black p-0"><input className="w-full px-2 py-1.5 text-center text-[11px] border-0 outline-none" value={collectionLocation} onChange={(e) => setCollectionLocation(e.target.value)} /></td></tr>
            <tr><th className="border border-black px-2 py-1.5 bg-gray-100">채취자</th><td className="border border-black p-0"><input className="w-full px-2 py-1.5 text-center text-[11px] border-0 outline-none" value={collectorName} onChange={(e) => setCollectorName(e.target.value)} /></td><th className="border border-black px-2 py-1.5 bg-gray-100">비고</th><td className="border border-black px-2 py-1.5" /></tr>
          </tbody></table>
          <table className="w-full border-collapse text-[11px] mb-4"><thead><tr><th className="border border-black px-2 py-2 bg-gray-100">시험항목</th><th className="border border-black px-2 py-2 bg-gray-100">시험기준</th><th className="border border-black px-2 py-2 bg-gray-100">시험결과</th><th className="border border-black px-2 py-2 bg-gray-100">비고</th></tr></thead><tbody>{results.map((r, i) => <tr key={`${r.test_item}-${i}`}><th className="border border-black px-2 py-1.5 bg-gray-100">{r.test_item}</th><td className="border border-black px-2 py-1.5 text-center">{r.criteria}</td><td className="border border-black p-0"><input className="w-full px-2 py-1.5 text-center text-[11px] border-0 outline-none" value={r.result} onChange={(e) => setResults((prev) => prev.map((v, idx) => idx === i ? { ...v, result: e.target.value } : v))} /></td><td className="border border-black px-2 py-1.5 text-center">{r.remarks || ''}</td></tr>)}</tbody></table>
          <table className="w-full border-collapse text-[11px] mt-5"><tbody><tr><th className="border border-black px-2 py-1.5 bg-gray-100">판정</th><td className="border border-black px-2 py-1.5 text-center font-bold">{overallJudgment}</td><th className="border border-black px-2 py-1.5 bg-gray-100">판정자</th><td className="border border-black p-0"><input className="w-full px-2 py-1.5 text-center text-[11px] border-0 outline-none" value={judgeName} onChange={(e) => setJudgeName(e.target.value)} /></td></tr><tr><th className="border border-black px-2 py-1.5 bg-gray-100 align-top">비고</th><td colSpan={3} className="border border-black p-2"><textarea className="w-full text-[11px] border-0 outline-none resize-none min-h-[40px]" rows={2} value={notesText} onChange={(e) => setNotesText(e.target.value)} />{notesImages.length > 0 ? <div className="flex flex-wrap gap-2 mt-2">{notesImages.map((url, idx) => <div key={`${url}-${idx}`} className="relative group"><ClickableImage src={url} alt={`첨부 ${idx + 1}`} className="w-24 h-24 object-cover rounded border" /><button type="button" className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100" onClick={() => setNotesImages((prev) => prev.filter((_, i2) => i2 !== idx))}><X size={10} /></button></div>)}</div> : null}<div className="mt-2"><label className="inline-flex items-center gap-1 px-2 py-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded cursor-pointer">{uploading ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}사진 첨부<input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => { setUploading(true); try { await onUpload(e) } finally { setUploading(false) } }} disabled={uploading} /></label></div></td></tr></tbody></table>
          <div className="text-center text-[11px] font-bold mt-8">(주)에바스코스메틱</div>
        </div></div>
      </DialogContent>
    </Dialog>
  )
}

function CertificateViewDialog({ cert, open, onOpenChange }: { cert: WaterCertificate | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient()
  const [isGenerating, setIsGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [edit, setEdit] = useState(false)
  const [results, setResults] = useState<WaterTestResult[]>([])
  const [collectorName, setCollectorName] = useState('')
  const [sampleQuantity, setSampleQuantity] = useState('')
  const [collectionLocation, setCollectionLocation] = useState('')
  const [judgeName, setJudgeName] = useState('')
  const [notes, setNotes] = useState('')
  const [images, setImages] = useState<string[]>([])

  useEffect(() => {
    if (!cert) return
    setResults((cert.results || []).map((r) => ({ ...r })))
    setCollectorName(cert.collector_name || '이온유')
    setSampleQuantity(cert.sample_quantity || '200 g')
    setCollectionLocation(cert.collection_location || '제조실')
    setJudgeName(cert.judge_name || '박성철')
    setNotes(cert.notes || '')
    setImages(cert.notes_images || [])
    setEdit(false)
  }, [cert])

  if (!cert) return null
  const overallJudgment = results.every((r) => r.judgment === '적합') ? '합격함' : '불합격'
  const certRef = cert

  async function saveChanges() {
    setSaving(true)
    try {
      const res = await updateCertificate(certRef.id, {
        results,
        overall_judgment: overallJudgment,
        collector_name: collectorName,
        sample_quantity: sampleQuantity,
        collection_location: collectionLocation,
        judge_name: judgeName,
        notes,
        notes_images: images,
      })
      if (res.error) return toast.error(`수정 실패: ${res.error}`)
      queryClient.invalidateQueries({ queryKey: ['v2-water-certificates'] })
      setEdit(false)
      toast.success('성적서가 수정되었습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function downloadPdf() {
    setIsGenerating(true)
    try {
      const source: WaterCertificate = { ...certRef, results, overall_judgment: overallJudgment, collector_name: collectorName, sample_quantity: sampleQuantity, collection_location: collectionLocation, judge_name: judgeName, notes, notes_images: images }
      const blob = await generateWaterCertificatePdf(source)
      if (!blob) return
      const supabase = createClient()
      const fileName = `purified-water/${certRef.certificate_no}.pdf`
      const { error } = await supabase.storage.from('documents').upload(fileName, blob, { contentType: 'application/pdf', upsert: true })
      if (!error) {
        const { data } = supabase.storage.from('documents').getPublicUrl(fileName)
        if (data?.publicUrl) await updateCertificatePdfUrl(certRef.id, data.publicUrl)
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `정제수_성적서_${certRef.certificate_no}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      queryClient.invalidateQueries({ queryKey: ['v2-water-certificates'] })
    } finally {
      setIsGenerating(false)
    }
  }

  const [yyyy, mm, dd] = (certRef.test_date || '').split('-')
  const dateTitle = yyyy ? `${yyyy}년 ${Number.parseInt(mm, 10)}월 ${Number.parseInt(dd, 10)}일` : '-'
  const dateShort = yyyy ? `${yyyy}.${Number.parseInt(mm, 10)}.${Number.parseInt(dd, 10)}` : '-'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[760px] max-w-[760px] sm:max-w-[760px] max-h-[95vh] overflow-y-auto p-0" showCloseButton={false} aria-describedby={undefined}>
        <div className="sticky top-0 z-10 flex justify-between items-center px-4 py-2 bg-slate-50 border-b">
          <DialogTitle className="text-sm">성적서 미리보기</DialogTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEdit((v) => !v)}><Pencil size={14} className="mr-1" />{edit ? '편집취소' : '편집'}</Button>
            {edit ? <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={saveChanges}>{saving ? <Loader2 size={14} className="animate-spin mr-1" /> : <Save size={14} className="mr-1" />}저장</Button> : null}
            <Button variant="outline" size="sm" onClick={downloadPdf}>{isGenerating ? <Loader2 size={14} className="animate-spin mr-1" /> : <Download size={14} className="mr-1" />}PDF</Button>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}><X size={14} /></Button>
          </div>
        </div>
        <div className="flex justify-center p-2 bg-slate-100"><div className="bg-white shadow-lg w-full" style={{ padding: '20mm', minHeight: '900px', fontFamily: 'Malgun Gothic, Dotum, sans-serif' }}>
          <h1 className="text-center text-[22px] font-bold tracking-wider mb-2 underline underline-offset-4">정제수 시험 성적서</h1>
          <div className="text-center text-[14px] font-bold mb-6">{dateTitle}</div>
          <table className="w-full border-collapse text-[11px] mb-4"><tbody>
            <tr><th className="border border-black px-2 py-1.5 bg-gray-100">원료명</th><td className="border border-black px-2 py-1.5 text-center">정제수</td><th className="border border-black px-2 py-1.5 bg-gray-100">검체채취량</th><td className="border border-black px-2 py-1.5 text-center">{edit ? <input className="w-full text-center border-0 outline-none" value={sampleQuantity} onChange={(e) => setSampleQuantity(e.target.value)} /> : sampleQuantity}</td></tr>
            <tr><th className="border border-black px-2 py-1.5 bg-gray-100">시험일자</th><td className="border border-black px-2 py-1.5 text-center">{dateShort}</td><th className="border border-black px-2 py-1.5 bg-gray-100">채취장소</th><td className="border border-black px-2 py-1.5 text-center">{edit ? <input className="w-full text-center border-0 outline-none" value={collectionLocation} onChange={(e) => setCollectionLocation(e.target.value)} /> : collectionLocation}</td></tr>
            <tr><th className="border border-black px-2 py-1.5 bg-gray-100">채취자</th><td className="border border-black px-2 py-1.5 text-center">{edit ? <input className="w-full text-center border-0 outline-none" value={collectorName} onChange={(e) => setCollectorName(e.target.value)} /> : collectorName}</td><th className="border border-black px-2 py-1.5 bg-gray-100">비고</th><td className="border border-black px-2 py-1.5 text-center">{notes || ''}</td></tr>
          </tbody></table>
          <table className="w-full border-collapse text-[11px] mb-4"><thead><tr><th className="border border-black px-2 py-2 bg-gray-100">시험항목</th><th className="border border-black px-2 py-2 bg-gray-100">시험기준</th><th className="border border-black px-2 py-2 bg-gray-100">시험결과</th><th className="border border-black px-2 py-2 bg-gray-100">비고</th></tr></thead><tbody>{results.map((r, i) => <tr key={`${r.test_item}-${i}`}><th className="border border-black px-2 py-1.5 bg-gray-100">{r.test_item}</th><td className="border border-black px-2 py-1.5 text-center">{r.criteria}</td><td className="border border-black px-2 py-1.5 text-center">{edit ? <input className="w-full text-center border-0 outline-none" value={r.result} onChange={(e) => setResults((prev) => prev.map((v, idx) => idx === i ? { ...v, result: e.target.value } : v))} /> : r.result}</td><td className="border border-black px-2 py-1.5 text-center">{r.remarks || ''}</td></tr>)}</tbody></table>
          <table className="w-full border-collapse text-[11px] mt-5"><tbody><tr><th className="border border-black px-2 py-1.5 bg-gray-100">판정</th><td className="border border-black px-2 py-1.5 text-center font-bold">{overallJudgment}</td><th className="border border-black px-2 py-1.5 bg-gray-100">판정자</th><td className="border border-black px-2 py-1.5 text-center">{edit ? <input className="w-full text-center border-0 outline-none" value={judgeName} onChange={(e) => setJudgeName(e.target.value)} /> : judgeName}</td></tr><tr><th className="border border-black px-2 py-1.5 bg-gray-100 align-top">비고</th><td colSpan={3} className="border border-black p-2">{edit ? <textarea className="w-full text-[11px] border-0 outline-none resize-none min-h-[40px]" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /> : <div className="text-[11px] whitespace-pre-wrap mb-2">{notes}</div>}{images.length > 0 ? <div className="flex flex-wrap gap-2">{images.map((url, idx) => <div key={`${url}-${idx}`} className="relative group"><ClickableImage src={url} alt={`첨부 ${idx + 1}`} className="max-w-[200px] max-h-[150px] object-contain rounded border" />{edit ? <button type="button" className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100" onClick={() => setImages((prev) => prev.filter((_, i2) => i2 !== idx))}><X size={10} /></button> : null}</div>)}</div> : null}{edit ? <div className="mt-2"><label className="inline-flex items-center gap-1 px-2 py-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded cursor-pointer">사진 첨부<input type="file" accept="image/*" multiple className="hidden" onChange={uploadImages(setImages)} /></label></div> : null}</td></tr></tbody></table>
        </div></div>
      </DialogContent>
    </Dialog>
  )
}

function CertificatesSection({ year }: { year: number }) {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [viewCert, setViewCert] = useState<WaterCertificate | null>(null)
  const [showView, setShowView] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [bulkCreating, setBulkCreating] = useState(false)
  const pageSize = 20

  useEffect(() => setPage(1), [year])
  const { data, isLoading } = useQuery({ queryKey: ['v2-water-certificates', year, page], queryFn: () => fetchCertificates({ year, page, pageSize }) })
  const certificates = data?.certificates ?? []
  const totalCount = data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  async function handleDownloadPdf(cert: WaterCertificate) {
    setDownloadingId(cert.id)
    try {
      const blob = await generateWaterCertificatePdf(cert)
      if (!blob) return
      const supabase = createClient()
      const fileName = `purified-water/${cert.certificate_no}.pdf`
      const { error } = await supabase.storage.from('documents').upload(fileName, blob, { contentType: 'application/pdf', upsert: true })
      if (!error) {
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName)
        if (urlData?.publicUrl) await updateCertificatePdfUrl(cert.id, urlData.publicUrl)
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `정제수_성적서_${cert.certificate_no}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('PDF가 다운로드되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['v2-water-certificates'] })
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleBulkCreate() {
    if (!window.confirm(`${year}년 측정 데이터를 기반으로 성적서를 일괄 생성하시겠습니까?\n이미 발급된 측정건은 건너뜁니다.`)) return
    setBulkCreating(true)
    try {
      const res = await bulkCreateCertificates({ years: [year], defaultResults: DEFAULT_WATER_TEST_ITEMS.map((i) => ({ ...i })), collector_name: '이온유', sample_quantity: '200 g', collection_location: '제조실', judge_name: '박성철' })
      if (res.error) return toast.error(`일괄 생성 실패: ${res.error}`)
      toast.success(`일괄 생성 완료: ${res.created}건 생성, ${res.skipped}건 건너뜀, ${res.errors}건 오류`)
      queryClient.invalidateQueries({ queryKey: ['v2-water-certificates'] })
    } finally {
      setBulkCreating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><p className="text-sm text-slate-500">{year}년 성적서 목록 {!isLoading ? <span className="text-slate-400">({totalCount}건)</span> : null}</p><div className="flex gap-2"><Button className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5" onClick={() => setShowCreate(true)}><Plus size={16} />새 성적서 발급</Button><Button variant="outline" onClick={handleBulkCreate}>{bulkCreating ? <Loader2 size={14} className="animate-spin mr-1" /> : <FileText size={14} className="mr-1" />}일괄 생성</Button></div></div>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden"><table className="w-full text-sm"><thead><tr className="bg-slate-50 border-b border-slate-200"><th className="px-3 py-2 text-left">성적서번호</th><th className="px-3 py-2 text-left">시험일</th><th className="px-3 py-2 text-center">판정</th><th className="px-3 py-2 text-left">채취자</th><th className="px-3 py-2 text-left">판정자</th><th className="px-3 py-2 text-center">PDF</th><th className="px-3 py-2 text-left">발급일</th><th className="px-3 py-2 text-center">삭제</th></tr></thead><tbody>
        {isLoading ? <tr><td colSpan={8} className="py-12 text-center"><Loader2 className="animate-spin text-amber-500 mx-auto" /></td></tr> : null}
        {!isLoading && certificates.length === 0 ? <tr><td colSpan={8} className="py-12 text-center text-slate-400">발급된 성적서가 없습니다.</td></tr> : null}
        {!isLoading && certificates.map((cert) => <tr key={cert.id} className="border-b border-slate-100 hover:bg-slate-50"><td className="px-3 py-2"><button className="text-amber-600 hover:underline" onClick={() => { setViewCert(cert); setShowView(true) }}>{cert.certificate_no || '-'}</button></td><td className="px-3 py-2">{formatDate(cert.test_date)}</td><td className="px-3 py-2 text-center">{judgmentBadge(cert.overall_judgment)}</td><td className="px-3 py-2">{cert.collector_name || '-'}</td><td className="px-3 py-2">{cert.judge_name || '-'}</td><td className="px-3 py-2 text-center"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownloadPdf(cert)}>{downloadingId === cert.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}</Button></td><td className="px-3 py-2 text-xs">{formatDate(cert.created_at)}</td><td className="px-3 py-2 text-center"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={async () => { if (!window.confirm('이 성적서를 삭제하시겠습니까?')) return; const res = await deleteCertificate(cert.id); if (res.error) return toast.error(`삭제 실패: ${res.error}`); queryClient.invalidateQueries({ queryKey: ['v2-water-certificates'] }) }}><Trash2 size={14} /></Button></td></tr>)}
      </tbody></table></div>
      {totalPages > 1 ? <div className="flex justify-center gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={14} />이전</Button><span className="text-sm px-2">{page} / {totalPages}</span><Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>다음<ChevronRight size={14} /></Button></div> : null}
      <CertificateCreateDialog open={showCreate} onOpenChange={setShowCreate} onCreated={() => queryClient.invalidateQueries({ queryKey: ['v2-water-certificates'] })} />
      <CertificateViewDialog cert={viewCert} open={showView} onOpenChange={setShowView} />
    </div>
  )
}

export default function V2QcPurifiedWaterPage() {
  const [activeTab, setActiveTab] = useState('measurements')
  const [measYear, setMeasYear] = useState(currentYear())
  const [measMonth, setMeasMonth] = useState(currentMonth())
  const [certYear, setCertYear] = useState(currentYear())

  const yearOptions = Array.from({ length: currentYear() - 2012 }, (_, i) => currentYear() - i)
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div className="space-y-4 max-w-screen-xl">
      <div className="flex items-center gap-3"><div className="w-1 h-6 bg-amber-500 rounded-full" /><h1 className="text-xl font-bold text-slate-800">정제수 관리</h1></div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="measurements" className="gap-1.5"><Search size={14} />측정기록</TabsTrigger>
            <TabsTrigger value="certificates" className="gap-1.5"><FileText size={14} />성적서발급</TabsTrigger>
          </TabsList>
          {activeTab === 'measurements' ? <div className="flex items-center gap-2"><Select value={String(measYear)} onValueChange={(v) => setMeasYear(Number(v))}><SelectTrigger className="w-28 h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent>{yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}년</SelectItem>)}</SelectContent></Select><Select value={String(measMonth)} onValueChange={(v) => setMeasMonth(Number(v))}><SelectTrigger className="w-24 h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent>{monthOptions.map((m) => <SelectItem key={m} value={String(m)}>{m}월</SelectItem>)}</SelectContent></Select></div> : null}
          {activeTab === 'certificates' ? <div className="flex items-center gap-2"><Select value={String(certYear)} onValueChange={(v) => setCertYear(Number(v))}><SelectTrigger className="w-28 h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent>{yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}년</SelectItem>)}</SelectContent></Select></div> : null}
        </div>
        <TabsContent value="measurements" className="mt-4"><MeasurementsSection year={measYear} month={measMonth} /></TabsContent>
        <TabsContent value="certificates" className="mt-4"><CertificatesSection year={certYear} /></TabsContent>
      </Tabs>
    </div>
  )
}
