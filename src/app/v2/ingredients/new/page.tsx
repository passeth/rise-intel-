'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChevronLeft, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import {
  checkIngredientCodeExists,
  createIngredient,
  createIngredientComponents,
  createIngredientSpecs,
} from './actions'

const componentSchema = z.object({
  inci_name_en: z.string().trim(),
  inci_name_kr: z.string().trim().optional(),
  cas_number: z.string().trim().optional(),
  composition_ratio: z.number().nullable().optional(),
  function: z.string().trim().optional(),
})

const specSchema = z.object({
  spec_item: z.string().trim(),
  spec_standard: z.string().trim().optional(),
})

const formSchema = z
  .object({
    ingredient_code: z.string().trim().min(1, '원료코드를 입력해주세요.'),
    ingredient_name: z.string().trim().min(1, '원료명을 입력해주세요.'),
    manufacturer: z.string().trim().optional(),
    origin_country: z.string().trim().optional(),
    components: z.array(componentSchema).min(1, '성분 구성을 1개 이상 입력해주세요.'),
    specs: z.array(specSchema),
  })
  .superRefine((data, ctx) => {
    const hasValidComponent = data.components.some((component) => component.inci_name_en.length > 0)

    if (!hasValidComponent) {
      ctx.addIssue({
        code: 'custom',
        path: ['components'],
        message: 'INCI Name (EN)이 입력된 성분이 최소 1개 필요합니다.',
      })
    }

    data.components.forEach((component, index) => {
      const hasSiblingValue = Boolean(
        component.inci_name_kr ||
          component.cas_number ||
          component.function ||
          component.composition_ratio != null
      )

      if (hasSiblingValue && component.inci_name_en.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['components', index, 'inci_name_en'],
          message: 'INCI Name (EN)을 입력해주세요.',
        })
      }
    })
  })

type FormValues = z.infer<typeof formSchema>

const EMPTY_COMPONENT: FormValues['components'][number] = {
  inci_name_en: '',
  inci_name_kr: '',
  cas_number: '',
  composition_ratio: null,
  function: '',
}

const EMPTY_SPEC: FormValues['specs'][number] = {
  spec_item: '',
  spec_standard: '',
}

