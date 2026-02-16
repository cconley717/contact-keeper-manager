import { InputSanitizer } from "./sanitizer.js";
import { isValidDateFormat, isPositiveInteger } from "./validation.js";
import { ERROR_MESSAGES } from "../constants.js";
import type { CreateContactDto } from "../types/dto.js";

export interface SanitizedContactData {
  contact_id: number;
  first_name: string;
  last_name: string;
  program: string;
  email_address: string;
  phone: string;
  contact_created_date: string;
  law_firm_id: number;
  law_firm_name: string;
}

export interface ContactValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData: SanitizedContactData;
}

/**
 * Validate and sanitize contact data for create/update operations
 * Implements fixes for issues #38-47
 */
export function validateContactData(data: CreateContactDto): ContactValidationResult {
  const errors: string[] = [];

  // Sanitize all input fields
  const sanitizedData = InputSanitizer.sanitizeContactData(data);

  // Validate required fields exist and are not empty
  if (!sanitizedData.contact_id) {
    errors.push("Contact ID is required and cannot be empty");
  }

  if (!sanitizedData.first_name || sanitizedData.first_name.trim() === "") {
    errors.push("First Name is required");
  }

  if (!sanitizedData.last_name || sanitizedData.last_name.trim() === "") {
    errors.push("Last Name is required");
  }

  if (!sanitizedData.email_address || sanitizedData.email_address.trim() === "") {
    errors.push("Email Address is required");
  }

  if (!sanitizedData.contact_created_date || sanitizedData.contact_created_date.trim() === "") {
    errors.push("Contact Created Date is required");
  }

  if (!sanitizedData.law_firm_id) {
    errors.push("Law Firm ID is required");
  }

  if (!sanitizedData.law_firm_name || sanitizedData.law_firm_name.trim() === "") {
    errors.push("Law Firm Name is required");
  }

  // If any required field is missing, return early
  if (errors.length > 0) {
    return { isValid: false, errors, sanitizedData };
  }

  // Validate data types and formats
  if (!isPositiveInteger(sanitizedData.contact_id)) {
    errors.push(ERROR_MESSAGES.INVALID_CONTACT_ID);
  }

  if (!isPositiveInteger(sanitizedData.law_firm_id)) {
    errors.push("Law Firm ID must be a positive integer");
  }

  if (!isValidDateFormat(sanitizedData.contact_created_date)) {
    errors.push(ERROR_MESSAGES.INVALID_DATE_FORMAT);
  }

  // Return validation result
  if (errors.length > 0) {
    return { isValid: false, errors, sanitizedData };
  }

  const contactValidationResult: ContactValidationResult = {
    isValid: true,
    errors: [],
    sanitizedData,
  };

  return contactValidationResult;
}
