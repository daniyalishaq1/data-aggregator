# Data Aggregator Project - Conversation Summary

## Project Overview

**Purpose**: Web application that allows users to upload Excel files with multiple sheets (representing different organizational properties), processes and aggregates data, and displays consolidated reports.

**Tech Stack**:
- Frontend: Static HTML/CSS/JavaScript with SheetJS (xlsx library)
- Backend: Vercel serverless functions (Node.js with CommonJS)
- Database: Supabase PostgreSQL
- Deployment: Vercel (connected via GitHub)

**GitHub Repository**: https://github.com/daniyalishaq1/data-aggregator
**Live Deployment**: Vercel (auto-deploys from main branch)

---

## Core Features Implemented

### 1. Excel File Upload & Processing
- Drag-and-drop or click-to-upload interface
- Multi-sheet Excel file support (.xlsx, .xls)
- Client-side processing using SheetJS library
- Extracts data from columns: Keyword, Campaign, Ad Group, Conversions, Cost

### 2. Data Aggregation
- Combines data from multiple sheets (properties)
- Aggregates by keyword (merges duplicates)
- Calculates total conversions and total cost per keyword
- Displays summary statistics (total keywords, conversions, cost, sheets processed)

### 3. Multi-Level Expandable Table
- **Level 1**: Aggregated view showing each unique keyword with totals
- **Level 2**: Click to expand and see breakdown by Property
- **Level 3**: Click property to expand and see Campaign and Ad Group details
- Purple gradient theme with smooth animations

### 4. Database Persistence
- Save uploaded files to Supabase PostgreSQL
- Three database tables:
  - `uploaded_files`: Stores file metadata and binary data
  - `aggregated_keywords`: Stores aggregated keyword summaries
  - `file_details`: Stores detailed breakdown data
- Cascade deletion (deleting a file removes all associated data)

### 5. Sidebar with Saved Files
- Slide-in sidebar showing all saved files
- File count badge on toggle button
- Each file card displays:
  - Filename
  - Upload date/time
  - File size
  - Number of sheets
  - Total keywords, conversions, cost
  - Load and Delete buttons
- Auto-refreshes when new files are saved

### 6. Export Functionality
- Export aggregated data back to Excel format
- Downloads processed results as .xlsx file

---

## Project Structure

```
/Data Aggregator/
├── index.html              # Main application UI
├── styles.css              # Styling with purple gradient theme
├── app.js                  # Client-side logic (file upload, processing, API calls)
├── package.json            # Dependencies (pg library)
├── vercel.json             # Deployment configuration
├── /api/
│   ├── config.js          # Database connection config with URL cleaning
│   ├── db.js              # Database functions using pg library
│   ├── upload.js          # POST /api/upload - save files
│   └── files.js           # GET /api/files - list, DELETE /api/files?id=X
├── DATABASE_SETUP.md       # Database schema documentation
├── FIX_DATABASE_CONNECTION.md  # Troubleshooting guide
└── README.md              # Project documentation
```

---

## Database Schema

### Table: `uploaded_files`
```sql
id SERIAL PRIMARY KEY
filename VARCHAR(255)
file_data BYTEA                  -- Binary Excel file
file_size INTEGER
sheet_names TEXT[]               -- Array of sheet names
total_keywords INTEGER
total_conversions DECIMAL(12,2)
total_cost DECIMAL(12,2)
created_at TIMESTAMP
updated_at TIMESTAMP
```

### Table: `aggregated_keywords`
```sql
id SERIAL PRIMARY KEY
file_id INTEGER REFERENCES uploaded_files(id) ON DELETE CASCADE
keyword VARCHAR(255)
total_conversions DECIMAL(10,2)
total_cost DECIMAL(10,2)
breakdown_count INTEGER          -- Number of detail rows
created_at TIMESTAMP
```

### Table: `file_details`
```sql
id SERIAL PRIMARY KEY
file_id INTEGER REFERENCES uploaded_files(id) ON DELETE CASCADE
keyword VARCHAR(255)
property VARCHAR(255)            -- Sheet name
campaign VARCHAR(255)
ad_group VARCHAR(255)
conversions DECIMAL(10,2)
cost DECIMAL(10,2)
created_at TIMESTAMP
```

---

## API Endpoints

### POST /api/upload
**Purpose**: Save uploaded file and processed data to database

