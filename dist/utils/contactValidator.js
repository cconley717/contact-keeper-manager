import { InputSanitizer } from "./sanitizer.js";
import { isValidDateFormat, isPositiveInteger } from "./validation.js";
import { ERROR_MESSAGES } from "../constants.js";
/**
 * Shared validation logic for contact data
 */
export function validateContactData(rawData) {
    const errors = [];
    // Sanitize all input fields
    const sanitized = InputSanitizer.sanitizeContactData(rawData);
    // Validate required fields exist
    if (!sanitized.contact_id) {
        errors.push("Contact ID is required");
    }
    if (!sanitized.first_name) {
        errors.push("First Name is required");
    }
    if (!sanitized.last_name) {
        errors.push("Last Name is required");
    }
    if (!sanitized.email_address) {
        errors.push("Email Address is required");
    }
    if (!sanitized.contact_created_date) {
        errors.push("Contact Created Date is required");
    }
    if (!sanitized.law_firm_id) {
        errors.push("Law Firm ID is required");
    }
    if (!sanitized.law_firm_name) {
        errors.push("Law Firm Name is required");
    }
    // If any required field is missing, return early
    if (errors.length > 0) {
        return { isValid: false, errors };
    }
    // Type assertions after validation
    const contact_id = sanitized.contact_id;
    const first_name = sanitized.first_name;
    const last_name = sanitized.last_name;
    const email_address = sanitized.email_address;
    const contact_created_date = sanitized.contact_created_date;
    const law_firm_id = sanitized.law_firm_id;
    const law_firm_name = sanitized.law_firm_name;
    // Validate data types and formats
    if (!isPositiveInteger(contact_id)) {
        errors.push(ERROR_MESSAGES.INVALID_CONTACT_ID);
    }
    if (!isPositiveInteger(law_firm_id)) {
        errors.push("Law Firm ID must be a positive integer");
    }
    if (!isValidDateFormat(contact_created_date)) {
        errors.push(ERROR_MESSAGES.INVALID_DATE_FORMAT);
    }
    // Return validation result
    if (errors.length > 0) {
        return { isValid: false, errors };
    }
    return {
        isValid: true,
        errors: [],
        sanitizedData: {
            contact_id,
            first_name,
            last_name,
            program: sanitized.program,
            email_address,
            phone: sanitized.phone,
            contact_created_date,
            action: sanitized.action,
            law_firm_id,
            law_firm_name,
        },
    };
}
//# sourceMappingURL=contactValidator.js.map