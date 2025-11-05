// ============================================================================
// CONTACT KEEPER MANAGER - Main Application Script
// ============================================================================

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  PAGE_SIZE: 20,
  SEARCH_DEBOUNCE_MS: 300,
  MESSAGE_TIMEOUT_MS: 3000,
  COLUMN_WIDTHS: {
    ACTIONS: 260,
    CONTACT_ID: 120,
    FIRST_NAME: 140,
    LAST_NAME: 140,
    PROGRAM: 180,
    EMAIL_ADDRESS: 220,
    PHONE: 150,
    CREATED_DATE: 130,
    FIRM_ID: 100,
    LAW_FIRM_NAME: 200,
    ACTION: 100,
  },
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let currentSearch = "";
let currentSort = null;
let totalRowCount = 0;
let currentServerPage = 0;
let searchDebounceTimer = null;
let originalContactId = null;
let gridApi = null;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Display a temporary message to the user
 */
function showMessage(elementId, message, type, timeout = CONFIG.MESSAGE_TIMEOUT_MS) {
  const element = document.getElementById(elementId);
  element.textContent = "";
  const messageDiv = document.createElement("div");
  messageDiv.className = `message message--${type}`;
  messageDiv.textContent = message;
  element.appendChild(messageDiv);
  setTimeout(() => {
    element.textContent = "";
  }, timeout);
}

/**
 * Update client dropdown display - show full text when open, ID only when closed
 */
function updateClientSelectDisplay(selectElement, isOpen) {
  for (const option of selectElement.options) {
    if (option.value && option.dataset.fullText && option.dataset.idOnly) {
      if (isOpen || !option.selected) {
        option.textContent = option.dataset.fullText;
      } else {
        option.textContent = option.dataset.idOnly;
      }
    }
  }
}

// ============================================================================
// CONTACT GRID - Setup & Display
// ============================================================================

/**
 * Create AG-Grid column definitions
 */
function createGridColumnDefs() {
  return [
    {
      field: "actions",
      headerName: "",
      width: CONFIG.COLUMN_WIDTHS.ACTIONS,
      cellRenderer: function (params) {
        return `
          <button class="select-btn">Select</button>
          <button class="update-btn">Update</button>
          <button class="delete-btn">Delete</button>
        `;
      },
      onCellClicked: handleGridActionClick,
      sortable: false,
      filter: false,
    },
    { field: "contact_id", headerName: "Contact ID", width: CONFIG.COLUMN_WIDTHS.CONTACT_ID, filter: true, sortable: true },
    { field: "first_name", headerName: "First Name", width: CONFIG.COLUMN_WIDTHS.FIRST_NAME, filter: true, sortable: true },
    { field: "last_name", headerName: "Last Name", width: CONFIG.COLUMN_WIDTHS.LAST_NAME, filter: true, sortable: true },
    { field: "program", headerName: "Program", width: CONFIG.COLUMN_WIDTHS.PROGRAM, filter: true, sortable: true },
    { field: "email_address", headerName: "Email Address", width: CONFIG.COLUMN_WIDTHS.EMAIL_ADDRESS, filter: true, sortable: true },
    { field: "phone", headerName: "Phone", width: CONFIG.COLUMN_WIDTHS.PHONE, filter: true, sortable: true },
    { field: "contact_created_date", headerName: "Created Date", width: CONFIG.COLUMN_WIDTHS.CREATED_DATE, filter: true, sortable: true },
    { field: "law_firm_id", headerName: "Firm ID", width: CONFIG.COLUMN_WIDTHS.FIRM_ID, filter: true, sortable: true },
    { field: "law_firm_name", headerName: "Law Firm", width: CONFIG.COLUMN_WIDTHS.LAW_FIRM_NAME, filter: true, sortable: true },
    { field: "action", headerName: "Action", width: CONFIG.COLUMN_WIDTHS.ACTION, filter: true, sortable: true },
  ];
}

/**
 * Handle clicks on grid action buttons (Select, Update, Delete)
 */
function handleGridActionClick(params) {
  const rowData = params.data;
  const target = params.event.target;

  if (target.classList.contains("select-btn")) {
    document.querySelector('.output-section input[data-field="contact_id"]').value = rowData.contact_id || "";
    document.querySelector('.output-section input[data-field="law_firm_id"]').value = rowData.law_firm_id || "";
  } else if (target.classList.contains("update-btn")) {
    openUpdateModal(rowData);
  } else if (target.classList.contains("delete-btn")) {
    deleteContact(rowData.contact_id);
  }
}

