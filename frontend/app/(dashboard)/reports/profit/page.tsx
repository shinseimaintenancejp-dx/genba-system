"use client";

import React, { useState } from "react";
import { useCurrentUser } from "@/hooks/useAuth";
import { useProfitReport } from "@/hooks/useReports";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Search, TrendingUp, Calendar, Download } from "lucide-react";
import type { ProfitReportItem } from "@/hooks/useReports";
import { formatCurrency } from "@/lib/utils"; // Assumes util exists, else simple fallback

export default function ProfitReportPage() {
  const { data: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "SENIOR_STAFF";

  const today = new Date();
  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth() + 1);
  const [search, setSearch] = useState("");

  const { data: report, isLoading } = useProfitReport(year, month);

  // Fallback formatter
  const formatMoney = (val: number | undefined | null) => {
    if (val == null) return "¥0";
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const columns: Column<ProfitReportItem>[] = [
    {
      header: "現場名",
      render: (row) => (
        <span className="font-medium text-slate-800">{row.genba_name}</span>
      ),
    },
    {
      header: "売上 (元請金額)",
      render: (row) => (
        <span className="text-slate-700">{formatMoney(row.revenue)}</span>
      ),
    },
    {
      header: "外注費 (協力会社)",
      render: (row) => (
        <span className="text-orange-600">{formatMoney(row.partner_cost)}</span>
      ),
    },
    {
      header: "自社人件費",
      render: (row) => (
        <span className="text-slate-500">{formatMoney(row.inhouse_cost)}</span>
      ),
    },
    {
      header: "利益額",
      render: (row) => (
        <span className={`font-semibold ${row.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
          {formatMoney(row.profit)}
        </span>
      ),
    },
    {
      header: "利益率",
      render: (row) => (
        <span className={`font-semibold ${row.profit_margin >= 20 ? "text-green-600" : row.profit_margin >= 0 ? "text-blue-600" : "text-red-600"}`}>
          {row.profit_margin.toFixed(1)}%
        </span>
      ),
    },
  ];

  const filteredItems = report?.genbas.filter(g => g.genba_name.toLowerCase().includes(search.toLowerCase())) || [];

  if (!isAdmin) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center text-slate-500">
          <p className="mb-2 text-lg font-semibold">アクセス権限がありません</p>
          <p className="text-sm">このページは管理者または上位スタッフのみアクセス可能です。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-[#1E60F2]" />
            現場別利益レポート
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            各現場の元請契約による売上と、下請契約・自社施工による原価・利益を月別に確認します。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1">
            <Calendar className="h-4 w-4 ml-2 text-slate-400" />
            <input 
              type="number" 
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-16 h-8 border-none text-sm focus:ring-0 text-center"
            />
            <span className="text-sm text-slate-400">年</span>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="h-8 border-none text-sm focus:ring-0 outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}月</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Download className="mr-2 h-4 w-4" />
            CSV出力
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">総売上 (元請)</p>
          <div className="mt-2 text-3xl font-bold text-slate-800">
            {formatMoney(report?.total_revenue)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">総外注費 (下請)</p>
          <div className="mt-2 text-3xl font-bold text-orange-600">
            {formatMoney(report?.total_partner_cost)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">総利益額</p>
          <div className="mt-2 text-3xl font-bold text-green-600">
            {formatMoney(report?.total_profit)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">平均利益率</p>
          <div className="mt-2 text-3xl font-bold text-[#1E60F2]">
            {report?.total_profit_margin.toFixed(1) || "0.0"}%
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end">
        <div className="w-full sm:w-[24rem]">
          <label className="block text-xs font-medium text-slate-600 mb-1">現場名検索</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="現場名で絞り込み..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredItems}
        isLoading={isLoading}
        emptyMessage="対象月のデータがありません。"
      />
    </div>
  );
}
