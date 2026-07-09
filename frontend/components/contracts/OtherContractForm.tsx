"use client";

import React, { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateContract, useUpdateContract } from "@/hooks/useContracts";
import { useGenbaList, useGenbaDetail } from "@/hooks/useGenba";
import { usePartners } from "@/hooks/usePartners";
import { Loader2 } from "lucide-react";
import type { OtherContractCreatePayload } from "@/types/contract";

// Validation schema
const otherContractSchema = z.object({
  id: z.string().optional(),
  contractName: z.string().min(1, "契約名を入力してください"),
  contractType: z.enum(["RECEIVING", "ORDERING"]),
  serviceType: z.string().min(1, "サービス種別を入力してください"),
  serviceCategory: z.literal("OTHER"),
  genbaId: z.string().min(1, "現場IDが必要です"),
  customerId: z.string().optional(),
  partnerId: z.string().optional(),
  
  startDate: z.string().min(1, "開始日を入力してください"),
  endDate: z.string().optional().nullable().transform(v => v || undefined),
  amount: z.number().min(0, "金額は0以上である必要があります"),
  taxType: z.enum(["EXCLUSIVE", "INCLUSIVE"]),
  autoRenew: z.boolean(),
  invoiceRequired: z.boolean(),
  
  workContentSummary: z.string().optional(),
  contractPdfUrl: z.string().optional(),
  
  // Other specific
  workType: z.enum(["日常清掃", "定期清掃"]),
  subServiceType: z.enum(["サポート", "急な対応"]),
  workExecutionDate: z.string().min(1, "作業実施日を入力してください"),
}).refine(data => data.contractType !== "ORDERING" || !!data.partnerId, {
  message: "協力会社を選択してください",
  path: ["partnerId"],
});

type OtherContractFormValues = z.infer<typeof otherContractSchema>;

interface OtherContractFormProps {
  genbaId?: string;
  defaultValues?: Partial<OtherContractFormValues>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const OtherContractForm: React.FC<OtherContractFormProps> = ({
  genbaId,
  defaultValues,
  onSuccess,
  onCancel,
}) => {
  const isEditMode = !!defaultValues && !!defaultValues.id;
  
  const { data: genbaData, isLoading: isLoadingGenba } = useGenbaList({ limit: 1000 });
  const { data: partnerData, isLoading: isLoadingPartners } = usePartners({ limit: 200 });

  const methods = useForm<OtherContractFormValues>({
    resolver: zodResolver(otherContractSchema),
    defaultValues: {
      contractName: "",
      contractType: "RECEIVING",
      serviceType: "その他業務",
      serviceCategory: "OTHER",
      genbaId: genbaId ?? "",
      amount: 0,
      taxType: "EXCLUSIVE",
      autoRenew: false,
      invoiceRequired: true,
      workType: "日常清掃",
      subServiceType: "サポート",
      workExecutionDate: "",
      ...defaultValues,
    },
  });

  const { mutateAsync: createContract, isPending: isCreating } = useCreateContract();
  const { mutateAsync: updateContract, isPending: isUpdating } = useUpdateContract();
  const isPending = isCreating || isUpdating;

  const [pdfHover, setPdfHover] = useState(false);
  const contractType = methods.watch("contractType");
  const watchGenbaId = methods.watch("genbaId");
  const activeGenbaId = genbaId || watchGenbaId;
  const { data: genbaDetail } = useGenbaDetail(activeGenbaId);

  const onSubmit = async (data: OtherContractFormValues) => {
    try {
      let finalData = { ...data };
      if (data.contractType === "RECEIVING" && activeGenbaId) {
        const selectedGenba = genbaData?.items.find(g => g.id === activeGenbaId) || genbaDetail;
        if (selectedGenba && selectedGenba.customer_id) {
          finalData.customerId = selectedGenba.customer_id;
        }
      }

      if (isEditMode && finalData.id) {
        await updateContract({ id: finalData.id, data: finalData as any });
      } else {
        await createContract(finalData as OtherContractCreatePayload);
      }
      onSuccess?.();
    } catch (error) {
      console.error("Failed to save contract", error);
    }
  };
  useEffect(() => {
    if (Object.keys(methods.formState.errors).length > 0) {
      console.log("OtherContractForm Validation Errors:", methods.formState.errors);
    }
  }, [methods.formState.errors]);

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8 pb-10">
        
        {/* Section 1: Basic Info */}
        <div className="space-y-4 rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm/50">
          <h2 className="text-xl font-bold border-b border-slate-100 pb-2">基本情報</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Contract Name */}
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-semibold text-slate-700">契約名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                {...methods.register("contractName")}
                placeholder="例: ザイマ関西_Amazon京田辺_その他清掃"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all"
              />
              {methods.formState.errors.contractName && (
                <p className="text-xs text-destructive">{methods.formState.errors.contractName.message}</p>
              )}
            </div>

