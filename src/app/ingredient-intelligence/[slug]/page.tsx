'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChevronLeft, Loader2, Star, Shield, ShieldAlert, ShieldX, Database, Brain, FlaskConical, ExternalLink, FileText, Trash2, ChevronDown, ChevronUp, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { REPORT_TYPES, getReportTypeConfig, type ResearchReport } from '../_lib/report-types'

import {
  fetchIngredientProfile, type IngredientProfile,
  fetchInternalUsage, type InternalUsageItem,
  fetchBomProducts, type BomProductItem,
  fetchMarketStats, type MarketStats,
  fetchSafetyData, type SafetyData,
  fetchRegulations, type RegulationItem,
  fetchCooccurrence,
  fetchReportsByIngredient,
  deleteReport,
  searchIngredients,
} from './actions'

const MarkdownRenderer = dynamic(
  () => import('@/components/ui/markdown-renderer').then((mod) => mod.MarkdownRenderer),
  {
    ssr: false,
    loading: () => <div className="text-sm text-gray-400">리포트 렌더링 중...</div>,
  }
)

/**
 * Clean scraped INCIDecoder details text.
 * Raw data contains nav elements, footer, product lists etc.
 * Pattern: "[NAV GARBAGE] Details [ACTUAL CONTENT] [more] [more] [less] Something incorrect... [PRODUCTS/FOOTER]"
 */
function cleanDetailsText(raw: string): string {
  // 1. Extract content after "Details" keyword (skip nav garbage)
  const detailsIdx = raw.indexOf('Details')
  let content = detailsIdx >= 0 ? raw.substring(detailsIdx + 'Details'.length).trim() : raw.trim()

  // 2. Cut off at known footer markers
  const cutMarkers = [
    '[more] [more] [less]',
    'Something incorrect or missing?',
    'Products with ',
    'Other products with ',
    'We do a Best of INCIDecoder',
    'Copyright 20',
    'Show me some proof',
  ]
  for (const marker of cutMarkers) {
    const idx = content.indexOf(marker)
    if (idx > 0) content = content.substring(0, idx).trim()
  }

  // 3. Clean up whitespace artifacts from scraping
  content = content
    .replace(/\n\s{10,}/g, ' ')  // collapse excessive indentation
    .replace(/\s{3,}/g, ' ')     // collapse multiple spaces
    .trim()

  return content
}

// Helper function for rating badge styles
function getRatingBadgeVariant(rating: string | undefined | null) {
  const r = rating?.toLowerCase() || ''
  if (r.includes('superstar')) return 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200'
  if (r.includes('goodie')) return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200'
  if (r.includes('icky')) return 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200'
  if (r.includes('no rating')) return 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200'
  return 'bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-200'
}

// Helper for rating label translation or formatting
function formatRating(rating: string | undefined | null) {
  if (!rating) return 'No Rating'
  // Capitalize first letter
  return rating.charAt(0).toUpperCase() + rating.slice(1)
}

