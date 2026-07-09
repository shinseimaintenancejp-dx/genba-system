"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useEntryExit, useUpsertEntryExit } from "@/hooks/useManuals";
import { useCurrentUser } from "@/hooks/useAuth";
import RichTextEditor from "@/components/common/RichTextEditor";
import { parseMarkdownToHtml } from "@/lib/markdown";
import { Loader2, Edit3, Save, X, ShieldAlert } from "lucide-react";

export default function EntryExitPage() {
  const params = useParams();
  const genbaId = params.id as string;

  const { data: entryExit, isLoading, error } = useEntryExit(genbaId);
  const upsertMutation = useUpsertEntryExit();
  const { data: user } = useCurrentUser();

  const [isEditing, setIsEditing] = useState(false);
  const [entryMethod, setEntryMethod] = useState("");
  const [exitMethod, setExitMethod] = useState("");
  const [safetyNotes, setSafetyNotes] = useState("");

  // Sync state with loaded data
  useEffect(() => {
    if (entryExit) {
      setEntryMethod(entryExit.entry_method || "");
      setExitMethod(entryExit.exit_method || "");
      setSafetyNotes(entryExit.safety_notes || "");
    }
  }, [entryExit]);

  // Roles authorized to edit (ADMIN, SENIOR_STAFF, INTERNAL_STAFF)
  const canEdit = user && ["ADMIN", "SENIOR_STAFF", "INTERNAL_STAFF"].includes(user.role);

  const handleSave = () => {
    upsertMutation.mutate(
      {
        genbaId,
        data: {
          entry_method: entryMethod || null,
          exit_method: exitMethod || null,
          safety_notes: safetyNotes || null,
        },
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  const handleCancel = () => {
    if (entryExit) {
      setEntryMethod(entryExit.entry_method || "");
      setExitMethod(entryExit.exit_method || "");
      setSafetyNotes(entryExit.safety_notes || "");
    } else {
      setEntryMethod("");
      setExitMethod("");
      setSafetyNotes("");
    }
    setIsEditing(false);
  };



  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <h2 className="text-lg font-bold text-red-800">エラーが発生しました</h2>
        <p className="text-sm text-red-600 mt-2">入退館情報の取得中にエラーが発生しました。</p>
      </div>
    );
  }

  const hasData = entryExit && (entryExit.entry_method || entryExit.exit_method || entryExit.safety_notes);

  return (
    <div className="flex flex-col gap-6">
      {/* Action Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">入退館マニュアル</h2>
          <p className="text-sm text-slate-500 mt-1">現場への入館・退館手順および安全注意事項を確認します。</p>
        </div>

        {canEdit && !isEditing && !isLoading && (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-[#1E60F2] hover:bg-[#0F4FD0] text-sm font-semibold text-white transition-all shadow-sm duration-200"
          >
            <Edit3 className="h-4 w-4" />
            <span>編集</span>
          </button>
        )}
      </div>

      {isLoading ? (
        /* Skeleton loaders (3 columns matching the actual layout) */
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-pulse">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
                <div className="h-4 w-24 bg-slate-200 rounded"></div>
              </div>
              <div className="p-4 flex-grow min-h-[160px] flex flex-col gap-2">
                <div className="h-4 w-full bg-slate-200 rounded"></div>
                <div className="h-4 w-5/6 bg-slate-200 rounded"></div>
                <div className="h-4 w-2/3 bg-slate-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : isEditing ? (
        /* Edit Mode */
        <div className="flex flex-col gap-6 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          {/* Entry Method */}
          <div className="flex flex-col gap-2">
            <label htmlFor="entry-method" className="text-sm font-bold text-slate-800">
              入館手順
            </label>
            <RichTextEditor
              id="entry-method"
              value={entryMethod}
              onChange={setEntryMethod}
              placeholder="入館手順を入力してください（例：通用口の鍵番号、警備解除手順など）"
            />
          </div>

          {/* Exit Method */}
          <div className="flex flex-col gap-2">
            <label htmlFor="exit-method" className="text-sm font-bold text-slate-800">
              退館手順
            </label>
            <RichTextEditor
              id="exit-method"
              value={exitMethod}
              onChange={setExitMethod}
              placeholder="退館手順を入力してください（例：最終施錠、電気・エアコンの消灯など）"
            />
          </div>

          {/* Safety Notes */}
          <div className="flex flex-col gap-2">
            <label htmlFor="safety-notes" className="text-sm font-bold text-slate-800">
              安全注意事項
            </label>
            <RichTextEditor
              id="safety-notes"
              value={safetyNotes}
              onChange={setSafetyNotes}
              placeholder="安全注意事項を入力してください（例：危険箇所、緊急連絡先など）"
            />
          </div>

          {/* Operations Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center justify-center h-[50px] px-6 rounded-lg border border-slate-200 bg-white text-base font-semibold text-slate-800 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <X className="h-4 w-4 mr-2" />
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={upsertMutation.isPending}
              className="inline-flex items-center justify-center h-[50px] px-6 rounded-lg bg-[#1E60F2] hover:bg-[#0F4FD0] text-base font-semibold text-white transition-colors disabled:opacity-50 shadow-sm"
            >
              {upsertMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <Save className="h-5 w-5 mr-2" />
              )}
              {upsertMutation.isPending ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      ) : (
        /* View Mode */
        <div className="flex flex-col gap-6">
          {!hasData ? (
            /* Empty State: Min height 240px and correct text (ui-ux-genba-spec.md §5.3) */
            <div className="flex flex-col items-center justify-center min-h-[240px] bg-slate-50 rounded-xl border border-dashed border-slate-200 p-8 text-center">
              <span className="text-sm font-semibold text-slate-400">データがありません</span>
              {canEdit && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="mt-4 inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                >
                  <Edit3 className="h-4 w-4" />
                  <span>作成する</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Entry Method Card */}
              <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 text-sm">入館手順</h3>
                </div>
                <div className="p-4 flex-grow min-h-[160px]">
                  {entryExit?.entry_method ? (
                    <div
                      className="text-sm text-slate-700 leading-relaxed prose prose-slate max-w-none break-all"
                      dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(entryExit.entry_method) }}
                    />
                  ) : (
                    <span className="text-sm italic text-slate-400">未設定</span>
                  )}
                </div>
              </div>

              {/* Exit Method Card */}
              <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 text-sm">退館手順</h3>
                </div>
                <div className="p-4 flex-grow min-h-[160px]">
                  {entryExit?.exit_method ? (
                    <div
                      className="text-sm text-slate-700 leading-relaxed prose prose-slate max-w-none break-all"
                      dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(entryExit.exit_method) }}
                    />
                  ) : (
                    <span className="text-sm italic text-slate-400">未設定</span>
                  )}
                </div>
              </div>

              {/* Safety Notes Card */}
              <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 text-sm text-amber-800 flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>安全注意事項</span>
                  </h3>
                </div>
                <div className="p-4 flex-grow min-h-[160px] bg-amber-50/20">
                  {entryExit?.safety_notes ? (
                    <div
                      className="text-sm text-slate-700 leading-relaxed prose prose-slate max-w-none break-all"
                      dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(entryExit.safety_notes) }}
                    />
                  ) : (
                    <span className="text-sm italic text-slate-400">未設定</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
