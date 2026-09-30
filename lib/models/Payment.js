import mongoose from 'mongoose';
import './User';
import './Client';
import './Document';

const paymentSchema = new mongoose.Schema(
  {
    orderRef: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    razorpayOrderId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    razorpayPaymentId: {
      type: String,
      default: '',
      trim: true,
      index: true
    },
    razorpaySignature: {
      type: String,
      default: '',
      trim: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
      index: true
    },
    purpose: {
      type: String,
      enum: ['document_fee', 'subscription_plan', 'custom'],
      required: true
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null,
      index: true
    },
    planId: {
      type: String,
      default: '',
      trim: true
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'annual', 'lifetime'],
      default: 'monthly'
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    amountInPaise: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true
    },
    status: {
      type: String,
      enum: [
        'CREATED',
        'PENDING',
        'AUTHORIZED',
        'CAPTURED',
        'PAID',
        'FAILED',
        'CANCELLED',
        'REFUNDED'
      ],
      default: 'CREATED',
      index: true
    },
    paymentMethod: {
      type: String,
      default: '',
      trim: true
    },
    customerDetails: {
      name: { type: String, default: '', trim: true },
      email: { type: String, default: '', trim: true },
      phone: { type: String, default: '', trim: true }
    },
    notes: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    failureReason: {
      type: String,
      default: '',
      trim: true
    },
    webhookEvents: [
      {
        eventId: { type: String, trim: true },
        eventName: { type: String, trim: true },
        processedAt: { type: Date, default: Date.now },
        summary: { type: String, default: '' }
      }
    ],
    paidAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ clientId: 1, createdAt: -1 });
paymentSchema.index({ razorpayOrderId: 1, status: 1 });

export default mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
