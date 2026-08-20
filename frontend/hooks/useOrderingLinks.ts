import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "@/lib/api";
import { queryKeys } from "./queryKeys";
import type { 
  OrderingLink, 
  AvailableReceivingContractItem,
  OrderingLinkCreatePayload,
  OrderingLinkUpdatePayload
} from "@/types/orderingLink";

/**
 * Fetch all ordering links for a specific ORDERING contract
 */
export const useOrderingLinks = (orderingContractId: string) => {
  return useQuery({
    queryKey: queryKeys.contracts.orderingLinks(orderingContractId),
    queryFn: () => get<OrderingLink[]>(`/contracts/${orderingContractId}/ordering-links`),
    enabled: !!orderingContractId,
  });
};

/**
 * Fetch available RECEIVING contracts in the same genba
 */
export const useAvailableReceivingContracts = (orderingContractId: string) => {
  return useQuery({
    queryKey: queryKeys.contracts.availableReceiving(orderingContractId),
    queryFn: () => get<AvailableReceivingContractItem[]>(`/contracts/${orderingContractId}/available-receiving-contracts`),
    enabled: !!orderingContractId,
  });
};

/**
 * Fetch available RECEIVING contracts for a given genba (used during contract creation)
 */
export const useAvailableReceivingContractsByGenba = (genbaId: string) => {
  return useQuery({
    queryKey: ["contracts", "availableReceivingByGenba", genbaId],
    queryFn: () => get<AvailableReceivingContractItem[]>(`/contracts/available-receiving?genba_id=${genbaId}`),
    enabled: !!genbaId,
  });
};

/**
 * Create a new ordering link
 */
export const useCreateOrderingLink = (orderingContractId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: OrderingLinkCreatePayload) =>
      post<OrderingLink>(`/contracts/${orderingContractId}/ordering-links`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.contracts.orderingLinks(orderingContractId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.contracts.availableReceiving(orderingContractId),
      });
    },
  });
};

/**
 * Update an ordering link
 */
export const useUpdateOrderingLink = (orderingContractId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ linkId, payload }: { linkId: string; payload: OrderingLinkUpdatePayload }) =>
      put<OrderingLink>(`/contracts/${orderingContractId}/ordering-links/${linkId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.contracts.orderingLinks(orderingContractId),
      });
    },
  });
};

/**
 * Delete an ordering link
 */
export const useDeleteOrderingLink = (orderingContractId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (linkId: string) =>
      del<void>(`/contracts/${orderingContractId}/ordering-links/${linkId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.contracts.orderingLinks(orderingContractId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.contracts.availableReceiving(orderingContractId),
      });
    },
  });
};
