import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, AlertCircle } from "lucide-react";
import { useLinkedOrderingContracts } from "@/hooks/useContracts";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  receivingContractId: string;
}

export const LinkedContractsCancelWarningModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirm,
  receivingContractId,
}) => {
  const { data: linkedContracts, isLoading } = useLinkedOrderingContracts(receivingContractId);

  if (!isOpen) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100]" />
        <Dialog.Content aria-describedby={undefined} className="fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl z-[101]">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-[#F83B3B]" />
              関連契約の解約確認
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
            <p className="text-slate-700 text-[15px]">
              現在、この契約には協力会社との関連契約が存在します。
              <br />
              この契約を解約すると、以下の協力会社との契約も<strong>同時に解約</strong>されます。続行してもよろしいですか？
            </p>

            {isLoading ? (
              <p className="text-sm text-slate-500">データを読み込み中...</p>
            ) : (
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 max-h-48 overflow-y-auto">
                {(!linkedContracts || linkedContracts.length === 0) ? (
                  <p className="text-sm text-slate-500">関連契約がありません。</p>
                ) : (
                  <ul className="list-disc pl-5 space-y-2">
                    {linkedContracts?.map((c: any) => (
                      <li key={c.id} className="text-sm text-slate-700">
                        <strong>{c.partner_name || "協力会社未定"}</strong>: {c.contract_name || c.internal_code || "名称未設定"}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
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
              onClick={onConfirm}
              disabled={isLoading}
              className="h-10 px-4 rounded-lg bg-[#F83B3B] text-white text-sm font-semibold hover:bg-[#E51E1E] transition-colors disabled:opacity-50"
            >
              続行
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
