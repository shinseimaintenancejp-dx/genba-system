/**
 * Genba Management System — useAuth Hook.
 *
 * Wraps auth API calls with TanStack Query v5 patterns (FE§4.2).
 * Provides:
 * - useCurrentUser: Fetch and cache the current user
 * - useLogin: Login mutation
 * - useLogout: Logout mutation
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getMeApi, getPostLoginRedirect, loginApi, logoutApi } from "@/lib/auth";
import type { LoginRequest, User } from "@/lib/auth";
import { queryKeys } from "./queryKeys";

// =============================================================================
// useCurrentUser — Fetch authenticated user info
// =============================================================================
export const useCurrentUser = () => {
  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: getMeApi,
    // Do not retry on 401 — means user is not authenticated
    retry: (failureCount, error) => {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError?.response?.status === 401) return false;
      return failureCount < 2;
    },
    // Refresh user data every 5 minutes
    staleTime: 5 * 60 * 1000,
    // Don't throw on error — handle gracefully in components
    throwOnError: false,
  });
};

// =============================================================================
// useLogin — Login mutation
// =============================================================================
export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginRequest) => loginApi(credentials),
    onSuccess: (data) => {
      // Cache the user data immediately after login
      queryClient.setQueryData(queryKeys.auth.me(), data.user);
    },
    onError: (error) => {
      // Clear any stale user data on login failure
      queryClient.removeQueries({ queryKey: queryKeys.auth.all });
    },
  });
};

// =============================================================================
// useLogout — Logout mutation
// =============================================================================
export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      // Clear ALL cached data on logout (security — remove all user data from memory)
      queryClient.clear();

      // Redirect to login
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    },
    onError: () => {
      // Even if logout API fails, clear client-side state
      queryClient.clear();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    },
  });
};

// =============================================================================
// useAuthGuard — Check if user has required role
// Usage: const { user, hasPermission } = useAuthGuard(["ADMIN", "SENIOR_STAFF"])
// =============================================================================
export const useAuthGuard = (allowedRoles?: string[]) => {
  const { data: user, isLoading } = useCurrentUser();

  const isAuthorized = !allowedRoles || (
    !!user && allowedRoles.includes(user.role)
  );

  return {
    user: user as User | undefined,
    isLoading,
    isAuthorized,
  };
};
