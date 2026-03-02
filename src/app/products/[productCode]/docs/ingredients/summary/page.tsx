"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { fetchProductWithBom, type LabProduct, type NormalizedBomItem } from "../../_lib/utils";
import { Loader2, AlertCircle, Printer } from "lucide-react";

interface SummaryRow { no: number; inciName: string; wtPercent: number; function: string; casNo: string; }

export default function SummaryPage() {
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

  const summaryRows = useMemo((): SummaryRow[] => {
    if (bomItems.length === 0) return [];
    const inciMap = new Map<string, { wtPercent: number; functions: Set<string>; casNumbers: Set<string> }>();
    bomItems.forEach((item) => {
      const rawWtPercent = item.totalUsemount / 1000;
      if (item.components.length === 0) {
        const key = item.materialname.toUpperCase();
        const ex = inciMap.get(key);
        if (ex) ex.wtPercent += rawWtPercent; else inciMap.set(key, { wtPercent: rawWtPercent, functions: new Set(), casNumbers: new Set() });
      } else {
        item.components.forEach((comp) => {
          const inciName = (comp.inci_name_en || comp.inci_name_kr || "Unknown").toUpperCase();
          const ratio = comp.composition_ratio ?? 100;
          const calculated = (rawWtPercent * ratio) / 100;
          const ex = inciMap.get(inciName);
          if (ex) { ex.wtPercent += calculated; if (comp.function) ex.functions.add(comp.function); if (comp.cas_number) ex.casNumbers.add(comp.cas_number); }
          else { inciMap.set(inciName, { wtPercent: calculated, functions: new Set(comp.function ? [comp.function] : []), casNumbers: new Set(comp.cas_number ? [comp.cas_number] : []) }); }
        });
      }
    });
    return Array.from(inciMap.entries()).map(([inciName, data]) => ({ no: 0, inciName, wtPercent: data.wtPercent, function: Array.from(data.functions).join(", ") || "—", casNo: Array.from(data.casNumbers).join(", ") || "—" })).sort((a, b) => b.wtPercent - a.wtPercent).map((item, idx) => ({ ...item, no: idx + 1 }));
  }, [bomItems]);

  const totalPercent = summaryRows.reduce((sum, r) => sum + r.wtPercent, 0);
  const handlePrint = () => window.print();

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 size={22} className="animate-spin text-amber-500" /></div>;
  if (error || !product) return <div className="bg-white rounded-xl border border-slate-200 p-12 text-center"><AlertCircle size={48} className="mx-auto text-red-400 mb-3" /><p className="text-red-500 text-sm">{error || "Product not found"}</p></div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-end mb-4 print:hidden"><button onClick={handlePrint} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200"><Printer size={16} /> Print</button></div>
      <div className="bg-white border-2 border-slate-800 print:border-black">
        <div className="text-center py-4 border-b-2 border-slate-800"><h1 className="text-lg font-bold tracking-wider text-slate-800">INCI INGREDIENT SUMMARY</h1><p className="text-xs text-slate-500 mt-1">Consolidated by INCI Name, Sorted by Weight %</p></div>
        <div className="border-b border-slate-300 p-4 space-y-2 text-sm">
          <div className="flex"><span className="w-32 font-semibold text-slate-600">PRODUCT NAME :</span><span className="text-slate-800">{product.english_name || product.korean_name || "—"}</span></div>
          <div className="flex"><span className="font-semibold text-slate-600">REFERENCES :</span><span className="ml-2 font-mono text-slate-800">{product.product_code}</span></div>
        </div>
        <table className="w-full text-sm border-collapse">
          <thead><tr className="bg-slate-100 border-b border-slate-300">
            <th className="px-2 py-2 text-center font-semibold text-slate-600 border-r border-slate-300 w-12">No.</th>
            <th className="px-2 py-2 text-left font-semibold text-slate-600 border-r border-slate-300">INCI Name</th>
            <th className="px-2 py-2 text-right font-semibold text-slate-600 border-r border-slate-300 w-24">WT %</th>
            <th className="px-2 py-2 text-left font-semibold text-slate-600 border-r border-slate-300 w-40">Function</th>
            <th className="px-2 py-2 text-left font-semibold text-slate-600 w-32">CAS No.</th>
          </tr></thead>
          <tbody>
            {summaryRows.length === 0 ? <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">No ingredient data available</td></tr> : summaryRows.map((row) => (
              <tr key={row.inciName} className="border-b border-slate-200 hover:bg-amber-50/30">
                <td className="px-2 py-2 text-center text-slate-500 border-r border-slate-200">{row.no}</td>
                <td className="px-2 py-2 text-slate-800 border-r border-slate-200">{row.inciName}</td>
                <td className="px-2 py-2 text-right font-mono text-slate-700 border-r border-slate-200">{row.wtPercent.toFixed(6)}</td>
                <td className="px-2 py-2 text-slate-600 text-xs border-r border-slate-200">{row.function}</td>
                <td className="px-2 py-2 font-mono text-xs text-slate-600">{row.casNo}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="bg-slate-50 border-t-2 border-slate-400"><td colSpan={2} className="px-3 py-2 text-right font-semibold text-slate-700">Total</td><td className="px-2 py-2 text-right font-mono font-semibold text-slate-800 border-r border-slate-200">{totalPercent.toFixed(6)}</td><td colSpan={2}></td></tr></tfoot>
        </table>
        <div className="border-t border-slate-300 p-4 bg-slate-50 text-sm"><span className="text-slate-600">Total INCI Components: <strong className="text-slate-800">{summaryRows.length}</strong></span></div>
      </div>
      <style jsx global>{`@media print { body * { visibility: hidden; } .max-w-5xl, .max-w-5xl * { visibility: visible; } .max-w-5xl { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; padding: 10mm; } table { font-size: 8pt; } }`}</style>
    </div>
  );
}
