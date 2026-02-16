import { InputSanitizer } from "./sanitizer.js";
import { isPositiveInteger } from "./validation.js";
import { ERROR_MESSAGES } from "../constants.js";
/**
 * Validate and sanitize client data for create operations
 */
export function validateClientData(data) {
    const errors = [];
    // Sanitize client_id and client_name
    const sanitizedClientId = InputSanitizer.sanitizeInteger(data.client_id);
    const sanitizedClientName = InputSanitizer.sanitizeString(data.client_name || "");
    const sanitizedData = {
        client_id: sanitizedClientId,
        client_name: sanitizedClientName,
    };
    // Validate client_id exists and is not empty
    if (!sanitizedData.client_id) {
        errors.push("Client ID is required and cannot be empty");
    }
    // Validate client_name exists and is not empty
    if (!sanitizedData.client_name || sanitizedData.client_name.trim() === "") {
        errors.push("Client name is required and cannot be empty");
    }
    // If required field is missing, return early
    if (errors.length > 0) {
        return { isValid: false, errors, sanitizedData };
    }
    // Validate client_id format (must be a positive integer)
    if (!isPositiveInteger(sanitizedData.client_id)) {
        errors.push(ERROR_MESSAGES.INVALID_CLIENT_ID);
    }
    const clientValidationResult = {
        isValid: errors.length === 0,
        errors,
        sanitizedData,
    };
    return clientValidationResult;
}
//# sourceMappingURL=clientValidator.js.map