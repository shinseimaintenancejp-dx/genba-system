"use client";
import { get } from "@/lib/api";

import { useQueryClient } from "@tanstack/react-query";
import React, { useState, useEffect } from "react";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkSlotEditor } from "./WorkSlotEditor";
import { WorkerCountEditor } from "./WorkerCountEditor";
import { HolidayRuleEditor } from "./HolidayRuleEditor";
import { DailyWorkContentEditor } from "./DailyWorkContentEditor";
import { LayoutList } from "lucide-react";
import { useCreateContract, useUpdateContract, useCancelContractWithLinks, useDeleteContract } from "@/hooks/useContracts";
import { useGenbaList, useGenbaDetail } from "@/hooks/useGenba";
import { usePartners } from "@/hooks/usePartners";
import { Loader2 } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useCustomers } from "@/hooks/useCustomers";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { ContractHistoryTimeline } from "./ContractHistoryTimeline";
import { PartnerContractsCancelWarningModal } from "./PartnerContractsCancelWarningModal";
import { LinkedContractsCancelWarningModal } from "./LinkedContractsCancelWarningModal";
import type { DailyContractCreatePayload } from "@/types/contract";

// Validation schema
const dailyContractSchema = z.object({
  id: z.string().optional(),
  contractName: z.string().min(1, "契約名を入力してください"),
  contractType: z.enum(["RECEIVING", "ORDERING"]),
  serviceType: z.string().min(1, "サービス種別を入力してください"),
  serviceCategory: z.literal("DAILY"),
  genbaId: z.string().min(1, "現場IDが必要です"),
  customerId: z.string().min(1, "取引先を選択してください"),
  partnerId: z.string().optional(),
  
  startDate: z.string().min(1, "開始日を入力してください"),
  endDate: z.string().optional().nullable().transform(v => v || undefined),
  amount: z.number({ required_error: "金額を入力してください", invalid_type_error: "金額を入力してください" }).min(0, "金額は0以上である必要があります"),
  taxType: z.enum(["EXCLUSIVE", "INCLUSIVE"]),
  autoRenew: z.boolean(),
  invoiceRequired: z.boolean(),
  
  workContentSummary: z.string().optional(),
  contractPdfUrl: z.string().optional(),
  initialStatus: z.enum(["DRAFT", "ACTIVE"]).optional(),
  
  // Daily specific
  weeklyFrequency: z.number().min(1, "週の頻度を入力してください"),
  workDays: z.string().optional(),
  
  workSlots: z.array(z.object({
    startTime: z.string().nullable().optional(),
    endTime: z.string().nullable().optional(),
    breakMinutes: z.number().min(0, "休憩時間は0以上である必要があります"),
    workDurationHours: z.number().min(0, "実働時間は0以上である必要があります").nullable().optional(),
    sortOrder: z.number(),
  })).min(1, "少なくとも1つの時間帯を追加してください"),
  
  workerCounts: z.array(z.object({
    workerCount: z.number().min(1, "人数は1以上である必要があります"),
    workDurationHours: z.number().min(0.1, "作業時間は0より大きい必要があります"),
    totalHours: z.number(),
    sortOrder: z.number(),
  })).min(1, "少なくとも1つの作業人員を追加してください"),
  
  holidayRules: z.array(z.object({
    ruleType: z.string(),
    action: z.string(),
  })).length(4),
  
  dailyWorkContents: z.array(z.object({
    category: z.string().optional(),
    area: z.string().optional(),
    workContent: z.string().optional(),
    frequency: z.string().optional(),
    sortOrder: z.number(),
  })).optional(),
}).refine(data => data.contractType !== "ORDERING" || !!data.partnerId, {
  message: "協力会社を選択してください",
  path: ["partnerId"],
});

type DailyContractFormValues = z.infer<typeof dailyContractSchema>;

interface DailyContractFormProps {
  genbaId?: string;
  defaultValues?: Partial<DailyContractFormValues>;
  onSuccess?: () => void;
  onCancel?: () => void;
  readOnly?: boolean;
}

