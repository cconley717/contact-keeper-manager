import type { Request, Response } from "express";
import { DataSource } from "typeorm";
import { Contact } from "../entities/Contact.js";
import { ResponseBuilder } from "../utils/response.js";
import { validateContactData } from "../utils/contactValidator.js";
import { CsvService } from "../services/csvService.js";
import { PAGINATION, ERROR_MESSAGES, VALIDATION } from "../constants.js";
import { isPositiveInteger } from "../utils/validation.js";

export class ContactsController {
  private readonly csvService: CsvService;

  constructor(private readonly dataSource: DataSource) {
    this.csvService = new CsvService(dataSource);
  }

  /**
   * GET /api/contacts - Fetch contacts with pagination, search, and sorting
   */
  async getContacts(req: Request, res: Response): Promise<void> {
    try {
      const page = Number.parseInt(req.query.page as string, 10) || 0;
      const pageSize = Math.min(
        Number.parseInt(req.query.pageSize as string, 10) || PAGINATION.DEFAULT_PAGE_SIZE,
        PAGINATION.MAX_PAGE_SIZE
      );
      const search = (req.query.search as string) || "";

      const requestedSortOrder = req.query.sortOrder as string | undefined;
      const hasSortOrder = requestedSortOrder === "asc" || requestedSortOrder === "desc";
      const sortOrder: "ASC" | "DESC" = requestedSortOrder === "desc" ? "DESC" : "ASC";

      // Validate sortField against whitelist to prevent SQL injection (#38)
      const requestedSortField = (req.query.sortField as string) || "contact_id";
      const sortField = (VALIDATION.ALLOWED_SORT_FIELDS as readonly string[]).includes(
        requestedSortField
      )
        ? requestedSortField
        : "contact_id";

      const contactRepository = this.dataSource.getRepository(Contact);

      // Build query
      let queryBuilder = contactRepository.createQueryBuilder("contact");

      // Apply search across all columns if search term is provided
      if (search) {
        const searchParam = `%${search}%`;
        queryBuilder = queryBuilder
          .where("CAST(contact.contact_id AS TEXT) LIKE :search", { search: searchParam })
          .orWhere("contact.first_name LIKE :search", { search: searchParam })
          .orWhere("contact.last_name LIKE :search", { search: searchParam })
          .orWhere("contact.program LIKE :search", { search: searchParam })
          .orWhere("contact.email_address LIKE :search", {
            search: searchParam,
          })
          .orWhere("contact.phone LIKE :search", { search: searchParam })
          .orWhere("contact.contact_created_date LIKE :search", {
            search: searchParam,
          })
          .orWhere("CAST(contact.law_firm_id AS TEXT) LIKE :search", { search: searchParam })
          .orWhere("contact.law_firm_name LIKE :search", {
            search: searchParam,
          });
      }

      // Get total count
      const totalCount = await queryBuilder.getCount();

      // Apply pagination and optional sorting
      if (hasSortOrder) {
        // Use object notation for safer column reference (prevents SQL injection)
        const orderByColumn: Record<string, "ASC" | "DESC"> = {};
        orderByColumn[`contact.${sortField}`] = sortOrder;
        queryBuilder = queryBuilder.orderBy(orderByColumn);
      }

      const contacts = await queryBuilder.skip(page * pageSize).take(pageSize).getMany();

      ResponseBuilder.paginated(res, contacts, totalCount, page, pageSize);
    } catch (error) {
      if (error instanceof Error) {
        ResponseBuilder.internalError(res, error);
      } else {
        ResponseBuilder.internalError(res, new Error("An unknown error occurred"));
      }
    }
  }

  /**
   * POST /api/contacts/upload - Upload and import CSV file
   */
  async uploadCsv(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      return ResponseBuilder.badRequest(res, ERROR_MESSAGES.NO_FILE_UPLOADED);
    }

