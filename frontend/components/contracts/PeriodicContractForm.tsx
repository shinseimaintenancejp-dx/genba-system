"use client";
import { get } from "@/lib/api";

import { useQueryClient } from "@tanstack/react-query";
import React, { useState, useEffect } from "react";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PeriodicScheduleEditor } from "./PeriodicScheduleEditor";
import { HolidayRuleEditor } from "./HolidayRuleEditor";
import { PeriodicWorkContentEditor } from "./PeriodicWorkContentEditor";
import { useCreateContract, useUpdateContract, useCancelContractWithLinks, useContractDetail, useDeleteContract } from "@/hooks/useContracts";
import { useGenbaList, useGenbaDetail } from "@/hooks/useGenba";
import { usePartners } from "@/hooks/usePartners";
import { useAvailableReceivingContractsByGenba } from "@/hooks/useOrderingLinks";
import { Loader2 } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import type { PeriodicContractCreatePayload } from "@/types/contract";
import { OrderingLinksManager } from "./OrderingLinksManager";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useCustomers } from "@/hooks/useCustomers";
import * as Tabs from "@radix-ui/react-tabs";
import { ContractHistoryTimeline } from "./ContractHistoryTimeline";
import { PartnerContractsCancelWarningModal } from "./PartnerContractsCancelWarningModal";
import { LinkedContractsCancelWarningModal } from "./LinkedContractsCancelWarningModal";

// Validation schema
const periodicContractSchema = z.object({
  id: z.string().optional(),
  contractName: z.string().min(1, "契約名を入力してください"),
  contractType: z.enum(["RECEIVING", "ORDERING"]),
  serviceType: z.string().min(1, "サービス種別を入力してください"),
  serviceCategory: z.literal("PERIODIC"),
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
  
  // Periodic specific
  periodicSchedule: z.object({
    frequencyPerYear: z.number({ invalid_type_error: "数値を入力してください" }).min(1, "作業回数は1以上である必要があります"),
    workMonths: z.array(z.number()).min(1, "少なくとも1つの月を選択してください"),
    workDays: z.array(z.number()), // Option: might be empty if variable
  }),
  
  periodicWorkContents: z.array(z.object({
    id: z.string().optional(),
    floor: z.string().min(1, "階数を入力してください"),
    area: z.string().min(1, "場所・区域を選択してください"),
    workContent: z.string().min(1, "作業内容を選択してください"),
    sortOrder: z.number(),
  })).optional(),
  
  holidayRules: z.array(z.object({
    ruleType: z.string(),
    action: z.string(),
  })).length(4),
  
  orderingLinks: z.array(z.any()).optional(),
}).refine(data => data.contractType !== "ORDERING" || !!data.partnerId, {
  message: "協力会社を選択してください",
  path: ["partnerId"],
}).refine(data => data.contractType !== "ORDERING" || (data.orderingLinks && data.orderingLinks.length > 0 && !!data.orderingLinks[0].receiving_contract_id), {
  message: "対象の受注契約を選択してください",
  path: ["orderingLinks"],
});

type PeriodicContractFormValues = z.infer<typeof periodicContractSchema>;

interface PeriodicContractFormProps {
  genbaId?: string;
  defaultValues?: Partial<PeriodicContractFormValues>;
  onSuccess?: () => void;
  onCancel?: () => void;
  readOnly?: boolean;
}

