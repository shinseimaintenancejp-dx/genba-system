"use client";
import { usePageHeader } from "@/hooks/usePageHeader";

import React, { useState, useRef, useEffect } from "react";
import { RoleGuard } from "@/components/layout/RoleGuard";
import {
  useStaffList,
  useCreateStaff,
  useUpdateStaff,
  useDeleteStaff,
  type Staff,
} from "@/hooks/useStaff";
import { usePositionList, type Position } from "@/hooks/usePosition";
import { DataTable, type Column } from "@/components/common/DataTable";
import {
  Plus,
  Search,
  Loader2,
  PencilLine,
  Trash2,
  ChevronDown,
  ShieldCheck
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

// ─── Multi-Select Positions Dropdown ─────────────────────────────────────────

interface MultiSelectPositionsProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  positions?: Position[];
}

const MultiSelectPositions: React.FC<MultiSelectPositionsProps> = ({
  selectedIds,
  onChange,
  positions = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
  usePageHeader("従業員管理", "自社スタッフ（担当者）の登録・編集を行います。", ShieldCheck);
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activePositions = positions.filter((p) => p.is_active || selectedIds.includes(p.id));

  const selectedNames = activePositions
    .filter((p) => selectedIds.includes(p.id))
    .map((p) => p.name);

  const toggleOption = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-[#1E60F2] shadow-sm"
      >
        <span className={selectedNames.length > 0 ? "text-slate-900 font-medium" : "text-slate-400"}>
          {selectedNames.length > 0 ? selectedNames.join("、 ") : "役職を選択してください"}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 ml-2 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg space-y-1">
          {activePositions.length > 0 ? (
            activePositions.map((pos) => {
              const isChecked = selectedIds.includes(pos.id);
              return (
                <div
                  key={pos.id}
                  onClick={() => toggleOption(pos.id)}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer text-sm text-slate-700 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="h-4 w-4 rounded border-slate-300 text-[#1E60F2] focus:ring-[#1E60F2] cursor-pointer"
                  />
                  <span>{pos.name}</span>
                </div>
              );
            })
          ) : (
            <p className="px-2 py-1.5 text-xs text-slate-400">役職が登録されていません</p>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Create Staff Dialog ───────────────────────────────────────────────────────

interface CreateDialogProps {
  onClose: () => void;
}

const CreateStaffDialog: React.FC<CreateDialogProps> = ({ onClose }) => {
  const [formData, setFormData] = useState<any>({
    last_name: "",
    first_name: "",
    phone: "",
    email: "",
    position_ids: [],
  });
  const [error, setError] = useState<string | null>(null);
  const { mutate: createStaff, isPending } = useCreateStaff();
  const { data: positions } = usePositionList();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    createStaff(formData, {
      onSuccess: () => onClose(),
      onError: (err: any) => {
        setError(err.message || "従業員の登録に失敗しました");
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
                新規従業員登録
              </Dialog.Title>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit} id="staff-form" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    姓 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E60F2]"
                    placeholder="例: 山田"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    名
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E60F2]"
                    placeholder="例: 太郎"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">役職</label>
                <MultiSelectPositions
                  selectedIds={formData.position_ids}
                  onChange={(ids) => setFormData({ ...formData, position_ids: ids })}
                  positions={positions}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">電話番号</label>
                  <input
                    type="tel"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E60F2]"
                    placeholder="例: 090-1234-5678"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">メールアドレス</label>
                  <input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E60F2]"
                    placeholder="例: yamada@shinsei.co.jp"
                  />
                </div>
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
              form="staff-form"
              disabled={isPending || !formData.last_name}
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

// ─── Edit Staff Dialog ────────────────────────────────────────────────────────

interface EditDialogProps {
  staff: Staff;
  onClose: () => void;
}

const EditStaffDialog: React.FC<EditDialogProps> = ({ staff, onClose }) => {
  const [formData, setFormData] = useState<any>({
    last_name: staff.last_name,
    first_name: staff.first_name,
    phone: staff.phone,
    email: staff.email,
    is_active: staff.is_active,
    position_ids: staff.positions?.map((p) => p.id) || [],
  });
  const [error, setError] = useState<string | null>(null);
  const { mutate: updateStaff, isPending } = useUpdateStaff();
  const { data: positions } = usePositionList();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    updateStaff(
      { id: staff.id, data: formData },
      {
        onSuccess: () => onClose(),
        onError: (err: any) => {
          setError(err.message || "従業員の更新に失敗しました");
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
                従業員編集
              </Dialog.Title>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit} id="staff-edit-form" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    姓 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E60F2]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    名
                  </label>
                  <input
                    type="text"
                    value={formData.first_name || ""}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E60F2]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">役職</label>
                <MultiSelectPositions
                  selectedIds={formData.position_ids}
                  onChange={(ids) => setFormData({ ...formData, position_ids: ids })}
                  positions={positions}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">電話番号</label>
                  <input
                    type="tel"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E60F2]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">メールアドレス</label>
                  <input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E60F2]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">状態</label>
                <select
                  value={formData.is_active ? "true" : "false"}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.value === "true" })
                  }
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
              form="staff-edit-form"
              disabled={isPending || !formData.last_name}
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
  staff: Staff;
  onClose: () => void;
}

