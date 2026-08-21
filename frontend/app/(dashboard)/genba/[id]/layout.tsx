"use client";
import { usePageHeader } from "@/hooks/usePageHeader";

import React from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useGenbaDetail } from "@/hooks/useGenba";
import { getRoleLabel } from "@/lib/auth";
import { Loader2, ArrowLeft, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { useCurrentUser } from "@/hooks/useAuth";

export default function GenbaDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const id = params.id as string;

  const { data: genba, isLoading, error } = useGenbaDetail(id);
  const { data: user } = useCurrentUser();

  usePageHeader(
    genba ? genba.property_name : null,
    genba ? (
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
            genba.status === "ACTIVE"
              ? "bg-emerald-50 text-emerald-700 ring-emerald-600/10"
              : "bg-slate-50 text-slate-600 ring-slate-500/10"
          )}
        >
          {genba.status === "ACTIVE" ? "稼働中" : "終了"}
        </span>
        <span>取引先: {genba.customer.full_name}</span>
      </div>
    ) : null,
    Building2
  );

  // Define tabs list
  const tabs = [
    { name: "基本情報", path: `/genba/${id}/basic` },
    { name: "契約", path: `/genba/${id}/contracts` },
    { name: "日常清掃", path: `/genba/${id}/daily` },
    { name: "定期清掃", path: `/genba/${id}/periodic` },
    { name: "鍵管理", path: `/genba/${id}/keys` },
    { name: "従業員", path: `/genba/${id}/workers` },
    { name: "入退館マニュアル", path: `/genba/${id}/entry-exit` },
    { name: "清掃用具", path: `/genba/${id}/equipment` },
    { name: "作業基準表", path: `/genba/${id}/standards` },
    { name: "写真", path: `/genba/${id}/photos` },
  ];

  // PARTNER has no memo/schedules access, and no key access
  if (user && user.role === "PARTNER") {
    // Remove 鍵管理 tab for Partner (no KEY_READ permission)
    const keyIdx = tabs.findIndex((t) => t.path.endsWith("/keys"));
    if (keyIdx !== -1) tabs.splice(keyIdx, 1);
  }

  if (user && user.role !== "PARTNER") {
    // Insert schedules before photos
    const photosIdx = tabs.findIndex((t) => t.path.endsWith("/photos"));
    tabs.splice(photosIdx, 0, { name: "勤務スケジュール", path: `/genba/${id}/schedules` });
    tabs.push({ name: "メモ", path: `/genba/${id}/memos` });
  }

  const handleBackToGenbaList = (e: React.MouseEvent) => {
    e.preventDefault();
    const savedParams = typeof window !== "undefined" ? sessionStorage.getItem("genba_list_params") : null;
    if (savedParams) {
      router.push(`/genba?${savedParams}`);
    } else {
      router.push("/genba");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !genba) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <h2 className="text-lg font-bold text-red-800">エラーが発生しました</h2>
        <p className="text-sm text-red-600 mt-2">現場データが見つかりませんでした。</p>
        <Link
          href="/genba"
          onClick={handleBackToGenbaList}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 mt-4"
        >
          <ArrowLeft className="h-4 w-4" />
          現場一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Back button and title */}
      <div className="flex flex-col gap-4">
        <div>
          <Link
            href="/genba"
            onClick={handleBackToGenbaList}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>現場一覧に戻る</span>
          </Link>
        </div>

      </div>

      {/* Tabs navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex flex-wrap -mb-px gap-6" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = pathname === tab.path || (tab.path.endsWith("/daily") && pathname.includes("/daily"));
            return (
              <Link
                key={tab.path}
                href={tab.path}
                className={cn(
                  "border-b-2 py-4 px-1 text-sm font-medium whitespace-nowrap transition-all duration-200",
                  isActive
                    ? "border-blue-600 text-blue-600 font-bold"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                )}
              >
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className="mt-2">{children}</div>
    </div>
  );
}
