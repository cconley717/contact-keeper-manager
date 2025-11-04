import { Router } from "express";
import { DataSource } from "typeorm";
import { ClientsController } from "../controllers/clients.js";

export function createClientsRouter(dataSource: DataSource) {
  const router = Router();
  const controller = new ClientsController(dataSource);

  // GET /api/clients - Fetch all client IDs
  router.get("/", (req, res) => controller.getClients(req, res));

  // POST /api/clients - Add a new client ID
  router.post("/", (req, res) => controller.createClient(req, res));

  // DELETE /api/clients/:id - Delete a client ID
  router.delete("/:id", (req, res) => controller.deleteClient(req, res));

  return router;
}
