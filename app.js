// Global variables
let workbook = null;
let aggregatedData = [];
let currentFileBuffer = null;
let currentFilename = null;
let currentSheetNames = [];
let fileDetails = [];
let quintileMap = new Map();
let currentSortColumn = null;
let currentSortDirection = null;
let currentSearchTerm = '';
let currentQuintileFilter = 'all';

// Column filter state
let columnFilters = {
    keyword: new Set(),
    properties: new Set(),
    campaigns: new Set(),
    conversions: new Set(),
    cost: new Set()
};
let activeFilters = {
    keyword: new Set(),
    properties: new Set(),
    campaigns: new Set(),
    conversions: new Set(),
    cost: new Set()
};
let currentOpenFilter = null;

// Configuration
const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

// DOM elements
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const sheetsSection = document.getElementById('sheetsSection');
const sheetsList = document.getElementById('sheetsList');
const processBtn = document.getElementById('processBtn');
const loadingSection = document.getElementById('loadingSection');
const resultsSection = document.getElementById('resultsSection');
const errorSection = document.getElementById('errorSection');
const errorText = document.getElementById('errorText');
const exportBtn = document.getElementById('exportBtn');
const resetBtn = document.getElementById('resetBtn');
const dismissError = document.getElementById('dismissError');
const saveBtn = document.getElementById('saveBtn');
const savedFilesSection = document.getElementById('savedFilesSection');
const savedFilesList = document.getElementById('savedFilesList');
const refreshFilesBtn = document.getElementById('refreshFilesBtn');
const sidebar = document.getElementById('sidebar');
const toggleSidebarBtn = document.getElementById('toggleSidebar');
const closeSidebarBtn = document.getElementById('closeSidebar');
const sidebarContent = document.getElementById('sidebarContent');
const sidebarCount = document.getElementById('sidebarCount');
const keywordSearch = document.getElementById('keywordSearch');
const clearSearchBtn = document.getElementById('clearSearch');
const quintileFilter = document.getElementById('quintileFilter');
const resultsCount = document.getElementById('resultsCount');

// Event Listeners
fileInput.addEventListener('change', handleFileSelect);
processBtn.addEventListener('click', processData);
exportBtn.addEventListener('click', exportToExcel);
resetBtn.addEventListener('click', resetApp);
saveBtn.addEventListener('click', saveToDatabase);
refreshFilesBtn.addEventListener('click', loadSavedFiles);
toggleSidebarBtn.addEventListener('click', toggleSidebar);
closeSidebarBtn.addEventListener('click', closeSidebar);
dismissError.addEventListener('click', () => {
    errorSection.style.display = 'none';
});

// Search and Filter Event Listeners
if (keywordSearch) {
    keywordSearch.addEventListener('input', handleSearch);
}
if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', clearSearch);
}
if (quintileFilter) {
    quintileFilter.addEventListener('change', handleFilter);
}

// Load saved files on page load
window.addEventListener('DOMContentLoaded', () => {
    loadSavedFiles();
    loadSidebarFiles();
});

// Drag and drop functionality
const uploadBox = document.querySelector('.upload-box');

uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.style.borderColor = '#764ba2';
    uploadBox.style.background = '#f0f2ff';
});

uploadBox.addEventListener('dragleave', () => {
    uploadBox.style.borderColor = '#667eea';
    uploadBox.style.background = '#f8f9ff';
});

uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.style.borderColor = '#667eea';
    uploadBox.style.background = '#f8f9ff';

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        fileInput.files = files;
        handleFileSelect({ target: { files } });
    }
});

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];

    if (!file) return;

    // Validate file type
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop().toLowerCase();

    if (!['xlsx', 'xls'].includes(fileExtension)) {
        showError('Please upload a valid Excel file (.xlsx or .xls)');
        return;
    }

    // Display file info
    fileInfo.textContent = `Selected: ${fileName} (${formatFileSize(file.size)})`;
    fileInfo.classList.add('show');

    // Read the Excel file
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            workbook = XLSX.read(data, { type: 'array' });

            // Store file buffer and filename for later saving
            currentFileBuffer = e.target.result;
            currentFilename = fileName;
            currentSheetNames = workbook.SheetNames;

            // Display sheet names
            displaySheets(workbook.SheetNames);
        } catch (error) {
            showError('Error reading Excel file: ' + error.message);
        }
    };

    reader.onerror = function() {
        showError('Error reading file. Please try again.');
    };

    reader.readAsArrayBuffer(file);
}

// Display available sheets
function displaySheets(sheetNames) {
    sheetsList.innerHTML = '';

    sheetNames.forEach(name => {
        const tag = document.createElement('div');
        tag.className = 'sheet-tag';
        tag.textContent = name;
        sheetsList.appendChild(tag);
    });

    sheetsSection.style.display = 'block';
}

