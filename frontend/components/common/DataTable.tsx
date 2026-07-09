"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Inbox, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  header: string;
  accessorKey?: keyof T | string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  sortField?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data?: T[];
  isLoading?: boolean;
  totalCount?: number;
  page?: number;
  limit?: number;
  onPageChange?: (newPage: number) => void;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  onSortChange?: (field: string, order: "asc" | "desc") => void;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data = [],
  isLoading = false,
  totalCount = 0,
  page = 1,
  limit = 10,
  onPageChange,
  sortField,
  sortOrder,
  onSortChange,
  emptyMessage = "該当するデータがありません。",
}: DataTableProps<T>) {
  
  // Calculate paging info
  const totalPages = Math.ceil(totalCount / limit);
  const startRow = totalCount > 0 ? (page - 1) * limit + 1 : 0;
  const endRow = Math.min(page * limit, totalCount);

  const handleSort = (column: Column<T>) => {
    if (!column.sortable || !onSortChange) return;
    
    const field = column.sortField || (column.accessorKey as string);
    if (!field) return;

    if (sortField === field) {
      onSortChange(field, sortOrder === "asc" ? "desc" : "asc");
    } else {
      onSortChange(field, "asc");
    }
  };

  // Render sorting icon
  const renderSortIcon = (column: Column<T>) => {
    if (!column.sortable) return null;
    const field = column.sortField || (column.accessorKey as string);
    
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-blue-500 shrink-0" />
    ) : (
      <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-blue-500 shrink-0" />
    );
  };

  // Render table skeleton with at least 5 rows (ui-ux-genba-spec.md §5.2)
  if (isLoading) {
    return (
      <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-500">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-700 uppercase">
              <tr>
                {columns.map((col, idx) => (
                  <th key={idx} className="px-6 py-4 font-semibold">
                    <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 border-t border-slate-100">
              {Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/50">
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="px-6 py-4">
                      <div 
                        className={cn(
                          "h-4 bg-slate-200 rounded animate-pulse",
                          cIdx === 0 ? "w-3/4" : cIdx === 1 ? "w-1/2" : "w-1/3"
                        )} 
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Render empty state with minimum 240px height (ui-ux-genba-spec.md §5.3)
  if (data.length === 0) {
    return (
      <div className="w-full rounded-xl border border-slate-200 bg-white p-6">
        <div className="w-full overflow-x-auto mb-4">
          <table className="w-full border-collapse text-left text-sm text-slate-500">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-700 uppercase">
              <tr>
                {columns.map((col, idx) => (
                  <th key={idx} className="px-6 py-4 font-semibold">
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>
        <div className="flex h-60 flex-col items-center justify-center text-center">
          <Inbox className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-500">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  // Generate page numbers
  const pages: number[] = [];
  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(totalPages, page + 2);
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Table grid */}
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm text-slate-600">
          <thead className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-700">
            <tr>
              {columns.map((column, idx) => (
                <th
                  key={idx}
                  onClick={() => handleSort(column)}
                  className={cn(
                    "px-6 py-4 select-none font-semibold",
                    column.sortable && "cursor-pointer hover:bg-slate-100 group transition-colors"
                  )}
                >
                  <div className="flex items-center">
                    <span>{column.header}</span>
                    {renderSortIcon(column)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-50/50 transition-colors">
                {columns.map((column, cIdx) => {
                  const content = column.render
                    ? column.render(row)
                    : column.accessorKey
                    ? (row[column.accessorKey as keyof T] as React.ReactNode)
                    : null;

                  return (
                    <td key={cIdx} className="px-6 py-3.5 align-middle">
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {onPageChange && totalPages > 1 && (
        <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Row Count Messaging: {total}件中 {start}〜{end}件を表示 */}
          <div className="text-xs text-slate-500 text-center sm:text-left leading-normal">
            {totalCount}件中 {startRow}〜{endRow}件を表示
          </div>

          {/* Pagination buttons: w-10 h-10 touch targets, gap-1 */}
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {pages.map((p) => (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-all",
                  p === page
                    ? "bg-[#1E60F2] text-white"
                    : "bg-transparent text-slate-800 hover:bg-slate-100"
                )}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Simple footer for single page tables with items */}
      {(!onPageChange || totalPages <= 1) && data.length > 0 && (
        <div className="border-t border-slate-200 px-6 py-4 text-xs text-slate-500 text-center sm:text-left">
          {totalCount || data.length}件中 1〜{data.length}件を表示
        </div>
      )}
    </div>
  );
}
