'use client'

import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Link2, Loader2, Search, Check } from 'lucide-react'
import { quickLinkBom, searchBomPrdcodes } from '../_actions/quick-link'
import { toast } from 'sonner'

interface BomQuickLinkProps {
  productCode: string
  onLinked?: () => void
}

export function BomQuickLink({ productCode, onLinked }: BomQuickLinkProps) {
  const [semiProductCode, setSemiProductCode] = useState('')
  const [koreanName, setKoreanName] = useState('')
  const [englishName, setEnglishName] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const searchPrdcodes = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([])
      return
    }
    setSearching(true)
    try {
      const results = await searchBomPrdcodes(query)
      setSuggestions(results)
      setShowSuggestions(results.length > 0)
    } catch {
      setSuggestions([])
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => searchPrdcodes(semiProductCode), 300)
    return () => clearTimeout(timer)
  }, [semiProductCode, searchPrdcodes])

  const handleSubmit = async () => {
    if (!semiProductCode.trim()) {
      toast.error('반제품코드를 입력해주세요')
      return
    }
    setSubmitting(true)
    try {
      const result = await quickLinkBom({
        productCode,
        semiProductCode: semiProductCode.trim(),
        koreanName: koreanName.trim() || undefined,
        englishName: englishName.trim() || undefined,
      })

      if (result.success) {
        toast.success('BOM 연결 완료')
        onLinked?.()
      } else {
        toast.error(result.error || '연결 실패')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '연결 실패')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="max-w-lg mx-auto mt-12">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 size={18} className="text-amber-500" />
          BOM 빠른 연결
        </CardTitle>
        <CardDescription>
          제품표준서가 아직 등록되지 않았습니다.
          반제품코드(BOM)를 연결하면 전성분 자료를 바로 생성할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs text-slate-500">제품코드</Label>
          <Input value={productCode} disabled className="mt-1 font-mono text-sm bg-slate-50" />
        </div>

        <div className="relative">
          <Label className="text-xs text-slate-500">
            반제품코드 (bom_master prdcode) <span className="text-red-400">*</span>
          </Label>
          <div className="relative mt-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={semiProductCode}
              onChange={(e) => setSemiProductCode(e.target.value.toUpperCase())}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="예: PFJMK0050"
              className="pl-8 font-mono text-sm"
            />
            {searching && (
              <Loader2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
            )}
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {suggestions.map((code) => (
                <button
                  key={code}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm font-mono hover:bg-amber-50 transition-colors"
                  onMouseDown={() => {
                    setSemiProductCode(code)
                    setShowSuggestions(false)
                  }}
                >
                  {code}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-slate-500">국문명 (선택)</Label>
            <Input
              value={koreanName}
              onChange={(e) => setKoreanName(e.target.value)}
              placeholder="제품 국문명"
              className="mt-1 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-500">영문명 (선택)</Label>
            <Input
              value={englishName}
              onChange={(e) => setEnglishName(e.target.value)}
              placeholder="Product Name"
              className="mt-1 text-sm"
            />
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting || !semiProductCode.trim()}
          className="w-full bg-amber-500 hover:bg-amber-600"
        >
          {submitting ? (
            <><Loader2 size={16} className="animate-spin mr-2" /> 연결 중...</>
          ) : (
            <><Check size={16} className="mr-2" /> BOM 연결 및 제품 등록</>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
