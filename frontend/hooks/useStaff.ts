/**
 * Genba Management System — useStaff Hook.
 *
 * Wraps staff API calls with TanStack Query v5 patterns.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "@/lib/api";
import { queryKeys } from "./queryKeys";

export interface Staff {
  id: string;
  full_name: string;
  position?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GenbaStaffAssignment {
  id: string;
  genba_id: string;
  staff_id: string;
  role_type: "MAIN" | "SUB";
  assigned_at: string;
  staff: Staff;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface ListStaffFilters {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  [key: string]: string | number | boolean | undefined;
}

// =============================================================================
// Staff Hooks
// =============================================================================

export const useStaffList = (filters: ListStaffFilters = {}) => {
  return useQuery({
    queryKey: queryKeys.staff.list(filters),
    queryFn: () => get<PaginatedResponse<Staff>>("/staff", { params: filters }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Staff, "id" | "is_active" | "created_at" | "updated_at">) =>
      post<Staff>("/staff", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.lists() });
    },
  });
};

export const useUpdateStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Staff> }) =>
      put<Staff>(`/staff/${id}`, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.detail(data.id) });
    },
  });
};

// =============================================================================
// Genba Staff Assignment Hooks
// =============================================================================

export const useGenbaStaffAssignments = (genbaId: string) => {
  return useQuery({
    queryKey: queryKeys.genba.staff(genbaId),
    queryFn: () => get<GenbaStaffAssignment[]>(`/staff/genba/${genbaId}`),
    enabled: !!genbaId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAssignStaff = (genbaId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { staff_id: string; role_type: "MAIN" | "SUB" }) =>
      post<GenbaStaffAssignment>(`/staff/genba/${genbaId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.genba.staff(genbaId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.genba.detail(genbaId) });
    },
  });
};

export const useUnassignStaff = (genbaId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (staffId: string) =>
      del<void>(`/staff/genba/${genbaId}/${staffId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.genba.staff(genbaId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.genba.detail(genbaId) });
    },
  });
};
