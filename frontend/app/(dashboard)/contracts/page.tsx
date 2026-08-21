"use client";
import { usePageHeader } from "@/hooks/usePageHeader";

import React, { useState } from "react";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  useContracts,
  useContractDetail,
  useCreateContract,
  useUpdateContract,
} from "@/hooks/useContracts";
import { useCustomers } from "@/hooks/useCustomers";
import { usePartners } from "@/hooks/usePartners";
import { DataTable, type Column } from "@/components/common/DataTable";
import { ContractTypeSelector } from "@/components/contracts/ContractTypeSelector";
import { DailyContractForm } from "@/components/contracts/DailyContractForm";
import { PeriodicContractForm } from "@/components/contracts/PeriodicContractForm";
import { OtherContractForm } from "@/components/contracts/OtherContractForm";
import { mapContractToDefaultValues } from "@/lib/contractMapper";
import { Plus, Eye, PencilLine, Search, X, ShieldAlert, Loader2 , FileText } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import type { Contract } from "@/types/contract";

export default function ContractsPage() {
  usePageHeader("契約管理", "取引先との元請契約や協力会社への下請契約を管理します。", FileText);
  const { data: currentUser } = useCurrentUser();
  const canWrite = currentUser && ["ADMIN", "SENIOR_STAFF", "INTERNAL_STAFF"].includes(currentUser.role);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [contractType, setContractType] = useState<string>("");
  const [serviceCategory, setServiceCategory] = useState<string>("");
  const [status, setStatus] = useState<string>("ACTIVE");

  // Modals state
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [createFormType, setCreateFormType] = useState<"DAILY" | "PERIODIC" | "OTHER" | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [editContract, setEditContract] = useState<Contract | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Fetch contract detail if selected
  const { data: contractDetail, isLoading: isLoadingDetail } = useContractDetail(selectedContractId || "");
  const activeContract = contractDetail || editContract;

  // Queries & Mutations
  const { data: draftContracts } = useContracts({ status: "DRAFT,EXPIRED", limit: 1 });
  const { data: pendingContracts } = useContracts({ status: "PENDING_APPROVAL", limit: 1 });
  const draftCount = draftContracts?.total || 0;
  const pendingCount = pendingContracts?.total || 0;
  const { data: contractsData, isLoading: isLoadingContracts } = useContracts({
    page,
    limit,
    search: search || undefined,
    contract_type: contractType || undefined,
    service_category: serviceCategory || undefined,
    status: status || undefined,
  });

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

  const handleViewContract = (contract: Contract) => {
    setSelectedContractId(contract.id);
    setEditContract(contract);
    setIsReadOnly(true);
  };

  const handleEditContract = (contract: Contract) => {
    setSelectedContractId(contract.id);
    setEditContract(contract);
    setIsReadOnly(false);
  };

  const handleFormSuccess = () => {
    setCreateFormType(null);
    setEditContract(null);
    setSelectedContractId(null);
    setIsReadOnly(false);
  };

  const handleFormCancel = () => {
    setCreateFormType(null);
    setEditContract(null);
    setSelectedContractId(null);
    setIsReadOnly(false);
  };

  // Define columns for DataTable
  const columns: Column<Contract>[] = [
    {
      header: "現場名",
      render: (row) => (
        <button
          onClick={() => handleViewContract(row)}
          className="font-medium text-[#1E60F2] hover:underline text-left cursor-pointer transition-colors"
        >
          {row.genba_name || "-"}
        </button>
      ),
    },
    {
      header: "取引先 / 協力会社",
      render: (row) => {
        if (row.contract_type === "RECEIVING") {
          return (
            <div className="flex flex-col">
              <span className="font-medium text-slate-700">
                {row.customer_name || customerMap.get(row.customer_id || "") || "-"}
              </span>
              <span className="text-[10px] text-blue-600 font-semibold uppercase">元請</span>
            </div>
          );
        } else {
          return (
            <div className="flex flex-col">
              <span className="font-medium text-slate-700">
                {row.partner_name || partnerMap.get(row.partner_id || "") || "-"}
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
            onClick={() => handleViewContract(row)}
            title="詳細を見る"
            aria-label="詳細を見る"
            className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <Eye className="h-4 w-4" />
          </button>
        );
      },
    },
  ];

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
              onClick={() => {
                setIsSelectorOpen(true);
                setIsReadOnly(false);
              }}
              className="inline-flex items-center justify-center h-10 rounded-lg bg-[#1E60F2] px-4 text-sm font-semibold text-white hover:bg-[#0F4FD0] transition-colors shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              新規登録
            </button>
          </div>
        )}
      </div>

      {/* Filter and search controls */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end">
        {/* Search */}
        <div className="w-full sm:w-[24rem]">
          <label className="block text-xs font-medium text-slate-600 mb-1">フリーワード検索</label>
          <div className="relative">
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
        </div>

        {/* Contract Type Filter */}
        <div className="w-full sm:w-48">
          <label className="block text-xs font-medium text-slate-600 mb-1">契約種別</label>
          <select
            value={contractType}
            onChange={(e) => {
              setContractType(e.target.value);
              setPage(1);
            }}
            className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-white"
          >
            <option value="">すべて</option>
            <option value="RECEIVING">元請契約</option>
            <option value="ORDERING">下請契約</option>
          </select>
        </div>

        {/* Service Category Filter */}
        <div className="w-full sm:w-48">
          <label className="block text-xs font-medium text-slate-600 mb-1">業務区分</label>
          <select
            value={serviceCategory}
            onChange={(e) => {
              setServiceCategory(e.target.value);
              setPage(1);
            }}
            className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-white"
          >
            <option value="">すべて</option>
            <option value="DAILY">日常清掃</option>
            <option value="PERIODIC">定期清掃</option>
            <option value="OTHER">その他</option>
          </select>
        </div>


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

      {/* Tabs Filter */}
      <Tabs.Root value={status} onValueChange={(val) => { setStatus(val); setPage(1); }} className="w-full">
        <Tabs.List className="flex w-full overflow-x-auto border-b border-slate-200">
          <Tabs.Trigger
            value="ACTIVE"
            className="px-6 py-3 text-sm font-semibold text-slate-500 border-b-2 border-transparent data-[state=active]:border-[#1E60F2] data-[state=active]:text-[#1E60F2] transition-colors whitespace-nowrap"
          >
            有効
          </Tabs.Trigger>
          <Tabs.Trigger
            value="CANCELLED"
            className="px-6 py-3 text-sm font-semibold text-slate-500 border-b-2 border-transparent data-[state=active]:border-[#1E60F2] data-[state=active]:text-[#1E60F2] transition-colors whitespace-nowrap"
          >
            解約
          </Tabs.Trigger>
          <Tabs.Trigger
            value="DRAFT,EXPIRED"
            className="px-6 py-3 text-sm font-semibold text-slate-500 border-b-2 border-transparent data-[state=active]:border-[#1E60F2] data-[state=active]:text-[#1E60F2] transition-colors whitespace-nowrap flex items-center gap-2"
          >
            下書き
            {draftCount > 0 && (
              <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-white bg-red-500 rounded-full">
                {draftCount}
              </span>
            )}
          </Tabs.Trigger>
          <Tabs.Trigger
            value="PENDING_APPROVAL"
            className="px-6 py-3 text-sm font-semibold text-slate-500 border-b-2 border-transparent data-[state=active]:border-[#1E60F2] data-[state=active]:text-[#1E60F2] transition-colors whitespace-nowrap flex items-center gap-2"
          >
            承認待ち
            {pendingCount > 0 && (
              <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-white bg-red-500 rounded-full">
                {pendingCount}
              </span>
            )}
          </Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>

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
        open={!!createFormType || !!selectedContractId || !!editContract}
        onOpenChange={(open) => {
          if (!open) handleFormCancel();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-slate-50 shadow-2xl focus:outline-none animate-in fade-in-50 zoom-in-95 flex flex-col h-[90vh] max-h-[90vh] overflow-hidden">
            <div className="shrink-0 flex items-start justify-between p-6 border-b border-slate-200 bg-slate-50 z-10">
              <div>
                <div className="flex items-center gap-3">
                  <Dialog.Title className="text-2xl font-bold text-slate-900">
                    {createFormType ? "契約の新規登録" : isReadOnly ? "契約詳細" : "契約の編集"}
                  </Dialog.Title>
                  {activeContract && isReadOnly && canWrite && activeContract.status !== "CANCELLED" && (
                    <button
                      type="button"
                      onClick={() => setIsReadOnly(false)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1E60F2] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 shadow-sm"
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                      <span>編集する</span>
                    </button>
                  )}
                </div>
                <Dialog.Description className="text-sm text-slate-500 mt-1">
                  {isReadOnly ? "契約の登録内容を確認できます。" : "必要な項目を入力して保存してください。"}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors">
                  <X className="h-6 w-6" />
                </button>
              </Dialog.Close>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              {isLoadingDetail && selectedContractId ? (
                <div className="flex-1 flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#1E60F2]" />
                  <span className="ml-3 text-sm font-medium text-slate-600">契約情報を読み込み中...</span>
                </div>
              ) : createFormType === "DAILY" || activeContract?.service_category === "DAILY" ? (
                <DailyContractForm
                  defaultValues={activeContract ? mapContractToDefaultValues(activeContract) : undefined}
                  onSuccess={handleFormSuccess}
                  onCancel={handleFormCancel}
                  readOnly={isReadOnly}
                />
              ) : createFormType === "PERIODIC" || activeContract?.service_category === "PERIODIC" ? (
                <PeriodicContractForm
                  defaultValues={activeContract ? mapContractToDefaultValues(activeContract) : undefined}
                  onSuccess={handleFormSuccess}
                  onCancel={handleFormCancel}
                  readOnly={isReadOnly}
                />
              ) : createFormType === "OTHER" || activeContract?.service_category === "OTHER" ? (
                <OtherContractForm
                  defaultValues={activeContract ? mapContractToDefaultValues(activeContract) : undefined}
                  onSuccess={handleFormSuccess}
                  onCancel={handleFormCancel}
                  readOnly={isReadOnly}
                />
              ) : null}
            </div>
            
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
