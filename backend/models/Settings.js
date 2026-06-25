const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'global' },
    templeVoiceMessageUrl: { type: String, default: '' },
    templeVoiceMessagePath: { type: String, default: '' },
    templeVoiceMessageFilename: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
