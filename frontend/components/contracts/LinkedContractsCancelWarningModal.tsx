"use client";
import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, AlertCircle, Clock, AlertTriangle } from "lucide-react";
import { useLinkedOrderingContracts } from "@/hooks/useContracts";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the chosen cancellation date (YYYY-MM-DD) */
  onConfirm: (cancellationDate: string, reason?: string) => void;
  receivingContractId: string;
  isLoading?: boolean;
}

export const LinkedContractsCancelWarningModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirm,
  receivingContractId,
  isLoading: externalLoading = false,
}) => {
  const today = new Date().toISOString().slice(0, 10);
  const [cancellationDate, setCancellationDate] = useState<string>(today);
  const [reason, setReason] = useState<string>("");

  const { data: linkedContracts, isLoading: linkedLoading } =
    useLinkedOrderingContracts(receivingContractId);

  const isFuture = cancellationDate > today;
  const isLoading = externalLoading || linkedLoading;

  if (!isOpen) return null;

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl z-[101]"
        >
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-[#F83B3B]" />
              解約の確認
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            {/* Linked contracts warning */}
            <p className="text-slate-700 text-[15px]">
              現在、この契約には協力会社との関連契約が存在します。
              <br />
              解約すると、以下の協力会社との契約も<strong>同時に解約</strong>
              されます。
            </p>

            {linkedLoading ? (
              <p className="text-sm text-slate-500">データを読み込み中...</p>
            ) : (
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 max-h-40 overflow-y-auto">
                {!linkedContracts || linkedContracts.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    関連契約がありません。
                  </p>
                ) : (
                  <ul className="list-disc pl-5 space-y-2">
                    {linkedContracts?.map((c: any) => (
                      <li key={c.id} className="text-sm text-slate-700">
                        <strong>{c.partner_name || "協力会社未定"}</strong>:{" "}
                        {c.contract_name || c.internal_code || "名称未設定"}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Cancellation date picker */}
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-slate-700">
                解約有効日 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={cancellationDate}
                min={today}
                onChange={(e) => setCancellationDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all"
              />
            </div>

            {/* Reason */}
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-slate-700">
                解約理由
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="解約理由を入力してください（任意）"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all resize-none"
              />
            </div>

            {/* Future-date warning */}
            {isFuture && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
                <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  選択した日付まで契約は<strong>有効のまま</strong>維持されます。選択日以降の請求書は即時無効化されます。自動更新も停止されます。
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={() => onConfirm(cancellationDate, reason || undefined)}
              disabled={isLoading || !cancellationDate}
              className="h-10 px-4 rounded-lg bg-[#F83B3B] text-white text-sm font-semibold hover:bg-[#E51E1E] transition-colors disabled:opacity-50"
            >
              {isFuture ? "解約予定" : "解約"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
