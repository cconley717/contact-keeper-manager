import { parse } from "csv-parse";
import { DataSource } from "typeorm";
import { Contact } from "../entities/Contact.js";
import { CSV_CONFIG } from "../constants.js";

export interface CsvImportResult {
  totalRecords: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * Service for handling CSV file operations
 */
export class CsvService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Parse and import contacts from CSV buffer
   */
  async importContacts(fileBuffer: Buffer): Promise<CsvImportResult> {
    const contacts: Partial<Contact>[] = [];
    const errors: string[] = [];
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

      const contactId = Number.parseInt(record[cols.CONTACT_ID], 10);

      // Skip records with invalid contact_id
      if (Number.isNaN(contactId) || contactId === 0) {
        skipped++;
        errors.push(`Skipping record with invalid contact_id: ${record[cols.CONTACT_ID]}`);
        continue;
      }

      contacts.push({
        contact_id: contactId,
        first_name: record[cols.FIRST_NAME] || null,
        last_name: record[cols.LAST_NAME] || null,
        program: record[cols.PROGRAM] || null,
        email_address: record[cols.EMAIL_ADDRESS] || null,
        phone: record[cols.PHONE] || null,
        contact_created_date: record[cols.CONTACT_CREATED_DATE] || null,
        action: record[cols.ACTION] || null,
        law_firm_id: record[cols.LAW_FIRM_ID]
          ? Number.parseInt(record[cols.LAW_FIRM_ID], 10)
          : null,
        law_firm_name: record[cols.LAW_FIRM_NAME] || null,
      });
    }

    // Perform bulk upsert within a transaction to prevent race conditions (#4)
    const result = await this.dataSource.transaction(async (transactionalEntityManager) => {
      const contactRepository = transactionalEntityManager.getRepository(Contact);

      // Get all existing contact IDs in one query
      const contactIds = contacts.map((c) => c.contact_id as number);
      const existingContacts = await contactRepository.find({
        select: ["contact_id"],
        where: contactIds.map((id) => ({ contact_id: id })),
      });

      const existingContactIds = new Set(existingContacts.map((c) => c.contact_id));

      // Separate into inserts and updates
      const toInsert: Partial<Contact>[] = [];
      const toUpdate: Partial<Contact>[] = [];

      for (const contactData of contacts) {
        if (existingContactIds.has(contactData.contact_id as number)) {
          toUpdate.push(contactData);
        } else {
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
        const contactsToUpdate = toUpdate.map((data) =>
          contactRepository.create(data)
        );
        await contactRepository.save(contactsToUpdate);
        updated = toUpdate.length;
      }

      return { inserted, updated };
    });

    return {
      totalRecords: contacts.length + skipped,
      inserted: result.inserted,
      updated: result.updated,
      skipped,
      errors,
    };
  }
}
