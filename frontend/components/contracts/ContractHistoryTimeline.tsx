"use client";

import React from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { queryKeys } from "@/hooks/queryKeys";
import { History, User, Clock, ChevronDown, ChevronUp } from "lucide-react";

// ============================================================================
// Types — aligned with the new structured backend response
// ============================================================================
interface ChangedField {
  field: string;
  label: string;
  old: string | null;
  new: string | null;
}

interface HistoryItem {
  id: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "CANCEL";
  action_label: string;
  changed_fields: ChangedField[];
  changed_at: string;
  changed_by: string;
}

interface HistoryResponse {
  items: HistoryItem[];
  total: number;
}

interface ContractHistoryTimelineProps {
  contractId: string;
}

// ============================================================================
// Action style config
// ============================================================================
const ACTION_STYLE: Record<
  string,
  { bg: string; text: string; dot: string }
> = {
  CREATE: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  UPDATE: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-[#1E60F2]" },
  DELETE: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  CANCEL: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
};

// ============================================================================
// Collapsible field list component
// ============================================================================
function FieldDiffList({ fields }: { fields: ChangedField[] }) {
  const [expanded, setExpanded] = React.useState(true);

  // Fields that contain complex nested content (array/json)
  const COMPLEX_FIELDS = new Set([
    "work_slots",
    "worker_counts",
    "holiday_rules",
    "periodic_schedule",
    "periodic_work_contents",
    "daily_work_contents",
  ]);

  if (fields.length === 0) return null;

  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <span>変更内容（{fields.length}項目）</span>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="divide-y divide-slate-100">
          {fields.map((f) => {
            const isComplex = COMPLEX_FIELDS.has(f.field);
            return (
              <div
                key={f.field}
                className={`px-3 py-2 ${isComplex ? "flex flex-col gap-1" : "flex items-start gap-3"}`}
              >
                {/* Field label */}
                <span className="text-xs font-semibold text-slate-500 shrink-0 min-w-[120px]">
                  {f.label}
                </span>

                {isComplex ? (
                  /* Complex nested content — show collapsible JSON */
                  <div className="flex flex-col gap-1 w-full">
                    {f.old !== null && f.old !== "—" && (
                      <div className="rounded bg-red-50 border border-red-100 px-2 py-1">
                        <p className="text-[10px] font-medium text-red-500 mb-0.5">変更前</p>
                        <pre className="text-xs text-red-700 whitespace-pre-wrap break-all">
                          {f.old}
                        </pre>
                      </div>
                    )}
                    {f.new !== null && f.new !== "—" && (
                      <div className="rounded bg-green-50 border border-green-100 px-2 py-1">
                        <p className="text-[10px] font-medium text-green-600 mb-0.5">変更後</p>
                        <pre className="text-xs text-green-700 whitespace-pre-wrap break-all">
                          {f.new}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Simple scalar field — inline before → after */
                  <div className="flex items-center gap-1.5 flex-wrap text-xs">
                    {f.old !== null ? (
                      <span className="bg-red-50 text-red-700 line-through px-1.5 py-0.5 rounded border border-red-100">
                        {f.old}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">（新規）</span>
                    )}
                    <span className="text-slate-400 font-bold">→</span>
                    {f.new !== null ? (
                      <span className="bg-green-50 text-green-700 font-semibold px-1.5 py-0.5 rounded border border-green-100">
                        {f.new}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">（削除）</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main component
// ============================================================================
export function ContractHistoryTimeline({ contractId }: ContractHistoryTimelineProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.contracts.history(contractId),
    queryFn: () => get<HistoryResponse>(`/contracts/${contractId}/history`),
    enabled: !!contractId,
    // Refresh every 30s to pick up changes made by other users
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-[#1E60F2] mb-3" />
        <p className="text-sm font-medium">履歴を読み込み中...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-red-500 text-sm">
        履歴の読み込みに失敗しました。
      </div>
    );
  }

  if (data.items.length === 0) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
          <History className="h-6 w-6 text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-700">変更履歴はありません</p>
        <p className="text-xs text-slate-400 mt-1">
          契約を更新すると、ここに変更内容が記録されます
        </p>
      </div>
    );
  }

  return (
    <div className="relative border-l-2 border-slate-200 ml-4 py-2 space-y-8">
      {data.items.map((item) => {
        const style = ACTION_STYLE[item.action] ?? ACTION_STYLE.UPDATE;

        return (
          <div key={item.id} className="relative pl-6">
            {/* Timeline dot */}
            <div
              className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-white ${style.dot}`}
            />

            {/* Header row */}
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {/* Action badge */}
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${style.bg} ${style.text}`}
              >
                {item.action_label}
              </span>

              {/* Metadata */}
              <div className="flex items-center text-xs text-slate-500 gap-3">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {format(new Date(item.changed_at), "yyyy年MM月dd日 HH:mm", {
                    locale: ja,
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {item.changed_by}
                </span>
              </div>
            </div>

            {/* Changed fields */}
            <FieldDiffList fields={item.changed_fields} />
          </div>
        );
      })}
    </div>
  );
}
