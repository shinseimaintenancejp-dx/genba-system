"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import {
  useCleaningStandards,
  useCreateCleaningStandard,
  useUpdateCleaningStandard,
  useDeleteCleaningStandard,
  type CleaningWorkStandardResponse,
} from "@/hooks/useSchedules";
import { useCurrentUser } from "@/hooks/useAuth";
import { Loader2, Plus, Edit, Trash2, ShieldAlert, X, AlertTriangle, FileSpreadsheet, PlusCircle, MinusCircle } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

const DAILY_FREQUENCY_OPTIONS = [
  { value: "daily", label: "毎日" },
  { value: "2_3_weekly", label: "週2-3回" },
  { value: "weekly", label: "週1回" },
  { value: "2_monthly", label: "隔週" },
  { value: "as_needed", label: "必要時" },
];

const PERIODIC_FREQUENCY_OPTIONS = [
  { value: "monthly", label: "月1回" },
  { value: "2_monthly", label: "2ヶ月に1回" },
  { value: "3_monthly", label: "3ヶ月に1回" },
  { value: "6_monthly", label: "半年に1回" },
  { value: "yearly", label: "年1回" },
  { value: "2_yearly", label: "2年に1回" },
  { value: "as_needed", label: "随時" },
];

function getFreqLabel(val: string, options: { value: string; label: string }[]): string {
  const match = options.find((o) => o.value === val);
  return match ? match.label : val;
}

