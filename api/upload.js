import { initializeDatabase, saveUploadedFile } from './db.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize database tables if they don't exist
    await initializeDatabase();

    const { filename, fileBuffer, sheetNames, aggregatedData, fileDetails } = req.body;

    // Validate input
    if (!filename || !fileBuffer || !Array.isArray(aggregatedData)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Convert base64 string to Buffer if necessary
    let buffer = fileBuffer;
    if (typeof fileBuffer === 'string') {
      buffer = Buffer.from(fileBuffer, 'base64');
    }

    // Save to database
    const fileId = await saveUploadedFile(
      filename,
      buffer,
      sheetNames || [],
      aggregatedData,
      fileDetails || []
    );

    res.status(200).json({
      success: true,
      message: 'File uploaded and saved successfully',
      fileId: fileId,
      filename: filename
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload file: ' + error.message
    });
  }
}
