const path = require('path');
const fs = require('fs');
const Settings = require('../models/Settings');
const { uploadToCloudinary } = require('../config/cloudinary');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const getTempleMedia = async (req, res) => {
  let settings = await Settings.findOne({ key: 'global' });
  if (!settings) {
    settings = await Settings.create({ key: 'global' });
  }
  res.json(settings);
};

const uploadTempleVoiceMessage = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No audio file uploaded' });

  const isProduction = process.env.NODE_ENV === 'production';
  let voiceMessageUrl = '';
  let localPath = '';
  let filename = req.file.originalname;

  let settings = await Settings.findOne({ key: 'global' });
  if (!settings) {
    settings = await Settings.create({ key: 'global' });
  }

  // Clean up old local file if exists
  if (settings.templeVoiceMessagePath && fs.existsSync(settings.templeVoiceMessagePath)) {
    try {
      fs.unlinkSync(settings.templeVoiceMessagePath);
    } catch (e) {
      console.error('Failed to delete old local voice message:', e.message);
    }
  }

  if (isProduction) {
    try {
      const publicId = `voice_message_${Date.now()}`;
      const result = await uploadToCloudinary(req.file.buffer, publicId);
      
      settings.templeVoiceMessageUrl = result.secure_url;
      settings.templeVoiceMessagePath = publicId; // Store public_id
      settings.templeVoiceMessageFilename = filename;
      await settings.save();
      
      return res.json(settings);
    } catch (err) {
      console.error('Cloudinary audio upload failed:', err);
      return res.status(500).json({ message: 'Cloudinary audio upload failed: ' + err.message });
    }
  } else {
    const fileExt = path.extname(req.file.originalname) || '.mp3';
    const localFilename = `voice_message_${Date.now()}${fileExt}`;
    localPath = path.join(uploadDir, localFilename);
    
    fs.writeFileSync(localPath, req.file.buffer);

    voiceMessageUrl = `${process.env.SERVER_URL || 'http://localhost:5000'}/uploads/${localFilename}`;

    settings.templeVoiceMessageUrl = voiceMessageUrl;
    settings.templeVoiceMessagePath = localPath;
    settings.templeVoiceMessageFilename = filename;
    await settings.save();

    return res.json(settings);
  }
};

const deleteTempleVoiceMessage = async (req, res) => {
  let settings = await Settings.findOne({ key: 'global' });
  if (!settings) {
    return res.status(404).json({ message: 'Settings not found' });
  }

  // Clean up local file if it exists
  if (settings.templeVoiceMessagePath && fs.existsSync(settings.templeVoiceMessagePath)) {
    try {
      fs.unlinkSync(settings.templeVoiceMessagePath);
    } catch (e) {
      console.error('Failed to delete local voice message file:', e.message);
    }
  }

  // Clean up from Cloudinary if in production
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && settings.templeVoiceMessagePath) {
    const { deleteFromCloudinary } = require('../config/cloudinary');
    try {
      await deleteFromCloudinary(settings.templeVoiceMessagePath);
    } catch (err) {
      console.error('Failed to delete from Cloudinary:', err.message);
    }
  }

  settings.templeVoiceMessageUrl = '';
  settings.templeVoiceMessagePath = '';
  settings.templeVoiceMessageFilename = '';
  await settings.save();

  res.json(settings);
};

module.exports = {
  getTempleMedia,
  uploadTempleVoiceMessage,
  deleteTempleVoiceMessage
};
