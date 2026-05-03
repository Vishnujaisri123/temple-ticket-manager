const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const {
  getAll, create, update, remove, uploadPdf, getReminderBookings, getTotalCount,
} = require('../controllers/bookingController');

router.use(protect);

router.get('/stats', getStats);
router.get('/count', getTotalCount);
router.get('/reminders', getReminderBookings);
router.get('/', getAll);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);
router.post('/upload', upload.single('pdf'), uploadPdf);

module.exports = router;
