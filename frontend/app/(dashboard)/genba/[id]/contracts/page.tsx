"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { useCurrentUser } from "@/hooks/useAuth";
import { useContracts } from "@/hooks/useContracts";
import { useCustomers } from "@/hooks/useCustomers";
import { usePartners } from "@/hooks/usePartners";
import { DataTable, type Column } from "@/components/common/DataTable";
import { ContractTypeSelector } from "@/components/contracts/ContractTypeSelector";
import { DailyContractForm } from "@/components/contracts/DailyContractForm";
import { PeriodicContractForm } from "@/components/contracts/PeriodicContractForm";
import { OtherContractForm } from "@/components/contracts/OtherContractForm";
import { Plus, Edit2, Search, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import type { Contract } from "@/types/contract";

export default function GenbaContractsPage() {
  const params = useParams();
  const genbaId = params.id as string;
  const { data: currentUser } = useCurrentUser();

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [contractType, setContractType] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  // Modals state
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [createFormType, setCreateFormType] = useState<"DAILY" | "PERIODIC" | "OTHER" | null>(null);
  const [editContract, setEditContract] = useState<Contract | null>(null);

  // Query contracts filtered by this specific genbaId
  const { data: contractsData, isLoading: isLoadingContracts, refetch } = useContracts({
    page,
    limit,
    genba_id: genbaId,
    search: search || undefined,
    contract_type: contractType || undefined,
    status: status || undefined,
  });

  // Fetch lookups for mapping IDs to names
  const { data: customerList } = useCustomers({ limit: 300 });
  const { data: partnerList } = usePartners({ limit: 300 });

  const customerMap = React.useMemo(() => {
    return new Map(customerList?.items.map((c) => [c.id, c.full_name]));
  }, [customerList]);

  const partnerMap = React.useMemo(() => {
    return new Map(partnerList?.items.map((p) => [p.id, p.company_name]));
  }, [partnerList]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleFormSuccess = () => {
    setCreateFormType(null);
    setEditContract(null);
    refetch(); // Invalidate or refetch list
  };

  const handleFormCancel = () => {
    setCreateFormType(null);
    setEditContract(null);
  };

  // Columns for the Genba-specific contract table
  const columns: Column<Contract>[] = [
    {
      header: "契約コード",
      accessorKey: "internal_code",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800">{row.internal_code}</span>
          {row.external_code && (
            <span className="text-xs text-slate-400">外部: {row.external_code}</span>
          )}
        </div>
      ),
    },
    {
      header: "契約名",
      accessorKey: "contract_name",
      render: (row) => (
        <span className="font-semibold text-slate-800">{row.contract_name || "-"}</span>
      ),
    },
    {
      header: "取引先 / 協力会社",
      render: (row) => {
        if (row.contract_type === "RECEIVING") {
          return (
            <div className="flex flex-col">
              <span className="font-medium text-slate-700">
                {customerMap.get(row.customer_id || "") || "-"}
              </span>
              <span className="text-[10px] text-blue-600 font-semibold uppercase">元請 (顧客)</span>
            </div>
          );
        } else {
          return (
            <div className="flex flex-col">
              <span className="font-medium text-slate-700">
                {partnerMap.get(row.partner_id || "") || "-"}
              </span>
              <span className="text-[10px] text-amber-600 font-semibold uppercase">下請 (協力会社)</span>
            </div>
          );
        }
      },
    },
    {
      header: "業務区分",
      render: (row) => {
        return (
          <div className="flex flex-col">
            <span className="font-medium text-slate-800">{row.service_type || "-"}</span>
            {row.service_category === "DAILY" && row.work_slots && row.worker_counts && (
              <span className="text-[10px] text-slate-500">
                {row.work_slots.length}シフト / 計{row.worker_counts.reduce((acc, wc) => acc + wc.worker_count, 0)}名
              </span>
            )}
            {row.service_category === "PERIODIC" && row.periodic_schedule && (
              <span className="text-[10px] text-slate-500">
                年{row.periodic_schedule.frequency_per_year}回
              </span>
            )}
            {row.service_category === "OTHER" && row.work_type && (
              <span className="text-[10px] text-slate-500">
                {row.work_type} / {row.sub_service_type}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "金額 (税別)",
      render: (row) => (
        <span className="font-semibold text-slate-800">
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      header: "契約期間",
      render: (row) => (
        <div className="flex flex-col text-xs">
          <span>{row.start_date.split("T")[0]} 〜</span>
          <span>{row.end_date ? row.end_date.split("T")[0] : row.auto_renew ? "自動更新" : "-"}</span>
        </div>
      ),
    },
    {
      header: "ステータス",
      render: (row) => {
        let styles = "";
        let label = "";
        switch (row.status) {
          case "ACTIVE":
            styles = "bg-green-50 text-green-700 border border-green-200";
            label = "有効";
            break;
          case "DRAFT":
            styles = "bg-slate-50 text-slate-700 border border-slate-200";
            label = "下書き";
            break;
          case "PENDING_APPROVAL":
            styles = "bg-amber-50 text-amber-700 border border-amber-200";
            label = "承認待ち";
            break;
          case "EXPIRED":
            styles = "bg-red-50 text-red-700 border border-red-200";
            label = "期限切れ";
            break;
          case "CANCELLED":
            styles = "bg-zinc-100 text-zinc-700 border border-zinc-200";
            label = "解約";
            break;
          default:
            styles = "bg-slate-50 text-slate-700 border border-slate-200";
            label = row.status;
        }

        return (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${styles}`}>
            {label}
          </span>
        );
      },
    },
    {
      header: "操作",
      render: (row) => {
        const isPartner = currentUser?.role === "PARTNER";
        if (isPartner) return null;

        return (
          <button
            onClick={() => setEditContract(row)}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Edit contract"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        );
      },
    },
  ];

  const canWrite = currentUser?.role === "ADMIN" || currentUser?.role === "SENIOR_STAFF" || currentUser?.role === "INTERNAL_STAFF";

  // Determine active form type (Create or Edit)
  const activeFormType = createFormType || editContract?.service_category;
  const isFormOpen = !!activeFormType;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">現場契約一覧</h2>
          <p className="text-xs text-slate-500">
            この現場に関する元請・下請のすべての契約一覧です。
          </p>
        </div>
        {canWrite && (
          <div>
            <button
              onClick={() => setIsSelectorOpen(true)}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-lg bg-[#1E60F2] px-5 text-sm font-semibold text-white hover:bg-[#0F4FD0] transition-colors shadow-sm"
            >
              <Plus className="h-5 w-5" />
              <span>契約追加</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="契約コードで検索..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full h-11 rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>

        <select
          value={contractType}
          onChange={(e) => {
            setContractType(e.target.value);
            setPage(1);
          }}
          className="h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        >
          <option value="">契約種別 (すべて)</option>
          <option value="RECEIVING">元請契約 (RECEIVING)</option>
          <option value="ORDERING">下請契約 (ORDERING)</option>
        </select>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        >
          <option value="">ステータス (すべて)</option>
          <option value="DRAFT">下書き</option>
          <option value="PENDING_APPROVAL">承認待ち</option>
          <option value="ACTIVE">有効</option>
          <option value="EXPIRED">期限切れ</option>
          <option value="CANCELLED">解約</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={contractsData?.items}
        isLoading={isLoadingContracts}
        totalCount={contractsData?.total}
        page={page}
        limit={limit}
        onPageChange={setPage}
        emptyMessage="この現場には契約情報が登録されていません。"
      />

      {/* 1. Contract Type Selector Dialog */}
      <ContractTypeSelector
        open={isSelectorOpen}
        onOpenChange={setIsSelectorOpen}
        onSelect={(type) => setCreateFormType(type)}
      />

      {/* 2. Contract Form Modal */}
      <Dialog.Root open={isFormOpen} onOpenChange={(open) => { if (!open) handleFormCancel(); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl focus:outline-none animate-in fade-in-50 zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <Dialog.Title className="text-lg font-bold text-slate-900">
                {editContract ? "契約の編集" : "契約の新規登録"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            <div>
              {activeFormType === "DAILY" && (
                <DailyContractForm
                  genbaId={genbaId}
                  defaultValues={editContract ? mapContractToDefaultValues(editContract) : undefined}
                  onSuccess={handleFormSuccess}
                  onCancel={handleFormCancel}
                />
              )}
              {activeFormType === "PERIODIC" && (
                <PeriodicContractForm
                  genbaId={genbaId}
                  defaultValues={editContract ? mapContractToDefaultValues(editContract) : undefined}
                  onSuccess={handleFormSuccess}
                  onCancel={handleFormCancel}
                />
              )}
              {activeFormType === "OTHER" && (
                <OtherContractForm
                  genbaId={genbaId}
                  defaultValues={editContract ? mapContractToDefaultValues(editContract) : undefined}
                  onSuccess={handleFormSuccess}
                  onCancel={handleFormCancel}
                />
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

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
    
    // Daily specifics
    weeklyFrequency: contract.weekly_frequency ? Number(contract.weekly_frequency) : undefined,
    workDays: contract.work_days || "",
    workSlots: contract.work_slots?.map(s => ({
      startTime: s.start_time,
      endTime: s.end_time,
      breakMinutes: Number(s.break_minutes),
      workDurationHours: (s as any).work_duration_hours ? Number((s as any).work_duration_hours) : undefined,
      sortOrder: Number(s.sort_order),
    })) || [],
    workerCounts: contract.worker_counts?.map(w => ({
      workerCount: Number(w.worker_count),
      workDurationHours: Number(w.work_duration_hours),
      totalHours: Number(w.total_hours),
      sortOrder: Number(w.sort_order),
    })) || [],

    
    // Periodic specifics
    periodicSchedule: contract.periodic_schedule ? {
      frequencyPerYear: contract.periodic_schedule.frequency_per_year,
      workMonths: contract.periodic_schedule.work_months,
      workDays: contract.periodic_schedule.work_days,
    } : { frequencyPerYear: 1, workMonths: [], workDays: [] },
    
    // Other specifics
    workType: contract.work_type,
    subServiceType: contract.sub_service_type,
    workExecutionDate: contract.work_execution_date,
    
    // Holidays
    holidayRules: contract.holiday_rules?.map(h => ({
      ruleType: h.rule_type,
      action: h.action,
    })) || [],
  };
}