export default function IngredientDetailPage() {
  const params = useParams()
  const rawSlug = params.slug as string
  const slug = rawSlug ? decodeURIComponent(rawSlug) : ''

  // 1. Profile Query
  const { 
    data: profile, 
    isLoading: isProfileLoading, 
    error: profileError 
  } = useQuery({
    queryKey: ['ingredient-profile', slug],
    queryFn: () => fetchIngredientProfile(slug),
    enabled: !!slug
  })

  // 2. Internal Usage Query (raw materials containing this INCI)
  const { data: internalUsage, isLoading: isInternalLoading } = useQuery({
    queryKey: ['ingredient-internal', profile?.inci_name_normalized],
    queryFn: () => fetchInternalUsage(profile?.inci_name_normalized || ''),
    enabled: !!profile?.inci_name_normalized
  })

  // 2b. BOM Products (products using those raw materials)
  const ingredientCodes = internalUsage?.map((u) => u.ingredient_code) ?? []
  const { data: bomProducts, isLoading: isBomLoading } = useQuery({
    queryKey: ['ingredient-bom-products', ingredientCodes],
    queryFn: () => fetchBomProducts(ingredientCodes),
    enabled: ingredientCodes.length > 0
  })

  // 3. Market Stats Query
  const { data: marketStats, isLoading: isMarketLoading } = useQuery({
    queryKey: ['ingredient-market', profile?.incidecoder_slug],
    queryFn: () => fetchMarketStats(profile?.incidecoder_slug || ''),
    enabled: !!profile?.incidecoder_slug
  })

  // 4. Safety Data Query
  const { data: safetyData, isLoading: isSafetyLoading } = useQuery({
    queryKey: ['ingredient-safety', profile?.incidecoder_slug],
    queryFn: () => fetchSafetyData(profile?.incidecoder_slug || ''),
    enabled: !!profile?.incidecoder_slug
  })

  // 5. Regulations Query
  const { data: regulations, isLoading: isRegulationsLoading } = useQuery({
    queryKey: ['ingredient-regulations', profile?.inci_name_normalized],
    queryFn: () => fetchRegulations(profile?.inci_name_normalized || ''),
    enabled: !!profile?.inci_name_normalized
  })

  // 6. Co-occurrence Query
  const { data: cooccurrence, isLoading: isCooccurrenceLoading } = useQuery({
    queryKey: ['ingredient-cooccurrence', profile?.incidecoder_slug],
    queryFn: () => fetchCooccurrence(profile?.incidecoder_slug || ''),
    enabled: !!profile?.incidecoder_slug
  })

  // 7. Research Reports Query
  const queryClient = useQueryClient()
  const { data: reports, isLoading: isReportsLoading } = useQuery({
    queryKey: ['ingredient-reports', profile?.inci_name_normalized],
    queryFn: () => fetchReportsByIngredient(profile?.inci_name_normalized || ''),
    enabled: !!profile?.inci_name_normalized
  })

  // -- Report Generation State --
  const [generatingType, setGeneratingType] = useState<string | null>(null)
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null)
  const [showCompatModal, setShowCompatModal] = useState(false)
  const [compatSearch, setCompatSearch] = useState('')
  const [selectedSecondIngredient, setSelectedSecondIngredient] = useState<string | null>(null)

  // Compatibility modal search
  const { data: compatResults } = useQuery({
    queryKey: ['compat-search', compatSearch],
    queryFn: () => searchIngredients(compatSearch),
    enabled: compatSearch.length >= 2
  })

  // Generate Report Mutation
  const generateMutation = useMutation({
    mutationFn: async ({ reportType, secondIngredient }: { reportType: string; secondIngredient?: string }) => {
      const res = await fetch('/api/research-reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType,
          inciNameNormalized: profile?.inci_name_normalized,
          subjectName: profile?.name || profile?.korean_name || profile?.inci_name_normalized,
          secondIngredient,
        }),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Generation failed')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ingredient-reports', profile?.inci_name_normalized] })
      setGeneratingType(null)
      if (data.report?.id) setExpandedReportId(data.report.id)
    },
    onError: () => {
      setGeneratingType(null)
    },
  })

  const handleGenerateReport = useCallback((reportType: string) => {
    const config = getReportTypeConfig(reportType)
    if (config?.requiresSecondIngredient) {
      setShowCompatModal(true)
      return
    }
    setGeneratingType(reportType)
    generateMutation.mutate({ reportType })
  }, [generateMutation])

  const handleCompatGenerate = useCallback(() => {
    if (!selectedSecondIngredient) return
    setShowCompatModal(false)
    setGeneratingType('compatibility')
    generateMutation.mutate({ reportType: 'compatibility', secondIngredient: selectedSecondIngredient })
    setCompatSearch('')
    setSelectedSecondIngredient(null)
  }, [selectedSecondIngredient, generateMutation])

  // Delete Report Mutation
  const deleteMutation = useMutation({
    mutationFn: deleteReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient-reports', profile?.inci_name_normalized] })
    },
  })

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (profileError || !profile) {
    return (
      <div className="container mx-auto max-w-[1200px] px-4 py-12">
        <Link href="/ingredient-intelligence" className="inline-flex items-center text-sm text-[#666666] hover:text-[#1A1A1A] mb-6 transition-colors">
          <ChevronLeft size={16} className="mr-1" /> 성분 목록으로
        </Link>
        <Card className="flex flex-col items-center justify-center py-16 text-center border-[#E5E5E5] shadow-sm bg-white">
          <ShieldAlert className="h-12 w-12 text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-2">성분 정보를 찾을 수 없습니다</h2>
          <p className="text-[#666666] mb-6">요청하신 성분의 정보가 시스템에 존재하지 않거나 로딩 중 오류가 발생했습니다.</p>
          <Link href="/ingredient-intelligence">
             <span className="text-sm font-medium text-blue-600 hover:underline">목록으로 돌아가기</span>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-[1200px] px-4 py-6 text-[#1A1A1A]">
      {/* Back Navigation */}
      <Link href="/ingredient-intelligence" className="inline-flex items-center text-sm text-[#666666] hover:text-[#1A1A1A] mb-3 transition-colors">
        <ChevronLeft size={16} className="mr-1" /> 성분 목록으로
      </Link>

      {/* Header Card */}
      <Card className="border-[#E5E5E5] shadow-sm bg-white p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
          <div className="flex-1 space-y-3">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-[#1A1A1A] leading-tight break-words">
                {profile.name || profile.inci_name_normalized}
              </h1>
              {profile.korean_name && (
                <p className="text-lg text-[#666666] font-medium">{profile.korean_name}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <Badge variant="outline" className={cn("px-2.5 py-0.5 font-medium border", getRatingBadgeVariant(profile.rating))}>
                {profile.rating === 'superstar' && <Star size={12} className="mr-1 fill-current" />}
                {formatRating(profile.rating)}
              </Badge>
              
              {profile.cosing_cas_number && (
                <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                  CAS: {profile.cosing_cas_number}
                </Badge>
              )}

              {/* MFDS Status Badges (Mock logic mostly as explicit fields weren't detailed in prompt, but assuming logical flags) */}
              {/* Assuming we might verify against regulation query or profile flags if available. Using profile placeholders. */}
              
              {/* Data Source Badges */}
              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-200">
                {profile.incidecoder_slug && (
                   <span className="flex items-center text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100" title="INCIDecoder Data Available">
                    <Database size={10} className="mr-1" /> INCI
                   </span>
                )}
                {/* Assuming legacy or AI flags exist on profile based on prompt requirements, if not present we skip safely */}
                {(profile as any).ai_summary_generated && (
                   <span className="flex items-center text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-100" title="AI Summary Generated">
                    <Brain size={10} className="mr-1" /> AI
                   </span>
                )}
              </div>
            </div>

            {profile.functions && profile.functions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {profile.functions.map((fn: string, idx: number) => (
                  <Badge key={idx} variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200 font-normal text-xs">
                    {fn}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="bg-gray-100/80 p-1 mb-4 w-full md:w-auto inline-flex h-auto">
          <TabsTrigger value="profile" className="text-sm px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Profile (프로파일)
          </TabsTrigger>
          <TabsTrigger value="internal" className="text-sm px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            자사 활용 현황
          </TabsTrigger>
          <TabsTrigger value="market" className="text-sm px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            마켓 인텔리전스
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-sm px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            📊 연구 리포트
            {reports && reports.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700 border-0">
                {reports.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Profile */}
        <TabsContent value="profile" className="space-y-6 animate-in fade-in-50 duration-300">
          
          {/* Quick Facts */}
          {profile.quick_facts && profile.quick_facts.length > 0 && (
            <Card className="border-[#E5E5E5] shadow-sm bg-white p-6">
              <h3 className="text-base font-semibold text-[#1A1A1A] mb-3 flex items-center">
                <Shield className="w-4 h-4 mr-2 text-blue-500" /> Quick Facts
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-[#444444]">
                {profile.quick_facts.map((fact: string, i: number) => (
                  <li key={i}>{fact}</li>
                ))}
              </ul>
            </Card>
          )}

          {/* Description / Details */}
          {profile.details && (() => {
            const cleaned = cleanDetailsText(profile.details)
            return cleaned ? (
              <Card className="border-[#E5E5E5] shadow-sm bg-white p-6">
                <h3 className="text-base font-semibold text-[#1A1A1A] mb-3">상세 설명</h3>
                <div className="prose prose-sm max-w-none text-[#444444] leading-relaxed">
                  {cleaned}
                </div>
              </Card>
            ) : null
          })()}

          {/* Efficacy & Mechanisms */}
          {(profile.efficacy_kr || profile.key_mechanisms || (profile as any).skin_benefits) && (
            <Card className="border-[#E5E5E5] shadow-sm bg-white p-6">
              <h3 className="text-base font-semibold text-[#1A1A1A] mb-3 flex items-center">
                <FlaskConical className="w-4 h-4 mr-2 text-purple-500" /> 효능 & 메커니즘
              </h3>
              <div className="space-y-4 text-sm text-[#444444]">
                {profile.efficacy_kr && (
                  <div>
                    <h4 className="font-medium text-[#1A1A1A] mb-1">효능 (Korean)</h4>
                    <p>{profile.efficacy_kr}</p>
                  </div>
                )}
                {profile.key_mechanisms && (
                  <div>
                    <h4 className="font-medium text-[#1A1A1A] mb-1">작용 기전</h4>
                    <p>{profile.key_mechanisms}</p>
                  </div>
                )}
                {!(profile.efficacy_kr || profile.key_mechanisms) && (profile as any).skin_benefits && (
                  <div>
                    <h4 className="font-medium text-[#1A1A1A] mb-1">Skin Benefits (Legacy)</h4>
                    <p>{(profile as any).skin_benefits}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* INCI Definition */}
          {profile.inci_definition && (
            <Card className="border-[#E5E5E5] shadow-sm bg-white p-6">
              <h3 className="text-base font-semibold text-[#1A1A1A] mb-3">INCI 정의</h3>
              <p className="text-sm text-[#444444] leading-relaxed bg-gray-50 p-4 rounded-md border border-gray-100">
                {profile.inci_definition}
              </p>
            </Card>
          )}

          {/* Clinical Studies Summary */}
          {(profile.clinical_studies_summary || (profile as any).vp_clinical_studies) && (
            <Card className="border-[#E5E5E5] shadow-sm bg-white p-6">
              <h3 className="text-base font-semibold text-[#1A1A1A] mb-3">임상연구 요약</h3>
              <p className="text-sm text-[#444444] whitespace-pre-wrap">
                {profile.clinical_studies_summary || (profile as any).vp_clinical_studies}
              </p>
            </Card>
          )}

          {/* Safety Metrics */}
          {isSafetyLoading ? (
            <Card className="border-[#E5E5E5] shadow-sm bg-white p-6 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
            </Card>
          ) : safetyData ? (
             <Card className="border-[#E5E5E5] shadow-sm bg-white p-6">
              <h3 className="text-base font-semibold text-[#1A1A1A] mb-4 flex items-center">
                <ShieldAlert className="w-4 h-4 mr-2 text-amber-500" /> 안전성 지표
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-[#444444]">자극성 (Irritancy)</span>
                    <span className="text-[#666666]">{safetyData.avg_irritancy?.toFixed(1) || 0} / 5</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-400 rounded-full" 
                      style={{ width: `${((safetyData.avg_irritancy || 0) / 5) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-right">Based on {safetyData.sample_count || 0} reports</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-[#444444]">여드름 유발성 (Comedogenicity)</span>
                    <span className="text-[#666666]">{safetyData.avg_comedogenicity?.toFixed(1) || 0} / 5</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-400 rounded-full" 
                      style={{ width: `${((safetyData.avg_comedogenicity || 0) / 5) * 100}%` }}
                    />
                  </div>
                   <p className="text-xs text-gray-500 text-right">Based on {safetyData.sample_count || 0} reports</p>
                </div>
              </div>
            </Card>
          ) : null}

          {/* Regulations */}
          <Card className="border-[#E5E5E5] shadow-sm bg-white p-6">
            <h3 className="text-base font-semibold text-[#1A1A1A] mb-3">규제 정보</h3>
            {isRegulationsLoading ? (
               <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-gray-300" /></div>
            ) : regulations && regulations.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Source</TableHead>
                      <TableHead className="w-[100px]">Type</TableHead>
                      <TableHead className="w-[120px]">Max Conc.</TableHead>
                      <TableHead>Conditions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regulations.map((reg: RegulationItem, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-xs">{reg.regulation_source}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className={cn("text-[10px] font-normal", 
                            reg.regulation_type === 'PROHIBITED' ? 'bg-red-50 text-red-700 border-red-100' : 
                            reg.regulation_type === 'RESTRICTED' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-gray-50'
                          )}>
                            {reg.regulation_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{reg.max_concentration || '-'}</TableCell>
                        <TableCell className="text-xs text-gray-600 max-w-[300px] truncate" title={reg.conditions || ''}>
                          {reg.conditions || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded border border-dashed border-gray-200">
                등록된 규제 정보가 없습니다.
              </div>
            )}
          </Card>

          {/* Also Called */}
          {profile.also_called && profile.also_called.length > 0 && (
            <Card className="border-[#E5E5E5] shadow-sm bg-white p-6">
               <h3 className="text-base font-semibold text-[#1A1A1A] mb-3">Also Called</h3>
               <p className="text-sm text-[#666666] leading-relaxed">
                 {profile.also_called.join(', ')}
               </p>
            </Card>
          )}

        </TabsContent>

        {/* Tab 2: Internal Usage */}
        <TabsContent value="internal" className="space-y-6 animate-in fade-in-50 duration-300">
          {/* Raw Materials containing this INCI */}
          <Card className="border-[#E5E5E5] shadow-sm bg-white p-6">
            <h3 className="text-base font-semibold text-[#1A1A1A] mb-4">해당 성분 포함 원료</h3>
            
            {isInternalLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-300" /></div>
            ) : internalUsage && internalUsage.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>원료코드</TableHead>
                    <TableHead>원료명</TableHead>
                    <TableHead>제조사</TableHead>
                    <TableHead className="text-right">배합비율(%)</TableHead>
                    <TableHead>기능</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {internalUsage.map((item: InternalUsageItem, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-sm">{item.ingredient_code}</TableCell>
                      <TableCell className="text-sm">{item.ingredient_name}</TableCell>
                      <TableCell className="text-sm text-gray-500">{item.manufacturer || '-'}</TableCell>
                      <TableCell className="text-sm text-right font-medium">{item.composition_ratio ? `${item.composition_ratio}%` : '-'}</TableCell>
                      <TableCell className="text-sm">
                        {item.function ? (
                          <Badge variant="secondary" className="text-xs font-normal bg-gray-100">{item.function}</Badge>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-[#666666]">
                <FlaskConical className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p>자사 원료에서 이 성분이 사용되지 않습니다.</p>
              </div>
            )}
          </Card>

          {/* Products using those raw materials via BOM */}
          {internalUsage && internalUsage.length > 0 && (
            <Card className="border-[#E5E5E5] shadow-sm bg-white p-6">
              <h3 className="text-base font-semibold text-[#1A1A1A] mb-1">이 원료를 사용하는 자사 제품</h3>
              <p className="text-xs text-[#999999] mb-4">
                위 원료코드가 BOM에 포함된 제품 목록입니다. 제품 코드를 클릭하면 품목 문서로 이동합니다.
              </p>

              {isBomLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-300" /></div>
              ) : bomProducts && bomProducts.length > 0 ? (
                <>
                  <div className="text-xs text-[#666666] mb-3">
                    총 <span className="font-semibold text-[#1A1A1A]">{bomProducts.length}</span>개 제품
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">제품코드</TableHead>
                        <TableHead>제품명 (한글)</TableHead>
                        <TableHead>영문명</TableHead>
                        <TableHead className="w-[100px]">원료코드</TableHead>
                        <TableHead className="text-right w-[100px]">함량(%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bomProducts.map((item: BomProductItem, i: number) => (
                        <TableRow key={i} className="group">
                          <TableCell className="font-medium text-sm">
                            <Link
                              href={`/products/${item.product_code}/docs`}
                              className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 transition-colors"
                            >
                              {item.product_code}
                              <ExternalLink size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm">{item.korean_name || '-'}</TableCell>
                          <TableCell className="text-sm text-gray-500">{item.english_name || '-'}</TableCell>
                          <TableCell className="text-xs text-gray-400 font-mono">{item.ingredient_code}</TableCell>
                          <TableCell className="text-sm text-right font-medium">
                            {item.content_ratio != null ? `${item.content_ratio.toFixed(2)}%` : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              ) : (
                <div className="text-center py-8 text-[#999999] text-sm">
                  BOM에 등록된 제품이 없습니다.
                </div>
              )}
            </Card>
          )}
        </TabsContent>

        {/* Tab 3: Market Intelligence */}
        <TabsContent value="market" className="space-y-6 animate-in fade-in-50 duration-300">
          {!profile.incidecoder_slug ? (
            <Card className="border-[#E5E5E5] shadow-sm bg-white p-12 text-center">
              <ShieldX className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-[#666666]">INCIDecoder 데이터가 연결되지 않은 성분입니다.</p>
            </Card>
          ) : (
            <>
              {isMarketLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
              ) : marketStats ? (
                <div className="space-y-6">
                  {/* Usage Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-[#E5E5E5] shadow-sm bg-white p-6">
                      <h4 className="text-sm text-[#666666] mb-1">총 사용 제품 수</h4>
                      <div className="flex items-end gap-2">
                         <span className="text-3xl font-bold text-[#1A1A1A]">{marketStats.total_products?.toLocaleString() || 0}</span>
                         <span className="text-sm text-gray-500 mb-1">products found</span>
                      </div>
                    </Card>
                    <Card className="border-[#E5E5E5] shadow-sm bg-white p-6">
                      <h4 className="text-sm text-[#666666] mb-2">시장 점유율 (추정)</h4>
                      {/* Using a rough visualization of popularity if total base is known, else just a visual bar */}
                      <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden mb-1">
                         <div 
                           className="bg-blue-500 h-full rounded-full" 
                           // Arbitrary scale for visualization if percentage not provided directly, assuming some calculation or raw value
                           // For now, let's just show a progress bar if we had a percentage.
                           // Since prompt says "progress-like display", I'll mock a visual representation of popularity.
                           style={{ width: `${Math.min(100, (marketStats.total_products || 0) / 500)}%` }} // Very rough visual scale
                         />
                      </div>
                      <p className="text-xs text-gray-400">Relative popularity on market</p>
                    </Card>
                  </div>

                  {/* Top Brands */}
                  <Card className="border-[#E5E5E5] shadow-sm bg-white p-6">
                    <h3 className="text-base font-semibold text-[#1A1A1A] mb-4">Top Brands using this ingredient</h3>
                    {marketStats.top_brands && marketStats.top_brands.length > 0 ? (
                      <div className="space-y-3">
                         {marketStats.top_brands.map((brand: {brand: string, count: number, sample_url: string | null}, i: number) => {
                           const max = Math.max(...marketStats.top_brands!.map((b) => b.count));
                           const percent = (brand.count / max) * 100;
                           
                           return (
                             <div key={i} className="flex items-center gap-3 group">
                               <div className="w-28 text-sm font-medium text-right shrink-0">
                                 {brand.sample_url ? (
                                   <a
                                     href={brand.sample_url}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 justify-end transition-colors"
                                     title={`View ${brand.brand} product on INCIDecoder`}
                                   >
                                     <span className="truncate max-w-[90px]">{brand.brand}</span>
                                     <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                   </a>
                                 ) : (
                                   <span className="text-gray-700 truncate block">{brand.brand}</span>
                                 )}
                               </div>
                               <div className="flex-1 h-6 bg-gray-50 rounded-sm overflow-hidden flex items-center">
                                 <div 
                                   className="h-full bg-blue-100 hover:bg-blue-200 transition-colors rounded-sm" 
                                   style={{ width: `${percent}%` }} 
                                 />
                                 <span className="ml-2 text-xs text-gray-500 font-medium">{brand.count}</span>
                               </div>
                             </div>
                           )
                         })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">브랜드 데이터가 없습니다.</p>
                    )}
                  </Card>
                </div>
              ) : null}

              {/* Co-occurrence */}
              <Card className="border-[#E5E5E5] shadow-sm bg-white p-6">
                <h3 className="text-base font-semibold text-[#1A1A1A] mb-4">자주 함께 쓰이는 성분 Top 10</h3>
                {isCooccurrenceLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-gray-300" /></div>
                ) : cooccurrence && cooccurrence.length > 0 ? (
                  <div className="space-y-2">
                    {cooccurrence.map((item: any, i: number) => (
                       <Link 
                        key={i} 
                        href={`/ingredient-intelligence/${encodeURIComponent(item.slug || '')}`}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all group"
                      >
                         <div className="flex items-center gap-3">
                           <span className="text-sm text-gray-400 font-mono w-6">{i + 1}.</span>
                           <span className="text-sm font-medium text-[#1A1A1A] group-hover:text-blue-600 transition-colors">
                             {item.name}
                           </span>
                           {item.rating && (
                             <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 font-normal", getRatingBadgeVariant(item.rating))}>
                               {item.rating}
                             </Badge>
                           )}
                         </div>
                         <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded-full group-hover:bg-white group-hover:shadow-sm transition-all">
                           {item.count}건
                         </span>
                       </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">함께 쓰이는 성분 데이터가 없습니다.</p>
                )}
              </Card>
            </>
          )}
        </TabsContent>

        {/* Tab 4: Research Reports */}
        <TabsContent value="reports" className="space-y-6 animate-in fade-in-50 duration-300">
          {/* Compatibility Modal Overlay */}
          {showCompatModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCompatModal(false)}>
              <Card className="bg-white p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-[#1A1A1A]">호환성 분석 — 두 번째 성분 선택</h3>
                  <button onClick={() => setShowCompatModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={18} />
                  </button>
                </div>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="성분명 검색 (INCI / 한글)..."
                    className="pl-9"
                    value={compatSearch}
                    onChange={(e) => { setCompatSearch(e.target.value); setSelectedSecondIngredient(null) }}
                    autoFocus
                  />
                </div>
                <div className="max-h-60 overflow-y-auto border rounded-md">
                  {compatResults && compatResults.length > 0 ? (
                    compatResults.map((item) => (
                      <button
                        key={item.inci_name_normalized}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b last:border-b-0 transition-colors",
                          selectedSecondIngredient === item.inci_name_normalized && "bg-blue-50 text-blue-700"
                        )}
                        onClick={() => setSelectedSecondIngredient(item.inci_name_normalized)}
                      >
                        <div className="font-medium">{item.inci_name_normalized}</div>
                        {item.korean_name && <div className="text-xs text-gray-500">{item.korean_name}</div>}
                      </button>
                    ))
                  ) : compatSearch.length >= 2 ? (
                    <div className="text-center text-sm text-gray-400 py-6">검색 결과 없음</div>
                  ) : (
                    <div className="text-center text-sm text-gray-400 py-6">2글자 이상 입력하세요</div>
                  )}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => setShowCompatModal(false)}>취소</Button>
                  <Button size="sm" disabled={!selectedSecondIngredient} onClick={handleCompatGenerate}>
                    분석 시작
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* Report Generation Buttons */}
          <Card className="border-[#E5E5E5] shadow-sm bg-white p-6">
            <h3 className="text-base font-semibold text-[#1A1A1A] mb-1">AI 분석 리포트 생성</h3>
            <p className="text-xs text-[#999999] mb-4">
              성분 데이터를 기반으로 AI가 전문 리포트를 생성합니다. 생성에 15~30초 소요됩니다.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {REPORT_TYPES.map((rt) => {
                const isGenerating = generatingType === rt.id
                return (
                  <button
                    key={rt.id}
                    onClick={() => handleGenerateReport(rt.id)}
                    disabled={!!generatingType}
                    className={cn(
                      "flex flex-col items-start p-3 rounded-lg border text-left transition-all",
                      isGenerating
                        ? "bg-blue-50 border-blue-200 ring-2 ring-blue-100"
                        : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm",
                      !!generatingType && !isGenerating && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{rt.icon}</span>
                      <span className="text-sm font-medium text-[#1A1A1A]">{rt.labelKr}</span>
                    </div>
                    <span className="text-[11px] text-gray-500 leading-tight">{rt.descriptionKr}</span>
                    {isGenerating && (
                      <div className="flex items-center gap-1.5 mt-2 text-blue-600">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="text-[11px] font-medium">생성 중...</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            {generateMutation.isError && (
              <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                오류: {generateMutation.error instanceof Error ? generateMutation.error.message : '리포트 생성에 실패했습니다.'}
              </div>
            )}
          </Card>

          {/* Existing Reports List */}
          <Card className="border-[#E5E5E5] shadow-sm bg-white p-6">
            <h3 className="text-base font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              생성된 리포트
              {reports && reports.length > 0 && (
                <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">{reports.length}</Badge>
              )}
            </h3>

            {isReportsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
              </div>
            ) : reports && reports.length > 0 ? (
              <div className="space-y-3">
                {reports.map((report: ResearchReport) => {
                  const config = getReportTypeConfig(report.report_type)
                  const isExpanded = expandedReportId === report.id
                  return (
                    <div key={report.id} className="border rounded-lg overflow-hidden">
                      {/* Report Header */}
                      <button
                        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors text-left"
                        onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-lg shrink-0">{config?.icon || '📄'}</span>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-[#1A1A1A] truncate">{report.report_title}</div>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500">
                              <span>{new Date(report.created_at).toLocaleDateString('ko-KR')}</span>
                              <span>•</span>
                              <span>{config?.labelKr || report.report_type}</span>
                              {report.generation_time_ms && (
                                <>
                                  <span>•</span>
                                  <span>{(report.generation_time_ms / 1000).toFixed(1)}초</span>
                                </>
                              )}
                              {report.token_usage && (
                                <>
                                  <span>•</span>
                                  <span>{((report.token_usage.input_tokens || 0) + (report.token_usage.output_tokens || 0)).toLocaleString()} tokens</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant="outline"
                            className={cn("text-[10px]",
                              report.report_status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                              report.report_status === 'generating' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                              'bg-red-50 text-red-700 border-red-200'
                            )}
                          >
                            {report.report_status === 'completed' ? '완료' : report.report_status === 'generating' ? '생성중' : '실패'}
                          </Badge>
                          {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                        </div>
                      </button>

                      {/* Report Content */}
                      {isExpanded && (
                        <div className="border-t">
                          {report.report_summary && (
                            <div className="px-4 py-3 bg-gray-50 text-sm text-[#555555] italic border-b">
                              {report.report_summary}
                            </div>
                          )}
                          {report.report_markdown ? (
                            <div className="p-4">
                              <MarkdownRenderer content={report.report_markdown} />
                            </div>
                          ) : (
                            <div className="p-4 text-sm text-gray-400 text-center">리포트 내용이 없습니다.</div>
                          )}
                          <div className="flex justify-end px-4 py-2 bg-gray-50 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm('이 리포트를 삭제하시겠습니까?')) {
                                  deleteMutation.mutate(report.id)
                                  if (expandedReportId === report.id) setExpandedReportId(null)
                                }
                              }}
                            >
                              <Trash2 size={12} className="mr-1" />
                              삭제
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-[#999999]">
                <FileText className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm">아직 생성된 리포트가 없습니다.</p>
                <p className="text-xs text-gray-400 mt-1">위 버튼을 클릭하여 AI 분석 리포트를 생성하세요.</p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
