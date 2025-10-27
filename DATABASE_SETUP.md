# Database Setup Guide

This guide explains how to set up and use the database functionality in the Data Aggregator app.

## Overview

The app now includes database storage to persist uploaded Excel files and their aggregated data. Data is stored in Supabase PostgreSQL with the following tables:

- **uploaded_files**: Stores the uploaded Excel files and metadata
- **aggregated_keywords**: Stores aggregated keyword data for each file
- **file_details**: Stores detailed breakdown data (Property, Campaign, Ad Group level)

## Prerequisites

- Supabase account (free tier available at https://supabase.com)
- PostgreSQL connection URL from Supabase
- Node.js 14+ and npm

## Setup Instructions

### 1. Create Supabase Project

1. Go to [Supabase](https://supabase.com) and create a free account
2. Create a new project
3. Copy your PostgreSQL connection URL from the project settings

### 2. Configure Environment Variables

1. Create a `.env.local` file in the project root (or update the existing one):

```env
POSTGRES_URL="your_supabase_postgres_url"
```

Replace `your_supabase_postgres_url` with your actual connection string from Supabase.

### 3. Install Dependencies

```bash
npm install
```

This installs the `@vercel/postgres` package which is required for database connectivity.

### 4. Database Tables (Auto-created)

The database tables are automatically created when you first use the upload feature. The app will initialize:

#### uploaded_files Table
```sql
CREATE TABLE uploaded_files (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  file_data BYTEA NOT NULL,
  file_size INTEGER,
  sheet_names TEXT[],
  total_keywords INTEGER,
  total_conversions DECIMAL(12, 2),
  total_cost DECIMAL(12, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### aggregated_keywords Table
```sql
CREATE TABLE aggregated_keywords (
  id SERIAL PRIMARY KEY,
  file_id INTEGER NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
  keyword VARCHAR(255) NOT NULL,
  total_conversions DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),
  breakdown_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### file_details Table
```sql
CREATE TABLE file_details (
  id SERIAL PRIMARY KEY,
  file_id INTEGER NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
  keyword VARCHAR(255) NOT NULL,
  property VARCHAR(255) NOT NULL,
  campaign VARCHAR(255),
  ad_group VARCHAR(255),
  conversions DECIMAL(10, 2),
  cost DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Usage

### Saving Data

1. Upload an Excel file
2. Click "Process Data" to aggregate the data
3. Click "Save to Database" button to persist the data
4. A notification will show the File ID upon successful save

### Retrieving Saved Files

Access the `/api/files` endpoint:

**Get all files:**
```bash
GET /api/files
```

**Get specific file:**
```bash
GET /api/files?id=1
```

**Delete a file:**
```bash
DELETE /api/files?id=1
```

### API Endpoints

#### POST /api/upload
Uploads and saves a file to the database.

**Request Body:**
```json
{
  "filename": "report.xlsx",
  "fileBuffer": "base64_encoded_file",
  "sheetNames": ["Sheet1", "Sheet2"],
  "aggregatedData": [...],
  "fileDetails": [...]
}
```

**Response:**
```json
{
  "success": true,
  "message": "File uploaded and saved successfully",
  "fileId": 1,
  "filename": "report.xlsx"
}
```

#### GET /api/files
Retrieves all uploaded files.

**Response:**
```json
[
  {
    "id": 1,
    "filename": "report.xlsx",
    "file_size": 15234,
    "sheet_names": ["Property A", "Property B"],
    "total_keywords": 150,
    "total_conversions": 5000,
    "total_cost": 25000.50,
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

#### GET /api/files?id=1
Retrieves a specific file with all details.

**Response:**
```json
{
  "id": 1,
  "filename": "report.xlsx",
  "total_keywords": 150,
  "aggregatedKeywords": [...],
  "details": [...]
}
```

#### DELETE /api/files?id=1
Deletes a file and associated data.

## Deployment on Vercel

### 1. Push Code to GitHub
```bash
git add .
git commit -m "Add database functionality"
git push origin main
```

### 2. Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Import your GitHub repository
3. Add environment variable:
   - Name: `POSTGRES_URL`
   - Value: Your Supabase PostgreSQL URL
4. Deploy

### 3. Verify Database Connection

After deployment, the database tables will be created automatically on first use.

## Troubleshooting

### Connection Errors

1. **"could not connect to server"**
   - Check that your `POSTGRES_URL` is correct
   - Ensure your Supabase IP whitelist includes Vercel IPs
   - Supabase > Project Settings > Database > Connection pooling settings

2. **"permission denied"**
   - Ensure your Supabase user has proper permissions
   - Check that the connection string includes the correct password

3. **"table does not exist"**
   - The app automatically creates tables on first upload
   - If tables still don't exist, check database logs in Supabase dashboard

### Performance Optimization

For better performance with large datasets:

1. **Enable Connection Pooling**
   - Use the pooler URL from Supabase instead of direct connection
   - This is already configured in the default URL

2. **Add Database Indexes**
   - Indexes are automatically created on `file_id` and `keyword` columns

3. **Archive Old Files**
   - Consider implementing file cleanup for old uploads

## Security Notes

1. **Environment Variables**
   - Never commit `.env.local` to version control
   - Always use `.env.example` as a template
   - Keep `POSTGRES_URL` secret

2. **Data Protection**
   - All file data is stored as binary in the database
   - Implement authentication before allowing file uploads in production
   - Consider encrypting sensitive data

3. **Rate Limiting**
   - Implement rate limiting on API endpoints
   - Limit file size uploads (current limit: 100MB)

## Database Maintenance

### Backup

Supabase automatically backs up your database daily. To create manual backups:

1. Go to Supabase Dashboard
2. Project Settings > Backups
3. Click "Create a backup"

### Monitoring

Monitor your database usage:

1. Supabase Dashboard > Database Settings
2. Check storage and row counts
3. Review slow queries in logs

## Next Steps

- Implement user authentication
- Add file search and filtering
- Create dashboard for viewing saved reports
- Implement data export to multiple formats
