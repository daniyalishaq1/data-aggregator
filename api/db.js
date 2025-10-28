const { sql } = require('@vercel/postgres');

// Initialize database tables
async function initializeDatabase() {
  try {
    // Create uploaded_files table
    await sql`
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
    `;

    // Create file_details table (for storing breakdown data)
    await sql`
      CREATE TABLE IF NOT EXISTS file_details (
        id SERIAL PRIMARY KEY,
        file_id INTEGER NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
        keyword VARCHAR(255) NOT NULL,
        property VARCHAR(255) NOT NULL,
        campaign VARCHAR(255),
        ad_group VARCHAR(255),
        conversions DECIMAL(10, 2),
        cost DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (file_id) REFERENCES uploaded_files(id)
      );
    `;

    // Create aggregated_keywords table (for quick access to level 1 data)
    await sql`
      CREATE TABLE IF NOT EXISTS aggregated_keywords (
        id SERIAL PRIMARY KEY,
        file_id INTEGER NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
        keyword VARCHAR(255) NOT NULL,
        total_conversions DECIMAL(10, 2),
        total_cost DECIMAL(10, 2),
        breakdown_count INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (file_id) REFERENCES uploaded_files(id)
      );
    `;

    // Create indexes for better query performance
    await sql`CREATE INDEX IF NOT EXISTS idx_file_details_file_id ON file_details(file_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_file_details_keyword ON file_details(keyword);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_aggregated_keywords_file_id ON aggregated_keywords(file_id);`;

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Save uploaded file and its data
async function saveUploadedFile(filename, fileBuffer, sheetNames, aggregatedData, fileDetails) {
  try {
    // Insert into uploaded_files
    const fileResult = await sql`
      INSERT INTO uploaded_files (
        filename,
        file_data,
        file_size,
        sheet_names,
        total_keywords,
        total_conversions,
        total_cost
      ) VALUES (
        ${filename},
        ${fileBuffer},
        ${fileBuffer.length},
        ${sheetNames},
        ${aggregatedData.length},
        ${aggregatedData.reduce((sum, item) => sum + item.conversions, 0)},
        ${aggregatedData.reduce((sum, item) => sum + item.cost, 0)}
      )
      RETURNING id;
    `;

    const fileId = fileResult.rows[0].id;

    // Insert aggregated keywords
    for (const keyword of aggregatedData) {
      await sql`
        INSERT INTO aggregated_keywords (
          file_id,
          keyword,
          total_conversions,
          total_cost,
          breakdown_count
        ) VALUES (
          ${fileId},
          ${keyword.keyword},
          ${keyword.conversions},
          ${keyword.cost},
          ${keyword.breakdown.length}
        );
      `;
    }

    // Insert file details (breakdown data)
    for (const detail of fileDetails) {
      await sql`
        INSERT INTO file_details (
          file_id,
          keyword,
          property,
          campaign,
          ad_group,
          conversions,
          cost
        ) VALUES (
          ${fileId},
          ${detail.keyword},
          ${detail.property},
          ${detail.campaign},
          ${detail.adGroup},
          ${detail.conversions},
          ${detail.cost}
        );
      `;
    }

    return fileId;
  } catch (error) {
    console.error('Error saving file to database:', error);
    throw error;
  }
}

// Get all uploaded files
async function getAllUploadedFiles() {
  try {
    const result = await sql`
      SELECT id, filename, file_size, sheet_names, total_keywords, total_conversions, total_cost, created_at
      FROM uploaded_files
      ORDER BY created_at DESC;
    `;
    return result.rows;
  } catch (error) {
    console.error('Error fetching uploaded files:', error);
    throw error;
  }
}

// Get file by ID
async function getFileById(fileId) {
  try {
    const fileResult = await sql`
      SELECT id, filename, file_size, sheet_names, total_keywords, total_conversions, total_cost, created_at
      FROM uploaded_files
      WHERE id = ${fileId};
    `;

    if (fileResult.rows.length === 0) {
      return null;
    }

    const file = fileResult.rows[0];

    // Get aggregated keywords for this file
    const keywordsResult = await sql`
      SELECT keyword, total_conversions, total_cost, breakdown_count
      FROM aggregated_keywords
      WHERE file_id = ${fileId}
      ORDER BY total_conversions DESC;
    `;

    // Get breakdown details for this file
    const detailsResult = await sql`
      SELECT keyword, property, campaign, ad_group, conversions, cost
      FROM file_details
      WHERE file_id = ${fileId}
      ORDER BY keyword, property;
    `;

    return {
      ...file,
      aggregatedKeywords: keywordsResult.rows,
      details: detailsResult.rows
    };
  } catch (error) {
    console.error('Error fetching file by ID:', error);
    throw error;
  }
}

// Delete file and associated data
async function deleteFile(fileId) {
  try {
    await sql`DELETE FROM uploaded_files WHERE id = ${fileId};`;
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

// Get file statistics
async function getFileStatistics(fileId) {
  try {
    const result = await sql`
      SELECT
        COUNT(*) as total_records,
        COUNT(DISTINCT keyword) as unique_keywords,
        COUNT(DISTINCT property) as total_properties,
        SUM(conversions) as total_conversions,
        SUM(cost) as total_cost,
        AVG(conversions) as avg_conversions,
        AVG(cost) as avg_cost
      FROM file_details
      WHERE file_id = ${fileId};
    `;
    return result.rows[0];
  } catch (error) {
    console.error('Error fetching file statistics:', error);
    throw error;
  }
}

module.exports = {
  initializeDatabase,
  saveUploadedFile,
  getAllUploadedFiles,
  getFileById,
  deleteFile,
  getFileStatistics
};
