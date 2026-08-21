"use client";
import { usePageHeader } from "@/hooks/usePageHeader";

import React, { useState } from "react";
import { RoleGuard } from "@/components/layout/RoleGuard";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  type UserRecord,
  type CreateUserPayload,
} from "@/hooks/useUsers";
import { ROLE_LABELS } from "@/lib/auth";
import {
  Plus,
  Search,
  UserCheck,
  UserX,
  Loader2,
  ShieldCheck,
  PencilLine,
  Trash2,
  Users
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

// ─── Role badge colors ────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700 border-red-200",
  SENIOR_STAFF: "bg-purple-100 text-purple-700 border-purple-200",
  INTERNAL_STAFF: "bg-blue-100 text-blue-700 border-blue-200",
  GENBA_WORKER: "bg-green-100 text-green-700 border-green-200",
  PARTNER: "bg-orange-100 text-orange-700 border-orange-200",
  CUSTOMER: "bg-slate-100 text-slate-700 border-slate-200",
};

const ALL_ROLES = [
  "ADMIN",
  "SENIOR_STAFF",
  "INTERNAL_STAFF",
  "GENBA_WORKER",
  "PARTNER",
  "CUSTOMER",
];

// ─── Create User Dialog ───────────────────────────────────────────────────────

interface CreateDialogProps {
  onClose: () => void;
}

