"use client";

import React, { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useGenbaDetail } from "@/hooks/useGenba";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Key, CalendarClock, Camera, ArrowLeft, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

type TabValue = "basic" | "entry-exit" | "periodic" | "photos";

export default function WorkerGenbaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  
  // Use URL parameter for tab state, fallback to "basic"
  const tabFromUrl = searchParams.get("tab") as TabValue | null;
  const [activeTab, setActiveTab] = useState<TabValue>(tabFromUrl || "basic");

  const handleTabChange = (tab: TabValue) => {
    setActiveTab(tab);
    router.replace(`?tab=${tab}`, { scroll: false });
  };

  const { data: genba, isLoading } = useGenbaDetail(id);

  // Mock mutation for check-in/out as requested in review
  const { mutate: checkInOut, isPending: isChecking } = useMutation({
    mutationFn: async (type: "in" | "out") => {
      console.log(`Mocking attendance check-${type} for genba ${id}`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: (data, type) => {
      alert(`[MOCK] Check-${type} successful!`);
    }
  });

  if (isLoading) {
    return (
      <div className="p-4 flex flex-col gap-6">
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-[52px] flex-1 rounded-lg" />
          <Skeleton className="h-[52px] flex-1 rounded-lg" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!genba) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4">
        <Building2 className="h-12 w-12 text-slate-300 mb-4" />
        <h2 className="text-lg font-semibold text-slate-700">現場が見つかりません</h2>
        <button
          onClick={() => router.push("/my-genba")}
          className="mt-6 flex items-center justify-center h-[52px] w-full rounded-lg bg-slate-100 text-slate-700 font-semibold active:bg-slate-200"
        >
          一覧に戻る
        </button>
      </div>
    );
  }

  const tabs = [
    { id: "basic", label: "基本情報", icon: Building2 },
    { id: "entry-exit", label: "入退館", icon: Key },
    { id: "periodic", label: "定期", icon: CalendarClock },
    { id: "photos", label: "報告", icon: Camera },
  ] as const;

  return (
    <div className="flex flex-col">
      {/* Header Info Card */}
      <div className="bg-white border-b border-slate-200 p-4 sticky top-14 z-40">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.push("/my-genba")}
            className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 active:bg-slate-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-900 leading-snug">
              {genba.property_name}
            </h1>
            <div className="flex items-start gap-1 text-slate-500 text-xs mt-1">
              <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{genba.address}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Check In / Out Buttons */}
      <div className="p-4 bg-slate-50 flex gap-3">
        <button 
          onClick={() => checkInOut("in")}
          disabled={isChecking}
          className="flex-1 flex flex-col items-center justify-center h-[72px] rounded-xl bg-blue-50 text-blue-700 font-bold border border-blue-200 active:bg-blue-100 shadow-sm transition-colors disabled:opacity-50"
        >
          <Clock className="h-5 w-5 mb-1" />
          <span>出勤する</span>
        </button>
        <button 
          onClick={() => checkInOut("out")}
          disabled={isChecking}
          className="flex-1 flex flex-col items-center justify-center h-[72px] rounded-xl bg-rose-50 text-rose-700 font-bold border border-rose-200 active:bg-rose-100 shadow-sm transition-colors disabled:opacity-50"
        >
          <Clock className="h-5 w-5 mb-1" />
          <span>退勤する</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white border-y border-slate-200">
        <nav className="flex items-center justify-between px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as TabValue)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 py-3 gap-1 border-b-2 transition-colors",
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 active:bg-slate-50"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive ? "text-blue-600" : "text-slate-400")} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content Area */}
      <div className="p-4 bg-slate-50 min-h-[300px]">
        {activeTab === "basic" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-1">物件名</div>
              <div className="text-sm font-medium text-slate-900">{genba.property_name}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-1">住所</div>
              <div className="text-sm font-medium text-slate-900">{genba.address}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-1">特記事項</div>
              <div className="text-sm text-slate-900 whitespace-pre-wrap">
                {genba.special_notes || "特記事項はありません。"}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === "entry-exit" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center">
            <Key className="h-10 w-10 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-600">入退館マニュアルは準備中です</p>
          </div>
        )}
        
        {activeTab === "periodic" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center">
            <CalendarClock className="h-10 w-10 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-600">定期清掃マニュアルは準備中です</p>
          </div>
        )}
        
        {activeTab === "photos" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center text-center gap-4">
            <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center">
              <Camera className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 mb-1">作業報告・写真アップロード</p>
              <p className="text-xs text-slate-500">この機能は現在準備中です</p>
            </div>
            <button disabled className="mt-2 h-[52px] w-full rounded-lg bg-blue-600 text-white font-bold opacity-50 cursor-not-allowed">
              写真を撮影する
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
