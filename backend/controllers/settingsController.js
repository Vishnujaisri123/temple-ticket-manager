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

  let settings = await Settings.findOne({ key: 'global' });
  if (!settings) {
    settings = await Settings.create({ key: 'global' });
  }

  const filename = req.file.originalname;
  const fileExt = path.extname(filename) || '.mp3';
  const localFilename = `voice_message_${Date.now()}${fileExt}`;
  const localPath = path.join(uploadDir, localFilename);

  // Clean up old local file if it exists
  if (settings.templeVoiceMessagePath && fs.existsSync(settings.templeVoiceMessagePath)) {
    try {
      fs.unlinkSync(settings.templeVoiceMessagePath);
    } catch (e) {
      console.error('Failed to delete old local voice message:', e.message);
    }
  }

  // Clean up from Cloudinary if old one was on Cloudinary
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const isCloudinaryConfigured = cloudName && cloudName !== 'your_cloud_name' && cloudName !== '';
  if (isCloudinaryConfigured && settings.templeVoiceMessagePath && !settings.templeVoiceMessagePath.includes('uploads')) {
    const { deleteFromCloudinary } = require('../config/cloudinary');
    try {
      await deleteFromCloudinary(settings.templeVoiceMessagePath);
    } catch (err) {
      console.error('Failed to delete old audio from Cloudinary:', err.message);
    }
  }

  // Save the new file locally first
  fs.writeFileSync(localPath, req.file.buffer);

  const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';
  const localVoiceUrl = `${serverUrl}/uploads/${localFilename}`;

  settings.templeVoiceMessageUrl = localVoiceUrl;
  settings.templeVoiceMessagePath = localPath;
  settings.templeVoiceMessageFilename = filename;
  await settings.save();

  // If Cloudinary is configured, try to upload to Cloudinary
  if (isCloudinaryConfigured) {
    try {
      const publicId = `voice_message_${Date.now()}`;
      const result = await uploadToCloudinary(req.file.buffer, publicId);
      
      settings.templeVoiceMessageUrl = result.secure_url;
      settings.templeVoiceMessagePath = publicId; // Store public_id
      await settings.save();

      // Clean up the local file since it's now on Cloudinary
      if (fs.existsSync(localPath)) {
        try { fs.unlinkSync(localPath); } catch (e) {}
      }
      console.log(`[Cloudinary] Voice message successfully uploaded to Cloudinary: ${result.secure_url}`);
    } catch (err) {
      console.error('[Cloudinary] Voice message upload failed, falling back to local serving:', err.message);
      // Keep local serving - settings are already saved with the local path/URL
    }
  } else {
    console.log('[Cloudinary] Cloudinary not configured or using placeholders. Serving voice message locally.');
  }

  return res.json(settings);
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
