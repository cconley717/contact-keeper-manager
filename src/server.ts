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

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for in-memory file uploads (no file system writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
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
app.use(express.json());
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
  
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
} catch (error) {
  console.error("Error initializing database:", error);
  process.exit(1);
}
