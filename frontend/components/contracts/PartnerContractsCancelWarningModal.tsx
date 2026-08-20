import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, AlertCircle } from "lucide-react";
import { useContracts } from "@/hooks/useContracts";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  partnerId?: string;
  currentContractId: string;
}

export const PartnerContractsCancelWarningModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirm,
  partnerId,
  currentContractId,
}) => {
  const { data, isLoading } = useContracts({
    partner_id: partnerId || undefined,
    limit: 100,
  }, {
    enabled: isOpen && !!partnerId
  });

  if (!isOpen) return null;

  const otherContracts = data?.items?.filter(
    (c) => c.id !== currentContractId && c.status !== "CANCELLED"
  ) || [];

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100]" />
        <Dialog.Content aria-describedby={undefined} className="fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl z-[101]">
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
            <p className="text-slate-700 text-[15px]">
              この契約を解約してもよろしいですか？
            </p>

            {isLoading ? (
              <p className="text-sm text-slate-500">データを読み込み中...</p>
            ) : otherContracts.length > 0 ? (
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-sm font-medium text-slate-700 mb-2">
                  この協力会社との他の契約一覧：
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  {otherContracts.map((c) => (
                    <li key={c.id} className="text-sm text-slate-600">
                      {c.contract_name || c.external_code || "名称未設定の契約"}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                （この協力会社との他の契約はありません）
              </p>
            )}
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="h-10 px-4 rounded-lg bg-[#F83B3B] text-white text-sm font-semibold hover:bg-[#E51E1E] transition-colors"
            >
              OK
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
