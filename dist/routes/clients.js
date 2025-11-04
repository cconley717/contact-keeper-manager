import { Router } from "express";
import { Client } from "../entities/Client.js";
export function createClientsRouter(dataSource) {
    const router = Router();
    // GET /api/clients - Fetch all client IDs
    router.get("/", async (req, res) => {
        try {
            const clientRepository = dataSource.getRepository(Client);
            const clients = await clientRepository.find({
                order: { client_id: "ASC" },
            });
            res.json({ success: true, data: clients });
        }
        catch (error) {
            console.error("Error fetching clients:", error);
            res.status(500).json({ success: false, message: "Failed to fetch clients" });
        }
    });
    // POST /api/clients - Add a new client ID
    router.post("/", async (req, res) => {
        try {
            const { client_id } = req.body;
            // Validate client_id
            if (!client_id || typeof client_id !== "number" || !Number.isInteger(client_id)) {
                return res.status(400).json({ success: false, message: "Client ID must be an integer" });
            }
            if (client_id <= 0) {
                return res.status(400).json({ success: false, message: "Client ID must be positive" });
            }
            const clientRepository = dataSource.getRepository(Client);
            // Check if client_id already exists
            const existingClient = await clientRepository.findOne({
                where: { client_id },
            });
            if (existingClient) {
                return res.status(400).json({ success: false, message: "Client ID already exists" });
            }
            // Create and save new client
            const newClient = clientRepository.create({ client_id });
            await clientRepository.save(newClient);
            res.status(201).json({
                success: true,
                message: "Client ID added successfully",
                data: newClient,
            });
        }
        catch (error) {
            console.error("Error adding client:", error);
            res.status(500).json({ success: false, message: "Failed to add client" });
        }
    });
    // DELETE /api/clients/:id - Delete a client ID
    router.delete("/:id", async (req, res) => {
        try {
            const clientId = Number.parseInt(req.params.id);
            if (Number.isNaN(clientId)) {
                return res.status(400).json({ success: false, message: "Invalid client ID" });
            }
            const clientRepository = dataSource.getRepository(Client);
            // Check if client exists
            const existingClient = await clientRepository.findOne({
                where: { id: clientId },
            });
            if (!existingClient) {
                return res.status(404).json({ success: false, message: "Client ID not found" });
            }
            // Delete the client
            await clientRepository.delete({ id: clientId });
            res.json({
                success: true,
                message: `Client ID ${existingClient.client_id} deleted successfully`,
            });
        }
        catch (error) {
            console.error("Error deleting client:", error);
            res.status(500).json({ success: false, message: "Failed to delete client" });
        }
    });
    return router;
}
//# sourceMappingURL=clients.js.map