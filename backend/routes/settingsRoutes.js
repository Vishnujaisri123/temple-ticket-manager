const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15 MB limit
});

const {
  getTempleMedia,
  uploadTempleVoiceMessage,
  deleteTempleVoiceMessage
} = require('../controllers/settingsController');

router.use(protect);

router.get('/temple-media', getTempleMedia);
router.post('/temple-media/upload', upload.single('voiceMessage'), uploadTempleVoiceMessage);
router.delete('/temple-media', deleteTempleVoiceMessage);

module.exports = router;