export const PeriodicContractForm: React.FC<PeriodicContractFormProps> = ({
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
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [discardError, setDiscardError] = useState("");
  const [cancelEndDate, setCancelEndDate] = useState<string>(minCancelDate);
  const [cancelError, setCancelError] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  const { data: customerData, isLoading: isLoadingCustomers } = useCustomers({ limit: 500, is_active: true });
  // Add selected customer filter if selected, otherwise pass nothing
  const { data: genbaData, isLoading: isLoadingGenba } = useGenbaList({ limit: 1000, customer_id: selectedCustomerId || undefined });
  const { data: partnerData, isLoading: isLoadingPartners } = usePartners({ limit: 200 });

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

  const methods = useForm<PeriodicContractFormValues>({
    resolver: zodResolver(periodicContractSchema),
    defaultValues: {
      contractName: "",
      contractType: "RECEIVING",
      serviceType: "定期清掃",
      serviceCategory: "PERIODIC",
      genbaId: genbaId ?? "",
      customerId: defaultValues?.customerId ?? "",
      amount: undefined as any,
      taxType: "EXCLUSIVE",
      autoRenew: true,
      invoiceRequired: true,
      periodicSchedule: {
        frequencyPerYear: 1,
        workMonths: [],
        workDays: [],
      },
      periodicWorkContents: [{ floor: "", area: "", workContent: "", sortOrder: 0 }],
      holidayRules: [],
      orderingLinks: [],
      ...defaultValues,
    },
  });

  const previousValuesRef = React.useRef<string>("");

  // Re-initialize form when contract detail data arrives (e.g. orderingLinks, workSlots)
  useEffect(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0) {
      const stringified = JSON.stringify(defaultValues);
      if (previousValuesRef.current !== stringified) {
        previousValuesRef.current = stringified;
        const cleanDefaultValues = Object.fromEntries(
          Object.entries(defaultValues).filter(([_, v]) => v !== undefined)
        );
        methods.reset({
          ...methods.getValues(),
          ...cleanDefaultValues,
        });
      }
    }
  }, [defaultValues, methods]);

  const { mutate: createContract, isPending: isCreating } = useCreateContract();
  const { mutate: updateContract, isPending: isUpdating } = useUpdateContract();
  const { mutateAsync: cancelWithLinksAsync, isPending: isCancellingLinks } = useCancelContractWithLinks();
  const { mutate: deleteContract, isPending: isDeleting } = useDeleteContract();
  const queryClient = useQueryClient();
  const isPending = isCreating || isUpdating || isDeleting || isCancellingLinks;

  const [pdfHover, setPdfHover] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
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
  const teikiReceivingContracts = React.useMemo(() => {
    return availableReceivingContracts?.filter(c => c.service_category === "PERIODIC") || [];
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

  // Sync initial link when defaultValues arrive or change in edit mode
  useEffect(() => {
    if (isEditMode && initialLink) {
      if (initialLink.receiving_contract_id && !selectedReceivingContractId) {
        setSelectedReceivingContractId(initialLink.receiving_contract_id);
      }
      if (initialLink.assignment_type) {
        setAssignmentType(initialLink.assignment_type);
      }
      if (initialLink.assignment_type === "PARTIAL" && initialLink.work_items && Object.keys(selectedItems).length === 0) {
        const items: Record<string, { selected: boolean, scopeDetail: string }> = {};
        initialLink.work_items.forEach((wi: any) => {
          items[wi.work_content_id] = { selected: true, scopeDetail: wi.scope_detail || "" };
        });
        setSelectedItems(items);
      }
    }
  }, [isEditMode, initialLink]);

  const { data: selectedReceivingContractDetail } = useContractDetail(selectedReceivingContractId);

  // Build the options list for the receiving contract selector.
  // In edit mode, teikiReceivingContracts may still be loading, so we inject
  // a fallback option from initialLink so the label always shows correctly.
  const receivingContractOptions = React.useMemo(() => {
    const baseOptions = teikiReceivingContracts.map(rc => ({
      label: `${rc.contract_name} - ${Math.floor(rc.amount || 0).toLocaleString()}円`,
      value: rc.id,
    }));

    // If we are in edit mode and the initialLink contract is not yet in baseOptions, add it.
    if (
      isEditMode &&
      initialLink?.receiving_contract_id &&
      !baseOptions.some(o => o.value === initialLink.receiving_contract_id)
    ) {
      const fallbackLabel = initialLink.receiving_contract_name
        ? initialLink.receiving_contract_name
        : selectedReceivingContractDetail?.contract_name ||
          selectedReceivingContractDetail?.service_type ||
          `契約ID: ${initialLink.receiving_contract_id.slice(0, 8)}...`;

      const fallbackAmount =
        initialLink.allocated_amount != null
          ? Math.floor(Number(initialLink.allocated_amount)).toLocaleString()
          : selectedReceivingContractDetail?.amount != null
          ? Math.floor(Number(selectedReceivingContractDetail.amount)).toLocaleString()
          : null;

      baseOptions.unshift({
        label: fallbackAmount ? `${fallbackLabel} - ${fallbackAmount}円` : fallbackLabel,
        value: initialLink.receiving_contract_id,
      });
    }

    return baseOptions;
  }, [teikiReceivingContracts, isEditMode, initialLink, selectedReceivingContractDetail]);

  // When genba changes, reset linkage
  useEffect(() => {
    if (!isEditMode) {
      setSelectedReceivingContractId("");
      setAssignmentType("FULL");
      setSelectedItems({});
    }
  }, [activeGenbaId, isEditMode]);

  // When selectedReceivingContractId changes, auto-fill main form (create mode only)
  useEffect(() => {
    if (selectedReceivingContractDetail && !isEditMode) {
      const d = selectedReceivingContractDetail;
      // 1. Auto fill Contract Name
      if (!methods.getValues("contractName")) {
        methods.setValue("contractName", d.contract_name || d.service_type || "");
      }
      
      // 2. Auto fill schedule
      if (d.periodic_schedule) {
        methods.setValue("periodicSchedule", {
          frequencyPerYear: d.periodic_schedule.frequency_per_year,
          workMonths: d.periodic_schedule.work_months,
          workDays: d.periodic_schedule.work_days || [],
        });
      }

      // 3. Auto fill holiday rules
      if (d.holiday_rules && d.holiday_rules.length > 0) {
        methods.setValue(
          "holidayRules",
          d.holiday_rules.map(hr => ({
            ruleType: hr.rule_type,
            action: hr.action,
          }))
        );
      }

      // 4. Auto fill remarks
      if (d.work_content_summary) {
        methods.setValue("workContentSummary", d.work_content_summary);
      }

      // 5. Auto fill amount (without decimal)
      if (d.amount != null && (!methods.getValues("amount") || methods.getValues("amount") === 0)) {
        methods.setValue("amount", Math.floor(Number(d.amount)));
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

  // =========================================================================
  // BREAK INFINITE LOOP: Use isProgrammaticUpdate ref to prevent circular
  // useEffect triggers between periodicWorkContents ↔ assignmentType.
  // =========================================================================
  const isProgrammaticUpdate = React.useRef(false);
  const isInitialSyncDone = React.useRef(false);

  // Watch work contents from Section 2 (作業内容) for auto-switch logic
  const watchedWorkContents = methods.watch("periodicWorkContents");
  const prevWorkContentsLength = React.useRef((watchedWorkContents || []).length);

  // -------------------------------------------------------------------------
  // Auto switch 委託形式: FULL <-> PARTIAL
  // Only fires when the user manually adds/removes items in Section 2.
  // Skips when the change was programmatic (from sync useEffect below).
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (contractType !== "ORDERING" || !selectedReceivingContractId) return;

    // Skip if this change was triggered programmatically by the sync effect
    if (isProgrammaticUpdate.current) {
      isProgrammaticUpdate.current = false;
      prevWorkContentsLength.current = (watchedWorkContents || []).length;
      return;
    }

    const rc = teikiReceivingContracts.find(c => c.id === selectedReceivingContractId);
    const d = selectedReceivingContractDetail;
    const rcWorkItems: any[] = rc?.work_items || d?.periodic_work_contents || [];
    const rcTotal = rcWorkItems.length;

    if (rcTotal === 0) return;

    const currentCount = (watchedWorkContents || []).length;
    const countChanged = currentCount !== prevWorkContentsLength.current;
    prevWorkContentsLength.current = currentCount;

    // Only auto-switch if count actually changed (user added/removed item)
    if (!countChanged) return;

    if (assignmentType === "FULL" && currentCount < rcTotal) {
      // User deleted at least one item → switch to PARTIAL
      const nextItems: Record<string, { selected: boolean, scopeDetail: string }> = {};
      rcWorkItems.forEach(wi => {
        const exists = (watchedWorkContents || []).some((fItem: any) =>
          fItem.floor === wi.floor &&
          fItem.area === wi.area &&
          (fItem.workContent === (wi.work_content || wi.workContent) ||
            fItem.work_content === (wi.work_content || wi.workContent))
        );
        if (exists) {
          nextItems[wi.id] = { selected: true, scopeDetail: selectedItems[wi.id]?.scopeDetail || "" };
        }
      });
      setSelectedItems(nextItems);
      setAssignmentType("PARTIAL");
    } else if (assignmentType === "PARTIAL" && currentCount >= rcTotal) {
      // User added back all items → check all match then switch to FULL
      const allExist = rcWorkItems.every(wi =>
        (watchedWorkContents || []).some((fItem: any) =>
          fItem.floor === wi.floor &&
          fItem.area === wi.area &&
          (fItem.workContent === (wi.work_content || wi.workContent) ||
            fItem.work_content === (wi.work_content || wi.workContent))
        )
      );
      if (allExist) {
        setAssignmentType("FULL");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedWorkContents]);

  // -------------------------------------------------------------------------
  // Sync: assignmentType + selectedItems → orderingLinks + periodicWorkContents
  // Sets isProgrammaticUpdate=true BEFORE setValue to prevent auto-switch
  // useEffect from firing in response to our own change.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (contractType !== "ORDERING") return;
    if (!selectedReceivingContractId) {
      methods.setValue("orderingLinks", []);
      if (!isEditMode) {
        isProgrammaticUpdate.current = true;
        methods.setValue("periodicWorkContents", []);
      }
      return;
    }

    const work_items: any[] = [];
    const mainFormWorkContents: any[] = [];

    const rc = teikiReceivingContracts.find(c => c.id === selectedReceivingContractId);
    const d = selectedReceivingContractDetail;
    const rcWorkItems: any[] = rc?.work_items || d?.periodic_work_contents || [];

    if (assignmentType === "PARTIAL") {
      Object.entries(selectedItems).forEach(([id, data]) => {
        if (data.selected) {
          work_items.push({ work_content_id: id, scope_detail: data.scopeDetail || null });
          const wc = rcWorkItems.find((w: any) => w.id === id);
          if (wc) {
            mainFormWorkContents.push({
              floor: wc.floor,
              area: wc.area,
              workContent: wc.work_content || wc.workContent,
              sortOrder: wc.sort_order || wc.sortOrder || 0,
            });
          }
        }
      });
    } else {
      rcWorkItems.forEach((wc: any) => {
        mainFormWorkContents.push({
          floor: wc.floor,
          area: wc.area,
          workContent: wc.work_content || wc.workContent,
          sortOrder: wc.sort_order || wc.sortOrder || 0,
        });
      });
    }

    const newLink = {
      receiving_contract_id: selectedReceivingContractId,
      assignment_type: assignmentType,
      allocated_amount: null, // Will be populated from main amount in onSubmit
      work_items: assignmentType === "PARTIAL" ? work_items : [],
    };

    methods.setValue("orderingLinks", [newLink]);

    // Sync work contents — mark as programmatic to prevent auto-switch loop
    const shouldSync = !isEditMode || isInitialSyncDone.current || (isEditMode && initialLink?.receiving_contract_id !== selectedReceivingContractId);
    if (shouldSync) {
      isProgrammaticUpdate.current = true;
      methods.setValue("periodicWorkContents", mainFormWorkContents);
    }
    isInitialSyncDone.current = true;
  }, [selectedReceivingContractId, assignmentType, selectedItems, contractType, isEditMode, methods, teikiReceivingContracts, selectedReceivingContractDetail]);

  const handleItemToggle = (itemId: string, checked: boolean) => {
    const rc = teikiReceivingContracts.find(c => c.id === selectedReceivingContractId);
    const d = selectedReceivingContractDetail;
    const rcWorkItems: any[] = rc?.work_items || d?.periodic_work_contents || [];

    setSelectedItems(prev => {
      const next = {
        ...prev,
        [itemId]: { selected: checked, scopeDetail: checked ? (prev[itemId]?.scopeDetail || "") : "" }
      };

      if (rcWorkItems.length > 0) {
        const selectedCount = rcWorkItems.filter(wi => next[wi.id]?.selected).length;
        if (assignmentType === "FULL" && selectedCount < rcWorkItems.length) {
          setAssignmentType("PARTIAL");
        } else if (assignmentType === "PARTIAL" && selectedCount === rcWorkItems.length) {
          setAssignmentType("FULL");
        }
      }

      return next;
    });
  };

  const handleScopeChange = (itemId: string, val: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], selected: true, scopeDetail: val }
    }));
  };




  const onSubmit = async (data: PeriodicContractFormValues) => {
    try {
      let finalData = { ...data };
      
      // Filter out empty periodic work content rows
      if (finalData.periodicWorkContents) {
        finalData.periodicWorkContents = finalData.periodicWorkContents.filter(
          (wc) => wc.floor?.trim() || wc.area?.trim() || wc.workContent?.trim()
        );
      }
      
      if (finalData.contractType === "ORDERING" && finalData.orderingLinks && finalData.orderingLinks.length > 0) {
        finalData.orderingLinks[0].allocated_amount = finalData.amount;
      }

      if (isEditMode && finalData.id) {
        await updateContract({ id: finalData.id, data: finalData as any });
      } else {
        await createContract(finalData as PeriodicContractCreatePayload);
      }
      onSuccess?.();
    } catch (error) {
      console.error("Failed to save contract", error);
    }
  };
  useEffect(() => {
    if (Object.keys(methods.formState.errors).length > 0) {
      console.log("PeriodicContractForm Validation Errors:", methods.formState.errors);
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
        
        {/* Section 1: 現場・契約連携 (Genba & Linkage) */}
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

            {/* Inline Ordering Link (moved here) */}
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
                    placeholder={activeGenbaId ? "定期清掃の受注契約を選択してください" : "先に現場を選択してください"}
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

                    {/* 最終的な委託作業リスト (作業内容) */}
                    {(() => {
                      const rc = teikiReceivingContracts.find(c => c.id === selectedReceivingContractId);
                      const d = selectedReceivingContractDetail;
                      const rcWorkItems: any[] = rc?.work_items || d?.periodic_work_contents || [];

                      return (
                        <div className="sm:col-span-2 mt-4 pt-4 border-t border-blue-200/60">
                          <h3 className="text-sm font-bold text-slate-700 mb-4 border-l-4 border-[#1E60F2] pl-2">作業内容</h3>
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
                                
                                const boxBaseClass = "min-h-[40px] w-full rounded-lg border px-3 py-2 text-sm flex items-center break-words transition-colors";
                                const boxStateClass = isSelected 
                                  ? "border-slate-300 bg-white text-slate-800 font-medium" 
                                  : "border-slate-200 bg-slate-50 text-slate-400";
                                const boxClass = `${boxBaseClass} ${boxStateClass}`;
                                
                                return (
                                  <div 
                                    key={wi.id} 
                                    className="relative rounded-xl sm:rounded-none border sm:border-none sm:border-b sm:border-slate-100 p-4 sm:p-0 sm:py-3 bg-white sm:bg-transparent flex flex-col sm:grid sm:grid-cols-[48px_2fr_3fr_5fr] gap-3 sm:items-start transition-all hover:bg-slate-50/50"
                                  >
                                    {/* 操作 */}
                                    <div className="flex items-center justify-center h-[40px] hidden sm:flex">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => isPartial && handleItemToggle(wi.id, e.target.checked)}
                                        disabled={!isPartial || readOnly}
                                        className="h-5 w-5 rounded border-gray-300 text-[#1E60F2] focus:ring-[#1E60F2] cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 transition-all"
                                      />
                                    </div>
                                    <div className="sm:hidden flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => isPartial && handleItemToggle(wi.id, e.target.checked)}
                                        disabled={!isPartial || readOnly}
                                        className="h-5 w-5 rounded border-gray-300 text-[#1E60F2] focus:ring-[#1E60F2] cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 transition-all"
                                      />
                                      <span className={`text-sm font-semibold ${isSelected ? 'text-slate-800' : 'text-slate-500'}`}>この項目を委託する</span>
                                    </div>
                                    
                                    {/* 階数 */}
                                    <div className="flex flex-col w-full">
                                      <label className="sm:hidden text-xs font-semibold text-slate-500 mb-1">階数</label>
                                      <div className={boxClass}>
                                        {wi.floor}
                                      </div>
                                    </div>
                                    
                                    {/* 場所・区域 */}
                                    <div className="flex flex-col w-full">
                                      <label className="sm:hidden text-xs font-semibold text-slate-500 mb-1">場所・区域</label>
                                      <div className={boxClass}>
                                        {wi.area}
                                      </div>
                                    </div>
                                    
                                    {/* 作業内容 & 詳細範囲 */}
                                    <div className="flex flex-col w-full">
                                      <label className="sm:hidden text-xs font-semibold text-slate-500 mb-1">作業内容</label>
                                      <div className={boxClass}>
                                        {wi.work_content || wi.workContent}
                                      </div>
                                      
                                      {isPartial && isSelected && (
                                        <div className="pt-2">
                                          <input
                                            type="text"
                                            value={selectedItems[wi.id]?.scopeDetail || ""}
                                            onChange={(e) => handleScopeChange(wi.id, e.target.value)}
                                            disabled={readOnly}
                                            placeholder="詳細範囲 (例: 1Fのみ)"
                                            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700 placeholder:text-slate-400 shadow-sm"
                                          />
                                        </div>
                                      )}
                                    </div>
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
            ) : (
              <div className="sm:col-span-2 mt-2">
                <h3 className="text-sm font-bold text-slate-700 mb-4 border-l-4 border-[#1E60F2] pl-2">作業内容</h3>
                <PeriodicWorkContentEditor name="periodicWorkContents" readOnly={readOnly} />
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Basic Info */}
        <div className="space-y-4 rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm/50">
          <h2 className="text-xl font-bold border-b border-slate-100 pb-2">基本情報</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Partner Selector (only if ORDERING) */}
            {contractType === "ORDERING" && (
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-semibold text-slate-700">協力会社 <span className="text-red-500">*</span></label>
                {readOnly || (isEditMode && !["DRAFT", "PENDING_APPROVAL"].includes((defaultValues as any)?.status)) ? (
                  <input
                    type="text"
                    value={
                      partnerData?.items.find(p => p.id === methods.getValues("partnerId"))?.company_name ||
                      (defaultValues as any)?.partnerName ||
                      ""
                    }
                    readOnly
                    disabled
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none"
                  />
                ) : (
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
                )}
                {methods.formState.errors.partnerId && (
                  <p className="text-xs text-red-500">{methods.formState.errors.partnerId.message}</p>
                )}
              </div>
            )}

            {/* Contract Name (Second) */}
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-semibold text-slate-700">契約名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                {...methods.register("contractName")}
                placeholder="例: ザイマ関西_Amazon京田辺_定期清掃"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all"
              />
              {methods.formState.errors.contractName && (
                <p className="text-xs text-red-500">{methods.formState.errors.contractName.message}</p>
              )}
            </div>

            {/* Contract Type */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">契約種別 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={methods.watch("contractType") === "ORDERING" ? "発注" : "受託"}
                readOnly
                disabled
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 text-slate-400 px-3 text-sm outline-none cursor-not-allowed select-none transition-all"
              />
              <Controller
                name="contractType"
                control={methods.control}
                render={({ field }) => <input type="hidden" {...field} />}
              />
            </div>

            {/* Service Type */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">サービス種別 <span className="text-red-500">*</span></label>
              <input
                type="text"
                {...methods.register("serviceType")}
                readOnly
                placeholder="例: 定期清掃"
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 text-slate-400 px-3 text-sm outline-none cursor-not-allowed select-none transition-all"
              />
              {methods.formState.errors.serviceType && (
                <p className="text-xs text-red-500">{methods.formState.errors.serviceType.message}</p>
              )}
            </div>



            {/* Amount */}
            <div className="space-y-2">
              <div className="flex justify-between items-end flex-wrap gap-1">
                <label className="text-sm font-semibold text-slate-700">
                  {contractType === "ORDERING" ? "委託金額" : "金額"} <span className="text-red-500">*</span>
                </label>
                {contractType === "ORDERING" && (selectedReceivingContractId || initialLink?.receiving_contract_id) && (
                  <div className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-medium">
                    元請契約金額: {
                      (() => {
                        const rc = teikiReceivingContracts.find(c => c.id === selectedReceivingContractId);
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
                      disabled={readOnly}
                      value={typeof value === 'number' && !isNaN(value) ? value.toLocaleString("ja-JP") : (value ?? "")}
                      onChange={(e) => {
                        const raw = e.target.value
                          .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
                          .replace(/[^0-9]/g, '');
                        onChange(raw === '' ? undefined : Number(raw));
                      }}
                      placeholder="0"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all text-right disabled:opacity-60 disabled:bg-slate-50 placeholder:text-slate-400"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium">円</span>
                  </div>
                )}
              />
              {methods.formState.errors.amount && (
                <p className="text-xs text-red-500">{methods.formState.errors.amount.message}</p>
              )}
              {contractType === "ORDERING" && (selectedReceivingContractId || initialLink?.receiving_contract_id) && (
                (() => {
                  const rc = teikiReceivingContracts.find(c => c.id === selectedReceivingContractId);
                  const rcAmt = rc?.amount ?? selectedReceivingContractDetail?.amount;
                  const currentAmt = methods.watch("amount") || 0;
                  if (rcAmt != null) {
                    if (currentAmt > Number(rcAmt)) {
                      return (
                        <p className="text-xs font-semibold text-red-500 mt-1">
                          ※ 委託金額が元請契約の金額を超えています。
                        </p>
                      );
                    } else if (currentAmt > Number(rcAmt) * 0.85) {
                      return (
                        <p className="text-xs font-semibold text-orange-500 mt-1">
                          ※ 委託金額が元請契約の金額の85%を超えています。
                        </p>
                      );
                    }
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
                <p className="text-xs text-red-500">{methods.formState.errors.startDate.message}</p>
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



        {/* Section 3: Periodic Schedule */}
        <div className="space-y-4 rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm/50">
          <h2 className="text-xl font-bold border-b border-slate-100 pb-2">定期スケジュール情報 <span className="text-red-500">*</span></h2>
          <PeriodicScheduleEditor name="periodicSchedule" readOnly={readOnly || contractType === "ORDERING"} />
          
          {methods.formState.errors.periodicSchedule && (
            <div className="mt-2 space-y-1 text-xs text-red-500">
              {methods.formState.errors.periodicSchedule.frequencyPerYear && (
                <p>{methods.formState.errors.periodicSchedule.frequencyPerYear.message}</p>
              )}
              {methods.formState.errors.periodicSchedule.workMonths && (
                <p>{methods.formState.errors.periodicSchedule.workMonths.message}</p>
              )}
            </div>
          )}
        </div>

        {/* Section 4: Holiday Rules */}
        <div className="space-y-4 rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm/50">
          <h2 className="text-xl font-bold border-b border-slate-100 pb-2">休日規定 <span className="text-red-500">*</span></h2>
          <HolidayRuleEditor name="holidayRules" readOnly={readOnly || contractType === "ORDERING"} />
        </div>

        {/* Section 5: Special Notes */}
        <div className="space-y-4 rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm/50">
          <h2 className="text-xl font-bold border-b border-slate-100 pb-2">注意点</h2>
          <textarea
            {...methods.register("workContentSummary")}
            placeholder="特記事項や注意点を入力してください..."
            className="min-h-[100px] w-full rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 transition-all resize-y"
          />
        </div>

        {/* Section 5: PDF Upload */}
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
                  className="h-[48px] sm:h-10 w-full sm:w-auto rounded-lg border border-input bg-white px-6 sm:px-4 text-lg sm:text-base font-semibold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:pointer-events-none shadow-sm"
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
