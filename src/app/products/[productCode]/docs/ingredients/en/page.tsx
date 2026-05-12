"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { fetchProductWithBom, type LabProduct, type NormalizedBomItem } from "../../_lib/utils";
import { BomQuickLink } from "../../_components/bom-quick-link";
import { Loader2, AlertCircle, Printer, FileDown } from "lucide-react";
import { generateIngredientsEnPdf } from "@/lib/doc-gen/pdf-ingredients-en";
import { generateCsv } from "@/lib/doc-gen/csv";
import { uploadDocToStorage } from "@/lib/doc-gen/upload";
import { updateProductDocUrls } from "@/app/products/actions";
import { transformIngredientsEn } from "@/lib/doc-gen/transforms";
import type { ProductMeta } from "@/lib/doc-gen/types";
import { toast } from "sonner";

interface EnglishIngredientRow { no: number; code: string; ingredientName: string; wtPercent: number; source: string; casNo: string; function: string; }

const FRAGRANCE_ALLERGEN_CAS = new Set(["5989-27-5","80-56-8","127-91-3","5989-54-8","99-87-6","470-82-6","78-70-6","106-22-9","106-24-1","7540-51-4","5392-40-5","91-64-5","97-53-0","97-54-1","104-55-2","103-41-3","118-58-1","100-51-6","120-51-4","122-40-7","101-86-0","105-13-5","80-54-6","4602-84-0","31906-04-4","90-17-5","111-12-6","107-75-5","6259-76-3","1222-05-5","21145-77-7","141-10-6"]);

