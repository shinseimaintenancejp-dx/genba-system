import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "@/lib/api";
import { components } from "@/types/api.generated";

export type Position = components["schemas"]["PositionResponse"];
export type CreatePositionPayload = components["schemas"]["PositionCreate"];
export type UpdatePositionPayload = components["schemas"]["PositionUpdate"];

export const queryKeys = {
  positions: {
    all: ["positions"] as const,
    lists: () => [...queryKeys.positions.all, "list"] as const,
  },
};

export const usePositionList = () => {
  return useQuery({
    queryKey: queryKeys.positions.lists(),
    queryFn: () => get<Position[]>("/staff/positions"),
  });
};

export const useCreatePosition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePositionPayload) =>
      post<{ data: Position }>("/staff/positions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.positions.lists() });
    },
  });
};

export const useUpdatePosition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePositionPayload }) =>
      put<{ data: Position }>(`/staff/positions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.positions.lists() });
    },
  });
};

export const useDeletePosition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => del(`/staff/positions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.positions.lists() });
    },
  });
};
