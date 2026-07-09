/**
 * Genba Management System — useWorkers Hook.
 *
 * Wraps worker API calls with TanStack Query v5 patterns.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "@/lib/api";
import { queryKeys } from "./queryKeys";

export interface Worker {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  birth_date?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GenbaWorkerAssignment {
  id: string;
  genba_id: string;
  worker_id: string;
  is_active: boolean;
  assigned_at: string;
  removed_at?: string;
  worker: Worker;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface ListWorkersFilters {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  [key: string]: string | number | boolean | undefined;
}

// =============================================================================
// Worker Hooks
// =============================================================================

export const useWorkersList = (filters: ListWorkersFilters = {}) => {
  return useQuery({
    queryKey: queryKeys.workers.list(filters),
    queryFn: () => get<PaginatedResponse<Worker>>("/workers", { params: filters }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateWorker = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Worker, "id" | "is_active" | "created_at" | "updated_at">) =>
      post<Worker>("/workers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.lists() });
    },
  });
};

export const useUpdateWorker = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Worker> }) =>
      put<Worker>(`/workers/${id}`, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.detail(data.id) });
    },
  });
};

// =============================================================================
// Genba Worker Assignment Hooks
// =============================================================================

export const useGenbaWorkerAssignments = (genbaId: string, onlyActive: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.genba.workers(genbaId),
    queryFn: () => get<GenbaWorkerAssignment[]>(`/workers/genba/${genbaId}`, { params: { only_active: onlyActive } }),
    enabled: !!genbaId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAssignWorker = (genbaId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { worker_id: string }) =>
      post<GenbaWorkerAssignment>(`/workers/genba/${genbaId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.genba.workers(genbaId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.genba.detail(genbaId) });
    },
  });
};

export const useUnassignWorker = (genbaId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workerId: string) =>
      del<GenbaWorkerAssignment>(`/workers/genba/${genbaId}/${workerId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.genba.workers(genbaId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.genba.detail(genbaId) });
    },
  });
};
