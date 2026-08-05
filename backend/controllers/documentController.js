const Document = require('../models/Document');
const Client = require('../models/Client');
const { uploadToS3, deleteFromS3, getPresignedUrl } = require('../middleware/s3Upload');

// Upload document
exports.uploadDocument = async (req, res) => {
  try {
    const { clientId, year, documentType } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Verify client belongs to this CA
    const client = await Client.findOne({
      _id: clientId,
      createdBy: req.userId
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Upload to AWS S3
    const uploadResult = await uploadToS3(
      req.file,
      clientId,
      documentType.toUpperCase(),
      year
    );

    // Generate presigned URL (valid for 7 days)
    const presignedUrl = await getPresignedUrl(uploadResult.s3Key, 7 * 24 * 60 * 60);

    const document = new Document({
      clientId,
      year,
      documentType: documentType.toUpperCase(),
      fileUrl: presignedUrl, // Store presigned URL
      fileName: uploadResult.fileName,
      s3Key: uploadResult.s3Key,
      bucket: uploadResult.bucket,
      storageType: 's3',
      uploadedBy: req.userId
    });

    await document.save();

    res.status(201).json({
      message: 'Document uploaded successfully to AWS S3',
      document
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all documents for a client
exports.getClientDocuments = async (req, res) => {
  try {
    const { clientId } = req.params;

    // Verify client belongs to this CA
    const client = await Client.findOne({
      _id: clientId,
      createdBy: req.userId
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const documents = await Document.find({ clientId })
      .sort({ uploadDate: -1 });

    // Refresh presigned URLs for S3 documents
    const documentsWithFreshUrls = await Promise.all(
      documents.map(async (doc) => {
        if (doc.storageType === 's3' && doc.s3Key) {
          try {
            const freshUrl = await getPresignedUrl(doc.s3Key, 7 * 24 * 60 * 60);
            return { ...doc.toObject(), fileUrl: freshUrl };
          } catch (error) {
            console.error('Error generating presigned URL:', error);
            return doc.toObject();
          }
        }
        return doc.toObject();
      })
    );

    res.json({ documents: documentsWithFreshUrls });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all documents for logged-in CA
exports.getAllDocuments = async (req, res) => {
  try {
    // Get all clients of this CA
    const clients = await Client.find({ createdBy: req.userId });
    const clientIds = clients.map(c => c._id);

    const documents = await Document.find({ clientId: { $in: clientIds } })
      .populate('clientId', 'name whatsappNumber')
      .sort({ uploadDate: -1 });

    res.json({ documents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete document
exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Verify document belongs to this CA's client
    const client = await Client.findOne({
      _id: document.clientId,
      createdBy: req.userId
    });

    if (!client) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete from S3 if it's an S3 document
    if (document.storageType === 's3' && document.s3Key) {
      try {
        await deleteFromS3(document.s3Key);
      } catch (error) {
        console.error('Error deleting from S3:', error);
        // Continue with database deletion even if S3 deletion fails
      }
    }

    await document.deleteOne();

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};