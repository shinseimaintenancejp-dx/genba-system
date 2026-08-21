import type { OrderingLinkCreatePayload } from "./orderingLink";

export interface Contract {
  id: string;
  internal_code: string;
  external_code?: string;
  contract_type: "RECEIVING" | "ORDERING";
  service_type: string;
  service_area?: string;
  cleaning_type?: string;
  work_description?: string;
  amount: number;
  hourly_rate?: number;
  tax_type: "EXCLUSIVE" | "INCLUSIVE";
  start_date: string;
  end_date?: string;
  auto_renew: boolean;
  invoice_required: boolean;
  // Sprint 5 fields
  contract_name?: string;
  service_category?: string; // DAILY, PERIODIC, OTHER
  weekly_frequency?: number;
  work_days?: string;
  work_start_time?: string;
  work_end_time?: string;
  work_duration_hours?: number;
  
  // Sprint 11 Nested & Specific Fields
  contract_pdf_url?: string;
  work_type?: string;
  sub_service_type?: string;
  work_execution_date?: string;
  work_content_summary?: string;

  // Sprint 11 Nested Response Arrays
  work_slots?: {
    start_time: string;
    end_time: string;
    break_minutes: number;
    sort_order: number;
  }[];
  worker_counts?: {
    worker_count: number;
    work_duration_hours: number;
    total_hours: number;
    sort_order: number;
  }[];
  periodic_schedule?: {
    frequency_per_year: number;
    work_months: number[];
    work_days: number[];
  };
  holiday_rules?: {
    rule_type: string;
    action: string;
  }[];
  periodic_work_contents?: {
    id: string;
    floor: string;
    area: string;
    work_content: string;
    sort_order: number;
  }[];
  daily_work_contents?: {
    id: string;
    category: string;
    area: string;
    work_content: string;
    frequency: string;
    sort_order: number;
  }[];
  ordering_links?: any[];

  status: "DRAFT" | "PENDING_APPROVAL" | "ACTIVE" | "EXPIRED" | "CANCELLED";
  genba_id: string;
  customer_id?: string;
  partner_id?: string;
  genba_name?: string;
  customer_name?: string;
  partner_name?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;

  // Scheduled cancellation
  scheduled_cancellation_date?: string | null;
  cancellation_reason?: string | null;
  cancellation_requested_at?: string | null;
}

export interface ScheduleCancelPayload {
  cancellation_date: string; // YYYY-MM-DD
  reason?: string | null;
}

export interface ScheduleCancelResponse {
  status: string;
  scheduled_cancellation_date: string;
  cancelled_ordering_count: number;
  cancelled_invoices_count: number;
}

export interface UndoCancelResponse {
  status: string;
  restored_invoices_count: number;
  restored_ordering_count: number;
}

// =============================================================================
// Sprint 11 Nested Models (camelCase cho frontend, snake_case trên wire format)
// =============================================================================

export interface WorkSlot {
  startTime?: string | null; // HH:mm format
  endTime?: string | null;
  breakMinutes: number;
  workDurationHours?: number | null;
  sortOrder: number;
}

export interface WorkerCount {
  workerCount: number;
  workDurationHours: number;
  totalHours: number;
  sortOrder: number;
}

export type HolidayRuleType = "祝日" | "年末年始" | "お盆" | "GW" | "サービス開始日前";
export type HolidayAction = "出勤する" | "休む" | "前日に振替" | "翌日に振替";

export interface HolidayRule {
  ruleType: HolidayRuleType;
  action: HolidayAction;
}

export interface PeriodicSchedule {
  frequencyPerYear: number;
  workMonths: number[];
  workDays: number[];
}

// Mở rộng Contract hiện tại để include nested arrays (đã map sang camelCase ở custom hook)
export interface ContractWithRelations extends Contract {
  workSlots?: WorkSlot[];
  workerCounts?: WorkerCount[];
  holidayRules?: HolidayRule[];
  periodicSchedule?: PeriodicSchedule;
  periodicWorkContents?: PeriodicWorkContent[];
}

export interface PeriodicWorkContent {
  id?: string;
  floor: string;
  area: string;
  workContent: string;
  sortOrder: number;
}

export interface PeriodicWorkTypeResponse {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Discriminated Union Payload cho Create/Update
// =============================================================================

export interface BaseContractCreatePayload {
  contractName: string;
  contractType: "RECEIVING" | "ORDERING";
  serviceType: string;
  serviceCategory: "DAILY" | "PERIODIC" | "OTHER";
  
  // Common fields
  genbaId: string;
  customerId?: string;
  partnerId?: string;
  startDate: string;
  endDate?: string;
  amount: number;
  hourlyRate?: number;
  taxType: "EXCLUSIVE" | "INCLUSIVE";
  autoRenew: boolean;
  invoiceRequired: boolean;
  
  // Sprint 11 Common fields
  initialStatus?: "DRAFT" | "ACTIVE";
  status?: string;
  contractPdfUrl?: string;
  workContentSummary?: string;
  weeklyFrequency?: number;
  workDays?: string;
  
  // Ordering Links (for ORDERING contracts)
  orderingLinks?: OrderingLinkCreatePayload[];
  
  // Note: API payload mapper in useContract.ts will translate these camelCase properties
  // to snake_case format exactly as defined in Backend schemas.
}

export interface DailyContractCreatePayload extends BaseContractCreatePayload {
  serviceCategory: "DAILY";
  workSlots: WorkSlot[];
  workerCounts: WorkerCount[];
  holidayRules: HolidayRule[];
  dailyWorkContents?: any[];
}

export interface PeriodicContractCreatePayload extends BaseContractCreatePayload {
  serviceCategory: "PERIODIC";
  periodicSchedule: PeriodicSchedule;
  periodicWorkContents: PeriodicWorkContent[];
  holidayRules: HolidayRule[];
}

export interface OtherContractCreatePayload extends BaseContractCreatePayload {
  serviceCategory: "OTHER";
  workType: string;
  subServiceType: string;
  workExecutionDate: string;
}

export type ContractCreatePayload =
  | DailyContractCreatePayload
  | PeriodicContractCreatePayload
  | OtherContractCreatePayload;
