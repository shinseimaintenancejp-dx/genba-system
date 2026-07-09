/**
 * Genba Management System — useKeys Hooks.
 *
 * Provides TanStack Query hooks for Key Management CRUD operations.
 * Includes reveal (decrypt) hook with auto-hide timer support.
 *
 * See: SEC§4, frontend-conventions.md §4
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "@/lib/api";
import { queryKeys } from "./queryKeys";

// =============================================================================
// Interfaces & Types
// =============================================================================

export interface KeyInfoCreatePayload {
  key_label: string;
  key_code?: string | null;
  keybanker_code?: string | null;
  location_description?: string | null;
  notes?: string | null;
  sort_order?: number;
}

export interface KeyInfoUpdatePayload {
  key_label?: string | null;
  key_code?: string | null;
  keybanker_code?: string | null;
  location_description?: string | null;
  notes?: string | null;
  sort_order?: number | null;
}

export interface KeyInfoResponse {
  id: string;
  genba_id: string;
  key_label: string;
  has_key_code: boolean;
  has_keybanker_code: boolean;
  key_code_masked: string;
  keybanker_code_masked: string;
  location_description: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface KeyInfoDecryptedResponse {
  id: string;
  genba_id: string;
  key_label: string;
  key_code: string | null;
  keybanker_code: string | null;
  location_description: string | null;
  notes: string | null;
}

// =============================================================================
// List Keys (masked)
// =============================================================================

export function useKeyList(genbaId: string) {
  return useQuery<KeyInfoResponse[]>({
    queryKey: queryKeys.genba.keys(genbaId),
    queryFn: () => get<KeyInfoResponse[]>(`/genba/${genbaId}/keys`),
    enabled: !!genbaId,
  });
}

// =============================================================================
// Reveal Key (decrypt) — SENSITIVE
// =============================================================================

export function useRevealKey(genbaId: string) {
  return useMutation<KeyInfoDecryptedResponse, Error, string>({
    mutationFn: (keyId: string) =>
      get<KeyInfoDecryptedResponse>(`/genba/${genbaId}/keys/${keyId}/reveal`),
  });
}

// =============================================================================
// Create Key
// =============================================================================

export function useCreateKey(genbaId: string) {
  const queryClient = useQueryClient();

  return useMutation<KeyInfoResponse, Error, KeyInfoCreatePayload>({
    mutationFn: (data) =>
      post<KeyInfoResponse>(`/genba/${genbaId}/keys`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.genba.keys(genbaId),
      });
    },
  });
}

// =============================================================================
// Update Key
// =============================================================================

export function useUpdateKey(genbaId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    KeyInfoResponse,
    Error,
    { keyId: string; data: KeyInfoUpdatePayload }
  >({
    mutationFn: ({ keyId, data }) =>
      put<KeyInfoResponse>(`/genba/${genbaId}/keys/${keyId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.genba.keys(genbaId),
      });
    },
  });
}

// =============================================================================
// Delete Key
// =============================================================================

export function useDeleteKey(genbaId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (keyId: string) =>
      del<void>(`/genba/${genbaId}/keys/${keyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.genba.keys(genbaId),
      });
    },
  });
}
