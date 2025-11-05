import { Client } from "../entities/Client.js";
import { ResponseBuilder } from "../utils/response.js";
import { ERROR_MESSAGES, HTTP_STATUS } from "../constants.js";
import { isPositiveInteger } from "../utils/validation.js";
import { validateClientData } from "../utils/clientValidator.js";
export class ClientsController {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    /**
     * GET /api/clients - Fetch all client IDs
     */
    async getClients(_req, res) {
        try {
            const clientRepository = this.dataSource.getRepository(Client);
            const clients = await clientRepository.find({
                order: { client_id: "ASC" },
            });
            ResponseBuilder.success(res, clients);
        }
        catch (error) {
            if (error instanceof Error) {
                ResponseBuilder.internalError(res, error);
            }
            else {
                ResponseBuilder.internalError(res, new Error("An unknown error occurred"));
            }
        }
    }
    /**
     * POST /api/clients - Add a new client ID
     */
    async createClient(req, res) {
        try {
            const createClientDto = req.body;
            // Validate and sanitize client data
            const validation = validateClientData(createClientDto);
            if (!validation.isValid) {
                return ResponseBuilder.badRequest(res, validation.errors.join(", "));
            }
            const sanitizedData = validation.sanitizedData;
            const clientRepository = this.dataSource.getRepository(Client);
            // Check if client_id already exists
            const existingClient = await clientRepository.findOne({
                where: { client_id: sanitizedData.client_id },
            });
            if (existingClient) {
                return ResponseBuilder.badRequest(res, ERROR_MESSAGES.CLIENT_ID_EXISTS);
            }
            // Create and save new client
            const newClient = clientRepository.create({
                client_id: sanitizedData.client_id,
                client_name: sanitizedData.client_name
            });
            await clientRepository.save(newClient);
            ResponseBuilder.success(res, newClient, "Client ID added successfully", HTTP_STATUS.CREATED);
        }
        catch (error) {
            if (error instanceof Error) {
                ResponseBuilder.internalError(res, error);
            }
            else {
                ResponseBuilder.internalError(res, new Error("An unknown error occurred"));
            }
        }
    }
    /**
     * DELETE /api/clients/:id - Delete a client ID
     */
    async deleteClient(req, res) {
        try {
            const id = req.params.id;
            // Validate ID using consistent helper function
            if (!isPositiveInteger(id)) {
                return ResponseBuilder.badRequest(res, ERROR_MESSAGES.INVALID_CLIENT_ID);
            }
            // Convert string ID to find the client by database id (auto-increment)
            const numId = Number.parseInt(id, 10);
            const clientRepository = this.dataSource.getRepository(Client);
            // Check if client exists
            const existingClient = await clientRepository.findOne({
                where: { id: numId },
            });
            if (!existingClient) {
                return ResponseBuilder.notFound(res, ERROR_MESSAGES.CLIENT_NOT_FOUND);
            }
            await clientRepository.delete({ id: numId });
            ResponseBuilder.success(res, {}, `Client ID ${existingClient.client_id} deleted successfully`);
        }
        catch (error) {
            if (error instanceof Error) {
                ResponseBuilder.internalError(res, error);
            }
            else {
                ResponseBuilder.internalError(res, new Error("An unknown error occurred"));
            }
        }
    }
}
//# sourceMappingURL=clients.js.map