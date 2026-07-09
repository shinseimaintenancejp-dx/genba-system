"use client";

/**
 * Genba Management System — Photos Page (写真).
 *
 * Features:
 * - Gallery view (3 cols desktop, 2 cols mobile)
 * - Grouped by photo_type: 現場写真 (SITE) / 作業報告書 (WORK_REPORT)
 * - Staff: upload both types. Partner: upload WORK_REPORT only
 * - Click image → lightbox modal
 * - Delete button (Staff only) with confirmation
 * - FileUpload component integration
 *
 * See: INFRA§4, ui-ux-genba-spec.md
 */

import React, { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import {
  usePhotoList,
  useRequestUploadUrl,
  useConfirmUpload,
  useDeletePhoto,
  uploadFileToS3,
  type PhotoType,
  type PhotoResponse,
} from "@/hooks/usePhotos";
import { useCurrentUser } from "@/hooks/useAuth";
import FileUpload, { type FileUploadItem } from "@/components/common/FileUpload";
import {
  Camera,
  Loader2,
  AlertCircle,
  Trash2,
  X,
  ImageIcon,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// Main Page Component
// =============================================================================

export default function PhotosPage() {
  const params = useParams();
  const genbaId = params.id as string;

  const { data: user } = useCurrentUser();
  const { data: photos, isLoading, error } = usePhotoList(genbaId);

  const canUpload =
    user?.role === "ADMIN" ||
    user?.role === "SENIOR_STAFF" ||
    user?.role === "INTERNAL_STAFF" ||
    user?.role === "PARTNER";

  const canDelete =
    user?.role === "ADMIN" ||
    user?.role === "SENIOR_STAFF" ||
    user?.role === "INTERNAL_STAFF";

  const isPartner = user?.role === "PARTNER";

  // Upload state
  const [uploadType, setUploadType] = useState<PhotoType>("SITE");
  const [uploadItems, setUploadItems] = useState<FileUploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Lightbox state
  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoResponse | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<PhotoResponse | null>(null);

  const requestUploadUrl = useRequestUploadUrl(genbaId);
  const confirmUpload = useConfirmUpload(genbaId);
  const deleteMutation = useDeletePhoto(genbaId);

  // Group photos by type
  const sitePhotos = photos?.filter((p) => p.photo_type === "SITE") ?? [];
  const workReportPhotos =
    photos?.filter((p) => p.photo_type === "WORK_REPORT") ?? [];

  // ---------------------------------------------------------------------------
  // Upload Handler
  // ---------------------------------------------------------------------------
  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      setIsUploading(true);
      const items: FileUploadItem[] = files.map((f) => ({
        file: f,
        progress: 0,
        status: "pending" as const,
      }));
      setUploadItems(items);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Update status to uploading
        setUploadItems((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: "uploading" as const } : item
          )
        );

        try {
          // Step 1: Get presigned URL
          const presigned = await requestUploadUrl.mutateAsync({
            file_name: file.name,
            content_type: file.type,
            file_size: file.size,
            photo_type: uploadType,
          });

          // Step 2: Upload directly to S3
          await uploadFileToS3(presigned.upload_url, file, (percent) => {
            setUploadItems((prev) =>
              prev.map((item, idx) =>
                idx === i ? { ...item, progress: percent } : item
              )
            );
          });

          // Step 3: Confirm upload
          await confirmUpload.mutateAsync({
            file_key: presigned.object_key,
            file_name: file.name,
            file_size: file.size,
            content_type: file.type,
            photo_type: uploadType,
          });

          // Mark success
          setUploadItems((prev) =>
            prev.map((item, idx) =>
              idx === i
                ? { ...item, progress: 100, status: "success" as const }
                : item
            )
          );
        } catch (err) {
          setUploadItems((prev) =>
            prev.map((item, idx) =>
              idx === i
                ? {
                    ...item,
                    status: "error" as const,
                    errorMessage: "アップロードに失敗しました",
                  }
                : item
            )
          );
        }
      }

      setIsUploading(false);

      // Clear completed items after 3 seconds
      setTimeout(() => {
        setUploadItems((prev) => prev.filter((item) => item.status === "error"));
      }, 3000);
    },
    [uploadType, requestUploadUrl, confirmUpload]
  );

  // ---------------------------------------------------------------------------
  // Delete Handler
  // ---------------------------------------------------------------------------
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // Error handled by mutation
    }
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
          写真の読み込みに失敗しました
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
          <Camera className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">写真管理</h2>
          <p className="text-xs text-slate-500">
            {photos?.length ?? 0}件の写真
          </p>
        </div>
      </div>

      {/* Upload Section */}
      {canUpload && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            写真をアップロード
          </h3>

          {/* Photo Type Selector */}
          <div className="flex gap-2 mb-4">
            {(!isPartner || uploadType === "WORK_REPORT") && (
              <>
                {!isPartner && (
                  <button
                    onClick={() => setUploadType("SITE")}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                      uploadType === "SITE"
                        ? "bg-blue-100 text-blue-800 ring-1 ring-blue-300"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    現場写真
                  </button>
                )}
                <button
                  onClick={() => setUploadType("WORK_REPORT")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                    uploadType === "WORK_REPORT"
                      ? "bg-blue-100 text-blue-800 ring-1 ring-blue-300"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  <FileText className="h-3.5 w-3.5" />
                  作業報告書
                </button>
              </>
            )}
          </div>

          <FileUpload
            onFilesSelected={handleFilesSelected}
            isUploading={isUploading}
            uploadItems={uploadItems}
          />
        </div>
      )}

      {/* Site Photos Section */}
      <PhotoSection
        title="現場写真"
        icon={<ImageIcon className="h-5 w-5" />}
        iconBgClass="bg-blue-50 text-blue-600"
        photos={sitePhotos}
        canDelete={canDelete}
        onPhotoClick={setLightboxPhoto}
        onDeleteClick={setDeleteTarget}
      />

      {/* Work Report Photos Section */}
      <PhotoSection
        title="作業報告書"
        icon={<FileText className="h-5 w-5" />}
        iconBgClass="bg-emerald-50 text-emerald-600"
        photos={workReportPhotos}
        canDelete={canDelete}
        onPhotoClick={setLightboxPhoto}
        onDeleteClick={setDeleteTarget}
      />

      {/* Lightbox Modal */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
            aria-label="閉じる"
          >
            <X className="h-6 w-6" />
          </button>
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxPhoto.download_url}
              alt={lightboxPhoto.caption || lightboxPhoto.file_name}
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            />
            {lightboxPhoto.caption && (
              <p className="mt-3 text-center text-sm text-white/80">
                {lightboxPhoto.caption}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">写真の削除</h3>
            <p className="mt-2 text-sm text-slate-600">
              「<span className="font-semibold">{deleteTarget.file_name}</span>
              」を削除しますか？この操作は取り消せません。
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
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
      )}
    </div>
  );
}

