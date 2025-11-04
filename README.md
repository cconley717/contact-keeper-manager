# Contact Keeper Manager

> A modern, full-stack contact management system with CSV import, real-time search, and interactive data visualization.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📋 Overview

Contact Keeper Manager is a professional-grade web application designed for legal professionals and organizations to efficiently manage contact databases. Built with TypeScript and Express, it provides a robust backend with an intuitive, responsive frontend interface.

### Key Highlights

- 🚀 **High Performance**: Server-side pagination and search with SQLite
- 📊 **Enterprise Grid**: Powered by AG-Grid Community Edition
- 🎨 **Modern UI**: Clean, accessible interface following SOLID CSS principles
- 🔄 **Smart Upsert**: Automatically updates existing records or inserts new ones
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- ♿ **Accessible**: Built with accessibility best practices
- 🔍 **Powerful Search**: Real-time search across all contact fields

---

## ✨ Features

### Core Functionality

- **CSV Import & Export**
  - Bulk upload contacts via CSV files (in-memory processing, no disk writes)
  - Automatic parsing and validation
  - Duplicate detection and smart merging
  - 10MB file size limit for security
  - Error reporting with detailed feedback

- **Contact Management**
  - Add, update, and delete contacts
  - Modal-based editing interface
  - Collapsible manual entry form
  - Real-time validation

- **Advanced Data Grid**
  - 20 records per page with smooth pagination
  - Multi-column sorting
  - Global search across all fields
  - Inline action buttons (Select, Update, Delete)
  - Responsive column sizing

- **Output Table**
  - Structured data entry form
  - Pre-populated dropdown menus
  - Copy to clipboard functionality (formatted HTML table)
  - Quick data export for reporting

### Technical Features

- Server-side pagination for optimal performance
- RESTful API architecture
- TypeORM for type-safe database operations
- Automatic database migrations
- File upload handling with Multer
- CORS-enabled API endpoints
- Error handling and logging

---

## 🛠 Tech Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Runtime environment |
| **TypeScript** | 5.6+ | Type-safe development |
| **Express.js** | 4.21 | Web framework |
| **TypeORM** | 0.3.20 | ORM and migrations |
| **better-sqlite3** | 11.5 | SQLite database driver |
| **Multer** | 2.0 | File upload middleware |
| **csv-parse** | 5.6 | CSV parsing |

### Frontend

| Technology | Purpose |
|------------|---------|
| **AG-Grid Community** | Enterprise-grade data grid |
| **Vanilla JavaScript** | Lightweight, no framework overhead |
| **CSS3** | Modern styling with SOLID principles |
| **HTML5** | Semantic markup |

### Development Tools

- **ts-node-dev**: Development server with hot reload
- **TypeScript**: Static type checking
- **ESLint**: Code quality and consistency

---

## 📁 Project Structure

```
contact-keeper-manager/
├── src/
│   ├── entities/
│   │   └── Contact.ts           # TypeORM entity definition
│   └── server.ts                # Express server & API routes
├── public/
│   ├── css/
│   │   └── style.css            # Application styles (SOLID principles)
│   ├── js/
│   │   └── ag-grid-community.min.js  # AG-Grid library
│   └── index.html               # Main application interface
├── dist/                        # Compiled TypeScript output
├── contacts.db                  # SQLite database (auto-generated)
├── package.json                 # Dependencies & scripts
├── tsconfig.json                # TypeScript configuration
└── README.md                    # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **npm** 9 or higher
- **SQLite3** (bundled with better-sqlite3)

### Installation

1. **Clone the repository** (or download the source code)

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

### Running the Application

#### Development Mode (recommended for development)
Hot reloading enabled - changes are reflected immediately:
```bash
npm run dev
```

#### Production Mode
Optimized build and execution:
```bash
npm start
```

The application will start on **http://localhost:3000**

### First Run

1. Open your browser to `http://localhost:3000`
2. Upload a CSV file using the "Import CSV File" section
3. View your contacts in the interactive data grid
4. Use search, pagination, and sorting features
5. Add new contacts manually using the "Add New Contact Manually" form

