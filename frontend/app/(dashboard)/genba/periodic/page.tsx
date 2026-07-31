"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useContracts } from "@/hooks/useContracts";
import { useCustomers } from "@/hooks/useCustomers";
import { useStaffList } from "@/hooks/useStaff";
import { DataTable, type Column } from "@/components/common/DataTable";
import type { ContractWithRelations } from "@/types/contract";
import { Search, Eye, Check, ChevronDown, Calendar, Layers, AlertTriangle, X, ExternalLink } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

export default function PeriodicGenbaListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentMonth = new Date().getMonth() + 1;

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState<string>(searchParams.get("status") ?? "ACTIVE");
  const [staffId, setStaffId] = useState<string>(searchParams.get("staffId") || "");
  const [customerIds, setCustomerIds] = useState<string[]>(searchParams.getAll("customerIds"));
  const [periodicMonth, setPeriodicMonth] = useState<number>(
    searchParams.get("periodicMonth") !== null
      ? Number(searchParams.get("periodicMonth"))
      : currentMonth
  );
  const [customerSearch, setCustomerSearch] = useState("");
  const [tooltip, setTooltip] = useState({ show: false, text: "", x: 0, y: 0 });
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [sortField, setSortField] = useState("genba_name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedContractForModal, setSelectedContractForModal] = useState<ContractWithRelations | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Restore search params from sessionStorage on initial load if URL has no search params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentParams = searchParams.toString();
      if (!currentParams) {
        const savedParams = sessionStorage.getItem("genba_periodic_list_params");
        if (savedParams) {
          router.replace(`${pathname}?${savedParams}`, { scroll: false });
        } else {
          // If no saved params, set the default month
          updateUrl({ periodicMonth: currentMonth });
        }
      } else {
        sessionStorage.setItem("genba_periodic_list_params", currentParams);
      }
    }
  }, []);

  // Sync URL -> state (for Back button and initial load)
  useEffect(() => {
    const currentParams = searchParams.toString();
    if (typeof window !== "undefined" && currentParams) {
      sessionStorage.setItem("genba_periodic_list_params", currentParams);
    }
    setSearch(searchParams.get("search") || "");
    setStatus(searchParams.get("status") ?? "ACTIVE");
    setStaffId(searchParams.get("staffId") || "");
    setCustomerIds(searchParams.getAll("customerIds"));
    setPeriodicMonth(
      searchParams.get("periodicMonth") !== null
        ? Number(searchParams.get("periodicMonth"))
        : currentMonth
    );
    setPage(Number(searchParams.get("page")) || 1);
  }, [searchParams]);

  const updateUrl = (updates: { search?: string, status?: string, staffId?: string, customerIds?: string[], periodicMonth?: number, page?: number }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (updates.search !== undefined) {
      if (updates.search) params.set("search", updates.search);
      else params.delete("search");
    }

    if (updates.status !== undefined) {
      if (updates.status) params.set("status", updates.status);
      else params.delete("status");
    }

    if (updates.staffId !== undefined) {
      if (updates.staffId) params.set("staffId", updates.staffId);
      else params.delete("staffId");
    }
    
    if (updates.periodicMonth !== undefined) {
      params.set("periodicMonth", updates.periodicMonth.toString());
    }

    if (updates.page !== undefined) {
      if (updates.page > 1) params.set("page", updates.page.toString());
      else params.delete("page");
    }

    if (updates.customerIds !== undefined) {
      params.delete("customerIds");
      updates.customerIds.forEach(id => params.append("customerIds", id));
    }

    const newParamsStr = params.toString();
    if (typeof window !== "undefined") {
      sessionStorage.setItem("genba_periodic_list_params", newParamsStr);
    }
    router.replace(`${pathname}?${newParamsStr}`, { scroll: false });
  };

  // Debounce search input to URL
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (search !== (searchParams.get("search") || "")) {
        updateUrl({ search, page: 1 });
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [search, searchParams]);

  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch contract data specifically for periodic service category
  const { data, isLoading } = useContracts({
    page,
    limit: 10,
    search: search || undefined,
    status: status || undefined,
    staff_id: staffId || undefined,
    customer_ids: customerIds.length > 0 ? customerIds : undefined,
    service_category: "PERIODIC",
    periodic_month: periodicMonth || undefined,
  });

  // Fetch customers for the filter dropdown
  const { data: customerData } = useCustomers({ limit: 100 });

  // Fetch staff for the internal staff filter dropdown
  const { data: staffData } = useStaffList({ limit: 100 });

  const filteredCustomers = customerData?.items.filter(c =>
    c.full_name.toLowerCase().includes(customerSearch.toLowerCase())
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

  const handleSortChange = (field: string, order: "asc" | "desc") => {
    setSortField(field);
    setSortOrder(order);
  };

  const toggleCustomer = (id: string) => {
    const next = customerIds.includes(id) ? customerIds.filter((i) => i !== id) : [...customerIds, id];
    setCustomerIds(next);
    setPage(1);
    updateUrl({ customerIds: next, page: 1 });
  };

  const monthColumns = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3].map((month) => ({
    header: `${month}`,
    accessorKey: `month_${month}` as any, // Dummy key
    className: "w-8 text-center !px-1",
    render: (row: ContractWithRelations) => {
      const schedule = row.periodic_schedule || (row as any).periodicSchedule;
      const workMonths = schedule?.work_months || schedule?.workMonths || [];
      const hasMonth = workMonths.includes(month);
      return (
        <span className="block text-center text-xs">
          {hasMonth ? <span className="text-slate-800 font-bold">⚫︎</span> : <span className="text-slate-400 font-medium">-</span>}
        </span>
      );
    }
  }));

  const columns: Column<ContractWithRelations>[] = [
    {
      header: "物件名",
      accessorKey: "genba_name",
      sortable: true,
      className: "min-w-[200px] max-w-none whitespace-normal",
      render: (row) => (
        <button
          type="button"
          onClick={() => {
            setSelectedContractForModal(row);
            setIsDetailModalOpen(true);
          }}
          className="text-[#1E60F2] hover:underline font-medium text-left cursor-pointer"
        >
          {row.genba_name || "-"}
        </button>
      ),
    },
    {
      header: "契約名",
      accessorKey: "contract_name",
      render: (row) => (
        <span className="text-slate-700">
          {row.contract_name || (row as any).contractName || "-"}
        </span>
      ),
    },
    {
      header: "取引先",
      accessorKey: "customer_name",
      render: (row) => (
        <span className="text-slate-700">
          {row.customer_name || "-"}
        </span>
      ),
    },
    {
      header: "金額",
      accessorKey: "amount",
      sortable: true,
      render: (row) => (
        <span className="text-slate-700 font-medium">
          ¥{Number(row.amount).toLocaleString()}
        </span>
      ),
    },
    {
      header: "年間回数",
      accessorKey: "frequency" as any, // dummy
      className: "w-24 whitespace-nowrap",
      render: (row) => {
        const schedule = row.periodic_schedule || (row as any).periodicSchedule;
        const frequency = schedule?.frequency_per_year || schedule?.frequencyPerYear;
        return (
          <span className="text-slate-700">
            {frequency ? `${frequency}回` : "-"}
          </span>
        );
      },
    },
    ...monthColumns,
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            定期現場一覧表
          </h1>
          <p className="text-sm text-slate-500">
            定期契約がある現場・作業の一覧を表示・管理します。
          </p>
        </div>
      </div>

      {/* Filters section */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end flex-wrap">
        {/* Search input */}
        <div className="w-full sm:w-[24rem]">
          <label className="block text-xs font-medium text-slate-600 mb-1">物件名・契約名</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="検索..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-[#1E60F2] focus:ring-1 focus:ring-[#1E60F2] transition-all placeholder:text-slate-400"
            />
          </div>
        </div>
        
        {/* Periodic Month Filter */}
        <div className="w-full sm:w-32">
          <label className="block text-xs font-medium text-slate-600 mb-1">実施月</label>
          <select
            value={periodicMonth}
            onChange={(e) => {
              const val = Number(e.target.value);
              setPeriodicMonth(val);
              setPage(1);
              updateUrl({ periodicMonth: val, page: 1 });
            }}
            className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#1E60F2] focus:ring-1 focus:ring-[#1E60F2] transition-all"
          >
            <option value="0">すべて</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{m}月</option>
            ))}
          </select>
        </div>

        {/* Customer Multi-select */}
        <div className="w-full sm:w-56 relative" ref={dropdownRef}>
          <label className="block text-xs font-medium text-slate-600 mb-1">取引先</label>
          <button
            type="button"
            onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
            title={customerData?.items.filter(c => customerIds.includes(c.id)).map(c => c.short_name).join(", ") || "取引先を選択"}
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
                      updateUrl({ customerIds: [], page: 1 });
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
                        text: cust.short_name,
                        x: e.clientX + 15,
                        y: e.clientY + 15
                      });
                    }}
                    onMouseMove={(e) => {
                      setTooltip(prev => ({
                        ...prev,
                        x: e.clientX + 15,
                        y: e.clientY + 15
                      }));
                    }}
                    onMouseLeave={() => setTooltip(prev => ({ ...prev, show: false }))}
                  >
                    <div className="flex h-4 w-4 items-center justify-center rounded border border-slate-300 mr-2 flex-shrink-0">
                      {customerIds.includes(cust.id) && (
                        <Check className="h-3 w-3 text-[#1E60F2]" />
                      )}
                    </div>
                    <span className="text-sm text-slate-700 truncate">{cust.short_name}</span>
                  </div>
                ))}
                {filteredCustomers.length === 0 && (
                  <div className="px-3 py-3 text-sm text-slate-500 text-center">データなし</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Internal Staff Filter */}
        <div className="w-full sm:w-48">
          <label className="block text-xs font-medium text-slate-600 mb-1">自社担当者</label>
          <select
            value={staffId}
            onChange={(e) => {
              setStaffId(e.target.value);
              setPage(1);
              updateUrl({ staffId: e.target.value, page: 1 });
            }}
            className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#1E60F2] focus:ring-1 focus:ring-[#1E60F2] transition-all"
          >
            <option value="">すべて</option>
            {staffData?.items?.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.last_name} {staff.first_name}
              </option>
            ))}
            <option value="UNASSIGNED">その他（未割り当て）</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="w-full sm:w-40">
          <label className="block text-xs font-medium text-slate-600 mb-1">ステータス</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
              updateUrl({ status: e.target.value, page: 1 });
            }}
            className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#1E60F2] focus:ring-1 focus:ring-[#1E60F2] transition-all"
          >
            <option value="">すべて</option>
            <option value="ACTIVE">稼働中</option>
            <option value="TERMINATED">管理終了</option>
          </select>
        </div>
      </div>

      {/* Table grid */}
      <div className="flex items-center justify-between mt-2">
        <div className="text-sm font-medium text-slate-700 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm inline-block">
          条件に一致する定期契約: <span className="text-lg font-bold text-[#1E60F2] mx-1">{data?.total ?? 0}</span> 件
        </div>
      </div>
      <div className="overflow-x-auto">
        <DataTable
          columns={columns}
          data={data?.items}
          isLoading={isLoading}
          totalCount={data?.total}
          page={page}
          limit={10}
          onPageChange={(val) => {
            setPage(val);
            updateUrl({ page: val });
          }}
          sortField={sortField}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          emptyMessage="該当する定期契約が見つかりません。"
        />
      </div>

      {/* Custom Tooltip */}
      {tooltip.show && (
        <div
          className="fixed z-50 rounded bg-slate-800 px-3 py-2 text-[15px] font-medium text-white shadow-lg pointer-events-none"
          style={{ top: tooltip.y, left: tooltip.x }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Genba & Periodic Contract Detail Popup Dialog */}
      <Dialog.Root open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white shadow-2xl focus:outline-none animate-in fade-in-50 zoom-in-95 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="shrink-0 flex items-start justify-between p-6 border-b border-slate-100 bg-slate-50/50 z-10">
              <div>
                <Dialog.Title className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#1E60F2]" />
                  <span>{selectedContractForModal?.genba_name || "物件詳細"}</span>
                </Dialog.Title>
                <Dialog.Description className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                  <span>取引先: <strong className="text-slate-700 font-semibold">{selectedContractForModal?.customer_name || "-"}</strong></span>
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {/* Section 1: 契約概要・実施月 */}
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Calendar className="h-4 w-4 text-[#1E60F2]" />
                  <span>契約概要・実施月</span>
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div>
                    <span className="block text-xs font-medium text-slate-500 mb-1">契約名</span>
                    <span className="text-sm font-bold text-slate-900">
                      {selectedContractForModal?.contract_name || (selectedContractForModal as any)?.contractName || selectedContractForModal?.service_type || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-slate-500 mb-1">金額</span>
                    <span className="text-sm font-bold text-slate-900">
                      ¥{Number(selectedContractForModal?.amount || 0).toLocaleString()}
                      {selectedContractForModal?.tax_type === "EXCLUSIVE" ? " (税抜)" : selectedContractForModal?.tax_type === "INCLUSIVE" ? " (税込)" : ""}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-slate-500 mb-1">年間回数</span>
                    <span className="text-sm font-bold text-slate-900">
                      {(() => {
                        const schedule = selectedContractForModal?.periodic_schedule || (selectedContractForModal as any)?.periodicSchedule;
                        const freq = schedule?.frequency_per_year || schedule?.frequencyPerYear;
                        return freq ? `${freq}回/年` : "-";
                      })()}
                    </span>
                  </div>
                </div>

                {/* 実施月 12ヶ月表示 (4月〜翌3月) */}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <span className="block text-xs font-medium text-slate-600 mb-2">実施月</span>
                  <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                    {[4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3].map((month) => {
                      const schedule = selectedContractForModal?.periodic_schedule || (selectedContractForModal as any)?.periodicSchedule;
                      const workMonths = schedule?.work_months || schedule?.workMonths || [];
                      const isSelected = workMonths.includes(month);
                      return (
                        <div
                          key={month}
                          className={`flex items-center justify-center h-8 rounded-lg text-xs font-bold border transition-all ${
                            isSelected
                              ? "bg-[#1E60F2] text-white border-[#1E60F2] shadow-sm"
                              : "bg-slate-50 text-slate-300 border-slate-200 opacity-40"
                          }`}
                        >
                          {month}月
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section 2: 作業内容 */}
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Layers className="h-4 w-4 text-[#1E60F2]" />
                  <span>作業内容</span>
                </h3>

                {selectedContractForModal?.periodic_work_contents && selectedContractForModal.periodic_work_contents.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                          <th className="py-2.5 px-3 w-24">階数</th>
                          <th className="py-2.5 px-3 w-40">場所・区域</th>
                          <th className="py-2.5 px-3">作業内容</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedContractForModal.periodic_work_contents
                          .sort((a, b) => a.sort_order - b.sort_order)
                          .map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 font-medium text-slate-700">{item.floor}</td>
                              <td className="py-2.5 px-3 text-slate-700">{item.area}</td>
                              <td className="py-2.5 px-3 text-slate-800 break-words">{item.work_content}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-2 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                    登録されている作業内容はありません。
                  </p>
                )}
              </div>

              {/* Section 3: 注意事項 / 留意事項 */}
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span>注意事項・留意点</span>
                </h3>
                
                {selectedContractForModal?.work_content_summary ? (
                  <div className="bg-amber-50/60 rounded-lg border border-amber-200 p-4 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {selectedContractForModal.work_content_summary}
                  </div>
                ) : selectedContractForModal?.work_description ? (
                  <div className="bg-amber-50/60 rounded-lg border border-amber-200 p-4 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {selectedContractForModal.work_description}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-2 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                    注意事項・留意事項はありません。
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50">
              {selectedContractForModal?.genba_id ? (
                <Link
                  href={`/genba/${selectedContractForModal.genba_id}/basic`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E60F2] hover:underline"
                >
                  <span>現場詳細画面を開く</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="h-9 px-4 rounded-lg bg-slate-200 hover:bg-slate-300 text-xs font-bold text-slate-700 transition-colors"
              >
                閉じる
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
