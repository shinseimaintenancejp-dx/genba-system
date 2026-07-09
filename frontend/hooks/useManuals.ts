/**
 * Genba Management System — useManuals Hooks.
 *
 * Provides hooks for Entry/Exit Instructions, Daily Cleaning Tasks, and Memos.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post, put, patch, del, apiClient } from "@/lib/api";
import { queryKeys } from "./queryKeys";

// =============================================================================
// Interfaces & Types
// =============================================================================

export interface EntryExitUpsertPayload {
  entry_method?: string | null;
  exit_method?: string | null;
  safety_notes?: string | null;
}

export interface EntryExitResponse {
  id: string;
  genba_id: string;
  entry_method: string | null;
  exit_method: string | null;
  safety_notes: string | null;
  updated_at: string;
}

export interface DailyCleaningTaskContentCreate {
  area_name: string;
  work_content: string;
  sort_order?: number;
}

export interface DailyCleaningTaskContentResponse {
  id: string;
  task_id: string;
  area_name: string;
  work_content: string;
  sort_order: number;
}

export interface DailyCleaningTaskCreatePayload {
  contract_id?: string | null;
  day_of_week?: string | null; // null = every day, or comma-separated e.g. "月,火,水"
  start_time?: string | null;  // Optional — "HH:MM:SS" or null
  floor?: string | null;
  contents: DailyCleaningTaskContentCreate[];
  special_notes?: string | null;
}

export interface DailyCleaningTaskUpdatePayload {
  contract_id?: string | null;
  day_of_week?: string | null;
  start_time?: string | null;  // Optional — nullable
  floor?: string | null;
  contents?: DailyCleaningTaskContentCreate[];
  special_notes?: string | null;
}

export interface DailyCleaningTaskResponse {
  id: string;
  genba_id: string;
  contract_id: string | null;
  day_of_week: string | null;
  start_time: string | null;  // Nullable
  floor: string | null;
  contents: DailyCleaningTaskContentResponse[];
  special_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemoAttachmentResponse {
  id: string;
  memo_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
}

export interface MemoCreatePayload {
  memo_date: string; // ISO DateTime
  content: string;
}

export interface MemoUpdatePayload {
  memo_date?: string;
  content?: string;
}

export interface CreatorResponse {
  id: string;
  username: string;
  display_name: string | null;
  role: string;
}

export interface MemoResponse {
  id: string;
  genba_id: string;
  memo_date: string;
  content: string;
  created_by: string | null;
  creator: CreatorResponse | null;
  attachments: MemoAttachmentResponse[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// =============================================================================
// Entry/Exit Instruction Hooks
// =============================================================================

export const useEntryExit = (genbaId: string) => {
  return useQuery({
    queryKey: queryKeys.manuals.entryExit(genbaId),
    queryFn: () => get<EntryExitResponse>(`/genba/${genbaId}/entry-exit`),
    enabled: !!genbaId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpsertEntryExit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ genbaId, data }: { genbaId: string; data: EntryExitUpsertPayload }) =>
      put<EntryExitResponse>(`/genba/${genbaId}/entry-exit`, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.manuals.entryExit(variables.genbaId),
      });
    },
  });
};

// =============================================================================
// Daily Cleaning Tasks Hooks
// =============================================================================

export const useDailyCleaningTasks = (genbaId: string, weekday?: string) => {
  return useQuery({
    queryKey: queryKeys.manuals.daily(genbaId, weekday),
    queryFn: () => {
      const params = weekday ? { day_of_week: weekday } : {};
      return get<DailyCleaningTaskResponse[]>(`/genba/${genbaId}/daily-tasks`, { params });
    },
    enabled: !!genbaId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateDailyCleaningTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ genbaId, data }: { genbaId: string; data: DailyCleaningTaskCreatePayload }) =>
      post<DailyCleaningTaskResponse>(`/genba/${genbaId}/daily-tasks`, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.manuals.daily(variables.genbaId),
      });
    },
  });
};

export const useUpdateDailyCleaningTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      genbaId,
      taskId,
      data,
    }: {
      genbaId: string;
      taskId: string;
      data: DailyCleaningTaskUpdatePayload;
    }) => put<DailyCleaningTaskResponse>(`/genba/${genbaId}/daily-tasks/${taskId}`, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.manuals.daily(variables.genbaId),
      });
    },
  });
};

export const useDeleteDailyCleaningTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ genbaId, taskId }: { genbaId: string; taskId: string }) =>
      del<void>(`/genba/${genbaId}/daily-tasks/${taskId}`),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.manuals.daily(variables.genbaId),
      });
    },
  });
};

// =============================================================================
// Memos Hooks
// =============================================================================

export const useMemos = (genbaId: string) => {
  return useQuery({
    queryKey: queryKeys.manuals.memos(genbaId),
    queryFn: () => get<PaginatedResponse<MemoResponse>>(`/genba/${genbaId}/memos`),
    enabled: !!genbaId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateMemo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ genbaId, data }: { genbaId: string; data: MemoCreatePayload }) =>
      post<MemoResponse>(`/genba/${genbaId}/memos`, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.manuals.memos(variables.genbaId),
      });
    },
  });
};

export const useUpdateMemo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      genbaId,
      memoId,
      data,
    }: {
      genbaId: string;
      memoId: string;
      data: MemoUpdatePayload;
    }) => put<MemoResponse>(`/genba/${genbaId}/memos/${memoId}`, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.manuals.memos(variables.genbaId),
      });
    },
  });
};

export const useDeleteMemo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ genbaId, memoId }: { genbaId: string; memoId: string }) =>
      del<void>(`/genba/${genbaId}/memos/${memoId}`),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.manuals.memos(variables.genbaId),
      });
    },
  });
};

export const useUploadAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      genbaId,
      memoId,
      file,
    }: {
      genbaId: string;
      memoId: string;
      file: File;
    }) => {
      const formData = new FormData();
      formData.append("file", file);

      // Custom headers for multipart form-data request
      const response = await post<MemoAttachmentResponse>(
        `/genba/${genbaId}/memos/${memoId}/attachments`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.manuals.memos(variables.genbaId),
      });
    },
  });
};

export const useDeleteAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      genbaId,
      memoId,
      attachmentId,
    }: {
      genbaId: string;
      memoId: string;
      attachmentId: string;
    }) => del<void>(`/genba/${genbaId}/memos/${memoId}/attachments/${attachmentId}`),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.manuals.memos(variables.genbaId),
      });
    },
  });
};


// =============================================================================
// Cleaning Areas (Master Data — Global)
// =============================================================================

export interface CleaningAreaResponse {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CleaningAreaCreatePayload {
  name: string;
  sort_order?: number;
}

export interface CleaningAreaUpdatePayload {
  name?: string;
  sort_order?: number;
  is_active?: boolean;
}

/** Fetch all active cleaning areas (global master list). */
export const useCleaningAreas = () => {
  return useQuery({
    queryKey: queryKeys.cleaningAreas.list(),
    queryFn: () => get<CleaningAreaResponse[]>("/genba/areas"),
    staleTime: 5 * 60 * 1000, // 5 minutes — changes rarely
  });
};

