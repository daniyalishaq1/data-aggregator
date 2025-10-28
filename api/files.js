const { getAllUploadedFiles, getFileById, deleteFile, getFileStatistics } = require('./db.js');

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { id } = req.query;

    if (req.method === 'GET') {
      if (id) {
        // Get specific file by ID
        const file = await getFileById(id);
        if (!file) {
          return res.status(404).json({ error: 'File not found' });
        }
        return res.status(200).json(file);
      } else {
        // Get all uploaded files
        const files = await getAllUploadedFiles();
        return res.status(200).json(files);
      }
    }

    if (req.method === 'DELETE') {
      if (!id) {
        return res.status(400).json({ error: 'File ID is required' });
      }
      await deleteFile(id);
      return res.status(200).json({ success: true, message: 'File deleted successfully' });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error handling request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process request: ' + error.message
    });
  }
};
