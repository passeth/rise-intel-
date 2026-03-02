"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { getSupabase, normalizeIngredientCode, type LabProduct } from "../../_lib/utils";
import { Loader2, AlertCircle, FileBox, ExternalLink, FileText } from "lucide-react";

interface BomRawItem { materialcode: string; materialname: string | null; }
interface IngredientWithCoa { ingredientCode: string; ingredientName: string; coaUrls: string[]; }

export default function RawMaterialsCoaPage() {
  const { productCode } = useParams<{ productCode: string }>();
  const decodedProductCode = decodeURIComponent(productCode);
  const [product, setProduct] = useState<LabProduct | null>(null);
  const [ingredients, setIngredients] = useState<IngredientWithCoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const supabase = getSupabase();
      const { data: productData, error: productErr } = await supabase.from("labdoc_products").select("*").eq("product_code", decodedProductCode).single();
      if (productErr) { if (productErr.code === "PGRST116") setError("품목을 찾을 수 없습니다"); else throw productErr; setLoading(false); return; }
      setProduct(productData as LabProduct);
      if (!productData.semi_product_code) { setIngredients([]); setLoading(false); return; }
      const { data: bomData, error: bomErr } = await supabase.from("bom_master").select("materialcode, materialname").eq("prdcode", productData.semi_product_code);
      if (bomErr || !bomData || bomData.length === 0) { setIngredients([]); setLoading(false); return; }
      const uniqueCodes = new Map<string, string>();
      (bomData as BomRawItem[]).forEach((item) => { if (!item.materialcode) return; const baseCode = normalizeIngredientCode(item.materialcode); if (!uniqueCodes.has(baseCode)) uniqueCodes.set(baseCode, item.materialname ?? baseCode); });
      const baseCodes = Array.from(uniqueCodes.keys());
      const { data: ingredientsData, error: ingErr } = await supabase.from("labdoc_ingredients").select("ingredient_code, ingredient_name, coa_urls").in("ingredient_code", baseCodes);
      if (ingErr) console.error("Ingredients fetch error:", ingErr);
      type IngRow = { ingredient_code: string; ingredient_name: string; coa_urls: string[] | null };
      const ingredientMap = new Map<string, IngRow>();
      (ingredientsData ?? []).forEach((ing) => { ingredientMap.set(ing.ingredient_code, ing as IngRow); });
      const result: IngredientWithCoa[] = [];
      uniqueCodes.forEach((name, code) => { const ing = ingredientMap.get(code); result.push({ ingredientCode: code, ingredientName: ing?.ingredient_name ?? name, coaUrls: (ing?.coa_urls ?? []) as string[] }); });
      result.sort((a, b) => a.ingredientCode.localeCompare(b.ingredientCode));
      setIngredients(result);
    } catch (e) { setError(e instanceof Error ? e.message : "데이터 로드 실패"); }
    finally { setLoading(false); }
  }, [decodedProductCode]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const ingredientsWithCoa = ingredients.filter((ing) => ing.coaUrls.length > 0);
  const ingredientsWithoutCoa = ingredients.filter((ing) => ing.coaUrls.length === 0);

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 size={22} className="animate-spin text-amber-500" /></div>;
  if (error || !product) return <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center"><AlertCircle size={48} className="mx-auto text-red-400 mb-3" /><p className="text-red-500 text-sm font-medium">{error || "품목을 찾을 수 없습니다"}</p></div>;

  return (
    <div className="space-y-4">
      <div><h2 className="text-lg font-semibold text-slate-800">원료 COA (시험성적서)</h2><p className="text-sm text-slate-500 mt-0.5">{product.korean_name || product.english_name}<span className="ml-2 text-slate-400">({ingredientsWithCoa.length}/{ingredients.length} 원료에 COA 존재)</span></p></div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2"><FileBox size={16} className="text-amber-500" /><h3 className="text-sm font-semibold text-slate-700">원료별 COA 문서</h3><span className="ml-auto text-xs text-slate-400">{ingredientsWithCoa.length}건</span></div>
        {ingredients.length === 0 ? (
          <div className="py-16 text-center"><AlertCircle size={40} className="mx-auto text-slate-200 mb-3" /><p className="text-slate-400 text-sm">{product.semi_product_code ? "BOM에 등록된 원료가 없습니다" : "반제품코드가 매핑되지 않았습니다"}</p></div>
        ) : ingredientsWithCoa.length === 0 ? (
          <div className="py-16 text-center"><FileText size={40} className="mx-auto text-slate-200 mb-3" /><p className="text-slate-400 text-sm">등록된 COA 문서가 없습니다</p></div>
        ) : (
          <div className="divide-y divide-slate-50">
            {ingredientsWithCoa.map((ing) => (
              <div key={ing.ingredientCode} className="px-4 py-3 hover:bg-amber-50/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0"><span className="font-mono text-xs text-amber-600">{ing.ingredientCode}</span><p className="text-sm text-slate-700 mt-0.5 truncate" title={ing.ingredientName}>{ing.ingredientName}</p></div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {ing.coaUrls.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 text-xs rounded hover:bg-emerald-100 transition-colors"><FileText size={12} /> COA {ing.coaUrls.length > 1 ? `#${idx + 1}` : ""}<ExternalLink size={10} /></a>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {ingredientsWithoutCoa.length > 0 && (
        <details className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <summary className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 cursor-pointer hover:bg-slate-50"><AlertCircle size={16} className="text-slate-400" /><h3 className="text-sm font-medium text-slate-500">COA 미등록 원료</h3><span className="ml-auto text-xs text-slate-400">{ingredientsWithoutCoa.length}건</span></summary>
          <div className="divide-y divide-slate-50">{ingredientsWithoutCoa.map((ing) => (
            <div key={ing.ingredientCode} className="px-4 py-2.5 text-sm"><span className="font-mono text-xs text-slate-500">{ing.ingredientCode}</span><span className="ml-2 text-slate-400">{ing.ingredientName}</span></div>
          ))}</div>
        </details>
      )}
    </div>
  );
}
