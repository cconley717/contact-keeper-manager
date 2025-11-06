# Contact Keeper Manager

A web-based contact management application for tracking and organizing contact information. Built with TypeScript, Express, and SQLite, featuring CSV import/export, real-time search, pagination, and an interactive data grid interface.

Note: The software in this repository was developed for the use case of an individual (read: girlfriend :yellow_heart:) and its features will likely not fit anyone else's needs. However, I will keep the repo public because the source may be of use to others, maybe.

## Features

- **CSV Import/Export** - Bulk upload contacts via CSV file with automatic upsert (insert or update)
- **Interactive Data Grid** - Powered by AG-Grid with sorting, filtering, and cell editing
- **Real-time Search** - Server-side search across all contact fields with debouncing
- **Pagination** - Efficient server-side pagination for large datasets
- **Client Management** - Separate interface for managing law firm client IDs
- **CRUD Operations** - Full create, read, update, and delete functionality
- **Transaction Support** - Race condition prevention with database transactions
- **Date Validation** - Flexible date format validation (MM/DD/YYYY with optional leading zeros)

## Tech Stack

- **Backend:** Node.js, Express, TypeScript
- **Database:** SQLite (sql.js) with TypeORM
- **Frontend:** Vanilla JavaScript, AG-Grid, CSS custom properties
- **Architecture:** MVC pattern with controllers, routes, and dependency injection

## Quick Start

```bash
npm install
npm run build
npm start
```

Open http://localhost:3000 in your browser.

## Project Structure

```
src/
├── controllers/     # Business logic (contacts, clients)
├── routes/          # HTTP route handlers
├── entities/        # TypeORM database entities
├── types/           # TypeScript type definitions
└── utils/           # Validation utilities
```
