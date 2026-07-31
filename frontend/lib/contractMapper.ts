import type { Contract } from "@/types/contract";

/**
 * Maps raw API Contract (snake_case) to react-hook-form defaultValues (camelCase)
 * used across DailyContractForm, PeriodicContractForm, and OtherContractForm.
 */
export function mapContractToDefaultValues(contract: Contract): any {
  if (!contract) return undefined;

  const defaultHolidays = [
    { ruleType: "祝日", action: contract.holiday_rules?.find((h) => h.rule_type === "祝日")?.action || "休む" },
    { ruleType: "年末年始", action: contract.holiday_rules?.find((h) => h.rule_type === "年末年始")?.action || "休む" },
    { ruleType: "お盆", action: contract.holiday_rules?.find((h) => h.rule_type === "お盆")?.action || "休む" },
    { ruleType: "GW", action: contract.holiday_rules?.find((h) => h.rule_type === "GW")?.action || "休む" },
  ];

  return {
    id: contract.id,
    contractName: contract.contract_name || "",
    contractType: contract.contract_type || "RECEIVING",
    serviceType: contract.service_type || "",
    serviceCategory: contract.service_category || "DAILY",
    genbaId: contract.genba_id || "",
    customerId: contract.customer_id || undefined,
    partnerId: contract.partner_id || undefined,

    startDate: contract.start_date ? contract.start_date.split("T")[0] : "",
    endDate: contract.end_date ? contract.end_date.split("T")[0] : undefined,
    amount: typeof contract.amount === "string" ? parseFloat(contract.amount) : (contract.amount ?? 0),
    taxType: contract.tax_type || "EXCLUSIVE",
    autoRenew: contract.auto_renew ?? true,
    invoiceRequired: contract.invoice_required ?? true,

    workContentSummary: contract.work_content_summary || undefined,
    contractPdfUrl: contract.contract_pdf_url || undefined,

    // Daily Specifics
    weeklyFrequency: contract.weekly_frequency ? Number(contract.weekly_frequency) : undefined,
    workDays: contract.work_days || "",
    workSlots:
      contract.work_slots?.map((s) => ({
        startTime: s.start_time || null,
        endTime: s.end_time || null,
        breakMinutes: Number(s.break_minutes ?? 0),
        workDurationHours: (s as any).work_duration_hours ? Number((s as any).work_duration_hours) : undefined,
        sortOrder: Number(s.sort_order ?? 0),
      })) || [],
    workerCounts:
      contract.worker_counts?.map((w) => ({
        workerCount: Number(w.worker_count ?? 1),
        workDurationHours: Number(w.work_duration_hours ?? 0),
        totalHours: Number(w.total_hours ?? 0),
        sortOrder: Number(w.sort_order ?? 0),
      })) || [],

    // Periodic Specifics
    periodicSchedule: contract.periodic_schedule
      ? {
          frequencyPerYear: Number(contract.periodic_schedule.frequency_per_year ?? 1),
          workMonths: contract.periodic_schedule.work_months || [],
          workDays: contract.periodic_schedule.work_days || [],
        }
      : { frequencyPerYear: 1, workMonths: [], workDays: [] },
    periodicWorkContents:
      contract.periodic_work_contents?.map((w) => ({
        id: w.id,
        floor: w.floor || "",
        area: w.area || "",
        workContent: w.work_content || "",
        sortOrder: Number(w.sort_order ?? 0),
      })) || [],

    // Other Specifics
    workType: contract.work_type,
    subServiceType: contract.sub_service_type,
    workExecutionDate: contract.work_execution_date
      ? contract.work_execution_date.split("T")[0]
      : undefined,

    // Holidays
    holidayRules:
      contract.holiday_rules && contract.holiday_rules.length >= 4
        ? contract.holiday_rules.map((h) => ({
            ruleType: h.rule_type,
            action: h.action,
          }))
        : defaultHolidays,
  };
}
