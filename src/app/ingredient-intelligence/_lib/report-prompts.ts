/**
 * Prompt templates for each report type.
 * Each function builds the full context + prompt for Claude.
 */

export interface IngredientContext {
  inci_name: string
  korean_name: string | null
  rating: string | null
  functions: string[] | null
  quick_facts: string[] | null
  details: string | null
  efficacy_kr: string | null
  key_mechanisms: string | null
  clinical_studies_summary: string | null
  inci_definition: string | null
  cosing_cas_number: string | null
  skin_benefits: string | null
  mfds_registered: boolean | null
  mfds_restricted: string | null
  regulations: Array<{
    source: string
    type: string
    max_concentration: string | null
    conditions: string | null
  }>
  internal_usage: Array<{
    ingredient_code: string
    ingredient_name: string
    composition_ratio: number | null
  }>
  market_product_count: number
  top_brands: string[]
}

function buildBaseContext(ctx: IngredientContext): string {
  const parts: string[] = []

  parts.push(`## 성분 기본 정보`)
  parts.push(`- **INCI Name**: ${ctx.inci_name}`)
  if (ctx.korean_name) parts.push(`- **한글명**: ${ctx.korean_name}`)
  if (ctx.rating) parts.push(`- **INCIDecoder Rating**: ${ctx.rating}`)
  if (ctx.cosing_cas_number) parts.push(`- **CAS Number**: ${ctx.cosing_cas_number}`)
  if (ctx.functions?.length) parts.push(`- **기능 분류**: ${ctx.functions.join(', ')}`)
  if (ctx.mfds_registered != null) parts.push(`- **MFDS 등록 여부**: ${ctx.mfds_registered ? '등록' : '미등록'}`)
  if (ctx.mfds_restricted) parts.push(`- **MFDS 제한 상태**: ${ctx.mfds_restricted}`)

  if (ctx.quick_facts?.length) {
    parts.push(`\n## Quick Facts`)
    ctx.quick_facts.forEach((f) => parts.push(`- ${f}`))
  }

  if (ctx.details) {
    // Clean scraped content
    let cleaned = ctx.details
    const detailsIdx = cleaned.indexOf('Details')
    if (detailsIdx >= 0) cleaned = cleaned.substring(detailsIdx + 7).trim()
    const cutMarkers = ['[more] [more]', 'Something incorrect', 'Products with ', 'We do a Best']
    for (const m of cutMarkers) {
      const idx = cleaned.indexOf(m)
      if (idx > 0) cleaned = cleaned.substring(0, idx).trim()
    }
    if (cleaned.length > 50) {
      parts.push(`\n## INCIDecoder 상세설명`)
      parts.push(cleaned.substring(0, 2000))
    }
  }

  if (ctx.efficacy_kr) {
    parts.push(`\n## 효능 (AI 분석 데이터)`)
    parts.push(ctx.efficacy_kr.substring(0, 1500))
  }

  if (ctx.key_mechanisms) {
    parts.push(`\n## 작용 기전`)
    parts.push(ctx.key_mechanisms.substring(0, 1500))
  }

  if (ctx.clinical_studies_summary) {
    parts.push(`\n## 임상연구 요약`)
    parts.push(ctx.clinical_studies_summary.substring(0, 1500))
  }

  if (ctx.skin_benefits) {
    parts.push(`\n## Skin Benefits (Legacy Data)`)
    parts.push(ctx.skin_benefits.substring(0, 1000))
  }

  if (ctx.regulations.length > 0) {
    parts.push(`\n## 규제 데이터 (${ctx.regulations.length}건)`)
    ctx.regulations.slice(0, 20).forEach((r) => {
      parts.push(`- [${r.source}] ${r.type}${r.max_concentration ? ` (max: ${r.max_concentration})` : ''}${r.conditions ? ` — ${r.conditions.substring(0, 100)}` : ''}`)
    })
  }

  if (ctx.internal_usage.length > 0) {
    parts.push(`\n## 자사 활용 현황 (${ctx.internal_usage.length}개 원료에 포함)`)
    ctx.internal_usage.slice(0, 10).forEach((u) => {
      parts.push(`- ${u.ingredient_code} (${u.ingredient_name})${u.composition_ratio ? ` — ${u.composition_ratio}%` : ''}`)
    })
  }

  if (ctx.market_product_count > 0) {
    parts.push(`\n## 시장 데이터`)
    parts.push(`- INCIDecoder 등록 제품 수: ${ctx.market_product_count}`)
    if (ctx.top_brands.length > 0) parts.push(`- Top 브랜드: ${ctx.top_brands.join(', ')}`)
  }

  return parts.join('\n')
}