/**
 * Handle grid sort changes
 */
function handleGridSortChanged(params) {
  const sortModel = params.api.getColumnState().find((col) => col.sort);
  if (sortModel) {
    currentSort = { field: sortModel.colId, order: sortModel.sort };
  } else {
    currentSort = null;
  }
  currentServerPage = 0;
  loadContactData();
}

/**
 * Initialize the AG-Grid
 */
function initializeGrid() {
  const gridOptions = {
    theme: agGrid.themeQuartz,
    columnDefs: createGridColumnDefs(),
    defaultColDef: {
      resizable: true,
      sortable: true,
      filter: true,
    },
    onGridReady: () => loadContactData(),
    onSortChanged: handleGridSortChanged,
  };

  const gridDiv = document.querySelector("#dataGrid");
  gridApi = agGrid.createGrid(gridDiv, gridOptions);
}

// ============================================================================
// CONTACT CRUD OPERATIONS
// ============================================================================

/**
 * Load contact data from server with pagination and sorting
 */
async function loadContactData() {
  try {
    let url = `/api/contacts?page=${currentServerPage}&pageSize=${CONFIG.PAGE_SIZE}`;

    if (currentSort) {
      url += `&sortField=${currentSort.field}&sortOrder=${currentSort.order}`;
    }

    if (currentSearch) {
      url += `&search=${encodeURIComponent(currentSearch)}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    totalRowCount = data.totalCount;
    gridApi.setGridOption("rowData", data.data);
    gridApi.setGridOption("pagination", false);

    updatePaginationDisplay();
  } catch (error) {
    console.error("Error loading contact data:", error);
  }
}

/**
 * Add a new contact
 */
async function addContact(contactData) {
  try {
    const response = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contactData),
    });

    const data = await response.json();

    if (response.ok) {
      showMessage("addContactMessage", data.message, "success");
      clearContactForm();
      currentServerPage = 0;
      loadContactData();
    } else {
      showMessage("addContactMessage", data.message || "Failed to add contact", "error");
    }
  } catch (error) {
    console.error("Error adding contact:", error);
    showMessage("addContactMessage", "Failed to add contact. Please try again.", "error");
  }
}

/**
 * Update an existing contact
 */
async function updateContact(contactData) {
  try {
    const response = await fetch(`/api/contacts/${originalContactId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contactData),
    });

    const data = await response.json();

    if (response.ok) {
      closeUpdateModal();
      loadContactData();
    } else {
      alert(data.message || "Failed to update contact");
    }
  } catch (error) {
    console.error("Error updating contact:", error);
    alert("Failed to update contact. Please try again.");
  }
}

/**
 * Delete a contact
 */
async function deleteContact(contactId) {
  if (!confirm(`Are you sure you want to delete contact ID ${contactId}?`)) {
    return;
  }

  try {
    const response = await fetch(`/api/contacts/${contactId}`, { method: "DELETE" });
    const data = await response.json();

    if (response.ok) {
      loadContactData();
    } else {
      alert(data.message || "Failed to delete contact");
    }
  } catch (error) {
    console.error("Error deleting contact:", error);
    alert("Failed to delete contact. Please try again.");
  }
}

/**
 * Clear the contact form fields
 */
function clearContactForm() {
  document.getElementById("newContactId").value = "";
  document.getElementById("newFirstName").value = "";
  document.getElementById("newLastName").value = "";
  document.getElementById("newProgram").value = "";
  document.getElementById("newEmail").value = "";
  document.getElementById("newPhone").value = "";
  document.getElementById("newCreatedDate").value = "";
  document.getElementById("newAction").value = "";
  document.getElementById("newLawFirmId").value = "";
  document.getElementById("newLawFirmName").value = "";
}

// ============================================================================
// CONTACT MODAL OPERATIONS
// ============================================================================

/**
 * Open the update modal with contact data
 */
function openUpdateModal(contactData) {
  originalContactId = contactData.contact_id;

  document.getElementById("updateContactId").value = contactData.contact_id || "";
  document.getElementById("updateFirstName").value = contactData.first_name || "";
  document.getElementById("updateLastName").value = contactData.last_name || "";
  document.getElementById("updateProgram").value = contactData.program || "";
  document.getElementById("updateEmail").value = contactData.email_address || "";
  document.getElementById("updatePhone").value = contactData.phone || "";
  document.getElementById("updateCreatedDate").value = contactData.contact_created_date || "";
  document.getElementById("updateAction").value = contactData.action || "";
  document.getElementById("updateLawFirmId").value = contactData.law_firm_id || "";
  document.getElementById("updateLawFirmName").value = contactData.law_firm_name || "";

  document.getElementById("updateModal").classList.add("modal--visible");
}

