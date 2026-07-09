/**
 * Genba Management System — useSchedules Hooks.
 *
 * Provides hooks for Work Schedules, Custom Holidays, Equipment, Cleaning Work Standards, and Periodic Cleaning Plans.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "@/lib/api";
import { queryKeys } from "./queryKeys";

// =============================================================================
// Interfaces & Types
// =============================================================================

export interface WorkScheduleCreatePayload {
  shift_label?: string | null;
  work_days: string; // e.g. "月火水木金"
  start_time: string; // "HH:MM:SS"
  end_time: string; // "HH:MM:SS"
  break_minutes?: number;
  times_per_week?: number | null;
  hours_per_day?: number | null;
  holiday_rule?: string; // "OFF", "SHIFT_BEFORE", "SHIFT_AFTER", "WORK"
  obon_work?: boolean;
  new_year_work?: boolean;
  holiday_shift_rule?: string | null;
}

export interface WorkScheduleUpdatePayload {
  shift_label?: string | null;
  work_days?: string;
  start_time?: string;
  end_time?: string;
  break_minutes?: number;
  times_per_week?: number | null;
  hours_per_day?: number | null;
  holiday_rule?: string;
  obon_work?: boolean;
  new_year_work?: boolean;
  holiday_shift_rule?: string | null;
}

export interface WorkScheduleResponse {
  id: string;
  genba_id: string;
  shift_label: string | null;
  work_days: string;
  start_time: string; // "HH:MM:SS"
  end_time: string; // "HH:MM:SS"
  break_minutes: number;
  times_per_week: number | null;
  hours_per_day: number | null;
  holiday_rule: string;
  obon_work: boolean;
  new_year_work: boolean;
  holiday_shift_rule: string | null;
  created_at: string;
  updated_at: string;
}

export interface GenbaCustomHolidayCreatePayload {
  holiday_date: string; // "YYYY-MM-DD"
  description?: string | null;
  substitute_date?: string | null; // "YYYY-MM-DD"
}

export interface GenbaCustomHolidayUpdatePayload {
  holiday_date?: string;
  description?: string | null;
  substitute_date?: string | null;
}

export interface GenbaCustomHolidayResponse {
  id: string;
  genba_id: string;
  holiday_date: string;
  description: string | null;
  substitute_date: string | null;
  created_at: string;
}

export interface GenbaEquipmentCreatePayload {
  equipment_name: string;
  quantity?: number;
  notes?: string | null;
  sort_order?: number;
}

export interface GenbaEquipmentUpdatePayload {
  equipment_name?: string;
  quantity?: number;
  notes?: string | null;
  sort_order?: number;
}

export interface GenbaEquipmentResponse {
  id: string;
  genba_id: string;
  equipment_name: string;
  quantity: number;
  notes: string | null;
  sort_order: number;
  created_at: string;
}

export interface CleaningWorkStandardCreatePayload {
  floor_number: string;
  area_name: string;
  floor_material?: string | null;
  area_sqm?: number | null;
  daily_tasks?: Record<string, string>;
  periodic_tasks?: Record<string, string>;
  remarks?: string | null;
  sort_order?: number;
}

export interface CleaningWorkStandardUpdatePayload {
  floor_number?: string;
  area_name?: string;
  floor_material?: string | null;
  area_sqm?: number | null;
  daily_tasks?: Record<string, string>;
  periodic_tasks?: Record<string, string>;
  remarks?: string | null;
  sort_order?: number;
}

export interface CleaningWorkStandardResponse {
  id: string;
  genba_id: string;
  floor_number: string;
  area_name: string;
  floor_material: string | null;
  area_sqm: number | null;
  daily_tasks: Record<string, string>;
  periodic_tasks: Record<string, string>;
  remarks: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PeriodicCleaningDetailCreatePayload {
  location: string;
  floor_material?: string | null;
  area_name: string;
  work_content: string;
  special_notes?: string | null;
  sort_order?: number;
}

export interface PeriodicCleaningDetailUpdatePayload {
  location?: string;
  floor_material?: string | null;
  area_name?: string;
  work_content?: string;
  special_notes?: string | null;
  sort_order?: number;
}

export interface PeriodicCleaningDetailResponse {
  id: string;
  plan_id: string;
  location: string;
  floor_material: string | null;
  area_name: string;
  work_content: string;
  special_notes: string | null;
  sort_order: number;
}

export interface PartnerCompanyResponse {
  id: string;
  name: string;
  company_name: string;
}

export interface PeriodicCleaningPlanCreatePayload {
  contract_id?: string | null;
  work_team_type: "SELF" | "PARTNER";
  partner_id?: string | null;
  work_content: string;
  month_apr?: boolean;
  month_may?: boolean;
  month_jun?: boolean;
  month_jul?: boolean;
  month_aug?: boolean;
  month_sep?: boolean;
  month_oct?: boolean;
  month_nov?: boolean;
  month_dec?: boolean;
  month_jan?: boolean;
  month_feb?: boolean;
  month_mar?: boolean;
  special_notes?: string | null;
}

export interface PeriodicCleaningPlanUpdatePayload {
  contract_id?: string | null;
  work_team_type?: "SELF" | "PARTNER";
  partner_id?: string | null;
  work_content?: string;
  month_apr?: boolean;
  month_may?: boolean;
  month_jun?: boolean;
  month_jul?: boolean;
  month_aug?: boolean;
  month_sep?: boolean;
  month_oct?: boolean;
  month_nov?: boolean;
  month_dec?: boolean;
  month_jan?: boolean;
  month_feb?: boolean;
  month_mar?: boolean;
  special_notes?: string | null;
}

export interface PeriodicCleaningPlanResponse {
  id: string;
  genba_id: string;
  contract_id: string | null;
  work_team_type: "SELF" | "PARTNER";
  partner_id: string | null;
  partner: PartnerCompanyResponse | null;
  work_content: string;
  month_apr: boolean;
  month_may: boolean;
  month_jun: boolean;
  month_jul: boolean;
  month_aug: boolean;
  month_sep: boolean;
  month_oct: boolean;
  month_nov: boolean;
  month_dec: boolean;
  month_jan: boolean;
  month_feb: boolean;
  month_mar: boolean;
  special_notes: string | null;
  details: PeriodicCleaningDetailResponse[];
  created_at: string;
  updated_at: string;
}

interface DataEnvelope<T> {
  data: T;
}

// =============================================================================
// Work Schedules Hooks
// =============================================================================

export const useWorkSchedules = (genbaId: string) => {
  return useQuery({
    queryKey: queryKeys.manuals.schedules(genbaId),
    queryFn: () => get<WorkScheduleResponse[]>(`/genba/${genbaId}/work-schedules`),
    enabled: !!genbaId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateWorkSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ genbaId, data }: { genbaId: string; data: WorkScheduleCreatePayload }) =>
      post<DataEnvelope<WorkScheduleResponse>>(`/genba/${genbaId}/work-schedules`, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.manuals.schedules(variables.genbaId),
      });
    },
  });
};

export const useUpdateWorkSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      genbaId,
      scheduleId,
      data,
    }: {
      genbaId: string;
      scheduleId: string;
      data: WorkScheduleUpdatePayload;
    }) => put<DataEnvelope<WorkScheduleResponse>>(`/genba/${genbaId}/work-schedules/${scheduleId}`, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.manuals.schedules(variables.genbaId),
      });
    },
  });
};

export const useDeleteWorkSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ genbaId, scheduleId }: { genbaId: string; scheduleId: string }) =>
      del<DataEnvelope<unknown>>(`/genba/${genbaId}/work-schedules/${scheduleId}`),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.manuals.schedules(variables.genbaId),
      });
    },
  });
};

// =============================================================================
// Genba Custom Holidays Hooks
// =============================================================================

export const useCustomHolidays = (genbaId: string) => {
  return useQuery({
    queryKey: queryKeys.manuals.holidays(genbaId),
    queryFn: () => get<GenbaCustomHolidayResponse[]>(`/genba/${genbaId}/custom-holidays`),
    enabled: !!genbaId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateCustomHoliday = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ genbaId, data }: { genbaId: string; data: GenbaCustomHolidayCreatePayload }) =>
      post<DataEnvelope<GenbaCustomHolidayResponse>>(`/genba/${genbaId}/custom-holidays`, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.manuals.holidays(variables.genbaId),
      });
    },
  });
};

export const useUpdateCustomHoliday = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      genbaId,
      holidayId,
      data,
    }: {
      genbaId: string;
      holidayId: string;
      data: GenbaCustomHolidayUpdatePayload;
    }) => put<DataEnvelope<GenbaCustomHolidayResponse>>(`/genba/${genbaId}/custom-holidays/${holidayId}`, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.manuals.holidays(variables.genbaId),
      });
    },
  });
};

export const useDeleteCustomHoliday = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ genbaId, holidayId }: { genbaId: string; holidayId: string }) =>
      del<DataEnvelope<unknown>>(`/genba/${genbaId}/custom-holidays/${holidayId}`),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.manuals.holidays(variables.genbaId),
      });
    },
  });
};

// =============================================================================
// Genba Equipment Hooks
// =============================================================================

export const useGenbaEquipment = (genbaId: string) => {
  return useQuery({
    queryKey: queryKeys.manuals.equipment(genbaId),
    queryFn: () => get<GenbaEquipmentResponse[]>(`/genba/${genbaId}/equipment`),
    enabled: !!genbaId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateGenbaEquipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ genbaId, data }: { genbaId: string; data: GenbaEquipmentCreatePayload }) =>
      post<DataEnvelope<GenbaEquipmentResponse>>(`/genba/${genbaId}/equipment`, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.manuals.equipment(variables.genbaId),
      });
    },
  });
};

export const useUpdateGenbaEquipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      genbaId,
      equipmentId,
      data,
    }: {
      genbaId: string;
      equipmentId: string;
      data: GenbaEquipmentUpdatePayload;
    }) => put<DataEnvelope<GenbaEquipmentResponse>>(`/genba/${genbaId}/equipment/${equipmentId}`, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.manuals.equipment(variables.genbaId),
      });
    },
  });
};

export const useDeleteGenbaEquipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ genbaId, equipmentId }: { genbaId: string; equipmentId: string }) =>
      del<DataEnvelope<unknown>>(`/genba/${genbaId}/equipment/${equipmentId}`),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.manuals.equipment(variables.genbaId),
      });
    },
  });
};

// =============================================================================
// Cleaning Work Standards Hooks
// =============================================================================

export const useCleaningStandards = (genbaId: string) => {
  return useQuery({
    queryKey: queryKeys.manuals.standards(genbaId),
    queryFn: () => get<CleaningWorkStandardResponse[]>(`/genba/${genbaId}/cleaning-standards`),
    enabled: !!genbaId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateCleaningStandard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ genbaId, data }: { genbaId: string; data: CleaningWorkStandardCreatePayload }) =>
      post<DataEnvelope<CleaningWorkStandardResponse>>(`/genba/${genbaId}/cleaning-standards`, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.manuals.standards(variables.genbaId),
      });
    },
  });
};

export const useUpdateCleaningStandard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      genbaId,
      standardId,
      data,
    }: {
      genbaId: string;
      standardId: string;
      data: CleaningWorkStandardUpdatePayload;
    }) => put<DataEnvelope<CleaningWorkStandardResponse>>(`/genba/${genbaId}/cleaning-standards/${standardId}`, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.manuals.standards(variables.genbaId),
      });
    },
  });
};

export const useDeleteCleaningStandard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ genbaId, standardId }: { genbaId: string; standardId: string }) =>
      del<DataEnvelope<unknown>>(`/genba/${genbaId}/cleaning-standards/${standardId}`),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.manuals.standards(variables.genbaId),
      });
    },
  });
};

// =============================================================================
// Periodic Cleaning Plans Hooks
// =============================================================================

export const usePeriodicPlans = (genbaId: string) => {
  return useQuery({
    queryKey: queryKeys.manuals.periodic(genbaId),
    queryFn: () => get<PeriodicCleaningPlanResponse[]>(`/genba/${genbaId}/periodic-plans`),
    enabled: !!genbaId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreatePeriodicPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ genbaId, data }: { genbaId: string; data: PeriodicCleaningPlanCreatePayload }) =>
      post<DataEnvelope<PeriodicCleaningPlanResponse>>(`/genba/${genbaId}/periodic-plans`, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.manuals.periodic(variables.genbaId),
      });
    },
  });
};

export const useUpdatePeriodicPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      genbaId,
      planId,
      data,
    }: {
      genbaId: string;
      planId: string;
      data: PeriodicCleaningPlanUpdatePayload;
    }) => put<DataEnvelope<PeriodicCleaningPlanResponse>>(`/genba/${genbaId}/periodic-plans/${planId}`, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.manuals.periodic(variables.genbaId),
      });
    },
  });
};

export const useDeletePeriodicPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ genbaId, planId }: { genbaId: string; planId: string }) =>
      del<DataEnvelope<unknown>>(`/genba/${genbaId}/periodic-plans/${planId}`),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.manuals.periodic(variables.genbaId),
      });
    },
  });
};

// =============================================================================
// Periodic Cleaning Plan Details Hooks
// =============================================================================

export const useCreatePeriodicDetail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      genbaId,
      planId,
      data,
    }: {
      genbaId: string;
      planId: string;
      data: PeriodicCleaningDetailCreatePayload;
    }) => post<DataEnvelope<PeriodicCleaningDetailResponse>>(`/genba/${genbaId}/periodic-plans/${planId}/details`, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.manuals.periodic(variables.genbaId),
      });
    },
  });
};

export const useUpdatePeriodicDetail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      genbaId,
      planId,
      detailId,
      data,
    }: {
      genbaId: string;
      planId: string;
      detailId: string;
      data: PeriodicCleaningDetailUpdatePayload;
    }) => put<DataEnvelope<PeriodicCleaningDetailResponse>>(`/genba/${genbaId}/periodic-plans/${planId}/details/${detailId}`, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.manuals.periodic(variables.genbaId),
      });
    },
  });
};

export const useDeletePeriodicDetail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      genbaId,
      planId,
      detailId,
    }: {
      genbaId: string;
      planId: string;
      detailId: string;
    }) => del<DataEnvelope<unknown>>(`/genba/${genbaId}/periodic-plans/${planId}/details/${detailId}`),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.manuals.periodic(variables.genbaId),
      });
    },
  });
};
