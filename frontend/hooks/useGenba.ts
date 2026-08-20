/**
 * Genba Management System — useGenba Hook.
 *
 * Wraps Genba API calls with TanStack Query v5 patterns.
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post, put, patch } from "@/lib/api";
import { queryKeys } from "./queryKeys";
import type { Genba, GenbaDetail, DuplicateWarning } from "@/types/genba";

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface ListGenbaFilters {
  page?: number;
  limit?: number;
  status?: string;
  customer_ids?: string[];
  staff_id?: string;
  search?: string;
  has_periodic?: boolean;
  periodic_month?: number;
  [key: string]: string | number | boolean | string[] | undefined;
}

// =============================================================================
// Genba Hooks
// =============================================================================

export const useGenbaList = (filters: ListGenbaFilters = {}) => {
  return useQuery({
    queryKey: queryKeys.genba.list(filters),
    queryFn: () => get<PaginatedResponse<Genba>>("/genba", { params: filters }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Keep previous data visible while fetching new page/filter — prevents table flash
    placeholderData: keepPreviousData,
  });
};

export const useGenbaDetail = (id: string) => {
  return useQuery({
    queryKey: queryKeys.genba.detail(id),
    queryFn: () => get<GenbaDetail>(`/genba/${id}`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateGenba = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Genba, "id" | "status" | "site_confirmed" | "manual_created" | "created_at" | "updated_at"> & { confirm_duplicate?: boolean }) => {
      // Send confirm_duplicate flag to bypass duplicate warning if user chooses to proceed
      return post<Genba | DuplicateWarning>("/genba", data);
    },
    onSuccess: (data) => {
      // Only invalidate cache if it is a successful Genba creation, not a duplicate warning
      if (!("warning" in data)) {
        queryClient.invalidateQueries({ queryKey: queryKeys.genba.lists() });
      }
    },
  });
};

export const useUpdateGenba = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Genba> }) =>
      put<Genba>(`/genba/${id}`, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.genba.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.genba.detail(data.id) });
    },
  });
};

export const useTerminateGenba = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      patch<Genba>(`/genba/${id}/terminate`),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.genba.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.genba.detail(data.id) });
    },
  });
};
