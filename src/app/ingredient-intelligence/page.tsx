'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Loader2, ChevronLeft, ChevronRight, Star, Database, Brain, FlaskConical, Check, AlertTriangle, XCircle, CheckSquare, Square } from 'lucide-react'
import { fetchAllIngredients, fetchReportCounts, type IngredientListItem } from './actions'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 30

export default function IngredientIntelligencePage() {
  const router = useRouter()
  
  // -- State --
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedRating, setSelectedRating] = useState<string | null>(null) // null = All
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [mfdsOnly, setMfdsOnly] = useState(false)
  const [page, setPage] = useState(1)

  // -- Debounce Search --
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // -- Reset Page on Filter Change --
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, selectedRating, selectedCategory, mfdsOnly])

  // -- Data Fetching --
  const { data, isLoading } = useQuery({
    queryKey: ['ingredient-intelligence'],
    queryFn: fetchAllIngredients,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (prev) => prev,
  })

  // -- Report Counts --
  const { data: reportCounts } = useQuery({
    queryKey: ['ingredient-report-counts'],
    queryFn: fetchReportCounts,
    staleTime: 2 * 60 * 1000,
  })

  // -- Filtering Logic --
  const filteredData = useMemo(() => {
    if (!data?.ingredients) return []

    return data.ingredients.filter((item) => {
      // 1. Search (INCI, Korean, Name)
      if (debouncedSearch) {
        const lowerSearch = debouncedSearch.toLowerCase()
        const matchesInci = item.inci_name_normalized.toLowerCase().includes(lowerSearch)
        const matchesKorean = item.korean_name?.toLowerCase().includes(lowerSearch)
        const matchesName = item.name?.toLowerCase().includes(lowerSearch)
        if (!matchesInci && !matchesKorean && !matchesName) return false
      }

      // 2. Rating Filter
      if (selectedRating) {
        if (item.rating !== selectedRating) return false
      }

      // 3. Category Filter
      if (selectedCategory !== 'all') {
        // Filter by checking if 'functions' array contains the category
        if (!item.functions?.includes(selectedCategory)) return false
      }

      // 4. MFDS Filter
      if (mfdsOnly) {
        if (item.mfds_registered !== true) return false
      }

      return true
    })
  }, [data, debouncedSearch, selectedRating, selectedCategory, mfdsOnly])

  // -- Pagination Logic --
  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE)
  const paginatedData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredData.slice(start, start + PAGE_SIZE)
  }, [filteredData, page])

  // -- Stats Logic --
  const stats = useMemo(() => {
    const total = data?.ingredients.length || 0
    const filtered = filteredData.length
    const matched = filteredData.filter(i => i.has_incidecoder).length
    const percent = filtered > 0 ? ((matched / filtered) * 100).toFixed(1) : '0.0'
    return { total, filtered, matched, percent }
  }, [data, filteredData])

  // -- Event Handlers --
  const handleRowClick = (item: IngredientListItem) => {
    const slug = item.incidecoder_slug || encodeURIComponent(item.inci_name_normalized)
    router.push(`/ingredient-intelligence/${slug}`)
  }

  // -- Render Helpers --
  const renderRatingBadge = (rating: string | null) => {
    if (!rating) return <span className="text-gray-400 text-xs">—</span>
    
    switch (rating) {
      case 'superstar':
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 gap-1 pl-1.5 pr-2">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
            Superstar
          </Badge>
        )
      case 'goodie':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
            Goodie
          </Badge>
        )
      case 'icky':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">
            Icky
          </Badge>
        )
      case 'no rating':
        return <span className="text-gray-400 text-xs">—</span>
      default:
        return (
          <Badge variant="outline" className="text-gray-600 border-gray-200">
            {rating}
          </Badge>
        )
    }
  }

  const renderMfdsBadge = (item: IngredientListItem) => {
    if (item.mfds_registered) {
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 pl-1.5 pr-2">
          <Check className="w-3 h-3" />
          등록
        </Badge>
      )
    }
    if (item.mfds_restricted === 'restricted') {
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 gap-1 pl-1.5 pr-2">
          <AlertTriangle className="w-3 h-3" />
          제한
        </Badge>
      )
    }
    if (item.mfds_restricted === 'banned') {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1 pl-1.5 pr-2">
          <XCircle className="w-3 h-3" />
          금지
        </Badge>
      )
    }
    return <Badge variant="secondary" className="text-gray-400 bg-gray-100 font-normal">미확인</Badge>
  }

  if (isLoading && !data) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-[1200px] px-4 py-6 text-[#1A1A1A]">
      {/* Header */}
      <div className="mb-6 space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">성분 인텔리전스</h1>
          <Badge variant="secondary" className="rounded-full px-2.5 bg-gray-100 text-gray-600">
            {data?.ingredients.length || 0}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          자사 성분 데이터와 글로벌 데이터를 통합 분석합니다.
        </p>
      </div>

      {/* Filter Section */}
      <div className="space-y-4 mb-6">
        {/* Search */}
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            placeholder="성분명(INCI), 한글명 검색..."
            className="pl-9 bg-white border-[#E5E5E5] focus-visible:ring-[#1A1A1A]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Rating Filter */}
          <div className="flex items-center gap-1 p-1 bg-gray-50 rounded-lg border border-gray-100">
            {[
              { id: null, label: 'All' },
              { id: 'superstar', label: 'Superstar' },
              { id: 'goodie', label: 'Goodie' },
              { id: 'icky', label: 'Icky' },
            ].map((opt) => (
              <button
                key={opt.label}
                onClick={() => setSelectedRating(opt.id as string | null)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  selectedRating === opt.id
                    ? "bg-white text-[#1A1A1A] shadow-sm ring-1 ring-gray-200"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/50"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <Select 
            value={selectedCategory} 
            onValueChange={setSelectedCategory}
          >
            <SelectTrigger className="w-[180px] h-9 text-sm bg-white border-[#E5E5E5]">
              <SelectValue placeholder="카테고리 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 카테고리</SelectItem>
              {data?.categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* MFDS Checkbox */}
          <button
            onClick={() => setMfdsOnly(!mfdsOnly)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors border",
              mfdsOnly
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-white border-dashed border-gray-300 text-gray-500 hover:bg-gray-50"
            )}
          >
            {mfdsOnly ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            <span className="font-medium">MFDS 등록 성분만</span>
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="mb-3 text-xs text-gray-500 flex items-center gap-2">
        <span>전체 <span className="font-semibold text-gray-900">{stats.total}</span></span>
        <span className="w-px h-3 bg-gray-300" />
        <span>검색결과 <span className="font-semibold text-gray-900">{stats.filtered}</span></span>
        <span className="w-px h-3 bg-gray-300" />
        <span>
          INCIDecoder 매칭 <span className="font-semibold text-gray-900">{stats.matched}</span>
          <span className="text-gray-400 ml-1">({stats.percent}%)</span>
        </span>
      </div>

      {/* Table Section */}
      <Card className="border-[#E5E5E5] shadow-sm overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-[#F9F9F9]">
            <TableRow>
              <TableHead className="w-[30%] text-xs font-medium text-[#666666]">성분명 (INCI)</TableHead>
              <TableHead className="w-[20%] text-xs font-medium text-[#666666]">한글명</TableHead>
              <TableHead className="w-[12%] text-xs font-medium text-[#666666]">Rating</TableHead>
              <TableHead className="w-[20%] text-xs font-medium text-[#666666]">기능</TableHead>
              <TableHead className="w-[10%] text-xs font-medium text-[#666666]">MFDS</TableHead>
              <TableHead className="w-[6%] text-xs font-medium text-[#666666] text-center">리포트</TableHead>
              <TableHead className="w-[8%] text-xs font-medium text-[#666666] text-right">데이터</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  검색 결과가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => (
                <TableRow 
                  key={item.inci_name_normalized} 
                  className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  onClick={() => handleRowClick(item)}
                >
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="text-sm text-[#1A1A1A] group-hover:text-blue-600 transition-colors">
                        {item.name || item.inci_name_normalized}
                      </span>
                      {item.name && item.name !== item.inci_name_normalized && (
                        <span className="text-xs text-gray-400 truncate max-w-[200px]">
                          {item.inci_name_normalized}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {item.korean_name || "—"}
                  </TableCell>
                  <TableCell>
                    {renderRatingBadge(item.rating)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {item.functions && item.functions.length > 0 ? (
                        <>
                          {item.functions.slice(0, 2).map((fn, idx) => (
                            <Badge 
                              key={idx} 
                              variant="secondary" 
                              className="text-[10px] px-1.5 py-0 h-5 bg-gray-100 text-gray-600 font-normal border-0"
                            >
                              {fn}
                            </Badge>
                          ))}
                          {item.functions.length > 2 && (
                            <Badge 
                              variant="secondary" 
                              className="text-[10px] px-1.5 py-0 h-5 bg-gray-50 text-gray-400 font-normal border-0"
                            >
                              +{item.functions.length - 2}
                            </Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-300 text-xs">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {renderMfdsBadge(item)}
                  </TableCell>
                  <TableCell className="text-center">
                    {(() => {
                      const count = reportCounts?.[item.inci_name_normalized] ?? 0
                      return count > 0 ? (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-blue-50 text-blue-700 border-0 font-medium">
                          📊 {count}
                        </Badge>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* INCIDecoder */}
                      {item.has_incidecoder ? (
                        <div title="INCIDecoder Data" className="text-blue-500">
                          <Database className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div title="No INCIDecoder Data" className="text-gray-200">
                          <Database className="w-3.5 h-3.5" />
                        </div>
                      )}
                      
                      {/* Vectors */}
                      {item.has_vectors ? (
                        <div title="Vector Embeddings" className="text-purple-500">
                          <Brain className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div title="No Vectors" className="text-gray-200">
                          <Brain className="w-3.5 h-3.5" />
                        </div>
                      )}

                      {/* VP (Visual Perception/Formulation) */}
                      {item.has_vp ? (
                        <div title="Formulation Data" className="text-emerald-500">
                          <FlaskConical className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div title="No Formulation Data" className="text-gray-200">
                          <FlaskConical className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {filteredData.length > 0 && (
        <div className="flex items-center justify-end gap-2 mt-4">
          <div className="text-xs text-gray-500 mr-2">
            Page {page} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page === totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