// Process data from all sheets
function processData() {
    if (!workbook) {
        showError('No workbook loaded');
        return;
    }

    // Show loading
    sheetsSection.style.display = 'none';
    loadingSection.style.display = 'block';
    resultsSection.style.display = 'none';
    errorSection.style.display = 'none';

    // Simulate processing delay for better UX
    setTimeout(() => {
        try {
            const keywordMap = new Map();
            let sheetsProcessed = 0;
            fileDetails = [];

            // Process each sheet
            workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                // Process rows
                jsonData.forEach(row => {
                    // Find column values (case-insensitive)
                    const keyword = findColumnValue(row, ['keyword', 'Keyword', 'KEYWORD']);
                    const campaign = findColumnValue(row, ['campaign', 'Campaign', 'CAMPAIGN']);
                    const adGroup = findColumnValue(row, ['ad group', 'adgroup', 'Ad Group', 'AdGroup', 'AD GROUP', 'ADGROUP']);
                    const conversions = parseNumber(findColumnValue(row, ['conversions', 'Conversions', 'CONVERSIONS']));
                    const cost = parseNumber(findColumnValue(row, ['cost', 'Cost', 'COST']));

                    if (keyword) {
                        const normalizedKeyword = keyword.toString().trim();

                        // Store detail for database
                        fileDetails.push({
                            keyword: normalizedKeyword,
                            property: sheetName,
                            campaign: campaign ? campaign.toString().trim() : 'N/A',
                            adGroup: adGroup ? adGroup.toString().trim() : 'N/A',
                            conversions: conversions,
                            cost: cost
                        });

                        if (keywordMap.has(normalizedKeyword)) {
                            const existing = keywordMap.get(normalizedKeyword);
                            existing.conversions += conversions;
                            existing.cost += cost;

                            // Track unique properties and campaigns
                            existing.properties.add(sheetName);
                            existing.campaigns.add(campaign ? campaign.toString().trim() : 'N/A');

                            // Check if this property/campaign/adGroup combination already exists in breakdown
                            const campaignStr = campaign ? campaign.toString().trim() : 'N/A';
                            const adGroupStr = adGroup ? adGroup.toString().trim() : 'N/A';

                            const existingBreakdown = existing.breakdown.find(b =>
                                b.property === sheetName &&
                                b.campaign === campaignStr &&
                                b.adGroup === adGroupStr
                            );

                            if (existingBreakdown) {
                                // Merge with existing breakdown entry
                                existingBreakdown.conversions += conversions;
                                existingBreakdown.cost += cost;
                            } else {
                                // Add new breakdown entry
                                existing.breakdown.push({
                                    property: sheetName,
                                    campaign: campaignStr,
                                    adGroup: adGroupStr,
                                    conversions: conversions,
                                    cost: cost
                                });
                            }
                        } else {
                            keywordMap.set(normalizedKeyword, {
                                keyword: normalizedKeyword,
                                conversions: conversions,
                                cost: cost,
                                properties: new Set([sheetName]),
                                campaigns: new Set([campaign ? campaign.toString().trim() : 'N/A']),
                                breakdown: [{
                                    property: sheetName,
                                    campaign: campaign ? campaign.toString().trim() : 'N/A',
                                    adGroup: adGroup ? adGroup.toString().trim() : 'N/A',
                                    conversions: conversions,
                                    cost: cost
                                }]
                            });
                        }
                    }
                });

                sheetsProcessed++;
            });

            // Convert map to array, convert Sets to counts, and sort by conversions (descending)
            aggregatedData = Array.from(keywordMap.values()).map(item => ({
                ...item,
                propertyCount: item.properties.size,
                campaignCount: item.campaigns.size
            })).sort((a, b) => b.conversions - a.conversions);

            // Display results
            displayResults(aggregatedData, sheetsProcessed);

        } catch (error) {
            loadingSection.style.display = 'none';
            showError('Error processing data: ' + error.message);
        }
    }, 500);
}

// Find column value with flexible column names
function findColumnValue(row, possibleNames) {
    for (const key in row) {
        if (possibleNames.some(name => key.toLowerCase().includes(name.toLowerCase()))) {
            return row[key];
        }
    }
    return null;
}

// Parse number from various formats
function parseNumber(value) {
    if (value === null || value === undefined || value === '') return 0;

    // Remove currency symbols and commas
    const cleaned = value.toString().replace(/[$,]/g, '');
    const num = parseFloat(cleaned);

    return isNaN(num) ? 0 : num;
}

