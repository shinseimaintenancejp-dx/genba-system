/**
 * Genba Management System — Centralized Query Key Factory.
 *
 * All TanStack Query keys MUST be defined here to:
 * - Prevent key collisions across modules
 * - Enable targeted cache invalidation
 * - Provide type safety for query key arrays
 *
 * See: frontend-conventions.md §4.1
 *
 * Usage:
 *   queryKeys.genba.list(filters)
 *   queryClient.invalidateQueries({ queryKey: queryKeys.genba.lists() })
 */

// =============================================================================
// Filter Types (used in query key factories)
// Will be replaced by generated types from OpenAPI in Sprint 3+
// =============================================================================
interface ListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  [key: string]: unknown;
}

// =============================================================================
// Query Key Factory
// Each module follows the same pattern:
//   all      → root key for the module
//   lists()  → all list queries
//   list(f)  → specific list with filters
//   details() → all detail queries
//   detail(id) → specific item by ID
// =============================================================================
export const queryKeys = {
  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------
  auth: {
    all: ["auth"] as const,
    me: () => [...queryKeys.auth.all, "me"] as const,
  },

  // ---------------------------------------------------------------------------
  // Genba (現場)
  // ---------------------------------------------------------------------------
  genba: {
    all: ["genba"] as const,
    lists: () => [...queryKeys.genba.all, "list"] as const,
    list: (filters: ListFilters) =>
      [...queryKeys.genba.lists(), filters] as const,
    details: () => [...queryKeys.genba.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.genba.details(), id] as const,
    // Sub-resources
    workers: (genbaId: string) =>
      [...queryKeys.genba.detail(genbaId), "workers"] as const,
    staff: (genbaId: string) =>
      [...queryKeys.genba.detail(genbaId), "staff"] as const,
    contracts: (genbaId: string) =>
      [...queryKeys.genba.detail(genbaId), "contracts"] as const,
    photos: (genbaId: string) =>
      [...queryKeys.genba.detail(genbaId), "photos"] as const,
    keys: (genbaId: string) =>
      [...queryKeys.genba.detail(genbaId), "keys"] as const,
    manuals: (genbaId: string) =>
      [...queryKeys.genba.detail(genbaId), "manuals"] as const,
    schedules: (genbaId: string) =>
      [...queryKeys.genba.detail(genbaId), "schedules"] as const,
  },

  // ---------------------------------------------------------------------------
  // Customers (取引先)
  // ---------------------------------------------------------------------------
  customers: {
    all: ["customers"] as const,
    lists: () => [...queryKeys.customers.all, "list"] as const,
    list: (filters: ListFilters) =>
      [...queryKeys.customers.lists(), filters] as const,
    details: () => [...queryKeys.customers.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.customers.details(), id] as const,
    contacts: (customerId: string) =>
      [...queryKeys.customers.detail(customerId), "contacts"] as const,
  },

  // ---------------------------------------------------------------------------
  // Staff (社内担当者)
  // ---------------------------------------------------------------------------
  staff: {
    all: ["staff"] as const,
    lists: () => [...queryKeys.staff.all, "list"] as const,
    list: (filters: ListFilters) =>
      [...queryKeys.staff.lists(), filters] as const,
    details: () => [...queryKeys.staff.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.staff.details(), id] as const,
  },

  // ---------------------------------------------------------------------------
  // Workers (現場員)
  // ---------------------------------------------------------------------------
  workers: {
    all: ["workers"] as const,
    lists: () => [...queryKeys.workers.all, "list"] as const,
    list: (filters: ListFilters) =>
      [...queryKeys.workers.lists(), filters] as const,
    details: () => [...queryKeys.workers.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.workers.details(), id] as const,
    // My genba (Worker's assigned genba list)
    myGenba: () => [...queryKeys.workers.all, "my-genba"] as const,
  },

  // ---------------------------------------------------------------------------
  // Partners (協力会社)
  // ---------------------------------------------------------------------------
  partners: {
    all: ["partners"] as const,
    lists: () => [...queryKeys.partners.all, "list"] as const,
    list: (filters: ListFilters) =>
      [...queryKeys.partners.lists(), filters] as const,
    details: () => [...queryKeys.partners.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.partners.details(), id] as const,
  },

  // ---------------------------------------------------------------------------
  // Contracts (契約)
  // ---------------------------------------------------------------------------
  contracts: {
    all: ["contracts"] as const,
    lists: () => [...queryKeys.contracts.all, "list"] as const,
    list: (filters: ListFilters) =>
      [...queryKeys.contracts.lists(), filters] as const,
    details: () => [...queryKeys.contracts.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.contracts.details(), id] as const,
  },

  // ---------------------------------------------------------------------------
  // Quotations (見積)
  // ---------------------------------------------------------------------------
  quotations: {
    all: ["quotations"] as const,
    lists: () => [...queryKeys.quotations.all, "list"] as const,
    list: (filters: ListFilters) =>
      [...queryKeys.quotations.lists(), filters] as const,
    details: () => [...queryKeys.quotations.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.quotations.details(), id] as const,
  },

  // ---------------------------------------------------------------------------
  // Invoices (請求書)
  // ---------------------------------------------------------------------------
  invoices: {
    all: ["invoices"] as const,
    lists: () => [...queryKeys.invoices.all, "list"] as const,
    list: (filters: ListFilters) =>
      [...queryKeys.invoices.lists(), filters] as const,
    details: () => [...queryKeys.invoices.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.invoices.details(), id] as const,
  },

  // ---------------------------------------------------------------------------
  // Approvals (承認)
  // ---------------------------------------------------------------------------
  approvals: {
    all: ["approvals"] as const,
    lists: () => [...queryKeys.approvals.all, "list"] as const,
    list: (filters: ListFilters) =>
      [...queryKeys.approvals.lists(), filters] as const,
    detail: (id: string) =>
      [...queryKeys.approvals.all, "detail", id] as const,
  },

  // ---------------------------------------------------------------------------
  // Manuals (マニュアル)
  // ---------------------------------------------------------------------------
  manuals: {
    all: ["manuals"] as const,
    entryExit: (genbaId: string) => [...queryKeys.manuals.all, "entry-exit", genbaId] as const,
    daily: (genbaId: string, weekday?: string) => [...queryKeys.manuals.all, "daily", genbaId, weekday] as const,
    memos: (genbaId: string) => [...queryKeys.manuals.all, "memos", genbaId] as const,
    periodic: (genbaId: string) => [...queryKeys.manuals.all, "periodic", genbaId] as const,
    schedules: (genbaId: string) => [...queryKeys.manuals.all, "schedules", genbaId] as const,
    holidays: (genbaId: string) => [...queryKeys.manuals.all, "holidays", genbaId] as const,
    equipment: (genbaId: string) => [...queryKeys.manuals.all, "equipment", genbaId] as const,
    standards: (genbaId: string) => [...queryKeys.manuals.all, "standards", genbaId] as const,
  },
  // ---------------------------------------------------------------------------
  // Cleaning Areas (Master Data — Global)
  // ---------------------------------------------------------------------------
  cleaningAreas: {
    all: ["cleaning-areas"] as const,
    list: () => [...queryKeys.cleaningAreas.all, "list"] as const,
  },
  // ---------------------------------------------------------------------------
  // Periodic Work Types (Master Data — Global)
  // ---------------------------------------------------------------------------
  periodicWorkTypes: {
    all: ["periodic-work-types"] as const,
    list: () => [...queryKeys.periodicWorkTypes.all, "list"] as const,
  },
} as const;

export type QueryKeys = typeof queryKeys;
