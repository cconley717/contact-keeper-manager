import "reflect-metadata";
import express from "express";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DataSource } from "typeorm";
import { parse } from "csv-parse";
import { Contact } from "./entities/Contact.js";
// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;
// Configure multer for in-memory file uploads (no file system writes)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});
// Initialize TypeORM DataSource with sql.js
const AppDataSource = new DataSource({
    type: "sqljs",
    location: path.join(__dirname, "contacts.db"), // Database in dist folder
    autoSave: true, // Auto-save to disk after changes
    synchronize: true,
    logging: false,
    entities: [Contact],
});
// Middleware
app.use(express.json());
// Serve static files from public directory (works for both dev and production)
app.use(express.static(path.join(process.cwd(), "public")));
// Initialize database connection (will be called in startup function)
// GET /api/contacts - Fetch contacts with pagination, search, and sorting
app.get("/api/contacts", async (req, res) => {
    try {
        const page = Number.parseInt(req.query.page) || 0;
        const pageSize = Number.parseInt(req.query.pageSize) || 20;
        const search = req.query.search || "";
        const sortField = req.query.sortField || "contact_id";
        const sortOrder = req.query.sortOrder === "desc" ? "DESC" : "ASC";
        const contactRepository = AppDataSource.getRepository(Contact);
        // Build query
        let queryBuilder = contactRepository.createQueryBuilder("contact");
        // Apply search across all columns if search term is provided
        if (search) {
            queryBuilder = queryBuilder.where(`contact.contact_id LIKE :search OR 
         contact.first_name LIKE :search OR 
         contact.last_name LIKE :search OR 
         contact.program LIKE :search OR 
         contact.email_address LIKE :search OR 
         contact.phone LIKE :search OR 
         contact.contact_created_date LIKE :search OR 
         contact.action LIKE :search OR 
         contact.law_firm_id LIKE :search OR 
         contact.law_firm_name LIKE :search`, { search: `%${search}%` });
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
// POST /api/upload - Upload and import CSV file (in-memory processing)
app.post("/api/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
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
        const contactRepository = AppDataSource.getRepository(Contact);
        // Process each contact individually for proper upsert
        let inserted = 0;
        let updated = 0;
        for (const contactData of contacts) {
            const existing = await contactRepository.findOne({
                where: { contact_id: contactData.contact_id },
            });
            if (existing) {
                // Update existing contact
                await contactRepository.update({ contact_id: contactData.contact_id }, contactData);
                updated++;
            }
            else {
                // Insert new contact
                await contactRepository.insert(contactData);
                inserted++;
            }
        }
        // No file cleanup needed - everything was in-memory!
        res.json({
            success: true,
            message: `Successfully imported ${contacts.length} contacts (${inserted} new, ${updated} updated)`,
            count: contacts.length,
            inserted,
            updated,
        });
    }
    catch (error) {
        console.error("Error processing CSV:", error);
        res.status(500).json({ error: "Failed to process CSV file" });
    }
});
// Add single contact manually
app.post("/api/contact", async (req, res) => {
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
                error: "Contact ID, First Name, Last Name, Email Address, Contact Created Date, Law Firm ID, and Law Firm Name are required",
            });
        }
        const contactRepository = AppDataSource.getRepository(Contact);
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
        res.status(500).json({ error: "Failed to add contact" });
    }
});
// Update contact by ID (allows changing contact_id)
app.put("/api/contact/:id", async (req, res) => {
    try {
        const originalContactId = Number.parseInt(req.params.id, 10);
        const contactData = req.body;
        if (Number.isNaN(originalContactId)) {
            return res.status(400).json({ error: "Invalid contact ID" });
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
                error: "Contact ID, First Name, Last Name, Email Address, Contact Created Date, Law Firm ID, and Law Firm Name are required",
            });
        }
        const contactRepository = AppDataSource.getRepository(Contact);
        // Check if original contact exists
        const existingContact = await contactRepository.findOne({
            where: { contact_id: originalContactId },
        });
        if (!existingContact) {
            return res.status(404).json({ error: "Contact not found" });
        }
        // If contact_id is being changed, check if new ID already exists
        if (contactData.contact_id !== originalContactId) {
            const conflictingContact = await contactRepository.findOne({
                where: { contact_id: contactData.contact_id },
            });
            if (conflictingContact) {
                return res.status(409).json({
                    error: `Contact ID ${contactData.contact_id} already exists. Please choose a different ID.`,
                });
            }
            // Delete the old record and create a new one with the new ID
            await contactRepository.delete({ contact_id: originalContactId });
        }
        // Create/update the contact with new data
        const contact = contactRepository.create({
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
        await contactRepository.save(contact);
        res.json({
            success: true,
            message: `Contact updated successfully${contactData.contact_id !== originalContactId
                ? ` (ID changed from ${originalContactId} to ${contactData.contact_id})`
                : ""}`,
        });
    }
    catch (error) {
        console.error("Error updating contact:", error);
        res.status(500).json({ error: "Failed to update contact" });
    }
});
// Delete contact by ID
app.delete("/api/contact/:id", async (req, res) => {
    try {
        const contactId = Number.parseInt(req.params.id, 10);
        if (Number.isNaN(contactId)) {
            return res.status(400).json({ error: "Invalid contact ID" });
        }
        const contactRepository = AppDataSource.getRepository(Contact);
        // Check if contact exists
        const existingContact = await contactRepository.findOne({
            where: { contact_id: contactId },
        });
        if (!existingContact) {
            return res.status(404).json({ error: "Contact not found" });
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
        res.status(500).json({ error: "Failed to delete contact" });
    }
});
// Initialize database and start server using top-level await
try {
    await AppDataSource.initialize();
    console.log("Database initialized successfully");
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
catch (error) {
    console.error("Error initializing database:", error);
    process.exit(1);
}
//# sourceMappingURL=server.js.map