/**
 * Close the update modal
 */
function closeUpdateModal() {
  document.getElementById("updateModal").classList.remove("modal--visible");
  originalContactId = null;
}

/**
 * Save updated contact data
 */
async function saveUpdatedContact() {
  const contactData = {
    contact_id: document.getElementById("updateContactId").value.trim(),
    first_name: document.getElementById("updateFirstName").value.trim(),
    last_name: document.getElementById("updateLastName").value.trim(),
    program: document.getElementById("updateProgram").value.trim(),
    email_address: document.getElementById("updateEmail").value.trim(),
    phone: document.getElementById("updatePhone").value.trim(),
    contact_created_date: document.getElementById("updateCreatedDate").value.trim(),
    action: document.getElementById("updateAction").value.trim(),
    law_firm_id: document.getElementById("updateLawFirmId").value.trim(),
    law_firm_name: document.getElementById("updateLawFirmName").value.trim(),
  };

  // Validation
  if (
    !contactData.contact_id ||
    !contactData.first_name ||
    !contactData.last_name ||
    !contactData.email_address ||
    !contactData.contact_created_date ||
    !contactData.law_firm_id ||
    !contactData.law_firm_name
  ) {
    alert("Please fill in all required fields (marked with *)");
    return;
  }

  await updateContact(contactData);
}

// Make modal functions globally available
globalThis.openUpdateModal = openUpdateModal;
globalThis.closeUpdateModal = closeUpdateModal;
globalThis.saveUpdatedContact = saveUpdatedContact;

// ============================================================================
// CLIENT MANAGEMENT
// ============================================================================

/**
 * Load clients from server and populate UI
 */
async function loadClients() {
  try {
    const response = await fetch("/api/clients");
    const result = await response.json();
    const clients = result.data || result;

    populateClientDropdown(clients);
    populateClientTable(clients);
  } catch (error) {
    console.error("Error loading clients:", error);
  }
}

/**
 * Populate the output table client dropdown
 */
function populateClientDropdown(clients) {
  const outputSelect = document.getElementById("outputClientIdSelect");
  outputSelect.innerHTML = "";

  // Add empty default option
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "";
  outputSelect.appendChild(emptyOption);

  // Add client options
  for (const client of clients) {
    const option = document.createElement("option");
    option.value = client.client_id;
    const fullText = `${client.client_id} - ${client.client_name}`;
    option.textContent = fullText;
    option.dataset.fullText = fullText;
    option.dataset.idOnly = client.client_id;
    outputSelect.appendChild(option);
  }
}

/**
 * Populate the client management table
 */
function populateClientTable(clients) {
  const clientList = document.getElementById("clientIdList");
  clientList.textContent = "";

  if (clients.length === 0) {
    const noClientsMsg = document.createElement("p");
    noClientsMsg.className = "no-clients-message";
    noClientsMsg.textContent = "No clients yet. Add one above!";
    clientList.appendChild(noClientsMsg);
    return;
  }

  // Create table
  const table = document.createElement("table");
  table.className = "client-table";

  // Create header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  
  for (const headerText of ["Client ID", "Client Name", "Actions"]) {
    const th = document.createElement("th");
    th.textContent = headerText;
    headerRow.appendChild(th);
  }
  
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create body
  const tbody = document.createElement("tbody");
  
  for (const client of clients) {
    const row = document.createElement("tr");

    const idCell = document.createElement("td");
    idCell.textContent = client.client_id;

    const nameCell = document.createElement("td");
    nameCell.textContent = client.client_name;

    const actionsCell = document.createElement("td");
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-danger btn-small";
    deleteBtn.textContent = "Delete";
    deleteBtn.onclick = () => deleteClient(client.id, client.client_id);
    actionsCell.appendChild(deleteBtn);

    row.appendChild(idCell);
    row.appendChild(nameCell);
    row.appendChild(actionsCell);
    tbody.appendChild(row);
  }

  table.appendChild(tbody);
  clientList.appendChild(table);
}

/**
 * Add a new client
 */
