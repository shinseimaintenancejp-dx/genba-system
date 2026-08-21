"use client";
import { get } from "@/lib/api";

import { useQueryClient } from "@tanstack/react-query";
import React, { useState, useEffect } from "react";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateContract, useUpdateContract, useCancelContractWithLinks, useDeleteContract } from "@/hooks/useContracts";
import { useGenbaList, useGenbaDetail } from "@/hooks/useGenba";
import { usePartners } from "@/hooks/usePartners";
import { Loader2 } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useCustomers } from "@/hooks/useCustomers";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import type { OtherContractCreatePayload } from "@/types/contract";
import { ContractHistoryTimeline } from "./ContractHistoryTimeline";
import { PartnerContractsCancelWarningModal } from "./PartnerContractsCancelWarningModal";
import { LinkedContractsCancelWarningModal } from "./LinkedContractsCancelWarningModal";
import { PeriodicWorkContentEditor } from "./PeriodicWorkContentEditor";
import { LayoutList } from "lucide-react";
import { useAvailableReceivingContractsByGenba } from "@/hooks/useOrderingLinks";

// Validation schema
const otherContractSchema = z.object({
  id: z.string().optional(),
  contractName: z.string().min(1, "契約名を入力してください"),
  contractType: z.enum(["RECEIVING", "ORDERING"]),
  serviceType: z.string().min(1, "サービス種別を入力してください"),
  serviceCategory: z.literal("OTHER"),
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
  
  periodicWorkContents: z.array(z.object({
    floor: z.string().optional(),
    area: z.string().optional(),
    workContent: z.string().optional(),
    sortOrder: z.number(),
  })).optional(),
  
  // Other specific
  workType: z.enum(["日常清掃", "定期清掃"]),
  subServiceType: z.enum(["サポート", "急な対応"]),
  workExecutionDate: z.string().optional().nullable().transform(v => v || undefined),
  orderingLinks: z.array(z.object({
    receiving_contract_id: z.string(),
    assignment_type: z.enum(["FULL", "PARTIAL"]),
    work_items: z.array(z.object({
      work_content_id: z.string(),
      scope_detail: z.string().nullable(),
      allocated_amount: z.number().nullable(),
      allocated_percentage: z.number().nullable(),
    })).optional(),
  })).optional(),
}).refine(data => data.contractType !== "ORDERING" || !!data.partnerId, {
  message: "協力会社を選択してください",
  path: ["partnerId"],
}).refine(data => {
  if (data.contractType === "ORDERING" && (!data.orderingLinks || data.orderingLinks.length === 0)) {
    return false;
  }
  return true;
}, {
  message: "対象の受注契約を選択してください",
  path: ["orderingLinks"],
});

type OtherContractFormValues = z.infer<typeof otherContractSchema>;

interface OtherContractFormProps {
  genbaId?: string;
  defaultValues?: Partial<OtherContractFormValues>;
  onSuccess?: () => void;
  onCancel?: () => void;
  readOnly?: boolean;
}