// =============================================================================
// Photo Section Component (grouped by type)
// =============================================================================

interface PhotoSectionProps {
  title: string;
  icon: React.ReactNode;
  iconBgClass: string;
  photos: PhotoResponse[];
  canDelete: boolean;
  onPhotoClick: (photo: PhotoResponse) => void;
  onDeleteClick: (photo: PhotoResponse) => void;
}

function PhotoSection({
  title,
  icon,
  iconBgClass,
  photos,
  canDelete,
  onPhotoClick,
  onDeleteClick,
}: PhotoSectionProps) {
  if (photos.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              iconBgClass
            )}
          >
            {icon}
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            {title}
            <span className="ml-2 text-xs font-normal text-slate-400">
              0件
            </span>
          </h3>
        </div>
        <div className="flex min-h-[120px] items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6">
          <p className="text-sm text-slate-400">まだ写真がありません</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            iconBgClass
          )}
        >
          {icon}
        </div>
        <h3 className="text-sm font-bold text-slate-900">
          {title}
          <span className="ml-2 text-xs font-normal text-slate-400">
            {photos.length}件
          </span>
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm transition-shadow hover:shadow-lg cursor-pointer"
            onClick={() => onPhotoClick(photo)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.download_url}
              alt={photo.caption || photo.file_name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="truncate text-xs font-medium text-white">
                  {photo.file_name}
                </p>
                {photo.caption && (
                  <p className="truncate text-xs text-white/70 mt-0.5">
                    {photo.caption}
                  </p>
                )}
              </div>
            </div>

            {/* Delete Button */}
            {canDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteClick(photo);
                }}
                className="absolute top-2 right-2 rounded-full bg-white/80 p-1.5 text-red-600 opacity-0 shadow-sm transition-all group-hover:opacity-100 hover:bg-white"
                aria-label="写真を削除"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
