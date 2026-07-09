"use client";

import React, { useState } from "react";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  useContracts,
  useCreateContract,
  useUpdateContract,
} from "@/hooks/useContracts";
import { useGenbaList } from "@/hooks/useGenba";
import { useCustomers } from "@/hooks/useCustomers";
import { usePartners } from "@/hooks/usePartners";
import { DataTable, type Column } from "@/components/common/DataTable";
import { ContractTypeSelector } from "@/components/contracts/ContractTypeSelector";
import { DailyContractForm } from "@/components/contracts/DailyContractForm";
import { PeriodicContractForm } from "@/components/contracts/PeriodicContractForm";
import { OtherContractForm } from "@/components/contracts/OtherContractForm";
import { Plus, Edit2, Search, X, ShieldAlert } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import type { Contract } from "@/types/contract";

export default function ContractsPage() {
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

  // Queries & Mutations
  const { data: contractsData, isLoading: isLoadingContracts } = useContracts({
    page,
    limit,
    search: search || undefined,
    contract_type: contractType || undefined,
    status: status || undefined,
  });

  // Fetch lists for ID-to-Name mapping
  const { data: genbaList } = useGenbaList({ limit: 300 });
  const { data: customerList } = useCustomers({ limit: 300 });
  const { data: partnerList } = usePartners({ limit: 300 });

  const createContractMutation = useCreateContract();
  const updateContractMutation = useUpdateContract();

  // Helper maps
  const genbaMap = React.useMemo(() => {
    return new Map(genbaList?.items.map((g) => [g.id, g.property_name]));
  }, [genbaList]);

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
  };

  const handleFormCancel = () => {
    setCreateFormType(null);
    setEditContract(null);
  };

  // Define columns for DataTable
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
      header: "現場",
      render: (row) => (
        <span className="font-medium text-slate-700">
          {genbaMap.get(row.genba_id) || row.genba_id}
        </span>
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
              <span className="text-[10px] text-blue-600 font-semibold uppercase">元請</span>
            </div>
          );
        } else {
          return (
            <div className="flex flex-col">
              <span className="font-medium text-slate-700">
                {partnerMap.get(row.partner_id || "") || "-"}
              </span>
              <span className="text-[10px] text-amber-600 font-semibold uppercase">下請</span>
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
        // Partners cannot edit/write contracts
        const isPartner = currentUser?.role === "PARTNER";
        if (isPartner) return null;

        return (
          <button
            onClick={() => setEditContract(row)}
            className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        );
      },
    },
  ];

  const canWrite = currentUser?.role === "ADMIN" || currentUser?.role === "SENIOR_STAFF" || currentUser?.role === "INTERNAL_STAFF";

  return (
    <div className="flex flex-col gap-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            契約管理
          </h1>
          <p className="text-sm text-slate-500">
            元請契約（取引先との受注）および下請契約（協力会社への委託）の契約一覧を管理します。
          </p>
        </div>
        {canWrite && (
          <div>
            <button
              onClick={() => setIsSelectorOpen(true)}
              className="inline-flex items-center justify-center h-10 rounded-lg bg-[#1E60F2] px-4 text-sm font-semibold text-white hover:bg-[#0F4FD0] transition-colors shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              新規登録
            </button>
          </div>
        )}
      </div>

      {/* Filter and search controls */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="契約コードまたはフリーワードで検索..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full h-10 rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>

        {/* Contract Type Filter */}
        <select
          value={contractType}
          onChange={(e) => {
            setContractType(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        >
          <option value="">契約種別 (すべて)</option>
          <option value="RECEIVING">元請契約 (RECEIVING)</option>
          <option value="ORDERING">下請契約 (ORDERING)</option>
        </select>

        {/* Status Filter */}
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        >
          <option value="">ステータス (すべて)</option>
          <option value="DRAFT">下書き</option>
          <option value="PENDING_APPROVAL">承認待ち</option>
          <option value="ACTIVE">有効</option>
          <option value="EXPIRED">期限切れ</option>
          <option value="CANCELLED">解約</option>
        </select>
      </div>

      {/* RLS Warning / Informative Banner for Partners */}
      {currentUser?.role === "PARTNER" && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-4 text-sm text-blue-800">
          <ShieldAlert className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
          <div>
            <p className="font-semibold">表示範囲について</p>
            <p className="text-xs text-blue-700 mt-1">
              パートナー様アカウントでは、ご担当の「下請契約 (ORDERING)」のみが表示されます。
            </p>
          </div>
        </div>
      )}

      {/* Contracts DataTable */}
      <DataTable
        columns={columns}
        data={contractsData?.items}
        isLoading={isLoadingContracts}
        totalCount={contractsData?.total}
        page={page}
        limit={limit}
        onPageChange={setPage}
        emptyMessage="契約情報が登録されていません。"
      />

      {/* 1. Type Selector */}
      <ContractTypeSelector
        open={isSelectorOpen}
        onOpenChange={setIsSelectorOpen}
        onSelect={(type) => setCreateFormType(type)}
      />

      {/* 2. Specific Form Modals */}
      <Dialog.Root
        open={!!createFormType || !!editContract}
        onOpenChange={(open) => {
          if (!open) handleFormCancel();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
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
              {createFormType === "DAILY" || editContract?.service_category === "DAILY" ? (
                <DailyContractForm
                  defaultValues={editContract as any}
                  onSuccess={handleFormSuccess}
                  onCancel={handleFormCancel}
                />
              ) : createFormType === "PERIODIC" || editContract?.service_category === "PERIODIC" ? (
                <PeriodicContractForm
                  defaultValues={editContract as any}
                  onSuccess={handleFormSuccess}
                  onCancel={handleFormCancel}
                />
              ) : createFormType === "OTHER" || editContract?.service_category === "OTHER" ? (
                <OtherContractForm
                  defaultValues={editContract as any}
                  onSuccess={handleFormSuccess}
                  onCancel={handleFormCancel}
                />
              ) : null}
            </div>
            
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
