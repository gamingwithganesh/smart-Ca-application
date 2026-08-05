const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  welcomed: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserSession', userSessionSchema);
