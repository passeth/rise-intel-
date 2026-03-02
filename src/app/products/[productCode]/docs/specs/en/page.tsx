"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { getSupabase, type LabProduct } from "../../_lib/utils";
import { fetchQcSpecs, updateQcSpec, addQcSpec, deleteQcSpec, type QcSpec } from "../actions";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, Printer, Plus, Trash2, Check, X } from "lucide-react";

export default function TechnicalSpecsEnPage() {
  const { productCode } = useParams<{ productCode: string }>();
  const decodedProductCode = decodeURIComponent(productCode);
  const [product, setProduct] = useState<LabProduct | null>(null);
  const [specs, setSpecs] = useState<QcSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const supabase = getSupabase();
      const { data: productData, error: productErr } = await supabase.from("labdoc_products").select("*").eq("product_code", decodedProductCode).single();
      if (productErr) { if (productErr.code === "PGRST116") setError("Product not found"); else throw productErr; setLoading(false); return; }
      setProduct(productData as LabProduct);
      const { specs: specsData, error: specsErr } = await fetchQcSpecs(decodedProductCode, "완제품");
      if (specsErr) { console.error("English specs fetch error:", specsErr); setSpecs([]); }
      else {
        // Filter to only show rows with test_item_en
        setSpecs(specsData.filter((s) => s.test_item_en));
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load data"); }
    finally { setLoading(false); }
  }, [decodedProductCode]);
  useEffect(() => { fetchData(); }, [fetchData]);
  const handlePrint = () => window.print();

  const startEdit = (id: string, field: string, currentValue: string | null) => {
    setEditingCell({ id, field });
    setEditValue(currentValue ?? "");
  };

  const cancelEdit = () => { setEditingCell(null); setEditValue(""); };

  const saveEdit = async () => {
    if (!editingCell) return;
    setSaving(true);
    try {
      const result = await updateQcSpec(editingCell.id, editingCell.field, editValue);
      if (result.success) {
        toast.success("Saved");
        setSpecs((prev) => prev.map((s) => s.id === editingCell.id ? { ...s, [editingCell.field]: editValue || null } : s));
        setEditingCell(null); setEditValue("");
      } else { toast.error(result.error || "Save failed"); }
    } catch { toast.error("Error saving"); } finally { setSaving(false); }
  };

  const handleAdd = async () => {
    setAdding(true);
    try {
      const result = await addQcSpec(decodedProductCode, "완제품");
      if (result.spec) {
        // Set test_item_en so it appears in filtered list
        const specWithEn = { ...result.spec, test_item_en: "New Item" };
        await updateQcSpec(result.spec.id, "test_item_en", "New Item");
        setSpecs((prev) => [...prev, specWithEn]);
        toast.success("Item added");
      } else { toast.error(result.error || "Add failed"); }
    } catch { toast.error("Error adding"); } finally { setAdding(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteQcSpec(id);
      if (result.success) {
        setSpecs((prev) => prev.filter((s) => s.id !== id));
        toast.success("Item deleted");
      } else { toast.error(result.error || "Delete failed"); }
    } catch { toast.error("Error deleting"); }
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 size={22} className="animate-spin text-amber-500" /></div>;
  if (error || !product) return <div className="bg-white rounded-xl border border-slate-200 p-12 text-center"><AlertCircle size={48} className="mx-auto text-red-400 mb-3" /><p className="text-red-500 text-sm">{error || "Product not found"}</p></div>;

  const renderCell = (spec: QcSpec, field: keyof QcSpec, displayValue: string) => {
    const isEditing = editingCell?.id === spec.id && editingCell?.field === field;
    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <Input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }} className="h-7 text-sm" disabled={saving} />
          <button onClick={saveEdit} disabled={saving} className="p-0.5 text-green-600 hover:bg-green-50 rounded shrink-0">{saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}</button>
          <button onClick={cancelEdit} className="p-0.5 text-red-500 hover:bg-red-50 rounded shrink-0"><X size={12} /></button>
        </div>
      );
    }
    return (
      <span className="cursor-pointer hover:bg-amber-50 rounded px-1 -mx-1 block" onClick={() => startEdit(spec.id, field, spec[field] as string | null)}>
        {displayValue || "—"}
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-end gap-2 mb-4 print:hidden">
        <button onClick={handleAdd} disabled={adding} className="inline-flex items-center gap-1 px-3 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm hover:bg-amber-100 border border-amber-200 transition-colors disabled:opacity-50">
          {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add Item
        </button>
        <button onClick={handlePrint} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200"><Printer size={16} /> Print</button>
      </div>
      <div className="bg-white border-2 border-slate-800 print:border-black">
        <div className="text-center py-6 border-b-2 border-slate-800"><h1 className="text-xl font-bold tracking-widest text-slate-800">TECHNICAL SPECIFICATIONS</h1></div>
        <div className="px-6 py-4 border-b border-slate-300"><p className="text-sm text-slate-700 italic">We Hereby Certify the Following Specifications :</p></div>
        <div className="border-b border-slate-300 px-6 py-4 space-y-2 text-sm">
          <div className="flex"><span className="w-36 font-semibold text-slate-600">PRODUCT NAME :</span><span className="text-slate-800">{product.english_name || product.korean_name || "—"}</span></div>
          <div className="flex gap-6"><div className="flex"><span className="font-semibold text-slate-600">REFERENCES :</span><span className="ml-2 font-mono text-slate-800">{product.product_code}</span></div><span className="text-slate-600">{product.packaging_unit || "—"}</span><span className="text-slate-600">{product.created_date || "—"}</span></div>
        </div>
        <table className="w-full text-sm border-collapse">
          <thead><tr className="bg-slate-100 border-b border-slate-300">
            <th className="px-4 py-3 text-left font-semibold text-slate-600 border-r border-slate-300 w-48">T E S T S</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600 border-r border-slate-300">S P E C I F I C A T I O N S</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600 border-r border-slate-300 w-44">RESULT</th>
            <th className="px-4 py-3 text-center font-semibold text-slate-600 w-14 print:hidden">DEL</th>
          </tr></thead>
          <tbody>
            {specs.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No test specification data available for this product</td></tr> : specs.map((spec) => (
              <tr key={spec.id} className="border-b border-slate-200 hover:bg-amber-50/30 group">
                <td className="px-4 py-3 text-slate-700 border-r border-slate-200">{renderCell(spec, "test_item_en", spec.test_item_en || "")}</td>
                <td className="px-4 py-3 text-slate-600 border-r border-slate-200">{renderCell(spec, "specification_en", spec.specification_en || "")}</td>
                <td className="px-4 py-3 text-slate-700 font-medium border-r border-slate-200">{renderCell(spec, "result", spec.result || "")}</td>
                <td className="px-4 py-3 text-center print:hidden">
                  <button onClick={() => handleDelete(spec.id)} className="p-1 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded transition-opacity"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t-2 border-slate-600 px-6 py-6"><div className="flex items-center gap-4"><span className="font-bold text-slate-700 text-lg tracking-wider">CONCLUSION</span><span className="px-6 py-2 bg-green-100 text-green-800 font-bold rounded-md tracking-wider">ACCEPTED</span></div></div>
        <div className="border-t border-slate-300 px-6 py-8"><div className="flex justify-end gap-16"><div className="text-center"><div className="w-32 border-b border-slate-400 mb-2 h-12"></div><span className="text-xs text-slate-500">Prepared by</span></div><div className="text-center"><div className="w-32 border-b border-slate-400 mb-2 h-12"></div><span className="text-xs text-slate-500">Approved by</span></div></div></div>
      </div>
      <style jsx global>{`@media print { body * { visibility: hidden; } .max-w-4xl, .max-w-4xl * { visibility: visible; } .max-w-4xl { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; padding: 15mm; } }`}</style>
    </div>
  );
}
