# Fix Database Connection Error

## Problem
You're seeing this error:
```
Database error (HTTP status 404): Not Found
```

This means your `POSTGRES_URL` environment variable in Vercel is incorrect.

## Solution

### Step 1: Get the Correct Connection String from Supabase

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** (gear icon in sidebar)
4. Go to **Database** section
5. Scroll to **Connection string** section
6. Select **Connection pooling** (important!)
7. Mode: **Transaction**
8. Copy the connection string

### Step 2: Update the Connection String Format

Your current string has an issue at the end. It should look like this:

**CORRECT FORMAT:**
```
postgres://postgres.pngooliujkswlgmjmmta:7F5aqszAR3A4oKI3@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
```

**WRONG (what you have):**
```
postgres://postgres.pngooliujkswlgmjmmta:7F5aqszAR3A4oKI3@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x
```

**Remove the `&supa=base-pooler.x` part!**

### Step 3: Update Environment Variable in Vercel

1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Select your `data-aggregator` project
3. Go to **Settings** tab
4. Click **Environment Variables** in the left sidebar
5. Find `POSTGRES_URL`
6. Click **Edit** (three dots)
7. Update the value to the CORRECT format (without `&supa=base-pooler.x`)
8. Make sure it's applied to: **Production, Preview, Development**
9. Click **Save**

### Step 4: Redeploy

After updating the environment variable:

**Option A: Trigger automatic redeploy**
1. Go to **Deployments** tab
2. Click the **...** menu on the latest deployment
3. Click **Redeploy**

**Option B: Make a small commit**
```bash
# Make a small change and push
git commit --allow-empty -m "Trigger redeploy"
git push origin main
```

### Step 5: Verify It Works

1. Wait for deployment to complete (1-2 minutes)
2. Open your deployed app
3. Upload an Excel file
4. Click "Process Data"
5. Click "Save to Database"
6. You should see: "Successfully saved! File ID: 1"
7. The sidebar badge should update with the file count

## Alternative: Use Direct Connection (Not Pooler)

If pooler doesn't work, try the direct connection string:

1. In Supabase → Settings → Database
2. Use **Connection string** section
3. Select **URI** (not pooler)
4. Copy that string instead
5. It will look like:
```
postgresql://postgres:YourPassword@db.project.supabase.co:5432/postgres
```

## Troubleshooting

### Still Getting 404 Error?

**Check 1: Verify environment variable is set**
```bash
# In your Vercel project settings, verify:
- Variable name is exactly: POSTGRES_URL
- Value has no extra spaces or quotes
- Applied to all environments
```

**Check 2: Check Vercel Function Logs**
1. Vercel Dashboard → Your Project
2. **Deployments** tab
3. Click latest deployment
4. Click **Functions** tab
5. Click on `/api/files` or `/api/upload`
6. Look for error messages

**Check 3: Test the connection string**
You can test if the connection string works using psql:
```bash
psql "your-connection-string-here"
```

### Error: "relation does not exist"

This means tables haven't been created. The app should auto-create them on first upload, but you can manually create them:

1. Go to Supabase Dashboard → SQL Editor
2. Run this SQL:

```sql
CREATE TABLE IF NOT EXISTS uploaded_files (
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

CREATE TABLE IF NOT EXISTS file_details (
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

CREATE TABLE IF NOT EXISTS aggregated_keywords (
    id SERIAL PRIMARY KEY,
    file_id INTEGER NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
    keyword VARCHAR(255) NOT NULL,
    total_conversions DECIMAL(10, 2),
    total_cost DECIMAL(10, 2),
    breakdown_count INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Summary

The main issue is the connection string format. Remove `&supa=base-pooler.x` from the end and make sure you're using the **Connection pooling** URL from Supabase, not the direct connection URL.

After fixing and redeploying, everything should work!
