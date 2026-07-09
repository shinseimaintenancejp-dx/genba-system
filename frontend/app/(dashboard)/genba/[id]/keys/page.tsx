"use client";

/**
 * Genba Management System — Key Management Page (鍵管理).
 *
 * Features:
 * - Table with masked key codes (●●●●●●)
 * - Reveal button (表示) → decrypt → auto-hide after 30 seconds
 * - CRUD dialog for Staff/Admin (KEY_WRITE)
 * - Workers: view + reveal only, no create/update/delete
 * - Partner/Customer: tab hidden entirely (via layout.tsx)
 *
 * See: SEC§4, ui-ux-genba-spec.md
 */

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  useKeyList,
  useCreateKey,
  useUpdateKey,
  useDeleteKey,
  useRevealKey,
  type KeyInfoResponse,
  type KeyInfoCreatePayload,
  type KeyInfoUpdatePayload,
  type KeyInfoDecryptedResponse,
} from "@/hooks/useKeys";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Key,
  Loader2,
  AlertCircle,
  MapPin,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Auto-hide timer duration for revealed key codes (SEC§4.3)
const REVEAL_AUTO_HIDE_MS = 30_000; // 30 seconds

// =============================================================================
// Main Page Component
// =============================================================================

export default function KeysPage() {
  const params = useParams();
  const genbaId = params.id as string;

  const { data: user } = useCurrentUser();
  const { data: keys, isLoading, error } = useKeyList(genbaId);

  const canWrite =
    user?.role === "ADMIN" ||
    user?.role === "SENIOR_STAFF" ||
    user?.role === "INTERNAL_STAFF";

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<KeyInfoResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KeyInfoResponse | null>(null);

  const handleCreate = () => {
    setEditingKey(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (key: KeyInfoResponse) => {
    setEditingKey(key);
    setIsDialogOpen(true);
  };

  // ---------------------------------------------------------------------------
  // Loading State
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 p-6">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="text-sm font-semibold text-red-800">
          鍵情報の読み込みに失敗しました
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Key className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">鍵管理</h2>
            <p className="text-xs text-slate-500">
              {keys?.length ?? 0}件の鍵情報
            </p>
          </div>
        </div>

        {canWrite && (
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1E60F2] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0F4FD0]"
          >
            <Plus className="h-4 w-4" />
            鍵を追加
          </button>
        )}
      </div>

      {/* Key List */}
      {!keys || keys.length === 0 ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8">
          <Key className="h-12 w-12 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">
            鍵情報がまだ登録されていません
          </p>
          {canWrite && (
            <button
              onClick={handleCreate}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#1E60F2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0F4FD0]"
            >
              <Plus className="h-4 w-4" />
              最初の鍵を追加
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <KeyCard
              key={key.id}
              keyInfo={key}
              genbaId={genbaId}
              canWrite={canWrite}
              onEdit={() => handleEdit(key)}
              onDelete={() => setDeleteTarget(key)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      {isDialogOpen && (
        <KeyFormDialog
          genbaId={genbaId}
          editingKey={editingKey}
          onClose={() => setIsDialogOpen(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <DeleteConfirmDialog
          genbaId={genbaId}
          keyInfo={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// =============================================================================
// Key Card Component (with reveal functionality)
// =============================================================================

interface KeyCardProps {
  keyInfo: KeyInfoResponse;
  genbaId: string;
  canWrite: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function KeyCard({ keyInfo, genbaId, canWrite, onEdit, onDelete }: KeyCardProps) {
  const revealMutation = useRevealKey(genbaId);
  const [revealedData, setRevealedData] = useState<KeyInfoDecryptedResponse | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [autoHideTimer, setAutoHideTimer] = useState<NodeJS.Timeout | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoHideTimer) clearTimeout(autoHideTimer);
    };
  }, [autoHideTimer]);

  const handleReveal = useCallback(async () => {
    if (isRevealed) {
      // Hide immediately
      setIsRevealed(false);
      setRevealedData(null);
      setCountdown(0);
      if (autoHideTimer) clearTimeout(autoHideTimer);
      return;
    }

    try {
      const data = await revealMutation.mutateAsync(keyInfo.id);
      setRevealedData(data);
      setIsRevealed(true);
      setCountdown(30);

      // Countdown timer
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Auto-hide after 30 seconds (SEC§4.3)
      const timer = setTimeout(() => {
        setIsRevealed(false);
        setRevealedData(null);
        setCountdown(0);
        clearInterval(countdownInterval);
      }, REVEAL_AUTO_HIDE_MS);

      setAutoHideTimer(timer);
    } catch {
      // Error handled by TanStack Query
    }
  }, [isRevealed, autoHideTimer, keyInfo.id, revealMutation]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        {/* Key Info */}
        <div className="flex-1 space-y-3">
          {/* Label & Location */}
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {keyInfo.key_label}
            </h3>
            {keyInfo.location_description && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <MapPin className="h-3 w-3" />
                {keyInfo.location_description}
              </p>
            )}
          </div>

          {/* Key Codes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Key Code */}
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="mb-1 text-xs font-medium text-slate-500">
                鍵コード
              </p>
              <p
                className={cn(
                  "font-mono text-sm font-semibold",
                  isRevealed ? "text-blue-700" : "text-slate-800"
                )}
              >
                {isRevealed && revealedData
                  ? revealedData.key_code ?? "—"
                  : keyInfo.key_code_masked}
              </p>
            </div>

            {/* Keybanker Code */}
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="mb-1 text-xs font-medium text-slate-500">
                キーバンカーコード
              </p>
              <p
                className={cn(
                  "font-mono text-sm font-semibold",
                  isRevealed ? "text-blue-700" : "text-slate-800"
                )}
              >
                {isRevealed && revealedData
                  ? revealedData.keybanker_code ?? "—"
                  : keyInfo.keybanker_code_masked}
              </p>
            </div>
          </div>

          {/* Notes */}
          {keyInfo.notes && (
            <p className="flex items-start gap-1.5 text-xs text-slate-500">
              <StickyNote className="h-3 w-3 mt-0.5 shrink-0" />
              {keyInfo.notes}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 shrink-0">
          {/* Reveal/Hide Button */}
          <button
            onClick={handleReveal}
            disabled={revealMutation.isPending}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
              isRevealed
                ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
            )}
          >
            {revealMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isRevealed ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            {isRevealed ? `非表示(${countdown}s)` : "表示"}
          </button>

          {/* Edit/Delete (Staff only) */}
          {canWrite && (
            <>
              <button
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                編集
              </button>
              <button
                onClick={onDelete}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                削除
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Key Form Dialog (Create / Edit)
// =============================================================================

interface KeyFormDialogProps {
  genbaId: string;
  editingKey: KeyInfoResponse | null;
  onClose: () => void;
}

function KeyFormDialog({ genbaId, editingKey, onClose }: KeyFormDialogProps) {
  const createMutation = useCreateKey(genbaId);
  const updateMutation = useUpdateKey(genbaId);
  const isEditing = !!editingKey;

  const [formData, setFormData] = useState({
    key_label: editingKey?.key_label ?? "",
    key_code: "",
    keybanker_code: "",
    location_description: editingKey?.location_description ?? "",
    notes: editingKey?.notes ?? "",
    sort_order: editingKey?.sort_order ?? 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditing && editingKey) {
        const payload: KeyInfoUpdatePayload = {};
        if (formData.key_label !== editingKey.key_label)
          payload.key_label = formData.key_label;
        if (formData.key_code) payload.key_code = formData.key_code;
        if (formData.keybanker_code)
          payload.keybanker_code = formData.keybanker_code;
        if (formData.location_description !== editingKey.location_description)
          payload.location_description = formData.location_description || null;
        if (formData.notes !== editingKey.notes)
          payload.notes = formData.notes || null;
        if (formData.sort_order !== editingKey.sort_order)
          payload.sort_order = formData.sort_order;

        await updateMutation.mutateAsync({
          keyId: editingKey.id,
          data: payload,
        });
      } else {
        const payload: KeyInfoCreatePayload = {
          key_label: formData.key_label,
          key_code: formData.key_code || null,
          keybanker_code: formData.keybanker_code || null,
          location_description: formData.location_description || null,
          notes: formData.notes || null,
          sort_order: formData.sort_order,
        };
        await createMutation.mutateAsync(payload);
      }
      onClose();
    } catch {
      // Error handled by mutation
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-900">
          {isEditing ? "鍵情報を編集" : "鍵情報を追加"}
        </h3>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Key Label */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              鍵名 <span className="text-red-500">*</span>
            </label>
            <input
              id="key-label-input"
              type="text"
              required
              maxLength={100}
              value={formData.key_label}
              onChange={(e) =>
                setFormData({ ...formData, key_label: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              placeholder="例: 正面エントランス"
            />
          </div>

          {/* Key Code */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              鍵コード {isEditing && <span className="text-xs text-slate-400">（変更する場合のみ入力）</span>}
            </label>
            <input
              id="key-code-input"
              type="text"
              maxLength={100}
              value={formData.key_code}
              onChange={(e) =>
                setFormData({ ...formData, key_code: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-mono text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              placeholder="暗号化して保存されます"
            />
          </div>

          {/* Keybanker Code */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              キーバンカーコード {isEditing && <span className="text-xs text-slate-400">（変更する場合のみ入力）</span>}
            </label>
            <input
              id="keybanker-code-input"
              type="text"
              maxLength={100}
              value={formData.keybanker_code}
              onChange={(e) =>
                setFormData({ ...formData, keybanker_code: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-mono text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              placeholder="暗号化して保存されます"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              設置場所
            </label>
            <input
              id="location-input"
              type="text"
              maxLength={500}
              value={formData.location_description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  location_description: e.target.value,
                })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              placeholder="例: 管理人室 壁掛けボックス内"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              備考
            </label>
            <textarea
              id="notes-input"
              maxLength={1000}
              rows={2}
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
              placeholder="追加のメモ"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending || !formData.key_label.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1E60F2] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0F4FD0] disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? "更新" : "登録"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// Delete Confirmation Dialog
// =============================================================================

interface DeleteConfirmDialogProps {
  genbaId: string;
  keyInfo: KeyInfoResponse;
  onClose: () => void;
}

function DeleteConfirmDialog({
  genbaId,
  keyInfo,
  onClose,
}: DeleteConfirmDialogProps) {
  const deleteMutation = useDeleteKey(genbaId);

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(keyInfo.id);
      onClose();
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-900">鍵情報の削除</h3>
        <p className="mt-2 text-sm text-slate-600">
          「<span className="font-semibold">{keyInfo.key_label}</span>
          」を削除しますか？この操作は取り消せません。
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={deleteMutation.isPending}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-[#F83B3B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#E51E1E] disabled:opacity-50 transition-colors"
          >
            {deleteMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            削除
          </button>
        </div>
      </div>
    </div>
  );
}
