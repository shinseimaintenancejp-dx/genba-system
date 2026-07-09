"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import {
  useGenbaEquipment,
  useCreateGenbaEquipment,
  useUpdateGenbaEquipment,
  useDeleteGenbaEquipment,
  type GenbaEquipmentResponse,
} from "@/hooks/useSchedules";
import { useCurrentUser } from "@/hooks/useAuth";
import { Loader2, Plus, Edit, Trash2, ShieldAlert, X, AlertTriangle, Hammer } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

export default function GenbaEquipmentPage() {
  const params = useParams();
  const genbaId = params.id as string;

  const { data: equipmentList = [], isLoading, error } = useGenbaEquipment(genbaId);

  const createMutation = useCreateGenbaEquipment();
  const updateMutation = useUpdateGenbaEquipment();
  const deleteMutation = useDeleteGenbaEquipment();

  const { data: user } = useCurrentUser();

  // Dialog open/close states
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Focus entity states
  const [editingEquipment, setEditingEquipment] = useState<GenbaEquipmentResponse | null>(null);
  const [equipmentToDelete, setEquipmentToDelete] = useState<GenbaEquipmentResponse | null>(null);

  // Form states
  const [equipmentName, setEquipmentName] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<number>(0);

  // Roles authorized to edit (ADMIN, SENIOR_STAFF, INTERNAL_STAFF)
  const canEdit = user && ["ADMIN", "SENIOR_STAFF", "INTERNAL_STAFF"].includes(user.role);

  const resetForm = () => {
    setEquipmentName("");
    setQuantity(1);
    setNotes("");
    setSortOrder(0);
    setEditingEquipment(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleOpenEdit = (eq: GenbaEquipmentResponse) => {
    setEditingEquipment(eq);
    setEquipmentName(eq.equipment_name);
    setQuantity(eq.quantity);
    setNotes(eq.notes || "");
    setSortOrder(eq.sort_order);
    setIsOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipmentName) return;

    const payload = {
      equipment_name: equipmentName,
      quantity,
      notes: notes || null,
      sort_order: sortOrder,
    };

    if (editingEquipment) {
      updateMutation.mutate(
        {
          genbaId,
          equipmentId: editingEquipment.id,
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
    if (!equipmentToDelete) return;

    deleteMutation.mutate(
      {
        genbaId,
        equipmentId: equipmentToDelete.id,
      },
      {
        onSuccess: () => {
          setIsDeleteOpen(false);
          setEquipmentToDelete(null);
        },
      }
    );
  };

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <h2 className="text-lg font-bold text-red-800">エラーが発生しました</h2>
        <p className="text-sm text-red-600 mt-2">清掃用具データの取得中にエラーが発生しました。</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">清掃用具・備品管理</h2>
          <p className="text-sm text-slate-500 mt-1">現場に常備・配置する清掃用具および備品リストを確認します。</p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-[#1E60F2] hover:bg-[#0F4FD0] text-sm font-semibold text-white transition-all shadow-sm duration-200 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>用具を追加</span>
          </button>
        )}
      </div>

      {isLoading ? (
        /* Table Skeleton Loader */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-pulse">
          <div className="h-12 bg-slate-50 border-b border-slate-200"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 border-b border-slate-100 p-4 flex items-center justify-between gap-4">
              <div className="h-4 w-1/4 bg-slate-200 rounded"></div>
              <div className="h-4 w-1/3 bg-slate-200 rounded"></div>
              <div className="h-4 w-16 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : equipmentList.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center min-h-[240px] bg-slate-50 rounded-xl border border-dashed border-slate-200 p-8 text-center">
          <Hammer className="h-12 w-12 text-slate-300 mb-3" />
          <span className="text-sm font-semibold text-slate-400">登録されている清掃用具はありません</span>
          {canEdit && (
            <button
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>最初の用具を登録する</span>
            </button>
          )}
        </div>
      ) : (
        /* Equipment Table */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 text-xs font-bold uppercase select-none">
                  <th className="py-3 px-5 w-16 text-center">表示順</th>
                  <th className="py-3 px-5">用具名</th>
                  <th className="py-3 px-5 w-32 text-center">数量</th>
                  <th className="py-3 px-5">備考 / 特記</th>
                  {canEdit && <th className="py-3 px-5 text-center w-28">操作</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {equipmentList
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((eq) => (
                    <tr key={eq.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-3.5 px-5 text-center text-slate-400 font-mono text-xs">{eq.sort_order}</td>
                      <td className="py-3.5 px-5 font-semibold text-slate-800 break-all">{eq.equipment_name}</td>
                      <td className="py-3.5 px-5 text-center font-bold text-blue-700">
                        <span className="bg-blue-50 px-2.5 py-1 rounded-md text-xs">{eq.quantity}</span>
                      </td>
                      <td className="py-3.5 px-5 break-all text-slate-500">{eq.notes || "-"}</td>
                      {canEdit && (
                        <td className="py-3.5 px-5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(eq)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                              title="編集"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEquipmentToDelete(eq);
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
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog.Root open={isOpen} onOpenChange={(open) => !open && resetForm() || setIsOpen(open)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl focus:outline-none animate-in fade-in-50 zoom-in-95">
            <div className="flex items-start justify-between gap-4 mb-4 border-b border-slate-100 pb-3">
              <Dialog.Title className="text-lg font-bold text-slate-900">
                {editingEquipment ? "清掃用具を編集" : "清掃用具を追加"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              {/* Equipment Name */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="equipment-name" className="text-xs font-bold text-slate-700">
                  用具名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="equipment-name"
                  required
                  maxLength={200}
                  value={equipmentName}
                  onChange={(e) => setEquipmentName(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="例: モップ, 真空掃除機, ガラススクイジー"
                />
              </div>

              {/* Quantity */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="quantity" className="text-xs font-bold text-slate-700">
                  数量 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="quantity"
                  required
                  min={0}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  className="h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-32 bg-white"
                />
              </div>

              {/* Sort Order */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="sort-order" className="text-xs font-bold text-slate-700">
                  表示順 (数字が小さい順に表示)
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

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="notes" className="text-xs font-bold text-slate-700">
                  備考
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full resize-none p-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="用具の保管場所、規格、状態などの補足事項"
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
                  {editingEquipment ? "保存" : "登録"}
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
                  用具データを削除しますか？
                </Dialog.Title>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  清掃用具「<span className="font-semibold">{equipmentToDelete?.equipment_name}</span>」を完全に削除します。
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
