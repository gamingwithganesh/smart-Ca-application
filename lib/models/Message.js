import mongoose from 'mongoose';
import './User';
import './Client';
import './Document';

const messageSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  direction: {
    type: String,
    enum: ['outbound', 'inbound'],
    default: 'outbound'
  },
  to: {
    type: String,
    required: true,
    trim: true
  },
  from: {
    type: String,
    required: true,
    trim: true
  },
  body: {
    type: String,
    default: '',
    trim: true
  },
  twilioMessageSid: {
    type: String,
    default: '',
    index: true
  },
  status: {
    type: String,
    enum: ['queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'received'],
    default: 'sent'
  },
  messageType: {
    type: String,
    enum: ['text', 'document', 'image'],
    default: 'text'
  },
  mediaUrl: {
    type: String,
    default: ''
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

messageSchema.index({ clientId: 1, createdAt: -1 });
messageSchema.index({ twilioMessageSid: 1 });

export default mongoose.models.Message || mongoose.model('Message', messageSchema);
