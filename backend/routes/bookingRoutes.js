const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const {
  getAll, create, update, remove, uploadPdf, uploadAutoPdf, getReminderBookings, getTotalCount, getStats, claimOrphans,
  getHistoryFolders, getHistoryTickets,
} = require('../controllers/bookingController');

router.use(protect);

router.post('/claim-orphans', claimOrphans);

router.get('/stats', getStats);
router.get('/count', getTotalCount);
router.get('/reminders', getReminderBookings);
router.get('/history/folders', getHistoryFolders);
router.get('/history/tickets', getHistoryTickets);
router.get('/', getAll);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);
router.post('/upload', upload.single('pdf'), uploadPdf);
router.post('/upload-auto', upload.single('pdf'), uploadAutoPdf);

module.exports = router;
