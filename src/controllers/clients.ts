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
      if (error instanceof Error) {
        ResponseBuilder.internalError(res, error);
      } else {
        ResponseBuilder.internalError(res, new Error("An unknown error occurred"));
      }
    }
  }

  /**
   * POST /api/clients - Add a new client ID
   */
  async createClient(req: Request, res: Response): Promise<void> {
    try {
      const createClientDto: CreateClientDto = req.body;

      const client_id = createClientDto.client_id;

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
      if (error instanceof Error) {
        ResponseBuilder.internalError(res, error);
      } else {
        ResponseBuilder.internalError(res, new Error("An unknown error occurred"));
      }
    }
  }

  /**
   * DELETE /api/clients/:id - Delete a client ID
   */
  async deleteClient(req: Request, res: Response): Promise<void> {
    try {
      const id = Number.parseInt(req.params.id, 10);

      // Validate ID using consistent helper function
      if (!isPositiveInteger(id)) {
        return ResponseBuilder.badRequest(res, ERROR_MESSAGES.INVALID_CLIENT_ID);
      }

      const clientRepository = this.dataSource.getRepository(Client);

      // Check if client exists
      const existingClient = await clientRepository.findOne({
        where: { id },
      });

      if (!existingClient) {
        return ResponseBuilder.notFound(res, ERROR_MESSAGES.CLIENT_NOT_FOUND);
      }

      // Delete the client
      await clientRepository.delete({ id });

      ResponseBuilder.success(
        res,
        undefined,
        `Client ID ${existingClient.client_id} deleted successfully`
      );
    } catch (error) {
      if (error instanceof Error) {
        ResponseBuilder.internalError(res, error);
      } else {
        ResponseBuilder.internalError(res, new Error("An unknown error occurred"));
      }
    }
  }
}