const DeleteStaffDialog: React.FC<DeleteDialogProps> = ({ staff, onClose }) => {
  const { mutate: deleteStaff, isPending } = useDeleteStaff();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    setError(null);
    deleteStaff(staff.id, {
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
            従業員の削除確認
          </Dialog.Title>
          <Dialog.Description className="text-slate-600 mb-6">
            <strong className="text-slate-900">{staff.last_name} {staff.first_name}</strong>{" "}
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

export default function StaffManagementPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useStaffList({
    skip: (page - 1) * 10,
    limit: 10,
    search: debouncedSearch || undefined,
  });

  const columns: Column<Staff>[] = [
    {
      header: "氏名",
      accessorKey: "last_name",
      render: (staff) => (
        <span className="font-medium text-slate-900">
          {staff.last_name} {staff.first_name}
        </span>
      ),
      sortable: true,
    },
    {
      header: "役職",
      render: (staff) => (
        <div className="flex flex-wrap gap-1.5">
          {(staff.positions?.length ?? 0) > 0 ? (
            staff.positions?.map((pos: any) => (
              <span key={pos.id} className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                {pos.name}
              </span>
            ))
          ) : (
            <span className="text-slate-400">-</span>
          )}
        </div>
      ),
    },
    {
      header: "電話番号",
      render: (staff) => (
        <span className="text-sm text-slate-700 font-mono">
          {staff.phone || "-"}
        </span>
      ),
    },
    {
      header: "状態",
      render: (staff) => staff.is_active ? (
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
      render: (staff) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setEditingStaff(staff)}
            className="p-2 text-slate-400 hover:text-[#1E60F2] hover:bg-blue-50 rounded-lg transition-colors"
            title="編集"
          >
            <PencilLine className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeletingStaff(staff)}
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
              <span>新規従業員登録</span>
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
                placeholder="氏名や役職で検索..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-[#1E60F2] focus:ring-1 focus:ring-[#1E60F2] transition-all placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Summary Count Badge */}
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-slate-700 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm inline-block">
            条件に一致する従業員: <span className="text-lg font-bold text-[#1E60F2] mx-1">{data?.total ?? 0}</span> 件
          </div>
        </div>

        {/* Data Table Component */}
        <DataTable
          columns={columns}
          data={data?.items}
          isLoading={isLoading}
          totalCount={data?.total}
          page={page}
          limit={10}
          onPageChange={(val) => setPage(val)}
          emptyMessage="該当する従業員が見つかりません。"
        />
      </div>

      {/* Dialogs */}
      {showCreateDialog && (
        <CreateStaffDialog onClose={() => setShowCreateDialog(false)} />
      )}
      
      {editingStaff && (
        <EditStaffDialog
          staff={editingStaff}
          onClose={() => setEditingStaff(null)}
        />
      )}

      {deletingStaff && (
        <DeleteStaffDialog
          staff={deletingStaff}
          onClose={() => setDeletingStaff(null)}
        />
      )}
    </RoleGuard>
  );
}