---

## 📊 Database Schema

### Contact Entity

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `contact_id` | INTEGER | PRIMARY KEY | Unique contact identifier |
| `first_name` | VARCHAR | NOT NULL | Contact's first name |
| `last_name` | VARCHAR | NOT NULL | Contact's last name |
| `program` | VARCHAR | - | Associated program |
| `email_address` | VARCHAR | - | Email address |
| `phone` | VARCHAR | - | Phone number |
| `contact_created_date` | VARCHAR | - | Creation date (string format) |
| `action` | VARCHAR | - | Associated action |
| `law_firm_id` | INTEGER | NULLABLE | Law firm identifier |
| `law_firm_name` | VARCHAR | - | Law firm name |

### Upsert Logic

The application uses **contact_id** as the unique identifier:
- If a contact with the same `contact_id` exists, it will be **updated**
- If no matching `contact_id` is found, a new record is **inserted**

---

## 🔌 API Reference

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### `GET /api/contacts`
Retrieve paginated, searchable contact list.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 0 | Page number (0-indexed) |
| `pageSize` | number | 20 | Records per page |
| `search` | string | - | Search term (searches all columns) |
| `sortField` | string | - | Column to sort by |
| `sortOrder` | string | - | Sort direction: `asc` or `desc` |

**Example Request:**
```bash
GET /api/contacts?page=0&pageSize=20&search=john&sortField=last_name&sortOrder=asc
```

**Response:**
```json
{
  "data": [
    {
      "contact_id": 213,
      "first_name": "Katherine",
      "last_name": "Corner",
      "program": "Combat Arms Earplug",
      "email_address": "kcorner@pulaski-lawfirm.com",
      "phone": "616-913-2876",
      "contact_created_date": "1/25/2024",
      "action": "557",
      "law_firm_id": null,
      "law_firm_name": "Pulaski Law Firm PLLC"
    }
  ],
  "totalCount": 354,
  "page": 0,
  "pageSize": 20
}
```

---

#### `POST /api/upload`
Upload and import a CSV file.

**Request:**
- Content-Type: `multipart/form-data`
- Field name: `file`
- File type: `.csv`

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@contacts.csv"
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Successfully imported 50 contacts",
  "count": 50
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "No file uploaded"
}
```

---

#### `POST /api/contacts`
Add a new contact manually.

**Request Body:**
```json
{
  "contact_id": 9999,
  "first_name": "John",
  "last_name": "Doe",
  "program": "Combat Arms Earplug",
  "email_address": "john.doe@example.com",
  "phone": "555-123-4567",
  "contact_created_date": "11/3/2025",
  "action": "Initial Contact",
  "law_firm_id": 12345,
  "law_firm_name": "Doe & Associates"
}
```

**Response:**
```json
{
  "success": true,
  "contact": { ...contact object... }
}
```

---

#### `PUT /api/contacts/:id`
Update an existing contact.

**URL Parameters:**
- `id`: Contact ID

**Request Body:**
```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "email_address": "jane.smith@example.com"
}
```

---

#### `DELETE /api/contacts/:id`
Delete a contact.

**URL Parameters:**
- `id`: Contact ID

**Response:**
```json
{
  "success": true,
  "message": "Contact deleted successfully"
}
```

---

## 📄 CSV Format

### Required Headers

Your CSV file must include these column headers (order doesn't matter):

```csv
contact_id,first_name,last_name,program,email_address,phone,contact_created_date,action,law_firm_id,law_firm_name
```

### Example CSV

```csv
contact_id,first_name,last_name,program,email_address,phone,contact_created_date,action,law_firm_id,law_firm_name
213,Katherine,Corner,Combat Arms Earplug,kcorner@example.com,616-913-2876,1/25/2024,557,,Pulaski Law Firm PLLC
999,Justin,Campain,Combat Arms Earplug,jcampain@example.com,816-888-5000,1/29/2024,590,,The Soap Law Firm
```

### Tips

- Empty cells are allowed (except for required fields)
- Dates should be in readable string format (e.g., "1/25/2024")
- `law_firm_id` can be empty (will be stored as NULL)
- Special characters in CSV should be properly escaped

---

## 🎨 CSS Architecture

The application follows **SOLID CSS principles** for maintainable, scalable styling:

### Design Principles

- **Single Responsibility**: Each class has one clear purpose
- **Open/Closed**: Extendable via composition, not modification
- **Liskov Substitution**: Consistent naming and behavior
- **Interface Segregation**: Specific utility classes for common patterns
- **Dependency Inversion**: Reusable component-based architecture

### Class Naming Convention

- **BEM-style** for components: `.modal-header`, `.output-header__title`
- **Modifier pattern** for states: `.message--success`, `.btn-info--copied`
- **Utility classes** for common patterns: `.ml-10`, `.flex-between`

### No Inline Styles

All styling is externalized to `/public/css/style.css` - **zero inline styles** in HTML or JavaScript for maximum maintainability.

---

## 🔧 Development

### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm run build` | `tsc && npm run copy-files` | Compile TypeScript and copy assets |
| `npm run dev` | `ts-node-dev ...` | Start development server with hot reload |
| `npm start` | `npm run build && node dist/server.js` | Production build and start |
| `npm run copy-files` | Copy public assets to dist | Internal build step |

