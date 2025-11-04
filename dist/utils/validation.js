// Validation utilities
/**
 * Validates date string in MM/DD/YYYY or M/D/YYYY format (leading zeros optional)
 * @param dateStr - Date string to validate
 * @returns true if valid date format, false otherwise
 */
export function isValidDateFormat(dateStr) {
    if (!dateStr || typeof dateStr !== "string") {
        return false;
    }
    // Check format with regex: M/D/YYYY or MM/DD/YYYY (leading zeros optional)
    // Month: 1-12 or 01-12, Day: 1-31 or 01-31, Year: 4 digits
    const dateRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/\d{4}$/;
    if (!dateRegex.test(dateStr)) {
        return false;
    }
    // Parse and validate actual date
    const [month, day, year] = dateStr.split("/").map(Number);
    const date = new Date(year, month - 1, day);
    // Check if date is valid and matches input
    // This catches invalid dates like 2/31/2024
    const isValid = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    if (!isValid) {
        return false;
    }
    // Additional validation: check days per month
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day > daysInMonth) {
        return false;
    }
    return true;
}
/**
 * Validate if a value is a positive integer (#56, #57, #59)
 */
export function isPositiveInteger(value) {
    const num = Number.parseInt(value, 10);
    return !Number.isNaN(num) && num > 0 && String(num) === value;
}
/**
 * Validates and parses PORT environment variable
 * @param portValue - Port value from environment variable
 * @param defaultPort - Default port to use if validation fails
 * @returns Valid port number
 */
export function validatePort(portValue, defaultPort) {
    if (!portValue) {
        return defaultPort;
    }
    const port = Number.parseInt(portValue, 10);
    if (Number.isNaN(port) || port < 1 || port > 65535) {
        console.error(`Invalid PORT value: ${portValue}. Using default port ${defaultPort}`);
        return defaultPort;
    }
    return port;
}
//# sourceMappingURL=validation.js.map