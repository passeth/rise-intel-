"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { fetchProductWithBom, type LabProduct, type NormalizedBomItem, type IngredientComponentRow } from "../../_lib/utils";
import { Loader2, AlertCircle, Printer } from "lucide-react";

interface BreakdownRow { rowIndex: number; isFirstOfRaw: boolean; rawMaterialName: string; rawMaterialCode: string; rawWtPercent: number; componentCount: number; componentInci: string; ratioInRaw: number; calculatedPercent: number; }

export default function BreakdownPage() {
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
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load data"); }
    finally { setLoading(false); }
  }, [decodedProductCode]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const breakdownRows = useMemo((): BreakdownRow[] => {
    if (bomItems.length === 0) return [];
    const rows: BreakdownRow[] = [];
    let rowIndex = 0;
    bomItems.forEach((item) => {
      const rawWtPercent = item.totalUsemount / 1000;
      const components: IngredientComponentRow[] = item.components.length > 0 ? item.components : [{ id: "default", ingredient_code: item.baseCode, inci_name_en: item.materialname, inci_name_kr: null, cas_number: null, composition_ratio: 100, function: null, component_order: 0, country_of_origin: null, created_at: "" }];
      components.forEach((comp, compIdx) => {
        const ratio = comp.composition_ratio ?? 100;
        rows.push({ rowIndex: rowIndex++, isFirstOfRaw: compIdx === 0, rawMaterialName: item.materialname, rawMaterialCode: item.baseCode, rawWtPercent, componentCount: components.length, componentInci: comp.inci_name_en || comp.inci_name_kr || "—", ratioInRaw: ratio, calculatedPercent: (rawWtPercent * ratio) / 100 });
      });
    });
    return rows;
  }, [bomItems]);

  const totalCalculated = breakdownRows.reduce((sum, r) => sum + r.calculatedPercent, 0);
  const handlePrint = () => window.print();

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 size={22} className="animate-spin text-amber-500" /></div>;
  if (error || !product) return <div className="bg-white rounded-xl border border-slate-200 p-12 text-center"><AlertCircle size={48} className="mx-auto text-red-400 mb-3" /><p className="text-red-500 text-sm">{error || "Product not found"}</p></div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-end mb-4 print:hidden"><button onClick={handlePrint} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200"><Printer size={16} /> Print</button></div>
      <div className="bg-white border-2 border-slate-800 print:border-black">
        <div className="text-center py-4 border-b-2 border-slate-800"><h1 className="text-lg font-bold tracking-wider text-slate-800">FORMULA BREAKDOWN</h1><p className="text-xs text-slate-500 mt-1">Raw Material Component Analysis</p></div>
        <div className="border-b border-slate-300 p-4 space-y-2 text-sm">
          <div className="flex"><span className="w-32 font-semibold text-slate-600">PRODUCT NAME :</span><span className="text-slate-800">{product.english_name || product.korean_name || "—"}</span></div>
          <div className="flex"><span className="font-semibold text-slate-600">REFERENCES :</span><span className="ml-2 font-mono text-slate-800">{product.product_code}</span></div>
        </div>
        <table className="w-full text-sm border-collapse">
          <thead><tr className="bg-slate-100 border-b border-slate-300">
            <th className="px-2 py-2 text-center font-semibold text-slate-600 border-r border-slate-300 w-12">No.</th>
            <th className="px-2 py-2 text-left font-semibold text-slate-600 border-r border-slate-300 w-48">Raw Material</th>
            <th className="px-2 py-2 text-right font-semibold text-slate-600 border-r border-slate-300 w-20">WT %</th>
            <th className="px-2 py-2 text-left font-semibold text-slate-600 border-r border-slate-300">Component INCI Name</th>
            <th className="px-2 py-2 text-right font-semibold text-slate-600 border-r border-slate-300 w-24">% in Raw</th>
            <th className="px-2 py-2 text-right font-semibold text-slate-600 w-24">% Calculated</th>
          </tr></thead>
          <tbody>
            {breakdownRows.length === 0 ? <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">No ingredient data available</td></tr> : breakdownRows.map((row, idx) => (
              <tr key={row.rowIndex} className={`border-b hover:bg-amber-50/30 ${row.isFirstOfRaw ? "border-slate-300" : "border-slate-200"} ${row.isFirstOfRaw && idx > 0 ? "border-t-2 border-t-slate-400" : ""}`}>
                {row.isFirstOfRaw && (<>
                  <td className="px-2 py-2 text-center text-slate-500 border-r border-slate-200 font-medium" rowSpan={row.componentCount}>{bomItems.findIndex((b) => b.baseCode === row.rawMaterialCode) + 1}</td>
                  <td className="px-2 py-2 border-r border-slate-200 font-medium text-slate-800" rowSpan={row.componentCount}>{row.rawMaterialName}</td>
                  <td className="px-2 py-2 text-right font-mono text-slate-700 border-r border-slate-200" rowSpan={row.componentCount}>{row.rawWtPercent.toFixed(5)}</td>
                </>)}
                <td className="px-2 py-2 text-slate-700 border-r border-slate-200">{row.componentInci}</td>
                <td className="px-2 py-2 text-right font-mono text-slate-600 border-r border-slate-200">{row.ratioInRaw.toFixed(2)}</td>
                <td className="px-2 py-2 text-right font-mono text-slate-700">{row.calculatedPercent.toFixed(5)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="bg-slate-50 border-t-2 border-slate-400"><td colSpan={5} className="px-3 py-2 text-right font-semibold text-slate-700">Total Calculated</td><td className="px-2 py-2 text-right font-mono font-semibold text-slate-800">{totalCalculated.toFixed(5)}</td></tr></tfoot>
        </table>
      </div>
      <style jsx global>{`@media print { body * { visibility: hidden; } .max-w-6xl, .max-w-6xl * { visibility: visible; } .max-w-6xl { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; padding: 10mm; } table { font-size: 8pt; } }`}</style>
    </div>
  );
}
