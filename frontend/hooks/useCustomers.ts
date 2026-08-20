/**
 * Genba Management System — useCustomers Hook.
 *
 * Wraps customer & contact API calls with TanStack Query v5 patterns.
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "@/lib/api";
import { queryKeys } from "./queryKeys";
import type { Customer, CustomerContact, CustomerDetail } from "@/types/customer";

// Type definition for paginated response from API
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface ListCustomersFilters {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  [key: string]: string | number | boolean | undefined;
}

// =============================================================================
// Customer Hooks
// =============================================================================

export const useCustomers = (filters: ListCustomersFilters = {}) => {
  return useQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: () => get<PaginatedResponse<Customer>>("/customers", { params: filters }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Keep previous data visible while fetching new page/filter — prevents table flash
    placeholderData: keepPreviousData,
  });
};

export const useCustomerDetail = (id: string) => {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => get<CustomerDetail>(`/customers/${id}`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Customer, "id" | "created_at" | "updated_at">) =>
      post<Customer>("/customers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) =>
      put<Customer>(`/customers/${id}`, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(data.id) });
    },
  });
};

export const useReorderCustomers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: { id: string; display_order: number }[]) =>
      put("/customers/reorder", { items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
    },
  });
};

// =============================================================================
// Customer Contact Hooks
// =============================================================================

export const useCustomerContacts = (customerId: string) => {
  return useQuery({
    queryKey: queryKeys.customers.contacts(customerId),
    queryFn: () => get<CustomerContact[]>(`/customers/${customerId}/contacts`),
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateCustomerContact = (customerId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<CustomerContact, "id" | "customer_id" | "created_at" | "updated_at">) =>
      post<CustomerContact>(`/customers/${customerId}/contacts`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.contacts(customerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(customerId) });
    },
  });
};

export const useUpdateCustomerContact = (customerId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contactId, data }: { contactId: string; data: Partial<CustomerContact> }) =>
      put<CustomerContact>(`/customers/${customerId}/contacts/${contactId}`, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.contacts(customerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(customerId) });
    },
  });
};

export const useDeleteCustomerContact = (customerId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contactId: string) =>
      del<void>(`/customers/${customerId}/contacts/${contactId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.contacts(customerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(customerId) });
    },
  });
};
