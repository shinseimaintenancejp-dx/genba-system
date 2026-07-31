/**
 * Genba Management System — User Management API & Hooks.
 *
 * Provides TanStack Query hooks for CRUD operations on users.
 * ADMIN-only access enforced both on backend and UI guard.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserRecord {
  id: string;
  username: string;
  email: string | null;
  last_name: string;
  first_name: string;
  phone: string | null;
  role: string;
  related_entity_id: string | null;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface UserListResponse {
  users: UserRecord[];
  total: number;
}

export interface CreateUserPayload {
  username: string;
  email?: string;
  last_name: string;
  first_name: string;
  phone?: string;
  password: string;
  is_active: boolean;
  role: string;
}

export interface UpdateUserPayload {
  last_name?: string;
  first_name?: string;
  phone?: string;
  password?: string;
  email?: string;
  role?: string;
  is_active?: boolean;
}

// ─── API Functions ────────────────────────────────────────────────────────────

const fetchUsers = (): Promise<UserListResponse> =>
  apiClient.get<UserListResponse, UserListResponse>("/auth/users");

const createUserApi = (data: CreateUserPayload): Promise<UserRecord> =>
  apiClient.post<UserRecord, UserRecord>("/auth/users", data);

const updateUserApi = (id: string, data: UpdateUserPayload): Promise<UserRecord> =>
  apiClient.patch<UserRecord, UserRecord>(`/auth/users/${id}`, data);

const deleteUserApi = (id: string): Promise<void> =>
  apiClient.delete<void, void>(`/auth/users/${id}`);

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: fetchUsers,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createUserApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserPayload }) =>
      updateUserApi(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteUserApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}
