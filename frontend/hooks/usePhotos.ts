/**
 * Genba Management System — usePhotos Hooks.
 *
 * Provides TanStack Query hooks for Photo management:
 * - List photos with presigned download URLs
 * - Request presigned upload URLs
 * - Confirm upload (save metadata)
 * - Delete photo
 *
 * See: INFRA§4, frontend-conventions.md §4
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post, del } from "@/lib/api";
import { queryKeys } from "./queryKeys";
import axios from "axios";

// =============================================================================
// Interfaces & Types
// =============================================================================

export type PhotoType = "SITE" | "WORK_REPORT";

export interface PhotoPresignedUrlRequest {
  file_name: string;
  content_type: string;
  file_size: number;
  photo_type: PhotoType;
}

export interface PhotoPresignedUrlResponse {
  upload_url: string;
  object_key: string;
}

export interface PhotoConfirmRequest {
  file_key: string;
  file_name: string;
  file_size: number;
  content_type: string;
  photo_type: PhotoType;
  caption?: string | null;
}

export interface PhotoResponse {
  id: string;
  genba_id: string;
  photo_type: string;
  file_name: string;
  file_size: number;
  content_type: string;
  caption: string | null;
  download_url: string;
  uploaded_by: string | null;
  created_at: string;
}

// =============================================================================
// List Photos
// =============================================================================

export function usePhotoList(genbaId: string) {
  return useQuery<PhotoResponse[]>({
    queryKey: queryKeys.genba.photos(genbaId),
    queryFn: () => get<PhotoResponse[]>(`/genba/${genbaId}/photos`),
    enabled: !!genbaId,
  });
}

// =============================================================================
// Request Presigned Upload URL
// =============================================================================

export function useRequestUploadUrl(genbaId: string) {
  return useMutation<PhotoPresignedUrlResponse, Error, PhotoPresignedUrlRequest>({
    mutationFn: (data) =>
      post<PhotoPresignedUrlResponse>(
        `/genba/${genbaId}/photos/presigned-url`,
        data
      ),
  });
}

// =============================================================================
// Upload file directly to S3 using presigned URL
// =============================================================================

export async function uploadFileToS3(
  uploadUrl: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> {
  await axios.put(uploadUrl, file, {
    headers: {
      "Content-Type": file.type,
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percent);
      }
    },
  });
}

// =============================================================================
// Confirm Upload (save metadata to DB)
// =============================================================================

export function useConfirmUpload(genbaId: string) {
  const queryClient = useQueryClient();

  return useMutation<PhotoResponse, Error, PhotoConfirmRequest>({
    mutationFn: (data) =>
      post<PhotoResponse>(`/genba/${genbaId}/photos/confirm`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.genba.photos(genbaId),
      });
    },
  });
}

// =============================================================================
// Delete Photo
// =============================================================================

export function useDeletePhoto(genbaId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (photoId: string) =>
      del<void>(`/genba/${genbaId}/photos/${photoId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.genba.photos(genbaId),
      });
    },
  });
}
