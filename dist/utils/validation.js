// Validation utilities
/**
 * Validates date string in MM/DD/YYYY or M/D/YYYY format (leading zeros optional)
 * @param dateStr - Date string to validate
 * @returns true if valid date format, false otherwise
 */
export function isValidDateFormat(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') {
        return false;
    }
    // Check format with regex: M/D/YYYY or MM/DD/YYYY (leading zeros optional)
    // Month: 1-12 or 01-12, Day: 1-31 or 01-31, Year: 4 digits
    const dateRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/\d{4}$/;
    if (!dateRegex.test(dateStr)) {
        return false;
    }
    // Parse and validate actual date
    const [month, day, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    // Check if date is valid and matches input
    return (date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day);
}
/**
 * Validates positive integer
 * @param value - Value to validate
 * @returns true if positive integer, false otherwise
 */
export function isPositiveInteger(value) {
    return typeof value === 'number' && Number.isInteger(value) && value > 0;
}
//# sourceMappingURL=validation.js.map