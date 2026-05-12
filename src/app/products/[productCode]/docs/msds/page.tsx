"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { getSupabase, normalizeIngredientCode, type LabProduct } from "../_lib/utils";
import { Loader2, AlertCircle, Printer } from "lucide-react";
import {
  getAlcoholRiskLevel,
  getFlashPointText,
  isAlcoholComponentName,
  isAlcoholRiskLevel,
  parseNumericValue,
  type AlcoholRiskLevel,
} from "@/lib/msds/flammability";

interface IngredientRow { inci_name: string; cas_number: string | null; function: string | null; }
interface PhysicalProperty { label: string; value: string; }
interface BomRawItem { materialcode: string; materialname: string | null; usemount: number | null; }


export default function MsdsPage() {
  const { productCode } = useParams<{ productCode: string }>();
  const decodedProductCode = decodeURIComponent(productCode);
  const [product, setProduct] = useState<LabProduct | null>(null);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [physicalProps, setPhysicalProps] = useState<PhysicalProperty[]>([]);
  const [flashPoint, setFlashPoint] = useState<string>("Not applicable");
  const [alcoholContent, setAlcoholContent] = useState<number>(0);
  const [alcoholRiskLevel, setAlcoholRiskLevel] = useState<AlcoholRiskLevel>("non_flammable");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const supabase = getSupabase();
      const { data: productData, error: productErr } = await supabase.from("labdoc_products").select("*").eq("product_code", decodedProductCode).single();
      if (productErr) { if (productErr.code === "PGRST116") setError("Product not found"); else throw productErr; setLoading(false); return; }
      setProduct(productData as LabProduct);

      const { data: specsData } = await supabase.from("labdoc_product_qc_specs").select("test_item_en, specification_en").eq("product_code", decodedProductCode).eq("qc_type", "완제품").not("test_item_en", "is", null);

      const props: PhysicalProperty[] = [];
      if (specsData) {
        specsData.forEach((s) => {
          if (s.test_item_en === "Appearance") props.push({ label: "Appearance", value: s.specification_en || "N/A" });
          if (s.test_item_en === "Odor") props.push({ label: "Fragrance", value: s.specification_en || "Same as Standard" });
          if (s.test_item_en === "pH ( 25℃ )") props.push({ label: "pH(25℃)", value: s.specification_en || "none" });
        });
      }
      let computedAlcoholContent = 0;

      if (productData.semi_product_code) {
        const { data: bomData } = await supabase.from("bom_master").select("materialcode, materialname, usemount").eq("prdcode", productData.semi_product_code).order("usemount", { ascending: false });
        if (bomData && bomData.length > 0) {
          const normalizedBomRows = (bomData as BomRawItem[])
            .map((item) => ({
              ...item,
              normalized_code: normalizeIngredientCode(item.materialcode),
              usemount_value: parseNumericValue(item.usemount),
            }))
            .filter((item) => item.normalized_code);
          const baseCodes = [...new Set(normalizedBomRows.map((b) => b.normalized_code))];
          const { data: componentsData } = await supabase.from("labdoc_ingredient_components").select("ingredient_code, inci_name_en, cas_number, function, composition_ratio").in("ingredient_code", baseCodes);
          if (componentsData) {
            const uniqueMap = new Map<string, IngredientRow>();
            componentsData.forEach((c) => { const inci = c.inci_name_en || ""; if (inci && !uniqueMap.has(inci)) uniqueMap.set(inci, { inci_name: inci, cas_number: c.cas_number, function: c.function }); });
            setIngredients(Array.from(uniqueMap.values()));

            const alcoholRatioByIngredient = new Map<string, number>();
            componentsData.forEach((component) => {
              if (!isAlcoholComponentName(component.inci_name_en)) {
                return;
              }
              const compositionRatio = parseNumericValue(component.composition_ratio);
              if (compositionRatio <= 0) {
                return;
              }
              const current = alcoholRatioByIngredient.get(component.ingredient_code) || 0;
              alcoholRatioByIngredient.set(component.ingredient_code, current + compositionRatio);
            });

            const totalUsemount = normalizedBomRows.reduce((sum, row) => sum + row.usemount_value, 0);
            if (totalUsemount > 0) {
              const alcoholEquivalent = normalizedBomRows.reduce((sum, row) => {
                const alcoholRatio = alcoholRatioByIngredient.get(row.normalized_code) || 0;
                return sum + (row.usemount_value * alcoholRatio / 100);
              }, 0);
              computedAlcoholContent = Number(((alcoholEquivalent / totalUsemount) * 100).toFixed(2));
            }
          }
        }
      }

      const persistedAlcoholContent = parseNumericValue(productData.msds_alcohol_content);
      const finalAlcoholContent = persistedAlcoholContent > 0 ? persistedAlcoholContent : computedAlcoholContent;
      const riskLevel = isAlcoholRiskLevel(productData.msds_flammability)
        ? productData.msds_flammability
        : getAlcoholRiskLevel(finalAlcoholContent);

      setAlcoholContent(finalAlcoholContent);
      setAlcoholRiskLevel(riskLevel);
      setFlashPoint(getFlashPointText(riskLevel));

      props.push({ label: "Estimated Alcohol Content", value: `${finalAlcoholContent.toFixed(2)}%` });
      props.push({ label: "Flash Point (Estimate)", value: getFlashPointText(riskLevel) });
      setPhysicalProps(props);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load data"); }
    finally { setLoading(false); }
  }, [decodedProductCode]);
  useEffect(() => { fetchData(); }, [fetchData]);
  const handlePrint = () => window.print();
  const today = useMemo(() => { const d = new Date(); const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; }, []);

  const hazardOverviewText = useMemo(() => {
    if (alcoholRiskLevel === "flammable") {
      return "This product contains high alcohol content and may form flammable vapor mixtures. Keep away from heat, sparks, and open flame.";
    }
    if (alcoholRiskLevel === "caution") {
      return "This product contains low to medium alcohol content. Flammability risk is limited but caution is required near ignition sources.";
    }
    return "This is a personal care product with very low alcohol content and no expected flammability hazard under normal use.";
  }, [alcoholRiskLevel]);

  const storageText = useMemo(() => {
    if (alcoholRiskLevel === "flammable") {
      return "Store below 30°C in a cool, ventilated area away from heat, sparks, and open flame. Keep container tightly closed.";
    }
    if (alcoholRiskLevel === "caution") {
      return "Store in a cool, dry, well-ventilated place. Avoid excessive heat and direct sunlight.";
    }
    return "Store in a cool, dry place away from direct sunlight. Keep container tightly closed.";
  }, [alcoholRiskLevel]);

  const transportText = useMemo(() => {
    if (alcoholRiskLevel === "flammable") {
      return "May be regulated as flammable liquid (Class 3) depending on local transport rules and final flash point verification.";
    }
    if (alcoholRiskLevel === "caution") {
      return "Not normally classified as dangerous goods, but verify local requirements for alcohol-containing mixtures.";
    }
    return "Not classified as dangerous goods for transport.";
  }, [alcoholRiskLevel]);

  const explosionHazardText = useMemo(() => {
    if (alcoholRiskLevel === "flammable") {
      return "Vapors may form explosive mixtures with air in confined spaces.";
    }
    if (alcoholRiskLevel === "caution") {
      return "No severe explosion risk expected, but avoid ignition sources during handling.";
    }
    return "No applicable information found.";
  }, [alcoholRiskLevel]);

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 size={22} className="animate-spin text-amber-500" /></div>;
  if (error || !product) return <div className="bg-white rounded-xl border border-slate-200 p-12 text-center"><AlertCircle size={48} className="mx-auto text-red-400 mb-3" /><p className="text-red-500 text-sm">{error || "Product not found"}</p></div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-end mb-4 print:hidden"><button onClick={handlePrint} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200"><Printer size={16} /> Print</button></div>
      <div className="bg-white border border-slate-300 print:border-black text-sm">
        <div className="border-b border-slate-300 p-4">
          <div className="text-xs text-black italic">EVAS</div>
          <h1 className="text-2xl font-bold text-black">EVAS Cosmetics Co., Ltd.</h1>
          <p className="text-xs text-black mt-1">35-5, Sandan-Ro, Pyeongtaek-Si, Gyeonggi-Do, Korea<br />Tel : +82-31-611-7252 &nbsp; Fax : +82-31-611-5764</p>
          <h2 className="text-xl font-bold text-center text-black mt-4">Material Safety Data Sheet</h2>
          <p className="text-right text-xs text-black mt-2">DATE : {today}</p>
        </div>
        <Section title="1. IDENTITY OF PRODUCT AND COMPANY">
          <p><span className="font-medium">Finished Product Name : </span>{product.english_name || product.korean_name || "—"}</p>
          <div className="mt-3"><p className="font-medium">Company Information:</p><ul className="ml-4 mt-1 space-y-0.5"><li>● Company Name : EVAS Cosmetics Co., Ltd.</li><li>● Adress : 35-5, Sandan-Ro, Pyeongtaek-Si, Gyeonggi-Do, Korea</li><li>● Telephone : +82-31-611-7252</li><li>● Fax : +82-31-611-5764</li></ul></div>
        </Section>
        <Section title="2. PRODUCT APPLICATION"><p>{product.msds_type || product.cosmetic_type || product.dosage || "Skin care cosmetics"}</p></Section>
        <Section title="3. COMPOSITION AND INGREDIENTS">
          {ingredients.length === 0 ? <p className="py-4 text-center">No ingredient data available</p> : (
            <table className="w-full text-xs border border-slate-300 text-black">
              <thead><tr className="bg-slate-50"><th className="border border-slate-300 px-2 py-1.5 text-left font-semibold">INGREDIENT NAME</th><th className="border border-slate-300 px-2 py-1.5 text-left font-semibold w-40">CAS No</th><th className="border border-slate-300 px-2 py-1.5 text-center font-semibold w-24">REFERENCE</th><th className="border border-slate-300 px-2 py-1.5 text-left font-semibold w-40">FUNCTION</th></tr></thead>
              <tbody>{ingredients.map((ing, idx) => (<tr key={idx} className="hover:bg-amber-50/30"><td className="border border-slate-200 px-2 py-1">{ing.inci_name}</td><td className="border border-slate-200 px-2 py-1 font-mono text-xs">{ing.cas_number || "-"}</td><td className="border border-slate-200 px-2 py-1 text-center">ICID</td><td className="border border-slate-200 px-2 py-1 text-xs">{ing.function || "-"}</td></tr>))}</tbody>
            </table>
          )}
        </Section>
        <Section title="4. PHYSICAL AND CHEMICAL PROPERTIES">{physicalProps.map((prop, idx) => <p key={idx}><span className="font-medium">{prop.label} : </span>{prop.value}</p>)}</Section>
        <Section title="5. HAZARD IDENTIFICATION"><div className="text-xs"><p className="font-bold">EMERGENCY OVERVIEW :</p><p className="mt-1">{hazardOverviewText}</p><p className="mt-1"><span className="font-medium">Estimated Alcohol Content</span> : {alcoholContent.toFixed(2)}%</p><p className="font-bold mt-2">POTENTIAL HEALTH EFFECTS :</p><ul className="mt-1 space-y-0.5"><li>● <span className="font-medium">EYE</span> : Exposure may cause mild eye irritation.</li><li>● <span className="font-medium">Skin</span> : May cause irritation or sensitization in sensitive individuals.</li><li>● <span className="font-medium">Inhalation</span> : May cause mild, transient respiratory irritation.</li><li>● <span className="font-medium">Ingestion</span> : Product used as intended is not expected to cause gastrointestinal irritation.</li></ul></div></Section>
        <Section title="6. FIRST AID MEASURES"><div className="text-xs space-y-2"><p><span className="font-bold">Eye</span> : Rinse with clean cold water for 15-20 minutes. If discomfort persists, contact a physician.</p><p><span className="font-bold">Skin Problem</span> : Rinse with water. Discontinue use. If reaction worsens, contact a physician.</p><p><span className="font-bold">Inhalation</span> : Remove individual to fresh air.</p><p><span className="font-bold">Ingestion</span> : Dilute with fluids and treat symptomatically. Do not induce vomiting.</p></div></Section>
        <Section title="7. FIRE – FIGHTING MEASURES"><div className="text-xs space-y-1"><p><span className="font-bold">Flash Point</span> : {flashPoint}</p><p><span className="font-bold">Extinguishing Media</span> : Use chemical foam, dry chemical, carbon dioxide or water.</p><p><span className="font-bold">Explosion Hazard</span> : {explosionHazardText}</p></div></Section>
        <Section title="8. ACCIDENTAL RELEASE MEASURES"><div className="text-xs"><p><span className="font-bold">Personal protection</span> : Not required</p><p><span className="font-bold">Environmental protection</span> : No special measures required</p></div></Section>
        <Section title="9. HANDLING AND STORAGE"><p className="text-xs">{storageText}</p></Section>
        <Section title="10. EXPOSURE CONTROLS / PERSONAL PROTECTION"><p className="text-xs">No special protective equipment required for normal consumer use.</p></Section>
        <Section title="11. STABILITY AND REACTIVITY"><p className="text-xs"><span className="font-bold">Stability</span> : Stable under normal conditions. <span className="font-bold">Hazardous Polymerization</span> : Will not occur.</p></Section>
        <Section title="12. TOXICOLOGICAL INFORMATION"><p className="text-xs">This product is not expected to produce any significant adverse health effects when used as intended.</p></Section>
        <Section title="13. ECOLOGICAL INFORMATION"><p className="text-xs">No specific environmental data available. Dispose in accordance with local regulations.</p></Section>
        <Section title="14. DISPOSAL CONSIDERATIONS"><p className="text-xs">Dispose of contents/container in accordance with local/regional/national/international regulations.</p></Section>
        <Section title="15. TRANSPORT INFORMATION"><p className="text-xs">{transportText}</p></Section>
        <div><div className="bg-slate-100 px-4 py-2 font-bold text-black">16. REGULATORY INFORMATION</div><div className="px-4 py-2 text-xs text-black">This product complies with all applicable cosmetic regulations in the country of sale.</div></div>
      </div>
      <style jsx global>{`@media print { body * { visibility: hidden; } .max-w-4xl, .max-w-4xl * { visibility: visible; } .max-w-4xl { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; padding: 10mm; } .bg-slate-100 { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-300">
      <div className="bg-slate-100 px-4 py-2 font-bold text-black">{title}</div>
      <div className="px-4 py-3 space-y-2 text-black">{children}</div>
    </div>
  );
}