function CreateUserDialog({ onClose }: CreateDialogProps) {
  const createUser = useCreateUser();
  const [form, setForm] = useState({
    username: "",
    last_name: "",
    first_name: "",
    phone: "",
    password: "",
    passwordConfirm: "",
    role: "INTERNAL_STAFF",
    email: "",
    is_active: true,
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password !== form.passwordConfirm) {
      setError("パスワードが一致しません。");
      return;
    }
    try {
      const payload: CreateUserPayload = {
        username: form.username,
        last_name: form.last_name,
        first_name: form.first_name,
        phone: form.phone?.trim() || undefined,
        password: form.password,
        role: form.role,
        is_active: form.is_active,
        email: form.email?.trim() || undefined,
      };
      await createUser.mutateAsync(payload);
      onClose();
    } catch {
      setError("ユーザーの作成に失敗しました。ユーザー名が重複している可能性があります。");
    }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[95vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
          {/* Header */}
          <div className="shrink-0 border-b border-slate-100 bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
              </div>
              <Dialog.Title className="text-xl font-bold text-slate-900">
                新規ユーザー作成
              </Dialog.Title>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            <form id="create-user-form" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ユーザー名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: yamada_taro"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    姓 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例: 山田"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例: 太郎"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: yamada@shinsei.co.jp"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  電話番号
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 090-1234-5678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  初期パスワード <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="8文字以上"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  パスワード再入力 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.passwordConfirm}
                  onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="もう一度パスワードを入力"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  権限ロール <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r] ?? r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  状態 <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.is_active ? "active" : "inactive"}
                  onChange={(e) => setForm({ ...form, is_active: e.target.value === "active" })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="active">有効</option>
                  <option value="inactive">無効</option>
                </select>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </form>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-slate-100 bg-slate-50 p-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              form="create-user-form"
              disabled={createUser.isPending}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm"
            >
              {createUser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              作成する
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── Edit User Dialog ─────────────────────────────────────────────────────────

interface EditDialogProps {
  user: UserRecord;
  onClose: () => void;
}

function EditUserDialog({ user, onClose }: EditDialogProps) {
  const updateUser = useUpdateUser();
  const [form, setForm] = useState({
    last_name: user.last_name,
    first_name: user.first_name,
    email: user.email ?? "",
    phone: user.phone ?? "",
    role: user.role,
    is_active: user.is_active,
    password: "",
    passwordConfirm: "",
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password || form.passwordConfirm) {
      if (form.password !== form.passwordConfirm) {
        setError("パスワードが一致しません。");
        return;
      }
      if (form.password.length < 8) {
        setError("パスワードは8文字以上にしてください。");
        return;
      }
    }

    try {
      await updateUser.mutateAsync({
        id: user.id,
        data: {
          last_name: form.last_name,
          first_name: form.first_name,
          phone: form.phone?.trim() || undefined,
          email: form.email?.trim() || undefined,
          role: form.role,
          is_active: form.is_active,
          password: form.password ? form.password : undefined,
        },
      });
      onClose();
    } catch {
      setError("ユーザー情報の更新に失敗しました。");
    }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[95vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
          {/* Header */}
          <div className="shrink-0 border-b border-slate-100 bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <PencilLine className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <Dialog.Title className="text-xl font-bold text-slate-900">
                  ユーザー編集
                </Dialog.Title>
                <p className="text-sm text-slate-500">@{user.username}</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    姓 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">メールアドレス</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">電話番号</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">権限ロール</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r] ?? r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">状態</label>
                <select
                  value={form.is_active ? "active" : "inactive"}
                  onChange={(e) => setForm({ ...form, is_active: e.target.value === "active" })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="active">有効</option>
                  <option value="inactive">無効</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <p className="text-sm font-medium text-slate-700 mb-3">パスワード変更 (任意)</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      新しいパスワード
                    </label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="変更する場合のみ入力 (8文字以上)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      新しいパスワード再入力
                    </label>
                    <input
                      type="password"
                      value={form.passwordConfirm}
                      onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="もう一度入力"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}
            </form>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-slate-100 bg-slate-50 p-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              form="edit-user-form"
              disabled={updateUser.isPending}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm"
            >
              {updateUser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              保存する
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── Delete Confirm Dialog ──────────────────────────────────────────────────────

interface DeleteConfirmDialogProps {
  user: UserRecord;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

function DeleteConfirmDialog({ user, onClose, onConfirm, isDeleting }: DeleteConfirmDialogProps) {
  const fullName = `${user.last_name} ${user.first_name}`;

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
          {/* Header */}
          <div className="shrink-0 border-b border-slate-100 bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <Dialog.Title className="text-lg font-bold text-slate-900">
                  ユーザー削除の確認
                </Dialog.Title>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 text-sm text-slate-600">
            <p>
              「<span className="font-semibold text-slate-900">{fullName}</span>」のアカウントを完全に削除しますか？
            </p>
            <p className="mt-2 text-red-600 font-medium">
              この操作は元に戻せません。
            </p>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-slate-100 bg-slate-50 p-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors shadow-sm"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              削除する
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { data, isLoading, error } = useUsers();
  usePageHeader("ユーザー管理", `${data?.total ?? 0}名のユーザー`, Users);
  const deleteUser = useDeleteUser();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<UserRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [filterRole, setFilterRole] = useState<string>("all");

  const filtered = (data?.users ?? []).filter((u) => {
    const fullName = `${u.last_name} ${u.first_name}`;
    const matchSearch =
      fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // Error handled by mutation or global handler
    }
  };

  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            新規ユーザー作成
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end">
          <div className="w-full sm:w-[36rem]">
            <label className="block text-xs font-medium text-slate-600 mb-1">フリーワード検索</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="氏名・ユーザー名・メールで検索..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>
          <div className="w-full sm:w-48">
            <label className="block text-xs font-medium text-slate-600 mb-1">権限ロール</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="all">すべて</option>
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r] ?? r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">読み込み中...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16 text-red-600 text-sm">
              ユーザー一覧の取得に失敗しました。
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <ShieldCheck className="h-12 w-12 opacity-30" />
              <p className="text-sm">該当するユーザーが見つかりません</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 font-medium text-slate-500">氏名</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-500">ユーザー名</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-500">電話番号</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-500">権限</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-500">ステータス</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-500">最終ログイン</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {user.last_name} {user.first_name}
                    </td>
                    <td className="px-6 py-4 text-slate-500">@{user.username}</td>
                    <td className="px-6 py-4 text-slate-500">{user.phone ?? "—"}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          ROLE_COLORS[user.role] ?? "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {ROLE_LABELS[user.role] ?? user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          user.is_active ? "text-emerald-600" : "text-slate-400"
                        }`}
                      >
                        {user.is_active ? (
                          <>
                            <UserCheck className="h-3.5 w-3.5" />
                            有効
                          </>
                        ) : (
                          <>
                            <UserX className="h-3.5 w-3.5" />
                            無効
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {user.last_login_at
                        ? new Date(user.last_login_at).toLocaleString("ja-JP", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditTarget(user)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => setDeleteTarget(user)}
                          disabled={deleteUser.isPending}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {showCreate && <CreateUserDialog onClose={() => setShowCreate(false)} />}
      {editTarget && (
        <EditUserDialog user={editTarget} onClose={() => setEditTarget(null)} />
      )}
      {deleteTarget && (
        <DeleteConfirmDialog
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
          isDeleting={deleteUser.isPending}
        />
      )}
    </RoleGuard>
  );
}