// Calculate quintile for Cost Per Acquisition (CPA)
function calculateQuintiles(data) {
    const quintileMap = new Map();

    // Separate keywords with conversions from those without
    const withConversions = data.filter(item => item.conversions > 0);
    const withoutConversions = data.filter(item => item.conversions === 0);

    // Step 1: Assign Quintile 5 (Worst) to all keywords with ZERO conversions
    withoutConversions.forEach(item => {
        quintileMap.set(item.keyword, 5);
    });

    // Step 2: For keywords with conversions, calculate CPA and divide into 4 quintiles (1-4)
    if (withConversions.length > 0) {
        // Calculate CPA for each keyword with conversions
        const dataWithCPA = withConversions.map(item => ({
            ...item,
            cpa: item.cost / item.conversions
        }));

        // Sort by CPA (ascending - lower CPA is better)
        const sortedByCPA = dataWithCPA.sort((a, b) => a.cpa - b.cpa);

        // Divide into 4 equal groups (quartiles)
        const quartileSize = sortedByCPA.length / 4;

        sortedByCPA.forEach((item, index) => {
            // Assign quintile 1-4 based on CPA quartile
            // Quintile 1 = Best (lowest 25% CPA)
            // Quintile 2 = Good (next 25%)
            // Quintile 3 = Average (next 25%)
            // Quintile 4 = Below Average (highest 25% CPA among those with conversions)
            const quintile = Math.min(Math.floor(index / quartileSize) + 1, 4);
            quintileMap.set(item.keyword, quintile);
        });
    }

    return quintileMap;
}

// Get quintile class for styling
function getQuintileClass(quintile) {
    const quintileClasses = {
        1: 'quintile-1', // Best - Dark Green
        2: 'quintile-2', // Light Green
        3: 'quintile-3', // White
        4: 'quintile-4', // Light Red
        5: 'quintile-5'  // Worst - Dark Red
    };
    return quintileClasses[quintile] || 'quintile-3';
}

// Display results in table
function displayResults(data, sheetsProcessed) {
    loadingSection.style.display = 'none';
    resultsSection.style.display = 'block';

    // Calculate totals
    const totalConversions = data.reduce((sum, item) => sum + item.conversions, 0);
    const totalCost = data.reduce((sum, item) => sum + item.cost, 0);

    // Update stats
    document.getElementById('totalKeywords').textContent = data.length.toLocaleString();
    document.getElementById('totalConversions').textContent = totalConversions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('totalCost').textContent = '$' + totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('sheetsProcessed').textContent = sheetsProcessed;

    // Calculate quintiles based on CPA (Cost Per Acquisition) and store globally
    quintileMap = calculateQuintiles(data);

    // Populate table
    const tbody = document.getElementById('resultsBody');
    tbody.innerHTML = '';

    data.forEach((item, index) => {
        // Get quintile for this keyword
        const quintile = quintileMap.get(item.keyword);
        const quintileClass = getQuintileClass(quintile);

        // Main row
        const row = tbody.insertRow();
        row.className = `keyword-row ${quintileClass}`;
        row.dataset.index = index;

        const keywordCell = row.insertCell(0);
        keywordCell.className = 'expandable-cell';
        keywordCell.innerHTML = `
            <span class="expand-icon">▶</span>
            <span class="keyword-text">${item.keyword}</span>
        `;

        const propertiesCell = row.insertCell(1);
        propertiesCell.textContent = item.propertyCount || 0;
        propertiesCell.style.textAlign = 'center';

        const campaignsCell = row.insertCell(2);
        campaignsCell.textContent = item.campaignCount || 0;
        campaignsCell.style.textAlign = 'center';

        const conversionsCell = row.insertCell(3);
        conversionsCell.textContent = item.conversions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const costCell = row.insertCell(4);
        costCell.textContent = '$' + item.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // Make row clickable
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => toggleBreakdown(index, row));

        // Create breakdown row (initially hidden)
        const breakdownRow = tbody.insertRow();
        breakdownRow.className = 'breakdown-row';
        breakdownRow.dataset.index = index;
        breakdownRow.style.display = 'none';

        const breakdownCell = breakdownRow.insertCell(0);
        breakdownCell.colSpan = 5;
        breakdownCell.innerHTML = createBreakdownTable(item.breakdown);
    });

    // Update results count
    updateResultsCount(data.length);

    // Hide quintile stats initially (shows when filter is applied)
    const quintileStatsDiv = document.getElementById('quintileStats');
    if (quintileStatsDiv) {
        quintileStatsDiv.style.display = 'none';
    }

    // Initialize sorting and filters
    initializeSorting();
    initializeColumnFilters();
}

// Initialize table sorting
function initializeSorting() {
    const sortableHeaders = document.querySelectorAll('th.sortable');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', (e) => {
            // Don't sort if clicking on filter icon or sort icon
            if (e.target.closest('.filter-icon') || e.target.closest('.filter-dropdown')) {
                return;
            }
            const column = header.dataset.column;
            handleSort(column);
        });
    });
}

