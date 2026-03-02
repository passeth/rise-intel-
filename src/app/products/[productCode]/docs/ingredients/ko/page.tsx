"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { fetchProductWithBom, type LabProduct, type NormalizedBomItem } from "../../_lib/utils";
import { Loader2, AlertCircle, Printer } from "lucide-react";

interface KoreanIngredientRow { no: number; code: string; inciNameKr: string; wtPercent: number; }

export default function KoreanIngredientsPage() {
  const { productCode } = useParams<{ productCode: string }>();
  const decodedProductCode = decodeURIComponent(productCode);
  const [product, setProduct] = useState<LabProduct | null>(null);
  const [bomItems, setBomItems] = useState<NormalizedBomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await fetchProductWithBom(decodedProductCode);
      if (result.error) { setError(result.error); } else { setProduct(result.product); setBomItems(result.bomItems); }
    } catch (e) { setError(e instanceof Error ? e.message : "데이터 로드 실패"); }
    finally { setLoading(false); }
  }, [decodedProductCode]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const koreanIngredients = useMemo((): KoreanIngredientRow[] => {
    if (bomItems.length === 0) return [];
    const rows: KoreanIngredientRow[] = [];
    bomItems.forEach((item) => {
      const krNames = item.components.map((c) => c.inci_name_kr).filter(Boolean).join(", ");
      rows.push({ no: 0, code: item.baseCode, inciNameKr: krNames || item.materialname, wtPercent: item.totalUsemount / 1000 });
    });
    return rows.sort((a, b) => b.wtPercent - a.wtPercent).map((item, idx) => ({ ...item, no: idx + 1 }));
  }, [bomItems]);

  const totalPercent = koreanIngredients.reduce((sum, r) => sum + r.wtPercent, 0);
  const handlePrint = () => window.print();

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 size={22} className="animate-spin text-amber-500" /></div>;
  if (error || !product) return <div className="bg-white rounded-xl border border-slate-200 p-12 text-center"><AlertCircle size={48} className="mx-auto text-red-400 mb-3" /><p className="text-red-500 text-sm">{error || "품목을 찾을 수 없습니다"}</p></div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-end mb-4 print:hidden">
        <button onClick={handlePrint} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200"><Printer size={16} /> 인쇄</button>
      </div>
      <div className="bg-white border-2 border-slate-800 print:border-black">
        <div className="text-center py-4 border-b-2 border-slate-800"><h1 className="text-lg font-bold tracking-wider text-slate-800">FORMULA INGREDIENTS STATEMENT</h1></div>
        <div className="border-b border-slate-300 p-4 space-y-2 text-sm">
          <div className="flex"><span className="w-32 font-semibold text-slate-600">PRODUCT NAME :</span><span className="text-slate-800">{product.korean_name || "—"}</span></div>
          <div className="flex"><span className="w-32 font-semibold text-slate-600">ENGLISH NAME :</span><span className="text-slate-800">{product.english_name || "—"}</span></div>
          <div className="flex gap-8">
            <div className="flex"><span className="font-semibold text-slate-600">REFERENCES :</span><span className="ml-2 font-mono text-slate-800">{product.product_code}</span></div>
            <span className="text-slate-600">{product.packaging_unit || "—"}</span>
            <span className="text-slate-600">{product.created_date || "—"}</span>
          </div>
        </div>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="px-3 py-2 text-center font-semibold text-slate-600 border-r border-slate-300 w-14">NO.</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 border-r border-slate-300 w-28">CODE</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600 border-r border-slate-300">REFERENCES ICID</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-600 w-24">% W/W</th>
            </tr>
          </thead>
          <tbody>
            {koreanIngredients.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-400">성분 데이터가 없습니다</td></tr>
            ) : koreanIngredients.map((row) => (
              <tr key={row.code} className="border-b border-slate-200 hover:bg-amber-50/30">
                <td className="px-3 py-2 text-center text-slate-500 border-r border-slate-200">{row.no}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-600 border-r border-slate-200">{row.code}</td>
                <td className="px-3 py-2 text-slate-800 border-r border-slate-200">{row.inciNameKr}</td>
                <td className="px-3 py-2 text-right font-mono text-slate-700">{row.wtPercent >= 99.99 ? "To. 100" : row.wtPercent.toFixed(5)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t-2 border-slate-400">
              <td colSpan={3} className="px-3 py-2 text-right font-semibold text-slate-700">합 계</td>
              <td className="px-3 py-2 text-right font-mono font-semibold text-slate-800">{totalPercent.toFixed(5)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .max-w-4xl, .max-w-4xl * { visibility: visible; }
          .max-w-4xl { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; padding: 15mm; }
        }
      `}</style>
    </div>
  );
}
