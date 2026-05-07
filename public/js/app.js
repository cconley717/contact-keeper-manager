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
    CONTACT_ID: 130,
    FIRST_NAME: 140,
    LAST_NAME: 140,
    CLIENT_ID: 130,
    CLIENT_NAME: 220,
    EMAIL_ADDRESS: 220,
    PHONE: 150,
    LAW_FIRM_ID: 150,
    LAW_FIRM_NAME: 200,
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

function parseCsvList(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function normalizeCsvList(value) {
  return parseCsvList(value).join(", ");
}

function getOutputClientIdValue() {
  const outputClientId = document.getElementById("outputClientId");
  const outputClientIdSelect = document.getElementById("outputClientIdSelect");

  if (outputClientIdSelect.style.display !== "none") {
    return outputClientIdSelect.value;
  }

  return outputClientId.value;
}

function getOutputClientNameValue() {
  const outputClientName = document.getElementById("outputClientName");
  const outputClientNameSelect = document.getElementById("outputClientNameSelect");

  if (outputClientNameSelect.style.display !== "none") {
    return outputClientNameSelect.value;
  }

  return outputClientName.value;
}

function setOutputClientFields(clientIdValue, clientNameValue) {
  const outputClientId = document.getElementById("outputClientId");
  const outputClientIdSelect = document.getElementById("outputClientIdSelect");
  const outputClientName = document.getElementById("outputClientName");
  const outputClientNameSelect = document.getElementById("outputClientNameSelect");

  const clientIds = parseCsvList(clientIdValue);
  const clientNames = parseCsvList(clientNameValue);

  outputClientIdSelect.innerHTML = "";
  outputClientNameSelect.innerHTML = "";

  if (clientIds.length > 1) {
    outputClientId.style.display = "none";
    outputClientIdSelect.style.display = "";
    outputClientId.value = "";

    const blankOption = document.createElement("option");
    blankOption.value = "";
    blankOption.textContent = "";
    outputClientIdSelect.appendChild(blankOption);

    for (let index = 0; index < clientIds.length; index++) {
      const option = document.createElement("option");
      option.value = clientIds[index];
      option.textContent = clientIds[index];
      option.dataset.clientName = clientNames[index] || "";
      option.dataset.pairIndex = String(index);
      outputClientIdSelect.appendChild(option);
    }

    outputClientIdSelect.value = "";
    outputClientName.value = "";
  } else {
    outputClientId.style.display = "";
    outputClientIdSelect.style.display = "none";
    outputClientId.value = clientIds[0] || String(clientIdValue || "");
  }

  if (clientNames.length > 1) {
    outputClientName.style.display = "none";
    outputClientNameSelect.style.display = "";
    outputClientName.value = "";

    const blankNameOption = document.createElement("option");
    blankNameOption.value = "";
    blankNameOption.textContent = "";
    outputClientNameSelect.appendChild(blankNameOption);

    for (let index = 0; index < clientNames.length; index++) {
      const name = clientNames[index];
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      option.dataset.clientId = clientIds[index] || "";
      option.dataset.pairIndex = String(index);
      outputClientNameSelect.appendChild(option);
    }

    outputClientNameSelect.value = "";
    return;
  }

  outputClientName.style.display = "";
  outputClientNameSelect.style.display = "none";
  outputClientName.value = clientNames[0] || String(clientNameValue || "");
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
      headerName: "Actions",
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
    {
      field: "contact_id",
      headerName: "Contact ID",
      width: CONFIG.COLUMN_WIDTHS.CONTACT_ID,
      filter: true,
      sortable: true,
    },
    {
      field: "first_name",
      headerName: "First Name",
      width: CONFIG.COLUMN_WIDTHS.FIRST_NAME,
      filter: true,
      sortable: true,
    },
    {
      field: "last_name",
      headerName: "Last Name",
      width: CONFIG.COLUMN_WIDTHS.LAST_NAME,
      filter: true,
      sortable: true,
    },
    {
      field: "client_id",
      headerName: "Client ID",
      width: CONFIG.COLUMN_WIDTHS.CLIENT_ID,
      filter: true,
      sortable: true,
    },
    {
      field: "client_name",
      headerName: "Client Name",
      width: CONFIG.COLUMN_WIDTHS.CLIENT_NAME,
      filter: true,
      sortable: true,
    },
    {
      field: "email_address",
      headerName: "Email Address",
      width: CONFIG.COLUMN_WIDTHS.EMAIL_ADDRESS,
      filter: true,
      sortable: true,
    },
    {
      field: "phone",
      headerName: "Phone",
      width: CONFIG.COLUMN_WIDTHS.PHONE,
      filter: true,
      sortable: true,
    },
    {
      field: "law_firm_id",
      headerName: "Law Firm ID",
      width: CONFIG.COLUMN_WIDTHS.LAW_FIRM_ID,
      filter: true,
      sortable: true,
    },
    {
      field: "law_firm_name",
      headerName: "Law Firm",
      width: CONFIG.COLUMN_WIDTHS.LAW_FIRM_NAME,
      filter: true,
      sortable: true,
    },
  ];
}

