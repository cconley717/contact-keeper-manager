import type { Request, Response } from "express";
import { DataSource } from "typeorm";
import { Client } from "../entities/Client.js";
import type { CreateClientDto } from "../types/dto.js";

export class ClientsController {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * GET /api/clients - Fetch all client IDs
   */
  async getClients(req: Request, res: Response): Promise<void> {
    try {
      const clientRepository = this.dataSource.getRepository(Client);
      const clients = await clientRepository.find({
        order: { client_id: "ASC" },
      });
      res.json({ success: true, data: clients });
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ success: false, message: "Failed to fetch clients" });
    }
  }

  /**
   * POST /api/clients - Add a new client ID
   */
  async createClient(req: Request, res: Response): Promise<void> {
    try {
      const { client_id }: CreateClientDto = req.body;

      // Validate client_id
      if (
        !client_id ||
        typeof client_id !== "number" ||
        !Number.isInteger(client_id)
      ) {
        res
          .status(400)
          .json({ success: false, message: "Client ID must be an integer" });
        return;
      }

      if (client_id <= 0) {
        res
          .status(400)
          .json({ success: false, message: "Client ID must be positive" });
        return;
      }

      const clientRepository = this.dataSource.getRepository(Client);

      // Check if client_id already exists
      const existingClient = await clientRepository.findOne({
        where: { client_id },
      });

      if (existingClient) {
        res
          .status(400)
          .json({ success: false, message: "Client ID already exists" });
        return;
      }

      // Create and save new client
      const newClient = clientRepository.create({ client_id });
      await clientRepository.save(newClient);

      res.status(201).json({
        success: true,
        message: "Client ID added successfully",
        data: newClient,
      });
    } catch (error) {
      console.error("Error adding client:", error);
      res.status(500).json({ success: false, message: "Failed to add client" });
    }
  }

  /**
   * DELETE /api/clients/:id - Delete a client ID
   */
  async deleteClient(req: Request, res: Response): Promise<void> {
    try {
      const clientId = Number.parseInt(req.params.id);

      if (Number.isNaN(clientId)) {
        res.status(400).json({ success: false, message: "Invalid client ID" });
        return;
      }

      const clientRepository = this.dataSource.getRepository(Client);

      // Check if client exists
      const existingClient = await clientRepository.findOne({
        where: { id: clientId },
      });

      if (!existingClient) {
        res.status(404).json({ success: false, message: "Client ID not found" });
        return;
      }

      // Delete the client
      await clientRepository.delete({ id: clientId });

      res.json({
        success: true,
        message: `Client ID ${existingClient.client_id} deleted successfully`,
      });
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ success: false, message: "Failed to delete client" });
    }
  }
}
