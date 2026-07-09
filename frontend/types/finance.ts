export type QuotationStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'SENT' | 'ACCEPTED' | 'REJECTED';

export interface QuotationItem {
  id: string;
  quotation_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  subtotal: number;
  remarks?: string;
  sort_order: number;
}

export interface Quotation {
  id: string;
  quotation_number: string;
  title: string;
  issue_date: string;
  valid_until?: string;
  total_amount: number;
  tax_amount: number;
  work_cycle?: string;
  work_hours?: string;
  description?: string;
  special_conditions?: string;
  status: QuotationStatus;
  genba_id: string;
  customer_id: string;
  contract_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  items: QuotationItem[];
}

export type InvoiceType = 'OUTGOING' | 'INCOMING';
export type InvoiceStatus = 'DRAFT' | 'AUTO_GENERATED' | 'PENDING_APPROVAL' | 'ISSUED' | 'PAID' | 'CANCELLED';

export interface Invoice {
  id: string;
  invoice_number: string;
  invoice_type: InvoiceType;
  issue_date: string;
  billing_period_year: number;
  billing_period_month: number;
  amount: number;
  tax_amount: number;
  status: InvoiceStatus;
  is_auto_generated: boolean;
  notes?: string;
  attachment_url?: string;
  contract_id: string;
  confirmed_by?: string;
  confirmed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ApprovalRequest {
  id: string;
  entity_type: 'QUOTATION' | 'CONTRACT' | 'INVOICE';
  entity_id: string;
  requested_by: string;
  status: ApprovalStatus;
  approved_by?: string;
  approved_at?: string;
  comment?: string;
  created_at: string;
}
