/**
 * Genba Management System — usePartners Hook.
 *
 * Wraps partner API calls with TanStack Query v5 patterns.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post, put } from "@/lib/api";
import { queryKeys } from "./queryKeys";
import type { PartnerCompany } from "@/types/partner";

// Type definition for paginated response from API
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface ListPartnersFilters {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  [key: string]: string | number | boolean | undefined;
}

// =============================================================================
// Partner Hooks
// =============================================================================

export const usePartners = (filters: ListPartnersFilters = {}) => {
  return useQuery({
    queryKey: queryKeys.partners.list(filters),
    queryFn: () => get<PaginatedResponse<PartnerCompany>>("/partners", { params: filters }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const usePartnerDetail = (id: string) => {
  return useQuery({
    queryKey: queryKeys.partners.detail(id),
    queryFn: () => get<PartnerCompany>(`/partners/${id}`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreatePartner = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<PartnerCompany, "id" | "is_active" | "created_at" | "updated_at">) =>
      post<PartnerCompany>("/partners", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.lists() });
    },
  });
};

export const useUpdatePartner = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PartnerCompany> }) =>
      put<PartnerCompany>(`/partners/${id}`, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.detail(data.id) });
    },
  });
};