const SYSTEM_BASE = `당신은 화장품 R&D 전문가입니다. 에바스코스메틱의 연구원에게 전문적인 분석 리포트를 제공합니다.
리포트는 한국어로 작성하되, INCI명, 화학 용어, 논문 참조 등 전문 용어는 영어를 그대로 사용하세요.
Markdown 형식으로 작성하세요. 표(table), 목록(list), 제목(heading)을 적극 활용하세요.
추측이 아닌 근거 기반으로 작성하세요. 불확실한 내용은 명시적으로 표시하세요.`

export function buildReportPrompt(
  reportType: string,
  ctx: IngredientContext,
  secondIngredient?: string,
  formulaIngredients?: string[]
): { system: string; user: string } {
  const baseContext = buildBaseContext(ctx)

  switch (reportType) {
    case 'deep_dive':
      return {
        system: SYSTEM_BASE,
        user: `다음 화장품 성분에 대한 심층 분석(Deep Dive) 리포트를 작성해주세요.

${baseContext}

## 요청 리포트 구조
1. **성분 개요** — 화학적 특성, 물리화학적 성질
2. **작용 메커니즘** — 피부에서의 작용 기전 (분자 수준)
3. **임상 근거** — 주요 임상연구 결과, 효능 범위, 최적 농도
4. **처방 고려사항** — pH 범위, 호환성, 안정성, 제형별 주의사항
5. **자사 활용 분석** — 현재 활용 현황 기반 최적화 제안
6. **결론 및 권고** — 핵심 요약, R&D 팀 실행 가능한 권고사항

각 섹션은 구체적인 수치와 근거를 포함하세요.`,
      }

    case 'efficacy':
      return {
        system: SYSTEM_BASE,
        user: `다음 성분의 효능 분석 리포트를 작성해주세요.

${baseContext}

## 요청 리포트 구조
1. **효능 카테고리 분류** — 미백, 보습, 항노화, 진정, 각질제거 등 해당 카테고리별 분석
2. **작용 기전 상세** — 각 효능별 분자 수준 메커니즘
3. **임상 데이터 정리** — 농도별, 기간별 효과 데이터 (표 형식)
4. **효능 비교** — 동일 기능 대표 성분과의 효능 비교
5. **시너지 성분** — 함께 사용 시 효능 증대되는 성분 조합
6. **최적 사용 농도** — 용도별 권장 농도 범위`,
      }

    case 'compatibility':
      return {
        system: SYSTEM_BASE,
        user: `다음 두 성분의 호환성 분석 리포트를 작성해주세요.

**성분 1**: ${ctx.inci_name} (${ctx.korean_name || ''})
**성분 2**: ${secondIngredient || '(미지정)'}

${baseContext}

## 요청 리포트 구조
1. **호환성 판정** — 호환/조건부 호환/비호환 (명확한 결론)
2. **화학적 상호작용** — pH 상호작용, 안정성 영향, 침전 가능성
3. **효능 시너지/길항** — 함께 사용 시 효능 변화
4. **처방 가이드** — 함께 사용할 때의 최적 pH, 농도, 배합 순서
5. **주의사항** — 피해야 할 조건, 대체 방안
6. **결론** — 최종 권고사항`,
      }

    case 'regulatory':
      return {
        system: SYSTEM_BASE,
        user: `다음 성분의 다국가 규제 풀체크 리포트를 작성해주세요.

${baseContext}

## 요청 리포트 구조
1. **한국 (MFDS)** — 등록 현황, 사용 제한, 최대 허용 농도, 필수 표시 사항
2. **EU (COSING)** — Annex 분류, 제한/금지 여부, CMR 분류
3. **중국 (NMPA)** — 등록 요건, 제한사항, 신규 원료 등록 필요 여부
4. **미국 (FDA)** — GRAS 여부, OTC 모노그래프, 주별 차이
5. **일본 (MHLW)** — 일본 화장품 기준, 의약부외품 해당 여부
6. **비교 요약표** — 국가별 규제 상태 비교표 (Markdown 표)
7. **수출 전략 권고** — 타겟 시장별 주의사항`,
      }

    case 'stability':
      return {
        system: SYSTEM_BASE,
        user: `다음 성분의 안정성 예측 리포트를 작성해주세요.

${baseContext}

## 요청 리포트 구조
1. **물리화학적 안정성** — 열, 빛, 산소에 대한 안정성
2. **pH 의존 안정성** — 최적 pH 범위, pH 변화에 따른 분해
3. **제형별 안정성** — 수용성/유화/겔 등 제형별 안정성 차이
4. **비호환 원료** — 함께 사용 시 분해/변색 유발 성분
5. **가속 시험 설계** — 추천 가속 조건 (온도, 광선, 사이클)
6. **안정화 전략** — 캡슐화, 항산화제 배합 등 안정화 방법
7. **유통기한 추정** — 일반적인 보관 조건에서의 예상 수명`,
      }

    case 'formulation':
      return {
        system: SYSTEM_BASE,
        user: `다음 성분의 처방 전략 리포트를 작성해주세요.

${baseContext}

## 요청 리포트 구조
1. **최적 제형** — 이 성분이 가장 효과적인 제형 타입
2. **농도 가이드** — 용도별 최적/최소/최대 농도
3. **전달 시스템** — 리포좀, 나노에멀전, 마이크로캡슐 등 적합한 전달 방법
4. **배합 순서** — 제조 공정에서의 투입 시점 및 주의사항
5. **베이스 처방 예시** — 세럼, 크림, 토너용 기본 처방 (성분 리스트 + 비율)
6. **자사 원료 활용** — 자사 보유 원료 기반 처방 최적화 제안`,
      }

    case 'clinical':
      return {
        system: SYSTEM_BASE,
        user: `다음 성분의 임상 근거 수집 리포트를 작성해주세요.

${baseContext}

## 요청 리포트 구조
1. **주요 임상연구 목록** — 연구명, 저널, 연도, 피험자 수, 결과 요약 (표 형식)
2. **효능별 근거 수준** — 미백/보습/항노화 등 각 효능별 임상 근거 강도
3. **농도-효과 관계** — 사용 농도별 효과 데이터 정리
4. **안전성 데이터** — 자극, 감작, 광독성 시험 결과
5. **기능성 화장품 인정 근거** — 식약처 기능성 인증 가능 여부 및 필요 데이터
6. **연구 갭 분석** — 추가 연구가 필요한 영역`,
      }

    case 'trend':
      return {
        system: SYSTEM_BASE,
        user: `다음 성분의 글로벌 트렌드 분석 리포트를 작성해주세요.

${baseContext}

## 요청 리포트 구조
1. **시장 사용 현황** — INCIDecoder 기반 사용률, 주요 브랜드, 제품 카테고리
2. **트렌드 흐름** — 최근 2-3년 사용 추세 (증가/감소/안정)
3. **신규 응용** — 최근 주목받는 새로운 활용 분야
4. **소비자 인식** — 클린뷰티, 비건, 자연유래 관점에서의 포지셔닝
5. **경쟁 성분** — 같은 기능을 하는 대체/경쟁 성분 비교
6. **기회 분석** — 자사 제품 라인에 적용 가능한 트렌드 기회`,
      }

    case 'formula_analysis': {
      // For formula analysis, the ingredient list IS the core context, not a single ingredient
      const ingredientListStr = formulaIngredients && formulaIngredients.length > 0
        ? formulaIngredients.map((name, i) => `${i + 1}. ${name}`).join('\n')
        : '(전성분 리스트가 제공되지 않았습니다)'

      return {
        system: SYSTEM_BASE,
        user: `다음 전성분 리스트의 처방 분석 리포트를 작성해주세요.

## 제품/처방 정보
- **이름**: ${ctx.inci_name}
${ctx.korean_name ? `- **한글명**: ${ctx.korean_name}` : ''}

## 전성분 리스트 (${formulaIngredients?.length ?? 0}개 성분)
${ingredientListStr}

## 요청 리포트 구조
1. **전성분 테이블** — 순서, 성분명, INCI명, 추정 기능, 추정 농도 범위 (표)
2. **처방 구조 분석** — 제형 타입, 베이스 구성, 핵심 활성 성분 분류
3. **효능 프로파일** — 기능별 분포 (보습, 미백, 항노화 등)
4. **주의 사항** — 비호환 조합, 규제 이슈, 자극 위험 성분
5. **벤치마크** — 유사 제품 대비 차별점 및 약점
6. **개선 제안** — 빠진 기능 카테고리, 농도 최적화, 대체 성분 추천`,
      }
    }

    default:
      return {
        system: SYSTEM_BASE,
        user: `다음 성분에 대한 분석을 작성해주세요.\n\n${baseContext}`,
      }
  }
}
