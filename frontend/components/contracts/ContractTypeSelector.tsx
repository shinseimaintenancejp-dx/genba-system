import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Sun, Repeat, MoreHorizontal } from "lucide-react";

interface ContractTypeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: "DAILY" | "PERIODIC" | "OTHER") => void;
  excludeDaily?: boolean;
}

export const ContractTypeSelector: React.FC<ContractTypeSelectorProps> = ({
  open,
  onOpenChange,
  onSelect,
  excludeDaily = false,
}) => {
  const handleSelect = (type: "DAILY" | "PERIODIC" | "OTHER") => {
    onSelect(type);
    onOpenChange(false); // Close dialog upon selection
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl focus:outline-none animate-in fade-in-50 zoom-in-95">
          <div className="flex items-start justify-between mb-4">
            <Dialog.Title className="text-lg font-bold text-slate-900">
              契約種別の選択
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors">
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Description className="text-sm text-slate-500 mb-6 leading-relaxed">
            新しく作成する契約の種別を選択してください
          </Dialog.Description>
          
          <div className="grid gap-4">
            {/* DAILY */}
            {!excludeDaily && (
            <button
              type="button"
              onClick={() => handleSelect("DAILY")}
              className="flex flex-col sm:flex-row items-center sm:items-start gap-4 rounded-xl border border-slate-200/60 bg-white p-5 text-left transition-all hover:border-blue-400 hover:shadow-md hover:bg-blue-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 group min-h-[52px]"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 group-hover:scale-105 transition-transform duration-300 shadow-sm">
                <Sun className="h-7 w-7" />
              </div>
              <div className="flex-1 text-center sm:text-left mt-2 sm:mt-0">
                <h3 className="font-bold text-lg text-slate-800 group-hover:text-blue-700 transition-colors">日常清掃 (DAILY)</h3>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                  毎日や週数回など、高頻度で継続的に実施する定常的な清掃業務（例：オフィス日常清掃、巡回清掃など）
                </p>
              </div>
            </button>
            )}

            {/* PERIODIC */}
            <button
              type="button"
              onClick={() => handleSelect("PERIODIC")}
              className="flex flex-col sm:flex-row items-center sm:items-start gap-4 rounded-xl border border-slate-200/60 bg-white p-5 text-left transition-all hover:border-emerald-400 hover:shadow-md hover:bg-emerald-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 group min-h-[52px]"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 group-hover:scale-105 transition-transform duration-300 shadow-sm">
                <Repeat className="h-7 w-7" />
              </div>
              <div className="flex-1 text-center sm:text-left mt-2 sm:mt-0">
                <h3 className="font-bold text-lg text-slate-800 group-hover:text-emerald-700 transition-colors">定期清掃 (PERIODIC)</h3>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                  月に数回や年に数回など、定期的なスケジュールで実施する清掃業務（例：床面ワックス掛け、ガラス清掃など）
                </p>
              </div>
            </button>

            {/* OTHER */}
            <button
              type="button"
              onClick={() => handleSelect("OTHER")}
              className="flex flex-col sm:flex-row items-center sm:items-start gap-4 rounded-xl border border-slate-200/60 bg-white p-5 text-left transition-all hover:border-amber-400 hover:shadow-md hover:bg-amber-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 group min-h-[52px]"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 group-hover:scale-105 transition-transform duration-300 shadow-sm">
                <MoreHorizontal className="h-7 w-7" />
              </div>
              <div className="flex-1 text-center sm:text-left mt-2 sm:mt-0">
                <h3 className="font-bold text-lg text-slate-800 group-hover:text-amber-700 transition-colors">その他 (OTHER)</h3>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                  スポット清掃や特別清掃、害虫駆除など、上記に該当しない単発・特殊業務
                </p>
              </div>
            </button>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-[48px] sm:h-10 w-full sm:w-auto rounded-lg border border-slate-200 bg-white px-6 sm:px-4 text-base sm:text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
            >
              閉じる
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
