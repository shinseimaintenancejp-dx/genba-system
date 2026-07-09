"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGenbaDetail, useTerminateGenba } from "@/hooks/useGenba";
import { formatDateJST } from "@/lib/utils";
import { AlertTriangle, Loader2, PowerOff, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

export default function GenbaBasicPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: genba, isLoading } = useGenbaDetail(id);
  const terminateMutation = useTerminateGenba();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleTerminate = () => {
    terminateMutation.mutate(id, {
      onSuccess: () => {
        setShowConfirm(false);
      },
    });
  };

  if (isLoading || !genba) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 animate-pulse flex flex-col gap-4">
        <div className="h-6 w-1/4 bg-slate-200 rounded" />
        <div className="h-4 w-3/4 bg-slate-200 rounded" />
        <div className="h-4 w-1/2 bg-slate-200 rounded" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Information card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <h2 className="text-base font-bold text-slate-900">現場基本情報</h2>
          
          {/* Terminate button - only display if ACTIVE */}
          {genba.status === "ACTIVE" && (
            <button
              onClick={() => setShowConfirm(true)}
              className="inline-flex items-center gap-1.5 h-10 rounded-lg bg-[#F83B3B] hover:bg-[#E51E1E] px-4 text-sm font-semibold text-white transition-colors"
            >
              <PowerOff className="h-4 w-4" />
              <span>管理終了</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Property Name */}
          <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
            <span className="text-xs text-slate-500 font-medium">物件名</span>
            <span className="text-sm font-semibold text-slate-800">{genba.property_name}</span>
          </div>

          {/* Genba Type */}
          <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
            <span className="text-xs text-slate-500 font-medium">現場タイプ</span>
            <span className="text-sm font-semibold text-slate-800">
              {genba.genba_type === "MANSION" ? "マンション" :
               genba.genba_type === "OFFICE_BUILDING" ? "オフィスビル" :
               genba.genba_type === "LOGISTICS_CENTER" ? "物流センター" :
               genba.genba_type === "OTHER" ? `その他 (${genba.genba_type_other || "-"})` : "-"}
            </span>
          </div>

          {/* Customer */}
          <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
            <span className="text-xs text-slate-500 font-medium">取引先</span>
            <span className="text-sm font-semibold text-slate-800">{genba.customer.full_name}</span>
          </div>

          {/* Address */}
          <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
            <span className="text-xs text-slate-500 font-medium">住所</span>
            <span className="text-sm font-semibold text-slate-800">{genba.address}</span>
          </div>

          {/* Floor Counts */}
          <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
            <span className="text-xs text-slate-500 font-medium">階数</span>
            <span className="text-sm font-semibold text-slate-800">
              {genba.floor_above_ground != null ? `地上${genba.floor_above_ground}階` : ""}
              {genba.floor_above_ground != null && genba.floor_basement != null ? " / " : ""}
              {genba.floor_basement != null ? `地下${genba.floor_basement}階` : ""}
              {genba.floor_above_ground == null && genba.floor_basement == null ? "-" : ""}
            </span>
          </div>

          {/* Management Start Date */}
          <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
            <span className="text-xs text-slate-500 font-medium">管理開始日</span>
            <span className="text-sm font-semibold text-slate-800">
              {formatDateJST(genba.management_start_date)}
            </span>
          </div>

          {/* Phone Number */}
          <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
            <span className="text-xs text-slate-500 font-medium">現地電話番号</span>
            <span className="text-sm font-semibold text-slate-800">{genba.phone || "-"}</span>
          </div>

          {/* Transportation */}
          <div className="flex flex-col gap-1 border-b border-slate-100 pb-3 md:col-span-2">
            <span className="text-xs text-slate-500 font-medium">交通手段</span>
            <span className="text-sm font-semibold text-slate-800">{genba.transportation || "-"}</span>
          </div>

          {/* External Partner Code */}
          <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
            <span className="text-xs text-slate-500 font-medium">外部連携コード (協力会社コード)</span>
            <span className="text-sm font-semibold text-slate-800">{genba.external_partner_code || "-"}</span>
          </div>

          {/* Empty column */}
          <div className="hidden md:block border-b border-slate-100 pb-3" />

          {/* Special Notes */}
          <div className="flex flex-col gap-1 md:col-span-2">
            <span className="text-xs text-slate-500 font-medium">特記事項</span>
            <div className="mt-1 rounded-lg bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed border border-slate-100">
              {genba.special_notes || "特記事項はありません。"}
            </div>
          </div>
        </div>
      </div>

      {/* Contacts & Staff Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Contacts */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">取引先 担当者情報</h2>
          {genba.contacts && genba.contacts.length > 0 ? (
            <div className="flex flex-col gap-3">
              {genba.contacts.map(contact => (
                <div key={contact.id} className="flex flex-col bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <span className="text-sm font-semibold text-slate-800">{contact.full_name}</span>
                  {(contact.position || contact.phone || contact.email) && (
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                      {contact.position && <span className="bg-white border border-slate-200 px-2 py-0.5 rounded">{contact.position}</span>}
                      {contact.phone && <span>📞 {contact.phone}</span>}
                      {contact.email && <span>✉️ {contact.email}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">登録されている担当者はいません。</p>
          )}
        </div>

        {/* Staff Assignments */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">自社 担当者情報</h2>
          {genba.staff_assignments && genba.staff_assignments.length > 0 ? (
            <div className="flex flex-col gap-3">
              {genba.staff_assignments.map(assignment => (
                <div key={assignment.id} className="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-800">{assignment.staff.full_name}</span>
                    {assignment.staff.position && <span className="text-xs text-slate-500 mt-0.5">{assignment.staff.position}</span>}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${assignment.role_type === 'MAIN' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'}`}>
                    {assignment.role_type === 'MAIN' ? '主担当' : '副担当'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">担当者が割り当てられていません。</p>
          )}
        </div>
      </div>

      {/* 2-Way Terminate Confirmation Dialog (ui-ux-genba-spec.md §4.2) */}
      <Dialog.Root open={showConfirm} onOpenChange={setShowConfirm}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl focus:outline-none animate-in fade-in-50 zoom-in-95">
            
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-6 w-6 shrink-0" />
                <Dialog.Title className="text-lg font-bold text-slate-900">
                  現場の管理を終了しますか？
                </Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            {/* Content */}
            <div className="text-sm text-slate-600 mb-6 leading-relaxed">
              <p className="mb-2 font-semibold text-slate-800">
                物件名: {genba.property_name}
              </p>
              <p>
                管理を終了すると、この現場に対する新規の勤務割当や報告書の作成などの操作が一部制限されます。この操作は取り消せません。
              </p>
            </div>

            {/* Buttons: Cancel left, Confirm (Delete color) right */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                キャンセル
              </button>
              
              <button
                type="button"
                onClick={handleTerminate}
                disabled={terminateMutation.isPending}
                className="inline-flex items-center justify-center h-10 rounded-lg bg-[#F83B3B] hover:bg-[#E51E1E] px-4 text-sm font-semibold text-white transition-colors disabled:opacity-50"
              >
                {terminateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {terminateMutation.isPending ? "終了処理中..." : "管理を終了する"}
              </button>
            </div>

          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