async function addClient(clientId, clientName) {
  try {
    const response = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_name: clientName }),
    });

    const data = await response.json();

    if (response.ok) {
      showMessage("addClientMessage", data.message, "success");
      document.getElementById("newClientIdInput").value = "";
      document.getElementById("newClientNameInput").value = "";

      // Add to dropdown immediately
      const newClient = data.data;
      addClientToDropdown(newClient);

      // Refresh the table
      await loadClients();
    } else {
      showMessage("addClientMessage", data.message || "Failed to add client", "error");
    }
  } catch (error) {
    console.error("Error adding client:", error);
    showMessage("addClientMessage", "Failed to add client. Please try again.", "error");
  }
}

/**
 * Add a client to the dropdown (immediate feedback)
 */
function addClientToDropdown(client) {
  const outputSelect = document.getElementById("outputClientIdSelect");
  const option = document.createElement("option");
  option.value = client.client_id;
  const fullText = `${client.client_id} - ${client.client_name}`;
  option.textContent = fullText;
  option.dataset.fullText = fullText;
  option.dataset.idOnly = client.client_id;

  // Insert in sorted position
  let inserted = false;
  for (let i = 1; i < outputSelect.options.length; i++) {
    if (Number.parseInt(outputSelect.options[i].value) > client.client_id) {
      outputSelect.insertBefore(option, outputSelect.options[i]);
      inserted = true;
      break;
    }
  }
  if (!inserted) {
    outputSelect.appendChild(option);
  }
}

/**
 * Delete a client
 */
async function deleteClient(id, clientId) {
  if (!confirm(`Delete client ID ${clientId}?`)) {
    return;
  }

  try {
    const response = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    const data = await response.json();

    if (response.ok) {
      showMessage("addClientMessage", data.message, "success");
      await loadClients();
    } else {
      showMessage("addClientMessage", data.message || "Failed to delete client ID", "error");
    }
  } catch (error) {
    console.error("Error deleting client:", error);
    showMessage("addClientMessage", "Failed to delete client ID. Please try again.", "error");
  }
}

// ============================================================================
// SEARCH & PAGINATION
// ============================================================================

/**
 * Perform a search
 */
function performSearch() {
  currentSearch = document.getElementById("searchInput").value.trim();
  currentServerPage = 0;
  loadContactData();
}

/**
 * Clear the search
 */
function clearSearch() {
  document.getElementById("searchInput").value = "";
  currentSearch = "";
  currentServerPage = 0;
  loadContactData();
}

/**
 * Update pagination display
 */
function updatePaginationDisplay() {
  const totalPages = Math.ceil(totalRowCount / CONFIG.PAGE_SIZE);
  const startRow = currentServerPage * CONFIG.PAGE_SIZE + 1;
  const endRow = Math.min((currentServerPage + 1) * CONFIG.PAGE_SIZE, totalRowCount);

  const paginationHtml = `
    <div class="pagination-container">
      <div class="pagination-info">Showing ${startRow}-${endRow} of ${totalRowCount}</div>
      <div class="pagination-controls">
        <button class="btn-primary" onclick="goToPage(0)" ${currentServerPage === 0 ? "disabled" : ""}>First</button>
        <button class="btn-primary" onclick="goToPage(${currentServerPage - 1})" ${currentServerPage === 0 ? "disabled" : ""}>Previous</button>
        <span>Page ${currentServerPage + 1} of ${totalPages}</span>
        <button class="btn-primary" onclick="goToPage(${currentServerPage + 1})" ${currentServerPage >= totalPages - 1 ? "disabled" : ""}>Next</button>
        <button class="btn-primary" onclick="goToPage(${totalPages - 1})" ${currentServerPage >= totalPages - 1 ? "disabled" : ""}>Last</button>
      </div>
    </div>
  `;

  let paginationDiv = document.getElementById("customPagination");
  if (!paginationDiv) {
    paginationDiv = document.createElement("div");
    paginationDiv.id = "customPagination";
    document.querySelector(".grid-section").appendChild(paginationDiv);
  }
  paginationDiv.innerHTML = paginationHtml;
}

/**
 * Navigate to a specific page
 */
function goToPage(page) {
  currentServerPage = page;
  loadContactData();
}

// Make pagination function globally available
globalThis.goToPage = goToPage;

// ============================================================================
// CSV UPLOAD
// ============================================================================

/**
 * Handle CSV file upload
 */
