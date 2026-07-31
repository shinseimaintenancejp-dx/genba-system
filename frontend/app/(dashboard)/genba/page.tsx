"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useGenbaList } from "@/hooks/useGenba";
import { useCustomers } from "@/hooks/useCustomers";
import { useStaffList } from "@/hooks/useStaff";
import { DataTable, type Column } from "@/components/common/DataTable";
import type { Genba } from "@/types/genba";
import { Plus, Search, Eye, Check, ChevronDown } from "lucide-react";

export default function GenbaListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState<string>(searchParams.get("status") ?? "ACTIVE");
  const [staffId, setStaffId] = useState<string>(searchParams.get("staffId") || "");
  const [customerIds, setCustomerIds] = useState<string[]>(searchParams.getAll("customerIds"));
  const [customerSearch, setCustomerSearch] = useState("");
  const [tooltip, setTooltip] = useState({ show: false, text: "", x: 0, y: 0 });
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [sortField, setSortField] = useState("property_name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Restore search params from sessionStorage on initial load if URL has no search params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentParams = searchParams.toString();
      if (!currentParams) {
        const savedParams = sessionStorage.getItem("genba_list_params");
        if (savedParams) {
          router.replace(`${pathname}?${savedParams}`, { scroll: false });
        }
      } else {
        sessionStorage.setItem("genba_list_params", currentParams);
      }
    }
  }, []);

  // Sync URL -> state (for Back button and initial load)
  useEffect(() => {
    const currentParams = searchParams.toString();
    if (typeof window !== "undefined" && currentParams) {
      sessionStorage.setItem("genba_list_params", currentParams);
    }
    setSearch(searchParams.get("search") || "");
    setStatus(searchParams.get("status") ?? "ACTIVE");
    setStaffId(searchParams.get("staffId") || "");
    setCustomerIds(searchParams.getAll("customerIds"));
    setPage(Number(searchParams.get("page")) || 1);
  }, [searchParams]);

  const updateUrl = (updates: { search?: string, status?: string, staffId?: string, customerIds?: string[], page?: number }) => {
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
      sessionStorage.setItem("genba_list_params", newParamsStr);
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

  // Fetch genba data
  const { data, isLoading } = useGenbaList({
    page,
    limit: 10,
    search: search || undefined,
    status: status || undefined,
    staff_id: staffId || undefined,
    customer_ids: customerIds.length > 0 ? customerIds : undefined,
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

  const columns: Column<Genba>[] = [
    {
      header: "物件名",
      accessorKey: "property_name",
      sortable: true,
      render: (row) => (
        <Link
          href={`/genba/${row.id}/basic`}
          className="text-[#1E60F2] hover:underline font-medium"
        >
          {row.property_name}
        </Link>
      ),
    },
    {
      header: "取引先",
      accessorKey: "customer",
      render: (row) => (
        <span className="text-slate-700">
          {row.customer ? row.customer.short_name : "-"}
        </span>
      ),
    },
    {
      header: "住所",
      accessorKey: "address",
      sortable: true,
    },
    {
      header: "自社担当者",
      accessorKey: "staff_assignments",
      render: (row) => {
        if (!row.staff_assignments || row.staff_assignments.length === 0) {
          return <span className="text-slate-400">-</span>;
        }
        const names = row.staff_assignments.map(s => `${s.staff.last_name} ${s.staff.first_name}`).join(", ");
        return <span className="text-slate-700">{names}</span>;
      }
    },
    {
      header: "日常",
      accessorKey: "has_daily_contract",
      render: (row) => (
        row.has_daily_contract ? <Check className="h-4 w-4 text-emerald-600" /> : null
      ),
    },
    {
      header: "定期",
      accessorKey: "has_periodic_contract",
      render: (row) => (
        row.has_periodic_contract ? <Check className="h-4 w-4 text-emerald-600" /> : null
      ),
    },
    {
      header: "管理状態",
      accessorKey: "status",
      render: (row) => (
        <span
          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ${row.status === "ACTIVE"
            ? "bg-emerald-50 text-emerald-700 ring-emerald-600/10"
            : "bg-slate-50 text-slate-600 ring-slate-500/10"
            }`}
        >
          {row.status === "ACTIVE" ? "稼働中" : "終了"}
        </span>
      ),
    },
    {
      header: "操作",
      render: (row) => (
        <Link
          href={`/genba/${row.id}/basic`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>詳細</span>
        </Link>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            現場一覧表
          </h1>
          <p className="text-sm text-slate-500">
            登録されている現場の一覧を表示・編集します。
          </p>
        </div>
        <div>
          <Link
            href="/genba/new"
            className="inline-flex items-center gap-2 h-10 rounded-lg bg-[#1E60F2] px-4 text-sm font-semibold text-white hover:bg-[#0F4FD0] transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>現場登録</span>
          </Link>
        </div>
      </div>

      {/* Filters section */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end">
        {/* Search input */}
        <div className="w-full sm:w-[36rem]">
          <label className="block text-xs font-medium text-slate-600 mb-1">物件名・住所</label>
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

        {/* Customer Multi-select */}
        <div className="w-full sm:w-64 relative" ref={dropdownRef}>
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
        <div className="w-full sm:w-48">
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
          条件に一致する現場: <span className="text-lg font-bold text-[#1E60F2] mx-1">{data?.total ?? 0}</span> 件
        </div>
      </div>
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
        emptyMessage="該当する現場が見つかりません。"
      />

      {/* Custom Tooltip (30% larger text) */}
      {tooltip.show && (
        <div
          className="fixed z-50 rounded bg-slate-800 px-3 py-2 text-[15px] font-medium text-white shadow-lg pointer-events-none"
          style={{ top: tooltip.y, left: tooltip.x }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