// Handle sorting
function handleSort(column) {
    // Toggle sort direction
    if (currentSortColumn === column) {
        if (currentSortDirection === 'asc') {
            currentSortDirection = 'desc';
        } else if (currentSortDirection === 'desc') {
            currentSortColumn = null;
            currentSortDirection = null;
        } else {
            currentSortDirection = 'asc';
        }
    } else {
        currentSortColumn = column;
        currentSortDirection = 'asc';
    }

    // Update sort icons
    updateSortIcons();

    // Re-render table with sorted data
    renderFilteredData();
}

// Update sort icons in table headers
function updateSortIcons() {
    const sortableHeaders = document.querySelectorAll('th.sortable');
    sortableHeaders.forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
        if (header.dataset.column === currentSortColumn) {
            if (currentSortDirection === 'asc') {
                header.classList.add('sort-asc');
            } else if (currentSortDirection === 'desc') {
                header.classList.add('sort-desc');
            }
        }
    });
}

// Handle search input
function handleSearch(event) {
    currentSearchTerm = event.target.value.toLowerCase().trim();

    // Show/hide clear button
    if (clearSearchBtn) {
        clearSearchBtn.style.display = currentSearchTerm ? 'flex' : 'none';
    }

    renderFilteredData();
}

// Clear search
function clearSearch() {
    if (keywordSearch) {
        keywordSearch.value = '';
        currentSearchTerm = '';
    }
    if (clearSearchBtn) {
        clearSearchBtn.style.display = 'none';
    }
    renderFilteredData();
}

// Handle filter change
function handleFilter(event) {
    currentQuintileFilter = event.target.value;
    renderFilteredData();
}

// Render filtered and sorted data
function renderFilteredData() {
    // Start with all data
    let filteredData = [...aggregatedData];

    // Apply search filter
    if (currentSearchTerm) {
        filteredData = filteredData.filter(item =>
            item.keyword.toLowerCase().includes(currentSearchTerm)
        );
    }

    // Apply quintile filter
    if (currentQuintileFilter !== 'all') {
        filteredData = filteredData.filter(item => {
            const quintile = quintileMap.get(item.keyword);
            return quintile === parseInt(currentQuintileFilter);
        });
    }

    // Apply column filters
    filteredData = filteredData.filter(item => {
        // Filter by keyword
        if (activeFilters.keyword.size > 0) {
            if (!activeFilters.keyword.has(item.keyword)) {
                return false;
            }
        }

        // Filter by properties
        if (activeFilters.properties.size > 0) {
            const propCount = (item.propertyCount || 0).toString();
            if (!activeFilters.properties.has(propCount)) {
                return false;
            }
        }

        // Filter by campaigns
        if (activeFilters.campaigns.size > 0) {
            const campCount = (item.campaignCount || 0).toString();
            if (!activeFilters.campaigns.has(campCount)) {
                return false;
            }
        }

        // Filter by conversions
        if (activeFilters.conversions.size > 0) {
            const convValue = item.conversions.toFixed(2);
            if (!activeFilters.conversions.has(convValue)) {
                return false;
            }
        }

        // Filter by cost
        if (activeFilters.cost.size > 0) {
            const costValue = item.cost.toFixed(2);
            if (!activeFilters.cost.has(costValue)) {
                return false;
            }
        }

        return true;
    });

    // Apply sorting
    if (currentSortColumn && currentSortDirection) {
        filteredData.sort((a, b) => {
            let aVal, bVal;

            if (currentSortColumn === 'keyword') {
                aVal = a.keyword.toLowerCase();
                bVal = b.keyword.toLowerCase();
                if (currentSortDirection === 'asc') {
                    return aVal.localeCompare(bVal);
                } else {
                    return bVal.localeCompare(aVal);
                }
            } else if (currentSortColumn === 'properties') {
                aVal = a.propertyCount || 0;
                bVal = b.propertyCount || 0;
                if (currentSortDirection === 'asc') {
                    return aVal - bVal;
                } else {
                    return bVal - aVal;
                }
            } else if (currentSortColumn === 'campaigns') {
                aVal = a.campaignCount || 0;
                bVal = b.campaignCount || 0;
                if (currentSortDirection === 'asc') {
                    return aVal - bVal;
                } else {
                    return bVal - aVal;
                }
            } else {
                aVal = a[currentSortColumn];
                bVal = b[currentSortColumn];
                if (currentSortDirection === 'asc') {
                    return aVal - bVal;
                } else {
                    return bVal - aVal;
                }
            }
        });
    }

    // Clear table
    const tbody = document.getElementById('resultsBody');
    tbody.innerHTML = '';

    // Populate table with filtered data
    filteredData.forEach((item, index) => {
        const quintile = quintileMap.get(item.keyword);
        const quintileClass = getQuintileClass(quintile);

        // Main row
        const row = tbody.insertRow();
        row.className = `keyword-row ${quintileClass}`;
        row.dataset.index = index;

        const keywordCell = row.insertCell(0);
        keywordCell.className = 'expandable-cell';
        keywordCell.innerHTML = `
            <span class="expand-icon">▶</span>
            <span class="keyword-text">${item.keyword}</span>
        `;

        const propertiesCell = row.insertCell(1);
        propertiesCell.textContent = item.propertyCount || 0;
        propertiesCell.style.textAlign = 'center';

        const campaignsCell = row.insertCell(2);
        campaignsCell.textContent = item.campaignCount || 0;
        campaignsCell.style.textAlign = 'center';

        const conversionsCell = row.insertCell(3);
        conversionsCell.textContent = item.conversions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const costCell = row.insertCell(4);
        costCell.textContent = '$' + item.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // Make row clickable
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => toggleBreakdown(index, row));

        // Create breakdown row (initially hidden)
        const breakdownRow = tbody.insertRow();
        breakdownRow.className = 'breakdown-row';
        breakdownRow.dataset.index = index;
        breakdownRow.style.display = 'none';

        const breakdownCell = breakdownRow.insertCell(0);
        breakdownCell.colSpan = 5;
        breakdownCell.innerHTML = createBreakdownTable(item.breakdown);
    });

    // Update results count
    updateResultsCount(filteredData.length);

    // Update quintile statistics if filter is active
    updateQuintileStats(filteredData);
}