export default function CleaningStandardsPage() {
  const params = useParams();
  const genbaId = params.id as string;

  const { data: standards = [], isLoading, error } = useCleaningStandards(genbaId);

  const createMutation = useCreateCleaningStandard();
  const updateMutation = useUpdateCleaningStandard();
  const deleteMutation = useDeleteCleaningStandard();

  const { data: user } = useCurrentUser();

  // Dialog open/close states
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Focus entity states
  const [editingStandard, setEditingStandard] = useState<CleaningWorkStandardResponse | null>(null);
  const [standardToDelete, setStandardToDelete] = useState<CleaningWorkStandardResponse | null>(null);

  // Form states
  const [floorNumber, setFloorNumber] = useState<string>("");
  const [areaName, setAreaName] = useState<string>("");
  const [floorMaterial, setFloorMaterial] = useState<string>("");
  const [areaSqm, setAreaSqm] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<number>(0);

  // Key-value pairs for daily and periodic tasks in the form
  const [dailyTasksList, setDailyTasksList] = useState<{ key: string; value: string }[]>([]);
  const [periodicTasksList, setPeriodicTasksList] = useState<{ key: string; value: string }[]>([]);

  // Roles authorized to edit (ADMIN, SENIOR_STAFF, INTERNAL_STAFF)
  const canEdit = user && ["ADMIN", "SENIOR_STAFF", "INTERNAL_STAFF"].includes(user.role);

  const resetForm = () => {
    setFloorNumber("");
    setAreaName("");
    setFloorMaterial("");
    setAreaSqm("");
    setRemarks("");
    setSortOrder(0);
    setDailyTasksList([]);
    setPeriodicTasksList([]);
    setEditingStandard(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleOpenEdit = (std: CleaningWorkStandardResponse) => {
    setEditingStandard(std);
    setFloorNumber(std.floor_number);
    setAreaName(std.area_name);
    setFloorMaterial(std.floor_material || "");
    setAreaSqm(std.area_sqm ? String(std.area_sqm) : "");
    setRemarks(std.remarks || "");
    setSortOrder(std.sort_order);

    // Map dicts to arrays of {key, value}
    setDailyTasksList(Object.entries(std.daily_tasks || {}).map(([key, val]) => ({ key, value: String(val) })));
    setPeriodicTasksList(Object.entries(std.periodic_tasks || {}).map(([key, val]) => ({ key, value: String(val) })));

    setIsOpen(true);
  };

  const addDailyTaskRow = () => {
    setDailyTasksList((prev) => [...prev, { key: "", value: "daily" }]);
  };

  const removeDailyTaskRow = (index: number) => {
    setDailyTasksList((prev) => prev.filter((_, i) => i !== index));
  };

  const updateDailyTaskRow = (index: number, field: "key" | "value", val: string) => {
    setDailyTasksList((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    );
  };

  const addPeriodicTaskRow = () => {
    setPeriodicTasksList((prev) => [...prev, { key: "", value: "monthly" }]);
  };

  const removePeriodicTaskRow = (index: number) => {
    setPeriodicTasksList((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePeriodicTaskRow = (index: number, field: "key" | "value", val: string) => {
    setPeriodicTasksList((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!floorNumber || !areaName) return;

    // Convert arrays back to dicts
    const daily_tasks: Record<string, string> = {};
    dailyTasksList.forEach((t) => {
      if (t.key.trim()) {
        daily_tasks[t.key.trim()] = t.value;
      }
    });

    const periodic_tasks: Record<string, string> = {};
    periodicTasksList.forEach((t) => {
      if (t.key.trim()) {
        periodic_tasks[t.key.trim()] = t.value;
      }
    });

    const payload = {
      floor_number: floorNumber,
      area_name: areaName,
      floor_material: floorMaterial || null,
      area_sqm: areaSqm ? parseFloat(areaSqm) : null,
      daily_tasks,
      periodic_tasks,
      remarks: remarks || null,
      sort_order: sortOrder,
    };

    if (editingStandard) {
      updateMutation.mutate(
        {
          genbaId,
          standardId: editingStandard.id,
          data: payload,
        },
        {
          onSuccess: () => {
            setIsOpen(false);
            resetForm();
          },
        }
      );
    } else {
      createMutation.mutate(
        {
          genbaId,
          data: payload,
        },
        {
          onSuccess: () => {
            setIsOpen(false);
            resetForm();
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (!standardToDelete) return;

    deleteMutation.mutate(
      {
        genbaId,
        standardId: standardToDelete.id,
      },
      {
        onSuccess: () => {
          setIsDeleteOpen(false);
          setStandardToDelete(null);
        },
      }
    );
  };

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <h2 className="text-lg font-bold text-red-800">エラーが発生しました</h2>
        <p className="text-sm text-red-600 mt-2">作業基準データの取得中にエラーが発生しました。</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">清掃作業基準表</h2>
          <p className="text-sm text-slate-500 mt-1">現場内の清掃箇所・仕様・日常/定期清掃頻度を確認・管理します。</p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-[#1E60F2] hover:bg-[#0F4FD0] text-sm font-semibold text-white transition-all shadow-sm duration-200 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>基準を追加</span>
          </button>
        )}
      </div>

      {isLoading ? (
        /* Skeleton Table Loader */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-pulse">
          <div className="h-12 bg-slate-50 border-b border-slate-200"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 border-b border-slate-100 p-4 flex items-center justify-between gap-4">
              <div className="h-4 w-12 bg-slate-200 rounded"></div>
              <div className="h-4 w-32 bg-slate-200 rounded"></div>
              <div className="h-4 w-24 bg-slate-200 rounded"></div>
              <div className="h-4 w-1/3 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : standards.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center min-h-[240px] bg-slate-50 rounded-xl border border-dashed border-slate-200 p-8 text-center">
          <FileSpreadsheet className="h-12 w-12 text-slate-300 mb-3" />
          <span className="text-sm font-semibold text-slate-400">作業基準表データはありません</span>
          {canEdit && (
            <button
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>最初の基準を登録する</span>
            </button>
          )}
        </div>
      ) : (
        /* Standards Table */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 text-xs font-bold uppercase select-none">
                <th className="py-3 px-4 w-16 text-center">表示順</th>
                <th className="py-3 px-4 w-20">階数</th>
                <th className="py-3 px-4 w-48">エリア/区域</th>
                <th className="py-3 px-4 w-40">床材仕様</th>
                <th className="py-3 px-4 w-28 text-right">面積(㎡)</th>
                <th className="py-3 px-4">日常清掃 (頻度)</th>
                <th className="py-3 px-4">定期清掃 (頻度)</th>
                <th className="py-3 px-4">備考</th>
                {canEdit && <th className="py-3 px-4 text-center w-28">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {standards
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((std) => (
                  <tr key={std.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-xs">{std.sort_order}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{std.floor_number}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 break-all">{std.area_name}</td>
                    <td className="py-3.5 px-4 break-all">{std.floor_material || "-"}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                      {std.area_sqm ? std.area_sqm.toFixed(1) : "-"}
                    </td>
                    <td className="py-3.5 px-4">
                      {Object.keys(std.daily_tasks).length === 0 ? (
                        <span className="text-slate-300">-</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(std.daily_tasks).map(([task, freq]) => (
                            <span
                              key={task}
                              className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10"
                            >
                              {task}: {getFreqLabel(freq, DAILY_FREQUENCY_OPTIONS)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {Object.keys(std.periodic_tasks).length === 0 ? (
                        <span className="text-slate-300">-</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(std.periodic_tasks).map(([task, freq]) => (
                            <span
                              key={task}
                              className="inline-flex items-center rounded-md bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 ring-1 ring-inset ring-purple-700/10"
                            >
                              {task}: {getFreqLabel(freq, PERIODIC_FREQUENCY_OPTIONS)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 break-all text-slate-500 text-xs">{std.remarks || "-"}</td>
                    {canEdit && (
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(std)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                            title="編集"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setStandardToDelete(std);
                              setIsDeleteOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                            title="削除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog.Root open={isOpen} onOpenChange={(open) => !open && resetForm() || setIsOpen(open)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white shadow-xl focus:outline-none animate-in fade-in-50 zoom-in-95 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="shrink-0 flex items-start justify-between p-6 border-b border-slate-100 bg-white z-10">
              <Dialog.Title className="text-lg font-bold text-slate-900">
                {editingStandard ? "清掃作業基準を編集" : "清掃作業基準を追加"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Floor Number */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="floor-num" className="text-xs font-bold text-slate-700">
                    階数 (例: 1F, B1F, 外周など) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="floor-num"
                    required
                    maxLength={20}
                    value={floorNumber}
                    onChange={(e) => setFloorNumber(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="例: 1F"
                  />
                </div>

                {/* Area Name */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="area-name" className="text-xs font-bold text-slate-700">
                    エリア/区域名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="area-name"
                    required
                    maxLength={200}
                    value={areaName}
                    onChange={(e) => setAreaName(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="例: エントランスホール"
                  />
                </div>

                {/* Floor Material */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="floor-mat" className="text-xs font-bold text-slate-700">
                    床材仕様 (例: Pタイル, カーペット)
                  </label>
                  <input
                    type="text"
                    id="floor-mat"
                    maxLength={100}
                    value={floorMaterial}
                    onChange={(e) => setFloorMaterial(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="例: 長尺塩ビシート"
                  />
                </div>

                {/* Area Sqm */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="area-sqm" className="text-xs font-bold text-slate-700">
                    面積 (㎡)
                  </label>
                  <input
                    type="number"
                    id="area-sqm"
                    min={0}
                    step={0.1}
                    value={areaSqm}
                    onChange={(e) => setAreaSqm(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="例: 120.5"
                  />
                </div>
              </div>

              {/* Daily Tasks Editor */}
              <div className="flex flex-col gap-2.5 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">日常清掃項目 (マトリクス頻度設定)</span>
                  <button
                    type="button"
                    onClick={addDailyTaskRow}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>作業を追加</span>
                  </button>
                </div>
                {dailyTasksList.length === 0 ? (
                  <p className="text-xs italic text-slate-400 py-1 bg-slate-50 px-2 rounded">設定されている日常清掃作業はありません。</p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {dailyTasksList.map((row, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <input
                          type="text"
                          required
                          value={row.key}
                          onChange={(e) => updateDailyTaskRow(index, "key", e.target.value)}
                          className="h-9 flex-grow px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          placeholder="例: 除塵、モップ掛け、ゴミ回収"
                        />
                        <select
                          value={row.value}
                          onChange={(e) => updateDailyTaskRow(index, "value", e.target.value)}
                          className="h-9 w-28 px-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        >
                          {DAILY_FREQUENCY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeDailyTaskRow(index)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded"
                        >
                          <MinusCircle className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Periodic Tasks Editor */}
              <div className="flex flex-col gap-2.5 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">定期清掃項目 (マトリクス頻度設定)</span>
                  <button
                    type="button"
                    onClick={addPeriodicTaskRow}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>作業を追加</span>
                  </button>
                </div>
                {periodicTasksList.length === 0 ? (
                  <p className="text-xs italic text-slate-400 py-1 bg-slate-50 px-2 rounded">設定されている定期清掃作業はありません。</p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {periodicTasksList.map((row, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <input
                          type="text"
                          required
                          value={row.key}
                          onChange={(e) => updatePeriodicTaskRow(index, "key", e.target.value)}
                          className="h-9 flex-grow px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          placeholder="例: 洗浄ワックス、ガラス清掃、絨毯洗浄"
                        />
                        <select
                          value={row.value}
                          onChange={(e) => updatePeriodicTaskRow(index, "value", e.target.value)}
                          className="h-9 w-32 px-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        >
                          {PERIODIC_FREQUENCY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removePeriodicTaskRow(index)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded"
                        >
                          <MinusCircle className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sort Order */}
              <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-3">
                <label htmlFor="sort-order" className="text-xs font-bold text-slate-700">
                  表示順 (数字が小さい順に上に表示)
                </label>
                <input
                  type="number"
                  id="sort-order"
                  min={0}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                  className="h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-32 bg-white"
                />
              </div>

              {/* Remarks */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="remarks" className="text-xs font-bold text-slate-700">
                  備考
                </label>
                <textarea
                  id="remarks"
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full resize-none p-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="特別な注意事項、対象外の範囲など"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="h-[52px] px-6 rounded-lg border border-slate-200 bg-white text-base font-semibold text-slate-800 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="inline-flex items-center justify-center h-[52px] px-6 rounded-lg bg-[#1E60F2] hover:bg-[#0F4FD0] text-base font-semibold text-white transition-colors disabled:opacity-50 shadow-sm"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  )}
                  {editingStandard ? "保存" : "登録"}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Confirmation Dialog */}
      <Dialog.Root open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl focus:outline-none animate-in fade-in-50 zoom-in-95">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500 shrink-0" />
              <div>
                <Dialog.Title className="text-lg font-bold text-slate-900">
                  作業基準を削除しますか？
                </Dialog.Title>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  場所「<span className="font-semibold">{standardToDelete?.floor_number} - {standardToDelete?.area_name}</span>」の清掃作業基準を完全に削除します。
                  この操作は元に戻せません。よろしいですか？
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center justify-center h-10 rounded-lg bg-[#F83B3B] hover:bg-[#E51E1E] px-4 text-sm font-semibold text-white transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {deleteMutation.isPending ? "削除中..." : "削除する"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
