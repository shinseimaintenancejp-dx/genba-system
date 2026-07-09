export interface Genba {
  id: string;
  property_name: string;
  address: string;
  transportation?: string;
  phone?: string;
  external_partner_code?: string;
  status: "ACTIVE" | "TERMINATED";
  site_confirmed: boolean;
  manual_created: boolean;
  customer_id: string;
  special_notes?: string;
  management_start_date?: string;
  
  // Sprint 5 fields
  genba_type?: string;
  genba_type_other?: string;
  floor_above_ground?: number;
  floor_basement?: number;
  
  terminated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface GenbaDetail extends Genba {
  customer: {
    id: string;
    full_name: string;
    short_name: string;
  };
  contacts: {
    id: string;
    full_name: string;
    position?: string;
    phone?: string;
    email?: string;
  }[];
  staff_assignments: {
    id: string;
    staff_id: string;
    role_type: string;
    staff: {
      id: string;
      full_name: string;
      position?: string;
    };
  }[];
}

export interface DuplicateWarning {
  warning: string;
  duplicates: Genba[];
}
