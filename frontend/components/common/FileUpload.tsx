"use client";

/**
 * Genba Management System — FileUpload Component.
 *
 * Reusable drag-and-drop file upload component.
 * - Drag & drop or click to select files
 * - Client-side validation (MIME type, extension, max size)
 * - Progress indicator during upload
 * - Multiple file support
 * - Accepted: image/jpeg, image/png, image/webp, image/gif (max 10MB)
 *
 * See: ui-ux-genba-spec.md §2
 */

import React, { useCallback, useRef, useState } from "react";
import { Upload, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

export interface FileUploadItem {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  errorMessage?: string;
}

interface FileUploadProps {
  /** Callback when files are selected (validated) */
  onFilesSelected: (files: File[]) => void;
  /** Whether the upload is in progress (controls disabled state) */
  isUploading?: boolean;
  /** Currently queued files with progress */
  uploadItems?: FileUploadItem[];
  /** Max file size in bytes (default: 10MB) */
  maxSizeBytes?: number;
  /** Accepted MIME types */
  acceptedTypes?: string[];
  /** Max number of files (default: 10) */
  maxFiles?: number;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
}

// Defaults
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

// =============================================================================
// FileUpload Component
// =============================================================================

export default function FileUpload({
  onFilesSelected,
  isUploading = false,
  uploadItems = [],
  maxSizeBytes = DEFAULT_MAX_SIZE,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  maxFiles = 10,
  disabled = false,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDisabled = disabled || isUploading;

  const validateFiles = useCallback(
    (files: FileList | File[]): { valid: File[]; errors: string[] } => {
      const valid: File[] = [];
      const errors: string[] = [];
      const fileArray = Array.from(files);

      if (fileArray.length > maxFiles) {
        errors.push(`最大${maxFiles}ファイルまでアップロードできます。`);
        return { valid, errors };
      }

      for (const file of fileArray) {
        // MIME type check
        if (!acceptedTypes.includes(file.type)) {
          errors.push(
            `「${file.name}」はサポートされていない形式です。JPEG, PNG, WebP, GIFのみ対応。`
          );
          continue;
        }

        // Size check
        if (file.size > maxSizeBytes) {
          const maxMB = (maxSizeBytes / (1024 * 1024)).toFixed(0);
          errors.push(
            `「${file.name}」のサイズが上限（${maxMB}MB）を超えています。`
          );
          continue;
        }

        valid.push(file);
      }

      return { valid, errors };
    },
    [acceptedTypes, maxSizeBytes, maxFiles]
  );

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const { valid, errors } = validateFiles(files);
      setValidationErrors(errors);
      if (valid.length > 0) {
        onFilesSelected(valid);
      }
    },
    [validateFiles, onFilesSelected]
  );

  // Drag & Drop handlers
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDisabled) setIsDragging(true);
    },
    [isDisabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDisabled) setIsDragging(true);
    },
    [isDisabled]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (!isDisabled && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [isDisabled, handleFiles]
  );

  const handleClick = useCallback(() => {
    if (!isDisabled) {
      inputRef.current?.click();
    }
  }, [isDisabled]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
        // Reset input so the same file can be selected again
        e.target.value = "";
      }
    },
    [handleFiles]
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop Zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="ファイルをドラッグ&ドロップ、またはクリックして選択"
        className={cn(
          "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-all duration-200",
          isDragging
            ? "border-blue-500 bg-blue-50/60"
            : "border-slate-300 bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/30",
          isDisabled && "pointer-events-none opacity-50",
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleClick(); }}
      >
        <Upload
          className={cn(
            "h-10 w-10 transition-colors",
            isDragging ? "text-blue-500" : "text-slate-400"
          )}
        />
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700">
            {isDragging
              ? "ファイルをドロップ"
              : "ファイルをドラッグ＆ドロップ"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            またはクリックして選択（JPEG, PNG, WebP, GIF / 最大10MB）
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={acceptedTypes.join(",")}
          multiple
          onChange={handleInputChange}
        />
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
          {validationErrors.map((err, i) => (
            <p key={i} className="flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              {err}
            </p>
          ))}
        </div>
      )}

      {/* Upload Progress Items */}
      {uploadItems.length > 0 && (
        <div className="space-y-2">
          {uploadItems.map((item, index) => (
            <div
              key={`${item.file.name}-${index}`}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
            >
              {/* Status Icon */}
              {item.status === "uploading" && (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-500" />
              )}
              {item.status === "success" && (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              )}
              {item.status === "error" && (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              )}
              {item.status === "pending" && (
                <Upload className="h-4 w-4 shrink-0 text-slate-400" />
              )}

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {item.file.name}
                </p>
                <p className="text-xs text-slate-500">
                  {formatFileSize(item.file.size)}
                </p>
                {item.errorMessage && (
                  <p className="text-xs text-red-600 mt-0.5">
                    {item.errorMessage}
                  </p>
                )}
              </div>

              {/* Progress Bar */}
              {item.status === "uploading" && (
                <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
