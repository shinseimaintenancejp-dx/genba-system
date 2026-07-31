/**
 * Genba Management System — useContracts Hook.
 *
 * Wraps contract API calls with TanStack Query v5 patterns.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "@/lib/api";
import { queryKeys } from "./queryKeys";
import type { Contract, ContractWithRelations, ContractCreatePayload } from "@/types/contract";

// Type definition for paginated response from API
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface ListContractsFilters {
  page?: number;
  limit?: number;
  status?: string;
  contract_type?: string;
  service_category?: string;
  genba_id?: string;
  customer_id?: string;
  customer_ids?: string[];
  partner_id?: string;
  search?: string;
  staff_id?: string;
  periodic_month?: number;
  [key: string]: string | string[] | number | boolean | undefined;
}

// =============================================================================
// Payload Mapper
// =============================================================================

/**
 * Maps frontend camelCase domain models to backend snake_case payload.
 */
const mapContractPayloadToSnakeCase = (payload: ContractCreatePayload | Partial<ContractCreatePayload>) => {
  const base: Record<string, any> = {};
  
  if ("contractName" in payload && payload.contractName !== undefined) {
    base.contract_name = payload.contractName;
  }
  if (payload.contractType !== undefined) base.contract_type = payload.contractType;
  if (payload.serviceType !== undefined) base.service_type = payload.serviceType;
  if (payload.serviceCategory !== undefined) base.service_category = payload.serviceCategory;
  if (payload.genbaId !== undefined) base.genba_id = payload.genbaId;
  if (payload.customerId !== undefined) {
    base.customer_id = payload.customerId === "" ? null : payload.customerId;
  }
  if (payload.partnerId !== undefined) {
    base.partner_id = payload.partnerId === "" ? null : payload.partnerId;
  }
  if (payload.startDate !== undefined) base.start_date = payload.startDate;
  if (payload.endDate !== undefined) base.end_date = payload.endDate;
  if ((payload as any).status !== undefined) base.status = (payload as any).status;
  if (payload.amount !== undefined) base.amount = payload.amount;
  if (payload.hourlyRate !== undefined) base.hourly_rate = payload.hourlyRate;
  if (payload.taxType !== undefined) base.tax_type = payload.taxType;
  if (payload.autoRenew !== undefined) base.auto_renew = payload.autoRenew;
  if (payload.invoiceRequired !== undefined) base.invoice_required = payload.invoiceRequired;
  if (payload.contractPdfUrl !== undefined) base.contract_pdf_url = payload.contractPdfUrl;
  if (payload.workContentSummary !== undefined) base.work_content_summary = payload.workContentSummary;
  if (payload.weeklyFrequency !== undefined) base.weekly_frequency = payload.weeklyFrequency;
  if (payload.workDays !== undefined) base.work_days = payload.workDays;

  // Map nested objects if present
  if ("workSlots" in payload && payload.workSlots) {
    base.work_slots = payload.workSlots.map(s => ({
      start_time: s.startTime,
      end_time: s.endTime,
      break_minutes: s.breakMinutes,
      work_duration_hours: s.workDurationHours,
      sort_order: s.sortOrder,
    }));
  }
  
  if ("workerCounts" in payload && payload.workerCounts) {
    base.worker_counts = payload.workerCounts.map(w => ({
      worker_count: w.workerCount,
      work_duration_hours: w.workDurationHours,
      total_hours: w.totalHours,
      sort_order: w.sortOrder,
    }));
  }
  
  if ("holidayRules" in payload && payload.holidayRules) {
    base.holiday_rules = payload.holidayRules.map(r => ({
      rule_type: r.ruleType,
      action: r.action,
    }));
  }
  
  if ("periodicSchedule" in payload && payload.periodicSchedule) {
    base.periodic_schedule = {
      frequency_per_year: payload.periodicSchedule.frequencyPerYear,
      work_months: payload.periodicSchedule.workMonths,
      work_days: payload.periodicSchedule.workDays,
    };
  }

  if ("periodicWorkContents" in payload && payload.periodicWorkContents) {
    base.periodic_work_contents = payload.periodicWorkContents.map(c => ({
      id: c.id,
      floor: c.floor,
      area: c.area,
      work_content: c.workContent,
      sort_order: c.sortOrder,
    }));
  }
  
  if ("workType" in payload && payload.workType !== undefined) {
    base.work_type = payload.workType;
  }
  if ("subServiceType" in payload && payload.subServiceType !== undefined) {
    base.sub_service_type = payload.subServiceType;
  }
  if ("workExecutionDate" in payload && payload.workExecutionDate !== undefined) {
    base.work_execution_date = payload.workExecutionDate;
  }
  
  return base;
};

// =============================================================================
// Contract Hooks
// =============================================================================

export const useContracts = (filters: ListContractsFilters = {}) => {
  return useQuery({
    queryKey: queryKeys.contracts.list(filters),
    queryFn: () => get<PaginatedResponse<ContractWithRelations>>("/contracts", { params: filters }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useContractsByCategory = (genbaId: string, category: string) => {
  return useQuery({
    queryKey: queryKeys.contracts.list({ genba_id: genbaId, service_category: category }),
    queryFn: () => get<PaginatedResponse<ContractWithRelations>>("/contracts", { 
      params: { genba_id: genbaId, service_category: category, limit: 100 } 
    }),
    enabled: !!genbaId && !!category,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useContractDetail = (id: string) => {
  return useQuery({
    queryKey: queryKeys.contracts.detail(id),
    queryFn: () => get<ContractWithRelations>(`/contracts/${id}`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateContract = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ContractCreatePayload) => {
      const snakeCasePayload = mapContractPayloadToSnakeCase(data);
      return post<ContractWithRelations>("/contracts", snakeCasePayload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.lists() });
      if (variables.genbaId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.genba.contracts(variables.genbaId) });
      }
    },
  });
};

export const useUpdateContract = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ContractCreatePayload> }) => {
      const snakeCasePayload = mapContractPayloadToSnakeCase(data);
      return put<ContractWithRelations>(`/contracts/${id}`, snakeCasePayload);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.detail(variables.id) });
      if (data.genba_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.genba.contracts(data.genba_id) });
      }
    },
  });
};

export const useUploadContractPdf = (contractId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      return post<{ url: string; message: string }>(`/contracts/${contractId}/upload-pdf`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    },
    onSuccess: () => {
      // Invalidate detail to trigger a refetch and get the new PDF URL
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.detail(contractId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.lists() });
    },
  });
};

export const useDeleteContract = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      return del(`/contracts/${id}`);
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.lists() });
      // We don't have the genbaId directly, so we invalidate everything related to genba contracts
      queryClient.invalidateQueries({ queryKey: queryKeys.genba.all });
    },
  });
};