### Project Configuration

#### TypeScript (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

#### Development Workflow

1. Make changes to `src/` or `public/` files
2. Run `npm run dev` for hot reloading (backend changes)
3. Refresh browser for frontend changes
4. Build with `npm run build` before committing

---

## 🐛 Troubleshooting

### Common Issues

**Issue**: "Cannot find module 'better-sqlite3'"
- **Solution**: Run `npm install` to ensure all dependencies are installed

**Issue**: Port 3000 already in use
- **Solution**: Change port in `src/server.ts` or stop the conflicting process

**Issue**: CSV upload fails silently
- **Solution**: Check CSV format matches required headers exactly

**Issue**: Database locked error
- **Solution**: Close all connections to `contacts.db` and restart the server

**Issue**: Build fails with TypeScript errors
- **Solution**: Ensure TypeScript version matches `package.json` requirements

---

## 🗺 Roadmap

### Completed ✅

- [x] CSV import with smart upsert logic
- [x] Server-side pagination (20 rows per page)
- [x] Global search across all columns
- [x] AG-Grid data visualization
- [x] Modal-based contact editing
- [x] Manual contact entry form
- [x] Output table with clipboard copy
- [x] SOLID CSS architecture (zero inline styles)
- [x] Collapsible form sections
- [x] Delete confirmation
- [x] Success/error messaging

### Planned 🚧

- [ ] CSV export functionality
- [ ] Advanced filtering (date ranges, multi-select)
- [ ] Bulk operations (select multiple, bulk delete)
- [ ] Contact history/audit trail
- [ ] User authentication and authorization
- [ ] Custom field configuration
- [ ] Email integration
- [ ] Dark mode toggle
- [ ] Keyboard shortcuts
- [ ] Print-friendly views
- [ ] Data validation rules
- [ ] Import from other formats (Excel, JSON)
- [ ] API rate limiting
- [ ] Automated backups

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Follow existing TypeScript conventions
- Use meaningful variable/function names
- Add comments for complex logic
- Follow SOLID CSS principles for styling
- Ensure all TypeScript code passes `tsc` compilation

---

## 📝 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2025 Contact Keeper Manager

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 📞 Support

For questions, issues, or feature requests:
- Open an issue in the repository
- Check existing issues for similar problems
- Provide detailed information including error messages and steps to reproduce

---

## 🙏 Acknowledgments

- **AG-Grid Community** for the excellent data grid component
- **TypeORM** for the robust ORM framework
- **Express.js** community for comprehensive documentation
- All contributors and users of this project

---

<div align="center">

**Built with ❤️ using TypeScript, Express, and SQLite**

</div>
