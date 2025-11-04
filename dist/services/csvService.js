import { parse } from "csv-parse";
import { Contact } from "../entities/Contact.js";
import { CSV_CONFIG } from "../constants.js";
/**
 * Service for handling CSV file operations
 */
export class CsvService {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    /**
     * Parse and import contacts from CSV buffer
     */
    async importContacts(fileBuffer) {
        const contacts = [];
        const errors = [];
        let skipped = 0;
        // Parse CSV from buffer
        const parser = parse(fileBuffer, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            quote: '"',
            escape: '"',
            bom: true,
        });
        // Extract column names for validation
        const cols = CSV_CONFIG.COLUMN_NAMES;
        for await (const record of parser) {
            // Check batch size limit to prevent memory issues (#41)
            if (contacts.length >= CSV_CONFIG.MAX_RECORDS_PER_BATCH) {
                errors.push(`Batch size limit reached (${CSV_CONFIG.MAX_RECORDS_PER_BATCH} records). Additional records were not processed.`);
                break;
            }
            const contactId = record[cols.CONTACT_ID]?.trim() || "";
            // Skip records with invalid contact_id
            if (!contactId) {
                skipped++;
                errors.push(`Skipping record with missing contact_id`);
                continue;
            }
            contacts.push({
                contact_id: contactId,
                first_name: record[cols.FIRST_NAME],
                last_name: record[cols.LAST_NAME],
                program: record[cols.PROGRAM],
                email_address: record[cols.EMAIL_ADDRESS],
                phone: record[cols.PHONE],
                contact_created_date: record[cols.CONTACT_CREATED_DATE],
                action: record[cols.ACTION],
                law_firm_id: record[cols.LAW_FIRM_ID],
                law_firm_name: record[cols.LAW_FIRM_NAME],
            });
        }
        // Perform bulk upsert within a transaction to prevent race conditions (#4)
        const result = await this.dataSource.transaction(async (transactionalEntityManager) => {
            const contactRepository = transactionalEntityManager.getRepository(Contact);
            // Get all existing contact IDs in one query
            const contactIds = contacts.map((c) => c.contact_id);
            const existingContacts = await contactRepository.find({
                select: ["contact_id"],
                where: contactIds.map((id) => ({ contact_id: id })),
            });
            const existingContactIds = new Set(existingContacts.map((c) => c.contact_id));
            // Separate into inserts and updates
            const toInsert = [];
            const toUpdate = [];
            for (const contactData of contacts) {
                if (contactData.contact_id && existingContactIds.has(contactData.contact_id)) {
                    toUpdate.push(contactData);
                }
                else {
                    toInsert.push(contactData);
                }
            }
            let inserted = 0;
            let updated = 0;
            // Bulk insert new contacts
            if (toInsert.length > 0) {
                await contactRepository.insert(toInsert);
                inserted = toInsert.length;
            }
            // Bulk update using save() which is more efficient than individual updates (#5)
            if (toUpdate.length > 0) {
                const contactsToUpdate = toUpdate.map((data) => contactRepository.create(data));
                await contactRepository.save(contactsToUpdate);
                updated = toUpdate.length;
            }
            return { inserted, updated };
        });
        const csvImportResult = {
            totalRecords: contacts.length + skipped,
            inserted: result.inserted,
            updated: result.updated,
            skipped,
            errors,
        };
        return csvImportResult;
    }
}
//# sourceMappingURL=csvService.js.map