/**
 * Handle clicks on grid action buttons (Select, Update, Delete)
 */
function handleGridActionClick(params) {
  const rowData = params.data;
  const target = params.event.target;

  if (target.classList.contains("select-btn")) {
    setOutputClientFields(rowData.client_id, rowData.client_name);
    document.querySelector('.output-section input[data-field="contact_id"]').value =
      rowData.contact_id || "";
    document.querySelector('.output-section input[data-field="law_firm_id"]').value =
      rowData.law_firm_id || "";
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
  document.getElementById("newClientId").value = "";
  document.getElementById("newClientName").value = "";
  document.getElementById("newEmail").value = "";
  document.getElementById("newPhone").value = "";
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
  document.getElementById("updateClientId").value = contactData.client_id || "";
  document.getElementById("updateClientName").value = contactData.client_name || "";
  document.getElementById("updateEmail").value = contactData.email_address || "";
  document.getElementById("updatePhone").value = contactData.phone || "";
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
    client_id: normalizeCsvList(document.getElementById("updateClientId").value),
    client_name: normalizeCsvList(document.getElementById("updateClientName").value),
    email_address: normalizeCsvList(document.getElementById("updateEmail").value),
    phone: normalizeCsvList(document.getElementById("updatePhone").value),
    law_firm_id: document.getElementById("updateLawFirmId").value.trim(),
    law_firm_name: document.getElementById("updateLawFirmName").value.trim(),
  };

  // Validation
  if (!contactData.contact_id || !contactData.first_name || !contactData.last_name) {
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
    uploadBtn.textContent = "Import";
  }
}

/**
 * Handle CSV file download
 */
