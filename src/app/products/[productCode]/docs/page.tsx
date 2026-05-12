"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  getSupabase,
  fetchProductWithBom,
  type LabProduct,
  type NormalizedBomItem,
} from "./_lib/utils";
import { BomQuickLink } from "./_components/bom-quick-link";
import {
  Loader2,
  AlertCircle,
  ChevronDown,
  FileText,
  FlaskConical,
  ScrollText,
  Beaker,
  Scale,
  Atom,
  Factory,
  ExternalLink,
  Image as ImageIcon,
  ListChecks,
  Pencil,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import InciModal from "./inci/InciModal";
import {
  fetchProductInci,
  type ProductInci,
} from "./inci/actions";

// --- Types ---

interface ProductImage {
  id: string;
  image_url: string;
  display_order: number;
}

interface ProductRevision {
  id: string;
  product_code: string;
  revision_no: number;
  revision_date: string | null;
  revision_content: string | null;
}

interface QcSpec {
  id: string;
  sequence_no: number | null;
  test_item: string | null;
  specification: string | null;
  test_method: string | null;
  result: string | null;
  qc_type: string | null;
  test_item_en: string | null;
  specification_en: string | null;
}

interface ProcessRecord {
  id: string;
  product_code: string;
  product_name: string | null;
  batch_number: string | null;
  batch_unit: string | null;
  dept_name: string | null;
  actual_qty: string | null;
  mfg_date: string | null;
  operator: string | null;
  notes_content: string | null;
  total_time: string | null;
  special_notes: string | null;
}

interface ProcessStep {
  id: string;
  step_num: number;
  step_type: string | null;
  step_name: string | null;
  step_desc: string | null;
  work_time: string | null;
  checker: string | null;
}

interface IngredientWithCoa {
  ingredientCode: string;
  ingredientName: string;
  coaUrls: string[];
}

interface KoreanIngredientRow {
  no: number;
  code: string;
  ingredientName: string;
  wtPercent: number;
  ref: string;
}

interface EnglishIngredientRow {
  no: number;
  code: string;
  ingredientName: string;
  wtPercent: number;
  source: string;
  casNo: string;
  function: string;
}

interface AllergenRow {
  name: string;
  casNo: string;
  wtPercent: number;
}

// --- Constants ---

const FRAGRANCE_ALLERGEN_CAS = new Set([
  "5989-27-5", "80-56-8", "127-91-3", "5989-54-8", "99-87-6", "470-82-6", "78-70-6", "106-22-9",
  "106-24-1", "7540-51-4", "5392-40-5", "91-64-5", "97-53-0", "97-54-1", "104-55-2", "103-41-3",
  "118-58-1", "100-51-6", "120-51-4", "122-40-7", "101-86-0", "105-13-5", "80-54-6", "4602-84-0",
  "31906-04-4", "90-17-5", "111-12-6", "107-75-5", "6259-76-3", "1222-05-5", "21145-77-7", "141-10-6"
]);

// --- Component ---

export default function AllInOneDocsPage() {
  const { productCode } = useParams<{ productCode: string }>();
  const decodedProductCode = decodeURIComponent(productCode);

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productNotFound, setProductNotFound] = useState(false);

  const [product, setProduct] = useState<LabProduct | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [revisions, setRevisions] = useState<ProductRevision[]>([]);
  const [bomItems, setBomItems] = useState<NormalizedBomItem[]>([]);
  const [qcSpecsSemi, setQcSpecsSemi] = useState<QcSpec[]>([]);
  const [qcSpecsFinal, setQcSpecsFinal] = useState<QcSpec[]>([]);
  const [processRecord, setProcessRecord] = useState<ProcessRecord | null>(null);
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);
  const [ingredientsCoa, setIngredientsCoa] = useState<IngredientWithCoa[]>([]);
  const [productInci, setProductInci] = useState<ProductInci | null>(null);
  const [inciModalOpen, setInciModalOpen] = useState(false);

  // Fetch Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProductNotFound(false);
    try {
      const supabase = getSupabase();

      // 1. Fetch Product & BOM
      const bomResult = await fetchProductWithBom(decodedProductCode);
      if (bomResult.productNotFound) {
        setProductNotFound(true);
        setLoading(false);
        return;
      }
      if (bomResult.error) {
        setError(bomResult.error);
        setLoading(false);
        return;
      }
      setProduct(bomResult.product);
      setBomItems(bomResult.bomItems);

      // Parallel fetching for other data
      const [
        riseProductRes,
        revisionsRes,
        specsRes,
        processRes,
      ] = await Promise.all([
        supabase.from("rise_products").select("id").eq("code", decodedProductCode).single(),
        supabase.from("labdoc_product_revisions").select("*").eq("product_code", decodedProductCode).order("revision_no"),
        supabase.from("labdoc_product_qc_specs").select("*").eq("product_code", decodedProductCode).order("sequence_no"),
        supabase.from("labdoc_manufacturing_processes").select("*").eq("product_code", decodedProductCode).single(),
      ]);

      // 2. Images
      if (riseProductRes.data) {
        const { data: imgData } = await supabase
          .from("product_images")
          .select("*")
          .eq("product_id", riseProductRes.data.id!)
          .order("display_order");
        if (imgData) setImages(imgData as ProductImage[]);
      }

      // 3. Revisions
      if (revisionsRes.data) setRevisions(revisionsRes.data as ProductRevision[]);

      // 4. QC Specs
      if (specsRes.data) {
        const specs = specsRes.data as QcSpec[];
        setQcSpecsSemi(specs.filter(s => s.qc_type === '반제품'));
        setQcSpecsFinal(specs.filter(s => s.qc_type === '완제품'));
      }

      // 5. Manufacturing Process
      if (processRes.data) {
        const proc = processRes.data as ProcessRecord;
        setProcessRecord(proc);
        const { data: stepsData } = await supabase
          .from("labdoc_manufacturing_process_steps")
          .select("*")
          .eq("process_id", proc.id)
          .order("step_num");
        if (stepsData) setProcessSteps(stepsData as ProcessStep[]);
      }

      // 6. Ingredient COAs
      if (bomResult.bomItems.length > 0) {
        const uniqueCodes = new Set<string>();
        bomResult.bomItems.forEach(item => uniqueCodes.add(item.baseCode));
        const baseCodes = Array.from(uniqueCodes);

        const { data: ingData } = await supabase
          .from("labdoc_ingredients")
          .select("ingredient_code, ingredient_name, coa_urls")
          .in("ingredient_code", baseCodes);

        if (ingData) {
          const ingMap = new Map(ingData.map(i => [i.ingredient_code, i]));
          const coaList: IngredientWithCoa[] = [];
          
          bomResult.bomItems.forEach(item => {
             // Find matching ingredient info
             const info = ingMap.get(item.baseCode);
             if (info && info.coa_urls && (info.coa_urls as string[]).length > 0) {
               coaList.push({
                 ingredientCode: item.baseCode,
                 ingredientName: info.ingredient_name || item.materialname,
                 coaUrls: info.coa_urls as string[]
               });
             }
          });
          // Deduplicate by code
          const uniqueCoaList = Array.from(new Map(coaList.map(item => [item.ingredientCode, item])).values());
          uniqueCoaList.sort((a, b) => a.ingredientCode.localeCompare(b.ingredientCode));
          setIngredientsCoa(uniqueCoaList);
        }
      }

      // 7. INCI data
      const inciResult = await fetchProductInci(decodedProductCode);
      if (!inciResult.error) {
        setProductInci(inciResult.inci);
      }

    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  }, [decodedProductCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Computed Data ---

  // Korean Ingredients
  const koreanIngredients = useMemo((): KoreanIngredientRow[] => {
    if (bomItems.length === 0) return [];
    const rows: KoreanIngredientRow[] = [];
    bomItems.forEach((item) => {
      const inciNames = item.components.map((c) => c.inci_name_kr).filter(Boolean).join(", ");
      rows.push({
        no: 0,
        code: item.baseCode,
        ingredientName: inciNames || item.materialname,
        wtPercent: item.totalUsemount / 1000,
        ref: "ICID",
      });
    });
    return rows.sort((a, b) => b.wtPercent - a.wtPercent).map((item, idx) => ({ ...item, no: idx + 1 }));
  }, [bomItems]);

  // English Ingredients
  const englishIngredients = useMemo((): EnglishIngredientRow[] => {
    if (bomItems.length === 0) return [];
    const rows: EnglishIngredientRow[] = [];
    bomItems.forEach((item) => {
      const firstComp = item.components[0];
      const inciNames = item.components.map((c) => c.inci_name_en).filter(Boolean).join(", ");
      const functions = [...new Set(item.components.map((c) => c.function).filter(Boolean))].join(", ");
      const casNumbers = [...new Set(item.components.map((c) => c.cas_number).filter(Boolean))].join(", ");
      rows.push({
        no: 0,
        code: item.baseCode,
        ingredientName: inciNames || item.materialname,
        wtPercent: item.totalUsemount / 1000,
        source: "ICID",
        casNo: casNumbers || firstComp?.cas_number || "—",
        function: functions || firstComp?.function || "—",
      });
    });
    return rows.sort((a, b) => b.wtPercent - a.wtPercent).map((item, idx) => ({ ...item, no: idx + 1 }));
  }, [bomItems]);

  // Fragrance Allergens
  const fragranceAllergens = useMemo((): AllergenRow[] => {
    const allergens: AllergenRow[] = [];
    bomItems.forEach((item) => {
      const rawWtPercent = item.totalUsemount / 1000;
      item.components.forEach((comp) => {
        if (comp.cas_number && FRAGRANCE_ALLERGEN_CAS.has(comp.cas_number)) {
          const ratio = comp.composition_ratio ?? 100;
          const calc = (rawWtPercent * ratio) / 100;
          if (calc >= 0.001) {
            allergens.push({
              name: comp.inci_name_en || "Unknown",
              casNo: comp.cas_number,
              wtPercent: calc,
            });
          }
        }
      });
    });
    
    // Merge duplicates
    const merged = new Map<string, AllergenRow>();
    allergens.forEach((a) => {
      const ex = merged.get(a.casNo);
      if (ex) ex.wtPercent += a.wtPercent;
      else merged.set(a.casNo, { ...a });
    });
    
    return Array.from(merged.values()).sort((a, b) => b.wtPercent - a.wtPercent);
  }, [bomItems]);

  // English Specs (Section 6)
  const englishSpecs = useMemo(() => {
    return qcSpecsFinal
      .filter(s => s.test_item_en)
      .map((s, idx) => ({
        ...s,
        order: idx + 1
      }));
  }, [qcSpecsFinal]);

  // Physical Properties for MSDS (Section 10)
  const physicalProps = useMemo(() => {
    const props = {
      appearance: product?.appearance || "",
      odor: "Characteristic", // Default
      ph: product?.ph_standard || "",
      spGr: product?.specific_gravity?.toString() || "",
      viscosity: product?.viscosity_standard || ""
    };
    
    // Try to find odor in QC specs if available
    const odorSpec = qcSpecsFinal.find(s => s.test_item?.includes("향") || s.test_item?.includes("Odor"));
    if (odorSpec) props.odor = odorSpec.specification || props.odor;
    
    return props;
  }, [product, qcSpecsFinal]);

  // Process Steps Filtering (Section 11)
  const filteredProcessSteps = useMemo(() => {
    return processSteps.filter(s => s.step_num < 100);
  }, [processSteps]);


  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>;
  if (productNotFound) return <BomQuickLink productCode={decodedProductCode} onLinked={fetchData} />;
  if (error || !product) return <div className="flex h-96 flex-col items-center justify-center text-red-500"><AlertCircle className="mb-2 h-10 w-10" /><p>{error || "Product not found"}</p></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* 1. Header: Images & Basic Info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Images */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm p-4">
            <h3 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
              <ImageIcon size={16} /> Product Images
            </h3>
            {images.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
                {images.map((img) => (
                  <div key={img.id} className="flex-none w-64 h-64 relative bg-slate-50 rounded-lg overflow-hidden border border-slate-100 snap-center">
                    <a href={img.image_url} target="_blank" rel="noreferrer" className="block w-full h-full">
                      <Image
                        src={img.image_url}
                        alt="Product"
                        fill
                        className="object-contain p-2 hover:scale-105 transition-transform duration-300"
                        unoptimized
                      />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center bg-slate-50 rounded-lg border border-slate-100 border-dashed text-slate-400">
                <ImageIcon size={48} className="mb-2 opacity-20" />
                <span className="text-sm">No images available</span>
              </div>
            )}
          </div>
        </div>

        {/* Basic Info */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold text-slate-800">{product.korean_name}</h1>
                <p className="text-sm text-slate-500 font-mono mt-1">{product.english_name}</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  {product.product_code}
                </span>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <InfoRow label="관리번호" value={product.management_code} />
                <InfoRow label="표시용량" value={product.label_volume} />
                <InfoRow label="충진용량" value={product.fill_volume} />
                <InfoRow label="비중 (25℃)" value={product.specific_gravity?.toString()} />
                <InfoRow label="pH (25℃)" value={product.ph_standard} />
                <InfoRow label="점경도" value={product.viscosity_standard} />
                <InfoRow label="권장사용나이" value={product.recommended_age} />
                <InfoRow label="유형/성상" value={`${product.cosmetic_type || '-'} / ${product.appearance || '-'}`} />
                <InfoRow label="사용기한" value={product.shelf_life} />
                <InfoRow label="재활용등급" value={product.recycling_grade} />
                <InfoRow label="문안표기 부자재" value={product.label_position} />
                
                <div className="col-span-1 md:col-span-2 pt-4 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <BoolRow label="원료목록보고" value={product.raw_material_report} />
                  <BoolRow label="표준화명칭" value={product.standardized_name} />
                  <BoolRow label="책임판매업" value={product.responsible_seller} />
                  <BoolRow label="알러지표기" value={product.allergen_korean} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 전성분 관리 (INCI Declaration) — above all sections */}
      <DocSection title="전성분 관리 (INCI Declaration)" icon={<ListChecks size={18} />} isOpen>
        {productInci ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                최종 업데이트: {productInci.updated_at ? new Date(productInci.updated_at).toLocaleDateString("ko-KR") : "—"}
                {productInci.designated_at && (
                  <span className="ml-3">지정일: {productInci.designated_at}</span>
                )}
                {(productInci as ProductInci & { author?: string }).author && (
                  <span className="ml-3">작성자: {(productInci as ProductInci & { author?: string }).author}</span>
                )}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setInciModalOpen(true)}
                className="gap-1"
              >
                <Pencil size={14} /> 수정
              </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">국문 전성분</h4>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm leading-relaxed whitespace-pre-wrap min-h-[60px]">
                  {productInci.inci_ko || <span className="text-slate-400 italic">미입력</span>}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">영문 전성분 (INCI)</h4>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm leading-relaxed whitespace-pre-wrap min-h-[60px]">
                  {productInci.inci_en || <span className="text-slate-400 italic">Not entered</span>}
                </div>
              </div>
            </div>

            {(productInci.inci_cpnp || productInci.inci_fda) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                {productInci.inci_cpnp && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">CPNP</h4>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-sm leading-relaxed whitespace-pre-wrap">
                      {productInci.inci_cpnp}
                    </div>
                  </div>
                )}
                {productInci.inci_fda && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">FDA</h4>
                    <div className="p-3 bg-green-50 rounded-lg border border-green-100 text-sm leading-relaxed whitespace-pre-wrap">
                      {productInci.inci_fda}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-400 text-sm mb-4">등록된 전성분 데이터가 없습니다.</p>
            <Button
              variant="outline"
              onClick={() => setInciModalOpen(true)}
              className="gap-1"
            >
              <Plus size={14} /> 전성분 생성
            </Button>
          </div>
        )}
      </DocSection>

      {/* INCI Modal */}
      <InciModal
        open={inciModalOpen}
        onOpenChange={setInciModalOpen}
        productCode={decodedProductCode}
        existingInci={productInci}
        onSaved={() => fetchData()}
      />

      {/* 11 Document Sections */}
      <div className="space-y-4">
        
        {/* Section 1: 제품표준서 */}
        <DocSection title="1. 제품표준서 (Product Standard)" icon={<FileText size={18} />} isOpen>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse border border-slate-200">
              <tbody>
                <Tr><Th>제품명</Th><Td colSpan={3}>{product.korean_name}</Td></Tr>
                <Tr><Th>영문명</Th><Td colSpan={3}>{product.english_name}</Td></Tr>
                <Tr><Th>제품코드</Th><Td>{product.product_code}</Td><Th>관리번호</Th><Td>{product.management_code}</Td></Tr>
                <Tr><Th>유형/성상</Th><Td colSpan={3}>{product.cosmetic_type} / {product.appearance}</Td></Tr>
                <Tr><Th>사용법</Th><Td colSpan={3}>{product.usage_instructions}</Td></Tr>
                <Tr><Th>효능/효과</Th><Td colSpan={3}>{product.functional_claim}</Td></Tr>
                <Tr><Th>저장방법</Th><Td colSpan={3}>{product.storage_method}</Td></Tr>
              </tbody>
            </table>
            
            <div className="mt-4">
              <h4 className="font-semibold text-slate-700 mb-2 text-xs">개정이력</h4>
              <table className="w-full text-xs border border-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="border p-2">No</th>
                    <th className="border p-2">Date</th>
                    <th className="border p-2">Content</th>
                  </tr>
                </thead>
                <tbody>
                  {revisions.length === 0 ? (
                    <tr><td colSpan={3} className="p-4 text-center text-slate-400">개정이력 없음</td></tr>
                  ) : (
                    revisions.map(rev => (
                      <tr key={rev.id}>
                        <td className="border p-2 text-center">{rev.revision_no}</td>
                        <td className="border p-2 text-center">{rev.revision_date}</td>
                        <td className="border p-2">{rev.revision_content}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </DocSection>

        {/* Section 2: 국문 성분표 */}
        <DocSection title="2. 국문 성분표 (Korean Ingredients)" icon={<ScrollText size={18} />} isOpen>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-2 border-b w-12">No</th>
                  <th className="p-2 border-b text-left">Code</th>
                  <th className="p-2 border-b text-left">Ingredient Name</th>
                  <th className="p-2 border-b text-right">%(W/W)</th>
                  <th className="p-2 border-b text-center">Ref</th>
                </tr>
              </thead>
              <tbody>
                {koreanIngredients.map(row => (
                  <tr key={row.code} className="hover:bg-slate-50/50">
                    <td className="p-2 border-b text-center text-slate-500">{row.no}</td>
                    <td className="p-2 border-b font-mono text-xs">{row.code}</td>
                    <td className="p-2 border-b">{row.ingredientName}</td>
                    <td className="p-2 border-b text-right font-mono">{row.wtPercent.toFixed(5)}</td>
                    <td className="p-2 border-b text-center text-xs text-slate-500">{row.ref}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DocSection>

        {/* Section 3: 영문 성분표 */}
        <DocSection title="3. 영문 성분표 (English Ingredients)" icon={<ScrollText size={18} />} isOpen>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-2 border-b w-12">No</th>
                  <th className="p-2 border-b text-left">INCI Name</th>
                  <th className="p-2 border-b text-right">%(W/W)</th>
                  <th className="p-2 border-b text-left">CAS No</th>
                  <th className="p-2 border-b text-left">Function</th>
                </tr>
              </thead>
              <tbody>
                {englishIngredients.map(row => (
                  <tr key={row.code} className="hover:bg-slate-50/50">
                    <td className="p-2 border-b text-center text-slate-500">{row.no}</td>
                    <td className="p-2 border-b">{row.ingredientName}</td>
                    <td className="p-2 border-b text-right font-mono">{row.wtPercent.toFixed(5)}</td>
                    <td className="p-2 border-b font-mono text-xs text-slate-600">{row.casNo}</td>
                    <td className="p-2 border-b text-xs text-slate-600">{row.function}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {fragranceAllergens.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold text-slate-700 mb-2 text-xs uppercase bg-amber-50 p-2 inline-block rounded">Fragrance Allergens</h4>
                <table className="w-full text-sm border border-slate-200">
                  <thead className="bg-slate-50 text-xs">
                    <tr>
                      <th className="p-2 border-b text-left">Name</th>
                      <th className="p-2 border-b text-left">CAS No</th>
                      <th className="p-2 border-b text-right">%(W/W)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fragranceAllergens.map(a => (
                      <tr key={a.casNo}>
                        <td className="p-2 border-b">{a.name}</td>
                        <td className="p-2 border-b font-mono text-xs">{a.casNo}</td>
                        <td className="p-2 border-b text-right font-mono">{a.wtPercent.toFixed(6)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DocSection>

        {/* Section 4: 브레이크다운 */}
        <DocSection title="4. Breakdown (Composition)" icon={<Atom size={18} />} isOpen>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-2 border text-left">Raw Material</th>
                  <th className="p-2 border text-left">INCI Name</th>
                  <th className="p-2 border text-right">Ratio (%)</th>
                  <th className="p-2 border text-left">CAS No</th>
                </tr>
              </thead>
              <tbody>
                {bomItems.map(item => (
                  item.components.map((comp, idx) => (
                    <tr key={`${item.baseCode}-${idx}`} className={idx === 0 ? "border-t border-slate-300" : ""}>
                      {idx === 0 && (
                        <td className="p-2 border-r bg-slate-50/50 align-top font-medium" rowSpan={item.components.length}>
                          {item.materialname} <br/> <span className="text-slate-400 font-mono text-[10px]">{item.baseCode}</span>
                        </td>
                      )}
                      <td className="p-2 border-r border-b">{comp.inci_name_en || comp.inci_name_kr}</td>
                      <td className="p-2 border-r border-b text-right font-mono">{comp.composition_ratio}</td>
                      <td className="p-2 border-b font-mono text-slate-500">{comp.cas_number}</td>
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
          </div>
        </DocSection>

        {/* Section 5: INCI 합산 */}
        <DocSection title="5. INCI List (Merged)" icon={<Scale size={18} />} isOpen>
           {/* Reusing English Ingredients logic as it's essentially the merged list sorted by weight */}
           <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-2 border-b w-12">No</th>
                  <th className="p-2 border-b text-left">INCI Name</th>
                  <th className="p-2 border-b text-right">%(W/W)</th>
                </tr>
              </thead>
              <tbody>
                {englishIngredients.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-2 border-b text-center text-slate-500">{i + 1}</td>
                    <td className="p-2 border-b font-medium">{row.ingredientName}</td>
                    <td className="p-2 border-b text-right font-mono">{row.wtPercent.toFixed(5)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DocSection>

        {/* Section 6: 영문 성적서 */}
        <DocSection title="6. Certificate of Analysis (English)" icon={<FileText size={18} />} isOpen>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3 border-b text-left">TEST ITEMS</th>
                  <th className="p-3 border-b text-left">SPECIFICATIONS</th>
                  <th className="p-3 border-b text-center">RESULTS</th>
                </tr>
              </thead>
              <tbody>
                 {englishSpecs.length > 0 ? englishSpecs.map(s => (
                   <tr key={s.id}>
                     <td className="p-3 border-b font-medium">{s.test_item_en}</td>
                     <td className="p-3 border-b text-slate-600">{s.specification_en}</td>
                     <td className="p-3 border-b text-center text-slate-500">{s.result || "Pass"}</td>
                   </tr>
                 )) : (
                   <tr><td colSpan={3} className="p-6 text-center text-slate-400">No English specs defined</td></tr>
                 )}
              </tbody>
            </table>
          </div>
        </DocSection>

        {/* Section 7: 반제품 기준 */}
        <DocSection title="7. 반제품 시험기준 (Semi-Product Specs)" icon={<Beaker size={18} />} isOpen>
          <SpecTable specs={qcSpecsSemi} />
        </DocSection>

        {/* Section 8: 완제품 기준 */}
        <DocSection title="8. 완제품 시험기준 (Finished Product Specs)" icon={<FlaskConical size={18} />} isOpen>
          <SpecTable specs={qcSpecsFinal} />
        </DocSection>

        {/* Section 9: 원료 COA */}
        <DocSection title="9. 원료 COA (Raw Material COAs)" icon={<FileText size={18} />} isOpen>
          {ingredientsCoa.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {ingredientsCoa.map(ing => (
                <div key={ing.ingredientCode} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50">
                  <div className="min-w-0 pr-4">
                    <span className="text-xs font-mono text-slate-400 block">{ing.ingredientCode}</span>
                    <span className="text-sm font-medium text-slate-700 truncate block">{ing.ingredientName}</span>
                  </div>
                  <div className="flex gap-1">
                    {ing.coaUrls.map((url, i) => (
                      <a key={i} href={url} target="_blank" className="p-1.5 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100" title="View COA">
                        <ExternalLink size={14} />
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 text-slate-400 text-sm">등록된 원료 성적서가 없습니다.</div>
          )}
        </DocSection>

        {/* Section 10: MSDS (Simplified) */}
        <DocSection title="10. MSDS (Material Safety Data Sheet)" icon={<AlertCircle size={18} />} isOpen>
           <div className="space-y-6">
             <div className="border border-slate-200 rounded p-4 bg-slate-50">
               <h4 className="font-bold text-slate-800 mb-2">1. PRODUCT IDENTIFICATION</h4>
               <p className="text-sm"><span className="font-semibold">Product Name:</span> {product.english_name}</p>
               <p className="text-sm"><span className="font-semibold">Product Code:</span> {product.product_code}</p>
             </div>
             
             <div>
               <h4 className="font-bold text-slate-800 mb-2 border-b border-slate-200 pb-1">3. COMPOSITION / INFORMATION ON INGREDIENTS</h4>
               <div className="max-h-60 overflow-y-auto border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100"><tr><th className="p-2 text-left">INCI Name</th><th className="p-2 text-left">CAS No</th><th className="p-2 text-right">%</th></tr></thead>
                    <tbody>
                      {englishIngredients.slice(0, 10).map((ing, i) => (
                        <tr key={i} className="border-b"><td className="p-2">{ing.ingredientName}</td><td className="p-2">{ing.casNo}</td><td className="p-2 text-right">{ing.wtPercent.toFixed(2)}</td></tr>
                      ))}
                      {englishIngredients.length > 10 && <tr><td colSpan={3} className="p-2 text-center text-slate-500 italic">... and {englishIngredients.length - 10} more</td></tr>}
                    </tbody>
                  </table>
               </div>
             </div>

             <div>
                <h4 className="font-bold text-slate-800 mb-2 border-b border-slate-200 pb-1">9. PHYSICAL AND CHEMICAL PROPERTIES</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between border-b border-dashed p-1"><span>Appearance:</span> <span>{physicalProps.appearance}</span></div>
                  <div className="flex justify-between border-b border-dashed p-1"><span>Odor:</span> <span>{physicalProps.odor}</span></div>
                  <div className="flex justify-between border-b border-dashed p-1"><span>pH:</span> <span>{physicalProps.ph}</span></div>
                  <div className="flex justify-between border-b border-dashed p-1"><span>Specific Gravity:</span> <span>{physicalProps.spGr}</span></div>
                  <div className="flex justify-between border-b border-dashed p-1"><span>Viscosity:</span> <span>{physicalProps.viscosity}</span></div>
                </div>
             </div>
           </div>
        </DocSection>

        {/* Section 11: 제조공정기록서 */}
        <DocSection title="11. 제조공정 기록서 (Manufacturing Process)" icon={<Factory size={18} />} isOpen>
          {processRecord ? (
            <div>
               <div className="mb-4 p-3 bg-slate-50 rounded border border-slate-100 text-sm grid grid-cols-2 gap-4">
                 <div><span className="text-slate-500">배치단위:</span> {processRecord.batch_unit}</div>
                 <div><span className="text-slate-500">총소요시간:</span> {processRecord.total_time}</div>
               </div>
               <table className="w-full text-xs border border-slate-200">
                 <thead className="bg-slate-100">
                   <tr>
                     <th className="p-2 border w-10">No</th>
                     <th className="p-2 border text-left">Process Step</th>
                     <th className="p-2 border text-left">Description</th>
                     <th className="p-2 border w-20">Time</th>
                   </tr>
                 </thead>
                 <tbody>
                   {filteredProcessSteps.map(step => (
                     <tr key={step.id}>
                       <td className="p-3 border text-center font-medium">{step.step_num}</td>
                       <td className="p-3 border whitespace-pre-line font-medium">{step.step_name}</td>
                       <td className="p-3 border whitespace-pre-line leading-relaxed text-slate-600">{step.step_desc}</td>
                       <td className="p-3 border text-center text-slate-500">{step.work_time}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          ) : (
             <div className="text-center p-8 text-slate-400 text-sm">제조공정 데이터가 없습니다.</div>
          )}
        </DocSection>

      </div>
    </div>
  );
}

// --- Sub Components ---

function DocSection({ title, icon, children, isOpen = false }: { title: string; icon: React.ReactNode; children: React.ReactNode; isOpen?: boolean }) {
  return (
    <details className="group bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" open={isOpen}>
      <summary className="flex items-center gap-3 px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors list-none select-none">
        <span className="text-slate-400 group-open:text-amber-500 transition-colors">{icon}</span>
        <h3 className="text-base font-semibold text-slate-700 flex-1">{title}</h3>
        <span className="text-slate-400 group-open:rotate-180 transition-transform duration-200">
          <ChevronDown size={20} />
        </span>
      </summary>
      <div className="px-6 pb-6 pt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
        {children}
      </div>
    </details>
  );
}

function InfoRow({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-medium text-slate-500 mb-1">{label}</span>
      <span className="text-slate-800 font-medium truncate" title={value || ""}>{value || "—"}</span>
    </div>
  );
}

function BoolRow({ label, value }: { label: string; value: boolean | string | null | undefined }) {
  const isTrue = value === true || value === "Y" || value === "Yes" || (typeof value === 'string' && value.length > 0);
  return (
    <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded">
      <span className="text-xs text-slate-600">{label}</span>
      <span className={isTrue ? "text-emerald-600 font-bold" : "text-slate-300"}>
        {isTrue ? "○" : "✕"}
      </span>
    </div>
  );
}

function SpecTable({ specs }: { specs: QcSpec[] }) {
  if (specs.length === 0) return <div className="text-center p-6 text-slate-400 text-sm">데이터 없음</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border border-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="p-2 border-b w-12">No</th>
            <th className="p-2 border-b text-left">Test Item</th>
            <th className="p-2 border-b text-left">Specification</th>
            <th className="p-2 border-b text-left">Method</th>
          </tr>
        </thead>
        <tbody>
          {specs.map(s => (
            <tr key={s.id} className="hover:bg-slate-50/50">
              <td className="p-2 border-b text-center text-slate-500">{s.sequence_no}</td>
              <td className="p-2 border-b font-medium">{s.test_item}</td>
              <td className="p-2 border-b text-slate-600">{s.specification}</td>
              <td className="p-2 border-b text-slate-500 text-xs">{s.test_method}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const Tr = ({ children }: { children: React.ReactNode }) => <tr className="border-b border-slate-200">{children}</tr>;
const Th = ({ children }: { children: React.ReactNode }) => <th className="bg-slate-50 p-2 text-left font-medium text-slate-600 border-r border-slate-200 w-32">{children}</th>;
const Td = ({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) => <td className="p-2 text-slate-800 border-r border-slate-200 last:border-r-0" colSpan={colSpan}>{children || "—"}</td>;
