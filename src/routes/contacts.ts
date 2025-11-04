import { Router } from "express";
import { DataSource } from "typeorm";
import type { Multer } from "multer";
import { ContactsController } from "../controllers/contacts.js";

export function createContactsRouter(dataSource: DataSource, upload: Multer) {
  const router = Router();
  const controller = new ContactsController(dataSource);

  // GET /api/contacts - Fetch contacts with pagination, search, and sorting
  router.get("/", (req, res) => controller.getContacts(req, res));

  // POST /api/contacts/upload - Upload and import CSV file
  router.post("/upload", upload.single("file"), (req, res) => controller.uploadCsv(req, res));

  // POST /api/contacts - Add or update a contact
  router.post("/", (req, res) => controller.createContact(req, res));

  // PUT /api/contacts/:id - Update contact by ID
  router.put("/:id", (req, res) => controller.updateContact(req, res));

  // DELETE /api/contacts/:id - Delete contact by ID
  router.delete("/:id", (req, res) => controller.deleteContact(req, res));

  return router;
}
