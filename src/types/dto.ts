// Data Transfer Objects for API request validation

export interface CreateContactDto {
  contact_id: number | string;
  first_name: string;
  last_name: string;
  program: string;
  email_address: string;
  phone: string;
  contact_created_date: string;
  law_firm_id: number | string;
  law_firm_name: string;
}

export interface UpdateContactDto extends CreateContactDto {
  // Same as CreateContactDto, allows changing contact_id
}

export interface CreateClientDto {
  client_id: number | string;
  client_name: string;
}
