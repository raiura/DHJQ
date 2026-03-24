const mongoose = require('mongoose');

const dialogueSchema = new mongoose.Schema({
  userMessage: {
    type: String,
    required: true
  },
  aiResponse: {
    type: Array,
    required: true
  },
  characterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Character'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Dialogue', dialogueSchema);