**Request Body**:
```json
{
  "filename": "data.xlsx",
  "fileData": "base64-encoded-file-buffer",
  "sheetNames": ["Property1", "Property2"],
  "aggregatedData": [
    {
      "keyword": "example",
      "conversions": 100,
      "cost": 50.00,
      "breakdown": [...]
    }
  ],
  "fileDetails": [
    {
      "keyword": "example",
      "property": "Property1",
      "campaign": "Campaign A",
      "adGroup": "Ad Group 1",
      "conversions": 50,
      "cost": 25.00
    }
  ]
}
```

**Response**: `{ success: true, fileId: 123 }`

### GET /api/files
**Purpose**: Retrieve list of all saved files

**Response**:
```json
[
  {
    "id": 1,
    "filename": "data.xlsx",
    "file_size": 45678,
    "sheet_names": ["Property1", "Property2"],
    "total_keywords": 250,
    "total_conversions": "1500.00",
    "total_cost": "750.00",
    "created_at": "2025-10-28T12:00:00Z"
  }
]
```

### GET /api/files?id=123
**Purpose**: Retrieve specific file with full details

**Response**: File object with `aggregatedKeywords` and `details` arrays

### DELETE /api/files?id=123
**Purpose**: Delete file and all associated data

**Response**: `{ success: true }`

---

## Major Issues Encountered & Resolutions

### Issue 1: Vercel Build Errors
**Error**: `sh: line 1: vercel: command not found`

**Cause**: package.json had build scripts calling `vercel` CLI which wasn't available in build environment

**Solution**: Removed all npm scripts, let Vercel auto-detect static site

---

### Issue 2: ES6 Module Syntax Not Supported
**Error**: Serverless functions returning 500 errors

**Cause**: ES6 import/export syntax not supported in Vercel serverless functions

**Solution**: Converted all API files to CommonJS
```javascript
// Before (ES6)
import { something } from './module.js';
export { function };

// After (CommonJS)
const { something } = require('./module.js');
module.exports = { function };
```

---

### Issue 3: Invalid Connection String Parameter
**Error**: `Database error (HTTP status 404): Not Found`

**Cause**: Supabase connection string contained `&supa=base-pooler.x` parameter that was invalid

**User Constraint**: Could not edit environment variables in Vercel UI

**Solution**: Created [api/config.js](api/config.js) with:
- Hardcoded fallback connection string
- URL cleaning function to remove invalid parameters
```javascript
function cleanDatabaseUrl(url) {
  let cleanUrl = url.replace(/&supa=base-pooler\.x/g, '');
  cleanUrl = cleanUrl.replace(/[?&]sslmode=require/g, '');
  return cleanUrl;
}
```

---

### Issue 4: @vercel/postgres Compatibility Error
**Error**:
```
VercelPostgresError - 'invalid_connection_string':
This connection string is meant to be used with a direct connection.
Make sure to use a pooled connection string or try `createClient()` instead.
```

**Cause**: @vercel/postgres library requires specific pooled connection string format

