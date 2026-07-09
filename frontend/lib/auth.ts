/**
 * Genba Management System — Auth Utilities.
 *
 * Client-side authentication helpers.
 * Tokens are stored in httpOnly cookies — JS cannot access them directly.
 * We only read user info from the /auth/me endpoint.
 */

import { apiClient } from "@/lib/api";
// import type { components } from "@/types/api.generated";

// Type aliases from generated OpenAPI types
// These will be auto-generated in Sprint 3+ via: npm run generate-types
// For now, define manually to match the backend schemas
export interface User {
  id: string;
  username: string;
  email: string | null;
  full_name: string;
  role: string;
  related_entity_id: string | null;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  message: string;
}

export interface MeResponse {
  user: User;
}

// =============================================================================
// Auth API Functions
// =============================================================================

/**
 * Authenticate with username/password.
 * On success, the backend sets httpOnly JWT cookies.
 * Returns the authenticated user's information.
 */
export const loginApi = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>("/auth/login", credentials);
  return response as unknown as LoginResponse;
};

/**
 * Logout the current user.
 * Clears the httpOnly JWT cookies.
 */
export const logoutApi = async (): Promise<void> => {
  await apiClient.post("/auth/logout");
};

/**
 * Fetch the current authenticated user's information.
 * Uses the JWT cookie for authentication — no token reading in JS.
 */
export const getMeApi = async (): Promise<User> => {
  const response = await apiClient.get<MeResponse>("/auth/me");
  return (response as unknown as MeResponse).user;
};

// =============================================================================
// Role Helpers
// =============================================================================

/** Japanese display names for each role */
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "システム管理者",
  SENIOR_STAFF: "管理職",
  INTERNAL_STAFF: "社内担当者",
  GENBA_WORKER: "現場員",
  PARTNER: "協力会社",
  CUSTOMER: "取引先",
};

export const getRoleLabel = (role: string): string =>
  ROLE_LABELS[role] ?? role;

/** Check if a role has admin-level access */
export const isAdminRole = (role: string): boolean =>
  role === "ADMIN";

/** Check if a role is office staff (ADMIN, SENIOR_STAFF, INTERNAL_STAFF) */
export const isOfficeRole = (role: string): boolean =>
  ["ADMIN", "SENIOR_STAFF", "INTERNAL_STAFF"].includes(role);

/** Check if the user is a field worker */
export const isWorkerRole = (role: string): boolean =>
  role === "GENBA_WORKER";

/** Check if the user is a partner company */
export const isPartnerRole = (role: string): boolean =>
  role === "PARTNER";

/** Get the default redirect path after login based on role */
export const getPostLoginRedirect = (role: string): string => {
  switch (role) {
    case "GENBA_WORKER":
      return "/my-genba";
    case "PARTNER":
      return "/partner/genba";
    default:
      return "/genba";
  }
};
