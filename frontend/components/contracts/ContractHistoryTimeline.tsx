import React from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { History, User, Clock, FileText } from "lucide-react";

interface AuditLogItem {
  id: string;
  action: string;
  old_value: any;
  new_value: any;
  created_at: string;
  user_name: string | null;
}

interface ContractHistoryTimelineProps {
  contractId: string;
}

export function ContractHistoryTimeline({ contractId }: ContractHistoryTimelineProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["contracts", contractId, "history"],
    queryFn: () => get<{ items: AuditLogItem[], total: number }>(`/contracts/${contractId}/history`),
    enabled: !!contractId,
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-[#1E60F2] mb-3"></div>
        <p className="text-sm font-medium">履歴を読み込み中...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-red-500">
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
      </div>
    );
  }

  const actionMap: Record<string, string> = {
    "CREATE": "作成",
    "UPDATE": "更新",
    "DELETE": "削除",
  };

  return (
    <div className="relative border-l-2 border-slate-200 ml-4 py-2 space-y-8">
      {data.items.map((log, index) => (
        <div key={log.id} className="relative pl-6">
          <div className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-white bg-[#1E60F2] ring-2 ring-blue-100" />
          
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-2">
            <span className="text-sm font-bold text-slate-800">
              {actionMap[log.action] || log.action}
            </span>
            <div className="flex items-center text-xs text-slate-500 gap-3">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {format(new Date(log.created_at), "yyyy年MM月dd日 HH:mm", { locale: ja })}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {log.user_name || "システム"}
              </span>
            </div>
          </div>
          
          {log.action === "UPDATE" && log.new_value && (
            <div className="mt-2 text-sm bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="grid grid-cols-1 gap-2">
                {Object.keys(log.new_value).map(key => {
                  if (log.old_value && JSON.stringify(log.old_value[key]) === JSON.stringify(log.new_value[key])) {
                    return null;
                  }
                  return (
                    <div key={key} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                      <span className="text-slate-500 w-32 shrink-0 font-medium">{key}</span>
                      <div className="flex items-center gap-2 text-slate-700 font-mono text-xs break-all">
                        {log.old_value && log.old_value[key] !== undefined && (
                          <>
                            <span className="line-through opacity-60 bg-red-50 text-red-700 px-1 rounded">
                              {typeof log.old_value[key] === 'object' ? JSON.stringify(log.old_value[key]) : String(log.old_value[key])}
                            </span>
                            <span className="text-slate-400">→</span>
                          </>
                        )}
                        <span className="bg-green-50 text-green-700 px-1 rounded font-semibold">
                          {typeof log.new_value[key] === 'object' ? JSON.stringify(log.new_value[key]) : String(log.new_value[key])}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
