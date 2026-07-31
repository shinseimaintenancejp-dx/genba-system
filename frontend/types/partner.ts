export interface PartnerCompany {
  id: string;
  company_name: string;
  short_name?: string;
  executive?: string;
  postal_code?: string;
  phone?: string;
  mobile?: string;
  fax?: string;
  email?: string;
  address?: string;
  contact_person?: string;
  notes?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}