// Update quintile statistics display
function updateQuintileStats(filteredData) {
    const quintileStatsDiv = document.getElementById('quintileStats');
    const quintileStatsTitle = document.getElementById('quintileStatsTitle');
    const quintileConversions = document.getElementById('quintileConversions');
    const quintileCost = document.getElementById('quintileCost');
    const quintileCPA = document.getElementById('quintileCPA');

    if (currentQuintileFilter === 'all') {
        // Hide stats when showing all quintiles
        if (quintileStatsDiv) {
            quintileStatsDiv.style.display = 'none';
        }
        return;
    }

    // Calculate totals for the filtered quintile
    const totalConversions = filteredData.reduce((sum, item) => sum + item.conversions, 0);
    const totalCost = filteredData.reduce((sum, item) => sum + item.cost, 0);
    const avgCPA = totalConversions > 0 ? totalCost / totalConversions : 0;

    // Get quintile name
    const quintileNames = {
        '1': 'Best Performance (Quintile 1)',
        '2': 'Good Performance (Quintile 2)',
        '3': 'Average Performance (Quintile 3)',
        '4': 'Below Average (Quintile 4)',
        '5': 'Worst Performance (Quintile 5)'
    };

    // Update UI
    if (quintileStatsTitle) {
        quintileStatsTitle.textContent = quintileNames[currentQuintileFilter] || 'Quintile Statistics';
    }
    if (quintileConversions) {
        quintileConversions.textContent = totalConversions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (quintileCost) {
        quintileCost.textContent = '$' + totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (quintileCPA) {
        quintileCPA.textContent = '$' + avgCPA.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (quintileStatsDiv) {
        quintileStatsDiv.style.display = 'block';
    }
}

// Update results count display
function updateResultsCount(count) {
    if (resultsCount) {
        resultsCount.textContent = count.toLocaleString();
    }
}

// Toggle breakdown visibility
function toggleBreakdown(index, mainRow) {
    const breakdownRow = document.querySelector(`.breakdown-row[data-index="${index}"]`);
    const expandIcon = mainRow.querySelector('.expand-icon');

    if (breakdownRow.style.display === 'none') {
        breakdownRow.style.display = 'table-row';
        expandIcon.textContent = '▼';
        mainRow.classList.add('expanded');
    } else {
        breakdownRow.style.display = 'none';
        expandIcon.textContent = '▶';
        mainRow.classList.remove('expanded');
    }
}

// Create breakdown table HTML
function createBreakdownTable(breakdown) {
    let html = `
        <div class="breakdown-container">
            <h4>Property, Campaign & Ad Group Breakdown</h4>
            <table class="breakdown-table">
                <thead>
                    <tr>
                        <th>Property</th>
                        <th>Campaign</th>
                        <th>Ad Group</th>
                        <th>Conversions</th>
                        <th>Cost</th>
                    </tr>
                </thead>
                <tbody>
    `;

    breakdown.forEach(item => {
        html += `
            <tr>
                <td>${item.property}</td>
                <td>${item.campaign}</td>
                <td>${item.adGroup}</td>
                <td>${item.conversions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>$${item.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    return html;
}

// Save aggregated data to database
async function saveToDatabase() {
    if (aggregatedData.length === 0) {
        showError('No data to save. Please process a file first.');
        return;
    }

    try {
        // Show loading state
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
        }

        // Convert file buffer to base64
        const reader = new FileReader();
        reader.onload = async function(e) {
            const base64Data = e.target.result.split(',')[1];

            const payload = {
                filename: currentFilename,
                fileBuffer: base64Data,
                sheetNames: currentSheetNames,
                aggregatedData: aggregatedData,
                fileDetails: fileDetails
            };

            console.log('Saving to:', `${API_BASE_URL}/upload`);
            console.log('Payload size:', JSON.stringify(payload).length, 'bytes');

            const response = await fetch(`${API_BASE_URL}/upload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            console.log('Save response status:', response.status);

            let result;
            const responseText = await response.text();
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                console.error('Invalid JSON response:', responseText);
                result = { error: responseText };
            }

            console.log('Save result:', result);

            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save to Database';
            }

            if (response.ok) {
                showNotification(`Successfully saved! File ID: ${result.fileId}`);
                // Refresh sidebar to show new file
                console.log('Refreshing sidebar and file list...');
                await loadSidebarFiles();
                await loadSavedFiles();
            } else {
                console.error('Save failed:', result);
                showError(`Error saving file: ${result.error || 'Unknown error'}`);
            }
        };

        // Create a blob from the file buffer and read as data URL
        const blob = new Blob([currentFileBuffer]);
        reader.readAsDataURL(blob);

    } catch (error) {
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save to Database';
        }
        showError('Error saving to database: ' + error.message);
    }
}

