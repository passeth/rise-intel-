'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChevronLeft, Loader2, Search, Check, X, FlaskConical, FileText, ClipboardPaste, Package, Beaker, History, ChevronDown, ChevronUp, Trash2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

import {
  searchLabProducts,
  loadLabProductIngredients,
  searchVpFormulas,
  loadVpFormulaIngredients,
  matchIngredients,
  fetchFormulaAnalysisHistory,
  deleteFormulaAnalysis,
  type ParsedIngredient,
  type LabProductOption,
  type VpFormulaOption,
  type FormulaAnalysisRecord,
} from './actions'

type InputMode = 'paste' | 'product' | 'formula'

export default function AnalyzeFormulaPage() {
  const queryClient = useQueryClient()

  // -- Input State --
  const [activeMode, setActiveMode] = useState<InputMode>('paste')
  const [pasteText, setPasteText] = useState('')

  // Product search
  const [productSearch, setProductSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<LabProductOption | null>(null)

  // Formula search
  const [formulaSearch, setFormulaSearch] = useState('')
  const [selectedFormula, setSelectedFormula] = useState<VpFormulaOption | null>(null)

  // Parsed & matched ingredients
  const [parsedIngredients, setParsedIngredients] = useState<ParsedIngredient[]>([])
  const [isMatching, setIsMatching] = useState(false)

  // Report state
  const [generatedReport, setGeneratedReport] = useState<{ markdown: string; title: string } | null>(null)

  // History state
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)

  // -- History Query --
  const { data: historyRecords, isLoading: historyLoading } = useQuery({
    queryKey: ['formula-analysis-history'],
    queryFn: fetchFormulaAnalysisHistory,
  })

  // -- Search Queries --
  const { data: productResults } = useQuery({
    queryKey: ['product-search', productSearch],
    queryFn: () => searchLabProducts(productSearch),
    enabled: productSearch.length >= 2,
  })

  const { data: formulaResults } = useQuery({
    queryKey: ['formula-search', formulaSearch],
    queryFn: () => searchVpFormulas(formulaSearch),
    enabled: formulaSearch.length >= 2,
  })

  // -- Parse & Match Functions --
  const parseAndMatch = useCallback(async (names: string[]) => {
    if (names.length === 0) return
    setIsMatching(true)
    try {
      const matched = await matchIngredients(names)
      setParsedIngredients(matched)
    } finally {
      setIsMatching(false)
    }
  }, [])

  const handlePasteParse = useCallback(() => {
    if (!pasteText.trim()) return
    // Parse comma-separated or newline-separated INCI list
    const names = pasteText
      .split(/[,\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('Read all') && !s.includes('>>'))
    parseAndMatch(names)
  }, [pasteText, parseAndMatch])

  const handleProductSelect = useCallback(async (product: LabProductOption) => {
    setSelectedProduct(product)
    setProductSearch('')
    setIsMatching(true)
    try {
      const ingredients = await loadLabProductIngredients(product.slug)
      const names = ingredients.map((i) => i.name)
      const matched = await matchIngredients(names)
      setParsedIngredients(matched)
    } finally {
      setIsMatching(false)
    }
  }, [])

  const handleFormulaSelect = useCallback(async (formula: VpFormulaOption) => {
    setSelectedFormula(formula)
    setFormulaSearch('')
    setIsMatching(true)
    try {
      const ingredients = await loadVpFormulaIngredients(formula.id)
      const names = ingredients.map((i) => i.name)
      const matched = await matchIngredients(names)
      setParsedIngredients(matched)
    } finally {
      setIsMatching(false)
    }
  }, [])

  // -- Generate Analysis Mutation --
  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const ingredientNames = parsedIngredients.map((i) => i.name)
      const subjectName =
        activeMode === 'product' && selectedProduct
          ? selectedProduct.product_name
          : activeMode === 'formula' && selectedFormula
            ? selectedFormula.formula_name_kr || selectedFormula.formula_name_en
            : '사용자 입력 전성분'

      const res = await fetch('/api/research-reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: 'formula_analysis',
          inciNameNormalized: subjectName.toUpperCase().substring(0, 100),
          subjectName,
          subjectType: activeMode === 'formula' ? 'formula' : 'product',
          formulaIngredients: ingredientNames,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || '분석 실패')
      }
      return res.json()
    },
    onSuccess: (data) => {
      if (data.report?.report_markdown) {
        setGeneratedReport({
          markdown: data.report.report_markdown,
          title: data.report.report_title,
        })
        queryClient.invalidateQueries({ queryKey: ['formula-analysis-history'] })
      }
    },
  })

  const matchedCount = parsedIngredients.filter((i) => i.matched).length
  const totalCount = parsedIngredients.length

  return (
    <div className="container mx-auto max-w-[1200px] px-4 py-6 text-[#1A1A1A]">
      {/* Back Navigation */}
      <Link href="/ingredient-intelligence" className="inline-flex items-center text-sm text-[#666666] hover:text-[#1A1A1A] mb-3 transition-colors">
        <ChevronLeft size={16} className="mr-1" /> 성분 인텔리전스
      </Link>

      {/* Header */}
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-blue-500" />
          처방 분석
        </h1>
        <p className="text-sm text-muted-foreground">
          전성분 리스트를 입력하면 AI가 처방 구조, 효능 프로파일, 개선 제안을 분석합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input Area */}
        <div className="space-y-4">
          <Card className="border-[#E5E5E5] shadow-sm bg-white p-6">
            <h3 className="text-base font-semibold text-[#1A1A1A] mb-4">전성분 입력</h3>

            <Tabs value={activeMode} onValueChange={(v) => { setActiveMode(v as InputMode); setParsedIngredients([]); setGeneratedReport(null) }}>
              <TabsList className="bg-gray-100/80 p-1 mb-4 w-full">
                <TabsTrigger value="paste" className="flex-1 text-xs gap-1.5">
                  <ClipboardPaste size={14} /> 텍스트 입력
                </TabsTrigger>
                <TabsTrigger value="product" className="flex-1 text-xs gap-1.5">
                  <Package size={14} /> 제품 선택
                </TabsTrigger>
                <TabsTrigger value="formula" className="flex-1 text-xs gap-1.5">
                  <Beaker size={14} /> 처방 선택
                </TabsTrigger>
              </TabsList>

              {/* Mode A: Paste Text */}
              <TabsContent value="paste" className="space-y-3">
                <Textarea
                  placeholder="전성분 리스트를 붙여넣으세요. 쉼표(,) 또는 줄바꿈으로 구분합니다.&#10;&#10;예: Water, Glycerin, Niacinamide, Butylene Glycol, ..."
                  className="min-h-[200px] text-sm"
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                />
                <Button
                  onClick={handlePasteParse}
                  disabled={!pasteText.trim() || isMatching}
                  className="w-full"
                >
                  {isMatching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                  성분 파싱 & 매칭
                </Button>
              </TabsContent>

              {/* Mode B: Product Select */}
              <TabsContent value="product" className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="제품명 또는 브랜드 검색..."
                    className="pl-9"
                    value={productSearch}
                    onChange={(e) => { setProductSearch(e.target.value); setSelectedProduct(null) }}
                  />
                </div>

                {selectedProduct && (
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-sm">
                    <Check size={14} className="text-blue-600" />
                    <span className="font-medium text-blue-700">{selectedProduct.product_name}</span>
                    {selectedProduct.brand && <span className="text-blue-500 text-xs">({selectedProduct.brand})</span>}
                    <button onClick={() => { setSelectedProduct(null); setParsedIngredients([]) }} className="ml-auto text-blue-400 hover:text-blue-600">
                      <X size={14} />
                    </button>
                  </div>
                )}

                {productSearch.length >= 2 && !selectedProduct && (
                  <div className="max-h-60 overflow-y-auto border rounded-md">
                    {productResults && productResults.length > 0 ? (
                      productResults.map((p) => (
                        <button
                          key={p.slug}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                          onClick={() => handleProductSelect(p)}
                        >
                          <div className="font-medium text-[#1A1A1A]">{p.product_name}</div>
                          {p.brand && <div className="text-xs text-gray-500">{p.brand}</div>}
                        </button>
                      ))
                    ) : (
                      <div className="text-center text-sm text-gray-400 py-6">검색 결과 없음</div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Mode C: Formula Select */}
              <TabsContent value="formula" className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="처방명 검색..."
                    className="pl-9"
                    value={formulaSearch}
                    onChange={(e) => { setFormulaSearch(e.target.value); setSelectedFormula(null) }}
                  />
                </div>

                {selectedFormula && (
                  <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-md px-3 py-2 text-sm">
                    <Check size={14} className="text-purple-600" />
                    <span className="font-medium text-purple-700">{selectedFormula.formula_name_kr || selectedFormula.formula_name_en}</span>
                    {selectedFormula.formulation_type && <Badge variant="secondary" className="text-[10px] ml-1">{selectedFormula.formulation_type}</Badge>}
                    <button onClick={() => { setSelectedFormula(null); setParsedIngredients([]) }} className="ml-auto text-purple-400 hover:text-purple-600">
                      <X size={14} />
                    </button>
                  </div>
                )}

                {formulaSearch.length >= 2 && !selectedFormula && (
                  <div className="max-h-60 overflow-y-auto border rounded-md">
                    {formulaResults && formulaResults.length > 0 ? (
                      formulaResults.map((f) => (
                        <button
                          key={f.id}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                          onClick={() => handleFormulaSelect(f)}
                        >
                          <div className="font-medium text-[#1A1A1A]">{f.formula_name_kr || f.formula_name_en}</div>
                          <div className="flex gap-2 text-xs text-gray-500">
                            {f.category_main && <span>{f.category_main}</span>}
                            {f.formulation_type && <span>• {f.formulation_type}</span>}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-center text-sm text-gray-400 py-6">검색 결과 없음</div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>

          {/* Matched Ingredients Table */}
          {parsedIngredients.length > 0 && (
            <Card className="border-[#E5E5E5] shadow-sm bg-white p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-[#1A1A1A]">매칭 결과</h3>
                <div className="text-xs text-gray-500">
                  <span className="font-semibold text-green-600">{matchedCount}</span>
                  <span> / {totalCount} 매칭</span>
                  <span className="text-gray-400 ml-1">({totalCount > 0 ? ((matchedCount / totalCount) * 100).toFixed(0) : 0}%)</span>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px] text-xs">#</TableHead>
                      <TableHead className="text-xs">성분명</TableHead>
                      <TableHead className="text-xs">한글명</TableHead>
                      <TableHead className="w-[60px] text-xs text-center">매칭</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedIngredients.map((ing) => (
                      <TableRow key={ing.position} className={cn(!ing.matched && 'bg-red-50/50')}>
                        <TableCell className="text-xs text-gray-400 font-mono">{ing.position}</TableCell>
                        <TableCell className="text-sm font-medium">
                          {ing.matched ? (
                            <Link
                              href={`/ingredient-intelligence/${encodeURIComponent(ing.inci_name_normalized || ing.name)}`}
                              className="text-blue-600 hover:underline"
                            >
                              {ing.name}
                            </Link>
                          ) : (
                            <span className="text-gray-600">{ing.name}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">{ing.korean_name || '—'}</TableCell>
                        <TableCell className="text-center">
                          {ing.matched ? (
                            <Check size={14} className="text-green-600 mx-auto" />
                          ) : (
                            <X size={14} className="text-red-400 mx-auto" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Analyze Button */}
              <div className="mt-4 pt-4 border-t">
                <Button
                  onClick={() => analyzeMutation.mutate()}
                  disabled={parsedIngredients.length === 0 || analyzeMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {analyzeMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      AI 분석 중... (15~30초)
                    </>
                  ) : (
                    <>
                      <FlaskConical className="h-4 w-4 mr-2" />
                      처방 분석 실행
                    </>
                  )}
                </Button>
                {analyzeMutation.isError && (
                  <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                    오류: {analyzeMutation.error instanceof Error ? analyzeMutation.error.message : '분석에 실패했습니다.'}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Right: Report Area */}
        <div>
          {analyzeMutation.isPending && (
            <Card className="border-[#E5E5E5] shadow-sm bg-white p-12 flex flex-col items-center justify-center text-center">
              <Loader2 className="h-10 w-10 animate-spin text-blue-400 mb-4" />
              <h3 className="text-base font-semibold text-[#1A1A1A] mb-1">AI 분석 리포트 생성 중</h3>
              <p className="text-sm text-gray-500">
                {totalCount}개 성분을 분석하고 있습니다.
                <br />약 15~30초 소요됩니다.
              </p>
            </Card>
          )}

          {generatedReport && !analyzeMutation.isPending && (
            <Card className="border-[#E5E5E5] shadow-sm bg-white overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-50 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-[#1A1A1A]">{generatedReport.title}</h3>
              </div>
              <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                <MarkdownRenderer content={generatedReport.markdown} />
              </div>
            </Card>
          )}

          {!generatedReport && !analyzeMutation.isPending && (
            <Card className="border-[#E5E5E5] shadow-sm bg-white p-12 flex flex-col items-center justify-center text-center border-dashed">
              <FlaskConical className="h-10 w-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">
                전성분을 입력하고 매칭 후
                <br />
                &ldquo;처방 분석 실행&rdquo; 버튼을 클릭하세요.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Analysis History Section */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-[#1A1A1A]">분석 이력</h2>
          {historyRecords && historyRecords.length > 0 && (
            <Badge variant="secondary" className="text-xs">{historyRecords.length}</Badge>
          )}
        </div>

        {historyLoading ? (
          <Card className="border-[#E5E5E5] shadow-sm bg-white p-8 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </Card>
        ) : !historyRecords || historyRecords.length === 0 ? (
          <Card className="border-[#E5E5E5] shadow-sm bg-white p-8 text-center border-dashed">
            <p className="text-sm text-gray-400">아직 분석 기록이 없습니다.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {historyRecords.map((record) => (
              <HistoryCard
                key={record.id}
                record={record}
                isExpanded={expandedHistoryId === record.id}
                onToggle={() => setExpandedHistoryId(expandedHistoryId === record.id ? null : record.id)}
                onDelete={async () => {
                  if (!window.confirm('이 분석 기록을 삭제하시겠습니까?')) return
                  const result = await deleteFormulaAnalysis(record.id)
                  if (result.success) {
                    queryClient.invalidateQueries({ queryKey: ['formula-analysis-history'] })
                    if (expandedHistoryId === record.id) setExpandedHistoryId(null)
                  } else {
                    alert(`삭제 실패: ${result.error}`)
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── History Card Component ──

function HistoryCard({
  record,
  isExpanded,
  onToggle,
  onDelete,
}: {
  record: FormulaAnalysisRecord
  isExpanded: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  const ingredientCount = record.related_ingredients?.length ?? 0
  const createdDate = (() => {
    try {
      return format(new Date(record.created_at), 'M/d (EEE) HH:mm', { locale: ko })
    } catch {
      return record.created_at
    }
  })()

  return (
    <Card className="border-[#E5E5E5] shadow-sm bg-white overflow-hidden">
      {/* Header — always visible */}
      <button
        className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50/50 transition-colors text-left"
        onClick={onToggle}
      >
        <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-[#1A1A1A] truncate">
            {record.subject_name || '사용자 입력 전성분'}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock size={10} />
              {createdDate}
            </span>
            {ingredientCount > 0 && (
              <span className="text-xs text-gray-400">{ingredientCount}개 성분</span>
            )}
            {record.generation_time_ms && (
              <span className="text-xs text-gray-400">{(record.generation_time_ms / 1000).toFixed(1)}s</span>
            )}
            <Badge
              variant={record.report_status === 'completed' ? 'default' : 'secondary'}
              className={cn(
                'text-[10px] px-1.5 py-0',
                record.report_status === 'completed' && 'bg-green-100 text-green-700 hover:bg-green-100'
              )}
            >
              {record.report_status === 'completed' ? '완료' : record.report_status}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
        >
          <Trash2 size={14} />
        </Button>
        {isExpanded ? (
          <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
        )}
      </button>

      {/* Expanded Report */}
      {isExpanded && record.report_markdown && (
        <div className="border-t px-6 py-5 max-h-[70vh] overflow-y-auto bg-white">
          <MarkdownRenderer content={record.report_markdown} />
        </div>
      )}
    </Card>
  )
}