async function handleCsvUpload(file) {
  if (!file) {
    showMessage("uploadMessage", "Please select a CSV file", "error");
    return;
  }

  if (!file.name.endsWith(".csv")) {
    showMessage("uploadMessage", "Please select a valid CSV file", "error");
    return;
  }

  const uploadBtn = document.getElementById("uploadBtn");
  const formData = new FormData();
  formData.append("file", file);

  uploadBtn.disabled = true;
  uploadBtn.textContent = "Uploading...";

  try {
    const response = await fetch("/api/contacts/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (response.ok) {
      showMessage("uploadMessage", data.message, "success");
      document.getElementById("csvFile").value = "";
      currentServerPage = 0;
      loadContactData();
    } else {
      showMessage("uploadMessage", data.message || "Upload failed", "error");
    }
  } catch (error) {
    console.error("Upload error:", error);
    showMessage("uploadMessage", "Upload failed. Please try again.", "error");
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = "Upload & Import";
  }
}

// ============================================================================
// CLIPBOARD OPERATIONS
// ============================================================================

/**
 * Copy output table to clipboard
 */
async function copyOutputToClipboard() {
  try {
    const clientId = document.querySelector('.output-section select[data-field="client_id"]').value;
    const contactId = document.querySelector('.output-section input[data-field="contact_id"]').value;
    const topic = document.querySelector('.output-section select[data-field="topic"]').value;
    const firmId = document.querySelector('.output-section input[data-field="law_firm_id"]').value;
    const claimantId = document.querySelector('.output-section input[data-field="claimant_id"]').value;
    const inboundOutbound = document.querySelector('.output-section select[data-field="inbound_outbound"]').value;
    const outreach = document.querySelector('.output-section select[data-field="outreach"]').value;
    const commMethod = document.querySelector('.output-section select[data-field="communication_method"]').value;
    const message = document.querySelector('.output-section input[data-field="message"]').value;

    // Create HTML table
    const htmlTable = `
<table style="border: 1px solid #000; border-collapse: collapse;">
  <tbody>
    <tr>
      <td style="border: 1px solid #000; padding: 4px;">Client ID</td>
      <td style="border: 1px solid #000; padding: 4px;">${clientId}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #000; padding: 4px;">Contact ID</td>
      <td style="border: 1px solid #000; padding: 4px;">${contactId}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #000; padding: 4px;">Topic</td>
      <td style="border: 1px solid #000; padding: 4px;">${topic}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #000; padding: 4px;">Firm ID(s)</td>
      <td style="border: 1px solid #000; padding: 4px;">${firmId}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #000; padding: 4px;">Claimant ID(s)</td>
      <td style="border: 1px solid #000; padding: 4px;">${claimantId}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #000; padding: 4px;">Inbound/Outbound</td>
      <td style="border: 1px solid #000; padding: 4px;">${inboundOutbound}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #000; padding: 4px;">Outreach</td>
      <td style="border: 1px solid #000; padding: 4px;">${outreach}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #000; padding: 4px;">Communication Method</td>
      <td style="border: 1px solid #000; padding: 4px;">${commMethod}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #000; padding: 4px;">Start of Message:</td>
      <td style="border: 1px solid #000; padding: 4px;">${message}</td>
    </tr>
  </tbody>
</table>`;

    // Create plain text version
    const plainText = [
      ["Client ID", clientId],
      ["Contact ID", contactId],
      ["Topic", topic],
      ["Firm ID(s)", firmId],
      ["Claimant ID(s)", claimantId],
      ["Inbound/Outbound", inboundOutbound],
      ["Outreach", outreach],
      ["Communication Method", commMethod],
      ["Start of Message:", message],
    ]
      .map((row) => row.join("\t"))
      .join("\n");

    // Copy to clipboard
    const clipboardItem = new ClipboardItem({
      "text/html": new Blob([htmlTable], { type: "text/html" }),
      "text/plain": new Blob([plainText], { type: "text/plain" }),
    });

    await navigator.clipboard.write([clipboardItem]);

    // Visual feedback
    const copyBtn = document.getElementById("copyOutputBtn");
    const originalText = copyBtn.textContent;
    copyBtn.textContent = "✓ Copied!";
    copyBtn.classList.add("btn-info--copied");

    setTimeout(() => {
      copyBtn.textContent = originalText;
      copyBtn.classList.remove("btn-info--copied");
    }, CONFIG.MESSAGE_TIMEOUT_MS - 1000);
  } catch (error) {
    console.error("Error copying to clipboard:", error);
    alert("Failed to copy to clipboard. Please try again.");
  }
}

