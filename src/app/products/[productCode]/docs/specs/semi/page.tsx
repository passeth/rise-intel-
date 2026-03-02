"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { getSupabase, type LabProduct } from "../../_lib/utils";
import { fetchQcSpecs, updateQcSpec, addQcSpec, deleteQcSpec, type QcSpec } from "../actions";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, Printer, Plus, Trash2, Check, X } from "lucide-react";

export default function SemiProductSpecsPage() {
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
      if (productErr) { if (productErr.code === "PGRST116") setError("품목을 찾을 수 없습니다"); else throw productErr; setLoading(false); return; }
      setProduct(productData as LabProduct);
      const { specs: specsData, error: specsErr } = await fetchQcSpecs(decodedProductCode, "반제품");
      if (specsErr) { console.error("Semi product specs fetch error:", specsErr); setSpecs([]); }
      else { setSpecs(specsData); }
    } catch (e) { setError(e instanceof Error ? e.message : "데이터 로드 실패"); }
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
        toast.success("저장되었습니다");
        setSpecs((prev) => prev.map((s) => s.id === editingCell.id ? { ...s, [editingCell.field]: editValue || null } : s));
        setEditingCell(null); setEditValue("");
      } else { toast.error(result.error || "저장 실패"); }
    } catch { toast.error("저장 중 오류"); } finally { setSaving(false); }
  };

  const handleAdd = async () => {
    setAdding(true);
    try {
      const result = await addQcSpec(decodedProductCode, "반제품");
      if (result.spec) {
        setSpecs((prev) => [...prev, result.spec!]);
        toast.success("항목 추가됨");
      } else { toast.error(result.error || "추가 실패"); }
    } catch { toast.error("추가 중 오류"); } finally { setAdding(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteQcSpec(id);
      if (result.success) {
        setSpecs((prev) => prev.filter((s) => s.id !== id));
        toast.success("항목 삭제됨");
      } else { toast.error(result.error || "삭제 실패"); }
    } catch { toast.error("삭제 중 오류"); }
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 size={22} className="animate-spin text-amber-500" /></div>;
  if (error || !product) return <div className="bg-white rounded-xl border border-slate-200 p-12 text-center"><AlertCircle size={48} className="mx-auto text-red-400 mb-3" /><p className="text-red-500 text-sm">{error || "품목을 찾을 수 없습니다"}</p></div>;

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
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-end gap-2 mb-4 print:hidden">
        <button onClick={handleAdd} disabled={adding} className="inline-flex items-center gap-1 px-3 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm hover:bg-amber-100 border border-amber-200 transition-colors disabled:opacity-50">
          {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} 항목 추가
        </button>
        <button onClick={handlePrint} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200"><Printer size={16} /> 인쇄</button>
      </div>
      <div className="bg-white border-2 border-slate-800 print:border-black">
        <div className="text-center py-4 border-b-2 border-slate-800"><h1 className="text-lg font-bold tracking-wider text-slate-800">반제품 시험기준 및 시험방법</h1></div>
        <div className="grid grid-cols-4 border-b border-slate-300 text-sm">
          <div className="px-4 py-2 bg-slate-100 border-r border-slate-300 text-center font-semibold text-slate-600">제 품 명</div>
          <div className="px-4 py-2 bg-slate-100 border-r border-slate-300 text-center font-semibold text-slate-600">제품코드</div>
          <div className="px-4 py-2 bg-slate-100 border-r border-slate-300 text-center font-semibold text-slate-600">작성일자</div>
          <div className="px-4 py-2 bg-slate-100 text-center font-semibold text-slate-600">작성자</div>
        </div>
        <div className="grid grid-cols-4 border-b border-slate-300 text-sm">
          <div className="px-4 py-3 border-r border-slate-300 text-slate-800">{product.korean_name || "—"}</div>
          <div className="px-4 py-3 border-r border-slate-300 font-mono text-slate-700">{product.product_code}</div>
          <div className="px-4 py-3 border-r border-slate-300 text-slate-700">{product.created_date || "—"}</div>
          <div className="px-4 py-3 text-slate-700">—</div>
        </div>
        <table className="w-full text-sm border-collapse">
          <thead><tr className="bg-slate-100 border-b border-slate-300">
            <th className="px-3 py-2 text-center font-semibold text-slate-600 border-r border-slate-300 w-12">순번</th>
            <th className="px-3 py-2 text-center font-semibold text-slate-600 border-r border-slate-300 w-28">항 목</th>
            <th className="px-3 py-2 text-center font-semibold text-slate-600 border-r border-slate-300">시 험 기 준</th>
            <th className="px-3 py-2 text-center font-semibold text-slate-600 border-r border-slate-300 w-32">시 험 방 법</th>
            <th className="px-3 py-2 text-center font-semibold text-slate-600 w-16 print:hidden">삭제</th>
          </tr></thead>
          <tbody>
            {specs.length === 0 ? <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">이 품목의 반제품 시험기준 데이터가 없습니다</td></tr> : specs.map((spec) => (
              <tr key={spec.id} className="border-b border-slate-200 hover:bg-amber-50/30 group">
                <td className="px-3 py-2 text-center text-slate-500 border-r border-slate-200">{spec.sequence_no}</td>
                <td className="px-3 py-2 text-center text-slate-700 border-r border-slate-200">{renderCell(spec, "test_item", spec.test_item)}</td>
                <td className="px-3 py-2 text-slate-700 border-r border-slate-200">{renderCell(spec, "specification", spec.specification || "")}</td>
                <td className="px-3 py-2 text-center font-mono text-xs text-slate-600 border-r border-slate-200">{renderCell(spec, "test_method", spec.test_method || "")}</td>
                <td className="px-3 py-2 text-center print:hidden">
                  <button onClick={() => handleDelete(spec.id)} className="p-1 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded transition-opacity"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-slate-300 px-6 py-4 bg-slate-50"><p className="text-xs text-slate-600 mb-1">* 참 고 사 항 :</p><p className="text-xs text-slate-600 ml-4">시 험 방 법</p><p className="text-xs text-slate-600 ml-4">1. 화장품 기준 및 시험방법에 의거.</p></div>
        <div className="border-t border-slate-300 px-6 py-6"><div className="flex justify-end gap-12">
          <div className="text-center"><div className="w-24 border-b border-slate-400 mb-1 h-10"></div><span className="text-xs text-slate-500">작 성</span></div>
          <div className="text-center"><div className="w-24 border-b border-slate-400 mb-1 h-10"></div><span className="text-xs text-slate-500">검 토</span></div>
          <div className="text-center"><div className="w-24 border-b border-slate-400 mb-1 h-10"></div><span className="text-xs text-slate-500">승 인</span></div>
        </div></div>
      </div>
      <style jsx global>{`@media print { body * { visibility: hidden; } .max-w-5xl, .max-w-5xl * { visibility: visible; } .max-w-5xl { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; padding: 15mm; } }`}</style>
    </div>
  );
}
