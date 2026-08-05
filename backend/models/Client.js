const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  whatsappNumber: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        // Validate WhatsApp number format (with country code)
        return /^\+?[1-9]\d{1,14}$/.test(v);
      },
      message: 'Invalid WhatsApp number format'
    }
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

// Index for faster queries
clientSchema.index({ whatsappNumber: 1 });
clientSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Client', clientSchema);
