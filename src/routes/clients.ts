import { Router } from "express";
import { DataSource } from "typeorm";
import type { Multer } from "multer";
import { ClientsController } from "../controllers/clients.js";

export function createClientsRouter(dataSource: DataSource, upload: Multer) {
  const router = Router();
  const controller = new ClientsController(dataSource);

  // GET /api/clients - Fetch all client IDs
  router.get("/", (req, res) => controller.getClients(req, res));

  // POST /api/clients - Add a new client ID
  router.post("/", (req, res) => controller.createClient(req, res));

  // POST /api/clients/upload - Upload and import clients CSV file
  router.post("/upload", upload.single("file"), (req, res) => controller.uploadCsv(req, res));

  // GET /api/clients/download - Download and export clients CSV file
  router.get("/download", (req, res) => controller.exportCsv(req, res));

  // DELETE /api/clients/:id - Delete a client ID
  router.delete("/:id", (req, res) => controller.deleteClient(req, res));

  return router;
}
