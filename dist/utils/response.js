import { HTTP_STATUS, ERROR_MESSAGES } from "../constants.js";
/**
 * Utility class for building consistent API responses
 */
export class ResponseBuilder {
    /**
     * Send a success response
     */
    static success(res, data, message, statusCode = HTTP_STATUS.OK) {
        const response = {
            success: true,
            ...(message && { message }),
            ...(data !== undefined && { data }),
        };
        res.status(statusCode).json(response);
    }
    /**
     * Send a paginated response
     */
    static paginated(res, data, totalCount, page, pageSize) {
        const response = {
            success: true,
            data,
            totalCount,
            page,
            pageSize,
        };
        res.status(HTTP_STATUS.OK).json(response);
    }
    /**
     * Send an error response with sanitized message
     */
    static error(res, message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, logError) {
        // Log the actual error for debugging (but don't expose to client)
        if (logError) {
            console.error("Error occurred:", {
                message: logError.message,
                stack: process.env.NODE_ENV === "development" ? logError.stack : undefined,
            });
        }
        // Send sanitized error to client
        const response = {
            success: false,
            message: this.sanitizeErrorMessage(message),
        };
        res.status(statusCode).json(response);
    }
    /**
     * Send a 400 Bad Request error
     */
    static badRequest(res, message) {
        this.error(res, message, HTTP_STATUS.BAD_REQUEST);
    }
    /**
     * Send a 404 Not Found error
     */
    static notFound(res, message = ERROR_MESSAGES.CONTACT_NOT_FOUND) {
        this.error(res, message, HTTP_STATUS.NOT_FOUND);
    }
    /**
     * Send a 409 Conflict error
     */
    static conflict(res, message) {
        this.error(res, message, HTTP_STATUS.CONFLICT);
    }
    /**
     * Send a 500 Internal Server Error
     */
    static internalError(res, error) {
        this.error(res, ERROR_MESSAGES.GENERIC_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR, error);
    }
    /**
     * Sanitize error messages to prevent information leakage
     */
    static sanitizeErrorMessage(message) {
        // Remove any potential stack traces or file paths
        return message.replaceAll(/\s+at\s+.*$/gm, "").replaceAll(/\/.*\//g, "").trim();
    }
}
//# sourceMappingURL=response.js.map