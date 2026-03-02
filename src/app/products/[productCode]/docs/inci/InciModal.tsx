"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, GripVertical, ArrowDown, Lock } from "lucide-react";
import { toast } from "sonner";
import {
  calculateInciFromBom,
  saveProductInci,
  type ProductInci,
  type InciCalculationItem,
} from "./actions";

interface InciModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productCode: string;
  existingInci: ProductInci | null;
  onSaved: () => void;
}

export default function InciModal({
  open,
  onOpenChange,
  productCode,
  existingInci,
  onSaved,
}: InciModalProps) {
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Calculation result
  const [aboveItems, setAboveItems] = useState<InciCalculationItem[]>([]);
  const [belowItems, setBelowItems] = useState<InciCalculationItem[]>([]);
  const [calculated, setCalculated] = useState(false);

  // Final text fields
  const [inciKo, setInciKo] = useState("");
  const [inciEn, setInciEn] = useState("");
  const [inciCpnp, setInciCpnp] = useState("");
  const [inciFda, setInciFda] = useState("");
  const [designatedAt, setDesignatedAt] = useState("");
  const [author, setAuthor] = useState("");

  // Initialize from existing data
  useEffect(() => {
    if (open) {
      if (existingInci) {
        setInciKo(existingInci.inci_ko || "");
        setInciEn(existingInci.inci_en || "");
        setInciCpnp(existingInci.inci_cpnp || "");
        setInciFda(existingInci.inci_fda || "");
        setDesignatedAt(existingInci.designated_at || "");
        setAuthor((existingInci as ProductInci & { author?: string }).author || "");
      } else {
        setInciKo("");
        setInciEn("");
        setInciCpnp("");
        setInciFda("");
        setDesignatedAt(new Date().toISOString().slice(0, 10));
        setAuthor("");
      }
      setAboveItems([]);
      setBelowItems([]);
      setCalculated(false);
    }
  }, [open, existingInci]);

  // Run INCI calculation
  const handleCalculate = useCallback(async () => {
    setCalculating(true);
    try {
      const { items, error } = await calculateInciFromBom(productCode);
      if (error) {
        toast.error(error);
        return;
      }

      const above = items.filter((i) => i.is_above_1pct);
      const below = items.filter((i) => !i.is_above_1pct);
      setAboveItems(above);
      setBelowItems(below);
      setCalculated(true);

      // Auto-generate text from order
      generateTextFromOrder(above, below);
    } catch {
      toast.error("INCI 계산 중 오류 발생");
    } finally {
      setCalculating(false);
    }
  }, [productCode]);

  // Generate text from current item order
  const generateTextFromOrder = (above: InciCalculationItem[], below: InciCalculationItem[]) => {
    const allOrdered = [...above, ...below];
    const koText = allOrdered.map((i) => i.inci_name_ko).join(", ");
    const enText = allOrdered.map((i) => i.inci_name_en).join(", ");
    setInciKo(koText);
    setInciEn(enText);
  };

  // Apply order to text
  const handleApplyOrder = () => {
    generateTextFromOrder(aboveItems, belowItems);
    toast.success("전성분 텍스트가 업데이트되었습니다");
  };

  // Save
  const handleSave = async () => {
    if (!inciKo.trim() && !inciEn.trim()) {
      toast.error("국문 또는 영문 전성분을 입력해주세요");
      return;
    }

    setSaving(true);
    try {
      const { error } = await saveProductInci({
        product_code: productCode,
        inci_ko: inciKo,
        inci_en: inciEn,
        inci_cpnp: inciCpnp,
        inci_fda: inciFda,
        designated_at: designatedAt || undefined,
        author: author || undefined,
      });

      if (error) {
        toast.error(error);
        return;
      }

      toast.success("전성분이 저장되었습니다");
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("저장 중 오류 발생");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[95vw] w-[1800px] h-[90vh] sm:!max-w-[95vw] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-slate-100 shrink-0">
          <DialogTitle className="text-lg">
            {existingInci ? "전성분 수정" : "전성분 생성"} — {productCode}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 flex-1 min-h-0">
          {/* LEFT: Auto Calculation */}
          <div className="overflow-y-auto border-r border-slate-100 px-6 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">
                자동 계산 (BOM 기반)
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCalculate}
                disabled={calculating}
              >
                {calculating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : null}
                {calculated ? "다시 계산" : "INCI 계산"}
              </Button>
            </div>

            {!calculated && !calculating && (
              <div className="text-center py-12 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
                [INCI 계산] 버튼을 눌러 BOM 기반 전성분을 자동 계산합니다.
              </div>
            )}

            {calculating && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              </div>
            )}

            {calculated && (
              <div className="space-y-4">
                {/* Above 1% — fixed order */}
                {aboveItems.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Lock size={14} className="text-slate-400" />
                      <span className="text-xs font-semibold text-slate-500 uppercase">
                        1% 이상 (순서 고정)
                      </span>
                    </div>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 text-[10px] text-slate-500 font-medium border-b border-slate-200">
                        <span className="w-5 shrink-0"></span>
                        <span className="w-6 text-center shrink-0">No</span>
                        <span className="flex-1">국문</span>
                        <span className="flex-1">영문</span>
                        <span className="w-16 text-right shrink-0">함량</span>
                      </div>
                      {aboveItems.map((item, idx) => (
                        <div
                          key={item.inci_name_en}
                          className="flex items-start gap-1.5 px-2 py-1.5 border-b border-slate-100"
                        >
                          <span className="w-5 text-center text-slate-300 shrink-0 mt-0.5">
                            <Lock size={10} />
                          </span>
                          <span className="w-6 text-center text-[10px] text-slate-400 shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="flex-1 text-xs leading-snug break-words min-w-0">{item.inci_name_ko}</span>
                          <span className="flex-1 text-xs leading-snug text-slate-600 break-words min-w-0">
                            {item.inci_name_en}
                          </span>
                          <span className="w-16 text-right font-mono text-[10px] text-slate-500 shrink-0 mt-0.5">
                            {item.total_percent.toFixed(4)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Separator */}
                {aboveItems.length > 0 && belowItems.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <ArrowDown size={14} />
                    <span>1% 미만 — 드래그로 순서 변경 가능</span>
                  </div>
                )}

                {/* Below 1% — sortable */}
                {belowItems.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <GripVertical size={14} className="text-amber-500" />
                      <span className="text-xs font-semibold text-amber-600 uppercase">
                        1% 이하 (순서 변경 가능)
                      </span>
                    </div>
                    <div className="border border-amber-200 rounded-lg overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-amber-50 text-[10px] text-amber-600 font-medium border-b border-amber-200">
                        <span className="w-5 shrink-0"></span>
                        <span className="w-6 text-center shrink-0">No</span>
                        <span className="flex-1">국문</span>
                        <span className="flex-1">영문</span>
                        <span className="w-16 text-right shrink-0">함량</span>
                      </div>
                      {belowItems.map((item, idx) => (
                        <div
                          key={item.inci_name_en}
                          className="flex items-start gap-1.5 px-2 py-1.5 border-b border-amber-100 bg-white"
                        >
                          <span className="text-amber-500 shrink-0 mt-0.5">
                            <GripVertical size={12} />
                          </span>
                          <span className="w-6 text-center text-[10px] text-slate-400 shrink-0 mt-0.5">
                            {aboveItems.length + idx + 1}
                          </span>
                          <span className="flex-1 text-xs leading-snug break-words min-w-0">{item.inci_name_ko}</span>
                          <span className="flex-1 text-xs leading-snug text-slate-600 break-words min-w-0">{item.inci_name_en}</span>
                          <span className="w-16 text-right font-mono text-[10px] text-slate-500 shrink-0 mt-0.5">
                            {item.total_percent.toFixed(4)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Apply button */}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleApplyOrder}
                  className="w-full"
                >
                  순서를 전성분 텍스트에 반영
                </Button>
              </div>
            )}
          </div>

          {/* RIGHT: Final Text — independently scrollable */}
          <div className="flex flex-col min-h-0">
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">
                확정 전성분
              </h3>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-slate-500 mb-1">국문 전성분</Label>
                  <Textarea
                    value={inciKo}
                    onChange={(e) => setInciKo(e.target.value)}
                    rows={6}
                    placeholder="국문 전성분 목록을 입력하세요..."
                    className="text-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs text-slate-500 mb-1">영문 전성분 (INCI)</Label>
                  <Textarea
                    value={inciEn}
                    onChange={(e) => setInciEn(e.target.value)}
                    rows={6}
                    placeholder="English INCI list..."
                    className="text-sm"
                  />
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <Label className="text-xs text-slate-500 mb-1">
                    CPNP용 전성분 <span className="text-slate-400">(수동 입력)</span>
                  </Label>
                  <Textarea
                    value={inciCpnp}
                    onChange={(e) => setInciCpnp(e.target.value)}
                    rows={3}
                    placeholder="CPNP 전성분 (추후 AI 자동화 예정)..."
                    className="text-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs text-slate-500 mb-1">
                    FDA용 전성분 <span className="text-slate-400">(수동 입력)</span>
                  </Label>
                  <Textarea
                    value={inciFda}
                    onChange={(e) => setInciFda(e.target.value)}
                    rows={3}
                    placeholder="FDA 전성분 (추후 AI 자동화 예정)..."
                    className="text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-500 mb-1">작성자</Label>
                    <Input
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="작성자 이름"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 mb-1">전성분 지정일</Label>
                    <Input
                      type="date"
                      value={designatedAt}
                      onChange={(e) => setDesignatedAt(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons — sticky at bottom */}
            <div className="flex gap-2 px-6 py-3 border-t border-slate-200 bg-white shrink-0">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : null}
                저장
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
