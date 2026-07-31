"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useGenbaList } from "@/hooks/useGenba";
import { DataTable, type Column } from "@/components/common/DataTable";
import { formatDateJST } from "@/lib/utils";
import type { Genba } from "@/types/genba";
import { Search, Eye } from "lucide-react";

export default function PartnerGenbaListPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("ACTIVE");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState("property_name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Fetch genba data
  const { data, isLoading } = useGenbaList({
    page,
    limit: 10,
    search: search || undefined,
    status: status || undefined,
  });

  const handleSortChange = (field: string, order: "asc" | "desc") => {
    setSortField(field);
    setSortOrder(order);
  };

  const columns: Column<Genba>[] = [
    {
      header: "物件名",
      accessorKey: "property_name",
      sortable: true,
    },
    {
      header: "住所",
      accessorKey: "address",
      sortable: true,
    },
    {
      header: "管理状態",
      accessorKey: "status",
      render: (row) => (
        <span
          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ${
            row.status === "ACTIVE"
              ? "bg-emerald-50 text-emerald-700 ring-emerald-600/10"
              : "bg-slate-50 text-slate-600 ring-slate-500/10"
          }`}
        >
          {row.status === "ACTIVE" ? "稼働中" : "終了"}
        </span>
      ),
    },
    {
      header: "管理開始日",
      accessorKey: "management_start_date",
      render: (row) => formatDateJST(row.management_start_date),
      sortable: true,
    },
    {
      header: "操作",
      render: (row) => (
        <Link
          href={`/partner/genba/${row.id}`}
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
            担当現場一覧
          </h1>
          <p className="text-sm text-slate-500">
            担当している現場の一覧を表示します。
          </p>
        </div>
      </div>

      {/* Filters section */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="物件名や住所で検索..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); // Reset to first page
            }}
            className="w-full h-10 rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Status Filter */}
        <div className="w-full sm:w-48">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          >
            <option value="">すべて</option>
            <option value="ACTIVE">稼働中 (ACTIVE)</option>
            <option value="TERMINATED">管理終了 (TERMINATED)</option>
          </select>
        </div>
      </div>

      {/* Table grid */}
      <DataTable
        columns={columns}
        data={data?.items}
        isLoading={isLoading}
        totalCount={data?.total}
        page={page}
        limit={10}
        onPageChange={setPage}
        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        emptyMessage="該当する現場が見つかりません。"
      />
    </div>
  );
}