export const OtherContractForm: React.FC<OtherContractFormProps> = ({
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

  const methods = useForm<OtherContractFormValues>({
    resolver: zodResolver(otherContractSchema),
    defaultValues: {
      contractName: "",
      contractType: "RECEIVING",
      serviceType: "その他業務",
      serviceCategory: "OTHER",
      genbaId: genbaId ?? "",
      amount: undefined as any,
      taxType: "EXCLUSIVE",
      autoRenew: false,
      periodicWorkContents: (defaultValues as any)?.periodic_work_contents?.map((wc: any, i: number) => ({
        floor: wc.floor || "",
        area: wc.area || "",
        workContent: wc.work_content || "",
        sortOrder: typeof wc.sort_order === "number" ? wc.sort_order : i,
      })) || [],
      invoiceRequired: true,
      workType: "日常清掃",
      subServiceType: "サポート",
      workExecutionDate: "",
      ...defaultValues,
    },
  });



  const [pdfHover, setPdfHover] = useState(false);
  const contractType = methods.watch("contractType");
  const startDate = methods.watch("startDate");
  const watchGenbaId = methods.watch("genbaId");
  const activeGenbaId = genbaId || watchGenbaId;
  const { data: genbaDetail } = useGenbaDetail(activeGenbaId);

  // =========================================================================
  // INLINE ORDERING LINK LOGIC
  // =========================================================================
  const { data: availableReceivingContracts } = useAvailableReceivingContractsByGenba(
    contractType === "ORDERING" ? activeGenbaId : ""
  );
  const otherReceivingContracts = React.useMemo(() => {
    return availableReceivingContracts?.filter(c => c.service_category === "OTHER") || [];
  }, [availableReceivingContracts]);

  const initialLink = (defaultValues as any)?.orderingLinks?.[0];
  const [selectedReceivingContractId, setSelectedReceivingContractId] = useState<string>(isEditMode && initialLink ? initialLink.receiving_contract_id : "");
  const [assignmentType, setAssignmentType] = useState<"FULL" | "PARTIAL">(isEditMode && initialLink ? initialLink.assignment_type : "FULL");
  
  // Track selected checkboxes and scope details for PARTIAL
  const [selectedItems, setSelectedItems] = useState<Record<string, { selected: boolean, scopeDetail: string }>>(() => {
    if (isEditMode && initialLink?.assignment_type === "PARTIAL") {
      const items: Record<string, { selected: boolean, scopeDetail: string }> = {};
      initialLink.work_items?.forEach((wi: any) => {
        items[wi.work_content_id] = { selected: true, scopeDetail: wi.scope_detail || "" };
      });
      return items;
    }
    return {};
  });

  const selectedReceivingContractDetail = otherReceivingContracts.find(c => c.id === selectedReceivingContractId);

  // Sync assignmentType changes if switching to FULL
  useEffect(() => {
    if (assignmentType === "FULL") {
      const rc = otherReceivingContracts.find(c => c.id === selectedReceivingContractId);
      const d = selectedReceivingContractDetail;
      const rcWorkItems = rc?.work_items || d?.work_items || [];
      const items: Record<string, { selected: boolean, scopeDetail: string }> = {};
      rcWorkItems.forEach((wi: any) => {
        items[wi.id] = { selected: true, scopeDetail: "" };
      });
      setSelectedItems(items);
    }
  }, [assignmentType, selectedReceivingContractId, otherReceivingContracts, selectedReceivingContractDetail]);

  // Update methods.setValue("orderingLinks", ...) whenever dependencies change
  useEffect(() => {
    if (contractType !== "ORDERING") {
      methods.setValue("orderingLinks", []);
      return;
    }

    if (!selectedReceivingContractId) {
      methods.setValue("orderingLinks", []);
      return;
    }

    const rc = otherReceivingContracts.find(c => c.id === selectedReceivingContractId);
    if (!rc) return; // Might not be loaded yet

    if (assignmentType === "FULL") {
      methods.setValue("orderingLinks", [{
        receiving_contract_id: selectedReceivingContractId,
        assignment_type: "FULL",
        work_items: [] // Backend ignores specific work items for FULL
      }]);
    } else {
      const workItemsPayload = Object.entries(selectedItems)
        .filter(([_, data]) => data.selected)
        .map(([wcId, data]) => ({
          work_content_id: wcId,
          scope_detail: data.scopeDetail || null,
          allocated_amount: null,
          allocated_percentage: null
        }));

      methods.setValue("orderingLinks", [{
        receiving_contract_id: selectedReceivingContractId,
        assignment_type: "PARTIAL",
        work_items: workItemsPayload
      }]);
    }
  }, [selectedReceivingContractId, assignmentType, selectedItems, contractType, methods, otherReceivingContracts, selectedReceivingContractDetail]);

  // When selectedReceivingContractId changes, auto-fill main form (create mode only)
  useEffect(() => {
    if (selectedReceivingContractDetail && !isEditMode) {
      const d = selectedReceivingContractDetail;
      
      // 1. Auto fill Contract Name
      if (!methods.getValues("contractName")) {
        methods.setValue("contractName", d.contract_name || "");
      }

      // 2. Auto fill amount (without decimal)
      if (d.amount != null && (!methods.getValues("amount") || methods.getValues("amount") === 0)) {
        methods.setValue("amount", Math.floor(Number(d.amount)));
      }

      // 3. Auto fill workType
      if (d.work_type && !methods.getValues("workType")) {
        methods.setValue("workType", d.work_type as any);
      }

      // 4. Auto fill subServiceType
      if (d.sub_service_type && !methods.getValues("subServiceType")) {
        methods.setValue("subServiceType", d.sub_service_type as any);
      }

      // 5. Auto fill workExecutionDate
      if (d.work_execution_date && !methods.getValues("workExecutionDate")) {
        methods.setValue("workExecutionDate", d.work_execution_date);
      }

      // 6. Auto fill startDate
      if (d.start_date && !methods.getValues("startDate")) {
        methods.setValue("startDate", d.start_date);
      }

      // 7. Auto fill endDate
      if (d.end_date && !methods.getValues("endDate")) {
        methods.setValue("endDate", d.end_date);
      }
    }
  }, [selectedReceivingContractDetail, isEditMode, methods]);

  const receivingContractOptions = React.useMemo(() => {
    const baseOptions = otherReceivingContracts.map(rc => ({
      value: rc.id,
      label: `${rc.internal_code || "No Code"} - ${rc.contract_name}`
    }));

    if (isEditMode && initialLink && !baseOptions.find(o => o.value === initialLink.receiving_contract_id)) {
      const d = (defaultValues as any)?.orderingLinks?.[0];
      if (d && d.receiving_contract_name) {
        return [
          { value: initialLink.receiving_contract_id, label: `${d.receiving_contract_code || "No Code"} - ${d.receiving_contract_name}` },
          ...baseOptions
        ];
      }
    }
    return baseOptions;
  }, [otherReceivingContracts, isEditMode, initialLink, defaultValues]);

  const onSubmit = async (data: OtherContractFormValues) => {
    try {
      let finalData = { ...data };
      
      // Filter out empty periodic work content rows
      if (finalData.periodicWorkContents) {
        finalData.periodicWorkContents = finalData.periodicWorkContents.filter(
          (wc) => wc.floor?.trim() || wc.area?.trim() || wc.workContent?.trim()
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
        await createContractAsync(finalData as OtherContractCreatePayload);
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


  // Restore customerId for ORDERING contracts in view/edit mode
  useEffect(() => {
    if (defaultValues?.contractType === "ORDERING" && genbaDetail?.customer_id && !methods.getValues("customerId")) {
      methods.setValue("customerId", genbaDetail.customer_id);
    }
  }, [defaultValues?.contractType, genbaDetail, methods]);

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="flex flex-col flex-1 h-full overflow-hidden">
        <Tabs.Root defaultValue="basic" className="flex flex-col flex-1 h-full overflow-hidden">
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
        
        {/* Section 1: 現場・契約連携 */}
        <div className="space-y-4 rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm/50">
          <h2 className="text-xl font-bold border-b border-slate-100 pb-2">現場・契約連携</h2>
          
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

            {/* Inline Ordering Link */}
            {contractType === "ORDERING" ? (
              <div className="space-y-4 sm:col-span-2 bg-blue-50/50 p-6 rounded-xl border border-blue-100 mt-2">
                <h3 className="text-base font-bold text-blue-900 flex items-center gap-2 border-b border-blue-200/60 pb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                  対象の受注契約と委託形式
                </h3>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">対象の受注契約 <span className="text-red-500">*</span></label>
                  <SearchableSelect
                    options={receivingContractOptions}
                    value={selectedReceivingContractId}
                    onChange={(val) => {
                      setSelectedReceivingContractId(val);
                      methods.setValue("amount", 0);
                    }}
                    disabled={!activeGenbaId || (isEditMode && !["DRAFT", "PENDING_APPROVAL"].includes((defaultValues as any)?.status)) || readOnly}
                    placeholder={activeGenbaId ? "その他の受注契約を選択してください" : "先に現場を選択してください"}
                  />
                  {!selectedReceivingContractId && (
                    <p className="text-xs text-blue-600">※受注契約を選択すると、契約内容やスケジュールが自動入力されます。</p>
                  )}
                  {methods.formState.errors.orderingLinks && (
                    <p className="text-xs font-medium text-red-500 mt-1">
                      {methods.formState.errors.orderingLinks.message as string}
                    </p>
                  )}
                </div>

                {selectedReceivingContractId && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-slate-700">委託形式 <span className="text-red-500">*</span></label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input 
                            type="radio" 
                            name="assignmentType"
                            checked={assignmentType === "FULL"}
                            onChange={() => setAssignmentType("FULL")}
                            className="w-4 h-4 text-[#1E60F2] focus:ring-[#1E60F2]"
                            disabled={readOnly}
                          />
                          全面委託 (すべて)
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input 
                            type="radio" 
                            name="assignmentType"
                            checked={assignmentType === "PARTIAL"}
                            onChange={() => setAssignmentType("PARTIAL")}
                            className="w-4 h-4 text-[#1E60F2] focus:ring-[#1E60F2]"
                            disabled={readOnly}
                          />
                          一部委託
                        </label>
                      </div>
                    </div>

                    {/* 作業内容 */}
                    {(() => {
                      const rc = otherReceivingContracts.find(c => c.id === selectedReceivingContractId);
                      const d = selectedReceivingContractDetail;
                      const rcWorkItems: any[] = rc?.work_items || d?.work_items || [];

                      return (
                        <div className="sm:col-span-2 mt-4 pt-4 border-t border-blue-200/60">
                          <h3 className="text-sm font-bold text-slate-700 mb-4 border-l-4 border-[#1E60F2] pl-2">作業内容</h3>

                          {/* Work Content Summary display from customer */}
                          {(rc?.work_content_summary || d?.work_content_summary) && (
                            <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg whitespace-pre-wrap text-sm text-slate-700">
                              {rc?.work_content_summary || d?.work_content_summary}
                            </div>
                          )}
                          {rcWorkItems.length === 0 ? (
                            <p className="text-sm text-slate-500 italic">作業項目が登録されていません。</p>
                          ) : (
                            <div className="space-y-3 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                              <div className="hidden sm:grid grid-cols-[48px_2fr_3fr_5fr] gap-3 px-1 text-xs font-semibold text-slate-500 border-b border-slate-100 pb-2">
                                <div className="text-center">操作</div>
                                <div>階数</div>
                                <div>場所・区域</div>
                                <div>作業内容</div>
                              </div>
                              
                              {rcWorkItems.map((wi: any) => {
                                const isSelected = assignmentType === "FULL" || !!selectedItems[wi.id]?.selected;
                                const isPartial = assignmentType === "PARTIAL";
                                
                                return (
                                  <div key={wi.id} className="flex flex-col sm:grid sm:grid-cols-[48px_2fr_3fr_5fr] gap-3 items-start sm:items-center py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors rounded px-1">
                                    <div className="flex items-center justify-center w-full sm:w-auto mb-2 sm:mb-0">
                                      <input 
                                        type="checkbox"
                                        checked={isSelected}
                                        disabled={!isPartial || readOnly}
                                        onChange={(e) => {
                                          setSelectedItems(prev => ({
                                            ...prev,
                                            [wi.id]: {
                                              ...prev[wi.id],
                                              selected: e.target.checked
                                            }
                                          }));
                                        }}
                                        className="w-4 h-4 text-[#1E60F2] rounded border-slate-300 focus:ring-[#1E60F2]"
                                      />
                                    </div>
                                    <div className="text-sm text-slate-700 flex items-center gap-2 sm:block w-full">
                                      <span className="sm:hidden font-semibold text-slate-500 w-16">階数:</span>
                                      {wi.floor || "-"}
                                    </div>
                                    <div className="text-sm text-slate-700 flex items-center gap-2 sm:block w-full">
                                      <span className="sm:hidden font-semibold text-slate-500 w-16">場所:</span>
                                      {wi.area || "-"}
                                    </div>
                                    <div className="text-sm text-slate-700 flex items-center gap-2 sm:block w-full">
                                      <span className="sm:hidden font-semibold text-slate-500 w-16">作業:</span>
                                      {wi.work_content || wi.workContent || "-"}
                                    </div>
                                    
                                    {isPartial && isSelected && (
                                      <div className="col-span-full mt-2 pl-[60px]">
                                        <Input
                                          placeholder="委託範囲の詳細 (任意)"
                                          value={selectedItems[wi.id]?.scopeDetail || ""}
                                          onChange={(e) => {
                                            setSelectedItems(prev => ({
                                              ...prev,
                                              [wi.id]: {
                                                ...prev[wi.id],
                                                scopeDetail: e.target.value
                                              }
                                            }));
                                          }}
                                          disabled={readOnly}
                                          className="h-8 text-sm"
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Section 2: 基本情報 (Basic Info) */}
        <div className="space-y-4 rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm/50">
          <h2 className="text-xl font-bold border-b border-slate-100 pb-2">基本情報</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            {/* Contract Name (Second) */}
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
                placeholder="例: スポット清掃"
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
                min={contractType === "ORDERING" ? selectedReceivingContractDetail?.start_date : undefined}
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
                min={startDate || (contractType === "ORDERING" ? selectedReceivingContractDetail?.start_date : undefined)}
                {...methods.register("endDate")}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all"
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">
                  {contractType === "ORDERING" ? "委託金額" : "金額"} <span className="text-red-500">*</span>
                </label>
                {contractType === "ORDERING" && (selectedReceivingContractId || initialLink?.receiving_contract_id) && (
                  <div className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-medium">
                    元請契約金額: {
                      (() => {
                        const rc = otherReceivingContracts.find(c => c.id === selectedReceivingContractId);
                        const amt = rc?.amount ?? selectedReceivingContractDetail?.amount;
                        return amt != null ? `${Math.floor(Number(amt)).toLocaleString("ja-JP")}円` : "---";
                      })()
                    }
                  </div>
                )}
              </div>
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
              {contractType === "ORDERING" && (selectedReceivingContractId || initialLink?.receiving_contract_id) && (
                (() => {
                  const rc = otherReceivingContracts.find(c => c.id === selectedReceivingContractId);
                  const rcAmt = rc?.amount ?? selectedReceivingContractDetail?.amount;
                  const currentAmt = methods.watch("amount") || 0;
                  if (rcAmt != null && currentAmt > Number(rcAmt)) {
                    return (
                      <p className="text-xs font-semibold text-red-500 mt-1">
                        ※ 委託金額が元請契約の金額を超えています。
                      </p>
                    );
                  }
                  return null;
                })()
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
              {contractType === "ORDERING" ? (
                <input
                  type="text"
                  {...methods.register("workType")}
                  readOnly
                  disabled
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none cursor-not-allowed select-none transition-all text-slate-500"
                />
              ) : (
                <select
                  {...methods.register("workType")}
                  disabled={readOnly}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all"
                >
                  <option value="日常清掃">日常清掃</option>
                  <option value="定期清掃">定期清掃</option>
                </select>
              )}
              {methods.formState.errors.workType && (
                <p className="text-xs text-destructive">{methods.formState.errors.workType.message}</p>
              )}
            </div>

            {/* Sub Service Type */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">サービス区分 <span className="text-red-500">*</span></label>
              {contractType === "ORDERING" ? (
                <input
                  type="text"
                  {...methods.register("subServiceType")}
                  readOnly
                  disabled
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none cursor-not-allowed select-none transition-all text-slate-500"
                />
              ) : (
                <select
                  {...methods.register("subServiceType")}
                  disabled={readOnly}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all"
                >
                  <option value="サポート">サポート</option>
                  <option value="急な対応">急な対応</option>
                </select>
              )}
              {methods.formState.errors.subServiceType && (
                <p className="text-xs text-destructive">{methods.formState.errors.subServiceType.message}</p>
              )}
            </div>

            {/* Execution Date */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">作業実施日</label>
              <input
                type="date"
                {...methods.register("workExecutionDate")}
                disabled={readOnly}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all"
              />
              {methods.formState.errors.workExecutionDate && (
                <p className="text-xs text-destructive">{methods.formState.errors.workExecutionDate.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Work Content Summary (Only for RECEIVING) */}
        {contractType === "RECEIVING" && (
          <div className="space-y-4 rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm/50">
            <h2 className="text-xl font-bold border-b border-slate-100 pb-2">作業内容</h2>
            <div className="space-y-2">
              <textarea
                {...methods.register("workContentSummary")}
                disabled={readOnly}
                className="flex min-h-[100px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400 text-slate-800 transition-all"
                placeholder="作業内容の概要や特記事項を入力してください..."
              />
            </div>

            <div className="pt-4 border-t border-slate-100 mt-6">
              <h3 className="text-base font-semibold text-slate-800 mb-4 inline-flex items-center gap-2">
                <LayoutList className="h-4 w-4 text-[#1E60F2]" />
                詳細な作業内容
              </h3>
              <PeriodicWorkContentEditor name="periodicWorkContents" readOnly={readOnly} />
            </div>
          </div>
        )}


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
