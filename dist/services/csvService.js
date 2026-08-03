import { parse } from "csv-parse";
import { Contact } from "../entities/Contact.js";
import { CSV_CONFIG } from "../constants.js";
import { validateContactData } from "../utils/contactValidator.js";
import { InputSanitizer } from "../utils/sanitizer.js";
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
        let rowNumber = 1;
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
            rowNumber++;
            // Check batch size limit to prevent memory issues (#41)
            if (contacts.length >= CSV_CONFIG.MAX_RECORDS_PER_BATCH) {
                errors.push(`Batch size limit reached (${CSV_CONFIG.MAX_RECORDS_PER_BATCH} records). Additional records were not processed.`);
                break;
            }
            const contactData = {
                contact_id: record[cols.CONTACT_ID] ?? "",
                first_name: record[cols.FIRST_NAME] ?? "",
                last_name: record[cols.LAST_NAME] ?? "",
                client_id: record[cols.CLIENT_ID] ?? "",
                client_name: record[cols.CLIENT_NAME] ?? "",
                email_address: record[cols.EMAIL_ADDRESS] ?? "",
                phone: record[cols.PHONE] ?? "",
                law_firm_id: record[cols.LAW_FIRM_ID] ?? "",
                law_firm_name: record[cols.LAW_FIRM_NAME] ?? "",
            };
            const validation = validateContactData(contactData);
            if (!validation.isValid) {
                skipped++;
                errors.push(`Skipping row ${rowNumber}: ${validation.errors.join(", ")}`);
                continue;
            }
            contacts.push(validation.sanitizedData);
        }
        // Perform bulk upsert within a transaction to prevent race conditions (#4)
        const result = await this.dataSource.transaction(async (transactionalEntityManager) => {
            const contactRepository = transactionalEntityManager.getRepository(Contact);
            // Get all existing contacts along with their client_id/client_name so those lists can be
            // merged rather than overwritten (prevents losing existing client associations on import)
            const contactIds = contacts.map((c) => c.contact_id);
            const existingContacts = await contactRepository.find({
                select: ["contact_id", "client_id", "client_name"],
                where: contactIds.map((id) => ({ contact_id: id })),
            });
            const existingContactMap = new Map(existingContacts.map((c) => [c.contact_id, c]));
            // Separate into inserts and updates
            const toInsert = [];
            const toUpdate = [];
            for (const contactData of contacts) {
                const existingContact = existingContactMap.get(contactData.contact_id);
                if (existingContact) {
                    // Merge client_id/client_name lists (deduplicated) instead of overwriting so existing
                    // associations aren't lost when a contact reappears in a subsequent CSV import
                    toUpdate.push({
                        ...contactData,
                        client_id: InputSanitizer.combineDelimitedLists(existingContact.client_id, contactData.client_id),
                        client_name: InputSanitizer.combineDelimitedLists(existingContact.client_name, contactData.client_name),
                    });
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
    /**
     * Export contacts from the database to CSV format
     */
    async exportContacts() {
        const contactRepository = this.dataSource.getRepository(Contact);
        const contacts = await contactRepository.find();
        const cols = CSV_CONFIG.COLUMN_NAMES;
        const headers = [
            cols.CONTACT_ID,
            cols.FIRST_NAME,
            cols.LAST_NAME,
            cols.CLIENT_ID,
            cols.CLIENT_NAME,
            cols.EMAIL_ADDRESS,
            cols.PHONE,
            cols.LAW_FIRM_ID,
            cols.LAW_FIRM_NAME,
        ];
        const rows = contacts.map((contact) => [
            contact.contact_id,
            contact.first_name,
            contact.last_name,
            contact.client_id,
            contact.client_name,
            contact.email_address,
            contact.phone,
            contact.law_firm_id,
            contact.law_firm_name,
        ]);
        const csvLines = [
            headers.join(","),
            ...rows.map((row) => row.map((value) => this.escapeCsvValue(value)).join(",")),
        ];
        const csvContent = `\uFEFF${csvLines.join("\r\n")}`;
        const now = new Date();
        const timestamp = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, "0"),
            String(now.getDate()).padStart(2, "0"),
        ].join("-") +
            "_" +
            [
                String(now.getHours()).padStart(2, "0"),
                String(now.getMinutes()).padStart(2, "0"),
                String(now.getSeconds()).padStart(2, "0"),
                String(now.getMilliseconds()).padStart(3, "0"),
            ].join("-");
        return {
            filename: `contacts-export-${timestamp}.csv`,
            mimeType: "text/csv; charset=utf-8",
            content: Buffer.from(csvContent, "utf-8"),
            recordCount: contacts.length,
        };
    }
    escapeCsvValue(value = "") {
        const valueString = String(value);
        const escapedValue = valueString.replaceAll('"', '""');
        if (/[",\r\n]/.test(valueString)) {
            return `"${escapedValue}"`;
        }
        return escapedValue;
    }
}
//# sourceMappingURL=csvService.js.map