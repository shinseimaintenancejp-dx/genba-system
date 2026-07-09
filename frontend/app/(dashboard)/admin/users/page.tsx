"use client";

import React, { useState } from "react";
import { RoleGuard } from "@/components/layout/RoleGuard";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeactivateUser,
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
} from "lucide-react";

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
  const [form, setForm] = useState<CreateUserPayload>({
    username: "",
    full_name: "",
    password: "",
    role: "INTERNAL_STAFF",
    email: "",
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const payload: CreateUserPayload = {
        ...form,
        email: form.email?.trim() || undefined,
      };
      await createUser.mutateAsync(payload);
      onClose();
    } catch {
      setError("ユーザーの作成に失敗しました。ユーザー名が重複している可能性があります。");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">新規ユーザー作成</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ユーザー名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="create-username"
              required
              minLength={3}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: yamada_taro"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              氏名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="create-fullname"
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: 山田 太郎"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              id="create-email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: yamada@shinsei.co.jp"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              初期パスワード <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="create-password"
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
              権限ロール <span className="text-red-500">*</span>
            </label>
            <select
              id="create-role"
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

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              id="create-user-submit"
              disabled={createUser.isPending}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {createUser.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              作成する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit User Dialog ─────────────────────────────────────────────────────────

interface EditDialogProps {
  user: UserRecord;
  onClose: () => void;
}

function EditUserDialog({ user, onClose }: EditDialogProps) {
  const updateUser = useUpdateUser();
  const [role, setRole] = useState(user.role);
  const [fullName, setFullName] = useState(user.full_name);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await updateUser.mutateAsync({
        id: user.id,
        data: { role, full_name: fullName },
      });
      onClose();
    } catch {
      setError("ユーザー情報の更新に失敗しました。");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <PencilLine className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">ユーザー編集</h2>
            <p className="text-sm text-slate-500">@{user.username}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">氏名</label>
            <input
              type="text"
              id="edit-fullname"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">権限ロール</label>
            <select
              id="edit-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r] ?? r}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              id="edit-user-submit"
              disabled={updateUser.isPending}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {updateUser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              保存する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { data, isLoading, error } = useUsers();
  const deactivateUser = useDeactivateUser();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<UserRecord | null>(null);
  const [filterRole, setFilterRole] = useState<string>("all");

  const filtered = (data?.users ?? []).filter((u) => {
    const matchSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const handleDeactivate = async (user: UserRecord) => {
    if (!confirm(`「${user.full_name}」のアカウントを無効化しますか？`)) return;
    await deactivateUser.mutateAsync(user.id);
  };

  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">ユーザー管理</h1>
            <p className="text-sm text-slate-500 mt-1">
              {data?.total ?? 0}名のユーザー
            </p>
          </div>
          <button
            id="open-create-user-dialog"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            新規ユーザー作成
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="user-search"
              type="text"
              placeholder="氏名・ユーザー名・メールで検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <select
            id="user-role-filter"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">全ロール</option>
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r] ?? r}
              </option>
            ))}
          </select>
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
                  <th className="text-left px-6 py-3 font-medium text-slate-500">メール</th>
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
                      {user.full_name}
                    </td>
                    <td className="px-6 py-4 text-slate-500">@{user.username}</td>
                    <td className="px-6 py-4 text-slate-500">{user.email ?? "—"}</td>
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
                          id={`edit-user-${user.id}`}
                          onClick={() => setEditTarget(user)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                          編集
                        </button>
                        {user.is_active && (
                          <button
                            id={`deactivate-user-${user.id}`}
                            onClick={() => handleDeactivate(user)}
                            disabled={deactivateUser.isPending}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            無効化
                          </button>
                        )}
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
    </RoleGuard>
  );
}
