import validator from "validator";
import { VALIDATION } from "../constants.js";

/**
 * Sanitize and validate user input to prevent XSS and injection attacks
 */
export class InputSanitizer {
  /**
   * Sanitize a string by escaping HTML and trimming whitespace
   */
  static sanitizeString(input: any): string | null {
    if (!input) return null;

    // Trim whitespace
    const trimmed = input.trim();
    if (!trimmed) return null;

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
  static sanitizeEmail(email: any): string | null {
    if (!email) return null;

    const trimmed = email.trim().toLowerCase();

    // Validate email format
    if (!validator.isEmail(trimmed)) {
      return null;
    }

    // Normalize and escape
    return validator.normalizeEmail(trimmed) || trimmed;
  }

  /**
   * Sanitize and validate phone format (#41)
   */
  static sanitizePhone(phone: any): string | null {
    if (!phone) return null;

    const trimmed = phone.trim();

    // Allow only valid phone number characters
    const cleaned = trimmed.replaceAll(/[^\d\s\-()+]/g, "");

    return cleaned || null;
  }

  /**
   * Sanitize an integer value with range validation (#47)
   */
  static sanitizeInteger(value: any): number | null {
    if (value === null || value === undefined) return null;

    const num = Number.parseInt(String(value), 10);

    if (Number.isNaN(num)) return null;

    // Validate numeric range to prevent negative or overflow values
    if (num < VALIDATION.MIN_POSITIVE_INTEGER || num > VALIDATION.MAX_INTEGER) {
      return null;
    }

    return num;
  }

  /**
   * Validate and sanitize a date string in MM/DD/YYYY format
   */
  static sanitizeDate(dateStr: any): string | null {
    if (!dateStr) return null;

    const trimmed = dateStr.trim();

    // Check format with regex
    if (!VALIDATION.DATE_FORMAT_REGEX.test(trimmed)) {
      return null;
    }

    return trimmed;
  }

  /**
   * Sanitize an object by applying appropriate sanitization to each field
   */
  static sanitizeContactData(data: unknown): {
    contact_id: number | null;
    first_name: string | null;
    last_name: string | null;
    program: string | null;
    email_address: string | null;
    phone: string | null;
    contact_created_date: string | null;
    action: string | null;
    law_firm_id: number | null;
    law_firm_name: string | null;
  } {
    // Type guard to ensure data is an object
    const obj = data as Record<string, unknown>;
    return {
      contact_id: this.sanitizeInteger(obj.contact_id),
      first_name: this.sanitizeString(obj.first_name),
      last_name: this.sanitizeString(obj.last_name),
      program: this.sanitizeString(obj.program),
      email_address: this.sanitizeEmail(obj.email_address),
      phone: this.sanitizePhone(obj.phone),
      contact_created_date: this.sanitizeDate(obj.contact_created_date),
      action: this.sanitizeString(obj.action),
      law_firm_id: this.sanitizeInteger(obj.law_firm_id),
      law_firm_name: this.sanitizeString(obj.law_firm_name),
    };
  }
}
