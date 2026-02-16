import { parse } from "csv-parse";
import { DataSource } from "typeorm";
import { Contact } from "../entities/Contact.js";
import { Client } from "../entities/Client.js";
import { CSV_CONFIG } from "../constants.js";

export interface CsvImportResult {
  totalRecords: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export interface CsvExportResult {
  filename: string;
  mimeType: string;
  content: Buffer;
  recordCount: number;
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
    const contacts: Contact[] = [];
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
        errors.push(
          `Batch size limit reached (${CSV_CONFIG.MAX_RECORDS_PER_BATCH} records). Additional records were not processed.`
        );
        break;
      }

      const contactIdRaw = record[cols.CONTACT_ID]?.trim() || "";
      const contactId = Number.parseInt(contactIdRaw, 10);
      const lawFirmIdRaw = record[cols.LAW_FIRM_ID]?.trim() || "";
      const lawFirmId = Number.parseInt(lawFirmIdRaw, 10);

      // Skip records with invalid contact_id
      if (!Number.isInteger(contactId) || contactId <= 0) {
        skipped++;
        errors.push(`Skipping record with invalid contact_id: ${contactIdRaw || "<empty>"}`);
        continue;
      }

      if (!Number.isInteger(lawFirmId) || lawFirmId <= 0) {
        skipped++;
        errors.push(`Skipping record with invalid law_firm_id: ${lawFirmIdRaw || "<empty>"}`);
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
        law_firm_id: lawFirmId,
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
      const toInsert: Partial<Contact>[] = [];
      const toUpdate: Partial<Contact>[] = [];

      for (const contactData of contacts) {
        if (contactData.contact_id && existingContactIds.has(contactData.contact_id)) {
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
        const contactsToUpdate = toUpdate.map((data) => contactRepository.create(data));
        await contactRepository.save(contactsToUpdate);
        updated = toUpdate.length;
      }

      return { inserted, updated };
    });

    const csvImportResult: CsvImportResult = {
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
  async exportContacts(): Promise<CsvExportResult> {
    const contactRepository = this.dataSource.getRepository(Contact);
    const contacts = await contactRepository.find();

    const cols = CSV_CONFIG.COLUMN_NAMES;
    const headers = [
      cols.CONTACT_ID,
      cols.FIRST_NAME,
      cols.LAST_NAME,
      cols.PROGRAM,
      cols.EMAIL_ADDRESS,
      cols.PHONE,
      cols.CONTACT_CREATED_DATE,
      cols.LAW_FIRM_ID,
      cols.LAW_FIRM_NAME,
    ];

    const rows = contacts.map((contact) => [
      contact.contact_id,
      contact.first_name,
      contact.last_name,
      contact.program,
      contact.email_address,
      contact.phone,
      contact.contact_created_date,
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

  /**
   * Parse and import clients from CSV buffer
   */
  async importClients(fileBuffer: Buffer): Promise<CsvImportResult> {
    const clients: Client[] = [];
    const errors: string[] = [];
    let skipped = 0;

    const parser = parse(fileBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      quote: '"',
      escape: '"',
      bom: true,
    });

    const cols = CSV_CONFIG.CLIENT_COLUMN_NAMES;

    for await (const record of parser) {
      if (clients.length >= CSV_CONFIG.MAX_RECORDS_PER_BATCH) {
        errors.push(
          `Batch size limit reached (${CSV_CONFIG.MAX_RECORDS_PER_BATCH} records). Additional records were not processed.`
        );
        break;
      }

      const clientIdRaw = record[cols.CLIENT_ID]?.trim() || "";
      const clientId = Number.parseInt(clientIdRaw, 10);
      const clientName = record[cols.CLIENT_NAME]?.trim() || "";

      if (!Number.isInteger(clientId) || clientId <= 0) {
        skipped++;
        errors.push(`Skipping record with invalid client_id: ${clientIdRaw || "<empty>"}`);
        continue;
      }

      if (!clientName) {
        skipped++;
        errors.push(`Skipping record with empty client_name for client_id: ${clientId}`);
        continue;
      }

      clients.push({
        client_id: clientId,
        client_name: clientName,
      } as Client);
    }

    const result = await this.dataSource.transaction(async (transactionalEntityManager) => {
      const clientRepository = transactionalEntityManager.getRepository(Client);

      if (clients.length === 0) {
        return { inserted: 0, updated: 0 };
      }

      const clientIds = clients.map((client) => client.client_id);
      const existingClients = await clientRepository.find({
        select: ["client_id"],
        where: clientIds.map((id) => ({ client_id: id })),
      });

      const existingClientIds = new Set(existingClients.map((client) => client.client_id));

      const inserted = clients.filter((client) => !existingClientIds.has(client.client_id)).length;
      const updated = clients.length - inserted;

      await clientRepository.upsert(clients, ["client_id"]);

      return { inserted, updated };
    });

    const csvImportResult: CsvImportResult = {
      totalRecords: clients.length + skipped,
      inserted: result.inserted,
      updated: result.updated,
      skipped,
      errors,
    };

    return csvImportResult;
  }

  /**
   * Export clients from the database to CSV format
   */
  async exportClients(): Promise<CsvExportResult> {
    const clientRepository = this.dataSource.getRepository(Client);
    const clients = await clientRepository.find({ order: { client_id: "ASC" } });

    const cols = CSV_CONFIG.CLIENT_COLUMN_NAMES;
    const headers = [cols.CLIENT_ID, cols.CLIENT_NAME];

    const rows = clients.map((client) => [client.client_id, client.client_name]);

    const csvLines = [
      headers.join(","),
      ...rows.map((row) => row.map((value) => this.escapeCsvValue(value)).join(",")),
    ];

    const csvContent = `\uFEFF${csvLines.join("\r\n")}`;
    const now = new Date();
    const timestamp =
      [
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
      filename: `clients-export-${timestamp}.csv`,
      mimeType: "text/csv; charset=utf-8",
      content: Buffer.from(csvContent, "utf-8"),
      recordCount: clients.length,
    };
  }

  private escapeCsvValue(value: string | number = ""): string {
    const valueString = String(value);
    const escapedValue = valueString.replaceAll('"', '""');

    if (/[",\r\n]/.test(valueString)) {
      return `"${escapedValue}"`;
    }

    return escapedValue;
  }
}