export default function EnglishIngredientsPage() {
  const { productCode } = useParams<{ productCode: string }>();
  const decodedProductCode = decodeURIComponent(productCode);
  const [product, setProduct] = useState<LabProduct | null>(null);
  const [bomItems, setBomItems] = useState<NormalizedBomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productNotFound, setProductNotFound] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null); setProductNotFound(false);
    try {
      const result = await fetchProductWithBom(decodedProductCode);
      if (result.productNotFound) { setProductNotFound(true); }
      else if (result.error) { setError(result.error); }
      else { setProduct(result.product); setBomItems(result.bomItems); }
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load data"); }
    finally { setLoading(false); }
  }, [decodedProductCode]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const englishIngredients = useMemo((): EnglishIngredientRow[] => {
    if (bomItems.length === 0) return [];
    const rows: EnglishIngredientRow[] = [];
    bomItems.forEach((item) => {
      const firstComp = item.components[0];
      const inciNames = item.components.map((c) => c.inci_name_en).filter(Boolean).join(", ");
      const functions = [...new Set(item.components.map((c) => c.function).filter(Boolean))].join(", ");
      const casNumbers = [...new Set(item.components.map((c) => c.cas_number).filter(Boolean))].join(", ");
      rows.push({ no: 0, code: item.baseCode, ingredientName: inciNames || item.materialname, wtPercent: item.totalUsemount / 1000, source: "ICID", casNo: casNumbers || firstComp?.cas_number || "—", function: functions || firstComp?.function || "—" });
    });
    return rows.sort((a, b) => b.wtPercent - a.wtPercent).map((item, idx) => ({ ...item, no: idx + 1 }));
  }, [bomItems]);

  const fragranceAllergens = useMemo(() => {
    const allergens: { name: string; casNo: string; wtPercent: number }[] = [];
    bomItems.forEach((item) => {
      const rawWtPercent = item.totalUsemount / 1000;
      item.components.forEach((comp) => {
        if (comp.cas_number && FRAGRANCE_ALLERGEN_CAS.has(comp.cas_number)) {
          const ratio = comp.composition_ratio ?? 100;
          const calc = (rawWtPercent * ratio) / 100;
          if (calc >= 0.001) allergens.push({ name: comp.inci_name_en || "Unknown", casNo: comp.cas_number, wtPercent: calc });
        }
      });
    });
    const merged = new Map<string, { name: string; casNo: string; wtPercent: number }>();
    allergens.forEach((a) => { const ex = merged.get(a.casNo); if (ex) ex.wtPercent += a.wtPercent; else merged.set(a.casNo, { ...a }); });
    return Array.from(merged.values()).sort((a, b) => b.wtPercent - a.wtPercent);
  }, [bomItems]);

  const totalPercent = englishIngredients.reduce((sum, r) => sum + r.wtPercent, 0);
  const handlePrint = () => window.print();

  const handleGenerate = useCallback(async () => {
    if (!product) return;
    setGenerating(true);
    try {
      const meta: ProductMeta = {
        productCode: product.product_code,
        englishName: product.english_name ?? "",
        koreanName: product.korean_name ?? "",
        packagingUnit: product.packaging_unit ?? undefined,
        createdDate: product.created_date ?? undefined,
      };

      const { rows, allergens } = transformIngredientsEn(bomItems);

      const pdfBlob = await generateIngredientsEnPdf(meta, rows, allergens);

      const csvHeaders = ["NO.", "Ingredient Name", "%(W/W)", "Source", "CAS No", "Function"];
      const csvRows: string[][] = [
        ...englishIngredients.map((r) => [
          String(r.no),
          r.ingredientName,
          r.wtPercent >= 99.99 ? "To. 100" : r.wtPercent.toFixed(5),
          r.source,
          r.casNo,
          r.function,
        ]),
        ["", "", "", "", "", ""],
        ["", "Total", totalPercent.toFixed(5), "", "", ""],
      ];

      if (fragranceAllergens.length > 0) {
        csvRows.push(["", "", "", "", "", ""]);
        csvRows.push(["Fragrance Allergens Ingredients", "", "", "", "", ""]);
        csvRows.push(["NO.", "INCI Name", "CAS No", "%(W/W)", "", ""]);
        fragranceAllergens.forEach((a, idx) => {
          csvRows.push([String(idx + 1), a.name, a.casNo, a.wtPercent.toFixed(5), "", ""]);
        });
      }

      const csvBlob = generateCsv(csvHeaders, csvRows);

      const pdfUrl = await uploadDocToStorage(
        pdfBlob,
        "products/" + decodedProductCode + "/ingredients-en.pdf",
        "application/pdf"
      );
      const csvUrl = await uploadDocToStorage(
        csvBlob,
        "products/" + decodedProductCode + "/ingredients-en.csv",
        "text/csv"
      );

      const result = await updateProductDocUrls(decodedProductCode, {
        ingredients_en_pdf_url: pdfUrl,
        ingredients_en_csv_url: csvUrl,
      });

      if (result.success) {
        toast.success("성분표(EN) PDF/CSV 생성 완료");
      } else {
        toast.error("저장 실패: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      toast.error("생성 실패: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setGenerating(false);
    }
  }, [product, bomItems, englishIngredients, fragranceAllergens, totalPercent, decodedProductCode]);

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 size={22} className="animate-spin text-amber-500" /></div>;
  if (productNotFound) return <BomQuickLink productCode={decodedProductCode} onLinked={fetchData} />;
  if (error || !product) return <div className="bg-white rounded-xl border border-slate-200 p-12 text-center"><AlertCircle size={48} className="mx-auto text-red-400 mb-3" /><p className="text-red-500 text-sm">{error || "Product not found"}</p></div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-end gap-2 mb-4 print:hidden">
        <button onClick={handleGenerate} disabled={generating || loading} className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50">
          {generating ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
          {generating ? "Generating..." : "Generate CSV/PDF"}
        </button>
        <button onClick={handlePrint} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200"><Printer size={16} /> Print</button>
      </div>
      <div className="bg-white border-2 border-slate-800 print:border-black">
        <div className="text-center py-4 border-b-2 border-slate-800"><h1 className="text-lg font-bold tracking-wider text-slate-800">FORMULA INGREDIENTS STATEMENT</h1></div>
        <div className="border-b border-slate-300 p-4 space-y-2 text-sm">
          <div className="flex"><span className="w-32 font-semibold text-slate-600">PRODUCT NAME :</span><span className="text-slate-800">{product.english_name || product.korean_name || "—"}</span></div>
          <div className="flex gap-8"><div className="flex"><span className="font-semibold text-slate-600">REFERENCES :</span><span className="ml-2 font-mono text-slate-800">{product.product_code}</span></div><span className="text-slate-600">{product.packaging_unit || "—"}</span><span className="text-slate-600">{product.created_date || "—"}</span></div>
        </div>
        <table className="w-full text-sm border-collapse">
          <thead><tr className="bg-slate-100 border-b border-slate-300">
            <th className="px-2 py-2 text-center font-semibold text-slate-600 border-r border-slate-300 w-12">NO.</th>
            <th className="px-2 py-2 text-left font-semibold text-slate-600 border-r border-slate-300 w-24">CODE</th>
            <th className="px-2 py-2 text-left font-semibold text-slate-600 border-r border-slate-300">Ingredient Name</th>
            <th className="px-2 py-2 text-right font-semibold text-slate-600 border-r border-slate-300 w-20">%(W/W)</th>
            <th className="px-2 py-2 text-center font-semibold text-slate-600 border-r border-slate-300 w-16">Source</th>
            <th className="px-2 py-2 text-left font-semibold text-slate-600 border-r border-slate-300 w-28">CAS No</th>
            <th className="px-2 py-2 text-left font-semibold text-slate-600 w-32">Function</th>
          </tr></thead>
          <tbody>
            {englishIngredients.length === 0 ? <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">No ingredient data available</td></tr> : englishIngredients.map((row) => (
              <tr key={row.code} className="border-b border-slate-200 hover:bg-amber-50/30">
                <td className="px-2 py-2 text-center text-slate-500 border-r border-slate-200">{row.no}</td>
                <td className="px-2 py-2 font-mono text-xs text-slate-600 border-r border-slate-200">{row.code}</td>
                <td className="px-2 py-2 text-slate-800 border-r border-slate-200">{row.ingredientName}</td>
                <td className="px-2 py-2 text-right font-mono text-slate-700 border-r border-slate-200">{row.wtPercent >= 99.99 ? "To. 100" : row.wtPercent.toFixed(5)}</td>
                <td className="px-2 py-2 text-center text-slate-600 border-r border-slate-200">{row.source}</td>
                <td className="px-2 py-2 font-mono text-xs text-slate-600 border-r border-slate-200">{row.casNo}</td>
                <td className="px-2 py-2 text-slate-600 text-xs">{row.function}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="bg-slate-50 border-t-2 border-slate-400"><td colSpan={3} className="px-3 py-2 text-right font-semibold text-slate-700">Total</td><td className="px-2 py-2 text-right font-mono font-semibold text-slate-800 border-r border-slate-200">{totalPercent.toFixed(5)}</td><td colSpan={3}></td></tr></tfoot>
        </table>
        {fragranceAllergens.length > 0 && (
          <div className="border-t-2 border-slate-600">
            <div className="bg-slate-200 px-4 py-2"><h2 className="text-sm font-bold text-slate-700">Fragrance Allergens Ingredients</h2></div>
            <table className="w-full text-sm border-collapse">
              <thead><tr className="bg-slate-50 border-b border-slate-300"><th className="px-3 py-2 text-center font-semibold text-slate-600 border-r border-slate-300 w-12">NO.</th><th className="px-3 py-2 text-left font-semibold text-slate-600 border-r border-slate-300">INCI Name</th><th className="px-3 py-2 text-left font-semibold text-slate-600 border-r border-slate-300 w-32">CAS No</th><th className="px-3 py-2 text-right font-semibold text-slate-600 w-24">%(W/W)</th></tr></thead>
              <tbody>{fragranceAllergens.map((a, idx) => (
                <tr key={a.casNo} className="border-b border-slate-200 hover:bg-amber-50/30"><td className="px-3 py-2 text-center text-slate-500 border-r border-slate-200">{idx + 1}</td><td className="px-3 py-2 text-slate-800 border-r border-slate-200">{a.name}</td><td className="px-3 py-2 font-mono text-xs text-slate-600 border-r border-slate-200">{a.casNo}</td><td className="px-3 py-2 text-right font-mono text-slate-700">{a.wtPercent.toFixed(5)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      <style jsx global>{`@media print { body * { visibility: hidden; } .max-w-6xl, .max-w-6xl * { visibility: visible; } .max-w-6xl { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; padding: 10mm; } table { font-size: 9pt; } }`}</style>
    </div>
  );
}
