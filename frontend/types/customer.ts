export interface CustomerContact {
  id: string;
  customer_id: string;
  full_name: string;
  position?: string;
  phone?: string;
  email?: string;
  notes?: string;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  full_name: string;
  short_name: string;
  branch_name?: string;
  phone?: string;
  fax?: string;
  email?: string;
  address?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerDetail extends Customer {
  contacts: CustomerContact[];
  genbas: {
    id: string;
    property_name: string;
    address: string;
    status: string;
  }[];
}
