import mongoose from 'mongoose';

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
    default: ''
  },
  bucket: {
    type: String,
    default: ''
  },
  storageType: {
    type: String,
    enum: ['supabase', 's3', 'local'],
    default: 's3'
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

documentSchema.index({ clientId: 1, documentType: 1, year: 1 });

export default mongoose.models.Document || mongoose.model('Document', documentSchema);
