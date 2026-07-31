import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "@/lib/api";
import { components } from "@/types/api.generated";

export type Staff = components["schemas"]["StaffResponse"];
export type CreateStaffPayload = components["schemas"]["StaffCreate"];
export type UpdateStaffPayload = components["schemas"]["StaffUpdate"];
export type GenbaStaffAssignmentResponse = components["schemas"]["GenbaStaffAssignmentResponse"];
export type GenbaStaffAssignmentCreate = components["schemas"]["GenbaStaffAssignmentCreate"];

export const queryKeys = {
  staff: {
    all: ["staff"] as const,
    lists: () => [...queryKeys.staff.all, "list"] as const,
    list: (filters: string) => [...queryKeys.staff.lists(), { filters }] as const,
    details: () => [...queryKeys.staff.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.staff.details(), id] as const,
    genbaAssignments: (genbaId: string) => [...queryKeys.staff.all, "genba", genbaId] as const,
  },
};

// =============================================================================
// Basic Staff CRUD Hooks
// =============================================================================

interface StaffListParams {
  skip?: number;
  limit?: number;
  is_active?: boolean;
  search?: string;
  role?: string;
}

interface PaginatedStaffResponse {
  items: Staff[];
  total: number;
}

export const useStaffList = (params?: StaffListParams) => {
  return useQuery({
    queryKey: queryKeys.staff.list(JSON.stringify(params || {})),
    queryFn: () => get<PaginatedStaffResponse>("/staff", { params }),
  });
};

export const useStaffDetail = (id: string) => {
  return useQuery({
    queryKey: queryKeys.staff.detail(id),
    queryFn: () => get<Staff>(`/staff/${id}`),
    enabled: !!id,
  });
};

export const useCreateStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStaffPayload) =>
      post<Staff>("/staff", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.lists() });
    },
  });
};

export const useUpdateStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStaffPayload }) =>
      put<Staff>(`/staff/${id}`, data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.detail(data.id) });
    },
  });
};

export const useDeleteStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => del(`/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.lists() });
    },
  });
};


// =============================================================================
// Genba Staff Assignment Hooks
// =============================================================================

export const useGenbaStaff = (genbaId: string) => {
  return useQuery({
    queryKey: queryKeys.staff.genbaAssignments(genbaId),
    queryFn: () => get<GenbaStaffAssignmentResponse[]>(`/genba/${genbaId}/staff`),
    enabled: !!genbaId,
  });
};

export const useAssignGenbaStaff = (genbaId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<GenbaStaffAssignmentCreate, "genba_id">) =>
      post<GenbaStaffAssignmentResponse>(`/genba/${genbaId}/staff`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.staff.genbaAssignments(genbaId),
      });
    },
  });
};

export const useUpdateGenbaStaffRole = (genbaId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assignmentId, role_type }: { assignmentId: string; role_type: string }) =>
      put<GenbaStaffAssignmentResponse>(`/genba/${genbaId}/staff/${assignmentId}`, { role_type }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.staff.genbaAssignments(genbaId),
      });
    },
  });
};

export const useRemoveGenbaStaff = (genbaId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assignmentId: string) => del(`/genba/${genbaId}/staff/${assignmentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.staff.genbaAssignments(genbaId),
      });
    },
  });
};

