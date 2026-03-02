'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/providers/user-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  Trash2,
  Save,
  ShieldAlert,
  ArrowLeft,
} from 'lucide-react'
import {
  saveProductBasicInfo,
  saveProductBom,
  saveProductQcSpecs,
  saveProductEnglishSpecs,
  saveProductInciData,
  saveProductSubsidiaryMaterials,
  saveProductWorkSpecs,
  saveManufacturingProcess,
  saveProductRevisions,
  fetchProductAllData,
  type BasicInfoData,
  type BomRow,
  type QcSpecRow,
  type EnglishSpecRow,
  type InciData,
  type SubsidiaryMaterialRow,
  type WorkSpecData,
  type ProcessHeaderData,
  type ProcessStepRow,
  type RevisionRow,
} from './actions'

const STEPS = [
  { id: 1, title: '기본정보', short: '기본' },
  { id: 2, title: 'BOM 원료구성', short: 'BOM' },
  { id: 3, title: '시험기준', short: '시험' },
  { id: 4, title: '영문성적서', short: '영문' },
  { id: 5, title: '전성분 (INCI)', short: 'INCI' },
  { id: 6, title: '부자재', short: '부자재' },
  { id: 7, title: '작업기준서', short: '작업' },
  { id: 8, title: '제조공정', short: '공정' },
  { id: 9, title: '개정이력', short: '이력' },
]

