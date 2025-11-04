import validator from "validator";
import { VALIDATION } from "../constants.js";
/**
 * Sanitize and validate user input to prevent XSS and injection attacks
 */
export class InputSanitizer {
    /**
     * Sanitize a string by escaping HTML and trimming whitespace
     */
    static sanitizeString(input) {
        if (!input)
            return null;
        // Trim whitespace
        const trimmed = input.trim();
        if (!trimmed)
            return null;
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
    static sanitizeEmail(email) {
        if (!email)
            return null;
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
    static sanitizePhone(phone) {
        if (!phone)
            return null;
        const trimmed = phone.trim();
        // Allow only valid phone number characters
        const cleaned = trimmed.replaceAll(/[^\d\s\-()+]/g, "");
        return cleaned || null;
    }
    /**
     * Sanitize an integer value with range validation (#47)
     */
    static sanitizeInteger(value) {
        const num = Number.parseInt(String(value), 10);
        if (Number.isNaN(num))
            return null;
        // Validate numeric range to prevent negative or overflow values
        if (num < VALIDATION.MIN_POSITIVE_INTEGER || num > VALIDATION.MAX_INTEGER) {
            return null;
        }
        return num;
    }
    /**
     * Validate and sanitize a date string in MM/DD/YYYY format
     */
    static sanitizeDate(dateStr) {
        if (!dateStr)
            return null;
        const trimmed = dateStr.trim();
        // Check format with regex
        if (!VALIDATION.DATE_FORMAT_REGEX.test(trimmed)) {
            return null;
        }
        return trimmed;
    }
    /**
     * Sanitize contact data for create/update operations (#38-47)
     */
    static sanitizeContactData(data) {
        const getString = (val) => {
            if (val === null || val === undefined)
                return "";
            return typeof val === "string" ? val : String(val);
        };
        const getNumber = (val) => {
            if (val === null || val === undefined)
                return 0;
            return val;
        };
        return {
            contact_id: this.sanitizeInteger(getNumber(data.contact_id)),
            first_name: this.sanitizeString(getString(data.first_name)),
            last_name: this.sanitizeString(getString(data.last_name)),
            program: this.sanitizeString(getString(data.program)),
            email_address: this.sanitizeEmail(getString(data.email_address)),
            phone: this.sanitizePhone(getString(data.phone)),
            contact_created_date: this.sanitizeDate(getString(data.contact_created_date)),
            action: this.sanitizeString(getString(data.action)),
            law_firm_id: this.sanitizeInteger(getNumber(data.law_firm_id)),
            law_firm_name: this.sanitizeString(getString(data.law_firm_name)),
        };
    }
}
//# sourceMappingURL=sanitizer.js.map