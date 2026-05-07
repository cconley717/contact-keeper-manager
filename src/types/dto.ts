// Data Transfer Objects for API request validation

export interface CreateContactDto {
  contact_id: number | string;
  first_name: string;
  last_name: string;
  client_id: string;
  client_name: string;
  email_address: string;
  phone: string;
  law_firm_id: string;
  law_firm_name: string;
}

export interface UpdateContactDto extends CreateContactDto {
  // Same as CreateContactDto, allows changing contact_id
}
