"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { getSupabase, type LabProduct } from "../_lib/utils";
import { updateLabProduct } from "../../../actions";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, Printer, Check, X, Pencil } from "lucide-react";

interface ProductRevision {
  id: string;
  product_code: string;
  revision_no: number;
  revision_date: string | null;
  revision_content: string | null;
}

interface ProductStandard extends LabProduct {
  revisions: ProductRevision[];
}

const TEXTAREA_FIELDS = new Set([
  "usage_instructions",
  "dosage",
  "functional_claim",
  "usage_precautions",
]);

export default function ProductStandardPage() {
  const { productCode } = useParams<{ productCode: string }>();
  const decodedProductCode = decodeURIComponent(productCode);

  const [data, setData] = useState<ProductStandard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const { data: productData, error: productErr } = await supabase
        .from("labdoc_products").select("*").eq("product_code", decodedProductCode).single();
      if (productErr) {
        if (productErr.code === "PGRST116") setError("품목을 찾을 수 없습니다"); else throw productErr;
        setLoading(false); return;
      }
      const { data: revisionsData, error: revErr } = await supabase
        .from("labdoc_product_revisions").select("*").eq("product_code", decodedProductCode).order("revision_no", { ascending: true });
      if (revErr) console.error("Revisions fetch error:", revErr);
      setData({ ...(productData as LabProduct), revisions: (revisionsData ?? []) as ProductRevision[] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터 로드 실패");
    } finally { setLoading(false); }
  }, [decodedProductCode]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const handlePrint = () => window.print();

  const startEdit = (field: string, currentValue: string | null | undefined) => {
    setEditingField(field);
    setEditValue(currentValue ?? "");
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const saveEdit = async (field: string) => {
    if (!data) return;
    setSaving(true);
    try {
      const result = await updateLabProduct({
        product_code: data.product_code,
        field,
        value: editValue || null,
      });
      if (result.success) {
        toast.success("저장되었습니다");
        setData((prev) => prev ? { ...prev, [field]: editValue || null } : null);
        setEditingField(null);
        setEditValue("");
      } else {
        toast.error(result.error || "저장 실패");
      }
    } catch {
      toast.error("저장 중 오류가 발생했습니다");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 size={22} className="animate-spin text-amber-500" /></div>;
  if (error || !data) return <div className="bg-white rounded-xl border border-slate-200 p-12 text-center"><AlertCircle size={48} className="mx-auto text-red-400 mb-3" /><p className="text-red-500 text-sm">{error || "품목을 찾을 수 없습니다"}</p></div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-end mb-4 print:hidden">
        <button onClick={handlePrint} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition-colors"><Printer size={16} /> 인쇄</button>
      </div>
      <div className="bg-white border-2 border-slate-800 print:border-black">
        <div className="text-center py-6 border-b-2 border-slate-800 print:border-black">
          <h1 className="text-2xl font-bold tracking-[0.5em] text-slate-800">제 품 표 준 서</h1>
        </div>
        <table className="w-full border-collapse text-sm">
          <tbody>
            {/* 제품명 + 관리번호 */}
            <tr className="border-b border-slate-300">
              <th className="w-28 px-3 py-3 bg-slate-50 text-left font-semibold text-slate-700 border-r border-slate-300 align-middle">제 품 명</th>
              <td className="px-3 py-3 text-slate-800" colSpan={2}>
                <InlineEdit field="korean_name" value={data.korean_name} editingField={editingField} editValue={editValue} saving={saving} onStart={startEdit} onSave={saveEdit} onCancel={cancelEdit} onChange={setEditValue} />
              </td>
              <th className="w-24 px-3 py-3 bg-slate-50 text-left font-semibold text-slate-700 border-l border-r border-slate-300 align-middle">관리번호</th>
              <td className="w-28 px-3 py-3 text-slate-800 font-mono">
                <InlineEdit field="management_code" value={data.management_code} editingField={editingField} editValue={editValue} saving={saving} onStart={startEdit} onSave={saveEdit} onCancel={cancelEdit} onChange={setEditValue} />
              </td>
            </tr>
            {/* 제품약호 */}
            <tr className="border-b border-slate-300">
              <th className="px-3 py-3 bg-slate-50 text-left font-semibold text-slate-700 border-r border-slate-300 align-top" rowSpan={2}>제품약호</th>
              <td className="px-3 py-3 text-slate-800" colSpan={4}>
                <InlineEdit field="english_name" value={data.english_name} editingField={editingField} editValue={editValue} saving={saving} onStart={startEdit} onSave={saveEdit} onCancel={cancelEdit} onChange={setEditValue} />
              </td>
            </tr>
            {/* 코드 + 작성일자 (non-editable) */}
            <tr className="border-b border-slate-300">
              <td className="px-3 py-3" colSpan={4}>
                <div className="flex items-center gap-8">
                  <span><span className="text-slate-500">코드 :</span><span className="ml-2 font-mono text-slate-800">{data.product_code}</span></span>
                  <span><span className="text-slate-500">작성일자</span><span className="ml-2 text-slate-800">{data.created_date || "—"}</span></span>
                </div>
              </td>
            </tr>
            {/* 유형 및 성상 — dual field */}
            <tr className="border-b border-slate-300">
              <th className="px-3 py-3 bg-slate-50 text-left font-semibold text-slate-700 border-r border-slate-300 align-top whitespace-nowrap">유형 및 성상</th>
              <td className="px-3 py-3 text-slate-800" colSpan={4}>
                <div className="flex items-center gap-1">
                  <InlineEdit field="cosmetic_type" value={data.cosmetic_type} editingField={editingField} editValue={editValue} saving={saving} onStart={startEdit} onSave={saveEdit} onCancel={cancelEdit} onChange={setEditValue} inputClassName="w-32" />
                  <span className="text-slate-400 mx-1">/</span>
                  <InlineEdit field="appearance" value={data.appearance} editingField={editingField} editValue={editValue} saving={saving} onStart={startEdit} onSave={saveEdit} onCancel={cancelEdit} onChange={setEditValue} inputClassName="w-48" />
                </div>
              </td>
            </tr>
            {/* Non-editable 별첨 rows */}
            <StaticRow label="원료약품분량" value="별첨.1" />
            <StaticRow label="제 조 공 정" value="별첨.2" />
            <StaticRow label="작업중 주의사항" value="별첨.3" />
            {/* Editable rows */}
            <EditableRow label="사  용  법" field="usage_instructions" value={data.usage_instructions} editingField={editingField} editValue={editValue} saving={saving} onStart={startEdit} onSave={saveEdit} onCancel={cancelEdit} onChange={setEditValue} />
            <EditableRow label="용법·용량" field="dosage" value={data.dosage || '화장품법 시행규칙 "화장품 유형별 사용기준"에 따른다.'} rawValue={data.dosage} editingField={editingField} editValue={editValue} saving={saving} onStart={startEdit} onSave={saveEdit} onCancel={cancelEdit} onChange={setEditValue} />
            <EditableRow label="효능·효과" field="functional_claim" value={data.functional_claim || '화장품법 시행규칙 "화장품 유형별 사용기준"에 따른다.'} rawValue={data.functional_claim} editingField={editingField} editValue={editValue} saving={saving} onStart={startEdit} onSave={saveEdit} onCancel={cancelEdit} onChange={setEditValue} />
            <EditableRow label="사용시의 주의사항" field="usage_precautions" value={data.usage_precautions || '화장품법 시행규칙 "화장품 유형별 사용기준"에 따른다.'} rawValue={data.usage_precautions} editingField={editingField} editValue={editValue} saving={saving} onStart={startEdit} onSave={saveEdit} onCancel={cancelEdit} onChange={setEditValue} />
            <EditableRow label="포장단위" field="packaging_unit" value={data.packaging_unit} editingField={editingField} editValue={editValue} saving={saving} onStart={startEdit} onSave={saveEdit} onCancel={cancelEdit} onChange={setEditValue} />
            <EditableRow label="저장방법" field="storage_method" value={data.storage_method} editingField={editingField} editValue={editValue} saving={saving} onStart={startEdit} onSave={saveEdit} onCancel={cancelEdit} onChange={setEditValue} />
            {/* Non-editable 별첨 rows */}
            <StaticRow label="반제품 규격" value="별첨.6" />
            <StaticRow label="완제품 규격" value="별첨.7" />
          </tbody>
        </table>
        {/* Revision history */}
        <table className="w-full border-collapse text-sm border-t-2 border-slate-800 print:border-black">
          <thead>
            <tr className="bg-slate-50">
              <th className="w-20 px-3 py-2 text-center font-semibold text-slate-700 border-r border-b border-slate-300">일련번호</th>
              <th className="w-28 px-3 py-2 text-center font-semibold text-slate-700 border-r border-b border-slate-300">개정년월일</th>
              <th className="px-3 py-2 text-center font-semibold text-slate-700 border-r border-b border-slate-300">개정사항</th>
              <th className="w-20 px-3 py-2 text-center font-semibold text-slate-700 border-b border-slate-300">개정자</th>
            </tr>
          </thead>
          <tbody>
            {data.revisions.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400">개정이력 없음</td></tr>
            ) : (
              data.revisions.map((rev) => (
                <tr key={rev.id} className="border-b border-slate-200">
                  <td className="px-3 py-2 text-center text-slate-600 border-r border-slate-300">{rev.revision_no}</td>
                  <td className="px-3 py-2 text-center text-slate-600 border-r border-slate-300">{rev.revision_date || "—"}</td>
                  <td className="px-3 py-2 text-slate-700 border-r border-slate-300">{rev.revision_content || "—"}</td>
                  <td className="px-3 py-2 text-center text-slate-600">{data.author || "—"}</td>
                </tr>
              ))
            )}
            {Array.from({ length: Math.max(0, 5 - data.revisions.length) }).map((_, i) => (
              <tr key={`empty-${i}`} className="border-b border-slate-200">
                <td className="px-3 py-2 border-r border-slate-300">&nbsp;</td>
                <td className="px-3 py-2 border-r border-slate-300">&nbsp;</td>
                <td className="px-3 py-2 border-r border-slate-300">&nbsp;</td>
                <td className="px-3 py-2">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .max-w-4xl, .max-w-4xl * { visibility: visible; }
          .max-w-4xl { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; padding: 20mm; }
        }
      `}</style>
    </div>
  );
}

/* ─── Static Row (non-editable) ─── */
function StaticRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <tr className="border-b border-slate-300">
      <th className="px-3 py-3 bg-slate-50 text-left font-semibold text-slate-700 border-r border-slate-300 align-top whitespace-nowrap">{label}</th>
      <td className="px-3 py-3 text-slate-800" colSpan={4}>{value || "—"}</td>
    </tr>
  );
}

/* ─── Inline Edit (used inside td cells) ─── */
interface InlineEditProps {
  field: string;
  value: string | null | undefined;
  editingField: string | null;
  editValue: string;
  saving: boolean;
  onStart: (field: string, value: string | null | undefined) => void;
  onSave: (field: string) => void;
  onCancel: () => void;
  onChange: (value: string) => void;
  inputClassName?: string;
}

function InlineEdit({ field, value, editingField, editValue, saving, onStart, onSave, onCancel, onChange, inputClassName }: InlineEditProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editingField === field && inputRef.current) inputRef.current.focus(); }, [editingField, field]);

  if (editingField === field) {
    return (
      <span className="inline-flex items-center gap-1 print:hidden">
        <Input ref={inputRef} value={editValue} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onSave(field); if (e.key === "Escape") onCancel(); }} className={`h-7 text-sm ${inputClassName ?? ""}`} disabled={saving} />
        <button onClick={() => onSave(field)} disabled={saving} className="p-1 text-green-600 hover:bg-green-50 rounded shrink-0">{saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}</button>
        <button onClick={onCancel} className="p-1 text-red-500 hover:bg-red-50 rounded shrink-0"><X size={14} /></button>
      </span>
    );
  }

  return (
    <span className="group/cell inline-flex items-center gap-1 cursor-pointer hover:bg-amber-50 rounded px-1 -mx-1 print:p-0 print:m-0" onClick={() => onStart(field, value)}>
      {value || "—"}
      <Pencil size={12} className="opacity-0 group-hover/cell:opacity-50 text-slate-400 print:hidden shrink-0" />
    </span>
  );
}

/* ─── Editable Row (full table row with label) ─── */
interface EditableRowProps {
  label: string;
  field: string;
  value: string | null | undefined;
  rawValue?: string | null | undefined;
  editingField: string | null;
  editValue: string;
  saving: boolean;
  onStart: (field: string, value: string | null | undefined) => void;
  onSave: (field: string) => void;
  onCancel: () => void;
  onChange: (value: string) => void;
}

function EditableRow({ label, field, value, rawValue, editingField, editValue, saving, onStart, onSave, onCancel, onChange }: EditableRowProps) {
  const isTextarea = TEXTAREA_FIELDS.has(field);
  const isEditing = editingField === field;
  const editStartValue = rawValue !== undefined ? rawValue : value;

  return (
    <tr className="border-b border-slate-300">
      <th className="px-3 py-3 bg-slate-50 text-left font-semibold text-slate-700 border-r border-slate-300 align-top whitespace-nowrap">{label}</th>
      <td className="px-3 py-3 text-slate-800" colSpan={4}>
        {isEditing ? (
          <div className="flex items-start gap-1 print:hidden">
            {isTextarea ? (
              <textarea autoFocus value={editValue} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }} className="flex-1 min-h-[80px] p-2 text-sm border border-slate-300 rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-amber-400" disabled={saving} />
            ) : (
              <Input autoFocus value={editValue} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onSave(field); if (e.key === "Escape") onCancel(); }} className="h-7 text-sm flex-1" disabled={saving} />
            )}
            <div className="flex flex-col gap-1 shrink-0">
              <button onClick={() => onSave(field)} disabled={saving} className="p-1 text-green-600 hover:bg-green-50 rounded">{saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}</button>
              <button onClick={onCancel} className="p-1 text-red-500 hover:bg-red-50 rounded"><X size={14} /></button>
            </div>
          </div>
        ) : (
          <span className="group/cell inline-flex items-start gap-1 cursor-pointer hover:bg-amber-50 rounded px-1 -mx-1 print:p-0 print:m-0 whitespace-pre-wrap" onClick={() => onStart(field, editStartValue)}>
            {value || "—"}
            <Pencil size={12} className="opacity-0 group-hover/cell:opacity-50 text-slate-400 shrink-0 mt-1 print:hidden" />
          </span>
        )}
      </td>
    </tr>
  );
}
