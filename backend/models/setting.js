const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  apiKey: {
    type: String,
    required: true
  },
  apiUrl: {
    type: String,
    required: true
  },
  model: {
    type: String,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Setting', settingSchema);