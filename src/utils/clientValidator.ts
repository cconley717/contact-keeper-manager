import { InputSanitizer } from "./sanitizer.js";
import { isPositiveInteger } from "./validation.js";
import { ERROR_MESSAGES } from "../constants.js";
import type { CreateClientDto } from "../types/dto.js";

export interface SanitizedClientData {
  client_id: string;
}

export interface ClientValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData: SanitizedClientData;
}

/**
 * Validate and sanitize client data for create operations
 */
export function validateClientData(data: CreateClientDto): ClientValidationResult {
  const errors: string[] = [];

  // Sanitize client_id
  const sanitizedClientId = InputSanitizer.sanitizeString(data.client_id || "");

  const sanitizedData: SanitizedClientData = {
    client_id: sanitizedClientId,
  };

  // Validate client_id exists and is not empty
  if (!sanitizedData.client_id || sanitizedData.client_id.trim() === "") {
    errors.push("Client ID is required and cannot be empty");
  }

  // If required field is missing, return early
  if (errors.length > 0) {
    return { isValid: false, errors, sanitizedData };
  }

  // Validate client_id format (must be a positive integer)
  if (!isPositiveInteger(sanitizedData.client_id)) {
    errors.push(ERROR_MESSAGES.INVALID_CLIENT_ID);
  }

  const clientValidationResult: ClientValidationResult = {
    isValid: errors.length === 0,
    errors,
    sanitizedData,
  };

  return clientValidationResult;
}
