import { Router } from "express";
import { parse } from "csv-parse";
import { Contact } from "../entities/Contact.js";
import { isValidDateFormat, isPositiveInteger } from "../utils/validation.js";
export function createContactsRouter(dataSource, upload) {
    const router = Router();
    // GET /api/contacts - Fetch contacts with pagination, search, and sorting
    router.get("/", async (req, res) => {
        try {
            const page = Number.parseInt(req.query.page) || 0;
            const pageSize = Number.parseInt(req.query.pageSize) || 20;
            const search = req.query.search || "";
            const sortField = req.query.sortField || "contact_id";
            const sortOrder = req.query.sortOrder === "desc" ? "DESC" : "ASC";
            const contactRepository = dataSource.getRepository(Contact);
            // Build query
            let queryBuilder = contactRepository.createQueryBuilder("contact");
            // Apply search across all columns if search term is provided
            if (search) {
                const searchParam = `%${search}%`;
                queryBuilder = queryBuilder.where("contact.contact_id LIKE :search", { search: searchParam })
                    .orWhere("contact.first_name LIKE :search", { search: searchParam })
                    .orWhere("contact.last_name LIKE :search", { search: searchParam })
                    .orWhere("contact.program LIKE :search", { search: searchParam })
                    .orWhere("contact.email_address LIKE :search", { search: searchParam })
                    .orWhere("contact.phone LIKE :search", { search: searchParam })
                    .orWhere("contact.contact_created_date LIKE :search", { search: searchParam })
                    .orWhere("contact.action LIKE :search", { search: searchParam })
                    .orWhere("contact.law_firm_id LIKE :search", { search: searchParam })
                    .orWhere("contact.law_firm_name LIKE :search", { search: searchParam });
            }
            // Get total count
            const totalCount = await queryBuilder.getCount();
            // Apply sorting and pagination
            const contacts = await queryBuilder
                .orderBy(`contact.${sortField}`, sortOrder)
                .skip(page * pageSize)
                .take(pageSize)
                .getMany();
            res.json({
                data: contacts,
                totalCount,
                page,
                pageSize,
            });
        }
        catch (error) {
            console.error("Error fetching contacts:", error);
            res.status(500).json({ error: "Failed to fetch contacts" });
        }
    });
    // POST /api/contacts/upload - Upload and import CSV file (in-memory processing)
    router.post("/upload", upload.single("file"), async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }
        try {
            // Get file buffer from memory storage
            const fileBuffer = req.file.buffer;
            const contacts = [];
            // Parse CSV from buffer (in-memory, no file system writes)
            const parser = parse(fileBuffer, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
                quote: '"',
                escape: '"',
                bom: true,
            });
            for await (const record of parser) {
                const contactId = Number.parseInt(record["contact_id"], 10);
                // Skip records with invalid contact_id
                if (Number.isNaN(contactId) || contactId === 0) {
                    console.warn(`Skipping record with invalid contact_id: ${record["contact_id"]}`);
                    continue;
                }
                contacts.push({
                    contact_id: contactId,
                    first_name: record["first_name"] || null,
                    last_name: record["last_name"] || null,
                    program: record["program"] || null,
                    email_address: record["email_address"] || null,
                    phone: record["phone"] || null,
                    contact_created_date: record["contact_created_date"] || null,
                    action: record["action"] || null,
                    law_firm_id: record["law_firm_id"]
                        ? Number.parseInt(record["law_firm_id"], 10)
                        : null,
                    law_firm_name: record["law_firm_name"] || null,
                });
            }
            // Save contacts (upsert based on contact_id)
            const contactRepository = dataSource.getRepository(Contact);
            // Bulk upsert to avoid N+1 query problem
            let inserted = 0;
            let updated = 0;
            // Get all existing contact IDs in one query
            const existingContactIds = new Set((await contactRepository.find({
                select: ['contact_id'],
                where: contacts.map(c => ({ contact_id: c.contact_id }))
            })).map(c => c.contact_id));
            // Separate into inserts and updates
            const toInsert = [];
            const toUpdate = [];
            for (const contactData of contacts) {
                if (existingContactIds.has(contactData.contact_id)) {
                    toUpdate.push(contactData);
                }
                else {
                    toInsert.push(contactData);
                }
            }
            // Bulk insert new contacts
            if (toInsert.length > 0) {
                await contactRepository.insert(toInsert);
                inserted = toInsert.length;
            }
            // Bulk update existing contacts
            if (toUpdate.length > 0) {
                for (const contactData of toUpdate) {
                    await contactRepository.update({ contact_id: contactData.contact_id }, contactData);
                }
                updated = toUpdate.length;
            }
            // No file cleanup needed - everything was in-memory!
            res.json({
                success: true,
                message: `Successfully imported ${contacts.length} contacts (${inserted} new, ${updated} updated)`,
                data: {
                    count: contacts.length,
                    inserted,
                    updated,
                }
            });
        }
        catch (error) {
            console.error("Error processing CSV:", error);
            res.status(500).json({ success: false, message: "Failed to process CSV file" });
        }
    });
    // POST /api/contacts - Add single contact manually
    router.post("/", async (req, res) => {
        try {
            const contactData = req.body;
            // Validate required fields
            if (!contactData.contact_id ||
                !contactData.first_name ||
                !contactData.last_name ||
                !contactData.email_address ||
                !contactData.contact_created_date ||
                !contactData.law_firm_id ||
                !contactData.law_firm_name) {
                return res.status(400).json({
                    success: false,
                    message: "Contact ID, First Name, Last Name, Email Address, Contact Created Date, Law Firm ID, and Law Firm Name are required",
                });
            }
            // Validate date format
            if (!isValidDateFormat(contactData.contact_created_date)) {
                return res.status(400).json({
                    success: false,
                    message: "Contact Created Date must be in MM/DD/YYYY format",
                });
            }
            // Validate positive integers
            if (!isPositiveInteger(contactData.contact_id)) {
                return res.status(400).json({
                    success: false,
                    message: "Contact ID must be a positive integer",
                });
            }
            if (!isPositiveInteger(contactData.law_firm_id)) {
                return res.status(400).json({
                    success: false,
                    message: "Law Firm ID must be a positive integer",
                });
            }
            const contactRepository = dataSource.getRepository(Contact);
            // Check if contact already exists
            const existingContact = await contactRepository.findOne({
                where: { contact_id: contactData.contact_id },
            });
            if (existingContact) {
                // Update existing contact
                await contactRepository.update({ contact_id: contactData.contact_id }, {
                    first_name: contactData.first_name,
                    last_name: contactData.last_name,
                    program: contactData.program || null,
                    email_address: contactData.email_address || null,
                    phone: contactData.phone || null,
                    contact_created_date: contactData.contact_created_date || null,
                    action: contactData.action || null,
                    law_firm_id: contactData.law_firm_id || null,
                    law_firm_name: contactData.law_firm_name || null,
                });
                res.json({
                    success: true,
                    message: "Contact updated successfully",
                    action: "updated",
                });
            }
            else {
                // Insert new contact
                const newContact = contactRepository.create({
                    contact_id: contactData.contact_id,
                    first_name: contactData.first_name,
                    last_name: contactData.last_name,
                    program: contactData.program || null,
                    email_address: contactData.email_address || null,
                    phone: contactData.phone || null,
                    contact_created_date: contactData.contact_created_date || null,
                    action: contactData.action || null,
                    law_firm_id: contactData.law_firm_id || null,
                    law_firm_name: contactData.law_firm_name || null,
                });
                await contactRepository.save(newContact);
                res.json({
                    success: true,
                    message: "Contact added successfully",
                    action: "inserted",
                });
            }
        }
        catch (error) {
            console.error("Error adding contact:", error);
            res.status(500).json({ success: false, message: "Failed to add contact" });
        }
    });
    // PUT /api/contacts/:id - Update contact by ID (allows changing contact_id)
    router.put("/:id", async (req, res) => {
        try {
            const originalContactId = Number.parseInt(req.params.id, 10);
            const contactData = req.body;
            if (Number.isNaN(originalContactId)) {
                return res.status(400).json({ success: false, message: "Invalid contact ID" });
            }
            // Validate required fields
            if (!contactData.contact_id ||
                !contactData.first_name ||
                !contactData.last_name ||
                !contactData.email_address ||
                !contactData.contact_created_date ||
                !contactData.law_firm_id ||
                !contactData.law_firm_name) {
                return res.status(400).json({
                    success: false,
                    message: "Contact ID, First Name, Last Name, Email Address, Contact Created Date, Law Firm ID, and Law Firm Name are required",
                });
            }
            // Validate date format
            if (!isValidDateFormat(contactData.contact_created_date)) {
                return res.status(400).json({
                    success: false,
                    message: "Contact Created Date must be in MM/DD/YYYY format",
                });
            }
            // Validate positive integers
            if (!isPositiveInteger(contactData.contact_id)) {
                return res.status(400).json({
                    success: false,
                    message: "Contact ID must be a positive integer",
                });
            }
            if (!isPositiveInteger(contactData.law_firm_id)) {
                return res.status(400).json({
                    success: false,
                    message: "Law Firm ID must be a positive integer",
                });
            }
            // Use transaction to prevent race conditions
            await dataSource.transaction(async (transactionalEntityManager) => {
                // Check if original contact exists
                const existingContact = await transactionalEntityManager.findOne(Contact, {
                    where: { contact_id: originalContactId },
                });
                if (!existingContact) {
                    throw new Error("Contact not found");
                }
                // If contact_id is being changed, check if new ID already exists
                if (contactData.contact_id !== originalContactId) {
                    const conflictingContact = await transactionalEntityManager.findOne(Contact, {
                        where: { contact_id: contactData.contact_id },
                    });
                    if (conflictingContact) {
                        throw new Error(`Contact ID ${contactData.contact_id} already exists. Please choose a different ID.`);
                    }
                    // Delete the old record (within transaction)
                    await transactionalEntityManager.delete(Contact, { contact_id: originalContactId });
                }
                // Create/update the contact with new data
                const contact = transactionalEntityManager.create(Contact, {
                    contact_id: contactData.contact_id,
                    first_name: contactData.first_name,
                    last_name: contactData.last_name,
                    program: contactData.program || null,
                    email_address: contactData.email_address || null,
                    phone: contactData.phone || null,
                    contact_created_date: contactData.contact_created_date || null,
                    action: contactData.action || null,
                    law_firm_id: contactData.law_firm_id || null,
                    law_firm_name: contactData.law_firm_name || null,
                });
                await transactionalEntityManager.save(Contact, contact);
            });
            res.json({
                success: true,
                message: `Contact updated successfully${contactData.contact_id !== originalContactId
                    ? ` (ID changed from ${originalContactId} to ${contactData.contact_id})`
                    : ""}`,
            });
        }
        catch (error) {
            console.error("Error updating contact:", error);
            if (error.message === "Contact not found") {
                return res.status(404).json({ success: false, message: error.message });
            }
            if (error.message?.includes("already exists")) {
                return res.status(409).json({ success: false, message: error.message });
            }
            res.status(500).json({ success: false, message: "Failed to update contact" });
        }
    });
    // DELETE /api/contacts/:id - Delete contact by ID
    router.delete("/:id", async (req, res) => {
        try {
            const contactId = Number.parseInt(req.params.id, 10);
            if (Number.isNaN(contactId)) {
                return res.status(400).json({ success: false, message: "Invalid contact ID" });
            }
            const contactRepository = dataSource.getRepository(Contact);
            // Check if contact exists
            const existingContact = await contactRepository.findOne({
                where: { contact_id: contactId },
            });
            if (!existingContact) {
                return res.status(404).json({ success: false, message: "Contact not found" });
            }
            // Delete the contact
            await contactRepository.delete({ contact_id: contactId });
            res.json({
                success: true,
                message: `Contact ID ${contactId} deleted successfully`,
            });
        }
        catch (error) {
            console.error("Error deleting contact:", error);
            res.status(500).json({ success: false, message: "Failed to delete contact" });
        }
    });
    return router;
}
//# sourceMappingURL=contacts.js.map