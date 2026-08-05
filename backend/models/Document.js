const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  year: {
    type: String,
    required: true,
    trim: true
  },
  documentType: {
    type: String,
    required: true,
    trim: true
    // Removed enum validation to allow flexible document types like TDS-JAN, GST-MAR etc.
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  s3Key: {
    type: String,
    default: '' // S3 object key for AWS storage
  },
  bucket: {
    type: String,
    default: '' // S3 bucket name
  },
  storageType: {
    type: String,
    enum: ['supabase', 's3'],
    default: 's3' // Default to S3 storage
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

// Index for faster document queries
documentSchema.index({ clientId: 1, documentType: 1, year: 1 });

module.exports = mongoose.model('Document', documentSchema);
