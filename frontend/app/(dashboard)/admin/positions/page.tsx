"use client";
import { usePageHeader } from "@/hooks/usePageHeader";

import React, { useState } from "react";
import { RoleGuard } from "@/components/layout/RoleGuard";
import {
  usePositionList,
  useCreatePosition,
  useUpdatePosition,
  useDeletePosition,
  type Position,
  type CreatePositionPayload,
} from "@/hooks/usePosition";
import { DataTable, type Column } from "@/components/common/DataTable";
import {
  Plus,
  Search,
  Loader2,
  PencilLine,
  Trash2,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

// ─── Create Position Dialog ───────────────────────────────────────────────────────

interface CreateDialogProps {
  onClose: () => void;
}

const CreatePositionDialog: React.FC<CreateDialogProps> = ({ onClose }) => {
  const [formData, setFormData] = useState<CreatePositionPayload>({
    name: "",
    description: "",
  });
  const [error, setError] = useState<string | null>(null);
  const { mutate: createPosition, isPending } = useCreatePosition();

  const handleSubmit = (e: React.FormEvent) => {
  usePageHeader("役職管理", "システムで使用する役職（マスターデータ）の登録・編集を行います。");
    e.preventDefault();
    setError(null);
    createPosition(formData, {
      onSuccess: () => onClose(),
      onError: (err: any) => {
        setError(err.message || "役職の作成に失敗しました");
      },
    });
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[95vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
          <div className="shrink-0 border-b border-slate-100 bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <Plus className="h-5 w-5 text-[#1E60F2]" />
              </div>
              <Dialog.Title className="text-xl font-bold text-slate-900">
                新規役職登録
              </Dialog.Title>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <form id="position-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  役職名 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E60F2]"
                  placeholder="例: 管理者"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  説明
                </label>
                <input
                  type="text"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E60F2]"
                  placeholder="例: システムの全権限を持つ"
                />
              </div>
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </form>
          </div>

          <div className="shrink-0 border-t border-slate-100 bg-slate-50 p-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              disabled={isPending}
            >
              キャンセル
            </button>
            <button
              type="submit"
              form="position-form"
              disabled={isPending || !formData.name}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#1E60F2] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0F4FD0] disabled:opacity-60 transition-colors shadow-sm"
            >
              {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
              保存する
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

// ─── Edit Position Dialog ────────────────────────────────────────────────────────

interface EditDialogProps {
  position: Position;
  onClose: () => void;
}

const EditPositionDialog: React.FC<EditDialogProps> = ({ position, onClose }) => {
  const [formData, setFormData] = useState<Partial<CreatePositionPayload>>({
    name: position.name,
    description: position.description,
  });
  const [isActive, setIsActive] = useState(position.is_active);
  const [error, setError] = useState<string | null>(null);
  const { mutate: updatePosition, isPending } = useUpdatePosition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    updatePosition(
      { id: position.id, data: { ...formData, is_active: isActive } },
      {
        onSuccess: () => onClose(),
        onError: (err: any) => {
          setError(err.message || "役職の更新に失敗しました");
        },
      }
    );
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[95vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
          <div className="shrink-0 border-b border-slate-100 bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <PencilLine className="h-5 w-5 text-[#1E60F2]" />
              </div>
              <Dialog.Title className="text-xl font-bold text-slate-900">
                役職編集
              </Dialog.Title>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <form id="position-edit-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  役職名 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E60F2]"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  説明
                </label>
                <input
                  type="text"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E60F2]"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">状態</label>
                <select
                  value={isActive ? "true" : "false"}
                  onChange={(e) => setIsActive(e.target.value === "true")}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E60F2] bg-white"
                >
                  <option value="true">有効</option>
                  <option value="false">無効</option>
                </select>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </form>
          </div>

          <div className="shrink-0 border-t border-slate-100 bg-slate-50 p-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              disabled={isPending}
            >
              キャンセル
            </button>
            <button
              type="submit"
              form="position-edit-form"
              disabled={isPending || !formData.name}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#1E60F2] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0F4FD0] disabled:opacity-60 transition-colors shadow-sm"
            >
              {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <PencilLine className="h-5 w-5" />}
              保存する
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

// ─── Delete Confirmation Dialog ──────────────────────────────────────────────

interface DeleteDialogProps {
  position: Position;
  onClose: () => void;
}

const DeletePositionDialog: React.FC<DeleteDialogProps> = ({ position, onClose }) => {
  const { mutate: deletePosition, isPending } = useDeletePosition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    setError(null);
    deletePosition(position.id, {
      onSuccess: () => onClose(),
      onError: (err: any) => {
        setError(err.message || "削除に失敗しました");
      },
    });
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[95vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-white shadow-2xl p-6">
          <Dialog.Title className="text-xl font-bold text-slate-900 mb-2">
            役職の削除確認
          </Dialog.Title>
          <Dialog.Description className="text-slate-600 mb-6">
            <strong className="text-slate-900">{position.name}</strong>{" "}
            を削除してもよろしいですか？この操作は取り消せません。
          </Dialog.Description>

          {error && (
            <div className="p-4 mb-6 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              disabled={isPending}
            >
              キャンセル
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#F83B3B] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#E51E1E] disabled:opacity-60 transition-colors shadow-sm"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              削除する
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PositionManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  
  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [deletingPosition, setDeletingPosition] = useState<Position | null>(null);

  const { data, isLoading } = usePositionList();

  const filteredItems = (Array.isArray(data) ? data : []).filter((pos: Position) =>
    pos.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedItems = filteredItems.slice((page - 1) * 10, page * 10);

  const columns: Column<Position>[] = [
    {
      header: "役職名",
      accessorKey: "name",
      render: (position) => (
        <span className="font-medium text-slate-900">{position.name}</span>
      ),
      sortable: true,
    },
    {
      header: "説明",
      render: (position) => (
        <span className="text-slate-600">{position.description || "-"}</span>
      ),
    },
    {
      header: "状態",
      render: (position) => position.is_active ? (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
          有効
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          無効
        </span>
      ),
    },
    {
      header: "操作",
      render: (position) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setEditingPosition(position)}
            className="p-2 text-slate-400 hover:text-[#1E60F2] hover:bg-blue-50 rounded-lg transition-colors"
            title="編集"
          >
            <PencilLine className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeletingPosition(position)}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="削除"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <div className="space-y-6">
        {/* Page Header Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          
          <div>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="inline-flex items-center gap-2 h-10 rounded-lg bg-[#1E60F2] px-4 text-sm font-semibold text-white hover:bg-[#0F4FD0] transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>新規役職登録</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end">
          <div className="w-full sm:w-[36rem]">
            <label className="block text-xs font-medium text-slate-600 mb-1">フリーワード検索</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="役職名で検索..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full h-10 rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-[#1E60F2] focus:ring-1 focus:ring-[#1E60F2] transition-all placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Summary Count Badge */}
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-slate-700 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm inline-block">
            条件に一致する役職: <span className="text-lg font-bold text-[#1E60F2] mx-1">{filteredItems.length}</span> 件
          </div>
        </div>

        {/* Data Table Component */}
        <DataTable
          columns={columns}
          data={paginatedItems}
          isLoading={isLoading}
          totalCount={filteredItems.length}
          page={page}
          limit={10}
          onPageChange={(val) => setPage(val)}
          emptyMessage="該当する役職が見つかりません。"
        />
      </div>

      {/* Dialogs */}
      {showCreateDialog && (
        <CreatePositionDialog onClose={() => setShowCreateDialog(false)} />
      )}
      
      {editingPosition && (
        <EditPositionDialog
          position={editingPosition}
          onClose={() => setEditingPosition(null)}
        />
      )}

      {deletingPosition && (
        <DeletePositionDialog
          position={deletingPosition}
          onClose={() => setDeletingPosition(null)}
        />
      )}
    </RoleGuard>
  );
}