**Solution**: Switched from `@vercel/postgres` to standard `pg` library
- Updated [package.json](package.json#L14-L16): Changed dependency to `"pg": "^8.11.3"`
- Rewrote [api/db.js](api/db.js):
  - Use `Pool` from `pg` with connection pooling
  - Parameterized queries with `$1, $2, etc.` instead of template literals
  - Proper SSL configuration: `ssl: { rejectUnauthorized: false }`
  - Transaction support with BEGIN/COMMIT/ROLLBACK
  - Better error handling and connection release

**Status**: ✅ **DEPLOYED** - Changes committed and pushed (commit e478557)

---

## Current Database Configuration

**Connection String** (from Supabase):
```
postgres://postgres.pngooliujkswlgmjmmta:7F5aqszAR3A4oKI3@aws-1-us-east-1.pooler.supabase.com:6543/postgres
```

**Environment Variables** (in Vercel):
- `POSTGRES_URL`: Set to above connection string
- Note: User cannot edit environment variables in Vercel, hence hardcoded fallback in config.js

**Database Library**: `pg` (PostgreSQL client for Node.js)

**Connection Method**: Pool-based connections with SSL

---

## Key Code Sections

### File Upload Flow (app.js)
```javascript
// 1. User uploads file
fileInput.addEventListener('change', handleFileUpload);

// 2. Process Excel file with SheetJS
async function processData() {
  const workbook = XLSX.read(fileData, { type: 'array' });
  // Extract sheets, aggregate data...
}

// 3. Save to database
async function saveToDatabase() {
  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: JSON.stringify({
      filename, fileData, sheetNames,
      aggregatedData, fileDetails
    })
  });
}

// 4. Update sidebar
await loadSidebarFiles();
```

### Database Save Flow (api/db.js)
```javascript
async function saveUploadedFile(filename, fileBuffer, sheetNames, aggregatedData, fileDetails) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert file metadata
    const fileResult = await client.query(
      `INSERT INTO uploaded_files (...) VALUES ($1, $2, ...) RETURNING id`,
      [filename, fileBuffer, ...]
    );

    // Insert aggregated keywords
    for (const keyword of aggregatedData) {
      await client.query(`INSERT INTO aggregated_keywords ...`, [...]);
    }

    // Insert detailed breakdown
    for (const detail of fileDetails) {
      await client.query(`INSERT INTO file_details ...`, [...]);
    }

    await client.query('COMMIT');
    return fileId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### Expandable Table Rendering (app.js)
```javascript
// Level 1: Keyword rows
const row = document.createElement('tr');
row.innerHTML = `
  <td class="keyword-cell">
    <span class="expand-icon">▶</span>
    <span class="keyword-text">${keyword}</span>
  </td>
  <td>${conversions}</td>
  <td>$${cost.toFixed(2)}</td>
`;

// Level 2: Property breakdown (on click)
row.addEventListener('click', () => {
  const breakdownRow = createBreakdownRow(item.breakdown);
  row.after(breakdownRow);
});

// Level 3: Campaign/Ad Group details (on property click)
propertyRow.addEventListener('click', () => {
  const detailsRow = createDetailsRow(propertyItem.details);
  propertyRow.after(detailsRow);
});
```

---

## Testing Checklist

After deployment completes, verify:

- [ ] Application loads at Vercel URL
- [ ] Can upload Excel file with multiple sheets
- [ ] Data processes correctly and displays in table
- [ ] Can expand/collapse rows to see breakdowns
- [ ] **Save to Database** button works without errors
- [ ] Sidebar populates with saved file
- [ ] File count badge updates
- [ ] Can load previously saved file from sidebar
- [ ] Can delete file from sidebar
- [ ] Export to Excel works

---

## Next Steps (if needed)

1. **Monitor Deployment**: Check Vercel dashboard for deployment status
2. **Test Database Connection**: Upload a file and verify it saves successfully
3. **Check Sidebar**: Ensure saved files appear in sidebar
4. **Error Monitoring**: Watch browser console and Vercel logs for any errors

---

## Useful Commands

```bash
# Check git status
git status

# View recent commits
git log --oneline -5

# Push changes
git add . && git commit -m "message" && git push origin main

# Check Vercel deployments (if vercel CLI installed)
vercel ls

# Run locally (requires local PostgreSQL or update config.js)
# Open index.html in browser (static site)
```

---

## Important Notes

1. **Database Connection**: Uses hardcoded connection string in [api/config.js](api/config.js) as fallback because environment variables cannot be edited in Vercel
2. **Module System**: All API files use CommonJS (`require`/`module.exports`) not ES6 modules
3. **SSL Requirement**: PostgreSQL connection requires SSL with `rejectUnauthorized: false` for Supabase
4. **File Storage**: Excel files stored as BYTEA (binary) in database
5. **Cascade Deletion**: Deleting a file automatically deletes all associated keywords and details
6. **Client-Side Processing**: Excel parsing happens in browser before sending to API

---

## Contact & Resources

- **GitHub Repo**: https://github.com/daniyalishaq1/data-aggregator
- **Supabase Dashboard**: Check for database connection and data
- **Vercel Dashboard**: Monitor deployments and view logs
- **SheetJS Docs**: https://docs.sheetjs.com/

---

## Recent Deployment (Latest)

**Commit**: e478557 - "Switch from @vercel/postgres to pg library for better connection string compatibility"

**Changes**:
- Replaced `@vercel/postgres` with `pg` library in package.json
- Rewrote api/db.js to use Pool and parameterized queries
- Added transaction support with proper error handling
- Configured SSL for Supabase connections

**Status**: Pushed to GitHub, Vercel auto-deployment in progress

**Expected Outcome**: Database connection should now work correctly, allowing files to be saved and loaded from the sidebar.
