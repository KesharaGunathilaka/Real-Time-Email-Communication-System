const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  message: { type: String, required: true },
  attachment: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = emailSchema;