// Show notification message
function showNotification(message) {
    const notificationEl = document.createElement('div');
    notificationEl.className = 'notification success';
    notificationEl.textContent = message;
    document.body.appendChild(notificationEl);

    setTimeout(() => {
        notificationEl.classList.add('show');
    }, 100);

    setTimeout(() => {
        notificationEl.classList.remove('show');
        setTimeout(() => notificationEl.remove(), 300);
    }, 4000);
}

// Export aggregated data to Excel
function exportToExcel() {
    if (aggregatedData.length === 0) {
        showError('No data to export');
        return;
    }

    // Prepare data for export
    const exportData = aggregatedData.map(item => ({
        'Keyword': item.keyword,
        'Conversions': item.conversions,
        'Cost': item.cost
    }));

    // Create new workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    ws['!cols'] = [
        { wch: 40 },  // Keyword
        { wch: 15 },  // Conversions
        { wch: 15 }   // Cost
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Aggregated Report');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `Organization_Report_${timestamp}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
}

// Reset app to initial state
function resetApp() {
    workbook = null;
    aggregatedData = [];
    fileInput.value = '';
    fileInfo.textContent = '';
    fileInfo.classList.remove('show');
    sheetsSection.style.display = 'none';
    loadingSection.style.display = 'none';
    resultsSection.style.display = 'none';
    errorSection.style.display = 'none';
}

// Show error message
function showError(message) {
    errorText.textContent = message;
    errorSection.style.display = 'block';
    loadingSection.style.display = 'none';
}