/** Create a new cleaning area. */
export const useCreateCleaningArea = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CleaningAreaCreatePayload) =>
      post<CleaningAreaResponse>("/genba/areas", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cleaningAreas.list() });
    },
  });
};

/** Update an existing cleaning area. */
export const useUpdateCleaningArea = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CleaningAreaUpdatePayload }) =>
      put<CleaningAreaResponse>(`/genba/areas/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cleaningAreas.list() });
    },
  });
};

/** Soft-delete a cleaning area. */
export const useDeleteCleaningArea = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del<void>(`/genba/areas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cleaningAreas.list() });
    },
  });
};


// =============================================================================
// Periodic Work Types (Master Data — Global)
// =============================================================================

export interface PeriodicWorkTypeResponse {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PeriodicWorkTypeCreatePayload {
  name: string;
  sort_order?: number;
}

export interface PeriodicWorkTypeUpdatePayload {
  name?: string;
  sort_order?: number;
  is_active?: boolean;
}

/** Fetch all active periodic work types (global master list). */
export const usePeriodicWorkTypes = () => {
  return useQuery({
    queryKey: queryKeys.periodicWorkTypes.list(),
    queryFn: () => get<PeriodicWorkTypeResponse[]>("/genba/master/periodic-work-types"),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/** Create a new periodic work type. */
export const useCreatePeriodicWorkType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PeriodicWorkTypeCreatePayload) =>
      post<PeriodicWorkTypeResponse>("/genba/master/periodic-work-types", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.periodicWorkTypes.list() });
    },
  });
};

/** Update an existing periodic work type. */
export const useUpdatePeriodicWorkType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PeriodicWorkTypeUpdatePayload }) =>
      put<PeriodicWorkTypeResponse>(`/genba/master/periodic-work-types/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.periodicWorkTypes.list() });
    },
  });
};

/** Soft-delete a periodic work type. */
export const useDeletePeriodicWorkType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del<void>(`/genba/master/periodic-work-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.periodicWorkTypes.list() });
    },
  });
};

