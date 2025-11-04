// Data Transfer Objects for API request validation

export interface CreateContactDto {
  contact_id: number;
  first_name: string;
  last_name: string;
  program?: string | null;
  email_address: string;
  phone?: string | null;
  contact_created_date: string;
  action?: string | null;
  law_firm_id: number;
  law_firm_name: string;
}

export interface UpdateContactDto extends CreateContactDto {
  // Same as CreateContactDto, allows changing contact_id
}

export interface CreateClientDto {
  client_id: number;
}