export default function V2IngredientsNewPage() {
  const router = useRouter()
  const [checkingCode, setCheckingCode] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ingredient_code: '',
      ingredient_name: '',
      manufacturer: '',
      origin_country: '',
      components: [{ ...EMPTY_COMPONENT }],
      specs: [{ ...EMPTY_SPEC }],
    },
  })

  const componentFieldArray = useFieldArray({
    control,
    name: 'components',
  })

  const specFieldArray = useFieldArray({
    control,
    name: 'specs',
  })

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const ingredientCode = values.ingredient_code.trim()

      const exists = await checkIngredientCodeExists(ingredientCode)
      if (exists) {
        throw new Error('이미 사용 중인 원료코드입니다.')
      }

      const ingredientResult = await createIngredient({
        ingredient_code: ingredientCode,
        ingredient_name: values.ingredient_name,
        manufacturer: values.manufacturer,
        origin_country: values.origin_country,
      })

      if (!ingredientResult.success) {
        throw new Error(ingredientResult.error || '원료 등록에 실패했습니다.')
      }

      const validComponents = values.components
        .filter((component) => component.inci_name_en.trim().length > 0)
        .map((component, index) => ({
          inci_name_en: component.inci_name_en,
          inci_name_kr: component.inci_name_kr,
          cas_number: component.cas_number,
          composition_ratio: component.composition_ratio ?? null,
          function: component.function,
          component_order: index + 1,
        }))

      const componentResult = await createIngredientComponents(ingredientCode, validComponents)
      if (!componentResult.success) {
        throw new Error(componentResult.error || '성분 구성 저장에 실패했습니다.')
      }

      const validSpecs = values.specs
        .filter((spec): spec is { spec_item: string; spec_standard?: string } =>
          spec.spec_item.trim().length > 0
        )
        .map((spec) => ({
          spec_item: spec.spec_item.trim(),
          spec_standard: spec.spec_standard,
        }))
      const specResult = await createIngredientSpecs(ingredientCode, validSpecs)
      if (!specResult.success) {
        throw new Error(specResult.error || '시험 규격 저장에 실패했습니다.')
      }

      return ingredientCode
    },
    onSuccess: (ingredientCode) => {
      toast.success('신규 원료가 등록되었습니다.')
      router.push(`/v2/ingredients/${encodeURIComponent(ingredientCode)}`)
    },
    onError: (error: Error) => {
      toast.error(error.message || '등록 중 오류가 발생했습니다.')
    },
  })

  const handleCodeBlur = async (code: string) => {
    const trimmedCode = code.trim()
    if (!trimmedCode) return

    setCheckingCode(true)
    const exists = await checkIngredientCodeExists(trimmedCode)
    setCheckingCode(false)

    if (exists) {
      setError('ingredient_code', {
        type: 'validate',
        message: '이미 사용 중인 원료코드입니다.',
      })
      return
    }

    if (errors.ingredient_code?.message === '이미 사용 중인 원료코드입니다.') {
      clearErrors('ingredient_code')
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Badge className="text-[10px] font-semibold bg-[#1A1A1A] text-white px-2 py-0.5 rounded-full tracking-wider hover:bg-[#1A1A1A]">
            원료
          </Badge>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">신규 원료 등록</h1>
        </div>
        <p className="text-sm text-[#999999]">원료 기본정보, 성분구성, 시험규격을 한 번에 등록합니다.</p>
      </div>

      <form onSubmit={handleSubmit((values) => createMutation.mutate(values))} className="space-y-5">
        <Card className="border-[#E5E5E5] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[#1A1A1A]">기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ingredient_code">원료코드 *</Label>
                <div className="relative">
                  <Input
                    id="ingredient_code"
                    placeholder="예: ING-001"
                    {...register('ingredient_code')}
                    onBlur={(event) => {
                      void handleCodeBlur(event.target.value)
                    }}
                  />
                  {checkingCode && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[#999999]" />
                  )}
                </div>
                {errors.ingredient_code && (
                  <p className="text-xs text-red-500">{errors.ingredient_code.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ingredient_name">원료명 *</Label>
                <Input id="ingredient_name" placeholder="원료명을 입력하세요" {...register('ingredient_name')} />
                {errors.ingredient_name && (
                  <p className="text-xs text-red-500">{errors.ingredient_name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="manufacturer">제조사</Label>
                <Input id="manufacturer" placeholder="제조사" {...register('manufacturer')} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="origin_country">원산지</Label>
                <Input id="origin_country" placeholder="원산지" {...register('origin_country')} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E5E5] shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base text-[#1A1A1A]">성분 구성</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 border-[#D4D4D4]"
                onClick={() => componentFieldArray.append({ ...EMPTY_COMPONENT })}
              >
                <Plus size={14} /> 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-x-auto rounded-lg border border-[#E5E5E5]">
              <Table className="min-w-[860px]">
                <TableHeader className="bg-[#F9F9F9]">
                  <TableRow className="border-[#E5E5E5]">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>INCI Name (EN)</TableHead>
                    <TableHead>INCI Name (KR)</TableHead>
                    <TableHead>CAS No.</TableHead>
                    <TableHead className="w-36">조성비율(%)</TableHead>
                    <TableHead>기능</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {componentFieldArray.fields.map((field, index) => (
                    <TableRow key={field.id} className="border-[#F1F1F1]">
                      <TableCell className="text-center text-xs text-[#666666]">{index + 1}</TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          {...register(`components.${index}.inci_name_en`)}
                          placeholder="예: Water"
                        />
                        {errors.components?.[index]?.inci_name_en && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.components[index]?.inci_name_en?.message}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          {...register(`components.${index}.inci_name_kr`)}
                          placeholder="예: 정제수"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8 font-mono"
                          {...register(`components.${index}.cas_number`)}
                          placeholder="예: 7732-18-5"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          className="h-8"
                          {...register(`components.${index}.composition_ratio`, {
                            setValueAs: (value) =>
                              value === '' || value == null || Number.isNaN(Number(value))
                                ? null
                                : Number(value),
                          })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input className="h-8" {...register(`components.${index}.function`)} />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => componentFieldArray.remove(index)}
                          disabled={componentFieldArray.fields.length === 1}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {errors.components?.message && (
              <p className="text-xs text-red-500">{errors.components.message}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#E5E5E5] shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base text-[#1A1A1A]">시험 규격</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 border-[#D4D4D4]"
                onClick={() => specFieldArray.append({ ...EMPTY_SPEC })}
              >
                <Plus size={14} /> 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-[#E5E5E5]">
              <Table>
                <TableHeader className="bg-[#F9F9F9]">
                  <TableRow className="border-[#E5E5E5]">
                    <TableHead>시험항목</TableHead>
                    <TableHead>시험기준</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {specFieldArray.fields.map((field, index) => (
                    <TableRow key={field.id} className="border-[#F1F1F1]">
                      <TableCell>
                        <Input
                          className="h-8"
                          placeholder="예: 외관"
                          {...register(`specs.${index}.spec_item`)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          placeholder="예: 무색 투명 액상"
                          {...register(`specs.${index}.spec_standard`)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => specFieldArray.remove(index)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-[#999999] mt-2">시험 규격은 선택 입력입니다. 비워두면 저장되지 않습니다.</p>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
          <Button type="button" variant="outline" onClick={() => router.push('/v2/ingredients')}>
            <ChevronLeft size={16} className="mr-1" /> 목록
          </Button>
          <Button
            type="submit"
            className="bg-[#1A1A1A] hover:bg-[#333333] gap-1.5 sm:min-w-32"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            등록
          </Button>
        </div>
      </form>
    </div>
  )
}
