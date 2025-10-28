// Database configuration
// This file provides the database connection string

const DATABASE_URL = process.env.POSTGRES_URL
  || process.env.DATABASE_URL
  || 'postgres://postgres.pngooliujkswlgmjmmta:7F5aqszAR3A4oKI3@aws-1-us-east-1.pooler.supabase.com:6543/postgres';

// Clean up the URL - remove invalid parameters
function cleanDatabaseUrl(url) {
  if (!url) return null;

  // Remove the problematic &supa=base-pooler.x parameter
  let cleanUrl = url.replace(/&supa=base-pooler\.x/g, '');

  // Remove sslmode parameter if it exists (it can cause issues)
  cleanUrl = cleanUrl.replace(/[?&]sslmode=require/g, '');

  console.log('Using database URL:', cleanUrl.substring(0, 50) + '...');

  return cleanUrl;
}

module.exports = {
  databaseUrl: cleanDatabaseUrl(DATABASE_URL)
};
