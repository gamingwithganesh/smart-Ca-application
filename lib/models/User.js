import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'sub_ca', 'client'],
    default: 'admin' // admin = CA Firm Owner, sub_ca = Associate/Staff, superadmin = Platform Owner, client = Taxpayer/Client
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'suspended', 'expired'],
    default: 'active'
  },
  pauseReason: {
    type: String,
    default: '',
    trim: true
  },
  // If role is sub_ca, this points to their parent CA Firm (admin)
  parentCa: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  firmName: {
    type: String,
    trim: true,
    default: ''
  },
  firmCity: {
    type: String,
    trim: true,
    default: ''
  },
  // Subscription management for CA Firm Admins
  subscription: {
    plan: {
      type: String,
      enum: ['Trial', 'Starter', 'Professional', 'Enterprise', 'Custom'],
      default: 'Professional'
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'past_due', 'expired', 'canceled'],
      default: 'active'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default 30-day active period
    },
    pricePerMonth: {
      type: Number,
      default: 2499
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'annual', 'lifetime'],
      default: 'monthly'
    },
    maxSubCas: {
      type: Number,
      default: 5
    },
    maxClients: {
      type: Number,
      default: 200
    },
    notes: {
      type: String,
      default: ''
    }
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

userSchema.pre('save', async function() {
  this.updatedAt = new Date();
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.User || mongoose.model('User', userSchema);
