'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  Upload, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet,
  ArrowLeft, ArrowRight, UserPlus, Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { parseBomCsv, extractProductMappings, type BomCsvRow, type CsvProductMapping } from './parse-csv'
import { uploadBomData, checkNewProducts, registerSelectedProducts } from './actions'
import { toast } from 'sonner'

type Step = 'upload' | 'preview' | 'uploading' | 'new-products' | 'registering' | 'done'

export default function BomUploadPage() {
  const [step, setStep] = useState<Step>('upload')
  const [fileName, setFileName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Parsed data
  const [parsedRows, setParsedRows] = useState<BomCsvRow[]>([])
  const [allMappings, setAllMappings] = useState<CsvProductMapping[]>([])

  // BOM upload result
  const [bomStats, setBomStats] = useState<{ totalRows: number; upsertedRows: number } | null>(null)

  // New products
  const [newProducts, setNewProducts] = useState<CsvProductMapping[]>([])
  const [existingCount, setExistingCount] = useState(0)
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set())
  const [productSearch, setProductSearch] = useState('')
  const [registeredCount, setRegisteredCount] = useState(0)

  // ── Step 1: File select & parse ──
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setErrorMsg('')

    try {
      const text = await file.text()
      const { rows, error } = parseBomCsv(text)

      if (error) {
        setErrorMsg(error)
        return
      }

      setParsedRows(rows)
      setAllMappings(extractProductMappings(rows))
      setStep('preview')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'CSV 파싱 실패')
    }

    e.target.value = ''
  }, [])

  // ── Step 2: Upload BOM ──
  const handleUploadBom = useCallback(async () => {
    setStep('uploading')
    try {
      const result = await uploadBomData(parsedRows)

      if (!result.success) {
        setErrorMsg(result.error || '업로드 실패')
        setStep('preview')
        toast.error(result.error || '업로드 실패')
        return
      }

      setBomStats(result.stats!)
      toast.success(`BOM ${result.stats!.upsertedRows.toLocaleString()}건 업로드 완료`)

      // Check new products
      const { newProducts: np, existingCount: ec } = await checkNewProducts(allMappings)
      setNewProducts(np)
      setExistingCount(ec)
      setSelectedCodes(new Set()) // start with none selected

      if (np.length > 0) {
        setStep('new-products')
      } else {
        setStep('done')
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '업로드 실패')
      setStep('preview')
      toast.error('업로드 실패')
    }
  }, [parsedRows, allMappings])

  // ── Step 3: Register selected products ──
  const handleRegister = useCallback(async () => {
    const selected = newProducts.filter((p) => selectedCodes.has(p.productCode))
    if (selected.length === 0) {
      toast.error('등록할 제품을 선택해주세요')
      return
    }

    setStep('registering')
    try {
      const result = await registerSelectedProducts(selected)

      if (!result.success) {
        toast.error(result.error || '등록 실패')
        setStep('new-products')
        return
      }

      setRegisteredCount(result.count)
      toast.success(`${result.count}개 제품 등록 완료`)
      setStep('done')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '등록 실패')
      setStep('new-products')
    }
  }, [newProducts, selectedCodes])

  const filteredProducts = useMemo(() => {
    if (!productSearch) return newProducts
    const q = productSearch.toLowerCase()
    return newProducts.filter(
      (p) =>
        p.productCode.toLowerCase().includes(q) ||
        p.productName.toLowerCase().includes(q) ||
        p.semiProductCode.toLowerCase().includes(q)
    )
  }, [newProducts, productSearch])

  // Selection helpers
  const toggleSelect = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const selectAll = () => setSelectedCodes(new Set(filteredProducts.map((p) => p.productCode)))
  const deselectAll = () => setSelectedCodes(new Set())

  // Preview stats
  const previewStats = parsedRows.length > 0
    ? {
        total: parsedRows.length,
        uniquePrdcodes: new Set(parsedRows.map((r) => r.prdcode)).size,
        bulkBoms: new Set(parsedRows.filter((r) => r.prdcode.startsWith('B')).map((r) => r.prdcode)).size,
        productCount: allMappings.length,
      }
    : null

  const handleReset = () => {
    setStep('upload')
    setParsedRows([])
    setAllMappings([])
    setFileName('')
    setErrorMsg('')
    setBomStats(null)
    setNewProducts([])
    setSelectedCodes(new Set())
    setRegisteredCount(0)
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/v2/pif" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-800">BOM 데이터 업로드</h1>
          <p className="text-xs text-slate-500">ERP BOM CSV → bom_master 갱신 → 신규 제품 선택 등록</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6 text-xs">
        {[
          { key: 'upload', label: '1. CSV 선택' },
          { key: 'preview', label: '2. BOM 업로드' },
          { key: 'new-products', label: '3. 신규 제품 등록' },
        ].map((s, idx) => {
          const isActive =
            s.key === step ||
            (s.key === 'upload' && step === 'upload') ||
            (s.key === 'preview' && (step === 'preview' || step === 'uploading')) ||
            (s.key === 'new-products' && (step === 'new-products' || step === 'registering'))
          const isPast =
            (s.key === 'upload' && step !== 'upload') ||
            (s.key === 'preview' && !['upload', 'preview', 'uploading'].includes(step))
          return (
            <div key={s.key} className="flex items-center gap-2">
              {idx > 0 && <div className={`w-8 h-px ${isPast ? 'bg-amber-400' : 'bg-slate-200'}`} />}
              <span
                className={`px-2.5 py-1 rounded-full font-medium ${
                  isActive
                    ? 'bg-amber-100 text-amber-700'
                    : isPast
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {isPast ? '✓' : ''} {s.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── Step 1: Upload ── */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-amber-500" />
              CSV 파일 선택
            </CardTitle>
            <CardDescription>ERP BOM CSV 파일 (탭 구분, UTF-8)</CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-amber-400 hover:bg-amber-50/30 transition-colors">
              <Upload size={32} className="text-slate-400 mb-2" />
              <span className="text-sm text-slate-600">클릭하여 CSV 파일 선택</span>
              <span className="text-xs text-slate-400 mt-1">BOM_YYMMDD.csv</span>
              <input type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
            </label>
            {errorMsg && (
              <p className="mt-3 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle size={14} /> {errorMsg}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Preview & Upload BOM ── */}
      {(step === 'preview' || step === 'uploading') && previewStats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">BOM 데이터 미리보기</CardTitle>
            <CardDescription>{fileName}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">전체 BOM 행</p>
                <p className="text-xl font-bold text-slate-800">{previewStats.total.toLocaleString()}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">고유 생산품목</p>
                <p className="text-xl font-bold text-slate-800">{previewStats.uniquePrdcodes.toLocaleString()}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">벌크(원재료) BOM</p>
                <p className="text-xl font-bold text-amber-600">{previewStats.bulkBoms.toLocaleString()}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">최종 제품 수</p>
                <p className="text-xl font-bold text-slate-800">{previewStats.productCount.toLocaleString()}</p>
              </div>
            </div>

            {/* Sample */}
            <div>
              <p className="text-xs text-slate-500 mb-2">샘플 데이터 (처음 5행)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="px-2 py-1.5 text-left border border-slate-200">생산품목코드</th>
                      <th className="px-2 py-1.5 text-left border border-slate-200">생산품목명</th>
                      <th className="px-2 py-1.5 text-left border border-slate-200">소모품목코드</th>
                      <th className="px-2 py-1.5 text-right border border-slate-200">소요량</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 5).map((row, idx) => (
                      <tr key={idx}>
                        <td className="px-2 py-1.5 font-mono border border-slate-200">{row.prdcode}</td>
                        <td className="px-2 py-1.5 border border-slate-200 truncate max-w-[200px]">{row.productName}</td>
                        <td className="px-2 py-1.5 font-mono border border-slate-200">{row.materialcode}</td>
                        <td className="px-2 py-1.5 text-right font-mono border border-slate-200">{row.usemount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleReset} variant="outline" className="flex-1" disabled={step === 'uploading'}>
                취소
              </Button>
              <Button
                onClick={handleUploadBom}
                disabled={step === 'uploading'}
                className="flex-1 bg-amber-500 hover:bg-amber-600"
              >
                {step === 'uploading' ? (
                  <><Loader2 size={16} className="animate-spin mr-2" /> 업로드 중...</>
                ) : (
                  <><Upload size={16} className="mr-2" /> bom_master 업로드</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: New Products Selection ── */}
      {(step === 'new-products' || step === 'registering') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus size={18} className="text-amber-500" />
              신규 제품 등록
            </CardTitle>
            <CardDescription>
              BOM에서 {allMappings.length}개 제품 발견 — 기존 등록 {existingCount}개, 신규 {newProducts.length}개
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {bomStats && (
              <div className="bg-green-50 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2">
                <CheckCircle2 size={16} />
                bom_master {bomStats.upsertedRows.toLocaleString()}건 업로드 완료
              </div>
            )}

            {newProducts.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p>신규 제품이 없습니다. 모든 제품이 이미 등록되어 있습니다.</p>
                <Button onClick={() => setStep('done')} className="mt-4">완료</Button>
              </div>
            ) : (
              <>
                {/* Search & controls */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="제품코드 / 제품명 검색..."
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={selectAll} className="text-xs h-8">
                    전체 선택
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAll} className="text-xs h-8">
                    전체 해제
                  </Button>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {selectedCodes.size}/{newProducts.length} 선택
                  </span>
                </div>

                {/* Product list */}
                <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-50">
                      <tr>
                        <th className="w-8 px-2 py-2 border-b border-slate-200"></th>
                        <th className="px-2 py-2 text-left border-b border-slate-200 font-semibold text-slate-600">제품코드</th>
                        <th className="px-2 py-2 text-left border-b border-slate-200 font-semibold text-slate-600">제품명</th>
                        <th className="px-2 py-2 text-left border-b border-slate-200 font-semibold text-slate-600">반제품코드</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((p) => (
                        <tr
                          key={p.productCode}
                          onClick={() => toggleSelect(p.productCode)}
                          className={`cursor-pointer transition-colors ${
                            selectedCodes.has(p.productCode)
                              ? 'bg-amber-50'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="px-2 py-2 text-center border-b border-slate-100">
                            <input
                              type="checkbox"
                              checked={selectedCodes.has(p.productCode)}
                              onChange={() => toggleSelect(p.productCode)}
                              className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                            />
                          </td>
                          <td className="px-2 py-2 font-mono border-b border-slate-100">{p.productCode}</td>
                          <td className="px-2 py-2 border-b border-slate-100">{p.productName}</td>
                          <td className="px-2 py-2 font-mono text-slate-500 border-b border-slate-100">{p.semiProductCode}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => setStep('done')} variant="outline" className="flex-1">
                    건너뛰기
                  </Button>
                  <Button
                    onClick={handleRegister}
                    disabled={selectedCodes.size === 0 || step === 'registering'}
                    className="flex-1 bg-amber-500 hover:bg-amber-600"
                  >
                    {step === 'registering' ? (
                      <><Loader2 size={16} className="animate-spin mr-2" /> 등록 중...</>
                    ) : (
                      <><ArrowRight size={16} className="mr-2" /> {selectedCodes.size}개 제품 등록</>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Done ── */}
      {step === 'done' && (
        <Card>
          <CardContent className="py-8 space-y-4">
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 size={48} className="text-green-500" />
              <h2 className="text-lg font-bold text-slate-800">완료</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {bomStats && (
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-green-600">BOM 업로드</p>
                  <p className="text-xl font-bold text-green-700">{bomStats.upsertedRows.toLocaleString()}건</p>
                </div>
              )}
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <p className="text-xs text-amber-600">신규 등록 제품</p>
                <p className="text-xl font-bold text-amber-700">{registeredCount}개</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleReset} variant="outline" className="flex-1">
                추가 업로드
              </Button>
              <Link href="/v2/pif" className="flex-1">
                <Button className="w-full bg-amber-500 hover:bg-amber-600">제품 목록으로</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
