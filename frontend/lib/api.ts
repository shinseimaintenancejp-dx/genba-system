/**
 * Genba Management System — Axios API Client.
 *
 * Features:
 * - Base URL from environment variable
 * - withCredentials for httpOnly cookie auth (SEC§1.4)
 * - Response interceptor: auto-unwrap data envelope (INT§1.2)
 * - Response interceptor: auto-refresh token on 401 (FE§8)
 * - Request interceptor: structured logging in development
 */

import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

// =============================================================================
// API Client Configuration
// =============================================================================
export const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api/v1",
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true, // Required for httpOnly cookie auth (SEC§1.4)
});

// =============================================================================
// Request Interceptor — Logging (development only)
// =============================================================================
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (process.env.NODE_ENV === "development") {
      console.debug(
        `[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
        config.params ?? ""
      );
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// =============================================================================
// Response Interceptor — Envelope Unwrapping + Token Refresh
// =============================================================================

// Track whether a refresh is currently in progress to prevent loops
let isRefreshing = false;
let refreshSubscribers: Array<() => void> = [];

const onRefreshed = () => {
  refreshSubscribers.forEach((cb) => cb());
  refreshSubscribers = [];
};

const addRefreshSubscriber = (cb: () => void) => {
  refreshSubscribers.push(cb);
};

apiClient.interceptors.response.use(
  // Success: Unwrap the data envelope (INT§1.2)
  // Backend always returns { data: ... } or { data: [...], meta: ... }
  // The apiClient interceptor strips this wrapper so hooks receive typed objects directly
  (response: AxiosResponse) => {
    // Only unwrap if the response has the data envelope structure
    if (
      response.data &&
      typeof response.data === "object" &&
      "data" in response.data
    ) {
      // Preserve pagination meta if present
      if ("meta" in response.data && response.data.meta) {
        return {
          items: response.data.data,
          total: response.data.meta.total_items,
          page: response.data.meta.page,
          limit: response.data.meta.limit,
          pages: response.data.meta.total_pages,
        };
      }
      return response.data.data;
    }
    return response.data;
  },

  // Error: Handle 401 with auto-refresh, then retry
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Prevent infinite refresh loops
      if (isRefreshing) {
        // Queue this request to retry after refresh completes
        return new Promise((resolve) => {
          addRefreshSubscriber(() => {
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt silent token refresh (SEC§1.3)
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || "/api/v1"}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        // Notify all queued requests that refresh completed
        onRefreshed();
        isRefreshing = false;

        // Retry the original request with new tokens
        return apiClient(originalRequest);
      } catch {
        // Refresh failed — redirect to login
        isRefreshing = false;
        refreshSubscribers = [];

        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }

        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// =============================================================================
// Type-Safe API Methods
// =============================================================================

/**
 * GET request with typed response.
 * Usage: apiClient.get<Genba>('/genba/123')
 */
export const get = <T>(url: string, config?: object): Promise<T> =>
  apiClient.get<T, T>(url, config);

/**
 * POST request with typed response.
 */
export const post = <T>(url: string, data?: unknown, config?: object): Promise<T> =>
  apiClient.post<T, T>(url, data, config);

/**
 * PUT request with typed response.
 */
export const put = <T>(url: string, data?: unknown, config?: object): Promise<T> =>
  apiClient.put<T, T>(url, data, config);

/**
 * PATCH request with typed response.
 */
export const patch = <T>(url: string, data?: unknown, config?: object): Promise<T> =>
  apiClient.patch<T, T>(url, data, config);

/**
 * DELETE request with typed response.
 */
export const del = <T>(url: string, config?: object): Promise<T> =>
  apiClient.delete<T, T>(url, config);

export default apiClient;