    try {
      // Use CSV service to handle import within transaction (#4, #5, #24, #33)
      const result = await this.csvService.importContacts(req.file.buffer);

      const skippedText = result.skipped > 0 ? `, ${result.skipped} skipped` : "";
      const message = `Successfully imported ${result.totalRecords - result.skipped} contacts (${result.inserted} new, ${result.updated} updated)${skippedText}`;

      ResponseBuilder.success(
        res,
        {
          count: result.totalRecords - result.skipped,
          inserted: result.inserted,
          updated: result.updated,
          skipped: result.skipped,
          errors: result.errors,
        },
        message
      );
    } catch (error) {
      if (error instanceof Error) {
        ResponseBuilder.internalError(res, error);
      } else {
        ResponseBuilder.internalError(res, new Error("An unknown error occurred"));
      }
    }
  }

  /**
   * GET /api/contacts/export - Export contacts as CSV file
   */
  async exportCsv(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.csvService.exportContacts();

      res.setHeader("Content-Type", result.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
      res.setHeader("Content-Length", result.content.length.toString());
      res.status(200).send(result.content);
    } catch (error) {
      if (error instanceof Error) {
        ResponseBuilder.internalError(res, error);
      } else {
        ResponseBuilder.internalError(res, new Error("An unknown error occurred"));
      }
    }
  }

  /**
   * POST /api/contacts - Add or update a contact
   */
  async createContact(req: Request, res: Response): Promise<void> {
    try {
      const createContactDto = req.body;

      createContactDto.contact_created_date = this.getCurrentDateString();

      const validation = validateContactData(createContactDto);

      if (!validation.isValid) {
        return ResponseBuilder.badRequest(res, validation.errors.join(", "));
      }

      const sanitizedData = validation.sanitizedData;
      const contactRepository = this.dataSource.getRepository(Contact);

      // Check if contact already exists
      const existingContact = await contactRepository.findOne({
        where: { contact_id: sanitizedData.contact_id },
      });

      if (existingContact) {
        // Update existing contact
        await contactRepository.update({ contact_id: sanitizedData.contact_id }, sanitizedData);
        ResponseBuilder.success(res, { operation: "updated" }, "Contact updated successfully");
      } else {
        // Insert new contact
        const newContact = contactRepository.create(sanitizedData);
        await contactRepository.save(newContact);
        ResponseBuilder.success(res, { operation: "inserted" }, "Contact added successfully");
      }
    } catch (error) {
      if (error instanceof Error) {
        ResponseBuilder.internalError(res, error);
      } else {
        ResponseBuilder.internalError(res, new Error("An unknown error occurred"));
      }
    }
  }

  /**
   * PUT /api/contacts/:id - Update an existing contact
   */
  async updateContact(req: Request, res: Response): Promise<void> {
    try {
      const contactIdParam = req.params.id;

      // Validate ID using consistent helper function
      if (!isPositiveInteger(contactIdParam)) {
        return ResponseBuilder.badRequest(res, ERROR_MESSAGES.INVALID_CONTACT_ID);
      }

      const contactId = Number.parseInt(contactIdParam, 10);

      const updateContactDto = req.body;

      const contactRepository = this.dataSource.getRepository(Contact);
      const existingContactForDate = await contactRepository.findOne({
        where: { contact_id: contactId },
      });

      if (!existingContactForDate) {
        return ResponseBuilder.notFound(res, ERROR_MESSAGES.CONTACT_NOT_FOUND);
      }

      // Always ignore client-provided created date and preserve stored value
      updateContactDto.contact_created_date = existingContactForDate.contact_created_date;

      const validation = validateContactData(updateContactDto);

      if (!validation.isValid) {
        return ResponseBuilder.badRequest(res, validation.errors.join(", "));
      }

      const contactData = validation.sanitizedData;

      // Use transaction to prevent race conditions
      await this.dataSource.transaction(async (transactionalEntityManager) => {
        // Check if original contact exists
        const existingContact = await transactionalEntityManager.findOne(Contact, {
          where: { contact_id: contactId },
        });

        if (!existingContact) {
          throw new Error(ERROR_MESSAGES.CONTACT_NOT_FOUND);
        }

        // If contact_id is being changed, check if new ID already exists
        if (contactData.contact_id !== contactId) {
          const conflictingContact = await transactionalEntityManager.findOne(Contact, {
            where: { contact_id: contactData.contact_id },
          });

          if (conflictingContact) {
            throw new Error(ERROR_MESSAGES.CONTACT_ID_EXISTS);
          }

          // Delete the old record (within transaction)
          await transactionalEntityManager.delete(Contact, {
            contact_id: contactId,
          });
        }

        // Create/update the contact with new data
        const contact = transactionalEntityManager.create(Contact, contactData);
        await transactionalEntityManager.save(Contact, contact);
      });

      const idChangedText =
        contactData.contact_id !== contactId
          ? ` (ID changed from ${contactId} to ${contactData.contact_id})`
          : "";
      ResponseBuilder.success(res, undefined, `Contact updated successfully${idChangedText}`);
    } catch (error) {
      // Proper error type checking with type guard (#46)
      if (error instanceof Error) {
        if (error.message === ERROR_MESSAGES.CONTACT_NOT_FOUND) {
          return ResponseBuilder.notFound(res, error.message);
        }
        if (error.message === ERROR_MESSAGES.CONTACT_ID_EXISTS) {
          return ResponseBuilder.conflict(res, error.message);
        }
        ResponseBuilder.internalError(res, error);
      } else {
        ResponseBuilder.internalError(res, new Error("An unknown error occurred"));
      }
    }
  }

  /**
   * DELETE /api/contacts/:id - Delete contact by ID
   */
  async deleteContact(req: Request, res: Response): Promise<void> {
    try {
      const contactIdParam = req.params.id;

      // Validate ID using consistent helper function
      if (!isPositiveInteger(contactIdParam)) {
        return ResponseBuilder.badRequest(res, ERROR_MESSAGES.INVALID_CONTACT_ID);
      }

      const contactId = Number.parseInt(contactIdParam, 10);

      const contactRepository = this.dataSource.getRepository(Contact);

      // Check if contact exists
      const existingContact = await contactRepository.findOne({
        where: { contact_id: contactId },
      });

      if (!existingContact) {
        return ResponseBuilder.notFound(res, ERROR_MESSAGES.CONTACT_NOT_FOUND);
      }

      // Delete the contact
      await contactRepository.delete({ contact_id: contactId });

      ResponseBuilder.success(res, undefined, `Contact ID ${contactId} deleted successfully`);
    } catch (error) {
      if (error instanceof Error) {
        ResponseBuilder.internalError(res, error);
      } else {
        ResponseBuilder.internalError(res, new Error("An unknown error occurred"));
      }
    }
  }

  private getCurrentDateString(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const year = String(now.getFullYear());

    return `${month}/${day}/${year}`;
  }
}
