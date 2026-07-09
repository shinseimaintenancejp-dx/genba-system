"use client";

import React, { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  usePeriodicPlans,
  useCreatePeriodicPlan,
  useUpdatePeriodicPlan,
  useDeletePeriodicPlan,
  useCreatePeriodicDetail,
  useUpdatePeriodicDetail,
  useDeletePeriodicDetail,
  type PeriodicCleaningPlanResponse,
  type PeriodicCleaningDetailResponse,
} from "@/hooks/useSchedules";
import { useContractsByCategory, useDeleteContract } from "@/hooks/useContracts";
import { usePartners } from "@/hooks/usePartners";
import { useCurrentUser } from "@/hooks/useAuth";
import { PeriodicContractForm } from "@/components/contracts/PeriodicContractForm";
import { Loader2, Plus, Edit, Trash2, Check, X, AlertTriangle, Layers, Info, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import type { Contract } from "@/types/contract";

const FISCAL_MONTHS = [
  { key: "month_apr", label: "4月" },
  { key: "month_may", label: "5月" },
  { key: "month_jun", label: "6月" },
  { key: "month_jul", label: "7月" },
  { key: "month_aug", label: "8月" },
  { key: "month_sep", label: "9月" },
  { key: "month_oct", label: "10月" },
  { key: "month_nov", label: "11月" },
  { key: "month_dec", label: "12月" },
  { key: "month_jan", label: "1月" },
  { key: "month_feb", label: "2月" },
  { key: "month_mar", label: "3月" },
] as const;

// Helper to map backend Contract to Frontend Form Default Values
function mapContractToDefaultValues(contract: Contract): any {
  return {
    id: contract.id,
    contractName: contract.contract_name || "",
    contractType: contract.contract_type,
    serviceType: contract.service_type,
    serviceCategory: contract.service_category,
    genbaId: contract.genba_id || "",
    customerId: contract.customer_id || undefined,
    partnerId: contract.partner_id || undefined,
    startDate: contract.start_date.split("T")[0],
    endDate: contract.end_date ? contract.end_date.split("T")[0] : undefined,
    amount: typeof contract.amount === "string" ? parseFloat(contract.amount) : contract.amount,
    taxType: contract.tax_type,
    autoRenew: contract.auto_renew,
    invoiceRequired: contract.invoice_required,
    workContentSummary: contract.work_content_summary || undefined,
    contractPdfUrl: contract.contract_pdf_url || undefined,
    periodicSchedule: contract.periodic_schedule ? {
      frequencyPerYear: contract.periodic_schedule.frequency_per_year,
      workMonths: contract.periodic_schedule.work_months,
      workDays: contract.periodic_schedule.work_days,
    } : { frequencyPerYear: 1, workMonths: [], workDays: [] },
    holidayRules: contract.holiday_rules?.map(h => ({
      ruleType: h.rule_type,
      action: h.action,
    })) || [],
    periodicWorkContents: contract.periodic_work_contents?.map(w => ({
      id: w.id,
      floor: w.floor,
      area: w.area,
      workContent: w.work_content,
      sortOrder: w.sort_order,
    })) || [],
  };
}

export default function PeriodicCleaningPlansPage() {
  const params = useParams();
  const genbaId = params.id as string;

  const { data: user } = useCurrentUser();
  const canEdit = user && ["ADMIN", "SENIOR_STAFF", "INTERNAL_STAFF"].includes(user.role);

  // Queries
  const { data: contractsData, isLoading: isLoadingContracts } = useContractsByCategory(genbaId, "PERIODIC");
  const { data: plans = [], isLoading: isLoadingPlans, error } = usePeriodicPlans(genbaId);
  const { data: partnersData } = usePartners({ limit: 100 });
  const partners = partnersData?.items || [];

  // Mutations
  const createPlanMutation = useCreatePeriodicPlan();
  const updatePlanMutation = useUpdatePeriodicPlan();
  const deletePlanMutation = useDeletePeriodicPlan();
  const createDetailMutation = useCreatePeriodicDetail();
  const updateDetailMutation = useUpdatePeriodicDetail();
  const deleteDetailMutation = useDeletePeriodicDetail();
  const deleteContractMutation = useDeleteContract();

  // Dialog States
  const [expandedContractIds, setExpandedContractIds] = useState<Set<string>>(new Set());
  const [expandedPlanIds, setExpandedPlanIds] = useState<Record<string, boolean>>({});
  
  // Contract form states
  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [isDeleteContractOpen, setIsDeleteContractOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);

  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeletePlanOpen, setIsDeletePlanOpen] = useState(false);
  const [isDeleteDetailOpen, setIsDeleteDetailOpen] = useState(false);

  // Focus entity states
  const [selectedContractId, setSelectedContractId] = useState<string>("");
  const [editingPlan, setEditingPlan] = useState<PeriodicCleaningPlanResponse | null>(null);
  const [editingDetail, setEditingDetail] = useState<PeriodicCleaningDetailResponse | null>(null);
  const [targetPlanForDetail, setTargetPlanForDetail] = useState<PeriodicCleaningPlanResponse | null>(null);
  const [planToDelete, setPlanToDelete] = useState<PeriodicCleaningPlanResponse | null>(null);
  const [detailToDelete, setDetailToDelete] = useState<{ planId: string; detail: PeriodicCleaningDetailResponse } | null>(null);

  // Form states for Plan
  const [workTeamType, setWorkTeamType] = useState<"SELF" | "PARTNER">("SELF");
  const [partnerId, setPartnerId] = useState<string>("");
  const [workContent, setWorkContent] = useState<string>("");
  const [specialNotes, setSpecialNotes] = useState<string>("");
  const [monthsState, setMonthsState] = useState<Record<typeof FISCAL_MONTHS[number]["key"], boolean>>({
    month_apr: false, month_may: false, month_jun: false, month_jul: false, month_aug: false, month_sep: false,
    month_oct: false, month_nov: false, month_dec: false, month_jan: false, month_feb: false, month_mar: false,
  });

  // Form states for Detail
  const [location, setLocation] = useState<string>("");
  const [floorMaterial, setFloorMaterial] = useState<string>("");
  const [areaName, setAreaName] = useState<string>("");
  const [detailWorkContent, setDetailWorkContent] = useState<string>("");
  const [detailSpecialNotes, setDetailSpecialNotes] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<number>(0);

  // Default expand logic removed as per request

  const toggleContract = (contractId: string) => {
    const next = new Set(expandedContractIds);
    if (next.has(contractId)) next.delete(contractId);
    else next.add(contractId);
    setExpandedContractIds(next);
  };

  const togglePlanExpand = (planId: string) => {
    setExpandedPlanIds((prev) => ({ ...prev, [planId]: !prev[planId] }));
  };

  // Contract Handlers
  const handleOpenCreateContract = () => {
    setEditingContract(null);
    setIsContractDialogOpen(true);
  };

  const handleOpenEditContract = (contract: Contract) => {
    setEditingContract(contract);
    setIsContractDialogOpen(true);
  };

  const handleOpenDeleteContract = (contract: Contract) => {
    setContractToDelete(contract);
    setIsDeleteContractOpen(true);
  };

  const handleDeleteContract = () => {
    if (!contractToDelete) return;
    deleteContractMutation.mutate(contractToDelete.id, {
      onSuccess: () => {
        setIsDeleteContractOpen(false);
        setContractToDelete(null);
      }
    });
  };

  // Plan Handlers
  const resetPlanForm = () => {
    setWorkTeamType("SELF");
    setPartnerId("");
    setWorkContent("");
    setSpecialNotes("");
    setMonthsState({
      month_apr: false, month_may: false, month_jun: false, month_jul: false, month_aug: false, month_sep: false,
      month_oct: false, month_nov: false, month_dec: false, month_jan: false, month_feb: false, month_mar: false,
    });
    setEditingPlan(null);
  };

  const handleOpenCreatePlan = (contractId: string) => {
    resetPlanForm();
    setSelectedContractId(contractId);
    setIsPlanOpen(true);
  };

  const handleOpenEditPlan = (plan: PeriodicCleaningPlanResponse) => {
    setEditingPlan(plan);
    setSelectedContractId(plan.contract_id || "");
    setWorkTeamType(plan.work_team_type);
    setPartnerId(plan.partner_id || "");
    setWorkContent(plan.work_content);
    setSpecialNotes(plan.special_notes || "");
    setMonthsState({
      month_apr: plan.month_apr, month_may: plan.month_may, month_jun: plan.month_jun, month_jul: plan.month_jul,
      month_aug: plan.month_aug, month_sep: plan.month_sep, month_oct: plan.month_oct, month_nov: plan.month_nov,
      month_dec: plan.month_dec, month_jan: plan.month_jan, month_feb: plan.month_feb, month_mar: plan.month_mar,
    });
    setIsPlanOpen(true);
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workContent || !selectedContractId) return;

    const payload = {
      contract_id: selectedContractId,
      work_team_type: workTeamType,
      partner_id: workTeamType === "PARTNER" && partnerId ? partnerId : null,
      work_content: workContent,
      special_notes: specialNotes || null,
      ...monthsState,
    };

    if (editingPlan) {
      updatePlanMutation.mutate(
        { genbaId, planId: editingPlan.id, data: payload },
        { onSuccess: () => { setIsPlanOpen(false); resetPlanForm(); } }
      );
    } else {
      createPlanMutation.mutate(
        { genbaId, data: payload },
        { onSuccess: () => { setIsPlanOpen(false); resetPlanForm(); } }
      );
    }
  };

  const handleDeletePlan = () => {
    if (!planToDelete) return;
    deletePlanMutation.mutate(
      { genbaId, planId: planToDelete.id },
      { onSuccess: () => { setIsDeletePlanOpen(false); setPlanToDelete(null); } }
    );
  };

  // Detail Handlers
  const resetDetailForm = () => {
    setLocation("");
    setFloorMaterial("");
    setAreaName("");
    setDetailWorkContent("");
    setDetailSpecialNotes("");
    setSortOrder(0);
    setEditingDetail(null);
    setTargetPlanForDetail(null);
  };

  const handleOpenCreateDetail = (plan: PeriodicCleaningPlanResponse) => {
    resetDetailForm();
    setTargetPlanForDetail(plan);
    setIsDetailOpen(true);
  };

  const handleOpenEditDetail = (plan: PeriodicCleaningPlanResponse, detail: PeriodicCleaningDetailResponse) => {
    setTargetPlanForDetail(plan);
    setEditingDetail(detail);
    setLocation(detail.location);
    setFloorMaterial(detail.floor_material || "");
    setAreaName(detail.area_name);
    setDetailWorkContent(detail.work_content);
    setDetailSpecialNotes(detail.special_notes || "");
    setSortOrder(detail.sort_order);
    setIsDetailOpen(true);
  };

  const handleSaveDetail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !areaName || !detailWorkContent || !targetPlanForDetail) return;

    const payload = {
      location,
      floor_material: floorMaterial || null,
      area_name: areaName,
      work_content: detailWorkContent,
      special_notes: detailSpecialNotes || null,
      sort_order: sortOrder,
    };

    if (editingDetail) {
      updateDetailMutation.mutate(
        { genbaId, planId: targetPlanForDetail.id, detailId: editingDetail.id, data: payload },
        { onSuccess: () => { setIsDetailOpen(false); resetDetailForm(); } }
      );
    } else {
      createDetailMutation.mutate(
        { genbaId, planId: targetPlanForDetail.id, data: payload },
        { onSuccess: () => { setIsDetailOpen(false); resetDetailForm(); } }
      );
    }
  };

  const handleDeleteDetail = () => {
    if (!detailToDelete) return;
    deleteDetailMutation.mutate(
      { genbaId, planId: detailToDelete.planId, detailId: detailToDelete.detail.id },
      { onSuccess: () => { setIsDeleteDetailOpen(false); setDetailToDelete(null); } }
    );
  };

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <h2 className="text-lg font-bold text-red-800">エラーが発生しました</h2>
      </div>
    );
  }

  const contracts = contractsData?.items || [];
  const isLoading = isLoadingContracts || isLoadingPlans;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 hidden">定期清掃マニュアル</h2>
          <p className="text-sm text-slate-500 mt-1">契約ごとの定期清掃実施月と詳細仕様書を確認・管理します。</p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenCreateContract}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-[#1E60F2] hover:bg-[#0F4FD0] text-sm font-semibold text-white transition-all shadow-sm duration-200 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>定期契約を追加</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-slate-400 w-8 h-8" /></div>
      ) : contracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[240px] bg-slate-50 rounded-xl border border-dashed border-slate-200 p-8 text-center">
          <Layers className="h-12 w-12 text-slate-300 mb-3" />
          <span className="text-sm font-semibold text-slate-400">定期清掃の契約がありません</span>
          {canEdit && (
            <button
              onClick={handleOpenCreateContract}
              className="mt-4 inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>最初の契約を登録する</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {contracts.map(contract => {
            const isExpanded = expandedContractIds.has(contract.id);
            const contractPlans = plans.filter(p => p.contract_id === contract.id);
            
            // Extract periodic info
            let freq = 0;
            let workMonths: number[] = [];
            if (contract.periodic_schedule) {
              freq = contract.periodic_schedule.frequency_per_year || 0;
              workMonths = contract.periodic_schedule.work_months || [];
            }

            return (
              <div key={contract.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div 
                  className={`p-4 cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/50 border-b border-blue-100' : 'hover:bg-slate-50'}`}
                  onClick={() => toggleContract(contract.id)}
                >
                  <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="bg-blue-100 text-blue-700 p-2 rounded-lg shrink-0">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="font-bold text-slate-900 text-base">{contract.contract_name || contract.service_type || "定期清掃契約"}</span>
                          {contract.amount != null && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded border border-emerald-200">
                              ¥{Number(contract.amount).toLocaleString()} {contract.tax_type === "EXCLUSIVE" ? "(税抜)" : "(税込)"}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                          {freq > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-500">作業回数:</span>
                              <span className="text-xs font-bold text-slate-800">{freq}回/年</span>
                            </div>
                          )}
                          {workMonths.length > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-500">実施月:</span>
                              <div className="flex flex-wrap gap-1">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                                  const isSelected = workMonths.includes(m);
                                  return (
                                    <span
                                      key={m}
                                      className={`flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold border transition-all ${
                                        isSelected
                                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                          : "bg-slate-50 text-slate-300 border-slate-200"
                                      }`}
                                    >
                                      {m}月
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      {canEdit && (
                        <div className="flex items-center gap-1 mr-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenEditContract(contract); }}
                            className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm"
                            aria-label="Edit Contract"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenDeleteContract(contract); }}
                            className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm"
                            aria-label="Delete Contract"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                      <div className="p-1 bg-white rounded-full border border-slate-200 shadow-sm shrink-0">
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-5 bg-slate-50/30 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Layers className="h-4 w-4 text-blue-600" />
                        登録済みの作業内容
                      </h3>
                    </div>

                    {!contract.periodic_work_contents || contract.periodic_work_contents.length === 0 ? (
                      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
                        <p className="text-sm text-slate-500">登録されている作業内容はありません。</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg shadow-sm">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                          <thead>
                            <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 text-xs font-bold uppercase select-none">
                              <th className="py-3 px-4 w-32">階数</th>
                              <th className="py-3 px-4 w-64">場所・区域</th>
                              <th className="py-3 px-4">作業内容</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm">
                            {contract.periodic_work_contents.sort((a, b) => a.sort_order - b.sort_order).map((content) => (
                              <tr key={content.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 px-4 font-medium text-slate-700">{content.floor}</td>
                                <td className="py-3 px-4 text-slate-700">{content.area}</td>
                                <td className="py-3 px-4 text-slate-800 break-words">{content.work_content}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {contract.work_content_summary && (
                      <div className="mt-6">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          注意点
                        </h3>
                        <div className="bg-amber-50/40 rounded-lg border border-amber-100 p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed shadow-sm">
                          {contract.work_content_summary}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Periodic Contract Form Modal (Create & Edit) */}
      <Dialog.Root open={isContractDialogOpen} onOpenChange={(open) => { if (!open) setIsContractDialogOpen(false); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-2xl focus:outline-none animate-in fade-in-50 zoom-in-95 max-h-[95vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6 border-b border-slate-200 pb-4 sticky top-0 bg-slate-50 z-10">
              <div>
                <Dialog.Title className="text-2xl font-bold text-slate-900">
                  {editingContract ? "定期契約の編集" : "定期契約を追加"}
                </Dialog.Title>
                <Dialog.Description className="text-sm text-slate-500 mt-1">
                  必要な項目を入力して保存してください。
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors">
                  <X className="h-6 w-6" />
                </button>
              </Dialog.Close>
            </div>
            
            <div className="mt-4">
              <PeriodicContractForm
                genbaId={genbaId}
                defaultValues={editingContract ? mapContractToDefaultValues(editingContract) : undefined}
                onSuccess={() => setIsContractDialogOpen(false)}
                onCancel={() => setIsContractDialogOpen(false)}
              />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Contract Confirmation */}
      <Dialog.Root open={isDeleteContractOpen} onOpenChange={setIsDeleteContractOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl focus:outline-none animate-in fade-in-50 zoom-in-95">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-6 w-6 shrink-0" />
                <Dialog.Title className="text-lg font-bold">契約を削除しますか？</Dialog.Title>
              </div>
              <Dialog.Close asChild><button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></Dialog.Close>
            </div>
            <div className="text-sm text-slate-600 mb-6">
              <p className="mb-2 font-bold text-slate-800">契約: {contractToDelete?.contract_name || contractToDelete?.service_type}</p>
              <p>この契約および関連する作業データを完全に削除します。よろしいですか？</p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button type="button" onClick={() => setIsDeleteContractOpen(false)} className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold">キャンセル</button>
              <button type="button" onClick={handleDeleteContract} disabled={deleteContractMutation.isPending} className="h-10 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold inline-flex items-center">
                {deleteContractMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 削除
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Plan Dialog */}
      <Dialog.Root open={isPlanOpen} onOpenChange={(open) => !open && resetPlanForm() || setIsPlanOpen(open)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
              <Dialog.Title className="text-lg font-bold text-slate-900">{editingPlan ? "定期清掃計画を編集" : "定期清掃計画を新規追加"}</Dialog.Title>
              <Dialog.Close className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg"><X className="h-5 w-5" /></Dialog.Close>
            </div>
            <form onSubmit={handleSavePlan} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">実施体制</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setWorkTeamType("SELF")} className={`h-11 rounded-lg border text-sm font-semibold transition-all ${workTeamType === "SELF" ? "border-blue-600 bg-blue-50/50 text-blue-600" : "border-slate-200"}`}>自社実施</button>
                  <button type="button" onClick={() => setWorkTeamType("PARTNER")} className={`h-11 rounded-lg border text-sm font-semibold transition-all ${workTeamType === "PARTNER" ? "border-blue-600 bg-blue-50/50 text-blue-600" : "border-slate-200"}`}>外注実施 (協力会社)</button>
                </div>
              </div>
              {workTeamType === "PARTNER" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">協力会社 <span className="text-red-500">*</span></label>
                  <select required value={partnerId} onChange={(e) => setPartnerId(e.target.value)} className="h-10 px-3 rounded-lg border border-slate-200 text-sm">
                    <option value="">-- 選択 --</option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.company_name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">作業名 / 清掃内容 <span className="text-red-500">*</span></label>
                <input type="text" required maxLength={200} value={workContent} onChange={(e) => setWorkContent(e.target.value)} className="h-10 px-3 rounded-lg border border-slate-200 text-sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">実施月（年度: 4月〜翌3月）</label>
                <div className="grid grid-cols-4 gap-2 border border-slate-100 rounded-lg p-3 bg-slate-50/30">
                  {FISCAL_MONTHS.map(m => (
                    <label key={m.key} className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-semibold">
                      <input type="checkbox" checked={monthsState[m.key]} onChange={e => setMonthsState(prev => ({...prev, [m.key]: e.target.checked}))} className="rounded border-slate-300 text-blue-600" />
                      {m.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">特記事項</label>
                <textarea rows={2} value={specialNotes} onChange={(e) => setSpecialNotes(e.target.value)} className="w-full p-3 rounded-lg border border-slate-200 text-sm" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsPlanOpen(false)} className="h-[44px] px-6 rounded-lg border border-slate-200 font-semibold text-sm">キャンセル</button>
                <button type="submit" disabled={createPlanMutation.isPending || updatePlanMutation.isPending} className="h-[44px] px-6 rounded-lg bg-blue-600 text-white font-semibold text-sm flex items-center">
                  {(createPlanMutation.isPending || updatePlanMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingPlan ? "保存" : "登録"}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Detail Dialog */}
      <Dialog.Root open={isDetailOpen} onOpenChange={(open) => !open && resetDetailForm() || setIsDetailOpen(open)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
              <Dialog.Title className="text-lg font-bold text-slate-900">{editingDetail ? "仕様詳細を編集" : "仕様詳細を追加"}</Dialog.Title>
              <Dialog.Close className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg"><X className="h-5 w-5" /></Dialog.Close>
            </div>
            <form onSubmit={handleSaveDetail} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">対象場所 <span className="text-red-500">*</span></label>
                  <input type="text" required value={location} onChange={(e) => setLocation(e.target.value)} className="h-10 px-3 rounded-lg border border-slate-200 text-sm" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">対象床材</label>
                  <input type="text" value={floorMaterial} onChange={(e) => setFloorMaterial(e.target.value)} className="h-10 px-3 rounded-lg border border-slate-200 text-sm" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">清盛区域名 <span className="text-red-500">*</span></label>
                <input type="text" required value={areaName} onChange={(e) => setAreaName(e.target.value)} className="h-10 px-3 rounded-lg border border-slate-200 text-sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">作業内容 / 仕様仕様 <span className="text-red-500">*</span></label>
                <textarea required rows={3} value={detailWorkContent} onChange={(e) => setDetailWorkContent(e.target.value)} className="w-full p-3 rounded-lg border border-slate-200 text-sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">表示順</label>
                <input type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value)||0)} className="h-10 px-3 rounded-lg border border-slate-200 text-sm w-32" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsDetailOpen(false)} className="h-[44px] px-6 rounded-lg border border-slate-200 font-semibold text-sm">キャンセル</button>
                <button type="submit" disabled={createDetailMutation.isPending || updateDetailMutation.isPending} className="h-[44px] px-6 rounded-lg bg-blue-600 text-white font-semibold text-sm flex items-center">
                  {(createDetailMutation.isPending || updateDetailMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingDetail ? "保存" : "登録"}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Plan */}
      <Dialog.Root open={isDeletePlanOpen} onOpenChange={setIsDeletePlanOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2"><AlertTriangle className="h-5 w-5"/> 削除確認</h3>
            <p className="text-sm text-slate-600 mb-6">この計画とすべての仕様詳細を削除します。よろしいですか？</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsDeletePlanOpen(false)} className="px-4 py-2 rounded-lg bg-slate-100 text-sm font-semibold">キャンセル</button>
              <button onClick={handleDeletePlan} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold">削除</button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Detail */}
      <Dialog.Root open={isDeleteDetailOpen} onOpenChange={setIsDeleteDetailOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2"><AlertTriangle className="h-5 w-5"/> 削除確認</h3>
            <p className="text-sm text-slate-600 mb-6">仕様詳細を削除します。よろしいですか？</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsDeleteDetailOpen(false)} className="px-4 py-2 rounded-lg bg-slate-100 text-sm font-semibold">キャンセル</button>
              <button onClick={handleDeleteDetail} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold">削除</button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
