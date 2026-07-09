"use client";

import React from "react";
import Link from "next/link";
import { useGenbaList } from "@/hooks/useGenba";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, MapPin, ChevronRight } from "lucide-react";

export default function WorkerGenbaListPage() {
  const { data, isLoading } = useGenbaList({ limit: 100 });

  if (isLoading) {
    return (
      <div className="p-4 flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-4" />
            <Skeleton className="h-[52px] w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  const items = data?.items || [];

  if (items.length === 0) {
    return (
      <div className="p-4 h-[60vh] flex flex-col items-center justify-center text-center">
        <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h2 className="text-lg font-semibold text-slate-700">該当する現場が見つかりません</h2>
        <p className="text-sm text-slate-500 mt-2">現在、アサインされている現場はありません。</p>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      {items.map((genba) => (
        <div 
          key={genba.id} 
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 active:scale-[0.98] transition-transform"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 pr-4">
              <h2 className="text-base font-bold text-slate-900 leading-tight mb-1">
                {genba.property_name}
              </h2>
              <div className="flex items-start gap-1 text-slate-500 text-xs">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{genba.address}</span>
              </div>
            </div>
            <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-slate-50">
              <Building2 className="h-4 w-4 text-blue-500" />
            </div>
          </div>
          
          <Link
            href={`/my-genba/${genba.id}`}
            className="flex items-center justify-center w-full h-[52px] rounded-lg bg-[#1E60F2] text-white font-semibold text-base shadow hover:bg-[#0F4FD0] transition-colors"
          >
            現場詳細へ
            <ChevronRight className="h-5 w-5 ml-1" />
          </Link>
        </div>
      ))}
    </div>
  );
}
