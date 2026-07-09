"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Building2, Key, CalendarClock, Camera, ArrowLeft } from "lucide-react";
import { useGenbaDetail } from "@/hooks/useGenba";
import { Skeleton } from "@/components/ui/skeleton";

type TabValue = "basic" | "entry-exit" | "periodic" | "photos";

export default function PartnerGenbaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [activeTab, setActiveTab] = useState<TabValue>("basic");

  const { data: genba, isLoading } = useGenbaDetail(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!genba) {
    return (
      <div className="flex flex-col items-center justify-center h-60 text-center">
        <Building2 className="h-12 w-12 text-slate-300 mb-4" />
        <h2 className="text-lg font-semibold text-slate-700">該当する現場が見つかりません</h2>
        <p className="text-slate-500 mt-2">データが存在しないか、アクセス権限がありません。</p>
      </div>
    );
  }

  const tabs = [
    { id: "basic", label: "基本情報", icon: Building2 },
    { id: "entry-exit", label: "入退館マニュアル", icon: Key },
    { id: "periodic", label: "定期マニュアル", icon: CalendarClock },
    { id: "photos", label: "写真・報告", icon: Camera },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/partner/genba")}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {genba.property_name}
          </h1>
          <p className="text-sm text-slate-500">
            {genba.address}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabValue)}
                className={`
                  group inline-flex items-center gap-2 border-b-2 py-4 px-1 text-sm font-medium
                  ${isActive 
                    ? "border-blue-500 text-blue-600" 
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"}
                `}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-blue-500" : "text-slate-400 group-hover:text-slate-500"}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[400px]">
        {activeTab === "basic" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">基本情報</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-slate-500">物件名</dt>
                <dd className="mt-1 text-sm text-slate-900">{genba.property_name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">住所</dt>
                <dd className="mt-1 text-sm text-slate-900">{genba.address}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">ステータス</dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {genba.status === "ACTIVE" ? "稼働中" : "終了"}
                </dd>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === "entry-exit" && (
          <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500">
            <Key className="h-8 w-8 mb-2 opacity-50" />
            <p>入退館マニュアルデータは準備中です。</p>
          </div>
        )}
        
        {activeTab === "periodic" && (
          <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500">
            <CalendarClock className="h-8 w-8 mb-2 opacity-50" />
            <p>定期清掃計画のデータは準備中です。</p>
          </div>
        )}
        
        {activeTab === "photos" && (
          <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500">
            <Camera className="h-8 w-8 mb-2 opacity-50" />
            <p>作業報告用（WORK_REPORT）の写真アップロード機能は準備中です。</p>
          </div>
        )}
      </div>
    </div>
  );
}
