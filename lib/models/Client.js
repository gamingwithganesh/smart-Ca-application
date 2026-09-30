import mongoose from 'mongoose';
import './User';


const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  whatsappNumber: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  clientType: {
    type: String,
    enum: ['COMPANY', 'PARTNERSHIP_LLP', 'PROPRIETORSHIP', 'INDIVIDUAL', 'TRUST_NGO'],
    default: 'INDIVIDUAL'
  },
  consultantPhone: {
    type: String,
    trim: true,
    default: ''
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

clientSchema.index({ createdBy: 1, whatsappNumber: 1 });
clientSchema.index({ whatsappNumber: 1 });
clientSchema.index({ email: 1 });
clientSchema.index({ createdBy: 1 });

export default mongoose.models.Client || mongoose.model('Client', clientSchema);
