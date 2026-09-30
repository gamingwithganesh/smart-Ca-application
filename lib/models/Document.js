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
  savedFileName: {
    type: String,
    default: '',
    trim: true
  },
  localFilePath: {
    type: String,
    default: '',
    trim: true
  },
  fileBase64: {
    type: String,
    default: ''
  },
  fileData: {
    type: String,
    default: ''
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
    default: 'local'
  },
  paymentAmount: {
    type: Number,
    default: 500, // Default fee in INR (e.g. ₹500)
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'IN_PROCESS', 'COMPLETED', 'FREE'],
    default: 'PENDING'
  },
  paymentId: {
    type: String,
    default: '',
    trim: true
  },
  paymentMethod: {
    type: String,
    default: '',
    trim: true
  },
  paidAt: {
    type: Date,
    default: null
  },
  paymentNotes: {
    type: String,
    default: '',
    trim: true
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
documentSchema.index({ clientId: 1, paymentStatus: 1 });

export default mongoose.models.Document || mongoose.model('Document', documentSchema);