async function handleCsvDownload() {
  const downloadBtn = document.getElementById("downloadBtn");

  downloadBtn.disabled = true;
  downloadBtn.textContent = "Downloading...";

  try {
    const response = await fetch("/api/contacts/download", {
      method: "GET",
    });

    if (!response.ok) {
      let errorMessage = "Failed to download contacts";

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // Ignore JSON parse failures and keep default error message
      }

      showMessage("downloadMessage", errorMessage, "error");
      return;
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get("content-disposition") || "";
    const filenameMatch = /filename="?([^";]+)"?/i.exec(contentDisposition);
    const filename = filenameMatch ? filenameMatch[1] : "contacts-export.csv";

    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);

    showMessage("downloadMessage", "CSV download completed successfully", "success");
  } catch (error) {
    console.error("Download error:", error);
    showMessage("downloadMessage", "Download failed. Please try again.", "error");
  } finally {
    downloadBtn.disabled = false;
    downloadBtn.textContent = "Export";
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
    const clientId = getOutputClientIdValue();
    const clientName = getOutputClientNameValue();
    const contactId = document.querySelector(
      '.output-section input[data-field="contact_id"]'
    ).value;
    const topic = document.querySelector('.output-section select[data-field="topic"]').value;
    const firmId = document.querySelector('.output-section input[data-field="law_firm_id"]').value;
    const claimantId = document.querySelector(
      '.output-section input[data-field="claimant_id"]'
    ).value;
    const inboundOutbound = document.querySelector(
      '.output-section select[data-field="inbound_outbound"]'
    ).value;
    const outreach = document.querySelector('.output-section select[data-field="outreach"]').value;
    const commMethod = document.querySelector(
      '.output-section select[data-field="communication_method"]'
    ).value;
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
      <td style="border: 1px solid #000; padding: 4px;">Client Name</td>
      <td style="border: 1px solid #000; padding: 4px;">${clientName}</td>
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
      ["Client Name", clientName],
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

  const outputClientIdSelect = document.getElementById("outputClientIdSelect");
  const outputClientName = document.getElementById("outputClientName");
  const outputClientId = document.getElementById("outputClientId");
  const outputClientNameSelect = document.getElementById("outputClientNameSelect");
  outputClientIdSelect.addEventListener("change", function () {
    const selectedOption = this.options[this.selectedIndex];

    if (outputClientNameSelect.style.display !== "none") {
      const pairIndex = selectedOption?.dataset?.pairIndex;
      if (!pairIndex) {
        outputClientNameSelect.value = "";
        outputClientName.value = "";
        return;
      }

      const pairedNameOption = Array.from(outputClientNameSelect.options).find(
        (option) => option.dataset.pairIndex === pairIndex
      );
      outputClientNameSelect.value = pairedNameOption ? pairedNameOption.value : "";
      outputClientName.value = outputClientNameSelect.value;
      return;
    }

    outputClientName.value = selectedOption?.dataset?.clientName || "";
  });

  outputClientNameSelect.addEventListener("change", function () {
    if (outputClientIdSelect.style.display === "none") {
      return;
    }

    const selectedOption = this.options[this.selectedIndex];
    const pairIndex = selectedOption?.dataset?.pairIndex;
    if (!pairIndex) {
      outputClientIdSelect.value = "";
      outputClientId.value = "";
      return;
    }

    const pairedIdOption = Array.from(outputClientIdSelect.options).find(
      (option) => option.dataset.pairIndex === pairIndex
    );
    outputClientIdSelect.value = pairedIdOption ? pairedIdOption.value : "";
    outputClientId.value = outputClientIdSelect.value;
  });

  // Add contact button
  const addContactBtn = document.getElementById("addContactBtn");
  addContactBtn.addEventListener("click", async function () {
    const contactData = {
      contact_id: document.getElementById("newContactId").value.trim(),
      first_name: document.getElementById("newFirstName").value.trim(),
      last_name: document.getElementById("newLastName").value.trim(),
      client_id: normalizeCsvList(document.getElementById("newClientId").value),
      client_name: normalizeCsvList(document.getElementById("newClientName").value),
      email_address: normalizeCsvList(document.getElementById("newEmail").value),
      phone: normalizeCsvList(document.getElementById("newPhone").value),
      law_firm_id: document.getElementById("newLawFirmId").value.trim(),
      law_firm_name: document.getElementById("newLawFirmName").value.trim(),
    };

    // Validate required fields
    if (!contactData.contact_id || !contactData.first_name || !contactData.last_name) {
      showMessage(
        "addContactMessage",
        "Contact ID, First Name, and Last Name are required",
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

  // CSV download button
  const downloadBtn = document.getElementById("downloadBtn");
  downloadBtn.addEventListener("click", handleCsvDownload);

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
  setOutputClientFields("", "");

  // Setup event listeners
  setupEventListeners();
}

// Start the application when DOM is ready
await initializeApp();