const WEEKDAYS = [
  { id: "月", label: "月" },
  { id: "火", label: "火" },
  { id: "水", label: "水" },
  { id: "木", label: "木" },
  { id: "金", label: "金" },
  { id: "土", label: "土" },
  { id: "日", label: "日" },
];

export const DailyContractForm: React.FC<DailyContractFormProps> = ({
  genbaId,
  defaultValues,
  onSuccess,
  onCancel,
  readOnly = false,
}) => {
  const isEditMode = !!defaultValues && !!defaultValues.id;
  
  const todayStr = new Date().toISOString().split("T")[0];
  const contractStartDate = (defaultValues as any)?.startDate || todayStr;
  const minCancelDate = contractStartDate >= todayStr ? contractStartDate : todayStr;
  
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isPartnerWarningModalOpen, setIsPartnerWarningModalOpen] = useState(false);
  const [isLinkedWarningModalOpen, setIsLinkedWarningModalOpen] = useState(false);
  const [cancelEndDate, setCancelEndDate] = useState(minCancelDate);
  const [cancelError, setCancelError] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
    const [discardError, setDiscardError] = useState("");
  const { data: genbaData, isLoading: isLoadingGenba } = useGenbaList({ limit: 1000 });
  const { data: customerData, isLoading: isLoadingCustomers } = useCustomers({ limit: 1000 });
  const { data: partnerData, isLoading: isLoadingPartners } = usePartners({ limit: 200 });

    const { mutate: createContract, mutateAsync: createContractAsync, isPending: isCreating } = useCreateContract();
  const { mutate: updateContract, mutateAsync: updateContractAsync, isPending: isUpdating } = useUpdateContract();
  const { mutateAsync: cancelWithLinksAsync, isPending: isCancellingLinks } = useCancelContractWithLinks();
  const { mutate: deleteContract, isPending: isDeleting } = useDeleteContract();
  const queryClient = useQueryClient();
  const isPending = isCreating || isUpdating || isDeleting || isCancellingLinks;

  const handleConfirmCancel = () => {
    if (!cancelEndDate) {
      setCancelError("終了日を入力してください");
      return;
    }
    if (!defaultValues?.id) return;

    setIsCancelling(true);
    setCancelError("");
    const contractType = methods.getValues("contractType") || (defaultValues as any)?.contractType;
    
    const successCb = () => {
      setIsCancelModalOpen(false);
      setIsCancelling(false);
      if (onSuccess) onSuccess();
    };
    const errorCb = (err: any) => {
      setCancelError(err?.message || "解約処理に失敗しました");
      setIsCancelling(false);
    };

    if (contractType === "RECEIVING") {
      cancelWithLinksAsync(
        { id: defaultValues.id, endDate: cancelEndDate },
        { onSuccess: successCb, onError: errorCb }
      );
    } else {
      updateContract(
        {
          id: defaultValues.id,
          data: { status: "CANCELLED", endDate: cancelEndDate } as any,
        },
        { onSuccess: successCb, onError: errorCb }
      );
    }
  };

  const handleConfirmDiscard = () => {
    if (!defaultValues?.id) return;
    setDiscardError("");
    deleteContract(defaultValues.id, {
      onSuccess: () => {
        setIsDiscardModalOpen(false);
        if (onSuccess) onSuccess();
      },
      onError: (err: any) => {
        setDiscardError(err?.message || "廃棄処理に失敗しました。");
      }
    });
  };

  const methods = useForm<DailyContractFormValues>({
    resolver: zodResolver(dailyContractSchema),
    defaultValues: {
      contractName: "",
      contractType: "RECEIVING",
      serviceType: "日常清掃",
      serviceCategory: "DAILY",
      genbaId: genbaId ?? "",
      amount: undefined as any,
      taxType: "EXCLUSIVE",
      autoRenew: true,
      invoiceRequired: true,
      workDays: "",
      workSlots: [{ startTime: "09:00", endTime: "18:00", breakMinutes: 60, sortOrder: 0 }],
      workerCounts: [{ workerCount: 1, workDurationHours: 8, totalHours: 8, sortOrder: 0 }],
      holidayRules: [],
      dailyWorkContents: (defaultValues as any)?.daily_work_contents?.map((wc: any, i: number) => ({
        category: wc.category || "",
        area: wc.area || "",
        workContent: wc.work_content || "",
        frequency: wc.frequency || "",
        sortOrder: typeof wc.sort_order === "number" ? wc.sort_order : i,
      })) || [],
      ...defaultValues,
    },
  });

      const [pdfHover, setPdfHover] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const contractType = methods.watch("contractType");
  const startDate = methods.watch("startDate");
  const watchGenbaId = methods.watch("genbaId");
  const activeGenbaId = genbaId || watchGenbaId;
  const { data: genbaDetail } = useGenbaDetail(activeGenbaId);

  const onSubmit = async (data: DailyContractFormValues) => {
    try {
      let finalData = { ...data };
      
      // Filter out empty daily work content rows
      if (finalData.dailyWorkContents) {
        finalData.dailyWorkContents = finalData.dailyWorkContents.filter(
          (wc) => wc.category?.trim() || wc.area?.trim() || wc.workContent?.trim()
        );
      }
      
      if (data.contractType === "RECEIVING" && activeGenbaId) {
        const selectedGenba = genbaData?.items.find(g => g.id === activeGenbaId) || genbaDetail;
        if (selectedGenba && selectedGenba.customer_id) {
          finalData.customerId = selectedGenba.customer_id;
        }
      }

      if (isEditMode && finalData.id) {
        await updateContractAsync({ id: finalData.id, data: finalData as any });
      } else {
        await createContractAsync(finalData as DailyContractCreatePayload);
      }
      onSuccess?.();
    } catch (error) {
      console.error("Failed to save contract", error);
    }
  };
  useEffect(() => {
    if (Object.keys(methods.formState.errors).length > 0) {
      console.log("DailyContractForm Validation Errors:", methods.formState.errors);
    }
  }, [methods.formState.errors]);


  // Restore customerId for ORDERING contracts in view/edit mode
  useEffect(() => {
    if (defaultValues?.contractType === "ORDERING" && genbaDetail?.customer_id && !methods.getValues("customerId")) {
      methods.setValue("customerId", genbaDetail.customer_id);
    }
  }, [defaultValues?.contractType, genbaDetail, methods]);

  // Reset to 基本情報 tab whenever the user switches from view-only → edit mode
  React.useEffect(() => {
    if (!readOnly) {
      setActiveTab("basic");
    }
  }, [readOnly]);

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="flex flex-col flex-1 h-full overflow-hidden">
        <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 h-full overflow-hidden">
          <div className="px-6 pt-4 border-b border-slate-200 shrink-0 bg-slate-50">
            <Tabs.List className="flex gap-6">
              <Tabs.Trigger
                value="basic"
                className="pb-3 text-sm font-semibold text-slate-500 border-b-2 border-transparent data-[state=active]:border-[#1E60F2] data-[state=active]:text-[#1E60F2] transition-colors"
              >
                基本情報
              </Tabs.Trigger>
              {isEditMode && (defaultValues as any)?.status !== "DRAFT" && (
                <Tabs.Trigger
                  value="history"
                  className="pb-3 text-sm font-semibold text-slate-500 border-b-2 border-transparent data-[state=active]:border-[#1E60F2] data-[state=active]:text-[#1E60F2] transition-colors"
                >
                  変更履歴
                </Tabs.Trigger>
              )}
            </Tabs.List>
          </div>
          
          <Tabs.Content value="basic" className="flex-1 overflow-y-auto p-6 space-y-8 outline-none">
            <fieldset disabled={readOnly} className="space-y-8 disabled:opacity-90">
        
        {/* Section 1: Basic Info */}
        <div className="space-y-4 rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm/50">
          <h2 className="text-xl font-bold border-b border-slate-100 pb-2">基本情報</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Customer Field */}
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-semibold text-slate-700">取引先 <span className="text-red-500">*</span></label>
              <Controller
                name="customerId"
                control={methods.control}
                render={({ field }) => (
                  <SearchableSelect
                    options={customerData?.items.map(c => ({ value: c.id, label: c.short_name })) || []}
                    value={field.value}
                    onChange={(val) => {
                      field.onChange(val);
                      methods.setValue("genbaId", ""); // Reset genba when customer changes
                    }}
                    placeholder="取引先を選択..."
                    disabled={isLoadingCustomers || readOnly || (isEditMode && !["DRAFT", "PENDING_APPROVAL"].includes((defaultValues as any)?.status)) || !!genbaId}
                  />
                )}
              />
              {methods.formState.errors.customerId && (
                <p className="text-xs text-red-500">{methods.formState.errors.customerId.message}</p>
              )}
            </div>

            {/* Genba Field */}
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-semibold text-slate-700">現場 <span className="text-red-500">*</span></label>
              {genbaId || readOnly ? (
                <input
                  type="text"
                  value={
                    genbaDetail?.property_name ||
                    genbaData?.items.find((g) => g.id === activeGenbaId)?.property_name ||
                    (defaultValues as any)?.genba_name ||
                    (defaultValues as any)?.genbaName ||
                    ""
                  }
                  readOnly
                  disabled
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none"
                />
              ) : (
                <>
                  <Controller
                    name="genbaId"
                    control={methods.control}
                    render={({ field }) => (
                      <SearchableSelect
                        options={methods.watch("customerId") ? (genbaData?.items || []).filter(g => g.customer_id === methods.watch("customerId")).map(g => ({ label: g.property_name, value: g.id })) : []}
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isLoadingGenba || readOnly || (isEditMode && !["DRAFT", "PENDING_APPROVAL"].includes((defaultValues as any)?.status)) || !methods.watch("customerId")}
                        placeholder={methods.watch("customerId") ? "現場を選択してください" : "先に取引先を選択してください"}
                        error={!!methods.formState.errors.genbaId}
                      />
                    )}
                  />
                  {methods.formState.errors.genbaId && (
                    <p className="text-xs text-red-500">{methods.formState.errors.genbaId.message}</p>
                  )}
                </>
              )}
            </div>

            {/* Contract Name (Second) */}
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-semibold text-slate-700">契約名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                {...methods.register("contractName")}
                placeholder="例: ザイマ関西_Amazon京田辺_日常清掃"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all"
              />
              {methods.formState.errors.contractName && (
                <p className="text-xs text-destructive">{methods.formState.errors.contractName.message}</p>
              )}
            </div>

            {/* Contract Type */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">契約種別 <span className="text-red-500">*</span></label>
              <input type="hidden" {...methods.register("contractType")} />
              <input
                type="text"
                value={methods.watch("contractType") === "RECEIVING" ? "受託" : methods.watch("contractType") === "ORDERING" ? "発注" : ""}
                readOnly
                disabled
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none cursor-not-allowed select-none transition-all text-slate-500"
              />
            </div>

            {/* Service Type */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">サービス種別 <span className="text-red-500">*</span></label>
              <input
                type="text"
                {...methods.register("serviceType")}
                readOnly
                placeholder="例: 日常清掃"
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 text-slate-400 px-3 text-sm outline-none cursor-not-allowed select-none transition-all"
              />
              {methods.formState.errors.serviceType && (
                <p className="text-xs text-destructive">{methods.formState.errors.serviceType.message}</p>
              )}
            </div>

            {/* Partner Selector (only if ORDERING) */}
            {contractType === "ORDERING" && (
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-semibold text-slate-700">協力会社 <span className="text-red-500">*</span></label>
                <select
                  {...methods.register("partnerId")}
                  disabled={isLoadingPartners || readOnly}
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
                min={startDate || undefined}
                {...methods.register("endDate")}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all"
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">金額 <span className="text-red-500">*</span></label>
              <Controller
                name="amount"
                control={methods.control}
                render={({ field: { onChange, value, ref } }) => (
                  <div className="relative">
                    <input
                      type="text"
                      ref={ref}
                      placeholder="0"
                      disabled={readOnly}
                      value={typeof value === 'number' && !isNaN(value) ? value.toLocaleString("ja-JP") : (value ?? "")}
                      onChange={(e) => {
                        const raw = e.target.value
                          .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
                          .replace(/[^0-9]/g, '');
                        onChange(raw === '' ? undefined : Number(raw));
                      }}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all text-right placeholder:text-slate-400"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium">円</span>
                  </div>
                )}
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

        {/* Section 5: Work Content Summary */}
        <div className="space-y-4 rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm/50">
          <h2 className="text-xl font-bold border-b border-slate-100 pb-2">作業内容</h2>
          <div className="space-y-2">
            <textarea
              {...methods.register("workContentSummary")}
              className="flex min-h-[100px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400 text-slate-800 transition-all"
              placeholder="作業内容の概要を入力してください..."
            />
          </div>
          
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-base font-semibold text-slate-800 mb-4 inline-flex items-center gap-2">
              <LayoutList className="h-4 w-4 text-[#1E60F2]" />
              詳細な作業内容
            </h3>
            <DailyWorkContentEditor name="dailyWorkContents" readOnly={readOnly} />
          </div>
        </div>

        
        {/* Section 1.5: Schedule Info */}
        <div className="space-y-4 rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm/50">
          <h2 className="text-xl font-bold border-b border-slate-100 pb-2">スケジュール情報</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Work Days (Multi-select) */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">作業日（曜日）</label>
              <Controller
                control={methods.control}
                name="workDays"
                render={({ field }) => {
                  const selectedDays = field.value ? field.value.split(",").filter(Boolean) : [];
                  
                  const toggleDay = (day: string) => {
                    const newSelected = selectedDays.includes(day)
                      ? selectedDays.filter((d) => d !== day)
                      : [...selectedDays, day];
                    
                    const sorted = WEEKDAYS.filter(w => newSelected.includes(w.id)).map(w => w.id);
                    field.onChange(sorted.join(","));
                    // Auto-update weekly frequency based on selection
                    if (newSelected.length > 0) {
                      methods.setValue("weeklyFrequency", newSelected.length, { shouldValidate: true });
                    }
                  };

                  return (
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAYS.map((day) => {
                        const isSelected = selectedDays.includes(day.id);
                        return (
                          <button
                            key={day.id}
                            type="button"
                            onClick={() => toggleDay(day.id)}
                            className={`h-10 w-10 rounded-full border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              isSelected
                                ? "bg-[#1E60F2] text-white border-[#1E60F2]"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  );
                }}
              />
              {methods.formState.errors.workDays && (
                <p className="text-xs text-red-500">{methods.formState.errors.workDays.message}</p>
              )}
            </div>

            {/* Weekly Frequency */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">週の頻度 (回/週) <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="1"
                max="7"
                {...methods.register("weeklyFrequency", { valueAsNumber: true })}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all max-w-[200px]"
              />
              {methods.formState.errors.weeklyFrequency && (
                <p className="text-xs text-red-500">{methods.formState.errors.weeklyFrequency.message}</p>
              )}
            </div>
            
          </div>
        </div>

        {/* Section 2: Work Slots */}
        <div className="space-y-4 rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm/50">
          <h2 className="text-xl font-bold border-b border-slate-100 pb-2">作業時間帯 <span className="text-destructive">*</span></h2>
          <WorkSlotEditor name="workSlots" />
        </div>

        {/* Section 3: Worker Counts */}
        <div className="space-y-4 rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm/50">
          <h2 className="text-xl font-bold border-b border-slate-100 pb-2">作業人員 <span className="text-destructive">*</span></h2>
          <WorkerCountEditor name="workerCounts" />
        </div>

        {/* Section 4: Holiday Rules */}
        <div className="space-y-4 rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm/50">
          <h2 className="text-xl font-bold border-b border-slate-100 pb-2">休日規定 <span className="text-destructive">*</span></h2>
          <HolidayRuleEditor name="holidayRules" />
        </div>

        {/* Section 6: PDF Upload */}
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
        </fieldset>
        </Tabs.Content>

        {isEditMode && (defaultValues as any)?.status !== "DRAFT" && (
          <Tabs.Content value="history" className="flex-1 overflow-y-auto outline-none p-6 bg-slate-50/50">
            <ContractHistoryTimeline contractId={defaultValues?.id as string} />
          </Tabs.Content>
        )}
        </Tabs.Root>

        {/* Anchored Sticky Footer */}
        <div className="shrink-0 p-4 sm:px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between z-10">
          {readOnly ? (
            <div className="flex justify-end w-full">
              <button
                type="button"
                onClick={onCancel}
                className="h-10 rounded-lg border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
              >
                閉じる
              </button>
            </div>
          ) : (
            <>
              <div>
                {isEditMode && ["ACTIVE", "EXPIRED", "CANCELLED"].includes((defaultValues as any)?.status) && (
                  <button
                    type="button"
                    onClick={async () => {
                      const contractType = methods.getValues("contractType") || (defaultValues as any)?.contractType;
                      const hasPartner = methods.getValues("partnerId") || (defaultValues as any)?.partnerId;
                      const currentId = (defaultValues as any)?.id;
                      
                      if (contractType === "RECEIVING" && currentId) {
                        setIsCheckingLinks(true);
                        try {
                          const linked = await queryClient.fetchQuery({
                            queryKey: ["contracts", "linked", currentId],
                            queryFn: () => get<any[]>(`/contracts/${currentId}/linked-ordering-contracts`),
                          });
                          if (linked && linked.length > 0) {
                            setIsLinkedWarningModalOpen(true);
                          } else {
                            setIsCancelModalOpen(true);
                          }
                        } catch (error) {
                          setIsCancelModalOpen(true);
                        } finally {
                          setIsCheckingLinks(false);
                        }
                      } else if (hasPartner) {
                        setIsPartnerWarningModalOpen(true);
                      } else {
                        setIsCancelModalOpen(true);
                      }
                    }}
                    disabled={isPending || isCancelling || isCheckingLinks || (defaultValues as any)?.status === "CANCELLED"}
                    className="inline-flex items-center justify-center h-[52px] sm:h-10 w-full sm:w-auto px-6 sm:px-4 rounded-lg bg-[#F83B3B] text-white hover:bg-[#E51E1E] text-lg sm:text-base font-semibold transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {(defaultValues as any)?.status === "CANCELLED" ? "解約済" : isCheckingLinks ? "確認中..." : "解約"}
                  </button>
                )}
                {isEditMode && ["DRAFT", "PENDING_APPROVAL"].includes((defaultValues as any)?.status) && (
                  <button
                    type="button"
                    onClick={() => setIsDiscardModalOpen(true)}
                    disabled={isPending || isDeleting}
                    className="inline-flex items-center justify-center h-[52px] sm:h-10 w-full sm:w-auto px-6 sm:px-4 rounded-lg bg-[#F83B3B] text-white hover:bg-[#E51E1E] text-lg sm:text-base font-semibold transition-colors disabled:opacity-50 shadow-sm"
                  >
                    廃棄
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isPending}
                  className="h-[52px] sm:h-10 w-full sm:w-auto rounded-lg border border-slate-200 bg-white px-6 sm:px-4 text-lg sm:text-base font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:pointer-events-none shadow-sm"
                >
                  キャンセル
                </button>
                {(!isEditMode || (defaultValues as any)?.status === "DRAFT") && (
                  <button
                    type="button"
                    onClick={() => {
                      methods.setValue("initialStatus", "DRAFT");
                      methods.handleSubmit(onSubmit)();
                    }}
                    disabled={isPending}
                    className="inline-flex items-center justify-center h-[52px] sm:h-10 w-full sm:w-auto rounded-lg bg-[#5cb85c] px-6 sm:px-4 text-lg sm:text-base font-semibold text-white hover:bg-[#4cae4c] transition-colors disabled:opacity-50 disabled:pointer-events-none shadow-sm"
                  >
                    {isPending && methods.getValues("initialStatus") === "DRAFT" && <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-500" />}
                    下書き
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    methods.setValue("initialStatus", "ACTIVE");
                    methods.handleSubmit(onSubmit)();
                  }}
                  disabled={isPending}
                  className="inline-flex items-center justify-center h-[52px] sm:h-10 w-full sm:w-auto rounded-lg bg-[#1E60F2] px-6 sm:px-4 text-lg sm:text-base font-semibold text-white hover:bg-[#0F4FD0] transition-colors disabled:bg-muted disabled:text-muted-foreground disabled:opacity-50 disabled:pointer-events-none shadow-sm"
                >
                  {isPending && methods.getValues("initialStatus") !== "DRAFT" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isPending && methods.getValues("initialStatus") !== "DRAFT" ? "保存中..." : isEditMode && (defaultValues as any)?.status !== "DRAFT" ? "更新" : "登録"}
                </button>
              </div>
            </>
          )}
        </div>
      </form>

      
      {/* Linked Contracts Warning Modal */}
      <LinkedContractsCancelWarningModal
        isOpen={isLinkedWarningModalOpen}
        onClose={() => setIsLinkedWarningModalOpen(false)}
        onConfirm={() => {
          setIsLinkedWarningModalOpen(false);
          setIsCancelModalOpen(true);
        }}
        receivingContractId={(defaultValues as any)?.id}
      />

      {/* Partner Contracts Warning Modal */}
      <PartnerContractsCancelWarningModal
        isOpen={isPartnerWarningModalOpen}
        onClose={() => setIsPartnerWarningModalOpen(false)}
        onConfirm={() => {
          setIsPartnerWarningModalOpen(false);
          setIsCancelModalOpen(true);
        }}
        partnerId={(defaultValues as any)?.partnerId}
        currentContractId={(defaultValues as any)?.id}
      />

      {/* Cancel Contract Confirmation Dialog */}
      <Dialog.Root open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[95vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-white shadow-2xl p-6">
            <Dialog.Title className="text-xl font-bold text-slate-900 mb-2">
              契約の解約手続き
            </Dialog.Title>
            <Dialog.Description className="text-sm text-slate-600 mb-4">
              この契約を「解約」状態に変更します。終了日（解約日）を入力してください。
            </Dialog.Description>

            <div className="space-y-2 mb-6">
              <label className="block text-sm font-semibold text-slate-700">
                終了日（解約日） <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                min={minCancelDate}
                value={cancelEndDate}
                onChange={(e) => {
                  setCancelEndDate(e.target.value);
                  setCancelError("");
                }}
                className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
              />
              {cancelError && <p className="text-xs text-red-500 font-medium">{cancelError}</p>}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={isCancelling}
                className="h-[52px] sm:h-10 rounded-lg border border-slate-200 bg-white px-4 text-base sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="inline-flex items-center justify-center gap-2 h-[52px] sm:h-10 rounded-lg bg-[#F83B3B] px-4 text-base sm:text-sm font-medium text-white hover:bg-[#E51E1E] disabled:opacity-60 transition-colors shadow-sm"
              >
                {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>{isCancelling ? "処理中..." : "解約確定"}</span>
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Discard Draft Confirmation Dialog */}
      <Dialog.Root open={isDiscardModalOpen} onOpenChange={setIsDiscardModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[95vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-white shadow-2xl p-6">
            <Dialog.Title className="text-xl font-bold text-slate-900 mb-2">
              契約の廃棄
            </Dialog.Title>
            <Dialog.Description className="text-sm text-slate-600 mb-6">
              この契約データを完全に削除（廃棄）しますか？この操作は取り消せません。
            </Dialog.Description>

            {discardError && (
              <div className="mb-4 rounded-md bg-red-50 p-3">
                <p className="text-sm font-medium text-red-800">{discardError}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDiscardModalOpen(false)}
                disabled={isDeleting}
                className="h-[52px] sm:h-10 rounded-lg border border-slate-200 bg-white px-4 text-base sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscard}
                disabled={isDeleting}
                className="inline-flex items-center justify-center gap-2 h-[52px] sm:h-10 rounded-lg bg-[#F83B3B] px-4 text-base sm:text-sm font-medium text-white hover:bg-[#E51E1E] disabled:opacity-60 transition-colors shadow-sm"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>{isDeleting ? "処理中..." : "廃棄確定"}</span>
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>


    </FormProvider>
  );
};
