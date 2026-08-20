export interface OrderingLinkWorkItem {
  id: string;
  link_id: string;
  work_content_id: string;
  scope_detail: string | null;
  allocated_amount: number | null;
  allocated_percentage: number | null;
  created_at: string;

  // Read-only populated fields
  floor: string | null;
  area: string | null;
  work_content: string | null;
}

export interface OrderingLink {
  id: string;
  ordering_contract_id: string;
  receiving_contract_id: string;
  assignment_type: "FULL" | "PARTIAL";
  allocated_amount: number | null;
  allocated_percentage: number | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  work_items: OrderingLinkWorkItem[];

  // Read-only fields
  receiving_contract_name: string | null;
  receiving_contract_code: string | null;
  receiving_amount: number | null;
}

export interface AvailableReceivingContractItem {
  id: string;
  internal_code: string;
  contract_name: string;
  amount: number;
  service_category: string;
  work_content_summary?: string | null;
  work_type?: string | null;
  sub_service_type?: string | null;
  work_execution_date?: string | null;
  start_date: string;
  end_date?: string | null;
  work_items: {
    id: string;
    floor: string;
    area: string;
    work_content: string;
    sort_order: number;
  }[];
}

// Request payloads
export interface OrderingLinkWorkItemCreatePayload {
  work_content_id: string;
  scope_detail?: string | null;
  allocated_amount?: number | null;
  allocated_percentage?: number | null;
}

export interface OrderingLinkCreatePayload {
  receiving_contract_id: string;
  assignment_type: "FULL" | "PARTIAL";
  allocated_amount?: number | null;
  allocated_percentage?: number | null;
  remarks?: string | null;
  work_items: OrderingLinkWorkItemCreatePayload[];
}

export interface OrderingLinkUpdatePayload {
  assignment_type?: "FULL" | "PARTIAL";
  allocated_amount?: number | null;
  allocated_percentage?: number | null;
  remarks?: string | null;
  work_items?: OrderingLinkWorkItemCreatePayload[];
}
