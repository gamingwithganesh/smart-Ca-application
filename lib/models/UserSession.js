import mongoose from 'mongoose';

const userSessionSchema = new mongoose.Schema({
  caId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  welcomed: { type: Boolean, default: false },
  pendingDocType: { type: String, default: null },
  pendingDocList: { type: Array, default: [] },
  updatedAt: { type: Date, default: Date.now }
});

userSessionSchema.index({ caId: 1, phoneNumber: 1 }, { unique: true });

if (mongoose.models.UserSession && (!mongoose.models.UserSession.schema.path('caId') || !mongoose.models.UserSession.schema.path('pendingDocList'))) {
  delete mongoose.models.UserSession;
}

export default mongoose.models.UserSession || mongoose.model('UserSession', userSessionSchema);