            {/* Contract Type */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">契約種別 <span className="text-red-500">*</span></label>
              <select
                {...methods.register("contractType")}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all disabled:opacity-60"
              >
                <option value="RECEIVING">受託</option>
                <option value="ORDERING">発注</option>
              </select>
            </div>
            
            {/* Genba Selector (only if not fixed) */}
            {!genbaId && (
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-semibold text-slate-700">現場 <span className="text-red-500">*</span></label>
                <select
                  {...methods.register("genbaId")}
                  disabled={isLoadingGenba}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all disabled:opacity-60"
                >
                  <option value="">現場を選択してください</option>
                  {genbaData?.items.map((g) => (
                    <option key={g.id} value={g.id}>{g.property_name}</option>
                  ))}
                </select>
                {methods.formState.errors.genbaId && (
                  <p className="text-xs text-destructive">{methods.formState.errors.genbaId.message}</p>
                )}
              </div>
            )}
            
            {/* Partner Selector (only if ORDERING) */}
            {contractType === "ORDERING" && (
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-semibold text-slate-700">協力会社 <span className="text-red-500">*</span></label>
                <select
                  {...methods.register("partnerId")}
                  disabled={isLoadingPartners}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all disabled:opacity-60"
                >
                  <option value="">協力会社を選択してください</option>
                  {partnerData?.items.map((p) => (
                    <option key={p.id} value={p.id}>{p.company_name}</option>
                  ))}
                </select>
                {methods.formState.errors.partnerId && (
                  <p className="text-xs text-destructive">{methods.formState.errors.partnerId.message}</p>
                )}
              </div>
            )}
            
            {/* Service Type */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">サービス種別 <span className="text-red-500">*</span></label>
              <input
                type="text"
                {...methods.register("serviceType")}
                readOnly
                placeholder="例: スポット清掃"
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 text-slate-400 px-3 text-sm outline-none cursor-not-allowed select-none transition-all"
              />
              {methods.formState.errors.serviceType && (
                <p className="text-xs text-destructive">{methods.formState.errors.serviceType.message}</p>
              )}
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">開始日 <span className="text-red-500">*</span></label>
              <input
                type="date"
                {...methods.register("startDate")}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all"
              />
              {methods.formState.errors.startDate && (
                <p className="text-xs text-destructive">{methods.formState.errors.startDate.message}</p>
              )}
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">終了日</label>
              <input
                type="date"
                {...methods.register("endDate")}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all"
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">金額 <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="0"
                {...methods.register("amount", { valueAsNumber: true })}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all"
              />
              {methods.formState.errors.amount && (
                <p className="text-xs text-destructive">{methods.formState.errors.amount.message}</p>
              )}
            </div>

            {/* Tax Type */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">税区分 <span className="text-red-500">*</span></label>
              <select
                {...methods.register("taxType")}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all"
              >
                <option value="EXCLUSIVE">税抜</option>
                <option value="INCLUSIVE">税込</option>
              </select>
            </div>
            
            {/* Auto Renew & Invoice */}
            <div className="flex flex-col gap-4 sm:col-span-2 pt-2">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  {...methods.register("autoRenew")}
                  className="h-5 w-5 rounded border-gray-300"
                />
                自動更新する
              </label>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  {...methods.register("invoiceRequired")}
                  className="h-5 w-5 rounded border-gray-300"
                />
                請求書発行が必要
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: Other specifics */}
        <div className="space-y-4 rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm/50">
          <h2 className="text-xl font-bold border-b border-slate-100 pb-2">スポット作業詳細</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Work Type */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">作業種別 <span className="text-red-500">*</span></label>
              <select
                {...methods.register("workType")}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all"
              >
                <option value="日常清掃">日常清掃</option>
                <option value="定期清掃">定期清掃</option>
              </select>
              {methods.formState.errors.workType && (
                <p className="text-xs text-destructive">{methods.formState.errors.workType.message}</p>
              )}
            </div>

            {/* Sub Service Type */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">サービス区分 <span className="text-red-500">*</span></label>
              <select
                {...methods.register("subServiceType")}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all"
              >
                <option value="サポート">サポート</option>
                <option value="急な対応">急な対応</option>
              </select>
              {methods.formState.errors.subServiceType && (
                <p className="text-xs text-destructive">{methods.formState.errors.subServiceType.message}</p>
              )}
            </div>

            {/* Execution Date */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">作業実施日 <span className="text-red-500">*</span></label>
              <input
                type="date"
                {...methods.register("workExecutionDate")}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all"
              />
              {methods.formState.errors.workExecutionDate && (
                <p className="text-xs text-destructive">{methods.formState.errors.workExecutionDate.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Work Content Summary */}
        <div className="space-y-4 rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm/50">
          <h2 className="text-xl font-bold border-b border-slate-100 pb-2">作業内容</h2>
          <div className="space-y-2">
            <textarea
              {...methods.register("workContentSummary")}
              className="flex min-h-[100px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400 text-slate-800 transition-all"
              placeholder="作業内容の概要や特記事項を入力してください..."
            />
          </div>
        </div>

        {/* Section 4: PDF Upload */}
        <div className="space-y-4 rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm/50">
          <h2 className="text-xl font-bold border-b border-slate-100 pb-2">契約書ファイル (PDF)</h2>
          <div 
            className="flex flex-col items-center justify-center border border-dashed border-slate-200 bg-slate-50/40 rounded-xl p-10 cursor-not-allowed transition-colors"
            onMouseEnter={() => setPdfHover(true)}
            onMouseLeave={() => setPdfHover(false)}
          >
            <button
              type="button"
              disabled
              className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-400 cursor-not-allowed select-none transition-colors"
            >
              {pdfHover ? "S3連携準備中" : "準備中 (Coming Soon)"}
            </button>
            <p className="text-xs text-slate-400 mt-4 text-center max-w-sm leading-relaxed">
              S3ストレージのセットアップが完了するまで、PDFのアップロードは無効化されています。
            </p>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="h-[48px] sm:h-10 w-full sm:w-auto rounded-lg border border-input bg-transparent px-6 sm:px-4 text-lg sm:text-base font-semibold text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center h-[52px] sm:h-10 w-full sm:w-auto rounded-lg bg-[#1E60F2] px-6 sm:px-4 text-lg sm:text-base font-semibold text-white hover:bg-[#0F4FD0] transition-colors disabled:bg-muted disabled:text-muted-foreground disabled:opacity-50 disabled:pointer-events-none"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? "保存中..." : isEditMode ? "更新する" : "作成する"}
          </button>
        </div>
      </form>
    </FormProvider>
  );
};
