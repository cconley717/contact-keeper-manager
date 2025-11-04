// Application-wide constants

// Server Configuration
export const SERVER_CONFIG = {
  DEFAULT_PORT: 3000,
  MAX_REQUEST_SIZE: '10mb',
  REQUEST_TIMEOUT_MS: 30000, // 30 seconds
} as const;

// Pagination Configuration
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// CSV Configuration
export const CSV_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_RECORDS_PER_BATCH: 1000, // Process CSV in batches to prevent memory issues
  COLUMN_NAMES: {
    CONTACT_ID: 'contact_id',
    FIRST_NAME: 'first_name',
    LAST_NAME: 'last_name',
    PROGRAM: 'program',
    EMAIL_ADDRESS: 'email_address',
    PHONE: 'phone',
    CONTACT_CREATED_DATE: 'contact_created_date',
    ACTION: 'action',
    LAW_FIRM_ID: 'law_firm_id',
    LAW_FIRM_NAME: 'law_firm_name',
  },
} as const;

// Validation Configuration
export const VALIDATION = {
  DATE_FORMAT_REGEX: /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/\d{4}$/,
  MAX_STRING_LENGTH: 500,
  MIN_POSITIVE_INTEGER: 1,
  MAX_INTEGER: 2147483647, // Max 32-bit signed integer
  // Whitelist of allowed sort fields to prevent SQL injection
  ALLOWED_SORT_FIELDS: [
    'contact_id',
    'first_name',
    'last_name',
    'program',
    'email_address',
    'phone',
    'contact_created_date',
    'action',
    'law_firm_id',
    'law_firm_name',
  ] as const,
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_CONTACT_ID: 'Contact ID must be a positive integer',
  INVALID_CLIENT_ID: 'Client ID must be a positive integer',
  INVALID_ID: 'Invalid ID',
  INVALID_DATE_FORMAT: 'Contact Created Date must be in MM/DD/YYYY format',
  MISSING_REQUIRED_FIELDS: 'Contact ID, First Name, Last Name, Email Address, Contact Created Date, Law Firm ID, and Law Firm Name are required',
  CONTACT_NOT_FOUND: 'Contact not found',
  CLIENT_NOT_FOUND: 'Client ID not found',
  CONTACT_ID_EXISTS: 'Contact ID already exists. Please choose a different ID.',
  CLIENT_ID_EXISTS: 'Client ID already exists',
  NO_FILE_UPLOADED: 'No file uploaded',
  FAILED_TO_FETCH: 'Failed to fetch data',
  FAILED_TO_PROCESS: 'Failed to process request',
  GENERIC_ERROR: 'An error occurred while processing your request',
} as const;