export default function ProductWizardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editProductCode = searchParams.get('edit')
  const isEdit = !!editProductCode
  const { isAdmin, isLoading: userLoading } = useUser()

  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [savedSteps, setSavedSteps] = useState<Set<number>>(new Set())

  // Step 1: Basic Info
  const [basicInfo, setBasicInfo] = useState<BasicInfoData>({
    product_code: '',
    management_code: '',
    korean_name: '',
    english_name: '',
    cosmetic_type: '',
    appearance: '',
    label_volume: '',
    fill_volume: '',
    ph_standard: '',
    viscosity_standard: '',
    specific_gravity: null,
    shelf_life: '',
    storage_method: '',
    usage_instructions: '',
    dosage: '',
    functional_claim: '',
    usage_precautions: '',
    packaging_unit: '',
    allergen_korean: '',
    allergen_english: '',
    recommended_age: '',
    recycling_grade: '',
    label_position: '',
    raw_material_report: 0,
    standardized_name: 0,
    responsible_seller: 0,
    semi_product_code: '',
    p_product_code: '',
    remarks: '',
  })

  // Step 2: BOM
  const [bomRows, setBomRows] = useState<BomRow[]>([])

  // Step 3: QC Specs
  const [qcSpecRows, setQcSpecRows] = useState<QcSpecRow[]>([])

  // Step 4: English Specs
  const [englishSpecRows, setEnglishSpecRows] = useState<EnglishSpecRow[]>([])

  // Step 5: INCI
  const [inciData, setInciData] = useState<InciData>({
    product_code: '',
    inci_ko: '',
    inci_en: '',
    inci_cpnp: '',
    inci_fda: '',
    designated_at: '',
    author: '',
  })

  // Step 6: Subsidiary Materials
  const [subMatRows, setSubMatRows] = useState<SubsidiaryMaterialRow[]>([])

  // Step 7: Work Specs
  const [workSpecData, setWorkSpecData] = useState<WorkSpecData>({
    product_code: '',
    product_name: '',
    contents_notes: '',
    production_cautions: '',
    label_volume: '',
    fill_volume: '',
    color: '',
    remarks: '',
  })

  // Step 8: Manufacturing Process
  const [processHeader, setProcessHeader] = useState<ProcessHeaderData>({
    batch_unit: '',
    total_time: '',
    operator: '',
    dept_name: '',
    notes_content: '',
    special_notes: '',
  })
  const [processSteps, setProcessSteps] = useState<ProcessStepRow[]>([])

  // Step 9: Revisions
  const [revisionRows, setRevisionRows] = useState<RevisionRow[]>([])

  // Load data for edit mode
  const loadEditData = useCallback(async () => {
    if (!editProductCode) return
    setLoading(true)
    try {
      const { data, error } = await fetchProductAllData(editProductCode)
      if (error || !data) {
        toast.error(error || '데이터 로드 실패')
        return
      }

      setBasicInfo({
        product_code: data.basicInfo.product_code,
        management_code: data.basicInfo.management_code ?? '',
        korean_name: data.basicInfo.korean_name ?? '',
        english_name: data.basicInfo.english_name ?? '',
        cosmetic_type: data.basicInfo.cosmetic_type ?? '',
        appearance: data.basicInfo.appearance ?? '',
        label_volume: data.basicInfo.label_volume ?? '',
        fill_volume: data.basicInfo.fill_volume ?? '',
        ph_standard: data.basicInfo.ph_standard ?? '',
        viscosity_standard: data.basicInfo.viscosity_standard ?? '',
        specific_gravity: data.basicInfo.specific_gravity ?? null,
        shelf_life: data.basicInfo.shelf_life ?? '',
        storage_method: data.basicInfo.storage_method ?? '',
        usage_instructions: data.basicInfo.usage_instructions ?? '',
        dosage: data.basicInfo.dosage ?? '',
        functional_claim: data.basicInfo.functional_claim ?? '',
        usage_precautions: data.basicInfo.usage_precautions ?? '',
        packaging_unit: data.basicInfo.packaging_unit ?? '',
        allergen_korean: data.basicInfo.allergen_korean ?? '',
        allergen_english: data.basicInfo.allergen_english ?? '',
        recommended_age: data.basicInfo.recommended_age ?? '',
        recycling_grade: data.basicInfo.recycling_grade ?? '',
        label_position: data.basicInfo.label_position ?? '',
        raw_material_report: data.basicInfo.raw_material_report ?? 0,
        standardized_name: data.basicInfo.standardized_name ?? 0,
        responsible_seller: data.basicInfo.responsible_seller ?? 0,
        semi_product_code: data.basicInfo.semi_product_code ?? '',
        p_product_code: data.basicInfo.p_product_code ?? '',
        remarks: data.basicInfo.remarks ?? '',
      })

      setBomRows(data.bom)
      setQcSpecRows(data.qcSpecs)
      setEnglishSpecRows(data.englishSpecs)

      if (data.inci) {
        setInciData({
          ...data.inci,
          inci_ko: data.inci.inci_ko ?? '',
          inci_en: data.inci.inci_en ?? '',
          inci_cpnp: data.inci.inci_cpnp ?? '',
          inci_fda: data.inci.inci_fda ?? '',
          designated_at: data.inci.designated_at ?? '',
          author: data.inci.author ?? '',
        })
      }

      setSubMatRows(data.subsidiaryMaterials)

      if (data.workSpecs) {
        setWorkSpecData({
          ...data.workSpecs,
          product_name: data.workSpecs.product_name ?? '',
          contents_notes: data.workSpecs.contents_notes ?? '',
          production_cautions: data.workSpecs.production_cautions ?? '',
          label_volume: data.workSpecs.label_volume ?? '',
          fill_volume: data.workSpecs.fill_volume ?? '',
          color: data.workSpecs.color ?? '',
          remarks: data.workSpecs.remarks ?? '',
        })
      }

      if (data.process) {
        setProcessHeader({
          batch_unit: data.process.header.batch_unit ?? '',
          total_time: data.process.header.total_time ?? '',
          operator: data.process.header.operator ?? '',
          dept_name: data.process.header.dept_name ?? '',
          notes_content: data.process.header.notes_content ?? '',
          special_notes: data.process.header.special_notes ?? '',
        })
        setProcessSteps(data.process.steps)
      }

      setRevisionRows(data.revisions)
    } catch {
      toast.error('데이터 로드 중 오류 발생')
    } finally {
      setLoading(false)
    }
  }, [editProductCode])

  useEffect(() => {
    if (isEdit) loadEditData()
  }, [isEdit, loadEditData])

  // Get effective product code (for child table saves)
  const productCode = basicInfo.product_code.trim()

  // ── Save handlers ──

  const handleSaveStep = async () => {
    if (!productCode && currentStep > 1) {
      toast.error('먼저 Step 1에서 제품코드를 입력하고 저장해주세요.')
      return
    }
    setSaving(true)
    try {
      let result: { success: boolean; error?: string }

      switch (currentStep) {
        case 1:
          if (!productCode) {
            toast.error('제품코드는 필수입니다.')
            setSaving(false)
            return
          }
          result = await saveProductBasicInfo(basicInfo, isEdit)
          break
        case 2:
          result = await saveProductBom(productCode, bomRows)
          break
        case 3:
          result = await saveProductQcSpecs(productCode, qcSpecRows)
          break
        case 4:
          result = await saveProductEnglishSpecs(
            productCode,
            basicInfo.management_code ?? '',
            basicInfo.korean_name ?? '',
            englishSpecRows
          )
          break
        case 5:
          result = await saveProductInciData({ ...inciData, product_code: productCode })
          break
        case 6:
          result = await saveProductSubsidiaryMaterials(
            productCode,
            basicInfo.management_code ?? '',
            subMatRows
          )
          break
        case 7:
          result = await saveProductWorkSpecs({ ...workSpecData, product_code: productCode })
          break
        case 8:
          result = await saveManufacturingProcess(productCode, processHeader, processSteps)
          break
        case 9:
          result = await saveProductRevisions(productCode, revisionRows)
          break
        default:
          result = { success: false, error: 'Unknown step' }
      }

      if (result.success) {
        toast.success(`Step ${currentStep} 저장 완료`)
        setSavedSteps((prev) => new Set(prev).add(currentStep))
      } else {
        toast.error(result.error || '저장 실패')
      }
    } catch {
      toast.error('저장 중 오류 발생')
    } finally {
      setSaving(false)
    }
  }

  // ── Access check ──

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <ShieldAlert size={48} className="text-red-400" />
        <p className="text-slate-600">관리자만 접근 가능합니다.</p>
        <Button variant="outline" onClick={() => router.push('/v2/pif')}>
          <ArrowLeft size={16} className="mr-1" /> 목록으로 돌아가기
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        <span className="ml-3 text-slate-500">데이터 로드 중...</span>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="mb-4 text-xs text-slate-500">
        <span className="font-medium text-slate-700">PIF</span>
        <span className="mx-1">&gt;</span>
        <button
          type="button"
          onClick={() => router.push('/v2/pif')}
          className="hover:text-slate-700"
        >
          제품 리스트
        </button>
        <span className="mx-1">&gt;</span>
        <span>제품 등록</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isEdit ? `제품 수정 — ${editProductCode}` : '제품 신규 생성'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            각 단계별로 저장 가능합니다. 모든 단계를 완료하지 않아도 됩니다.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/v2/pif')}>
          <ArrowLeft size={16} className="mr-1" /> 목록
        </Button>
      </div>

      {/* Step Indicator */}
      <div className="mb-8 flex gap-1 overflow-x-auto pb-2">
        {STEPS.map((step) => {
          const isCurrent = step.id === currentStep
          const isSaved = savedSteps.has(step.id)
          return (
            <button
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                isCurrent
                  ? 'bg-amber-600 text-white'
                  : isSaved
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {isSaved && !isCurrent && <Check size={12} />}
              <span>{step.id}.</span>
              <span className="hidden sm:inline">{step.title}</span>
              <span className="sm:hidden">{step.short}</span>
            </button>
          )
        })}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-700">
            Step {currentStep}: {STEPS[currentStep - 1].title}
          </h2>
          <Button
            onClick={handleSaveStep}
            disabled={saving}
            className="gap-1 bg-amber-600 hover:bg-amber-700"
            size="sm"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            이 단계 저장
          </Button>
        </div>

        <div className="p-6">
          {currentStep === 1 && (
            <Step1BasicInfo data={basicInfo} onChange={setBasicInfo} isEdit={isEdit} />
          )}
          {currentStep === 2 && <Step2Bom rows={bomRows} onChange={setBomRows} />}
          {currentStep === 3 && <Step3QcSpecs rows={qcSpecRows} onChange={setQcSpecRows} />}
          {currentStep === 4 && (
            <Step4EnglishSpecs rows={englishSpecRows} onChange={setEnglishSpecRows} />
          )}
          {currentStep === 5 && <Step5Inci data={inciData} onChange={setInciData} />}
          {currentStep === 6 && (
            <Step6SubsidiaryMaterials rows={subMatRows} onChange={setSubMatRows} />
          )}
          {currentStep === 7 && (
            <Step7WorkSpecs data={workSpecData} onChange={setWorkSpecData} />
          )}
          {currentStep === 8 && (
            <Step8ManufacturingProcess
              header={processHeader}
              onHeaderChange={setProcessHeader}
              steps={processSteps}
              onStepsChange={setProcessSteps}
            />
          )}
          {currentStep === 9 && <Step9Revisions rows={revisionRows} onChange={setRevisionRows} />}
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-4 flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
          disabled={currentStep === 1}
        >
          <ChevronLeft size={16} /> 이전
        </Button>
        <Button
          variant="outline"
          onClick={() => setCurrentStep((s) => Math.min(9, s + 1))}
          disabled={currentStep === 9}
        >
          다음 <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