// ============================================================================
// EVENT HANDLERS & UI INTERACTIONS
// ============================================================================

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Search functionality
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");
  const clearSearchBtn = document.getElementById("clearSearchBtn");

  searchBtn.addEventListener("click", performSearch);
  clearSearchBtn.addEventListener("click", clearSearch);

  // Debounced search on typing
  searchInput.addEventListener("input", function () {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    searchDebounceTimer = setTimeout(performSearch, CONFIG.SEARCH_DEBOUNCE_MS);
  });

  // Enter key to search immediately
  searchInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
      }
      performSearch();
    }
  });

  // Collapsible form toggles
  setupCollapsibleToggle("addContactToggle", "addContactForm", "addContactIcon");
  setupCollapsibleToggle("addClientToggle", "addClientForm", "addClientIcon");

  // Client dropdown display logic
  const outputClientIdSelect = document.getElementById("outputClientIdSelect");
  outputClientIdSelect.addEventListener("click", function () {
    const isOpen = this.classList.contains("select-open");
    this.classList.toggle("select-open");
    updateClientSelectDisplay(this, !isOpen);
  });

  outputClientIdSelect.addEventListener("blur", function () {
    if (this.classList.contains("select-open")) {
      this.classList.remove("select-open");
      updateClientSelectDisplay(this, false);
    }
  });

  // Add client button
  const addClientIdBtn = document.getElementById("addClientIdBtn");
  addClientIdBtn.addEventListener("click", async function () {
    const clientId = document.getElementById("newClientIdInput").value.trim();
    const clientName = document.getElementById("newClientNameInput").value.trim();

    if (!clientId) {
      showMessage("addClientMessage", "Please enter a client ID", "error");
      return;
    }

    if (!clientName) {
      showMessage("addClientMessage", "Please enter a client name", "error");
      return;
    }

    addClientIdBtn.disabled = true;
    addClientIdBtn.textContent = "Adding...";

    await addClient(clientId, clientName);

    addClientIdBtn.disabled = false;
    addClientIdBtn.textContent = "Add Client";
  });

  // Add contact button
  const addContactBtn = document.getElementById("addContactBtn");
  addContactBtn.addEventListener("click", async function () {
    const contactData = {
      contact_id: document.getElementById("newContactId").value.trim(),
      first_name: document.getElementById("newFirstName").value.trim(),
      last_name: document.getElementById("newLastName").value.trim(),
      program: document.getElementById("newProgram").value.trim(),
      email_address: document.getElementById("newEmail").value.trim(),
      phone: document.getElementById("newPhone").value.trim(),
      contact_created_date: document.getElementById("newCreatedDate").value.trim(),
      action: document.getElementById("newAction").value.trim(),
      law_firm_id: document.getElementById("newLawFirmId").value.trim(),
      law_firm_name: document.getElementById("newLawFirmName").value.trim(),
    };

    // Validate required fields
    if (
      !contactData.contact_id ||
      !contactData.first_name ||
      !contactData.last_name ||
      !contactData.email_address ||
      !contactData.contact_created_date ||
      !contactData.law_firm_id ||
      !contactData.law_firm_name
    ) {
      showMessage(
        "addContactMessage",
        "Contact ID, First Name, Last Name, Email Address, Contact Created Date, Law Firm ID, and Law Firm Name are required",
        "error"
      );
      return;
    }

    addContactBtn.disabled = true;
    addContactBtn.textContent = "Adding...";

    await addContact(contactData);

    addContactBtn.disabled = false;
    addContactBtn.textContent = "Add Contact";
  });

  // CSV upload button
  const uploadBtn = document.getElementById("uploadBtn");
  uploadBtn.addEventListener("click", async function () {
    const file = document.getElementById("csvFile").files[0];
    await handleCsvUpload(file);
  });

  // Copy output button
  const copyOutputBtn = document.getElementById("copyOutputBtn");
  copyOutputBtn.addEventListener("click", copyOutputToClipboard);

  // Modal close on outside click
  document.getElementById("updateModal").addEventListener("click", function (event) {
    if (event.target === event.currentTarget) {
      closeUpdateModal();
    }
  });
}

/**
 * Setup a collapsible toggle
 */
function setupCollapsibleToggle(toggleId, formId, iconId) {
  const toggle = document.getElementById(toggleId);
  const form = document.getElementById(formId);
  const icon = document.getElementById(iconId);

  toggle.addEventListener("click", function () {
    form.classList.toggle("collapsible-content--visible");
    icon.textContent = form.classList.contains("collapsible-content--visible") ? "▼" : "▶";
  });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the application
 */
async function initializeApp() {
  // Setup grid
  initializeGrid();

  // Load initial data
  await loadClients();

  // Setup event listeners
  setupEventListeners();
}

// Start the application when DOM is ready
await initializeApp();
