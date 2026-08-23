import mongoose from 'mongoose';
import './User';
import './Client';


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
  mimeType: {
    type: String,
    default: ''
  },
  fileSize: {
    type: Number,
    default: 0
  },
  documentName: {
    type: String,
    default: '',
    trim: true
  },
  originalFilename: {
    type: String,
    default: '',
    trim: true
  },
  category: {
    type: String,
    default: 'General',
    trim: true
  },
  financialYear: {
    type: String,
    default: '',
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
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
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
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
