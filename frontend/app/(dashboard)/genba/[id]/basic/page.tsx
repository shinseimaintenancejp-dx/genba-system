"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCustomerContacts } from "@/hooks/useCustomers";
import { useStaffList } from "@/hooks/useStaff";
import { useUpdateGenba } from "@/hooks/useGenba";
import { useGenbaDetail, useTerminateGenba } from "@/hooks/useGenba";
import { formatDateJST } from "@/lib/utils";
import { AlertTriangle, Loader2, PowerOff, X, Search } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

export default function GenbaBasicPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: genba, isLoading } = useGenbaDetail(id);
  const terminateMutation = useTerminateGenba();
  const updateMutation = useUpdateGenba();
  const [showConfirm, setShowConfirm] = useState(false);

  // Dialog states
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showStaffDialog, setShowStaffDialog] = useState(false);

  // Form states
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [mainStaffId, setMainStaffId] = useState<string>("");
  const [subStaffIds, setSubStaffIds] = useState<string[]>([]);

  // Queries for popups
  const { data: customerContacts, isLoading: isLoadingContacts } = useCustomerContacts(genba?.customer_id || "");
  const { data: internalStaff, isLoading: isLoadingStaff } = useStaffList({ is_active: true, limit: 100 });

  const handleOpenCustomerDialog = () => {
    if (genba) {
      setSelectedContacts(genba.contacts.map(c => c.id));
      setShowCustomerDialog(true);
    }
  };

  const handleOpenStaffDialog = () => {
    if (genba) {
      const main = genba.staff_assignments.find(a => a.role_type === "MAIN");
      const subs = genba.staff_assignments.filter(a => a.role_type === "SUB").map(a => a.staff_id);
      setMainStaffId(main ? main.staff_id : "");
      setSubStaffIds(subs);
      setShowStaffDialog(true);
    }
  };

  const handleSaveCustomerContacts = () => {
    if (!genba) return;
    updateMutation.mutate(
      { id: genba.id, data: { contact_ids: selectedContacts } },
      { onSuccess: () => setShowCustomerDialog(false) }
    );
  };

  const handleSaveStaffAssignments = () => {
    if (!genba) return;
    if (!mainStaffId) {
      alert("主担当（フロント）を選択してください。");
      return;
    }
    const assignments = [
      { staff_id: mainStaffId, role_type: "MAIN" as const },
      ...subStaffIds.map(id => ({ staff_id: id, role_type: "SUB" as const }))
    ];
    updateMutation.mutate(
      { id: genba.id, data: { staff_assignments: assignments } },
      { onSuccess: () => setShowStaffDialog(false) }
    );
  };


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
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">取引先 担当者情報</h2>
            <button
              onClick={handleOpenCustomerDialog}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              変更
            </button>
          </div>

          {genba.contacts && genba.contacts.length > 0 ? (
            <div className="flex flex-col gap-3">
              {genba.contacts.map(contact => (
                <div key={contact.id} className="flex flex-col bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <span className="text-sm font-semibold text-slate-800">{contact.full_name}</span>
                  <div className="flex flex-col gap-2 mt-2 ml-6 text-xs text-slate-600">
                    {contact.position && (
                      <div className="flex items-center">
                        <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-500 font-medium">
                          {contact.position}
                        </span>
                      </div>
                    )}
                    <span className="flex items-center gap-2">
                      <span className="text-slate-400">📞</span>
                      <span className={!contact.phone ? "text-slate-400" : ""}>{contact.phone || "未入力"}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-slate-400">✉️</span>
                      <span className={!contact.email ? "text-slate-400" : ""}>{contact.email || "未入力"}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">登録されている担当者はいません。</p>
          )}
        </div>

        {/* Staff Assignments */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">自社 担当者情報</h2>
            <button
              onClick={handleOpenStaffDialog}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              変更
            </button>
          </div>

          {genba.staff_assignments && genba.staff_assignments.length > 0 ? (
            <div className="flex flex-col gap-3">
              {genba.staff_assignments.map(assignment => (
                <div key={assignment.id} className="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-800">{assignment.staff.last_name} {assignment.staff.first_name}</span>
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

      {/* Customer Contacts Dialog */}
      <Dialog.Root open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[500px] flex flex-col max-h-[95vh] overflow-hidden -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white shadow-xl focus:outline-none animate-in fade-in-50 zoom-in-95">

            {/* Header (Sticky) */}
            <div className="shrink-0 p-6 border-b border-slate-100 z-10 bg-white">
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-lg font-bold text-slate-900">
                  取引先 担当者の変更
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>

              {/* Search Input */}
              <div className="mt-4 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="担当者名で検索..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              <div className="flex flex-col gap-3">
                {isLoadingContacts ? (
                  <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
                ) : !customerContacts || customerContacts.length === 0 ? (
                  <p className="text-sm text-slate-500 p-4 text-center border border-dashed border-slate-300 rounded-lg bg-white">
                    取引先（{genba.customer.short_name}）に登録されている担当者がありません。
                  </p>
                ) : (
                  customerContacts
                    .filter(c => c.full_name.toLowerCase().includes(customerSearch.toLowerCase()))
                    .map(contact => (
                      <label key={contact.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer bg-white">
                        <input
                          type="checkbox"
                          className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedContacts.includes(contact.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedContacts(prev => [...prev, contact.id]);
                            } else {
                              setSelectedContacts(prev => prev.filter(id => id !== contact.id));
                            }
                          }}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-800">{contact.full_name}</span>
                          {(contact.phone || contact.email) && (
                            <span className="text-xs text-slate-500 mt-1">
                              {contact.phone && `📞 ${contact.phone}`} {contact.phone && contact.email && ' | '} {contact.email && `✉️ ${contact.email}`}
                            </span>
                          )}
                        </div>
                      </label>
                    ))
                )}
              </div>
            </div>

            {/* Footer (Sticky) */}
            <div className="shrink-0 p-6 border-t border-slate-100 z-10 bg-white flex items-center justify-end gap-3">
              <Dialog.Close asChild>
                <button className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  キャンセル
                </button>
              </Dialog.Close>
              <button
                onClick={handleSaveCustomerContacts}
                disabled={updateMutation.isPending}
                className="h-10 rounded-lg bg-blue-600 hover:bg-blue-700 px-6 text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center"
              >
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                保存
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Internal Staff Dialog */}
      <Dialog.Root open={showStaffDialog} onOpenChange={setShowStaffDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[500px] flex flex-col max-h-[95vh] overflow-hidden -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white shadow-xl focus:outline-none animate-in fade-in-50 zoom-in-95">

            {/* Header (Sticky) */}
            <div className="shrink-0 p-6 border-b border-slate-100 z-10 bg-white">
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-lg font-bold text-slate-900">
                  自社 担当者（フロント）の変更
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>
            </div>

            {/* Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              <div className="flex flex-col gap-5">
                {isLoadingStaff ? (
                  <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
                ) : !internalStaff?.items || internalStaff.items.length === 0 ? (
                  <p className="text-sm text-slate-500 p-4 text-center border border-dashed border-slate-300 rounded-lg bg-white">
                    フロント権限のスタッフが見つかりません。
                  </p>
                ) : (
                  <>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-800">主担当（メイン）<span className="text-red-500 ml-1">*</span></label>
                      <select
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={mainStaffId}
                        onChange={(e) => setMainStaffId(e.target.value)}
                      >
                        <option value="">選択してください</option>
                        {internalStaff.items.map((staff: any) => (
                          <option key={staff.id} value={staff.id}>{staff.last_name} {staff.first_name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-800">副担当（サブ）</label>
                      <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto p-1">
                        {internalStaff.items.filter((s: any) => s.id !== mainStaffId).map((staff: any) => (
                          <label key={staff.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer bg-white">
                            <input
                              type="checkbox"
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              checked={subStaffIds.includes(staff.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSubStaffIds(prev => [...prev, staff.id]);
                                } else {
                                  setSubStaffIds(prev => prev.filter(id => id !== staff.id));
                                }
                              }}
                            />
                            <span className="text-sm text-slate-700">{staff.last_name} {staff.first_name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Footer (Sticky) */}
            <div className="shrink-0 p-6 border-t border-slate-100 z-10 bg-white flex items-center justify-end gap-3">
              <Dialog.Close asChild>
                <button className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  キャンセル
                </button>
              </Dialog.Close>
              <button
                onClick={handleSaveStaffAssignments}
                disabled={updateMutation.isPending || !mainStaffId}
                className="h-10 rounded-lg bg-blue-600 hover:bg-blue-700 px-6 text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center"
              >
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                保存
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </div>
  );
}

