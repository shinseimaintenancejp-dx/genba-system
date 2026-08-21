"use client";
import { usePageHeader } from "@/hooks/usePageHeader";

import React, { useState, useRef, useEffect } from "react";
import { useCurrentUser } from "@/hooks/useAuth";
import { useContracts, useContractDetail } from "@/hooks/useContracts";
import { useCustomers } from "@/hooks/useCustomers";
import { DataTable, type Column } from "@/components/common/DataTable";
import { ContractTypeSelector } from "@/components/contracts/ContractTypeSelector";
import { DailyContractForm } from "@/components/contracts/DailyContractForm";
import { PeriodicContractForm } from "@/components/contracts/PeriodicContractForm";
import { OtherContractForm } from "@/components/contracts/OtherContractForm";
import { mapContractToDefaultValues } from "@/lib/contractMapper";
import { Plus, Eye, PencilLine, Search, X, Users, ChevronDown, Check, Loader2 , FileText } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import type { Contract } from "@/types/contract";

export default function ReceivingContractsPage() {
  usePageHeader("取引先契約", "取引先（顧客）との元請契約を管理します。", FileText);
  const { data: currentUser } = useCurrentUser();
  const canWrite = currentUser && ["ADMIN", "SENIOR_STAFF", "INTERNAL_STAFF"].includes(currentUser.role);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [serviceCategory, setServiceCategory] = useState<string>("");
  const [status, setStatus] = useState<string>("ACTIVE");
  const [customerIds, setCustomerIds] = useState<string[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [tooltip, setTooltip] = useState({ show: false, text: "", x: 0, y: 0 });
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Modal state
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [createFormType, setCreateFormType] = useState<"DAILY" | "PERIODIC" | "OTHER" | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [editContract, setEditContract] = useState<Contract | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Fetch contract detail if selected
  const { data: contractDetail, isLoading: isLoadingDetail } = useContractDetail(selectedContractId || "");
  const activeContract = contractDetail || editContract;

  // Fixed contract_type = RECEIVING for this page
  
  const { data: draftContracts } = useContracts({ contract_type: "RECEIVING", status: "DRAFT,EXPIRED", limit: 1 });
  const { data: pendingContracts } = useContracts({ contract_type: "RECEIVING", status: "PENDING_APPROVAL", limit: 1 });
  const draftCount = draftContracts?.total || 0;
  const pendingCount = pendingContracts?.total || 0;
const { data: contractsData, isLoading: isLoadingContracts } = useContracts({
    page,
    limit,
    search: search || undefined,
    contract_type: "RECEIVING",
    customer_ids: customerIds.length > 0 ? customerIds : undefined,
    service_category: serviceCategory || undefined,
    status: status || undefined,
  });

  const { data: customerList } = useCustomers({ limit: 300 });

  const customerMap = React.useMemo(() => {
    return new Map(customerList?.items.map((c) => [c.id, c.short_name || c.full_name]));
  }, [customerList]);

  const filteredCustomers = customerList?.items.filter(c =>
    (c.short_name || c.full_name).toLowerCase().includes(customerSearch.toLowerCase())
  ) || [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleCustomer = (id: string) => {
    const next = customerIds.includes(id) ? customerIds.filter((i) => i !== id) : [...customerIds, id];
    setCustomerIds(next);
    setPage(1);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(val);

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
      header: "契約名",
      render: (row) => (
        <span className="font-medium text-slate-800">
          {row.contract_name || "-"}
        </span>
      ),
    },
    {
      header: "取引先",
      render: (row) => (
        <span className="font-medium text-slate-700">
          {customerMap.get(row.customer_id || "") || row.customer_name || "-"}
        </span>
      ),
    },
    {
      header: "金額 (税別)",
      render: (row) => (
        <span className="font-semibold text-slate-800">{formatCurrency(row.amount)}</span>
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
        const statusMap: Record<string, { styles: string; label: string }> = {
          ACTIVE: { styles: "bg-green-50 text-green-700 border border-green-200", label: "有効" },
          DRAFT: { styles: "bg-slate-50 text-slate-700 border border-slate-200", label: "下書き" },
          PENDING_APPROVAL: { styles: "bg-amber-50 text-amber-700 border border-amber-200", label: "承認待ち" },
          EXPIRED: { styles: "bg-red-50 text-red-700 border border-red-200", label: "期限切れ" },
          CANCELLED: { styles: "bg-zinc-100 text-zinc-700 border border-zinc-200", label: "解約" },
        };
        const s = statusMap[row.status] ?? { styles: "bg-slate-50 text-slate-700 border border-slate-200", label: row.status };
        return (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${s.styles}`}>
            {s.label}
          </span>
        );
      },
    },
    {
      header: "操作",
      render: (row) => {
        if (currentUser?.role === "PARTNER") return null;
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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <Users className="h-5 w-5 text-[#1E60F2]" />
          </div>
          
        </div>
        {canWrite && (
          <button
            onClick={() => {
              setIsSelectorOpen(true);
              setIsReadOnly(false);
            }}
            id="btn-receiving-new"
            className="inline-flex items-center justify-center h-10 rounded-lg bg-[#1E60F2] px-4 text-sm font-semibold text-white hover:bg-[#0F4FD0] transition-colors shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            新規登録
          </button>
        )}
      </div>

      {/* Search and filters toolbar */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end">
        <div className="w-full sm:w-[24rem]">
          <label className="block text-xs font-medium text-slate-600 mb-1">フリーワード検索</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              id="input-receiving-search"
              placeholder="現場名・取引先・契約コードで検索..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full h-10 rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Customer Multi-select Dropdown matching 現場一覧表 */}
        <div className="w-full sm:w-64 relative" ref={dropdownRef}>
          <label className="block text-xs font-medium text-slate-600 mb-1">取引先</label>
          <button
            type="button"
            onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
            title={customerList?.items.filter(c => customerIds.includes(c.id)).map(c => c.short_name || c.full_name).join(", ") || "取引先を選択"}
            className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm flex items-center justify-between hover:bg-slate-50 transition-colors focus:outline-none focus:border-[#1E60F2] focus:ring-1 focus:ring-[#1E60F2]"
          >
            <span className="truncate text-slate-700">
              {customerIds.length === 0
                ? "すべて"
                : `${customerIds.length}件選択中`}
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {isCustomerDropdownOpen && (
            <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg overflow-hidden flex flex-col">
              <div className="p-2 border-b border-slate-100">
                <input
                  type="text"
                  placeholder="取引先を検索..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-[#1E60F2] transition-colors"
                />
              </div>
              <div className="max-h-60 overflow-auto py-1">
                {customerIds.length > 0 && (
                  <div
                    className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer text-[#1E60F2] font-medium border-b border-slate-100"
                    onClick={() => {
                      setCustomerIds([]);
                      setPage(1);
                    }}
                  >
                    <span className="text-sm">選択をすべてクリア</span>
                  </div>
                )}
                {filteredCustomers.map((cust) => (
                  <div
                    key={cust.id}
                    className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer"
                    onClick={() => toggleCustomer(cust.id)}
                    onMouseEnter={(e) => {
                      setTooltip({
                        show: true,
                        text: cust.short_name || cust.full_name,
                        x: e.clientX + 15,
                        y: e.clientY + 15,
                      });
                    }}
                    onMouseMove={(e) => {
                      setTooltip((prev) => ({
                        ...prev,
                        x: e.clientX + 15,
                        y: e.clientY + 15,
                      }));
                    }}
                    onMouseLeave={() => setTooltip((prev) => ({ ...prev, show: false }))}
                  >
                    <div className="flex h-4 w-4 items-center justify-center rounded border border-slate-300 mr-2 flex-shrink-0">
                      {customerIds.includes(cust.id) && (
                        <Check className="h-3 w-3 text-[#1E60F2]" />
                      )}
                    </div>
                    <span className="text-sm text-slate-700 truncate">{cust.short_name || cust.full_name}</span>
                  </div>
                ))}
                {filteredCustomers.length === 0 && (
                  <div className="px-3 py-3 text-sm text-slate-500 text-center">データなし</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="w-full sm:w-48">
          <label className="block text-xs font-medium text-slate-600 mb-1">業務区分</label>
          <select
            id="select-receiving-service-category"
            value={serviceCategory}
            onChange={(e) => { setServiceCategory(e.target.value); setPage(1); }}
            className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-white"
          >
            <option value="">すべて</option>
            <option value="DAILY">日常清掃</option>
            <option value="PERIODIC">定期清掃</option>
            <option value="OTHER">その他</option>
          </select>
        </div>

        <div className="w-full sm:w-48">
          <label className="block text-xs font-medium text-slate-600 mb-1">ステータス</label>
          <select
            id="select-receiving-status"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-white"
          >
            <option value="">すべて</option>
            <option value="DRAFT">下書き</option>
            <option value="PENDING_APPROVAL">承認待ち</option>
            <option value="ACTIVE">有効</option>
            <option value="EXPIRED">期限切れ</option>
            <option value="CANCELLED">解約</option>
          </select>
        </div>
      </div>

      {/* DataTable */}
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

      <DataTable
        columns={columns}
        data={contractsData?.items}
        isLoading={isLoadingContracts}
        totalCount={contractsData?.total}
        page={page}
        limit={limit}
        onPageChange={setPage}
        emptyMessage="取引先契約が登録されていません。"
      />

      {/* Type Selector */}
      <ContractTypeSelector
        open={isSelectorOpen}
        onOpenChange={setIsSelectorOpen}
        onSelect={(type) => setCreateFormType(type)}
      />

      {/* Form Modal */}
      <Dialog.Root
        open={!!createFormType || !!selectedContractId || !!editContract}
        onOpenChange={(open) => { if (!open) handleFormCancel(); }}
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
      {/* Floating Tooltip */}
      {tooltip.show && (
        <div
          className="fixed z-50 rounded bg-slate-900 px-2 py-1 text-xs text-white shadow-md pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
