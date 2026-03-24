const mongoose = require('mongoose');

const worldbookSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Worldbook', worldbookSchema);