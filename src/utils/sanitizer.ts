import validator from "validator";
import { VALIDATION } from "../constants.js";
import type { CreateContactDto } from "../types/dto.js";
import { SanitizedContactData } from "./contactValidator.js";

/**
 * Sanitize and validate user input to prevent XSS and injection attacks
 */
export class InputSanitizer {
  /**
   * Sanitize a string by escaping HTML and trimming whitespace
   */
  static sanitizeString(input: string): string {
    if (!input) return "";

    // Trim whitespace
    const trimmed = input.trim();
    if (!trimmed) return "";

    // Escape HTML to prevent XSS
    const sanitized = validator.escape(trimmed);

    // Enforce max length
    return sanitized.length > VALIDATION.MAX_STRING_LENGTH
      ? sanitized.substring(0, VALIDATION.MAX_STRING_LENGTH)
      : sanitized;
  }

  /**
   * Sanitize an email address
   */
  static sanitizeEmail(email: string): string {
    if (!email) return "";

    const trimmed = email.trim().toLowerCase();

    // Validate email format
    if (!validator.isEmail(trimmed)) {
      return "";
    }

    // Normalize and escape
    return validator.normalizeEmail(trimmed) || trimmed;
  }

  /**
   * Sanitize and validate phone format (#41)
   */
  static sanitizePhone(phone: string): string {
    if (!phone) return "";

    const trimmed = phone.trim();

    // Allow only valid phone number characters
    const cleaned = trimmed.replaceAll(/[^\d\s\-()+]/g, "");

    return cleaned || "";
  }

  /**
   * Sanitize a string representation of an integer with range validation (#47)
   */
  static sanitizeInteger(value: string | number): number {
    if (value === null || value === undefined || value === "") return 0;

    const parsedValue = typeof value === "number" ? value : Number.parseInt(value, 10);

    if (Number.isNaN(parsedValue)) return 0;

    // Validate numeric range to prevent negative or overflow values
    if (parsedValue < VALIDATION.MIN_POSITIVE_INTEGER || parsedValue > VALIDATION.MAX_INTEGER) {
      return 0;
    }

    return parsedValue;
  }

  /**
   * Validate and sanitize a date string in MM/DD/YYYY format
   */
  static sanitizeDate(dateStr: string): string {
    if (!dateStr) return "";

    const trimmed = dateStr.trim();

    // Check format with regex
    if (!VALIDATION.DATE_FORMAT_REGEX.test(trimmed)) {
      return "";
    }

    return trimmed;
  }

  /**
   * Sanitize contact data for create/update operations (#38-47)
   */
  static sanitizeContactData(data: CreateContactDto): SanitizedContactData {
    return {
      contact_id: this.sanitizeInteger(data.contact_id),
      first_name: this.sanitizeString(data.first_name),
      last_name: this.sanitizeString(data.last_name),
      program: this.sanitizeString(data.program),
      email_address: this.sanitizeEmail(data.email_address),
      phone: this.sanitizePhone(data.phone),
      contact_created_date: this.sanitizeDate(data.contact_created_date),
      law_firm_id: this.sanitizeInteger(data.law_firm_id),
      law_firm_name: this.sanitizeString(data.law_firm_name),
    };
  }
}
