import type { Response } from "express";
import { HTTP_STATUS, ERROR_MESSAGES } from "../constants.js";

/**
 * Standard API response structure
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * Utility class for building consistent API responses
 */
export class ResponseBuilder {
  /**
   * Send a success response
   */
  static success<T>(
    res: Response,
    data?: T,
    message?: string,
    statusCode: number = HTTP_STATUS.OK
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      ...(message && { message }),
      ...(data !== undefined && { data }),
    };
    res.status(statusCode).json(response);
  }

  /**
   * Send a paginated response
   */
  static paginated<T>(
    res: Response,
    data: T[],
    totalCount: number,
    page: number,
    pageSize: number
  ): void {
    const response: PaginatedResponse<T> = {
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
  static error(
    res: Response,
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    logError?: Error
  ): void {
    // Log the actual error for debugging (but don't expose to client)
    if (logError) {
      console.error("Error occurred:", {
        message: logError.message,
        stack: process.env.NODE_ENV === "development" ? logError.stack : undefined,
      });
    }

    // Send sanitized error to client
    const response: ApiErrorResponse = {
      success: false,
      message: this.sanitizeErrorMessage(message),
    };
    res.status(statusCode).json(response);
  }

  /**
   * Send a 400 Bad Request error
   */
  static badRequest(res: Response, message: string): void {
    this.error(res, message, HTTP_STATUS.BAD_REQUEST);
  }

  /**
   * Send a 404 Not Found error
   */
  static notFound(res: Response, message: string = ERROR_MESSAGES.CONTACT_NOT_FOUND): void {
    this.error(res, message, HTTP_STATUS.NOT_FOUND);
  }

  /**
   * Send a 409 Conflict error
   */
  static conflict(res: Response, message: string): void {
    this.error(res, message, HTTP_STATUS.CONFLICT);
  }

  /**
   * Send a 500 Internal Server Error
   */
  static internalError(res: Response, error?: Error): void {
    this.error(res, ERROR_MESSAGES.GENERIC_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR, error);
  }

  /**
   * Sanitize error messages to prevent information leakage
   */
  private static sanitizeErrorMessage(message: string): string {
    // Remove any potential stack traces or file paths
    return message
      .replaceAll(/\s+at\s+.*$/gm, "")
      .replaceAll(/\/.*\//g, "")
      .trim();
  }
}