// Load saved files from database
async function loadSavedFiles() {
    try {
        const response = await fetch(`${API_BASE_URL}/files`);
        const files = await response.json();

        if (files.length === 0) {
            savedFilesSection.style.display = 'none';
            return;
        }

        // Display saved files section
        savedFilesSection.style.display = 'block';
        savedFilesList.innerHTML = '';

        files.forEach(file => {
            const fileCard = document.createElement('div');
            fileCard.className = 'saved-file-card';

            const formattedDate = new Date(file.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            fileCard.innerHTML = `
                <div class="file-card-header">
                    <div class="file-info-left">
                        <h4>${file.filename}</h4>
                        <p class="file-meta">
                            <span>📅 ${formattedDate}</span>
                            <span>📊 ${file.total_keywords} keywords</span>
                            <span>📁 ${file.sheet_names?.length || 0} sheets</span>
                        </p>
                    </div>
                    <div class="file-info-right">
                        <div class="file-stat">
                            <span class="label">Conversions</span>
                            <span class="value">${(file.total_conversions || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div class="file-stat">
                            <span class="label">Cost</span>
                            <span class="value">$${(file.total_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>
                <div class="file-card-actions">
                    <button class="view-btn" onclick="viewSavedFile(${file.id})">View Report</button>
                    <button class="delete-btn" onclick="deleteSavedFile(${file.id})">Delete</button>
                </div>
            `;

            savedFilesList.appendChild(fileCard);
        });
    } catch (error) {
        console.error('Error loading saved files:', error);
        // Don't show error to user, just hide the section
        savedFilesSection.style.display = 'none';
    }
}

// View saved file details
async function viewSavedFile(fileId) {
    try {
        const response = await fetch(`${API_BASE_URL}/files?id=${fileId}`);
        const file = await response.json();

        if (!file || !file.aggregatedKeywords) {
            showError('Error loading file details');
            return;
        }

        // Convert aggregatedKeywords to aggregatedData format
        aggregatedData = file.aggregatedKeywords.map(keyword => ({
            keyword: keyword.keyword,
            conversions: keyword.total_conversions,
            cost: keyword.total_cost,
            breakdown: file.details
                .filter(detail => detail.keyword === keyword.keyword)
                .map(detail => ({
                    property: detail.property,
                    campaign: detail.campaign,
                    adGroup: detail.ad_group,
                    conversions: detail.conversions,
                    cost: detail.cost
                }))
        }));

        // Display the results
        displayResults(aggregatedData, file.sheet_names?.length || 0);

        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth' });

        showNotification(`Loaded: ${file.filename}`);
    } catch (error) {
        console.error('Error loading file:', error);
        showError('Error loading file details: ' + error.message);
    }
}

// Delete saved file
async function deleteSavedFile(fileId) {
    const filename = event.target.closest('.saved-file-card').querySelector('h4').textContent;

    if (!confirm(`Are you sure you want to delete "${filename}"?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/files?id=${fileId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            showNotification('File deleted successfully');
            loadSavedFiles(); // Refresh the list
            loadSidebarFiles(); // Refresh sidebar
        } else {
            showError('Error deleting file: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        showError('Error deleting file: ' + error.message);
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Sidebar functions
function toggleSidebar() {
    sidebar.classList.toggle('open');
}

function closeSidebar() {
    sidebar.classList.remove('open');
}

// Load files into sidebar
async function loadSidebarFiles() {
    try {
        console.log('Loading sidebar files from:', `${API_BASE_URL}/files`);
        const response = await fetch(`${API_BASE_URL}/files`);

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            throw new Error(`API returned ${response.status}: ${errorText}`);
        }

        const files = await response.json();
        console.log('Loaded files:', files);

        // Check if response is an error object
        if (files.error || files.success === false) {
            console.error('API returned error:', files);
            sidebarCount.textContent = '!';
            sidebarContent.innerHTML = '<p class="sidebar-empty">Database connection error. Please check Vercel environment variables.</p>';
            return;
        }

        // Check if files is actually an array
        if (!Array.isArray(files)) {
            console.error('Expected array but got:', typeof files, files);
            sidebarCount.textContent = '!';
            sidebarContent.innerHTML = '<p class="sidebar-empty">Invalid response from server</p>';
            return;
        }

        // Update count badge
        sidebarCount.textContent = files.length;

        if (files.length === 0) {
            sidebarContent.innerHTML = '<p class="sidebar-empty">No saved files yet</p>';
            console.log('No files found in database');
            return;
        }

        // Clear and populate sidebar
        sidebarContent.innerHTML = '';

        files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'sidebar-file-item';
            fileItem.onclick = () => {
                viewSavedFile(file.id);
                closeSidebar();
            };

            const formattedDate = new Date(file.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            fileItem.innerHTML = `
                <div class="sidebar-file-name">${file.filename}</div>
                <div class="sidebar-file-meta">
                    <span>📅 ${formattedDate}</span>
                    <span>📊 ${file.total_keywords} keywords</span>
                </div>
                <div class="sidebar-file-stats">
                    <span class="sidebar-stat">${(file.total_conversions || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} conversions</span>
                    <span class="sidebar-stat">$${(file.total_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
            `;

            sidebarContent.appendChild(fileItem);
        });

        console.log('Sidebar populated with', files.length, 'files');
    } catch (error) {
        console.error('Error loading sidebar files:', error);
        sidebarContent.innerHTML = `<p class="sidebar-empty">Error: ${error.message}</p>`;
    }
}

// Column Filter Functions
let filtersInitialized = false;

function initializeColumnFilters() {
    // Only initialize once
    if (filtersInitialized) return;
    filtersInitialized = true;

    // Add click listeners to filter icons
    document.querySelectorAll('.filter-icon').forEach(icon => {
        icon.addEventListener('click', (e) => {
            e.stopPropagation();
            const column = e.target.dataset.filterColumn;
            toggleFilterDropdown(column);
        });
    });

    // Close filter dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.filter-dropdown') && !e.target.closest('.filter-icon')) {
            closeAllFilterDropdowns();
        }
    });
}

function toggleFilterDropdown(column) {
    const dropdown = document.getElementById(`filter-${column}`);
    const icon = document.querySelector(`.filter-icon[data-filter-column="${column}"]`);

    // Close other dropdowns
    if (currentOpenFilter && currentOpenFilter !== column) {
        closeAllFilterDropdowns();
    }

    if (dropdown.style.display === 'none' || !dropdown.style.display) {
        // Open dropdown
        populateFilterDropdown(column);
        dropdown.style.display = 'block';
        icon.classList.add('active');
        currentOpenFilter = column;
    } else {
        // Close dropdown
        dropdown.style.display = 'none';
        icon.classList.remove('active');
        currentOpenFilter = null;
    }
}

function closeAllFilterDropdowns() {
    document.querySelectorAll('.filter-dropdown').forEach(dropdown => {
        dropdown.style.display = 'none';
    });
    document.querySelectorAll('.filter-icon').forEach(icon => {
        icon.classList.remove('active');
    });
    currentOpenFilter = null;
}

function populateFilterDropdown(column) {
    const dropdown = document.getElementById(`filter-${column}`);
    const filterList = dropdown.querySelector('.filter-list');
    const filterSearch = dropdown.querySelector('.filter-search');

    console.log('Populating filter for column:', column);
    console.log('aggregatedData length:', aggregatedData.length);

    // Get unique values for this column
    const uniqueValues = new Set();
    aggregatedData.forEach(item => {
        let value;
        if (column === 'keyword') {
            value = item.keyword;
        } else if (column === 'properties') {
            value = item.propertyCount || 0;
        } else if (column === 'campaigns') {
            value = item.campaignCount || 0;
        } else if (column === 'conversions') {
            value = item.conversions.toFixed(2);
        } else if (column === 'cost') {
            value = item.cost.toFixed(2);
        }
        uniqueValues.add(value);
    });

    // Sort values
    const sortedValues = Array.from(uniqueValues).sort((a, b) => {
        if (column === 'keyword') {
            return a.localeCompare(b);
        }
        return parseFloat(a) - parseFloat(b);
    });

    console.log('Unique values found:', sortedValues.length);

    // Render filter items
    renderFilterItems(filterList, sortedValues, column);

    // Setup search
    filterSearch.value = '';
    filterSearch.oninput = (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredValues = sortedValues.filter(v =>
            v.toString().toLowerCase().includes(searchTerm)
        );
        renderFilterItems(filterList, filteredValues, column);
    };

    // Setup select all / clear
    const selectAllLink = dropdown.querySelector('.filter-select-all');
    const clearLink = dropdown.querySelector('.filter-clear');

    selectAllLink.onclick = (e) => {
        e.preventDefault();
        filterList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = true;
        });
    };

    clearLink.onclick = (e) => {
        e.preventDefault();
        filterList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
    };

    // Setup OK / Cancel buttons
    const okBtn = dropdown.querySelector('.filter-ok');
    const cancelBtn = dropdown.querySelector('.filter-cancel');

    okBtn.onclick = () => {
        applyColumnFilter(column, filterList);
        closeAllFilterDropdowns();
    };

    cancelBtn.onclick = () => {
        closeAllFilterDropdowns();
    };
}

function renderFilterItems(filterList, values, column) {
    console.log('renderFilterItems called with', values.length, 'values');

    // Update the displaying count
    const dropdown = document.getElementById(`filter-${column}`);
    const displayingCount = dropdown.querySelector('.filter-displaying-count');
    if (displayingCount) {
        displayingCount.textContent = `Displaying ${values.length}`;
    }

    filterList.innerHTML = '';
    console.log('filterList cleared, adding items...');

    values.forEach((value, index) => {
        console.log(`Adding item ${index}:`, value);
        const item = document.createElement('div');
        item.className = 'filter-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = value;
        checkbox.id = `filter-${column}-${value}`;

        // Check if this value is currently active
        if (activeFilters[column].size === 0 || activeFilters[column].has(value.toString())) {
            checkbox.checked = true;
        }

        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = value;

        item.appendChild(checkbox);
        item.appendChild(label);

        item.onclick = (e) => {
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
            }
        };

        filterList.appendChild(item);
    });
}

function applyColumnFilter(column, filterList) {
    const checkedValues = new Set();
    const allCheckboxes = filterList.querySelectorAll('input[type="checkbox"]');

    allCheckboxes.forEach(cb => {
        if (cb.checked) {
            checkedValues.add(cb.value);
        }
    });

    // If all are checked, clear the filter (show all)
    const totalValues = allCheckboxes.length;
    if (checkedValues.size === totalValues) {
        activeFilters[column].clear();
    } else {
        activeFilters[column] = checkedValues;
    }

    // Update filter icon to show it's active
    const icon = document.querySelector(`.filter-icon[data-filter-column="${column}"]`);
    if (activeFilters[column].size > 0) {
        icon.classList.add('active');
    } else {
        icon.classList.remove('active');
    }

    // Re-render filtered data
    renderFilteredData();
}
