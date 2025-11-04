import { Contact } from "../entities/Contact.js";
import { ResponseBuilder } from "../utils/response.js";
import { validateContactData } from "../utils/contactValidator.js";
import { CsvService } from "../services/csvService.js";
import { PAGINATION, ERROR_MESSAGES, VALIDATION } from "../constants.js";
export class ContactsController {
    dataSource;
    csvService;
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.csvService = new CsvService(dataSource);
    }
    /**
     * GET /api/contacts - Fetch contacts with pagination, search, and sorting
     */
    async getContacts(req, res) {
        try {
            const page = Number.parseInt(req.query.page) || 0;
            const pageSize = Math.min(Number.parseInt(req.query.pageSize) || PAGINATION.DEFAULT_PAGE_SIZE, PAGINATION.MAX_PAGE_SIZE);
            const search = req.query.search || "";
            // Validate sortField against whitelist to prevent SQL injection (#38)
            const requestedSortField = req.query.sortField || "contact_id";
            const sortField = VALIDATION.ALLOWED_SORT_FIELDS.includes(requestedSortField)
                ? requestedSortField
                : "contact_id";
            const sortOrder = req.query.sortOrder === "desc" ? "DESC" : "ASC";
            const contactRepository = this.dataSource.getRepository(Contact);
            // Build query
            let queryBuilder = contactRepository.createQueryBuilder("contact");
            // Apply search across all columns if search term is provided
            if (search) {
                const searchParam = `%${search}%`;
                queryBuilder = queryBuilder
                    .where("contact.contact_id LIKE :search", { search: searchParam })
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
                    .orWhere("contact.action LIKE :search", { search: searchParam })
                    .orWhere("contact.law_firm_id LIKE :search", { search: searchParam })
                    .orWhere("contact.law_firm_name LIKE :search", {
                    search: searchParam,
                });
            }
            // Get total count
            const totalCount = await queryBuilder.getCount();
            // Apply sorting and pagination
            // Use object notation for safer column reference (prevents SQL injection)
            const orderByColumn = {};
            orderByColumn[`contact.${sortField}`] = sortOrder;
            const contacts = await queryBuilder
                .orderBy(orderByColumn)
                .skip(page * pageSize)
                .take(pageSize)
                .getMany();
            ResponseBuilder.paginated(res, contacts, totalCount, page, pageSize);
        }
        catch (error) {
            ResponseBuilder.internalError(res, error);
        }
    }
    /**
     * POST /api/contacts/upload - Upload and import CSV file
     */
    async uploadCsv(req, res) {
        if (!req.file) {
            return ResponseBuilder.badRequest(res, ERROR_MESSAGES.NO_FILE_UPLOADED);
        }
        try {
            // Use CSV service to handle import within transaction (#4, #5, #24, #33)
            const result = await this.csvService.importContacts(req.file.buffer);
            const skippedText = result.skipped > 0 ? `, ${result.skipped} skipped` : "";
            const message = `Successfully imported ${result.totalRecords - result.skipped} contacts (${result.inserted} new, ${result.updated} updated)${skippedText}`;
            ResponseBuilder.success(res, {
                count: result.totalRecords - result.skipped,
                inserted: result.inserted,
                updated: result.updated,
                skipped: result.skipped,
                errors: result.errors,
            }, message);
        }
        catch (error) {
            ResponseBuilder.internalError(res, error);
        }
    }
    /**
     * POST /api/contacts - Add or update a contact
     */
    async createContact(req, res) {
        try {
            // Validate and sanitize input (#3, #7, #15)
            const validation = validateContactData(req.body);
            if (!validation.isValid) {
                return ResponseBuilder.badRequest(res, validation.errors.join(", "));
            }
            const contactData = validation.sanitizedData;
            const contactRepository = this.dataSource.getRepository(Contact);
            // Check if contact already exists
            const existingContact = await contactRepository.findOne({
                where: { contact_id: contactData.contact_id },
            });
            if (existingContact) {
                // Update existing contact
                await contactRepository.update({ contact_id: contactData.contact_id }, contactData);
                ResponseBuilder.success(res, { action: "updated" }, "Contact updated successfully");
            }
            else {
                // Insert new contact
                const newContact = contactRepository.create(contactData);
                await contactRepository.save(newContact);
                ResponseBuilder.success(res, { action: "inserted" }, "Contact added successfully");
            }
        }
        catch (error) {
            ResponseBuilder.internalError(res, error);
        }
    }
    /**
     * PUT /api/contacts/:id - Update contact by ID (allows changing contact_id)
     */
    async updateContact(req, res) {
        try {
            const originalContactId = Number.parseInt(req.params.id, 10);
            if (Number.isNaN(originalContactId)) {
                return ResponseBuilder.badRequest(res, ERROR_MESSAGES.INVALID_CONTACT_ID);
            }
            // Validate and sanitize input (#3, #7, #15)
            const validation = validateContactData(req.body);
            if (!validation.isValid) {
                return ResponseBuilder.badRequest(res, validation.errors.join(", "));
            }
            const contactData = validation.sanitizedData;
            // Use transaction to prevent race conditions
            await this.dataSource.transaction(async (transactionalEntityManager) => {
                // Check if original contact exists
                const existingContact = await transactionalEntityManager.findOne(Contact, {
                    where: { contact_id: originalContactId },
                });
                if (!existingContact) {
                    throw new Error(ERROR_MESSAGES.CONTACT_NOT_FOUND);
                }
                // If contact_id is being changed, check if new ID already exists
                if (contactData.contact_id !== originalContactId) {
                    const conflictingContact = await transactionalEntityManager.findOne(Contact, {
                        where: { contact_id: contactData.contact_id },
                    });
                    if (conflictingContact) {
                        throw new Error(ERROR_MESSAGES.CONTACT_ID_EXISTS);
                    }
                    // Delete the old record (within transaction)
                    await transactionalEntityManager.delete(Contact, {
                        contact_id: originalContactId,
                    });
                }
                // Create/update the contact with new data
                const contact = transactionalEntityManager.create(Contact, contactData);
                await transactionalEntityManager.save(Contact, contact);
            });
            const idChangedText = contactData.contact_id !== originalContactId
                ? ` (ID changed from ${originalContactId} to ${contactData.contact_id})`
                : "";
            ResponseBuilder.success(res, undefined, `Contact updated successfully${idChangedText}`);
        }
        catch (error) {
            // Proper error type checking with type guard (#46)
            if (error instanceof Error) {
                if (error.message === ERROR_MESSAGES.CONTACT_NOT_FOUND) {
                    return ResponseBuilder.notFound(res, error.message);
                }
                if (error.message === ERROR_MESSAGES.CONTACT_ID_EXISTS) {
                    return ResponseBuilder.conflict(res, error.message);
                }
                ResponseBuilder.internalError(res, error);
            }
            else {
                ResponseBuilder.internalError(res, new Error("An unknown error occurred"));
            }
        }
    }
    /**
     * DELETE /api/contacts/:id - Delete contact by ID
     */
    async deleteContact(req, res) {
        try {
            const contactId = Number.parseInt(req.params.id, 10);
            if (Number.isNaN(contactId)) {
                return ResponseBuilder.badRequest(res, ERROR_MESSAGES.INVALID_CONTACT_ID);
            }
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
        }
        catch (error) {
            ResponseBuilder.internalError(res, error);
        }
    }
}
//# sourceMappingURL=contacts.js.map