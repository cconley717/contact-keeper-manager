import type { Request, Response } from "express";
import { DataSource } from "typeorm";
import { Client } from "../entities/Client.js";
import type { CreateClientDto } from "../types/dto.js";
import { ResponseBuilder } from "../utils/response.js";
import { ERROR_MESSAGES, HTTP_STATUS } from "../constants.js";
import { isPositiveInteger } from "../utils/validation.js";

export class ClientsController {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * GET /api/clients - Fetch all client IDs
   */
  async getClients(_req: Request, res: Response): Promise<void> {
    try {
      const clientRepository = this.dataSource.getRepository(Client);
      const clients = await clientRepository.find({
        order: { client_id: "ASC" },
      });
      ResponseBuilder.success(res, clients);
    } catch (error) {
      ResponseBuilder.internalError(res, error as Error);
    }
  }

  /**
   * POST /api/clients - Add a new client ID
   */
  async createClient(req: Request, res: Response): Promise<void> {
    try {
      const { client_id }: CreateClientDto = req.body;

      // Validate client_id
      if (!isPositiveInteger(client_id)) {
        return ResponseBuilder.badRequest(res, ERROR_MESSAGES.INVALID_CLIENT_ID);
      }

      const clientRepository = this.dataSource.getRepository(Client);

      // Check if client_id already exists
      const existingClient = await clientRepository.findOne({
        where: { client_id },
      });

      if (existingClient) {
        return ResponseBuilder.badRequest(res, ERROR_MESSAGES.CLIENT_ID_EXISTS);
      }

      // Create and save new client
      const newClient = clientRepository.create({ client_id });
      await clientRepository.save(newClient);

      ResponseBuilder.success(res, newClient, "Client ID added successfully", HTTP_STATUS.CREATED);
    } catch (error) {
      ResponseBuilder.internalError(res, error as Error);
    }
  }

  /**
   * DELETE /api/clients/:id - Delete a client ID
   */
  async deleteClient(req: Request, res: Response): Promise<void> {
    try {
      const clientId = Number.parseInt(req.params.id);

      if (Number.isNaN(clientId)) {
        return ResponseBuilder.badRequest(res, ERROR_MESSAGES.INVALID_CLIENT_ID);
      }

      const clientRepository = this.dataSource.getRepository(Client);

      // Check if client exists
      const existingClient = await clientRepository.findOne({
        where: { id: clientId },
      });

      if (!existingClient) {
        return ResponseBuilder.notFound(res, ERROR_MESSAGES.CLIENT_NOT_FOUND);
      }

      // Delete the client
      await clientRepository.delete({ id: clientId });

      ResponseBuilder.success(
        res,
        undefined,
        `Client ID ${existingClient.client_id} deleted successfully`
      );
    } catch (error) {
      ResponseBuilder.internalError(res, error as Error);
    }
  }
}