// STEP COMPONENTS
// ═══════════════════════════════════════════

// ── Step 1: Basic Info ──

function Step1BasicInfo({
  data,
  onChange,
  isEdit,
}: {
  data: BasicInfoData
  onChange: (d: BasicInfoData) => void
  isEdit: boolean
}) {
  const set = (field: keyof BasicInfoData, value: string | number | null) =>
    onChange({ ...data, [field]: value })

  return (
    <div className="space-y-6">
      {/* 필수 */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-slate-600 mb-2">필수 정보</legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="제품코드 *" required>
            <Input
              value={data.product_code}
              onChange={(e) => set('product_code', e.target.value)}
              disabled={isEdit}
              placeholder="예: BGA020"
            />
          </Field>
          <Field label="관리번호">
            <Input
              value={data.management_code ?? ''}
              onChange={(e) => set('management_code', e.target.value)}
            />
          </Field>
          <Field label="유형">
            <Input
              value={data.cosmetic_type ?? ''}
              onChange={(e) => set('cosmetic_type', e.target.value)}
              placeholder="예: 화장수"
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="제품명 (국문)">
            <Input
              value={data.korean_name ?? ''}
              onChange={(e) => set('korean_name', e.target.value)}
            />
          </Field>
          <Field label="제품명 (영문)">
            <Input
              value={data.english_name ?? ''}
              onChange={(e) => set('english_name', e.target.value)}
            />
          </Field>
        </div>
      </fieldset>

      {/* 물성 */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-slate-600 mb-2">물성 정보</legend>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="성상">
            <Input
              value={data.appearance ?? ''}
              onChange={(e) => set('appearance', e.target.value)}
            />
          </Field>
          <Field label="표시용량">
            <Input
              value={data.label_volume ?? ''}
              onChange={(e) => set('label_volume', e.target.value)}
            />
          </Field>
          <Field label="충진용량">
            <Input
              value={data.fill_volume ?? ''}
              onChange={(e) => set('fill_volume', e.target.value)}
            />
          </Field>
          <Field label="비중">
            <Input
              type="number"
              step="0.001"
              value={data.specific_gravity ?? ''}
              onChange={(e) =>
                set('specific_gravity', e.target.value ? parseFloat(e.target.value) : null)
              }
            />
          </Field>
          <Field label="pH 기준">
            <Input
              value={data.ph_standard ?? ''}
              onChange={(e) => set('ph_standard', e.target.value)}
            />
          </Field>
          <Field label="점경도 기준">
            <Input
              value={data.viscosity_standard ?? ''}
              onChange={(e) => set('viscosity_standard', e.target.value)}
            />
          </Field>
          <Field label="사용기한">
            <Input
              value={data.shelf_life ?? ''}
              onChange={(e) => set('shelf_life', e.target.value)}
            />
          </Field>
          <Field label="포장단위">
            <Input
              value={data.packaging_unit ?? ''}
              onChange={(e) => set('packaging_unit', e.target.value)}
            />
          </Field>
        </div>
      </fieldset>

      {/* 텍스트 필드 */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-slate-600 mb-2">사용 정보</legend>
        <Field label="저장방법">
          <Input
            value={data.storage_method ?? ''}
            onChange={(e) => set('storage_method', e.target.value)}
          />
        </Field>
        <Field label="사용법">
          <Textarea
            value={data.usage_instructions ?? ''}
            onChange={(e) => set('usage_instructions', e.target.value)}
            rows={3}
          />
        </Field>
        <Field label="용법용량">
          <Textarea
            value={data.dosage ?? ''}
            onChange={(e) => set('dosage', e.target.value)}
            rows={2}
          />
        </Field>
        <Field label="효능/효과">
          <Textarea
            value={data.functional_claim ?? ''}
            onChange={(e) => set('functional_claim', e.target.value)}
            rows={2}
          />
        </Field>
        <Field label="사용시 주의사항">
          <Textarea
            value={data.usage_precautions ?? ''}
            onChange={(e) => set('usage_precautions', e.target.value)}
            rows={3}
          />
        </Field>
      </fieldset>

      {/* 기타 */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-slate-600 mb-2">기타 정보</legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="알러지물질 (국문)">
            <Input
              value={data.allergen_korean ?? ''}
              onChange={(e) => set('allergen_korean', e.target.value)}
            />
          </Field>
          <Field label="알러지물질 (영문)">
            <Input
              value={data.allergen_english ?? ''}
              onChange={(e) => set('allergen_english', e.target.value)}
            />
          </Field>
          <Field label="권장사용나이">
            <Input
              value={data.recommended_age ?? ''}
              onChange={(e) => set('recommended_age', e.target.value)}
            />
          </Field>
          <Field label="재활용등급">
            <Input
              value={data.recycling_grade ?? ''}
              onChange={(e) => set('recycling_grade', e.target.value)}
            />
          </Field>
          <Field label="문안표기 부자재">
            <Input
              value={data.label_position ?? ''}
              onChange={(e) => set('label_position', e.target.value)}
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-6 pt-2">
          <ToggleField
            label="원료보고"
            checked={data.raw_material_report === 1}
            onCheckedChange={(v) => set('raw_material_report', v ? 1 : 0)}
          />
          <ToggleField
            label="표준명칭"
            checked={data.standardized_name === 1}
            onCheckedChange={(v) => set('standardized_name', v ? 1 : 0)}
          />
          <ToggleField
            label="책임판매업"
            checked={data.responsible_seller === 1}
            onCheckedChange={(v) => set('responsible_seller', v ? 1 : 0)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <Field label="반제품 코드">
            <Input
              value={data.semi_product_code ?? ''}
              onChange={(e) => set('semi_product_code', e.target.value)}
            />
          </Field>
          <Field label="P제품 코드">
            <Input
              value={data.p_product_code ?? ''}
              onChange={(e) => set('p_product_code', e.target.value)}
            />
          </Field>
        </div>
        <Field label="비고">
          <Textarea
            value={data.remarks ?? ''}
            onChange={(e) => set('remarks', e.target.value)}
            rows={2}
          />
        </Field>
      </fieldset>
    </div>
  )
}

// ── Step 2: BOM ──

function Step2Bom({
  rows,
  onChange,
}: {
  rows: BomRow[]
  onChange: (r: BomRow[]) => void
}) {
  const addRow = () => {
    onChange([
      ...rows,
      { sequence_no: rows.length + 1, ingredient_code: '', content_ratio: null },
    ])
  }
  const removeRow = (idx: number) => {
    const newRows = rows.filter((_, i) => i !== idx).map((r, i) => ({ ...r, sequence_no: i + 1 }))
    onChange(newRows)
  }
  const updateRow = (idx: number, field: keyof BomRow, value: string | number | null) => {
    const updated = [...rows]
    updated[idx] = { ...updated[idx], [field]: value }
    onChange(updated)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-500">원료 구성 ({rows.length}건)</p>
        <Button variant="outline" size="sm" onClick={addRow} className="gap-1">
          <Plus size={14} /> 행 추가
        </Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState text="BOM 행을 추가해주세요" />
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="p-2 w-16 text-center">No</th>
                <th className="p-2 text-left">원료코드</th>
                <th className="p-2 text-right w-32">함량비율</th>
                <th className="p-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="border-t border-slate-100">
                  <td className="p-2 text-center text-slate-400">{row.sequence_no}</td>
                  <td className="p-2">
                    <Input
                      value={row.ingredient_code}
                      onChange={(e) => updateRow(idx, 'ingredient_code', e.target.value)}
                      placeholder="원료코드"
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      step="0.0001"
                      value={row.content_ratio ?? ''}
                      onChange={(e) =>
                        updateRow(
                          idx,
                          'content_ratio',
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      className="h-8 text-xs text-right"
                    />
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => removeRow(idx)}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Step 3: QC Specs ──

function Step3QcSpecs({
  rows,
  onChange,
}: {
  rows: QcSpecRow[]
  onChange: (r: QcSpecRow[]) => void
}) {
  const addRow = (qcType: string) => {
    const typeRows = rows.filter((r) => r.qc_type === qcType)
    const nextSeq = typeRows.length + 1
    onChange([
      ...rows,
      {
        qc_type: qcType,
        sequence_no: nextSeq,
        test_item: '',
        specification: '',
        test_method: '',
        test_item_en: '',
        specification_en: '',
        result: '',
      },
    ])
  }
  const removeRow = (idx: number) => onChange(rows.filter((_, i) => i !== idx))
  const updateRow = (idx: number, field: keyof QcSpecRow, value: string) => {
    const updated = [...rows]
    updated[idx] = { ...updated[idx], [field]: value }
    onChange(updated)
  }

  const semiRows = rows
    .map((r, i) => ({ ...r, _idx: i }))
    .filter((r) => r.qc_type === '반제품')
  const finalRows = rows
    .map((r, i) => ({ ...r, _idx: i }))
    .filter((r) => r.qc_type === '완제품')

  const renderTable = (title: string, qcType: string, filtered: (QcSpecRow & { _idx: number })[]) => (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-slate-600">{title}</h3>
        <Button variant="outline" size="sm" onClick={() => addRow(qcType)} className="gap-1">
          <Plus size={14} /> 추가
        </Button>
      </div>
      {filtered.length === 0 ? (
        <EmptyState text={`${title} 항목을 추가해주세요`} />
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-2 w-12">No</th>
                <th className="p-2 text-left">시험항목</th>
                <th className="p-2 text-left">기준</th>
                <th className="p-2 text-left">시험방법</th>
                <th className="p-2 text-left">항목(영문)</th>
                <th className="p-2 text-left">기준(영문)</th>
                <th className="p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row._idx} className="border-t border-slate-100">
                  <td className="p-1.5 text-center text-slate-400">{row.sequence_no}</td>
                  <td className="p-1.5">
                    <Input
                      value={row.test_item}
                      onChange={(e) => updateRow(row._idx, 'test_item', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </td>
                  <td className="p-1.5">
                    <Input
                      value={row.specification ?? ''}
                      onChange={(e) => updateRow(row._idx, 'specification', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </td>
                  <td className="p-1.5">
                    <Input
                      value={row.test_method ?? ''}
                      onChange={(e) => updateRow(row._idx, 'test_method', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </td>
                  <td className="p-1.5">
                    <Input
                      value={row.test_item_en ?? ''}
                      onChange={(e) => updateRow(row._idx, 'test_item_en', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </td>
                  <td className="p-1.5">
                    <Input
                      value={row.specification_en ?? ''}
                      onChange={(e) => updateRow(row._idx, 'specification_en', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </td>
                  <td className="p-1.5">
                    <button
                      onClick={() => removeRow(row._idx)}
                      className="p-1 text-red-400 hover:text-red-600 rounded"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  return (
    <div>
      {renderTable('반제품 시험기준', '반제품', semiRows)}
      {renderTable('완제품 시험기준', '완제품', finalRows)}
    </div>
  )
}

// ── Step 4: English Specs ──

function Step4EnglishSpecs({
  rows,
  onChange,
}: {
  rows: EnglishSpecRow[]
  onChange: (r: EnglishSpecRow[]) => void
}) {
  const addRow = () => {
    onChange([...rows, { test_item: '', specification: '', result: '' }])
  }
  const removeRow = (idx: number) => onChange(rows.filter((_, i) => i !== idx))
  const updateRow = (idx: number, field: keyof EnglishSpecRow, value: string) => {
    const updated = [...rows]
    updated[idx] = { ...updated[idx], [field]: value }
    onChange(updated)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-500">영문 성적서 ({rows.length}건)</p>
        <Button variant="outline" size="sm" onClick={addRow} className="gap-1">
          <Plus size={14} /> 행 추가
        </Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState text="영문 성적서 항목을 추가해주세요" />
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="p-2 text-left">Test Item</th>
                <th className="p-2 text-left">Specification</th>
                <th className="p-2 text-left">Result</th>
                <th className="p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="border-t border-slate-100">
                  <td className="p-1.5">
                    <Input
                      value={row.test_item}
                      onChange={(e) => updateRow(idx, 'test_item', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </td>
                  <td className="p-1.5">
                    <Input
                      value={row.specification ?? ''}
                      onChange={(e) => updateRow(idx, 'specification', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </td>
                  <td className="p-1.5">
                    <Input
                      value={row.result ?? ''}
                      onChange={(e) => updateRow(idx, 'result', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </td>
                  <td className="p-1.5">
                    <button
                      onClick={() => removeRow(idx)}
                      className="p-1 text-red-400 hover:text-red-600 rounded"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Step 5: INCI ──

function Step5Inci({
  data,
  onChange,
}: {
  data: InciData
  onChange: (d: InciData) => void
}) {
  const set = (field: keyof InciData, value: string) => onChange({ ...data, [field]: value })

  return (
    <div className="space-y-4">
      <Field label="국문 전성분">
        <Textarea
          value={data.inci_ko ?? ''}
          onChange={(e) => set('inci_ko', e.target.value)}
          rows={5}
          placeholder="국문 전성분 목록..."
        />
      </Field>
      <Field label="영문 전성분 (INCI)">
        <Textarea
          value={data.inci_en ?? ''}
          onChange={(e) => set('inci_en', e.target.value)}
          rows={5}
          placeholder="English INCI list..."
        />
      </Field>
      <Field label="CPNP용 전성분">
        <Textarea
          value={data.inci_cpnp ?? ''}
          onChange={(e) => set('inci_cpnp', e.target.value)}
          rows={3}
        />
      </Field>
      <Field label="FDA용 전성분">
        <Textarea
          value={data.inci_fda ?? ''}
          onChange={(e) => set('inci_fda', e.target.value)}
          rows={3}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="지정일">
          <Input
            type="date"
            value={data.designated_at ?? ''}
            onChange={(e) => set('designated_at', e.target.value)}
          />
        </Field>
        <Field label="작성자">
          <Input
            value={data.author ?? ''}
            onChange={(e) => set('author', e.target.value)}
          />
        </Field>
      </div>
    </div>
  )
}

// ── Step 6: Subsidiary Materials ──

function Step6SubsidiaryMaterials({
  rows,
  onChange,
}: {
  rows: SubsidiaryMaterialRow[]
  onChange: (r: SubsidiaryMaterialRow[]) => void
}) {
  const addRow = () => {
    onChange([
      ...rows,
      { sequence_no: rows.length + 1, material_name: '', material_spec: '', vendor: '' },
    ])
  }
  const removeRow = (idx: number) => {
    const newRows = rows.filter((_, i) => i !== idx).map((r, i) => ({ ...r, sequence_no: i + 1 }))
    onChange(newRows)
  }
  const updateRow = (idx: number, field: keyof SubsidiaryMaterialRow, value: string | number) => {
    const updated = [...rows]
    updated[idx] = { ...updated[idx], [field]: value }
    onChange(updated)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-500">부자재 ({rows.length}건)</p>
        <Button variant="outline" size="sm" onClick={addRow} className="gap-1">
          <Plus size={14} /> 행 추가
        </Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState text="부자재 항목을 추가해주세요" />
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="p-2 w-12">No</th>
                <th className="p-2 text-left">부자재명</th>
                <th className="p-2 text-left">규격</th>
                <th className="p-2 text-left">업체</th>
                <th className="p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="border-t border-slate-100">
                  <td className="p-1.5 text-center text-slate-400">{row.sequence_no}</td>
                  <td className="p-1.5">
                    <Input
                      value={row.material_name}
                      onChange={(e) => updateRow(idx, 'material_name', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </td>
                  <td className="p-1.5">
                    <Input
                      value={row.material_spec ?? ''}
                      onChange={(e) => updateRow(idx, 'material_spec', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </td>
                  <td className="p-1.5">
                    <Input
                      value={row.vendor ?? ''}
                      onChange={(e) => updateRow(idx, 'vendor', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </td>
                  <td className="p-1.5">
                    <button
                      onClick={() => removeRow(idx)}
                      className="p-1 text-red-400 hover:text-red-600 rounded"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Step 7: Work Specs ──

function Step7WorkSpecs({
  data,
  onChange,
}: {
  data: WorkSpecData
  onChange: (d: WorkSpecData) => void
}) {
  const set = (field: keyof WorkSpecData, value: string) => onChange({ ...data, [field]: value })

  return (
    <div className="space-y-4">
      <Field label="내용물 특기사항">
        <Textarea
          value={data.contents_notes ?? ''}
          onChange={(e) => set('contents_notes', e.target.value)}
          rows={3}
        />
      </Field>
      <Field label="생산 주의사항">
        <Textarea
          value={data.production_cautions ?? ''}
          onChange={(e) => set('production_cautions', e.target.value)}
          rows={3}
        />
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="표시용량">
          <Input
            value={data.label_volume ?? ''}
            onChange={(e) => set('label_volume', e.target.value)}
          />
        </Field>
        <Field label="충진용량">
          <Input
            value={data.fill_volume ?? ''}
            onChange={(e) => set('fill_volume', e.target.value)}
          />
        </Field>
        <Field label="색상">
          <Input
            value={data.color ?? ''}
            onChange={(e) => set('color', e.target.value)}
          />
        </Field>
      </div>
      <Field label="비고">
        <Textarea
          value={data.remarks ?? ''}
          onChange={(e) => set('remarks', e.target.value)}
          rows={2}
        />
      </Field>
    </div>
  )
}

// ── Step 8: Manufacturing Process ──

function Step8ManufacturingProcess({
  header,
  onHeaderChange,
  steps,
  onStepsChange,
}: {
  header: ProcessHeaderData
  onHeaderChange: (h: ProcessHeaderData) => void
  steps: ProcessStepRow[]
  onStepsChange: (s: ProcessStepRow[]) => void
}) {
  const setH = (field: keyof ProcessHeaderData, value: string) =>
    onHeaderChange({ ...header, [field]: value })

  const addStep = () => {
    onStepsChange([
      ...steps,
      { step_num: steps.length + 1, step_name: '', step_desc: '', work_time: '', step_type: '' },
    ])
  }
  const removeStep = (idx: number) => {
    const newSteps = steps
      .filter((_, i) => i !== idx)
      .map((s, i) => ({ ...s, step_num: i + 1 }))
    onStepsChange(newSteps)
  }
  const updateStep = (idx: number, field: keyof ProcessStepRow, value: string | number) => {
    const updated = [...steps]
    updated[idx] = { ...updated[idx], [field]: value }
    onStepsChange(updated)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-slate-600 mb-2">공정 기본 정보</legend>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="배치단위">
            <Input
              value={header.batch_unit ?? ''}
              onChange={(e) => setH('batch_unit', e.target.value)}
            />
          </Field>
          <Field label="총소요시간">
            <Input
              value={header.total_time ?? ''}
              onChange={(e) => setH('total_time', e.target.value)}
            />
          </Field>
          <Field label="작업자">
            <Input
              value={header.operator ?? ''}
              onChange={(e) => setH('operator', e.target.value)}
            />
          </Field>
          <Field label="부서명">
            <Input
              value={header.dept_name ?? ''}
              onChange={(e) => setH('dept_name', e.target.value)}
            />
          </Field>
        </div>
        <Field label="비고">
          <Textarea
            value={header.notes_content ?? ''}
            onChange={(e) => setH('notes_content', e.target.value)}
            rows={2}
          />
        </Field>
      </fieldset>

      {/* Steps */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm font-semibold text-slate-600">공정 단계 ({steps.length}건)</p>
          <Button variant="outline" size="sm" onClick={addStep} className="gap-1">
            <Plus size={14} /> 단계 추가
          </Button>
        </div>
        {steps.length === 0 ? (
          <EmptyState text="공정 단계를 추가해주세요" />
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-2 w-12">No</th>
                  <th className="p-2 text-left w-40">공정명</th>
                  <th className="p-2 text-left">작업설명</th>
                  <th className="p-2 text-left w-24">소요시간</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {steps.map((step, idx) => (
                  <tr key={idx} className="border-t border-slate-100">
                    <td className="p-1.5 text-center text-slate-400">{step.step_num}</td>
                    <td className="p-1.5">
                      <Input
                        value={step.step_name ?? ''}
                        onChange={(e) => updateStep(idx, 'step_name', e.target.value)}
                        className="h-7 text-xs"
                      />
                    </td>
                    <td className="p-1.5">
                      <Input
                        value={step.step_desc ?? ''}
                        onChange={(e) => updateStep(idx, 'step_desc', e.target.value)}
                        className="h-7 text-xs"
                      />
                    </td>
                    <td className="p-1.5">
                      <Input
                        value={step.work_time ?? ''}
                        onChange={(e) => updateStep(idx, 'work_time', e.target.value)}
                        className="h-7 text-xs"
                      />
                    </td>
                    <td className="p-1.5">
                      <button
                        onClick={() => removeStep(idx)}
                        className="p-1 text-red-400 hover:text-red-600 rounded"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Step 9: Revisions ──

function Step9Revisions({
  rows,
  onChange,
}: {
  rows: RevisionRow[]
  onChange: (r: RevisionRow[]) => void
}) {
  const addRow = () => {
    const nextNo = rows.length > 0 ? Math.max(...rows.map((r) => r.revision_no)) + 1 : 1
    onChange([
      ...rows,
      {
        revision_no: nextNo,
        revision_date: new Date().toISOString().slice(0, 10),
        revision_content: '',
      },
    ])
  }
  const removeRow = (idx: number) => onChange(rows.filter((_, i) => i !== idx))
  const updateRow = (idx: number, field: keyof RevisionRow, value: string | number) => {
    const updated = [...rows]
    updated[idx] = { ...updated[idx], [field]: value }
    onChange(updated)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-500">개정이력 ({rows.length}건)</p>
        <Button variant="outline" size="sm" onClick={addRow} className="gap-1">
          <Plus size={14} /> 행 추가
        </Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState text="개정이력 항목을 추가해주세요" />
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="p-2 w-16 text-center">No</th>
                <th className="p-2 text-left w-36">개정일</th>
                <th className="p-2 text-left">개정내용</th>
                <th className="p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="border-t border-slate-100">
                  <td className="p-1.5 text-center text-slate-400">{row.revision_no}</td>
                  <td className="p-1.5">
                    <Input
                      type="date"
                      value={row.revision_date ?? ''}
                      onChange={(e) => updateRow(idx, 'revision_date', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </td>
                  <td className="p-1.5">
                    <Input
                      value={row.revision_content ?? ''}
                      onChange={(e) => updateRow(idx, 'revision_content', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </td>
                  <td className="p-1.5">
                    <button
                      onClick={() => removeRow(idx)}
                      className="p-1 text-red-400 hover:text-red-600 rounded"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════
// SHARED UI HELPERS
// ═══════════════════════════════════════════

function Field({
  label,
  children,
  required,
}: {
  label: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-slate-500">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}

function ToggleField({
  label,
  checked,
  onCheckedChange,
}: {
  label: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
      <Label className="text-xs text-slate-600">{label}</Label>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="border border-dashed border-slate-200 rounded-lg py-8 text-center text-slate-400 text-sm">
      {text}
    </div>
  )
}
