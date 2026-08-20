"use client";

import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Plus, Edit, Trash2, Check, Loader2 } from "lucide-react";
import {
  useDailyWorkTypes,
  useCreateDailyWorkType,
  useUpdateDailyWorkType,
  useDeleteDailyWorkType,
} from "@/hooks/useManuals";

interface DailyWorkTypeMasterDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DailyWorkTypeMasterDialog: React.FC<DailyWorkTypeMasterDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { data: types, isLoading } = useDailyWorkTypes();
  const { mutateAsync: createType, isPending: isCreating } = useCreateDailyWorkType();
  const { mutateAsync: updateType, isPending: isUpdating } = useUpdateDailyWorkType();
  const { mutateAsync: deleteType, isPending: isDeleting } = useDeleteDailyWorkType();

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createType({ name: newName.trim() });
      setNewName("");
      setIsAdding(false);
    } catch (error) {
      console.error("Failed to create work type", error);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updateType({ id, data: { name: editName.trim() } });
      setEditingId(null);
      setEditName("");
    } catch (error) {
      console.error("Failed to update work type", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("この清掃仕様を削除してもよろしいですか？")) {
      try {
        await deleteType(id);
      } catch (error) {
        console.error("Failed to delete work type", error);
      }
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-[100] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white p-0 shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4 bg-slate-50">
            <Dialog.Title className="text-lg font-bold text-slate-800">
              清掃仕様マスター管理
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-full p-2 hover:bg-slate-200 transition-colors">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-4">
            <p className="text-sm text-slate-600 mb-4">
              ここで登録した清掃仕様（作業内容）は、日常清掃のドロップダウンで選択可能になります。
            </p>

            {/* List */}
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : (
              <ul className="space-y-2">
                {types?.map((type) => (
                  <li key={type.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 bg-white hover:border-slate-300 transition-colors">
                    {editingId === type.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-9 flex-1 rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                          onKeyDown={(e) => e.key === "Enter" && handleUpdate(type.id)}
                        />
                        <button
                          onClick={() => handleUpdate(type.id)}
                          disabled={isUpdating || !editName.trim()}
                          className="flex h-9 items-center justify-center rounded-md bg-blue-600 px-3 text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex h-9 items-center justify-center rounded-md border border-slate-200 px-3 text-slate-600 hover:bg-slate-50"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-medium text-slate-700">{type.name}</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingId(type.id);
                              setEditName(type.name);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(type.id)}
                            disabled={isDeleting}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* Add New */}
            {isAdding ? (
              <div className="flex items-center gap-2 mt-4">
                <input
                  type="text"
                  placeholder="新しい清掃仕様..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-10 flex-1 rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
                <button
                  onClick={handleCreate}
                  disabled={isCreating || !newName.trim()}
                  className="flex h-10 items-center justify-center rounded-md bg-[#1E60F2] px-4 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  追加
                </button>
                <button
                  onClick={() => setIsAdding(false)}
                  className="flex h-10 items-center justify-center rounded-md border border-slate-200 px-4 text-slate-600 hover:bg-slate-50"
                >
                  キャンセル
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAdding(true)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#1E60F2]"
              >
                <Plus className="h-4 w-4" />
                新しい清掃仕様を追加
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
