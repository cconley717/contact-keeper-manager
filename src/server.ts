import "reflect-metadata";
import express from "express";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DataSource } from "typeorm";
import { Contact } from "./entities/Contact.js";
import { Client } from "./entities/Client.js";
import { createContactsRouter } from "./routes/contacts.js";
import { createClientsRouter } from "./routes/clients.js";
import { SERVER_CONFIG, CSV_CONFIG } from "./constants.js";
import { validatePort } from "./utils/validation.js";

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();
const PORT = validatePort(process.env.PORT, SERVER_CONFIG.DEFAULT_PORT);

// Configure multer for in-memory file uploads (no file system writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: CSV_CONFIG.MAX_FILE_SIZE,
  },
});

// Initialize TypeORM DataSource with sql.js
const AppDataSource = new DataSource({
  type: "sqljs",
  location: path.join(__dirname, "contacts.db"), // Database in dist folder
  autoSave: true, // Auto-save to disk after changes
  synchronize: true,
  logging: false,
  entities: [Contact, Client],
});

// Middleware
app.use(express.json({ limit: SERVER_CONFIG.MAX_REQUEST_SIZE }));
// Serve static files from public directory (works for both dev and production)
app.use(express.static(path.join(process.cwd(), "public")));

// Initialize database and mount routes
try {
  console.log("Initializing database...");
  await AppDataSource.initialize();
  console.log("Database initialized successfully");

  // Mount route modules
  const contactsRouter = createContactsRouter(AppDataSource, upload);
  const clientsRouter = createClientsRouter(AppDataSource);

  app.use("/api/contacts", contactsRouter);
  app.use("/api/clients", clientsRouter);

  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Configure request timeout to prevent hanging requests (#40)
  server.timeout = SERVER_CONFIG.REQUEST_TIMEOUT_MS;
} catch (error) {
  console.error("Error initializing database:", error);
  process.exit(1);
}
