"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import {
  useMemos,
  useCreateMemo,
  useUpdateMemo,
  useDeleteMemo,
  useUploadAttachment,
  useDeleteAttachment,
  type MemoResponse,
  type MemoAttachmentResponse,
} from "@/hooks/useManuals";
import { useCurrentUser } from "@/hooks/useAuth";
import RichTextEditor from "@/components/common/RichTextEditor";
import { parseMarkdownToHtml } from "@/lib/markdown";
import { cn, formatDateJST } from "@/lib/utils";
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  Paperclip,
  Calendar,
  User,
  X,
  AlertTriangle,
  Download,
  Upload,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

// Helper to format file size in human readable format
function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "";
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Helper to construct attachment download URL
function getAttachmentDownloadUrl(fileUrl: string): string {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const backendOrigin = apiBase.endsWith("/api/v1")
    ? apiBase.substring(0, apiBase.length - 7)
    : apiBase;
  return `${backendOrigin}${fileUrl}`;
}

export default function MemosPage() {
  const params = useParams();
  const genbaId = params.id as string;

  const { data: memosData, isLoading, error } = useMemos(genbaId);
  const memos = memosData?.items || [];
  const createMutation = useCreateMemo();
  const updateMutation = useUpdateMemo();
  const deleteMutation = useDeleteMemo();
  const uploadMutation = useUploadAttachment();
  const deleteAttachmentMutation = useDeleteAttachment();

  const { data: user } = useCurrentUser();

  // Dialog states
  const [isOpen, setIsOpen] = useState(false);
  const [editingMemo, setEditingMemo] = useState<MemoResponse | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [memoToDelete, setMemoToDelete] = useState<MemoResponse | null>(null);

  // Form states
  const [memoDate, setMemoDate] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tempAttachments, setTempAttachments] = useState<MemoAttachmentResponse[]>([]);

  // Roles authorized to edit/CRUD (ADMIN, SENIOR_STAFF, INTERNAL_STAFF)
  const canEdit = user && ["ADMIN", "SENIOR_STAFF", "INTERNAL_STAFF"].includes(user.role);

  // Partner has NO access to Memos
  const isPartner = user?.role === "PARTNER";

  const resetForm = () => {
    setMemoDate(new Date().toISOString().slice(0, 16)); // YYYY-MM-DDTHH:mm
    setContent("");
    setSelectedFile(null);
    setTempAttachments([]);
    setEditingMemo(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleOpenEdit = (memo: MemoResponse) => {
    setEditingMemo(memo);
    setMemoDate(new Date(memo.memo_date).toISOString().slice(0, 16));
    setContent(memo.content);
    setTempAttachments(memo.attachments || []);
    setSelectedFile(null);
    setIsOpen(true);
  };

  const handleOpenDelete = (memo: MemoResponse) => {
    setMemoToDelete(memo);
    setIsDeleteOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!content || !memoDate) return;

    const payload = {
      memo_date: new Date(memoDate).toISOString(),
      content,
    };

    if (editingMemo) {
      updateMutation.mutate(
        {
          genbaId,
          memoId: editingMemo.id,
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
          onSuccess: (newMemo) => {
            // If there's a file selected, upload it to the newly created memo
            if (selectedFile) {
              uploadMutation.mutate(
                {
                  genbaId,
                  memoId: newMemo.id,
                  file: selectedFile,
                },
                {
                  onSuccess: () => {
                    setIsOpen(false);
                    resetForm();
                  },
                }
              );
            } else {
              setIsOpen(false);
              resetForm();
            }
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (!memoToDelete) return;

    deleteMutation.mutate(
      {
        genbaId,
        memoId: memoToDelete.id,
      },
      {
        onSuccess: () => {
          setIsDeleteOpen(false);
          setMemoToDelete(null);
        },
      }
    );
  };

  // Upload file immediately for an existing editing memo
  const handleImmediateUpload = () => {
    if (!editingMemo || !selectedFile) return;

    uploadMutation.mutate(
      {
        genbaId,
        memoId: editingMemo.id,
        file: selectedFile,
      },
      {
        onSuccess: (newAttachment) => {
          setTempAttachments((prev) => [...prev, newAttachment]);
          setSelectedFile(null);
        },
      }
    );
  };

  // Delete attachment immediately
  const handleAttachmentDelete = (attachmentId: string) => {
    if (!editingMemo) return;

    deleteAttachmentMutation.mutate(
      {
        genbaId,
        memoId: editingMemo.id,
        attachmentId,
      },
      {
        onSuccess: () => {
          setTempAttachments((prev) => prev.filter((att) => att.id !== attachmentId));
        },
      }
    );
  };

  if (isPartner) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <h2 className="text-lg font-bold text-red-800 flex items-center justify-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          アクセス権限がありません
        </h2>
        <p className="text-sm text-red-600 mt-2">このページの閲覧および操作は許可されていません。</p>
      </div>
    );
  }



  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <h2 className="text-lg font-bold text-red-800">エラーが発生しました</h2>
        <p className="text-sm text-red-600 mt-2">メモ一覧の取得中にエラーが発生しました。</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">現場メモ・引継ぎ事項</h2>
          <p className="text-sm text-slate-500 mt-1">現場内の連絡事項、鍵の受け渡し履歴、重要なお知らせを管理します。</p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-[#1E60F2] hover:bg-[#0F4FD0] text-sm font-semibold text-white transition-all shadow-sm duration-200 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>メモを追加</span>
          </button>
        )}
      </div>

      {/* Memos List */}
      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-4 animate-pulse"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex gap-4">
                  <div className="h-4 w-32 bg-slate-200 rounded"></div>
                  <div className="h-4 w-24 bg-slate-200 rounded"></div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-4 w-full bg-slate-200 rounded"></div>
                <div className="h-4 w-5/6 bg-slate-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : memos.length === 0 ? (
        /* Empty State: Min height 240px and correct text (ui-ux-genba-spec.md §5.3) */
        <div className="flex flex-col items-center justify-center min-h-[240px] bg-slate-50 rounded-xl border border-dashed border-slate-200 p-8 text-center">
          <span className="text-sm font-semibold text-slate-400">データがありません</span>
          {canEdit && (
            <button
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>最初のメモを登録する</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {memos.map((memo) => (
            <div
              key={memo.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-4"
            >
              {/* Memo Meta */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span>{formatDateJST(memo.memo_date)}</span>
                  </span>

                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4 text-slate-400" />
                    <span>作成者: {memo.creator?.display_name || memo.creator?.username || "システム"}</span>
                  </span>
                </div>

                {canEdit && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(memo)}
                      className="p-1.5 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                      title="編集"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleOpenDelete(memo)}
                      className="p-1.5 rounded text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                      title="削除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Memo Content */}
              <div className="text-sm text-slate-800 leading-relaxed font-sans prose prose-slate max-w-none break-all">
                <div dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(memo.content) }} />
              </div>

              {/* Attachments List */}
              {memo.attachments && memo.attachments.length > 0 && (
                <div className="border-t border-slate-100 pt-3 mt-1 flex flex-col gap-2">
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <Paperclip className="h-3.5 w-3.5" />
                    <span>添付ファイル ({memo.attachments.length}個)</span>
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {memo.attachments.map((file) => (
                      <a
                        key={file.id}
                        href={getAttachmentDownloadUrl(file.file_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors max-w-xs truncate"
                        title={`${file.file_name} (${formatFileSize(file.file_size)})`}
                      >
                        <Download className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{file.file_name}</span>
                        <span className="text-slate-400 text-[10px] shrink-0">({formatFileSize(file.file_size)})</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog.Root open={isOpen} onOpenChange={(open) => !open && resetForm() || setIsOpen(open)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white shadow-xl focus:outline-none animate-in fade-in-50 zoom-in-95 flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Header */}
            <div className="shrink-0 flex items-start justify-between p-6 border-b border-slate-100 bg-white z-10">
              <Dialog.Title className="text-lg font-bold text-slate-900">
                {editingMemo ? "メモを編集" : "新しいメモを追加"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {/* Memo Date */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="memo-date" className="text-xs font-bold text-slate-700">
                  日時 <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  id="memo-date"
                  required
                  value={memoDate}
                  onChange={(e) => setMemoDate(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                />
              </div>

              {/* Memo Content */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="memo-content" className="text-xs font-bold text-slate-700">
                  メモ内容 <span className="text-red-500">*</span>
                </label>
                <RichTextEditor
                  id="memo-content"
                  value={content}
                  onChange={setContent}
                  placeholder="現場のメモ、指示事項、トラブル報告などを入力してください..."
                />
              </div>

              {/* Attachments Section */}
              <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 mt-2">
                <span className="text-xs font-bold text-slate-700">ファイルの添付</span>

                {/* Uploaded attachments (only in Edit Mode) */}
                {editingMemo && tempAttachments.length > 0 && (
                  <div className="flex flex-col gap-1.5 mb-2">
                    <span className="text-xs font-semibold text-slate-500">アップロード済みのファイル:</span>
                    <div className="flex flex-col gap-1.5">
                      {tempAttachments.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between text-xs border border-slate-150 rounded-lg p-2 bg-slate-50"
                        >
                          <span className="text-slate-700 font-semibold truncate max-w-xs">{file.file_name}</span>
                          <button
                            type="button"
                            onClick={() => handleAttachmentDelete(file.id)}
                            className="p-1 rounded text-red-500 hover:bg-red-50 transition-colors"
                            title="ファイルを削除"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* File picker */}
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    id="attachment-file"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="attachment-file"
                    className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Paperclip className="h-4 w-4" />
                    <span>ファイルを選択</span>
                  </label>

                  {selectedFile && (
                    <div className="flex items-center gap-2 text-xs bg-slate-50 px-3 py-2 border border-slate-200 rounded-lg flex-grow">
                      <span className="font-semibold text-slate-700 truncate max-w-[150px]">
                        {selectedFile.name}
                      </span>
                      <span className="text-slate-400">({formatFileSize(selectedFile.size)})</span>

                      {editingMemo ? (
                        /* Edit mode immediate upload button */
                        <button
                          type="button"
                          onClick={handleImmediateUpload}
                          disabled={uploadMutation.isPending}
                          className="ml-auto inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors disabled:opacity-50"
                        >
                          {uploadMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Upload className="h-3.5 w-3.5" />
                          )}
                          <span>アップロード</span>
                        </button>
                      ) : (
                        /* Create mode: file is queued, show remove icon */
                        <button
                          type="button"
                          onClick={() => setSelectedFile(null)}
                          className="ml-auto text-red-500 hover:text-red-700 p-0.5"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Buttons (h-[52px] compliant with mobile/touch spec) */}
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
                  disabled={createMutation.isPending || updateMutation.isPending || uploadMutation.isPending}
                  className="inline-flex items-center justify-center h-[52px] px-6 rounded-lg bg-[#1E60F2] hover:bg-[#0F4FD0] text-base font-semibold text-white transition-colors disabled:opacity-50 shadow-sm"
                >
                  {(createMutation.isPending || updateMutation.isPending || uploadMutation.isPending) ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : null}
                  {editingMemo ? "保存" : "登録"}
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
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl focus:outline-none animate-in fade-in-50 zoom-in-95">
            
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-6 w-6 shrink-0 text-red-500" />
                <Dialog.Title className="text-lg font-bold text-slate-900">
                  メモを削除しますか？
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
                作成日: {formatDateJST(memoToDelete?.memo_date)}
              </p>
              <p>
                このメモデータ（添付ファイルを含む）を完全に削除します。この操作は取り消せません。よろしいですか？
              </p>
            </div>

            {/* Buttons: Cancel left, Delete (Destructive) right */}
            <div className="flex items-center justify-end gap-3">
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
                {deleteMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {deleteMutation.isPending ? "削除中..." : "削除"}
              </button>
            </div>

          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
