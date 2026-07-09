export interface PartnerCompany {
  id: string;
  company_name: string;
  phone?: string;
  fax?: string;
  email?: string;
  address?: string;
  contact_person?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
