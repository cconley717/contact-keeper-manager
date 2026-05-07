import { InputSanitizer } from "./sanitizer.js";
import { isPositiveInteger } from "./validation.js";
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
    if (!sanitizedData.contact_id) {
        errors.push("Contact ID is required and cannot be empty");
    }
    if (!sanitizedData.first_name || sanitizedData.first_name.trim() === "") {
        errors.push("First Name is required");
    }
    if (!sanitizedData.last_name || sanitizedData.last_name.trim() === "") {
        errors.push("Last Name is required");
    }
    // If any required field is missing, return early
    if (errors.length > 0) {
        return { isValid: false, errors, sanitizedData };
    }
    // Validate data types and formats
    if (!isPositiveInteger(sanitizedData.contact_id)) {
        errors.push(ERROR_MESSAGES.INVALID_CONTACT_ID);
    }
    // Return validation result
    if (errors.length > 0) {
        return { isValid: false, errors, sanitizedData };
    }
    const contactValidationResult = {
        isValid: true,
        errors: [],
        sanitizedData,
    };
    return contactValidationResult;
}
//# sourceMappingURL=contactValidator.js.map