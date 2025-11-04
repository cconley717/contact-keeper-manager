import { InputSanitizer } from "./sanitizer.js";
import { isValidDateFormat, isPositiveInteger } from "./validation.js";
import { ERROR_MESSAGES } from "../constants.js";
/**
 * Validate and sanitize contact data for create/update operations
 * Implements fixes for issues #38-47
 */
export function validateContactData(data) {
    const errors = [];
    // Sanitize all input fields
    const sanitizedData = InputSanitizer.sanitizeContactData(data);
    // Validate required fields exist and are not empty
    if (!sanitizedData.contact_id || sanitizedData.contact_id.trim() === "") {
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
    if (!sanitizedData.law_firm_id || sanitizedData.law_firm_id.trim() === "") {
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
    const ContactValidationResult = {
        isValid: true,
        errors: [],
        sanitizedData
    };
    return ContactValidationResult;
}
//# sourceMappingURL=contactValidator.js.map